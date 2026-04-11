import { FeedbackModel, CustomerCardModel, mongoose } from "./db";
import type { InsertFeedback, Feedback, Analytics, CustomerHistory } from "@shared/schema";

export interface IStorage {
  getAllFeedback(filters?: {
    search?: string;
    startDate?: string;
    endDate?: string;
    minRating?: number;
    status?: 'all' | 'contacted' | 'pending';
  }): Promise<Feedback[]>;
  getFeedback(customerId: string, visitId: string): Promise<Feedback | null>;
  createFeedback(feedback: InsertFeedback): Promise<Feedback>;
  markAsContacted(customerId: string, visitId: string, staffName: string): Promise<Feedback | null>;
  getAnalytics(period: 'week' | 'lastWeek' | 'month'): Promise<Analytics>;
  getCustomerHistory(normalizedName: string): Promise<CustomerHistory | null>;
  getTotalVisits(phoneNumber: string): Promise<number>;
  checkDuplicateFeedbackToday(phoneNumber: string): Promise<boolean>;
  migrateOldFeedbackStructure(): Promise<{ message: string; merged: number; deleted: number }>;
}

function formatVisitAsFeedback(customerDoc: any, visit: any): Feedback {
  const createdDate = new Date(visit.createdAt);
  const visitDate = createdDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  const visitTime = createdDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  const dateKey = createdDate.toISOString().split('T')[0];
  
  return {
    _id: visit._id.toString(),
    name: customerDoc.name,
    phone: customerDoc.phoneNumber,
    location: visit.location,
    locationDetail: visit.locationDetail || undefined,
    visitType: visit.visitType,
    ratings: visit.ratings,
    comments: visit.comments,
    status: visit.status || "pending",
    createdAt: visit.createdAt.toISOString(),
    visitDate,
    visitTime,
    dateKey,
  };
}

function normalizeName(name: string): string {
  return name.toLowerCase().trim();
}

function getDateKey(): string {
  return new Date().toISOString().split('T')[0];
}

function getDateRange(period: 'week' | 'lastWeek' | 'month'): { start: Date; end: Date } {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  
  if (period === 'week') {
    const dayOfWeek = today.getDay();
    const start = new Date(today);
    start.setDate(today.getDate() - dayOfWeek);
    return { start, end: now };
  } else if (period === 'lastWeek') {
    const dayOfWeek = today.getDay();
    const end = new Date(today);
    end.setDate(today.getDate() - dayOfWeek - 1);
    const start = new Date(end);
    start.setDate(end.getDate() - 6);
    return { start, end };
  } else {
    const start = new Date(today.getFullYear(), today.getMonth(), 1);
    return { start, end: now };
  }
}

export class MongoStorage implements IStorage {
  async getAllFeedback(filters?: {
    search?: string;
    startDate?: string;
    endDate?: string;
    minRating?: number;
    status?: 'all' | 'contacted' | 'pending';
  }): Promise<Feedback[]> {
    const docs = await FeedbackModel.find().lean();
    let results: Feedback[] = [];

    for (const customerDoc of docs) {
      for (const visit of customerDoc.visits || []) {
        // Check search filter
        if (filters?.search) {
          const searchLower = filters.search.toLowerCase();
          const matchesName = customerDoc.name.toLowerCase().includes(searchLower);
          const matchesPhone = customerDoc.phoneNumber.includes(filters.search);
          if (!matchesName && !matchesPhone) continue;
        }

        // Check date filter
        // Dates from frontend are "YYYY-MM-DD" representing IST dates.
        // IST is UTC+5:30, so IST midnight = UTC-5h30m.
        // We shift the UTC boundary by -5h30m so the full IST day is captured.
        if (filters?.startDate || filters?.endDate) {
          const visitDate = new Date(visit.createdAt);
          const IST_OFFSET_MS = (5 * 60 + 30) * 60 * 1000; // 5h30m in ms

          if (filters?.startDate) {
            const [y, m, d] = filters.startDate.split('-').map(Number);
            // 00:00:00.000 IST = UTC 00:00:00.000 - 5h30m
            const start = new Date(Date.UTC(y, m - 1, d, 0, 0, 0, 0) - IST_OFFSET_MS);
            if (visitDate < start) continue;
          }
          if (filters?.endDate) {
            const [y, m, d] = filters.endDate.split('-').map(Number);
            // 23:59:59.999 IST = UTC 23:59:59.999 - 5h30m
            const end = new Date(Date.UTC(y, m - 1, d, 23, 59, 59, 999) - IST_OFFSET_MS);
            if (visitDate > end) continue;
          }
        }

        // Check status filter
        if (filters?.status === 'contacted' && visit.status !== 'contacted') continue;
        if (filters?.status === 'pending' && visit.status !== 'pending') continue;

        // Check rating filter
        if (filters?.minRating) {
          const avg = (
            visit.ratings.foodTaste + 
            visit.ratings.foodTemperature + 
            visit.ratings.portionSize + 
            visit.ratings.valueForMoney + 
            visit.ratings.presentation + 
            visit.ratings.overallService
          ) / 6;
          if (avg < filters.minRating) continue;
        }

        results.push(formatVisitAsFeedback(customerDoc, visit));
      }
    }

    return results.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  async getFeedback(customerId: string, visitId: string): Promise<Feedback | null> {
    try {
      const doc = await FeedbackModel.findById(customerId);
      if (!doc) return null;
      const visit = doc.visits.id(visitId);
      return visit ? formatVisitAsFeedback(doc, visit) : null;
    } catch {
      return null;
    }
  }

  async createFeedback(feedback: InsertFeedback): Promise<Feedback> {
    const dateKey = getDateKey();
    const visit = {
      _id: new mongoose.Types.ObjectId(),
      location: feedback.location,
      locationDetail: feedback.locationDetail || '',
      visitType: feedback.visitType,
      ratings: feedback.ratings,
      comments: feedback.comments,
      status: "pending" as const,
      createdAt: new Date(),
      dateKey,
    };

    let customerDoc = await FeedbackModel.findOne({ phoneNumber: feedback.phone });
    
    if (customerDoc) {
      customerDoc.visits.push(visit);
      await customerDoc.save();
    } else {
      customerDoc = await FeedbackModel.create({
        phoneNumber: feedback.phone,
        name: feedback.name,
        visits: [visit],
      });
    }

    // ===== CUSTOMER CARD UPSERT LOGIC =====
    console.log('[CUSTOMER CARD] Starting customer card upsert for:', {
      phoneNumber: feedback.phone,
      name: feedback.name,
      visitId: visit._id.toString(),
    });

    try {
      const existingCard = await CustomerCardModel.findOne({ phoneNumber: feedback.phone });

      if (existingCard) {
        console.log('[CUSTOMER CARD] Updating existing customer card for:', feedback.phone);
        await CustomerCardModel.findOneAndUpdate(
          { phoneNumber: feedback.phone },
          {
            $inc: { totalVisits: 1 },
            $set: { lastVisitDate: new Date(), name: feedback.name },
            $push: { visits: visit._id }
          }
        );
        console.log('[CUSTOMER CARD] Successfully updated customer card for:', feedback.phone);
      } else {
        console.log('[CUSTOMER CARD] Creating new customer card for:', feedback.phone);
        await CustomerCardModel.create({
          phoneNumber: feedback.phone,
          name: feedback.name,
          totalVisits: 1,
          firstVisitDate: new Date(),
          lastVisitDate: new Date(),
          visits: [visit._id],
        });
        console.log('[CUSTOMER CARD] Successfully created new customer card for:', feedback.phone);
      }
    } catch (error: any) {
      console.error('[CUSTOMER CARD ERROR] Failed to upsert customer card:', {
        phoneNumber: feedback.phone,
        name: feedback.name,
        errorMessage: error.message,
        errorStack: error.stack,
      });
    }
    // ===== END CUSTOMER CARD UPSERT LOGIC =====

    return formatVisitAsFeedback(customerDoc, visit);
  }

  async getCustomerHistory(normalizedName: string): Promise<CustomerHistory | null> {
    const doc = await FeedbackModel.findOne({ name: { $regex: normalizedName, $options: 'i' } });
    
    if (!doc) {
      return null;
    }
    
    const feedbacks = doc.visits.map(visit => formatVisitAsFeedback(doc, visit));
    
    return {
      customerName: doc.name,
      totalVisits: feedbacks.length,
      feedbackHistory: feedbacks,
    };
  }

  async markAsContacted(visitId: string, staffName: string): Promise<Feedback | null> {
    try {
      // Find the customer document containing this visit
      const customer = await FeedbackModel.findOne({ "visits._id": new mongoose.Types.ObjectId(visitId) });
      if (!customer) return null;

      // Update that specific visit's status
      await FeedbackModel.findOneAndUpdate(
        { "visits._id": new mongoose.Types.ObjectId(visitId) },
        { $set: { "visits.$.status": "contacted" } },
        { new: true }
      );

      // Fetch updated document to return the formatted feedback
      const updated = await FeedbackModel.findOne({ "visits._id": new mongoose.Types.ObjectId(visitId) });
      if (!updated) return null;
      
      const visit = updated.visits.id(visitId);
      return visit ? formatVisitAsFeedback(updated, visit) : null;
    } catch {
      return null;
    }
  }

  async getTotalVisits(phoneNumber: string): Promise<number> {
    try {
      const doc = await FeedbackModel.findOne({ phoneNumber });
      return doc ? doc.visits.length : 0;
    } catch {
      return 0;
    }
  }

  async getAnalytics(period: 'week' | 'lastWeek' | 'month'): Promise<Analytics> {
    const { start, end } = getDateRange(period);
    
    const docs = await FeedbackModel.find().lean();
    const feedbacks: Feedback[] = [];
    
    for (const customerDoc of docs) {
      for (const visit of customerDoc.visits || []) {
        if (new Date(visit.createdAt) >= start && new Date(visit.createdAt) <= end) {
          feedbacks.push(formatVisitAsFeedback(customerDoc, visit));
        }
      }
    }
    
    feedbacks.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    
    const total = feedbacks.length;
    const contacted = feedbacks.filter(f => f.status === "contacted").length;
    
    // Calculate average rating
    let totalRating = 0;
    const categoryTotals: Record<string, number> = {
      foodTaste: 0,
      foodTemperature: 0,
      portionSize: 0,
      valueForMoney: 0,
      presentation: 0,
      overallService: 0,
    };
    
    feedbacks.forEach(f => {
      const ratingCategories = [
        'foodTaste', 
        'foodTemperature', 
        'portionSize', 
        'valueForMoney', 
        'presentation', 
        'overallService'
      ] as const;
      ratingCategories.forEach(cat => {
        categoryTotals[cat] += f.ratings[cat];
        totalRating += f.ratings[cat];
      });
    });
    
    const avgRating = total > 0 ? totalRating / (total * 6) : 0;
    
    // Find top category
    let topCategory = 'foodTaste';
    let topAvg = 0;
    Object.entries(categoryTotals).forEach(([cat, sum]) => {
      const avg = total > 0 ? sum / total : 0;
      if (avg > topAvg) {
        topAvg = avg;
        topCategory = cat;
      }
    });
    
    // Category performance
    const categoryPerformance = Object.entries(categoryTotals).map(([category, sum]) => ({
      category: category.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()),
      average: total > 0 ? Math.round((sum / total) * 10) / 10 : 0,
    }));
    
    // Weekly trends (group by date)
    const trendMap: Record<string, { 
      count: number; 
      foodTaste: number;
      foodTemperature: number;
      portionSize: number;
      valueForMoney: number;
      presentation: number;
      overallService: number;
    }> = {};
    
    feedbacks.forEach(f => {
      if (!trendMap[f.dateKey]) {
        trendMap[f.dateKey] = { 
          count: 0, 
          foodTaste: 0,
          foodTemperature: 0,
          portionSize: 0,
          valueForMoney: 0,
          presentation: 0,
          overallService: 0
        };
      }
      trendMap[f.dateKey].count++;
      trendMap[f.dateKey].foodTaste += f.ratings.foodTaste;
      trendMap[f.dateKey].foodTemperature += f.ratings.foodTemperature;
      trendMap[f.dateKey].portionSize += f.ratings.portionSize;
      trendMap[f.dateKey].valueForMoney += f.ratings.valueForMoney;
      trendMap[f.dateKey].presentation += f.ratings.presentation;
      trendMap[f.dateKey].overallService += f.ratings.overallService;
    });
    
    const weeklyTrends = Object.entries(trendMap).map(([date, data]) => {
      // Extract just the date part from dateKey (format: "2026-03-09")
      const dateOnly = date.split('-').slice(0, 3).join('-');
      return {
        date: dateOnly,
        foodTaste: Math.round((data.foodTaste / data.count) * 10) / 10,
        foodTemperature: Math.round((data.foodTemperature / data.count) * 10) / 10,
        portionSize: Math.round((data.portionSize / data.count) * 10) / 10,
        valueForMoney: Math.round((data.valueForMoney / data.count) * 10) / 10,
        presentation: Math.round((data.presentation / data.count) * 10) / 10,
        overallService: Math.round((data.overallService / data.count) * 10) / 10,
      };
    });
    
    return {
      totalFeedback: total,
      averageRating: Math.round(avgRating * 10) / 10,
      topCategory: topCategory.charAt(0).toUpperCase() + topCategory.slice(1),
      responseRate: total > 0 ? Math.round((contacted / total) * 100) : 0,
      weeklyTrends,
      categoryPerformance,
      feedbackVolume: {
        total,
        contacted,
        pending: total - contacted,
      },
    };
  }

  async checkDuplicateFeedbackToday(phoneNumber: string): Promise<boolean> {
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999);
    
    const doc = await FeedbackModel.findOne({ phoneNumber });
    if (!doc) return false;
    
    for (const visit of doc.visits || []) {
      if (new Date(visit.createdAt) >= startOfDay && new Date(visit.createdAt) <= endOfDay) {
        return true;
      }
    }
    
    return false;
  }

  async migrateOldFeedbackStructure(): Promise<{ message: string; merged: number; deleted: number }> {
    const allDocs = await FeedbackModel.find().lean();
    const phoneToVisits: Record<string, any> = {};
    const docsToDelete: string[] = [];

    // Group visits by phone number
    for (const doc of allDocs) {
      if (doc.phoneNumber && (doc.visits?.length > 0 || doc.location)) {
        if (!phoneToVisits[doc.phoneNumber]) {
          phoneToVisits[doc.phoneNumber] = {
            name: doc.name,
            phoneNumber: doc.phoneNumber,
            visits: [],
          };
        }
        if (doc.visits?.length > 0) {
          phoneToVisits[doc.phoneNumber].visits.push(...doc.visits);
        } else if (doc.location) {
          // Convert old flat structure to visit
          phoneToVisits[doc.phoneNumber].visits.push({
            _id: doc._id,
            location: doc.location,
            visitType: doc.visitType,
            ratings: doc.ratings,
            comments: doc.comments,
            status: doc.status || "pending",
            createdAt: doc.createdAt,
            dateKey: doc.dateKey,
          });
        }
        if (doc._id !== phoneToVisits[doc.phoneNumber]._id && doc.location) {
          docsToDelete.push(doc._id);
        }
      }
    }

    // Upsert consolidated documents
    let merged = 0;
    for (const [phone, data] of Object.entries(phoneToVisits)) {
      if (data.visits.length > 0) {
        await FeedbackModel.findOneAndUpdate(
          { phoneNumber: phone },
          { name: data.name, visits: data.visits },
          { upsert: true }
        );
        merged++;
      }
    }

    // Delete duplicates
    for (const id of docsToDelete) {
      try {
        await FeedbackModel.findByIdAndDelete(id);
      } catch {}
    }

    return { message: 'Migration completed', merged, deleted: docsToDelete.length };
  }
}

export const storage = new MongoStorage();
