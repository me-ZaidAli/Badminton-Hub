import { z } from "zod";
import { 
  insertUserSchema, 
  insertPlayerProfileSchema, 
  insertSessionSchema, 
  insertAnnouncementSchema,
  insertMatchSchema,
  users,
  playerProfiles,
  sessions,
  sessionSignups,
  matches,
  announcements,
  memberships
} from "./schema";

export const errorSchemas = {
  validation: z.object({
    message: z.string(),
    field: z.string().optional(),
  }),
  notFound: z.object({
    message: z.string(),
  }),
  internal: z.object({
    message: z.string(),
  }),
  unauthorized: z.object({
    message: z.string(),
  }),
};

// API CONTRACT
export const api = {
  auth: {
    register: {
      method: "POST" as const,
      path: "/api/auth/register",
      input: insertUserSchema.extend({
        gender: z.enum(["MALE", "FEMALE"]).optional(),
        category: z.enum(["A", "B", "C", "D"]).optional(),
      }),
      responses: {
        201: z.custom<typeof users.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    login: {
      method: "POST" as const,
      path: "/api/auth/login",
      input: z.object({ username: z.string(), password: z.string() }),
      responses: {
        200: z.custom<typeof users.$inferSelect>(),
        401: errorSchemas.unauthorized,
      },
    },
    logout: {
      method: "POST" as const,
      path: "/api/auth/logout",
      responses: {
        200: z.void(),
      },
    },
    me: {
      method: "GET" as const,
      path: "/api/auth/me",
      responses: {
        200: z.custom<typeof users.$inferSelect & { playerProfile?: typeof playerProfiles.$inferSelect | null; playerProfiles?: (typeof playerProfiles.$inferSelect)[] }>(),
        401: errorSchemas.unauthorized,
      },
    },
  },
  users: {
    list: {
      method: "GET" as const,
      path: "/api/users",
      responses: {
        200: z.array(z.custom<typeof users.$inferSelect & { playerProfiles: (typeof playerProfiles.$inferSelect)[] }>()),
      },
    },
    profile: {
      method: "GET" as const,
      path: "/api/users/:id/profile",
      responses: {
        200: z.custom<typeof playerProfiles.$inferSelect & { user: typeof users.$inferSelect }>(),
        404: errorSchemas.notFound,
      },
    },
  },
  sessions: {
    list: {
      method: "GET" as const,
      path: "/api/sessions",
      input: z.object({
        from: z.string().optional(),
        to: z.string().optional(),
      }).optional(),
      responses: {
        200: z.array(z.custom<typeof sessions.$inferSelect & { signupCount?: number }>()),
      },
    },
    create: {
      method: "POST" as const,
      path: "/api/sessions",
      input: insertSessionSchema,
      responses: {
        201: z.custom<typeof sessions.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    get: {
      method: "GET" as const,
      path: "/api/sessions/:id",
      responses: {
        200: z.custom<typeof sessions.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
    signups: {
      method: "GET" as const,
      path: "/api/sessions/:id/signups",
      responses: {
        200: z.array(z.custom<typeof sessionSignups.$inferSelect & { player: typeof playerProfiles.$inferSelect & { user: typeof users.$inferSelect } }>()),
      },
    },
    join: {
      method: "POST" as const,
      path: "/api/sessions/:id/join",
      responses: {
        201: z.custom<typeof sessionSignups.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    withdraw: {
      method: "POST" as const,
      path: "/api/sessions/:id/withdraw",
      responses: {
        200: z.void(),
      },
    },
    updateAttendance: {
      method: "PATCH" as const,
      path: "/api/sessions/:id/signups/:signupId/attendance",
      input: z.object({ status: z.enum(["ATTENDED", "NOT_ATTENDED"]) }),
      responses: {
        200: z.custom<typeof sessionSignups.$inferSelect>(),
      },
    },
    updatePayment: {
      method: "PATCH" as const,
      path: "/api/sessions/:id/signups/:signupId/payment",
      input: z.object({ status: z.enum(["PAID", "UNPAID"]) }),
      responses: {
        200: z.custom<typeof sessionSignups.$inferSelect>(),
      },
    },
  },
  matches: {
    list: {
      method: "GET" as const,
      path: "/api/sessions/:sessionId/matches",
      responses: {
        200: z.array(z.custom<typeof matches.$inferSelect & { 
          teamAPlayer1: typeof playerProfiles.$inferSelect & { user: typeof users.$inferSelect },
          teamAPlayer2: typeof playerProfiles.$inferSelect & { user: typeof users.$inferSelect } | null,
          teamBPlayer1: typeof playerProfiles.$inferSelect & { user: typeof users.$inferSelect },
          teamBPlayer2: typeof playerProfiles.$inferSelect & { user: typeof users.$inferSelect } | null,
        }>()),
      },
    },
    generate: {
      method: "POST" as const,
      path: "/api/sessions/:sessionId/matches/generate",
      input: z.object({
        mode: z.enum(["COMPETITIVE", "SOCIAL"]),
        roundNumber: z.number().default(1),
      }),
      responses: {
        201: z.array(z.custom<typeof matches.$inferSelect>()),
        400: errorSchemas.validation,
      },
    },
    update: {
      method: "PATCH" as const,
      path: "/api/matches/:id",
      input: z.object({
        scoreA: z.number().optional(),
        scoreB: z.number().optional(),
        isCompleted: z.boolean().optional(),
      }),
      responses: {
        200: z.custom<typeof matches.$inferSelect>(),
      },
    },
  },
  announcements: {
    list: {
      method: "GET" as const,
      path: "/api/announcements",
      responses: {
        200: z.array(z.custom<typeof announcements.$inferSelect & { author: typeof users.$inferSelect }>()),
      },
    },
    create: {
      method: "POST" as const,
      path: "/api/announcements",
      input: insertAnnouncementSchema,
      responses: {
        201: z.custom<typeof announcements.$inferSelect>(),
      },
    },
  },
};

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
