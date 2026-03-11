import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";

// Simple admin credentials (in production, use proper auth)
const ADMIN_USERNAME = "admin";
const ADMIN_PASSWORD = "bomb123";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  // Session-based auth check middleware
  const requireAuth = (req: any, res: any, next: any) => {
    if (req.session?.isAdmin) {
      next();
    } else {
      res.status(401).json({ message: "Unauthorized" });
    }
  };

  // === AUTH ROUTES ===
  app.post(api.auth.login.path, async (req, res) => {
    try {
      const { username, password } = api.auth.login.input.parse(req.body);
      
      if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
        (req.session as any).isAdmin = true;
        res.json({ success: true });
      } else {
        res.status(401).json({ message: "Invalid credentials" });
      }
    } catch (err) {
      if (err instanceof z.ZodError) {
        res.status(400).json({ message: err.errors[0].message });
      } else {
        res.status(500).json({ message: "Server error" });
      }
    }
  });

  app.post(api.auth.logout.path, (req, res) => {
    req.session?.destroy((err) => {
      if (err) {
        return res.status(500).json({ success: false, message: "Logout failed" });
      }
      res.json({ success: true });
    });
  });

  app.get(api.auth.check.path, (req, res) => {
    res.json({ authenticated: !!(req.session as any)?.isAdmin });
  });

  // === FEEDBACK ROUTES ===
  
  // Create feedback
  app.post(api.feedback.create.path, async (req, res) => {
    try {
      const { name, phone, location, visitType, ratings, comments } = req.body;
      
      console.log('[FEEDBACK CREATE] Incoming request:', {
        name,
        phone,
        location,
        visitType,
        ratingsKeys: Object.keys(ratings || {}),
        comments,
      });
      
      // Enforce location to always be "Bomb Rolls and Bowls" for feedbackqr database
      if (location !== "Bomb Rolls and Bowls") {
        console.warn('[FEEDBACK CREATE] WARNING: Location mismatch. Received:', location, 'Expected: Bomb Rolls and Bowls');
      }
      
      // Check if user already submitted feedback today
      const hasDuplicateToday = await storage.checkDuplicateFeedbackToday(phone);
      if (hasDuplicateToday) {
        return res.status(400).json({ message: 'You have already submitted feedback today. Please try again tomorrow!' });
      }
      
      const feedback = await storage.createFeedback({
        name,
        phone,
        location: "Bomb Rolls and Bowls", // Force correct location for this database
        visitType,
        ratings,
        comments,
      });
      
      console.log('[FEEDBACK CREATE] Successfully saved feedback:', {
        customerId: feedback._id,
        name: feedback.name,
        phone: feedback.phone,
        location: feedback.location,
        visitType: feedback.visitType,
        status: feedback.status,
        createdAt: feedback.createdAt,
      });
      
      res.status(201).json(feedback);
    } catch (error: any) {
      console.error('Feedback save error:', error.message, error.stack);
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  });

  // Get all feedback (admin only)
  app.get(api.feedback.list.path, requireAuth, async (req, res) => {
    try {
      const search = typeof req.query.search === 'string' ? req.query.search : undefined;
      const startDate = typeof req.query.startDate === 'string' ? req.query.startDate : undefined;
      const endDate = typeof req.query.endDate === 'string' ? req.query.endDate : undefined;
      const minRatingStr = typeof req.query.minRating === 'string' ? req.query.minRating : undefined;
      const status = typeof req.query.status === 'string' ? req.query.status as 'all' | 'contacted' | 'pending' : undefined;
      
      const filters = {
        search,
        startDate,
        endDate,
        minRating: minRatingStr ? parseInt(minRatingStr, 10) : undefined,
        status,
      };
      
      const feedback = await storage.getAllFeedback(filters);
      res.json(feedback);
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Server error" });
    }
  });

  // Get single feedback (using customer ID and visit ID)
  app.get(api.feedback.get.path, requireAuth, async (req, res) => {
    const { customerId, visitId } = req.params as { customerId: string; visitId: string };
    const feedback = await storage.getFeedback(customerId, visitId);
    if (!feedback) {
      return res.status(404).json({ message: "Feedback not found" });
    }
    res.json(feedback);
  });

  // Mark as contacted (using customer ID and visit ID)
  app.patch(api.feedback.contact.path, requireAuth, async (req, res) => {
    try {
      const { customerId, visitId } = req.params as { customerId: string; visitId: string };
      const { staffName } = api.feedback.contact.input.parse(req.body);
      const feedback = await storage.markAsContacted(customerId, visitId, staffName);
      
      if (!feedback) {
        return res.status(404).json({ message: "Feedback not found" });
      }
      
      res.json(feedback);
    } catch (err) {
      if (err instanceof z.ZodError) {
        res.status(400).json({ message: err.errors[0].message });
      } else {
        res.status(500).json({ message: "Server error" });
      }
    }
  });

  // Migration endpoint to consolidate old feedback structure
  app.post('/api/migrate/feedback-structure', async (req, res) => {
    try {
      const result = await storage.migrateOldFeedbackStructure();
      res.json(result);
    } catch (err) {
      console.error('Migration error:', err);
      res.status(500).json({ message: 'Migration failed' });
    }
  });

  // Get customer feedback history by normalized name
  app.get(api.feedback.customerHistory.path, requireAuth, async (req, res) => {
    try {
      const normalizedName = decodeURIComponent(req.params.normalizedName as string);
      const customerHistory = await storage.getCustomerHistory(normalizedName);
      
      if (!customerHistory) {
        return res.status(404).json({ message: "Customer not found" });
      }
      
      res.json(customerHistory);
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Server error" });
    }
  });

  // === ANALYTICS ROUTES ===
  app.get(api.analytics.get.path, requireAuth, async (req, res) => {
    try {
      const period = (req.query.period as 'week' | 'lastWeek' | 'month') || 'week';
      const analytics = await storage.getAnalytics(period);
      res.json(analytics);
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Server error" });
    }
  });

  return httpServer;
}
