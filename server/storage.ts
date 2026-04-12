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
  getAnalytics(period: 'week' | 'month'): Promise<Analytics>;
  getCustomerHistory(normalizedName: string): Promise<CustomerHistory | null>;
  getTotalVisits(phoneNumber: string): Promise<number>;
  checkDuplicateFeedbackToday(phoneNumber: string): Promise<boolean>;
  migrateOldFeedbackStructure(): Promise<{ message: string; merged: number; deleted: number }>;
}

function formatVisitAsFeedback(customerDoc: any, visit: any): Feedback {
  const createdDate = new Date(visit.createdAt);
  // Always format display dates in IST so admin sees Indian time
  const visitDate = createdDate.toLocaleDateString('en-IN', {
    month: 'short', day: 'numeric', year: 'numeric',
    timeZone: 'Asia/Kolkata',
  });
  const visitTime = createdDate.toLocaleTimeString('en-US', {
    hour: 'numeric', minute: '2-digit', hour12: true,
    timeZone: 'Asia/Kolkata',
  });
  const dateKey = toISTDateKey(createdDate);
  
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

// IST is UTC+5:30
const IST_OFFSET_MS = (5 * 60 + 30) * 60 * 1000;

/** Returns today's date string (YYYY-MM-DD) in IST */
function getDateKey(): string {
  const istDate = new Date(Date.now() + IST_OFFSET_MS);
  return istDate.toISOString().split('T')[0];
}

/** Converts a UTC Date to IST YYYY-MM-DD */
function toISTDateKey(date: Date): string {
  const istDate = new Date(date.getTime() + IST_OFFSET_MS);
  return istDate.toISOString().split('T')[0];
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

  async getAnalytics(period: 'week' | 'month'): Promise<Analytics> {
    const days = period === 'month' ? 30 : 7;
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const endDate = new Date();

    console.log("Period received:", period);
    console.log("Date range:", startDate.toISOString(), "to", endDate.toISOString());

    // Use MongoDB aggregation to filter visits by createdAt at the DB level
    const results = await FeedbackModel.aggregate([
      { $unwind: '$visits' },
      {
        $match: {
          'visits.createdAt': { $gte: startDate, $lte: endDate },
        },
      },
      {
        $project: {
          name: 1,
          phoneNumber: 1,
          visit: '$visits',
        },
      },
    ]);

    console.log("Total docs found:", results.length);

    if (results.length === 0) {
      return {
        totalFeedback: 0,
        averageRating: 0,
        topCategory: '-',
        responseRate: 0,
        weeklyTrends: [],
        categoryPerformance: [],
        feedbackVolume: { total: 0, contacted: 0, pending: 0 },
      };
    }

    const total = results.length;
    const contacted = results.filter((r: any) => r.visit.status === 'contacted').length;

    const ratingCategories = [
      'foodTaste',
      'foodTemperature',
      'portionSize',
      'valueForMoney',
      'presentation',
      'overallService',
    ] as const;

    let totalRating = 0;
    const categoryTotals: Record<string, number> = {
      foodTaste: 0,
      foodTemperature: 0,
      portionSize: 0,
      valueForMoney: 0,
      presentation: 0,
      overallService: 0,
    };

    results.forEach((r: any) => {
      ratingCategories.forEach(cat => {
        const val = Number(r.visit.ratings?.[cat] ?? 0);
        categoryTotals[cat] += val;
        totalRating += val;
      });
    });

    const avgRating = totalRating / (total * 6);

    // Top category
    let topCategory = '-';
    let topAvg = -1;
    Object.entries(categoryTotals).forEach(([cat, sum]) => {
      const avg = sum / total;
      if (avg > topAvg) {
        topAvg = avg;
        topCategory = cat;
      }
    });

    // Category performance
    const categoryPerformance = ratingCategories.map(cat => ({
      category: cat.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase()),
      average: Math.round((categoryTotals[cat] / total) * 10) / 10,
    }));

    // Trends: group by IST date key
    const trendMap: Record<string, {
      count: number;
      foodTaste: number;
      foodTemperature: number;
      portionSize: number;
      valueForMoney: number;
      presentation: number;
      overallService: number;
    }> = {};

    results.forEach((r: any) => {
      const dateKey = r.visit.dateKey || toISTDateKey(new Date(r.visit.createdAt));
      if (!trendMap[dateKey]) {
        trendMap[dateKey] = { count: 0, foodTaste: 0, foodTemperature: 0, portionSize: 0, valueForMoney: 0, presentation: 0, overallService: 0 };
      }
      trendMap[dateKey].count++;
      ratingCategories.forEach(cat => {
        trendMap[dateKey][cat] += Number(r.visit.ratings?.[cat] ?? 0);
      });
    });

    const weeklyTrends = Object.entries(trendMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, data]) => ({
        date,
        foodTaste: Math.round((data.foodTaste / data.count) * 10) / 10,
        foodTemperature: Math.round((data.foodTemperature / data.count) * 10) / 10,
        portionSize: Math.round((data.portionSize / data.count) * 10) / 10,
        valueForMoney: Math.round((data.valueForMoney / data.count) * 10) / 10,
        presentation: Math.round((data.presentation / data.count) * 10) / 10,
        overallService: Math.round((data.overallService / data.count) * 10) / 10,
      }));

    return {
      totalFeedback: total,
      averageRating: Math.round(avgRating * 10) / 10,
      topCategory: topCategory.charAt(0).toUpperCase() + topCategory.slice(1),
      responseRate: Math.round((contacted / total) * 100),
      weeklyTrends,
      categoryPerformance,
      feedbackVolume: { total, contacted, pending: total - contacted },
    };
  }

  async checkDuplicateFeedbackToday(phoneNumber: string): Promise<boolean> {
    // Determine today's date in IST
    const todayIST = getDateKey(); // "YYYY-MM-DD" in IST
    const [y, m, d] = todayIST.split('-').map(Number);
    // Convert IST day boundaries to UTC for comparison with stored createdAt (UTC)
    const startOfDayUTC = new Date(Date.UTC(y, m - 1, d, 0, 0, 0, 0) - IST_OFFSET_MS);
    const endOfDayUTC = new Date(Date.UTC(y, m - 1, d, 23, 59, 59, 999) - IST_OFFSET_MS);

    const doc = await FeedbackModel.findOne({ phoneNumber });
    if (!doc) return false;

    for (const visit of doc.visits || []) {
      const visitTime = new Date(visit.createdAt);
      if (visitTime >= startOfDayUTC && visitTime <= endOfDayUTC) {
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
