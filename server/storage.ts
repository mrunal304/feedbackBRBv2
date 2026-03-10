import { FeedbackModel } from "./db";
import type { InsertFeedback, Feedback, Analytics, CustomerHistory } from "@shared/schema";

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
  getAnalytics(period: 'week' | 'lastWeek' | 'month'): Promise<Analytics>;
  getCustomerHistory(normalizedName: string): Promise<CustomerHistory | null>;
}

function formatFeedback(doc: any): Feedback & { dateKey?: string } {
  const createdDate = new Date(doc.createdAt);
  const visitDate = createdDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  const visitTime = createdDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  const dateKey = createdDate.toISOString().split('T')[0];
  
  return {
    _id: doc._id.toString(),
    name: doc.name,
    phone: doc.phone,
    location: doc.location,
    visitType: doc.visitType,
    ratings: doc.ratings,
    comments: doc.comments,
    status: doc.status || "pending",
    createdAt: doc.createdAt.toISOString(),
    visitDate,
    visitTime,
    contactedAt: doc.contactedAt ? doc.contactedAt.toISOString() : undefined,
    contactedBy: doc.contactedBy,
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
    const query: any = {};
    
    if (filters?.search) {
      query.$or = [
        { name: { $regex: filters.search, $options: 'i' } },
        { phone: { $regex: filters.search, $options: 'i' } },
      ];
    }
    
    if (filters?.startDate || filters?.endDate) {
      query.createdAt = {};
      if (filters?.startDate) {
        const start = new Date(filters.startDate);
        query.createdAt.$gte = start;
      }
      if (filters?.endDate) {
        const end = new Date(filters.endDate);
        end.setHours(23, 59, 59, 999);
        query.createdAt.$lte = end;
      }
    }
    
    if (filters?.status === 'contacted') {
      query.status = 'contacted';
    } else if (filters?.status === 'pending') {
      query.status = 'pending';
    }
    
    const docs = await FeedbackModel.find(query).sort({ createdAt: -1 });
    
    let results = docs.map(formatFeedback);
    
    if (filters?.minRating) {
      const minRating = Number(filters.minRating);
      results = results.filter(f => {
        const avg = (
          f.ratings.foodTaste + 
          f.ratings.foodTemperature + 
          f.ratings.portionSize + 
          f.ratings.valueForMoney + 
          f.ratings.presentation + 
          f.ratings.overallService
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
      status: "pending",
    });
    return formatFeedback(doc);
  }

  async getCustomerHistory(normalizedName: string): Promise<CustomerHistory | null> {
    const docs = await FeedbackModel.find({ name: { $regex: normalizedName, $options: 'i' } })
      .sort({ createdAt: -1 });
    
    if (docs.length === 0) {
      return null;
    }
    
    const feedbacks = docs.map(formatFeedback);
    
    return {
      customerName: feedbacks[0].name,
      totalVisits: feedbacks.length,
      feedbackHistory: feedbacks,
    };
  }

  async markAsContacted(id: string, staffName: string): Promise<Feedback | null> {
    try {
      const doc = await FeedbackModel.findByIdAndUpdate(
        id,
        { status: "contacted" },
        { new: true }
      );
      return doc ? formatFeedback(doc) : null;
    } catch {
      return null;
    }
  }

  async getAnalytics(period: 'week' | 'lastWeek' | 'month'): Promise<Analytics> {
    const { start, end } = getDateRange(period);
    
    const docs = await FeedbackModel.find({
      createdAt: { $gte: start, $lte: end }
    }).sort({ createdAt: 1 });
    
    const feedbacks = docs.map(formatFeedback);
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
      // Extract just the date part from dateKey (format: "2026-03-09-timestamp")
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
}

export const storage = new MongoStorage();
