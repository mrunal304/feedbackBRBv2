import { z } from 'zod';
import { 
  insertFeedbackSchema, 
  feedbackSchema, 
  adminLoginSchema, 
  contactCustomerSchema,
  analyticsSchema 
} from './schema';

// === ERROR SCHEMAS ===
export const errorSchemas = {
  validation: z.object({
    message: z.string(),
    field: z.string().optional(),
  }),
  notFound: z.object({
    message: z.string(),
  }),
  unauthorized: z.object({
    message: z.string(),
  }),
  conflict: z.object({
    message: z.string(),
    canSubmit: z.boolean(),
  }),
};

// === API CONTRACT ===
export const api = {
  feedback: {
    list: {
      method: 'GET' as const,
      path: '/api/feedback',
      input: z.object({
        search: z.string().optional(),
        startDate: z.string().optional(),
        endDate: z.string().optional(),
        minRating: z.string().optional(),
        status: z.enum(['all', 'contacted', 'pending']).optional(),
      }).optional(),
      responses: {
        200: z.array(feedbackSchema),
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/feedback',
      input: insertFeedbackSchema,
      responses: {
        201: feedbackSchema,
        400: errorSchemas.validation,
        409: errorSchemas.conflict,
      },
    },
    get: {
      method: 'GET' as const,
      path: '/api/feedback/:id',
      responses: {
        200: feedbackSchema,
        404: errorSchemas.notFound,
      },
    },
    contact: {
      method: 'PATCH' as const,
      path: '/api/feedback/:id/contact',
      input: contactCustomerSchema,
      responses: {
        200: feedbackSchema,
        404: errorSchemas.notFound,
      },
    },
    validatePhone: {
      method: 'POST' as const,
      path: '/api/feedback/validate-phone',
      input: z.object({ phoneNumber: z.string() }),
      responses: {
        200: z.object({ canSubmit: z.boolean(), message: z.string().optional() }),
      },
    },
  },
  analytics: {
    get: {
      method: 'GET' as const,
      path: '/api/analytics',
      input: z.object({
        period: z.enum(['week', 'lastWeek', 'month']).optional(),
      }).optional(),
      responses: {
        200: analyticsSchema,
      },
    },
  },
  auth: {
    login: {
      method: 'POST' as const,
      path: '/api/auth/login',
      input: adminLoginSchema,
      responses: {
        200: z.object({ success: z.boolean(), message: z.string().optional() }),
        401: errorSchemas.unauthorized,
      },
    },
    logout: {
      method: 'POST' as const,
      path: '/api/auth/logout',
      responses: {
        200: z.object({ success: z.boolean() }),
      },
    },
    check: {
      method: 'GET' as const,
      path: '/api/auth/check',
      responses: {
        200: z.object({ authenticated: z.boolean() }),
      },
    },
  },
};

// === URL BUILDER ===
export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}

// === TYPE HELPERS ===
export type FeedbackInput = z.infer<typeof api.feedback.create.input>;
export type FeedbackResponse = z.infer<typeof api.feedback.create.responses[201]>;
export type FeedbackListResponse = z.infer<typeof api.feedback.list.responses[200]>;
export type AnalyticsResponse = z.infer<typeof api.analytics.get.responses[200]>;
export type ValidationError = z.infer<typeof errorSchemas.validation>;
export type NotFoundError = z.infer<typeof errorSchemas.notFound>;
