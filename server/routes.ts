import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";

// Simple admin credentials (in production, use proper auth)
const ADMIN_USERNAME = "admin";
const ADMIN_PASSWORD = "admin123";

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
    req.session?.destroy(() => {});
    res.json({ success: true });
  });

  app.get(api.auth.check.path, (req, res) => {
    res.json({ authenticated: !!(req.session as any)?.isAdmin });
  });

  // === FEEDBACK ROUTES ===
  
  // Validate phone (check if already submitted today)
  app.post(api.feedback.validatePhone.path, async (req, res) => {
    try {
      const { phoneNumber } = api.feedback.validatePhone.input.parse(req.body);
      const alreadySubmitted = await storage.checkPhoneSubmittedToday(phoneNumber);
      
      if (alreadySubmitted) {
        res.json({ canSubmit: false, message: "You have already submitted feedback today. Please try again tomorrow." });
      } else {
        res.json({ canSubmit: true });
      }
    } catch (err) {
      res.json({ canSubmit: true });
    }
  });

  // Create feedback
  app.post(api.feedback.create.path, async (req, res) => {
    try {
      const input = api.feedback.create.input.parse(req.body);
      
      // Check if phone already submitted today
      const alreadySubmitted = await storage.checkPhoneSubmittedToday(input.phoneNumber);
      if (alreadySubmitted) {
        return res.status(409).json({ 
          message: "You have already submitted feedback today",
          canSubmit: false 
        });
      }
      
      const feedback = await storage.createFeedback(input);
      res.status(201).json(feedback);
    } catch (err) {
      if (err instanceof z.ZodError) {
        res.status(400).json({ 
          message: err.errors[0].message,
          field: err.errors[0].path.join('.') 
        });
      } else if ((err as any).code === 11000) {
        // MongoDB duplicate key error
        res.status(409).json({ 
          message: "You have already submitted feedback today",
          canSubmit: false 
        });
      } else {
        console.error(err);
        res.status(500).json({ message: "Server error" });
      }
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

  // Get single feedback
  app.get(api.feedback.get.path, requireAuth, async (req, res) => {
    const id = req.params.id as string;
    const feedback = await storage.getFeedback(id);
    if (!feedback) {
      return res.status(404).json({ message: "Feedback not found" });
    }
    res.json(feedback);
  });

  // Mark as contacted
  app.patch(api.feedback.contact.path, requireAuth, async (req, res) => {
    try {
      const id = req.params.id as string;
      const { staffName } = api.feedback.contact.input.parse(req.body);
      const feedback = await storage.markAsContacted(id, staffName);
      
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
