import { pgTable, text, serial, integer, boolean, timestamp, jsonb, pgEnum } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// === ENUMS ===
export const roleEnum = pgEnum("role", ["OWNER", "ADMIN", "ORGANISER", "COACH", "PLAYER"]);
export const clubRoleEnum = pgEnum("club_role", ["OWNER", "ADMIN", "PLAYER"]); // Club-scoped roles
export const membershipStatusEnum = pgEnum("membership_status", ["PENDING", "APPROVED", "REJECTED"]); // Club membership status
export const genderEnum = pgEnum("gender", ["MALE", "FEMALE"]);
export const categoryEnum = pgEnum("category", ["A", "B", "C", "D"]);
export const paymentStatusEnum = pgEnum("payment_status", ["PAID", "UNPAID"]);
export const attendanceStatusEnum = pgEnum("attendance_status", ["ATTENDED", "NOT_ATTENDED"]);
export const matchModeEnum = pgEnum("match_mode", ["COMPETITIVE", "SOCIAL"]);
export const matchStatusEnum = pgEnum("match_status", ["QUEUED", "LIVE", "COMPLETED"]);
export const visibilityEnum = pgEnum("visibility", ["ALL", "PLAYERS", "ADMINS"]);
export const accountStatusEnum = pgEnum("account_status", ["PENDING", "APPROVED", "REJECTED"]);
export const clubStatusEnum = pgEnum("club_status", ["PENDING", "APPROVED", "REJECTED"]); // Club approval status
export const playerStatusEnum = pgEnum("player_status", ["ACTIVE", "SUSPENDED", "ARCHIVED"]); // Player profile status

// === USERS ===
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  fullName: text("full_name").notNull(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  role: roleEnum("role").default("PLAYER").notNull(),
  emailVerified: boolean("email_verified").default(false).notNull(),
  accountStatus: accountStatusEnum("account_status").default("PENDING").notNull(),
  claimedProfileId: integer("claimed_profile_id"), // Reference to unclaimed profile if claiming existing
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// === CLUBS ===
export const clubs = pgTable("clubs", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(), // URL-friendly identifier
  description: text("description"),
  logoUrl: text("logo_url"),
  ownerId: integer("owner_id").references(() => users.id), // User who created/owns this club
  status: clubStatusEnum("status").default("PENDING").notNull(), // Club approval status
  isActive: boolean("is_active").default(true).notNull(),
  // Location fields
  address: text("address"),
  city: text("city"),
  postcode: text("postcode"),
  latitude: text("latitude"), // Stored as text to avoid floating point issues
  longitude: text("longitude"),
  // Registration & Affiliation
  isRegisteredWithBE: boolean("is_registered_with_be").default(false).notNull(), // Badminton England
  beRegistrationNumber: text("be_registration_number"), // Optional BE reg number
  // Club Activities
  hasCompetitions: boolean("has_competitions").default(false).notNull(),
  hasSocialGames: boolean("has_social_games").default(false).notNull(),
  socialGameTimings: text("social_game_timings"), // e.g., "Sundays 2pm-5pm"
  providesTraining: boolean("provides_training").default(false).notNull(),
  trainingDetails: text("training_details"), // e.g., "Coaching available for all levels"
  // Fees
  sessionFee: integer("session_fee"), // in pence (GBP)
  hasMembership: boolean("has_membership").default(false).notNull(),
  membershipFee: integer("membership_fee"), // in pence (GBP) per year
  // Target Players
  ageGroups: jsonb("age_groups").$type<string[]>().default([]), // ["Adult", "Junior", "Senior"]
  playerLevels: jsonb("player_levels").$type<string[]>().default([]), // ["beginner", "intermediate", "advanced", "pro", "all"]
  // Equipment & Extras
  shuttlecockType: text("shuttlecock_type"), // "feather", "plastic", or "both"
  providesClubTShirts: boolean("provides_club_tshirts").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// === MEMBERSHIPS ===
export const memberships = pgTable("memberships", {
  id: serial("id").primaryKey(),
  clubId: integer("club_id").references(() => clubs.id), // Optional: link to club
  name: text("name").notNull(), // e.g., "Annual", "Drop-in", "Monthly"
  sessionRate: integer("session_rate").notNull(), // in cents
  isDefault: boolean("is_default").default(false).notNull(),
});

// === PLAYER PROFILES ===
// Each user can have one profile per club
export const playerProfiles = pgTable("player_profiles", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  clubId: integer("club_id").references(() => clubs.id).notNull(),
  clubRole: clubRoleEnum("club_role").default("PLAYER").notNull(), // Role within this club
  membershipStatus: membershipStatusEnum("membership_status").default("PENDING").notNull(), // Approval status
  playerStatus: playerStatusEnum("player_status").default("ACTIVE").notNull(), // Active, Suspended, or Archived
  gender: genderEnum("gender"),
  category: categoryEnum("category").default("D"),
  rankingPoints: integer("ranking_points").default(1000).notNull(),
  matchesPlayed: integer("matches_played").default(0).notNull(),
  matchesWon: integer("matches_won").default(0).notNull(),
  membershipId: integer("membership_id").references(() => memberships.id),
});

// === VENUES ===
export const venues = pgTable("venues", {
  id: serial("id").primaryKey(),
  clubId: integer("club_id").references(() => clubs.id).notNull(),
  name: text("name").notNull(),
  address: text("address").notNull(),
  city: text("city"),
  postcode: text("postcode"),
  googleMapsUrl: text("google_maps_url"),
  isDefault: boolean("is_default").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// === SESSIONS ===
export const sessions = pgTable("sessions", {
  id: serial("id").primaryKey(),
  clubId: integer("club_id").references(() => clubs.id).notNull(),
  venueId: integer("venue_id").references(() => venues.id), // Optional venue
  title: text("title").notNull(),
  date: timestamp("date").notNull(),
  startTime: text("start_time").notNull(), // HH:mm
  durationMinutes: integer("duration_minutes").default(120).notNull(),
  maxPlayers: integer("max_players").notNull(),
  courtsAvailable: integer("courts_available").notNull(),
  allowedCategories: jsonb("allowed_categories").$type<string[]>().notNull(), // ["A", "B"]
  matchMode: matchModeEnum("match_mode").default("SOCIAL").notNull(),
  isPrivate: boolean("is_private").default(false).notNull(),
  createdBy: integer("created_by").references(() => users.id).notNull(),
  status: text("status").default("UPCOMING"), // UPCOMING, COMPLETED, CANCELLED
  shuttleTubesUsed: integer("shuttle_tubes_used").default(0),
  sessionFee: integer("session_fee"), // in pence (GBP) - overrides club default if set
  shuttlecockType: text("shuttlecock_type"), // "feather", "plastic" - inherits from club if not set
});

// === SESSION SIGNUPS ===
export const sessionSignups = pgTable("session_signups", {
  id: serial("id").primaryKey(),
  sessionId: integer("session_id").references(() => sessions.id).notNull(),
  playerId: integer("player_id").references(() => playerProfiles.id).notNull(),
  fee: integer("fee").notNull(),
  paymentStatus: paymentStatusEnum("payment_status").default("UNPAID").notNull(),
  attendanceStatus: attendanceStatusEnum("attendance_status").default("NOT_ATTENDED").notNull(),
  signupTime: timestamp("signup_time").defaultNow().notNull(),
});

// === MATCHES ===
export const matches = pgTable("matches", {
  id: serial("id").primaryKey(),
  sessionId: integer("session_id").references(() => sessions.id).notNull(),
  courtNumber: integer("court_number"), // Null when queued, assigned when live
  queuePosition: integer("queue_position"), // Position in queue, null when live/completed
  status: matchStatusEnum("status").default("QUEUED").notNull(),
  teamAPlayer1Id: integer("team_a_player_1_id").references(() => playerProfiles.id).notNull(),
  teamAPlayer2Id: integer("team_a_player_2_id").references(() => playerProfiles.id), // Nullable for singles
  teamBPlayer1Id: integer("team_b_player_1_id").references(() => playerProfiles.id).notNull(),
  teamBPlayer2Id: integer("team_b_player_2_id").references(() => playerProfiles.id), // Nullable for singles
  scoreA: integer("score_a").default(0),
  scoreB: integer("score_b").default(0),
  isCompleted: boolean("is_completed").default(false).notNull(),
  startedAt: timestamp("started_at"), // When match went live
  completedAt: timestamp("completed_at"), // When match was completed
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// === ANNOUNCEMENTS ===
export const announcements = pgTable("announcements", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  visibleTo: visibilityEnum("visible_to").default("ALL").notNull(),
  authorId: integer("author_id").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// === RELATIONS ===
export const clubsRelations = relations(clubs, ({ many }) => ({
  playerProfiles: many(playerProfiles),
  sessions: many(sessions),
  memberships: many(memberships),
}));

export const usersRelations = relations(users, ({ many }) => ({
  playerProfiles: many(playerProfiles), // User can have profiles in multiple clubs
}));

export const playerProfilesRelations = relations(playerProfiles, ({ one, many }) => ({
  user: one(users, {
    fields: [playerProfiles.userId],
    references: [users.id],
  }),
  club: one(clubs, {
    fields: [playerProfiles.clubId],
    references: [clubs.id],
  }),
  membership: one(memberships, {
    fields: [playerProfiles.membershipId],
    references: [memberships.id],
  }),
  signups: many(sessionSignups),
}));

export const sessionsRelations = relations(sessions, ({ one, many }) => ({
  creator: one(users, {
    fields: [sessions.createdBy],
    references: [users.id],
  }),
  club: one(clubs, {
    fields: [sessions.clubId],
    references: [clubs.id],
  }),
  signups: many(sessionSignups),
  matches: many(matches),
}));

export const sessionSignupsRelations = relations(sessionSignups, ({ one }) => ({
  session: one(sessions, {
    fields: [sessionSignups.sessionId],
    references: [sessions.id],
  }),
  player: one(playerProfiles, {
    fields: [sessionSignups.playerId],
    references: [playerProfiles.id],
  }),
}));

export const matchesRelations = relations(matches, ({ one }) => ({
  session: one(sessions, {
    fields: [matches.sessionId],
    references: [sessions.id],
  }),
  teamAPlayer1: one(playerProfiles, { fields: [matches.teamAPlayer1Id], references: [playerProfiles.id] }),
  teamAPlayer2: one(playerProfiles, { fields: [matches.teamAPlayer2Id], references: [playerProfiles.id] }),
  teamBPlayer1: one(playerProfiles, { fields: [matches.teamBPlayer1Id], references: [playerProfiles.id] }),
  teamBPlayer2: one(playerProfiles, { fields: [matches.teamBPlayer2Id], references: [playerProfiles.id] }),
}));

// === SCHEMAS ===
export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true, emailVerified: true });
export const insertClubSchema = createInsertSchema(clubs).omit({ id: true, createdAt: true });
export const insertPlayerProfileSchema = createInsertSchema(playerProfiles).omit({ id: true, rankingPoints: true, matchesPlayed: true, matchesWon: true });
export const insertVenueSchema = createInsertSchema(venues).omit({ id: true, createdAt: true });
export const insertSessionSchema = createInsertSchema(sessions).omit({ id: true, createdBy: true, status: true });
export const insertAnnouncementSchema = createInsertSchema(announcements).omit({ id: true, authorId: true, createdAt: true });
export const insertMatchSchema = createInsertSchema(matches).omit({ id: true, createdAt: true });

// === TYPES ===
export type User = typeof users.$inferSelect;
export type Club = typeof clubs.$inferSelect;
export type PlayerProfile = typeof playerProfiles.$inferSelect;
export type Venue = typeof venues.$inferSelect;
export type Session = typeof sessions.$inferSelect;
export type SessionSignup = typeof sessionSignups.$inferSelect;
export type Match = typeof matches.$inferSelect;
export type Announcement = typeof announcements.$inferSelect;
export type Membership = typeof memberships.$inferSelect;
export type InsertVenue = z.infer<typeof insertVenueSchema>;

export type InsertUser = z.infer<typeof insertUserSchema>;
export type InsertClub = z.infer<typeof insertClubSchema>;
export type InsertPlayerProfile = z.infer<typeof insertPlayerProfileSchema>;
export type InsertSession = z.infer<typeof insertSessionSchema>;
