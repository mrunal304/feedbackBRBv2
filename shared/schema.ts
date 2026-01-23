import { z } from "zod";

// === FEEDBACK RATINGS SCHEMA ===
export const ratingsSchema = z.object({
  qualityOfService: z.number().min(1).max(5),
  speedOfService: z.number().min(1).max(5),
  friendliness: z.number().min(1).max(5),
  foodTemperature: z.number().min(1).max(5),
  menuExplanation: z.number().min(1).max(5),
  likelyToReturn: z.number().min(1).max(5),
});

// === FEEDBACK SCHEMAS ===
export const feedbackSchema = z.object({
  _id: z.string(),
  name: z.string().min(1, "Name is required"),
  normalizedName: z.string().optional(), // lowercase version for case-insensitive matching
  phoneNumber: z.string().regex(/^\+?[\d\s-]{10,15}$/, "Invalid phone number format"),
  location: z.string().min(1, "Location is required"),
  diningOption: z.enum(["dine-in", "take-out"]),
  visitDate: z.string(),
  visitTime: z.string(),
  ratings: ratingsSchema,
  note: z.string().max(500).optional(),
  dateKey: z.string(), // YYYY-MM-DD for daily validation
  createdAt: z.string(),
  contactedAt: z.string().nullable().optional(),
  contactedBy: z.string().nullable().optional(),
});

// === CUSTOMER HISTORY SCHEMAS ===
export const customerHistorySchema = z.object({
  customerName: z.string(),
  normalizedName: z.string(),
  totalVisits: z.number(),
  feedbackHistory: z.array(feedbackSchema),
});

export const insertFeedbackSchema = z.object({
  name: z.string().min(1, "Name is required"),
  phoneNumber: z.string().regex(/^\+?[\d\s-]{10,15}$/, "Invalid phone number format"),
  location: z.string().min(1, "Location is required"),
  diningOption: z.enum(["dine-in", "take-out"]),
  visitDate: z.string(),
  visitTime: z.string(),
  ratings: ratingsSchema,
  note: z.string().max(500).optional(),
});

// === ADMIN AUTH SCHEMAS ===
export const adminLoginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

// === CONTACT CUSTOMER SCHEMA ===
export const contactCustomerSchema = z.object({
  staffName: z.string().min(1, "Staff name is required"),
});

// === ANALYTICS RESPONSE ===
export const analyticsSchema = z.object({
  totalFeedback: z.number(),
  averageRating: z.number(),
  topCategory: z.string(),
  responseRate: z.number(),
  weeklyTrends: z.array(z.object({
    date: z.string(),
    qualityOfService: z.number(),
    speedOfService: z.number(),
    friendliness: z.number(),
    foodTemperature: z.number(),
    menuExplanation: z.number(),
    likelyToReturn: z.number(),
  })),
  categoryPerformance: z.array(z.object({
    category: z.string(),
    average: z.number(),
  })),
  feedbackVolume: z.object({
    total: z.number(),
    contacted: z.number(),
    pending: z.number(),
  }),
});

// === TYPE EXPORTS ===
export type Ratings = z.infer<typeof ratingsSchema>;
export type Feedback = z.infer<typeof feedbackSchema>;
export type InsertFeedback = z.infer<typeof insertFeedbackSchema>;
export type AdminLogin = z.infer<typeof adminLoginSchema>;
export type ContactCustomer = z.infer<typeof contactCustomerSchema>;
export type Analytics = z.infer<typeof analyticsSchema>;
export type CustomerHistory = z.infer<typeof customerHistorySchema>;

// === REQUEST/RESPONSE TYPES ===
export type CreateFeedbackRequest = InsertFeedback;
export type FeedbackResponse = Feedback;
export type FeedbackListResponse = Feedback[];
export type ValidatePhoneRequest = { phoneNumber: string };
export type ValidatePhoneResponse = { canSubmit: boolean; message?: string };
export type AnalyticsResponse = Analytics;
export type LoginRequest = AdminLogin;
export type LoginResponse = { success: boolean; message?: string };

// Dummy exports to satisfy template imports (not using Drizzle for MongoDB)
export const users = {} as any;
export type User = { id: string; username: string; password: string };
export type InsertUser = { username: string; password: string };
