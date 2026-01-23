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
    location: doc.location,
    diningOption: doc.diningOption,
    visitDate: doc.visitDate,
    visitTime: doc.visitTime,
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
        const avg = (
          f.ratings.qualityOfService + 
          f.ratings.speedOfService + 
          f.ratings.friendliness + 
          f.ratings.foodTemperature + 
          f.ratings.menuExplanation + 
          f.ratings.likelyToReturn
        ) / 6;
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
      qualityOfService: 0,
      speedOfService: 0,
      friendliness: 0,
      foodTemperature: 0,
      menuExplanation: 0,
      likelyToReturn: 0,
    };
    
    feedbacks.forEach(f => {
      const ratingCategories = [
        'qualityOfService', 
        'speedOfService', 
        'friendliness', 
        'foodTemperature', 
        'menuExplanation', 
        'likelyToReturn'
      ] as const;
      ratingCategories.forEach(cat => {
        categoryTotals[cat] += f.ratings[cat];
        totalRating += f.ratings[cat];
      });
    });
    
    const avgRating = total > 0 ? totalRating / (total * 6) : 0;
    
    // Find top category
    let topCategory = 'qualityOfService';
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
      qualityOfService: number;
      speedOfService: number;
      friendliness: number;
      foodTemperature: number;
      menuExplanation: number;
      likelyToReturn: number;
    }> = {};
    
    feedbacks.forEach(f => {
      if (!trendMap[f.dateKey]) {
        trendMap[f.dateKey] = { 
          count: 0, 
          qualityOfService: 0,
          speedOfService: 0,
          friendliness: 0,
          foodTemperature: 0,
          menuExplanation: 0,
          likelyToReturn: 0
        };
      }
      trendMap[f.dateKey].count++;
      trendMap[f.dateKey].qualityOfService += f.ratings.qualityOfService;
      trendMap[f.dateKey].speedOfService += f.ratings.speedOfService;
      trendMap[f.dateKey].friendliness += f.ratings.friendliness;
      trendMap[f.dateKey].foodTemperature += f.ratings.foodTemperature;
      trendMap[f.dateKey].menuExplanation += f.ratings.menuExplanation;
      trendMap[f.dateKey].likelyToReturn += f.ratings.likelyToReturn;
    });
    
    const weeklyTrends = Object.entries(trendMap).map(([date, data]) => ({
      date,
      qualityOfService: Math.round((data.qualityOfService / data.count) * 10) / 10,
      speedOfService: Math.round((data.speedOfService / data.count) * 10) / 10,
      friendliness: Math.round((data.friendliness / data.count) * 10) / 10,
      foodTemperature: Math.round((data.foodTemperature / data.count) * 10) / 10,
      menuExplanation: Math.round((data.menuExplanation / data.count) * 10) / 10,
      likelyToReturn: Math.round((data.likelyToReturn / data.count) * 10) / 10,
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
