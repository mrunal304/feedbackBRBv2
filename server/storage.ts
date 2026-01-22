import { FeedbackModel } from "./db";
import type { InsertFeedback, Feedback, Analytics } from "@shared/schema";

export interface IStorage {
  getAllFeedback(filters?: {
    search?: string;
    startDate?: string;
    endDate?: string;
    minRating?: number;
    status?: 'all' | 'contacted' | 'pending';
  }): Promise<Feedback[]>;
  getFeedback(id: string): Promise<Feedback | null>;
  createFeedback(feedback: InsertFeedback): Promise<Feedback>;
  markAsContacted(id: string, staffName: string): Promise<Feedback | null>;
  checkPhoneSubmittedToday(phoneNumber: string): Promise<boolean>;
  getAnalytics(period: 'week' | 'lastWeek' | 'month'): Promise<Analytics>;
}

function formatFeedback(doc: any): Feedback {
  return {
    _id: doc._id.toString(),
    name: doc.name,
    phoneNumber: doc.phoneNumber,
    ratings: doc.ratings,
    note: doc.note || undefined,
    dateKey: doc.dateKey,
    createdAt: doc.createdAt.toISOString(),
    contactedAt: doc.contactedAt ? doc.contactedAt.toISOString() : null,
    contactedBy: doc.contactedBy || null,
  };
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
    const query: any = {};
    
    if (filters?.search) {
      query.$or = [
        { name: { $regex: filters.search, $options: 'i' } },
        { phoneNumber: { $regex: filters.search, $options: 'i' } },
      ];
    }
    
    if (filters?.startDate) {
      query.dateKey = { ...query.dateKey, $gte: filters.startDate };
    }
    
    if (filters?.endDate) {
      query.dateKey = { ...query.dateKey, $lte: filters.endDate };
    }
    
    if (filters?.status === 'contacted') {
      query.contactedAt = { $ne: null };
    } else if (filters?.status === 'pending') {
      query.contactedAt = null;
    }
    
    const docs = await FeedbackModel.find(query).sort({ createdAt: -1 });
    
    let results = docs.map(formatFeedback);
    
    if (filters?.minRating) {
      const minRating = Number(filters.minRating);
      results = results.filter(f => {
        const avg = (f.ratings.interior + f.ratings.food + f.ratings.service + f.ratings.staff + f.ratings.hygiene) / 5;
        return avg >= minRating;
      });
    }
    
    return results;
  }

  async getFeedback(id: string): Promise<Feedback | null> {
    try {
      const doc = await FeedbackModel.findById(id);
      return doc ? formatFeedback(doc) : null;
    } catch {
      return null;
    }
  }

  async createFeedback(feedback: InsertFeedback): Promise<Feedback> {
    const doc = await FeedbackModel.create({
      ...feedback,
      dateKey: getDateKey(),
    });
    return formatFeedback(doc);
  }

  async markAsContacted(id: string, staffName: string): Promise<Feedback | null> {
    try {
      const doc = await FeedbackModel.findByIdAndUpdate(
        id,
        { contactedAt: new Date(), contactedBy: staffName },
        { new: true }
      );
      return doc ? formatFeedback(doc) : null;
    } catch {
      return null;
    }
  }

  async checkPhoneSubmittedToday(phoneNumber: string): Promise<boolean> {
    const dateKey = getDateKey();
    const existing = await FeedbackModel.findOne({ phoneNumber, dateKey });
    return !!existing;
  }

  async getAnalytics(period: 'week' | 'lastWeek' | 'month'): Promise<Analytics> {
    const { start, end } = getDateRange(period);
    
    const docs = await FeedbackModel.find({
      createdAt: { $gte: start, $lte: end }
    }).sort({ createdAt: 1 });
    
    const feedbacks = docs.map(formatFeedback);
    const total = feedbacks.length;
    const contacted = feedbacks.filter(f => f.contactedAt).length;
    
    // Calculate average rating
    let totalRating = 0;
    const categoryTotals: Record<string, number> = {
      interior: 0, food: 0, service: 0, staff: 0, hygiene: 0
    };
    
    feedbacks.forEach(f => {
      const categories = ['interior', 'food', 'service', 'staff', 'hygiene'] as const;
      categories.forEach(cat => {
        categoryTotals[cat] += f.ratings[cat];
        totalRating += f.ratings[cat];
      });
    });
    
    const avgRating = total > 0 ? totalRating / (total * 5) : 0;
    
    // Find top category
    let topCategory = 'food';
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
      category: category.charAt(0).toUpperCase() + category.slice(1),
      average: total > 0 ? Math.round((sum / total) * 10) / 10 : 0,
    }));
    
    // Weekly trends (group by date)
    const trendMap: Record<string, { count: number; interior: number; food: number; service: number; staff: number; hygiene: number }> = {};
    
    feedbacks.forEach(f => {
      if (!trendMap[f.dateKey]) {
        trendMap[f.dateKey] = { count: 0, interior: 0, food: 0, service: 0, staff: 0, hygiene: 0 };
      }
      trendMap[f.dateKey].count++;
      trendMap[f.dateKey].interior += f.ratings.interior;
      trendMap[f.dateKey].food += f.ratings.food;
      trendMap[f.dateKey].service += f.ratings.service;
      trendMap[f.dateKey].staff += f.ratings.staff;
      trendMap[f.dateKey].hygiene += f.ratings.hygiene;
    });
    
    const weeklyTrends = Object.entries(trendMap).map(([date, data]) => ({
      date,
      interior: Math.round((data.interior / data.count) * 10) / 10,
      food: Math.round((data.food / data.count) * 10) / 10,
      service: Math.round((data.service / data.count) * 10) / 10,
      staff: Math.round((data.staff / data.count) * 10) / 10,
      hygiene: Math.round((data.hygiene / data.count) * 10) / 10,
    }));
    
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
}

export const storage = new MongoStorage();
