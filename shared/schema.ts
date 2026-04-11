import { z } from "zod";

// === FEEDBACK RATINGS SCHEMA ===
export const ratingsSchema = z.object({
  foodTaste: z.number().min(1).max(5),
  foodTemperature: z.number().min(1).max(5),
  portionSize: z.number().min(1).max(5),
  valueForMoney: z.number().min(1).max(5),
  presentation: z.number().min(1).max(5),
  overallService: z.number().min(1).max(5),
});

// === FEEDBACK SCHEMAS ===
export const feedbackSchema = z.object({
  _id: z.string(),
  name: z.string().min(1, "Name is required"),
  phone: z.string().regex(/^\+?[\d\s-]{10,15}$/, "Invalid phone number format"),
  location: z.string().min(1, "Location is required"),
  visitType: z.enum(["dine_in", "take_out"]),
  ratings: ratingsSchema,
  comments: z.string().optional(),
  status: z.enum(["pending", "contacted"]),
  createdAt: z.string(),
  visitDate: z.string(),
  visitTime: z.string(),
  contactedAt: z.string().optional(),
  contactedBy: z.string().optional(),
});

// === CUSTOMER HISTORY SCHEMAS ===
export const customerHistorySchema = z.object({
  customerName: z.string(),
  totalVisits: z.number(),
  feedbackHistory: z.array(feedbackSchema),
});

export const insertFeedbackSchema = z.object({
  name: z
    .string()
    .min(1, "Name is required")
    .regex(/^[a-zA-Z\s]+$/, "Name can only contain letters"),
  phone: z
    .string()
    .min(1, "Please enter a valid 10-digit phone number")
    .regex(/^\d+$/, "Please enter a valid 10-digit phone number")
    .length(10, "Please enter a valid 10-digit phone number"),
  location: z.string().min(1, "Location is required"),
  visitType: z.enum(["dine_in", "take_out"]),
  ratings: ratingsSchema,
  comments: z.string().optional(),
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
    foodTaste: z.number(),
    foodTemperature: z.number(),
    portionSize: z.number(),
    valueForMoney: z.number(),
    presentation: z.number(),
    overallService: z.number(),
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
