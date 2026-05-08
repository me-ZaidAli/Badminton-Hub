import { pgTable, text, serial, integer, boolean, timestamp, jsonb, pgEnum } from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// === ENUMS ===
export const roleEnum = pgEnum("role", ["OWNER", "ADMIN", "ORGANISER", "COACH", "PLAYER"]);
export const clubRoleEnum = pgEnum("club_role", ["OWNER", "ADMIN", "ORGANISER", "COACH", "PLAYER"]); // Club-scoped roles
export const membershipStatusEnum = pgEnum("membership_status", ["PENDING", "APPROVED", "REJECTED"]); // Club membership status
export const genderEnum = pgEnum("gender", ["MALE", "FEMALE"]);
export const categoryEnum = pgEnum("category", ["A", "B", "C", "D"]);

export const GRADE_ORDER = ["C3", "C2", "C1", "B3", "B2", "B1", "A3", "A2", "A1"] as const;
export type Grade = typeof GRADE_ORDER[number];
export const paymentStatusEnum = pgEnum("payment_status", ["PAID", "UNPAID", "PENDING"]);
export const paymentMethodEnum = pgEnum("payment_method", ["CARD", "BANK_TRANSFER", "CASH", "ONLINE", "MEMBERSHIP_CREDIT", "NONE"]);
export const signupStatusEnum = pgEnum("signup_status", ["CONFIRMED", "WAITING", "INVITED", "NOT_ATTENDING", "CANCELLED"]);
export const attendanceStatusEnum = pgEnum("attendance_status", [
  "ATTENDED", "NOT_ATTENDED", "PARTIAL_ATTENDANCE", "LATE_ARRIVAL",
  "NO_SHOW", "JUSTIFIED_CANCELLATION", "SICKNESS", "EMERGENCY",
  "SESSION_ABANDONED", "OTHER"
]);
export const matchModeEnum = pgEnum("match_mode", ["COMPETITIVE", "SOCIAL", "TRAINING"]);
export const matchStatusEnum = pgEnum("match_status", ["QUEUED", "LIVE", "COMPLETED"]);
export const matchGenderTypeEnum = pgEnum("match_gender_type", ["MIXED", "FEMALE", "MALE"]);
export const visibilityEnum = pgEnum("visibility", ["ALL", "PLAYERS", "ADMINS"]);
export const accountStatusEnum = pgEnum("account_status", ["PENDING", "APPROVED", "REJECTED", "SUSPENDED"]);
export const clubStatusEnum = pgEnum("club_status", ["PENDING", "APPROVED", "REJECTED", "ARCHIVED", "PAUSED"]); // Club approval status
export const planTypeEnum = pgEnum("plan_type", ["FREE", "PREMIUM"]);
export const planStatusEnum = pgEnum("plan_status", ["FREE", "PENDING_ACTIVATION", "ACTIVE_PREMIUM", "SUSPENDED"]);
export const playerStatusEnum = pgEnum("player_status", ["ACTIVE", "SUSPENDED", "ARCHIVED", "BANNED"]); // Player profile status
export const genderRestrictionEnum = pgEnum("gender_restriction", ["ALL", "FEMALE_ONLY"]);
export const sessionTypeEnum = pgEnum("session_type", ["OPEN", "JUNIORS_ONLY"]);
export const tournamentStatusEnum = pgEnum("tournament_status", ["DRAFT", "PUBLISHED", "REGISTRATION_OPEN", "ONGOING", "IN_PROGRESS", "COMPLETED", "CANCELLED"]);
export const tournamentTypeEnum = pgEnum("tournament_type", ["CLUB", "OPEN", "LEAGUE", "FRIENDLY"]);
export const tournamentFormatEnum = pgEnum("tournament_format", ["ROUND_ROBIN", "KNOCKOUT", "GROUP_KNOCKOUT"]);
export const tournamentMatchStatusEnum = pgEnum("tournament_match_status", ["UPCOMING", "LIVE", "FINISHED"]);
export const clubMembershipStatusEnum = pgEnum("club_membership_status", ["PENDING", "ACTIVE", "EXPIRING", "EXPIRED", "CANCELLED"]);
export const membershipRequestStatusEnum = pgEnum("membership_request_status", ["PENDING", "APPROVED", "REJECTED"]);
export const merchOrderStatusEnum = pgEnum("merch_order_status", ["PENDING", "CONFIRMED", "DELIVERED", "CANCELLED"]);
export const inventoryMovementTypeEnum = pgEnum("inventory_movement_type", ["RECEIPT", "USAGE", "SALE", "ADJUSTMENT"]);
export const recurrenceFrequencyEnum = pgEnum("recurrence_frequency", ["DAILY", "WEEKLY", "BIWEEKLY", "MONTHLY"]);
export const acquisitionSourceEnum = pgEnum("acquisition_source", [
  "FACEBOOK", "INSTAGRAM", "TIKTOK", "WEBSITE", "WORD_OF_MOUTH",
  "LEISURE_CENTRE", "SAW_SESSION", "THROUGH_COACH", "REFERRAL", "OTHER"
]);

// === USERS ===
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  fullName: text("full_name").notNull(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  role: roleEnum("role").default("PLAYER").notNull(),
  emailVerified: boolean("email_verified").default(false).notNull(),
  accountStatus: accountStatusEnum("account_status").default("PENDING").notNull(),
  claimedProfileId: integer("claimed_profile_id"),
  dateOfBirth: timestamp("date_of_birth"),
  isJunior: boolean("is_junior").default(false).notNull(),
  parentUserId: integer("parent_user_id"),
  phone: text("phone"),
  parentGuardianName: text("parent_guardian_name"),
  parentGuardianEmail: text("parent_guardian_email"),
  emergencyContact: text("emergency_contact"),
  medicalNotes: text("medical_notes"),
  continent: text("continent"),
  country: text("country"),
  region: text("region"),
  city: text("city"),
  passwordResetToken: text("password_reset_token"),
  passwordResetExpiry: timestamp("password_reset_expiry"),
  closedAt: timestamp("closed_at"),
  closedReason: text("closed_reason"),
  profilePictureUrl: text("profile_picture_url"),
  nickname: text("nickname"),
  claimToken: text("claim_token"),
  claimTokenExpiry: timestamp("claim_token_expiry"),
  showPublicName: boolean("show_public_name").default(false).notNull(),
  displayMode: text("display_mode").default("light").notNull(),
  reducedMotion: boolean("reduced_motion").default(false).notNull(),
  dashboardBackground: text("dashboard_background").default("none"),
  fontFamily: text("font_family").default("inter"),
  fontMode: text("font_mode").default("all"),
  sidebarPin: text("sidebar_pin"),
  bottomNavItems: text("bottom_nav_items"),
  acquisitionSource: acquisitionSourceEnum("acquisition_source"),
  acquisitionSourceOther: text("acquisition_source_other"),
  lastActivityAt: timestamp("last_activity_at"),
  deletionScheduledAt: timestamp("deletion_scheduled_at"),
  deletionScheduledBy: integer("deletion_scheduled_by"),
  deletionReason: text("deletion_reason"),
  badmintonEnglandNumber: text("badminton_england_number"),
  blackCardAccess: boolean("black_card_access").default(false).notNull(),
  selectedAvatar: text("selected_avatar"),
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
  googleMapsUrl: text("google_maps_url"),
  continent: text("continent"),
  country: text("country"),
  region: text("region"),
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
  // Club Policies & Standards (shown to members when joining)
  clubPolicies: text("club_policies"),
  clubStandards: text("club_standards"),
  autoGradingEnabled: boolean("auto_grading_enabled").default(true).notNull(),
  homeVenueName: text("home_venue_name"),
  homeVenueAddress: text("home_venue_address"),
  homeGoogleMapsUrl: text("home_google_maps_url"),
  // Contact Information (visible only to super admin)
  contactFullName: text("contact_full_name"),
  contactPhone: text("contact_phone"),
  contactAddress: text("contact_address"),
  bankName: text("bank_name"),
  bankAccountName: text("bank_account_name"),
  bankSortCode: text("bank_sort_code"),
  bankAccountNumber: text("bank_account_number"),
  bankReference: text("bank_reference"),
  planType: planTypeEnum("plan_type").default("FREE").notNull(),
  planStatus: planStatusEnum("plan_status").default("FREE").notNull(),
  premiumStartDate: timestamp("premium_start_date"),
  premiumEndDate: timestamp("premium_end_date"),
  premiumPaymentReference: text("premium_payment_reference"),
  sportTypes: jsonb("sport_types").$type<string[]>().default(["badminton"]),
  socialLinks: jsonb("social_links").$type<{ platform: string; url: string }[]>().default([]),
  matchEngineSettings: jsonb("match_engine_settings").$type<Record<string, any>>(),
  featureOverrides: jsonb("feature_overrides").$type<Record<string, boolean>>().default({}).notNull(),
  creditAutoApprove: boolean("credit_auto_approve").default(false).notNull(),
  creditAutoCancelWindowHours: integer("credit_auto_cancel_window_hours"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// === MEMBERSHIP PLANS (replaces old memberships table) ===
export const membershipPlans = pgTable("membership_plans", {
  id: serial("id").primaryKey(),
  clubId: integer("club_id").references(() => clubs.id).notNull(),
  name: text("name").notNull(),
  annualPrice: integer("annual_price").notNull(),
  defaultSessionFee: integer("default_session_fee").notNull(),
  defaultDurationDays: integer("default_duration_days").default(365).notNull(),
  isDefault: boolean("is_default").default(false).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// === CLUB MEMBERSHIPS (per-user-per-club active membership) ===
export const clubMemberships = pgTable("club_memberships", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  clubId: integer("club_id").references(() => clubs.id).notNull(),
  planId: integer("plan_id").references(() => membershipPlans.id).notNull(),
  membershipNumber: text("membership_number"),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  totalDays: integer("total_days").notNull(),
  status: clubMembershipStatusEnum("status").default("PENDING").notNull(),
  proratedPrice: integer("prorated_price"),
  prorationFactor: text("proration_factor"),
  paymentConfirmed: boolean("payment_confirmed").default(false).notNull(),
  cancelledAt: timestamp("cancelled_at"),
  cancelReason: text("cancel_reason"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// === MEMBERSHIP REQUESTS ===
export const membershipRequests = pgTable("membership_requests", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  clubId: integer("club_id").references(() => clubs.id).notNull(),
  planId: integer("plan_id").references(() => membershipPlans.id).notNull(),
  status: membershipRequestStatusEnum("status").default("PENDING").notNull(),
  rejectionReason: text("rejection_reason"),
  approvedById: integer("approved_by_id").references(() => users.id),
  approvedAt: timestamp("approved_at"),
  requestedStartDate: timestamp("requested_start_date"),
  requestedEndDate: timestamp("requested_end_date"),
  proratedPrice: integer("prorated_price"),
  prorationFactor: text("proration_factor"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// === MERCHANDISE ===
export const merchandise = pgTable("merchandise", {
  id: serial("id").primaryKey(),
  clubId: integer("club_id").references(() => clubs.id).notNull(),
  name: text("name").notNull(),
  price: integer("price").notNull(),
  includedInMembership: boolean("included_in_membership").default(false).notNull(),
  sizes: jsonb("sizes").$type<string[]>(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// === MERCHANDISE ORDERS ===
export const merchandiseOrders = pgTable("merchandise_orders", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  clubId: integer("club_id").references(() => clubs.id).notNull(),
  merchandiseId: integer("merchandise_id").references(() => merchandise.id).notNull(),
  size: text("size"),
  quantity: integer("quantity").default(1).notNull(),
  totalPrice: integer("total_price").notNull(),
  status: merchOrderStatusEnum("status").default("PENDING").notNull(),
  membershipId: integer("membership_id").references(() => clubMemberships.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// === INVENTORY ITEMS ===
export const inventoryItems = pgTable("inventory_items", {
  id: serial("id").primaryKey(),
  clubId: integer("club_id").references(() => clubs.id).notNull(),
  name: text("name").notNull(),
  supplier: text("supplier"),
  unitPrice: integer("unit_price").default(0).notNull(),
  stockAvailable: integer("stock_available").default(0).notNull(),
  isSessionLinked: boolean("is_session_linked").default(false).notNull(),
  canBeSold: boolean("can_be_sold").default(false).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// === INVENTORY MOVEMENTS (audit trail) ===
export const inventoryMovements = pgTable("inventory_movements", {
  id: serial("id").primaryKey(),
  clubId: integer("club_id").references(() => clubs.id).notNull(),
  itemId: integer("item_id").references(() => inventoryItems.id).notNull(),
  quantityDelta: integer("quantity_delta").notNull(),
  unitPrice: integer("unit_price"),
  totalAmount: integer("total_amount"),
  movementType: inventoryMovementTypeEnum("movement_type").notNull(),
  sessionId: integer("session_id").references(() => sessions.id),
  buyerName: text("buyer_name"),
  notes: text("notes"),
  createdById: integer("created_by_id").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// === GENERAL EXPENSES ===
export const expenses = pgTable("expenses", {
  id: serial("id").primaryKey(),
  clubId: integer("club_id").references(() => clubs.id).notNull(),
  sessionId: integer("session_id").references(() => sessions.id),
  name: text("name").notNull(),
  amount: integer("amount").notNull(),
  notes: text("notes"),
  createdById: integer("created_by_id").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Legacy alias for backward compatibility
export const memberships = membershipPlans;

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
  grade: text("grade").default("C3"),
  adminLocked: boolean("admin_locked").default(false).notNull(),
  gradingResetAt: timestamp("grading_reset_at"),
  promotionStreak: integer("promotion_streak").default(0).notNull(),
  demotionStreak: integer("demotion_streak").default(0).notNull(),
  rankingPoints: integer("ranking_points").default(0).notNull(),
  matchesPlayed: integer("matches_played").default(0).notNull(),
  matchesWon: integer("matches_won").default(0).notNull(),
  membershipId: integer("membership_id").references(() => membershipPlans.id),
  joinedAt: timestamp("joined_at").defaultNow().notNull(),
  deletedAt: timestamp("deleted_at"),
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
  courtNames: jsonb("court_names").$type<string[]>(),
  pricePerUnit: integer("price_per_unit").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// === EXPENSE MATERIALS ===
export const expenseMaterials = pgTable("expense_materials", {
  id: serial("id").primaryKey(),
  clubId: integer("club_id").references(() => clubs.id).notNull(),
  name: text("name").notNull(),
  pricePerUnit: integer("price_per_unit").default(0).notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// === SESSIONS ===
export const recurringEvents = pgTable("recurring_events", {
  id: serial("id").primaryKey(),
  clubId: integer("club_id").references(() => clubs.id).notNull(),
  title: text("title").notNull(),
  frequency: recurrenceFrequencyEnum("frequency").notNull(),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date"),
  neverEnd: boolean("never_end").default(false).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdBy: integer("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const sessions = pgTable("sessions", {
  id: serial("id").primaryKey(),
  clubId: integer("club_id").references(() => clubs.id).notNull(),
  venueId: integer("venue_id").references(() => venues.id),
  title: text("title").notNull(),
  date: timestamp("date").notNull(),
  startTime: text("start_time").notNull(),
  durationMinutes: integer("duration_minutes").default(120).notNull(),
  maxPlayers: integer("max_players").notNull(),
  courtsAvailable: integer("courts_available").notNull(),
  allowedCategories: jsonb("allowed_categories").$type<string[]>().notNull(),
  matchMode: matchModeEnum("match_mode").default("SOCIAL").notNull(),
  isPrivate: boolean("is_private").default(false).notNull(),
  genderRestriction: genderRestrictionEnum("gender_restriction").default("ALL").notNull(),
  sessionType: sessionTypeEnum("session_type").default("OPEN").notNull(),
  juniorAgeGroups: jsonb("junior_age_groups").$type<string[]>(),
  playersPerSide: integer("players_per_side").default(2).notNull(),
  matchGenderType: matchGenderTypeEnum("match_gender_type").default("MIXED").notNull(),
  createdBy: integer("created_by").references(() => users.id),
  status: text("status").default("UPCOMING"),
  shuttleTubesUsed: integer("shuttle_tubes_used").default(0),
  sessionFee: integer("session_fee"),
  premiumFee: integer("premium_fee"),
  superPremiumFee: integer("super_premium_fee"),
  clubMemberFee: integer("club_member_fee"),
  shuttlecockType: text("shuttlecock_type"),
  hallName: text("hall_name"),
  courtNames: jsonb("court_names").$type<string[]>(),
  liveStreamUrl: text("live_stream_url"),
  defaultPointsToPlayTo: integer("default_points_to_play_to").default(21),
  numberOfSets: integer("number_of_sets").default(1).notNull(),
  autoGenerateActive: boolean("auto_generate_active").default(false).notNull(),
  aiBrainEnabled: boolean("ai_brain_enabled").default(false).notNull(),
  queueTargetSize: integer("queue_target_size").default(3),
  matchmakingMode: text("matchmaking_mode"),
  recurringEventId: integer("recurring_event_id").references(() => recurringEvents.id),
  publishAt: timestamp("publish_at"),
  invoiceNumber: text("invoice_number"),
  sessionDetails: text("session_details"),
  bannerMessage: text("banner_message"),
  bannerColor: text("banner_color"),
  customLinks: jsonb("custom_links").$type<{ title: string; url: string }[]>().default([]),
  guestClubIds: jsonb("guest_club_ids").$type<number[]>(),
});

// === SESSION SIGNUPS ===
export const sessionSignups = pgTable("session_signups", {
  id: serial("id").primaryKey(),
  sessionId: integer("session_id").references(() => sessions.id).notNull(),
  playerId: integer("player_id").references(() => playerProfiles.id).notNull(),
  fee: integer("fee").notNull(),
  paymentStatus: paymentStatusEnum("payment_status").default("UNPAID").notNull(),
  paymentMethod: paymentMethodEnum("payment_method").default("NONE"),
  signupStatus: signupStatusEnum("signup_status").default("CONFIRMED").notNull(),
  waitingListPosition: integer("waiting_list_position"),
  verifiedByAdmin: boolean("verified_by_admin").default(false).notNull(),
  signedUpByUserId: integer("signed_up_by_user_id").references(() => users.id),
  attendanceStatus: attendanceStatusEnum("attendance_status").default("NOT_ATTENDED").notNull(),
  signupTime: timestamp("signup_time").defaultNow().notNull(),
  genderOverride: text("gender_override"),
  isPaused: boolean("is_paused").default(true).notNull(),
  pairGroupId: integer("pair_group_id"),
  attendanceNote: text("attendance_note"),
  partialPercentage: integer("partial_percentage"),
  policyMet: boolean("policy_met"),
  adminNotes: text("admin_notes"),
  paymentNotes: text("payment_notes"),
});

// === CREDIT LEDGER ===
export const creditLedger = pgTable("credit_ledger", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  clubId: integer("club_id").references(() => clubs.id).notNull(),
  amount: integer("amount").notNull(),
  reason: text("reason").notNull(),
  linkedSessionId: integer("linked_session_id").references(() => sessions.id),
  linkedSignupId: integer("linked_signup_id").references(() => sessionSignups.id),
  attendanceStatus: text("attendance_status"),
  createdById: integer("created_by_id").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// === MATCHES ===
export const matches = pgTable("matches", {
  id: serial("id").primaryKey(),
  sessionId: integer("session_id").references(() => sessions.id).notNull(),
  courtNumber: integer("court_number"),
  queuePosition: integer("queue_position"),
  status: matchStatusEnum("status").default("QUEUED").notNull(),
  teamAPlayer1Id: integer("team_a_player_1_id").references(() => playerProfiles.id),
  teamAPlayer2Id: integer("team_a_player_2_id").references(() => playerProfiles.id),
  teamBPlayer1Id: integer("team_b_player_1_id").references(() => playerProfiles.id),
  teamBPlayer2Id: integer("team_b_player_2_id").references(() => playerProfiles.id),
  scoreA: integer("score_a").default(0),
  scoreB: integer("score_b").default(0),
  isCompleted: boolean("is_completed").default(false).notNull(),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  scoreEnteredByUserId: integer("score_entered_by_user_id").references(() => users.id),
  scoreEnteredAt: timestamp("score_entered_at"),
  scoreUpdatedByUserId: integer("score_updated_by_user_id").references(() => users.id),
  scoreUpdatedAt: timestamp("score_updated_at"),
  pointsToPlayTo: integer("points_to_play_to").default(21),
  numberOfSets: integer("number_of_sets").default(1).notNull(),
  currentSet: integer("current_set").default(1).notNull(),
  setsWonA: integer("sets_won_a").default(0).notNull(),
  setsWonB: integer("sets_won_b").default(0).notNull(),
  setScores: jsonb("set_scores").$type<{ scoreA: number; scoreB: number }[]>(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  deletedAt: timestamp("deleted_at"),
});

// === TOURNAMENTS ===
export const tournamentRegistrationStatusEnum = pgEnum("tournament_registration_status", ["PENDING", "APPROVED", "REJECTED", "WAITLISTED"]);
export const tournamentRegistrationTypeEnum = pgEnum("tournament_registration_type", ["PAIR", "INDIVIDUAL"]);
export const tournamentPairRequestStatusEnum = pgEnum("tournament_pair_request_status", ["PENDING", "ACCEPTED", "DECLINED", "DISSOLVED"]);
export const tournamentPaymentStatusEnum = pgEnum("tournament_payment_status", ["UNPAID", "PENDING", "PAID"]);

export const tournaments = pgTable("tournaments", {
  id: serial("id").primaryKey(),
  clubId: integer("club_id").references(() => clubs.id).notNull(),
  name: text("name").notNull(),
  type: tournamentTypeEnum("type").default("CLUB").notNull(),
  venueId: integer("venue_id").references(() => venues.id),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  status: tournamentStatusEnum("status").default("DRAFT").notNull(),
  description: text("description"),
  courtsAvailable: integer("courts_available").default(4).notNull(),
  createdBy: integer("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  bannerUrl: text("banner_url"),
  logoUrl: text("logo_url"),
  maxPlayers: integer("max_players"),
  skillLevelMin: text("skill_level_min"),
  skillLevelMax: text("skill_level_max"),
  registrationDeadline: timestamp("registration_deadline"),
  location: text("location"),
  socialLinks: jsonb("social_links").$type<Record<string, string>>(),
  isLocked: boolean("is_locked").default(false).notNull(),
  entryFee: text("entry_fee"),
  externalEntryFee: text("external_entry_fee"),
  prizeInfo: text("prize_info"),
  rules: text("rules"),
  groupsPerSide: integer("groups_per_side").default(2),
  pairsPerGroup: integer("pairs_per_group").default(4),
  allowedClubIds: integer("allowed_club_ids").array(),
});

export const tournamentCourts = pgTable("tournament_courts", {
  id: serial("id").primaryKey(),
  tournamentId: integer("tournament_id").references(() => tournaments.id).notNull(),
  name: text("name").notNull(),
  courtOrder: integer("court_order").default(1).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const tournamentCategories = pgTable("tournament_categories", {
  id: serial("id").primaryKey(),
  tournamentId: integer("tournament_id").references(() => tournaments.id).notNull(),
  name: text("name").notNull(),
  format: tournamentFormatEnum("format").default("KNOCKOUT").notNull(),
  playersPerSide: integer("players_per_side").default(1).notNull(),
  genderRestriction: text("gender_restriction").default("MIXED"),
  level: text("level"),
  groupCount: integer("group_count").default(1),
  advancePerGroup: integer("advance_per_group").default(2),
  maxTeams: integer("max_teams"),
  scoringFormat: text("scoring_format").default("BEST_OF_3"),
  pointsPerWin: integer("points_per_win").default(2).notNull(),
  pointsPerLoss: integer("points_per_loss").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const tournamentTeams = pgTable("tournament_teams", {
  id: serial("id").primaryKey(),
  categoryId: integer("category_id").references(() => tournamentCategories.id).notNull(),
  player1Id: integer("player1_id").references(() => playerProfiles.id).notNull(),
  player2Id: integer("player2_id").references(() => playerProfiles.id),
  seedNumber: integer("seed_number"),
  groupNumber: integer("group_number"),
  subGroupNumber: integer("sub_group_number"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const tournamentMatches = pgTable("tournament_matches", {
  id: serial("id").primaryKey(),
  categoryId: integer("category_id").references(() => tournamentCategories.id).notNull(),
  teamAId: integer("team_a_id").references(() => tournamentTeams.id),
  teamBId: integer("team_b_id").references(() => tournamentTeams.id),
  courtNumber: integer("court_number"),
  courtId: integer("court_id").references(() => tournamentCourts.id),
  teamAName: text("team_a_name"),
  teamBName: text("team_b_name"),
  scheduledTime: timestamp("scheduled_time"),
  status: tournamentMatchStatusEnum("status").default("UPCOMING").notNull(),
  scores: jsonb("scores").$type<Array<{scoreA: number; scoreB: number}>>().default([]),
  winnerId: integer("winner_id").references(() => tournamentTeams.id),
  stageId: integer("stage_id").references(() => tournamentStages.id, { onDelete: "set null" }),
  round: integer("round").default(1).notNull(),
  matchOrder: integer("match_order").default(0).notNull(),
  groupNumber: integer("group_number"),
  subGroupNumber: integer("sub_group_number"),
  bracketPosition: integer("bracket_position"),
  isWalkover: boolean("is_walkover").default(false).notNull(),
  isBye: boolean("is_bye").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const tournamentStandings = pgTable("tournament_standings", {
  id: serial("id").primaryKey(),
  categoryId: integer("category_id").references(() => tournamentCategories.id).notNull(),
  teamId: integer("team_id").references(() => tournamentTeams.id).notNull(),
  groupNumber: integer("group_number").default(1).notNull(),
  subGroupNumber: integer("sub_group_number").default(1).notNull(),
  matchesPlayed: integer("matches_played").default(0).notNull(),
  matchesWon: integer("matches_won").default(0).notNull(),
  matchesLost: integer("matches_lost").default(0).notNull(),
  gamesWon: integer("games_won").default(0).notNull(),
  gamesLost: integer("games_lost").default(0).notNull(),
  pointsFor: integer("points_for").default(0).notNull(),
  pointsAgainst: integer("points_against").default(0).notNull(),
  points: integer("points").default(0).notNull(),
});

export const tournamentPlayerStats = pgTable("tournament_player_stats", {
  id: serial("id").primaryKey(),
  tournamentId: integer("tournament_id").references(() => tournaments.id).notNull(),
  categoryId: integer("category_id").references(() => tournamentCategories.id).notNull(),
  userId: integer("user_id").references(() => users.id).notNull(),
  matchesPlayed: integer("matches_played").default(0).notNull(),
  matchesWon: integer("matches_won").default(0).notNull(),
  matchesLost: integer("matches_lost").default(0).notNull(),
  pointsScored: integer("points_scored").default(0).notNull(),
  pointsConceded: integer("points_conceded").default(0).notNull(),
  pointDifference: integer("point_difference").default(0).notNull(),
});

export const tournamentRegistrations = pgTable("tournament_registrations", {
  id: serial("id").primaryKey(),
  tournamentId: integer("tournament_id").references(() => tournaments.id).notNull(),
  userId: integer("user_id").references(() => users.id).notNull(),
  registrationType: tournamentRegistrationTypeEnum("registration_type").default("INDIVIDUAL").notNull(),
  partnerId: integer("partner_id").references(() => users.id),
  partnerName: text("partner_name"),
  status: tournamentRegistrationStatusEnum("status").default("PENDING").notNull(),
  paymentConfirmed: boolean("payment_confirmed").default(false).notNull(),
  paymentStatus: tournamentPaymentStatusEnum("payment_status").default("UNPAID").notNull(),
  paymentMethod: text("payment_method"),
  paidAt: timestamp("paid_at"),
  categoryId: integer("category_id").references(() => tournamentCategories.id),
  pairName: text("pair_name"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const tournamentPairRequests = pgTable("tournament_pair_requests", {
  id: serial("id").primaryKey(),
  tournamentId: integer("tournament_id").references(() => tournaments.id).notNull(),
  fromUserId: integer("from_user_id").references(() => users.id).notNull(),
  toUserId: integer("to_user_id").references(() => users.id).notNull(),
  status: tournamentPairRequestStatusEnum("status").default("PENDING").notNull(),
  message: text("message"),
  pairName: text("pair_name"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const tournamentWaitlist = pgTable("tournament_waitlist", {
  id: serial("id").primaryKey(),
  tournamentId: integer("tournament_id").references(() => tournaments.id).notNull(),
  userId: integer("user_id").references(() => users.id).notNull(),
  position: integer("position").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const tournamentPrizes = pgTable("tournament_prizes", {
  id: serial("id").primaryKey(),
  tournamentId: integer("tournament_id").references(() => tournaments.id).notNull(),
  categoryId: integer("category_id").references(() => tournamentCategories.id),
  title: text("title").notNull(),
  description: text("description"),
  placement: integer("placement").notNull(),
  prizeValue: text("prize_value"),
  prizeType: text("prize_type").default("trophy"),
  iconType: text("icon_type").default("trophy"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const tournamentStages = pgTable("tournament_stages", {
  id: serial("id").primaryKey(),
  tournamentId: integer("tournament_id").references(() => tournaments.id, { onDelete: "cascade" }).notNull(),
  name: text("name").notNull(),
  displayOrder: integer("display_order").default(1).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const tournamentGroups = pgTable("tournament_groups", {
  id: serial("id").primaryKey(),
  tournamentId: integer("tournament_id").references(() => tournaments.id).notNull(),
  categoryId: integer("category_id").references(() => tournamentCategories.id),
  stageId: integer("stage_id").references(() => tournamentStages.id, { onDelete: "set null" }),
  name: text("name").notNull(),
  groupOrder: integer("group_order").default(1).notNull(),
  maxPairs: integer("max_pairs").default(4).notNull(),
  startTime: timestamp("start_time"),
  venueId: integer("venue_id").references(() => venues.id),
  hallName: text("hall_name"),
  courtName: text("court_name"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const tournamentGroupPairs = pgTable("tournament_group_pairs", {
  id: serial("id").primaryKey(),
  groupId: integer("group_id").references(() => tournamentGroups.id).notNull(),
  teamId: integer("team_id").references(() => tournamentTeams.id),
  pairRequestId: integer("pair_request_id").references(() => tournamentPairRequests.id),
  pairOrder: integer("pair_order").default(1).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const tournamentAdmins = pgTable("tournament_admins", {
  id: serial("id").primaryKey(),
  tournamentId: integer("tournament_id").references(() => tournaments.id).notNull(),
  userId: integer("user_id").references(() => users.id).notNull(),
  grantedBy: integer("granted_by").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const tournamentAdminsRelations = relations(tournamentAdmins, ({ one }) => ({
  tournament: one(tournaments, { fields: [tournamentAdmins.tournamentId], references: [tournaments.id] }),
  user: one(users, { fields: [tournamentAdmins.userId], references: [users.id] }),
  grantedByUser: one(users, { fields: [tournamentAdmins.grantedBy], references: [users.id] }),
}));

// === COACHES ===
export const coachStatusEnum = pgEnum("coach_status", ["PENDING", "APPROVED", "REJECTED", "SUSPENDED"]);
export const coachSeekerStatusEnum = pgEnum("coach_seeker_status", ["ACTIVE", "SUSPENDED", "CANCELLED", "PENDING"]);

export const coaches = pgTable("coaches", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  fullName: text("full_name").notNull(),
  email: text("email").notNull(),
  phone: text("phone"),
  profilePhoto: text("profile_photo"),
  roleTitle: text("role_title"),
  bio: text("bio"),
  location: text("location"),
  city: text("city"),
  postcode: text("postcode"),
  latitude: text("latitude"),
  longitude: text("longitude"),
  googleMapsUrl: text("google_maps_url"),
  areaCoverage: text("area_coverage"),
  availability: text("availability"),
  coachingCertifications: text("coaching_certifications"),
  safeguardingDbs: text("safeguarding_dbs"),
  firstAidCert: boolean("first_aid_cert").default(false).notNull(),
  cpdTraining: text("cpd_training"),
  languagesSpoken: text("languages_spoken"),
  qualifications: text("qualifications"),
  badmintonEnglandCert: boolean("badminton_england_cert").default(false).notNull(),
  yearsTraining: integer("years_training"),
  playingExperience: text("playing_experience"),
  specialism: text("specialism").array(),
  coachingPhilosophy: text("coaching_philosophy"),
  preferredGroupSize: text("preferred_group_size"),
  coachingFocus: text("coaching_focus").array(),
  sessionTypesOffered: text("session_types_offered").array(),
  sessionPrices: text("session_prices"),
  ageGroupsCoached: text("age_groups_coached").array(),
  equipmentProvided: text("equipment_provided"),
  cancellationPolicy: text("cancellation_policy"),
  professionalCareer: text("professional_career"),
  experience: text("experience"),
  achievements: text("achievements"),
  playersDeveloped: text("players_developed"),
  tournamentsWon: text("tournaments_won"),
  teamsCoached: text("teams_coached"),
  testimonials: text("testimonials"),
  insuranceExpiry: timestamp("insurance_expiry"),
  linkedClubIds: integer("linked_club_ids").array(),
  status: coachStatusEnum("status").default("PENDING").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const sessionPreferenceEnum = pgEnum("session_preference", ["GROUP", "ONE_TO_ONE", "BOTH"]);
export const reviewTargetTypeEnum = pgEnum("review_target_type", ["COACH", "CLUB"]);
export const messageStatusEnum = pgEnum("message_status", ["UNREAD", "READ", "ARCHIVED"]);

export const coachSeekerMemberships = pgTable("coach_seeker_memberships", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  fullName: text("full_name"),
  telephone: text("telephone"),
  email: text("email"),
  timePlaying: text("time_playing"),
  preferredTrainingLocation: text("preferred_training_location"),
  sessionPreference: text("session_preference"),
  status: coachSeekerStatusEnum("status").default("PENDING").notNull(),
  paidUntil: timestamp("paid_until"),
  joinedAt: timestamp("joined_at").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const reviews = pgTable("reviews", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  targetType: text("target_type").notNull(),
  targetId: integer("target_id").notNull(),
  rating: integer("rating").notNull(),
  comment: text("comment"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const contactMessages = pgTable("contact_messages", {
  id: serial("id").primaryKey(),
  senderUserId: integer("sender_user_id").references(() => users.id),
  senderName: text("sender_name"),
  senderEmail: text("sender_email"),
  clubId: integer("club_id").references(() => clubs.id),
  subject: text("subject").notNull(),
  message: text("message").notNull(),
  status: text("status").default("UNREAD").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const notificationStatusEnum = pgEnum("notification_status", ["in_progress", "completed", "archived"]);

export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  type: text("type").notNull(),
  title: text("title").notNull(),
  message: text("message").notNull(),
  linkUrl: text("link_url"),
  status: notificationStatusEnum("status").default("in_progress").notNull(),
  readAt: timestamp("read_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// === ANNOUNCEMENTS ===
export const announcements = pgTable("announcements", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  imageUrl: text("image_url"),
  linkUrl: text("link_url"),
  linkText: text("link_text"),
  clubId: integer("club_id").references(() => clubs.id),
  visibleTo: visibilityEnum("visible_to").default("ALL").notNull(),
  authorId: integer("author_id").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const announcementArchives = pgTable("announcement_archives", {
  id: serial("id").primaryKey(),
  announcementId: integer("announcement_id").references(() => announcements.id, { onDelete: "cascade" }).notNull(),
  userId: integer("user_id").references(() => users.id).notNull(),
  archivedAt: timestamp("archived_at").defaultNow().notNull(),
});

// === ANNOUNCEMENT REACTIONS & COMMENTS ===
export const announcementReactions = pgTable("announcement_reactions", {
  id: serial("id").primaryKey(),
  announcementId: integer("announcement_id").references(() => announcements.id, { onDelete: "cascade" }).notNull(),
  userId: integer("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  emoji: text("emoji").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const announcementComments = pgTable("announcement_comments", {
  id: serial("id").primaryKey(),
  announcementId: integer("announcement_id").references(() => announcements.id, { onDelete: "cascade" }).notNull(),
  userId: integer("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  content: text("content").notNull(),
  parentId: integer("parent_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// === INTERNAL MESSAGES ===
export const internalMessages = pgTable("internal_messages", {
  id: serial("id").primaryKey(),
  senderId: integer("sender_id").references(() => users.id).notNull(),
  recipientId: integer("recipient_id").references(() => users.id).notNull(),
  subject: text("subject").notNull(),
  body: text("body").notNull(),
  clubId: integer("club_id").references(() => clubs.id),
  messageCategory: text("message_category").default("GENERAL").notNull(),
  readAt: timestamp("read_at"),
  archivedBySender: boolean("archived_by_sender").default(false).notNull(),
  archivedByRecipient: boolean("archived_by_recipient").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// === POLICY ACCEPTANCES ===
export const policyAcceptances = pgTable("policy_acceptances", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  email: text("email"),
  policyType: text("policy_type").notNull(),
  policyVersion: text("policy_version").notNull(),
  acceptedAt: timestamp("accepted_at").defaultNow().notNull(),
});

// === RELATIONS ===
export const clubsRelations = relations(clubs, ({ many }) => ({
  playerProfiles: many(playerProfiles),
  sessions: many(sessions),
  membershipPlans: many(membershipPlans),
  clubMemberships: many(clubMemberships),
  merchandise: many(merchandise),
}));

export const usersRelations = relations(users, ({ many }) => ({
  playerProfiles: many(playerProfiles),
  clubMemberships: many(clubMemberships),
  membershipRequests: many(membershipRequests),
  merchandiseOrders: many(merchandiseOrders),
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
  membershipPlan: one(membershipPlans, {
    fields: [playerProfiles.membershipId],
    references: [membershipPlans.id],
  }),
  signups: many(sessionSignups),
}));

export const membershipPlansRelations = relations(membershipPlans, ({ one, many }) => ({
  club: one(clubs, { fields: [membershipPlans.clubId], references: [clubs.id] }),
  clubMemberships: many(clubMemberships),
}));

export const clubMembershipsRelations = relations(clubMemberships, ({ one }) => ({
  user: one(users, { fields: [clubMemberships.userId], references: [users.id] }),
  club: one(clubs, { fields: [clubMemberships.clubId], references: [clubs.id] }),
  plan: one(membershipPlans, { fields: [clubMemberships.planId], references: [membershipPlans.id] }),
}));

export const membershipRequestsRelations = relations(membershipRequests, ({ one }) => ({
  user: one(users, { fields: [membershipRequests.userId], references: [users.id], relationName: "membershipRequestUser" }),
  club: one(clubs, { fields: [membershipRequests.clubId], references: [clubs.id] }),
  plan: one(membershipPlans, { fields: [membershipRequests.planId], references: [membershipPlans.id] }),
  approvedBy: one(users, { fields: [membershipRequests.approvedById], references: [users.id], relationName: "membershipRequestApprover" }),
}));

export const merchandiseRelations = relations(merchandise, ({ one, many }) => ({
  club: one(clubs, { fields: [merchandise.clubId], references: [clubs.id] }),
  orders: many(merchandiseOrders),
}));

export const merchandiseOrdersRelations = relations(merchandiseOrders, ({ one }) => ({
  user: one(users, { fields: [merchandiseOrders.userId], references: [users.id] }),
  club: one(clubs, { fields: [merchandiseOrders.clubId], references: [clubs.id] }),
  item: one(merchandise, { fields: [merchandiseOrders.merchandiseId], references: [merchandise.id] }),
  membership: one(clubMemberships, { fields: [merchandiseOrders.membershipId], references: [clubMemberships.id] }),
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

export const tournamentsRelations = relations(tournaments, ({ one, many }) => ({
  club: one(clubs, { fields: [tournaments.clubId], references: [clubs.id] }),
  venue: one(venues, { fields: [tournaments.venueId], references: [venues.id] }),
  creator: one(users, { fields: [tournaments.createdBy], references: [users.id] }),
  categories: many(tournamentCategories),
  registrations: many(tournamentRegistrations),
  pairRequests: many(tournamentPairRequests),
  waitlist: many(tournamentWaitlist),
}));

export const tournamentRegistrationsRelations = relations(tournamentRegistrations, ({ one }) => ({
  tournament: one(tournaments, { fields: [tournamentRegistrations.tournamentId], references: [tournaments.id] }),
  user: one(users, { fields: [tournamentRegistrations.userId], references: [users.id] }),
}));

export const tournamentPairRequestsRelations = relations(tournamentPairRequests, ({ one }) => ({
  tournament: one(tournaments, { fields: [tournamentPairRequests.tournamentId], references: [tournaments.id] }),
  fromUser: one(users, { fields: [tournamentPairRequests.fromUserId], references: [users.id] }),
}));

export const tournamentWaitlistRelations = relations(tournamentWaitlist, ({ one }) => ({
  tournament: one(tournaments, { fields: [tournamentWaitlist.tournamentId], references: [tournaments.id] }),
  user: one(users, { fields: [tournamentWaitlist.userId], references: [users.id] }),
}));

export const tournamentCourtsRelations = relations(tournamentCourts, ({ one }) => ({
  tournament: one(tournaments, { fields: [tournamentCourts.tournamentId], references: [tournaments.id] }),
}));

export const tournamentCategoriesRelations = relations(tournamentCategories, ({ one, many }) => ({
  tournament: one(tournaments, { fields: [tournamentCategories.tournamentId], references: [tournaments.id] }),
  teams: many(tournamentTeams),
  matches: many(tournamentMatches),
  standings: many(tournamentStandings),
}));

export const tournamentTeamsRelations = relations(tournamentTeams, ({ one }) => ({
  category: one(tournamentCategories, { fields: [tournamentTeams.categoryId], references: [tournamentCategories.id] }),
  player1: one(playerProfiles, { fields: [tournamentTeams.player1Id], references: [playerProfiles.id] }),
}));

export const tournamentMatchesRelations = relations(tournamentMatches, ({ one }) => ({
  category: one(tournamentCategories, { fields: [tournamentMatches.categoryId], references: [tournamentCategories.id] }),
  teamA: one(tournamentTeams, { fields: [tournamentMatches.teamAId], references: [tournamentTeams.id] }),
  teamB: one(tournamentTeams, { fields: [tournamentMatches.teamBId], references: [tournamentTeams.id] }),
  court: one(tournamentCourts, { fields: [tournamentMatches.courtId], references: [tournamentCourts.id] }),
}));

export const tournamentPlayerStatsRelations = relations(tournamentPlayerStats, ({ one }) => ({
  tournament: one(tournaments, { fields: [tournamentPlayerStats.tournamentId], references: [tournaments.id] }),
  category: one(tournamentCategories, { fields: [tournamentPlayerStats.categoryId], references: [tournamentCategories.id] }),
  user: one(users, { fields: [tournamentPlayerStats.userId], references: [users.id] }),
}));

export const tournamentStandingsRelations = relations(tournamentStandings, ({ one }) => ({
  category: one(tournamentCategories, { fields: [tournamentStandings.categoryId], references: [tournamentCategories.id] }),
  team: one(tournamentTeams, { fields: [tournamentStandings.teamId], references: [tournamentTeams.id] }),
}));

// === GRADE HISTORY ===
// Logs every grade change (auto-promotion, auto-demotion, manual override) for visualisation/audit
export const gradeHistory = pgTable("grade_history", {
  id: serial("id").primaryKey(),
  profileId: integer("profile_id").references(() => playerProfiles.id, { onDelete: "cascade" }).notNull(),
  clubId: integer("club_id").references(() => clubs.id, { onDelete: "cascade" }).notNull(),
  oldGrade: text("old_grade").notNull(),
  newGrade: text("new_grade").notNull(),
  direction: text("direction").notNull(), // "PROMOTION" | "DEMOTION" | "MANUAL"
  trigger: text("trigger").notNull(), // "AUTO" | "MANUAL"
  winRate: integer("win_rate_x100"), // win rate * 100, e.g. 0.6 -> 60
  gamesPlayed: integer("games_played"),
  gamesWon: integer("games_won"),
  sessionsCounted: integer("sessions_counted"),
  changedByUserId: integer("changed_by_user_id").references(() => users.id),
  note: text("note"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const gradeHistoryRelations = relations(gradeHistory, ({ one }) => ({
  profile: one(playerProfiles, { fields: [gradeHistory.profileId], references: [playerProfiles.id] }),
  club: one(clubs, { fields: [gradeHistory.clubId], references: [clubs.id] }),
  changedBy: one(users, { fields: [gradeHistory.changedByUserId], references: [users.id] }),
}));

export const insertGradeHistorySchema = createInsertSchema(gradeHistory).omit({ id: true, createdAt: true });
export type InsertGradeHistory = z.infer<typeof insertGradeHistorySchema>;
export type GradeHistoryRow = typeof gradeHistory.$inferSelect;

// === SCHEMAS ===
export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true, emailVerified: true });
export const insertClubSchema = createInsertSchema(clubs).omit({ id: true, createdAt: true });
export const insertPlayerProfileSchema = createInsertSchema(playerProfiles).omit({ id: true, rankingPoints: true, matchesPlayed: true, matchesWon: true, joinedAt: true });
export const insertVenueSchema = createInsertSchema(venues).omit({ id: true, createdAt: true });
export const insertRecurringEventSchema = createInsertSchema(recurringEvents).omit({ id: true, createdBy: true, createdAt: true }).extend({
  startDate: z.coerce.date(),
  endDate: z.coerce.date().optional().nullable(),
  neverEnd: z.boolean().default(false),
  frequency: z.enum(["DAILY", "WEEKLY", "BIWEEKLY", "MONTHLY"]),
});
export const insertSessionSchema = createInsertSchema(sessions).omit({ id: true, createdBy: true, status: true, recurringEventId: true }).extend({
  date: z.coerce.date(),
  playersPerSide: z.number().min(1).max(2).default(2),
  genderRestriction: z.enum(["ALL", "FEMALE_ONLY"]).default("ALL"),
  sessionType: z.enum(["OPEN", "JUNIORS_ONLY"]).default("OPEN"),
  juniorAgeGroups: z.array(z.string()).optional().nullable(),
  matchGenderType: z.enum(["MIXED", "FEMALE", "MALE"]).default("MIXED"),
  numberOfSets: z.number().min(1).max(3).default(1),
  publishAt: z.coerce.date().optional().nullable(),
  sessionDetails: z.string().optional().nullable(),
  bannerMessage: z.preprocess(
    (v) => (typeof v === "string" && v.trim() === "" ? null : v),
    z.string().trim().max(2000, "Banner must be 2000 characters or fewer").optional().nullable()
  ),
  bannerColor: z.preprocess(
    (v) => (v === "" || v === undefined ? null : v),
    z.enum(["red", "amber", "blue", "green", "purple", "pink"]).optional().nullable()
  ),
  customLinks: z.array(z.object({
    title: z.string().trim().min(1, "Title is required").max(60, "Title must be 60 characters or fewer"),
    url: z.string().trim().min(1, "URL is required").max(500, "URL is too long"),
  })).max(10, "Up to 10 links allowed").optional().nullable(),
});
export const insertAnnouncementSchema = createInsertSchema(announcements).omit({ id: true, authorId: true, createdAt: true }).extend({
  clubId: z.number().nullable().optional(),
  imageUrl: z.string().nullable().optional(),
  linkUrl: z.string().nullable().optional(),
  linkText: z.string().nullable().optional(),
});
export const insertMatchSchema = createInsertSchema(matches).omit({ id: true, createdAt: true });
export const insertCoachSchema = createInsertSchema(coaches).omit({ id: true, createdAt: true, status: true });
export const insertCoachSeekerMembershipSchema = createInsertSchema(coachSeekerMemberships).omit({ id: true, createdAt: true, joinedAt: true });
export const insertReviewSchema = createInsertSchema(reviews).omit({ id: true, createdAt: true });
export const insertContactMessageSchema = createInsertSchema(contactMessages).omit({ id: true, createdAt: true, status: true });
export const insertNotificationSchema = createInsertSchema(notifications).omit({ id: true, createdAt: true, readAt: true });

export const insertTournamentSchema = createInsertSchema(tournaments).omit({ id: true, createdBy: true, createdAt: true }).extend({
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
});
export const insertTournamentCourtSchema = createInsertSchema(tournamentCourts).omit({ id: true, createdAt: true });
export const insertTournamentCategorySchema = createInsertSchema(tournamentCategories).omit({ id: true, createdAt: true });
export const insertTournamentTeamSchema = createInsertSchema(tournamentTeams).omit({ id: true, createdAt: true });
export const insertTournamentMatchSchema = createInsertSchema(tournamentMatches).omit({ id: true, createdAt: true });
export const insertTournamentPlayerStatSchema = createInsertSchema(tournamentPlayerStats).omit({ id: true });
export const insertTournamentGroupSchema = createInsertSchema(tournamentGroups).omit({ id: true, createdAt: true });
export const insertTournamentGroupPairSchema = createInsertSchema(tournamentGroupPairs).omit({ id: true, createdAt: true });
export const insertTournamentStageSchema = createInsertSchema(tournamentStages).omit({ id: true, createdAt: true });

export const insertInternalMessageSchema = createInsertSchema(internalMessages).omit({ id: true, createdAt: true, readAt: true });
export const insertPolicyAcceptanceSchema = createInsertSchema(policyAcceptances).omit({ id: true, acceptedAt: true });
export const insertCreditLedgerSchema = createInsertSchema(creditLedger).omit({ id: true, createdAt: true });
export const insertMembershipPlanSchema = createInsertSchema(membershipPlans).omit({ id: true, createdAt: true });
export const insertClubMembershipSchema = createInsertSchema(clubMemberships).omit({ id: true, createdAt: true }).extend({
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
});
export const insertMembershipRequestSchema = createInsertSchema(membershipRequests).omit({ id: true, createdAt: true });
export const insertMerchandiseSchema = createInsertSchema(merchandise).omit({ id: true, createdAt: true });
export const insertMerchandiseOrderSchema = createInsertSchema(merchandiseOrders).omit({ id: true, createdAt: true });
export const insertInventoryItemSchema = createInsertSchema(inventoryItems).omit({ id: true, createdAt: true });
export const insertInventoryMovementSchema = createInsertSchema(inventoryMovements).omit({ id: true, createdAt: true });
export const insertExpenseSchema = createInsertSchema(expenses).omit({ id: true, createdAt: true });

// === TYPES ===
export type User = typeof users.$inferSelect;
export type Club = typeof clubs.$inferSelect;
export type PlayerProfile = typeof playerProfiles.$inferSelect;
export type Venue = typeof venues.$inferSelect;
export type Session = typeof sessions.$inferSelect;
export type SessionSignup = typeof sessionSignups.$inferSelect;
export type Match = typeof matches.$inferSelect;
export type Announcement = typeof announcements.$inferSelect;
export type AnnouncementArchive = typeof announcementArchives.$inferSelect;
export type AnnouncementReaction = typeof announcementReactions.$inferSelect;
export type AnnouncementComment = typeof announcementComments.$inferSelect;
export type Membership = typeof memberships.$inferSelect;
export type Tournament = typeof tournaments.$inferSelect;
export type TournamentCourt = typeof tournamentCourts.$inferSelect;
export type TournamentCategory = typeof tournamentCategories.$inferSelect;
export type TournamentTeam = typeof tournamentTeams.$inferSelect;
export type TournamentMatch = typeof tournamentMatches.$inferSelect;
export type TournamentStanding = typeof tournamentStandings.$inferSelect;
export type TournamentPlayerStat = typeof tournamentPlayerStats.$inferSelect;
export type TournamentRegistration = typeof tournamentRegistrations.$inferSelect;
export type TournamentPairRequest = typeof tournamentPairRequests.$inferSelect;
export type TournamentWaitlistEntry = typeof tournamentWaitlist.$inferSelect;
export type TournamentPrize = typeof tournamentPrizes.$inferSelect;
export type TournamentGroup = typeof tournamentGroups.$inferSelect;
export type TournamentStage = typeof tournamentStages.$inferSelect;
export type InsertTournamentStage = z.infer<typeof insertTournamentStageSchema>;
export type TournamentGroupPair = typeof tournamentGroupPairs.$inferSelect;
export type Coach = typeof coaches.$inferSelect;
export type CoachSeekerMembership = typeof coachSeekerMemberships.$inferSelect;
export type Review = typeof reviews.$inferSelect;
export type ContactMessage = typeof contactMessages.$inferSelect;
export type Notification = typeof notifications.$inferSelect;
export type InsertCoach = z.infer<typeof insertCoachSchema>;
export type InsertCoachSeekerMembership = z.infer<typeof insertCoachSeekerMembershipSchema>;
export type InsertReview = z.infer<typeof insertReviewSchema>;
export type InsertContactMessage = z.infer<typeof insertContactMessageSchema>;
export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type InsertVenue = z.infer<typeof insertVenueSchema>;
export type CreditLedgerEntry = typeof creditLedger.$inferSelect;
export type InsertCreditLedgerEntry = z.infer<typeof insertCreditLedgerSchema>;
export type MembershipPlan = typeof membershipPlans.$inferSelect;
export type InsertMembershipPlan = z.infer<typeof insertMembershipPlanSchema>;
export type ClubMembership = typeof clubMemberships.$inferSelect;
export type InsertClubMembership = z.infer<typeof insertClubMembershipSchema>;
export type MembershipRequest = typeof membershipRequests.$inferSelect;
export type InsertMembershipRequest = z.infer<typeof insertMembershipRequestSchema>;
export type Merchandise = typeof merchandise.$inferSelect;
export type InsertMerchandise = z.infer<typeof insertMerchandiseSchema>;
export type MerchandiseOrder = typeof merchandiseOrders.$inferSelect;
export type InsertMerchandiseOrder = z.infer<typeof insertMerchandiseOrderSchema>;
export type InventoryItem = typeof inventoryItems.$inferSelect;
export type InsertInventoryItem = z.infer<typeof insertInventoryItemSchema>;
export type InventoryMovement = typeof inventoryMovements.$inferSelect;
export type InsertInventoryMovement = z.infer<typeof insertInventoryMovementSchema>;
export type Expense = typeof expenses.$inferSelect;
export type InsertExpense = z.infer<typeof insertExpenseSchema>;

export type InsertAnnouncement = z.infer<typeof insertAnnouncementSchema>;
export type InsertMatch = z.infer<typeof insertMatchSchema>;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type InsertClub = z.infer<typeof insertClubSchema>;
export type InsertPlayerProfile = z.infer<typeof insertPlayerProfileSchema>;
export type InsertSession = z.infer<typeof insertSessionSchema>;
export type RecurringEvent = typeof recurringEvents.$inferSelect;
export type InsertRecurringEvent = z.infer<typeof insertRecurringEventSchema>;
export type InsertTournament = z.infer<typeof insertTournamentSchema>;
export type InsertTournamentCategory = z.infer<typeof insertTournamentCategorySchema>;
export type InsertTournamentTeam = z.infer<typeof insertTournamentTeamSchema>;
export type InsertTournamentMatch = z.infer<typeof insertTournamentMatchSchema>;
export type PolicyAcceptance = typeof policyAcceptances.$inferSelect;
export type InternalMessage = typeof internalMessages.$inferSelect;
export type InsertInternalMessage = z.infer<typeof insertInternalMessageSchema>;
export type InsertPolicyAcceptance = z.infer<typeof insertPolicyAcceptanceSchema>;

// === PROFILE MERGE LOGS ===
export const profileMergeLogs = pgTable("profile_merge_logs", {
  id: serial("id").primaryKey(),
  primaryProfileId: integer("primary_profile_id").references(() => playerProfiles.id).notNull(),
  secondaryProfileId: integer("secondary_profile_id").notNull(),
  mergedByUserId: integer("merged_by_user_id").references(() => users.id).notNull(),
  keptEmail: text("kept_email"),
  keptUserId: integer("kept_user_id").references(() => users.id),
  mergeDetails: jsonb("merge_details").$type<{
    sessionsReassigned: number;
    matchesReassigned: number;
    creditEntriesReassigned: number;
    tournamentsReassigned: number;
    duplicateSignupsRemoved: number;
    primaryUserName: string;
    secondaryUserName: string;
    primaryUserId: number;
    secondaryUserId: number;
    clubId: number;
    clubName: string;
  }>(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type ProfileMergeLog = typeof profileMergeLogs.$inferSelect;

// === DEAL CATEGORIES ===
export const dealCategories = pgTable("deal_categories", {
  id: serial("id").primaryKey(),
  clubId: integer("club_id").references(() => clubs.id),
  name: text("name").notNull(),
  emoji: text("emoji").default("🎁"),
  gradient: text("gradient").default("from-purple-500 to-fuchsia-600"),
  imageUrl: text("image_url"),
  sortOrder: integer("sort_order").default(0),
  isDefault: boolean("is_default").default(false).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type DealCategory = typeof dealCategories.$inferSelect;

// === DISCOUNT CODES ===
export const discountCodes = pgTable("discount_codes", {
  id: serial("id").primaryKey(),
  clubId: integer("club_id").references(() => clubs.id).notNull(),
  code: text("code").notNull(),
  description: text("description"),
  discountPercent: integer("discount_percent"),
  shopName: text("shop_name"),
  shopUrl: text("shop_url"),
  imageUrl: text("image_url"),
  category: text("category").default("Other"),
  validUntil: timestamp("valid_until"),
  isActive: boolean("is_active").default(true).notNull(),
  createdBy: integer("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const discountCodeAssignments = pgTable("discount_code_assignments", {
  id: serial("id").primaryKey(),
  discountCodeId: integer("discount_code_id").references(() => discountCodes.id).notNull(),
  userId: integer("user_id").references(() => users.id),
  appliesToAll: boolean("applies_to_all").default(false).notNull(),
  assignedBy: integer("assigned_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const discountCodesRelations = relations(discountCodes, ({ one, many }) => ({
  club: one(clubs, { fields: [discountCodes.clubId], references: [clubs.id] }),
  assignments: many(discountCodeAssignments),
}));

export const discountCodeAssignmentsRelations = relations(discountCodeAssignments, ({ one }) => ({
  discountCode: one(discountCodes, { fields: [discountCodeAssignments.discountCodeId], references: [discountCodes.id] }),
  user: one(users, { fields: [discountCodeAssignments.userId], references: [users.id] }),
}));

// === EMAIL TEMPLATES ===
export const emailTemplateTypeEnum = pgEnum("email_template_type", [
  "WELCOME", "PASSWORD_RESET", "ACCOUNT_CLAIMED",
  "SESSION_BOOKING", "SESSION_CANCELLATION",
  "UNPAID_FEES_REMINDER", "MEMBERSHIP_EXPIRY",
  "CLUB_ANNOUNCEMENT", "EVENT_REMINDER", "CUSTOM"
]);

export const emailTemplates = pgTable("email_templates", {
  id: serial("id").primaryKey(),
  templateType: emailTemplateTypeEnum("template_type").notNull(),
  name: text("name").notNull(),
  subject: text("subject").notNull(),
  htmlBody: text("html_body").notNull(),
  isSystem: boolean("is_system").default(false).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  clubId: integer("club_id").references(() => clubs.id),
  createdBy: integer("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const emailLogs = pgTable("email_logs", {
  id: serial("id").primaryKey(),
  templateId: integer("template_id").references(() => emailTemplates.id),
  templateType: text("template_type"),
  recipientEmail: text("recipient_email").notNull(),
  recipientUserId: integer("recipient_user_id").references(() => users.id),
  subject: text("subject").notNull(),
  status: text("status").default("SENT").notNull(),
  error: text("error"),
  sentBy: integer("sent_by").references(() => users.id),
  clubId: integer("club_id").references(() => clubs.id),
  sentAt: timestamp("sent_at").defaultNow().notNull(),
});

export const insertEmailTemplateSchema = createInsertSchema(emailTemplates).omit({ id: true, createdAt: true, updatedAt: true });
export const insertEmailLogSchema = createInsertSchema(emailLogs).omit({ id: true, sentAt: true });

export type EmailTemplate = typeof emailTemplates.$inferSelect;
export type InsertEmailTemplate = z.infer<typeof insertEmailTemplateSchema>;
export type EmailLog = typeof emailLogs.$inferSelect;
export type InsertEmailLog = z.infer<typeof insertEmailLogSchema>;

export const insertDiscountCodeSchema = createInsertSchema(discountCodes).omit({ id: true, createdAt: true });
export const insertDiscountCodeAssignmentSchema = createInsertSchema(discountCodeAssignments).omit({ id: true, createdAt: true });
export type DiscountCode = typeof discountCodes.$inferSelect;
export type InsertDiscountCode = z.infer<typeof insertDiscountCodeSchema>;
export type DiscountCodeAssignment = typeof discountCodeAssignments.$inferSelect;
export type InsertDiscountCodeAssignment = z.infer<typeof insertDiscountCodeAssignmentSchema>;

// === Ticketing System ===
export const ticketStatusEnum = pgEnum("ticket_status", ["SUBMITTED", "UNDER_REVIEW", "RESPONDED", "AWAITING_USER", "RESOLVED", "CLOSED"]);
export const ticketCategoryEnum = pgEnum("ticket_category", ["CONCERN", "COMPLAINT", "SUGGESTION", "GENERAL", "SAFEGUARDING", "BAN_APPEAL", "CREDIT_CLAIM"]);
export const ticketPriorityEnum = pgEnum("ticket_priority", ["LOW", "MEDIUM", "HIGH", "URGENT"]);

export const tickets = pgTable("tickets", {
  id: serial("id").primaryKey(),
  ticketNumber: text("ticket_number").notNull(),
  clubId: integer("club_id").references(() => clubs.id).notNull(),
  createdByUserId: integer("created_by_user_id").references(() => users.id).notNull(),
  assignedToUserId: integer("assigned_to_user_id").references(() => users.id),
  subject: text("subject").notNull(),
  description: text("description").notNull(),
  category: ticketCategoryEnum("category").notNull(),
  priority: ticketPriorityEnum("priority").default("MEDIUM").notNull(),
  status: ticketStatusEnum("status").default("SUBMITTED").notNull(),
  resolution: text("resolution"),
  isConfidential: boolean("is_confidential").default(false).notNull(),
  isArchived: boolean("is_archived").default(false).notNull(),
  linkedBanUserId: integer("linked_ban_user_id").references(() => users.id),
  linkedSessionId: integer("linked_session_id").references(() => sessions.id),
  creditAmount: integer("credit_amount"),
  lastActivityAt: timestamp("last_activity_at").defaultNow().notNull(),
  autoCloseAt: timestamp("auto_close_at"),
  closedAt: timestamp("closed_at"),
  deletedAt: timestamp("deleted_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const ticketReplies = pgTable("ticket_replies", {
  id: serial("id").primaryKey(),
  ticketId: integer("ticket_id").references(() => tickets.id).notNull(),
  authorUserId: integer("author_user_id").references(() => users.id).notNull(),
  body: text("body").notNull(),
  isStaff: boolean("is_staff").default(false).notNull(),
  deletedAt: timestamp("deleted_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const ticketInternalNotes = pgTable("ticket_internal_notes", {
  id: serial("id").primaryKey(),
  ticketId: integer("ticket_id").references(() => tickets.id).notNull(),
  authorUserId: integer("author_user_id").references(() => users.id).notNull(),
  body: text("body").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const ticketAuditLogs = pgTable("ticket_audit_logs", {
  id: serial("id").primaryKey(),
  ticketId: integer("ticket_id").references(() => tickets.id).notNull(),
  actorUserId: integer("actor_user_id").references(() => users.id),
  action: text("action").notNull(),
  fromStatus: text("from_status"),
  toStatus: text("to_status"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertTicketSchema = createInsertSchema(tickets).omit({ id: true, createdAt: true, lastActivityAt: true, deletedAt: true, closedAt: true });
export const insertTicketReplySchema = createInsertSchema(ticketReplies).omit({ id: true, createdAt: true, deletedAt: true });
export const insertTicketInternalNoteSchema = createInsertSchema(ticketInternalNotes).omit({ id: true, createdAt: true });
export const insertTicketAuditLogSchema = createInsertSchema(ticketAuditLogs).omit({ id: true, createdAt: true });

export type Ticket = typeof tickets.$inferSelect;
export type InsertTicket = z.infer<typeof insertTicketSchema>;
export type TicketReply = typeof ticketReplies.$inferSelect;
export type InsertTicketReply = z.infer<typeof insertTicketReplySchema>;
export type TicketInternalNote = typeof ticketInternalNotes.$inferSelect;
export type InsertTicketInternalNote = z.infer<typeof insertTicketInternalNoteSchema>;
export type TicketAuditLog = typeof ticketAuditLogs.$inferSelect;
export type InsertTicketAuditLog = z.infer<typeof insertTicketAuditLogSchema>;

// === REFERRAL SYSTEM ===
export const referralStatusEnum = pgEnum("referral_status", ["ACTIVE", "PENDING", "APPROVED", "REJECTED", "EXPIRED", "USED"]);

export const clubReferralSettings = pgTable("club_referral_settings", {
  id: serial("id").primaryKey(),
  clubId: integer("club_id").references(() => clubs.id).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  creditAmountPence: integer("credit_amount_pence").default(400).notNull(),
  premiumThresholdPence: integer("premium_threshold_pence").default(800).notNull(),
  championThresholdPence: integer("champion_threshold_pence").default(1600).notNull(),
  codeExpiryDays: integer("code_expiry_days").default(30).notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const clubReferralSettingsRelations = relations(clubReferralSettings, ({ one }) => ({
  club: one(clubs, { fields: [clubReferralSettings.clubId], references: [clubs.id] }),
}));

export const insertClubReferralSettingsSchema = createInsertSchema(clubReferralSettings).omit({ id: true, updatedAt: true });
export type ClubReferralSettings = typeof clubReferralSettings.$inferSelect;
export type InsertClubReferralSettings = z.infer<typeof insertClubReferralSettingsSchema>;

export const referrals = pgTable("referrals", {
  id: serial("id").primaryKey(),
  referrerId: integer("referrer_id").references(() => users.id).notNull(),
  code: text("code").notNull(),
  referredName: text("referred_name"),
  referredEmail: text("referred_email"),
  friendLevel: text("friend_level"),
  friendExperience: text("friend_experience"),
  referredUserId: integer("referred_user_id").references(() => users.id),
  clubId: integer("club_id").references(() => clubs.id),
  status: referralStatusEnum("status").default("ACTIVE").notNull(),
  rejectionReason: text("rejection_reason"),
  approvedById: integer("approved_by_id").references(() => users.id),
  approvedAt: timestamp("approved_at"),
  creditAwarded: integer("credit_awarded"),
  expiresAt: timestamp("expires_at").notNull(),
  usedAt: timestamp("used_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const referralsRelations = relations(referrals, ({ one }) => ({
  referrer: one(users, { fields: [referrals.referrerId], references: [users.id] }),
  referredUser: one(users, { fields: [referrals.referredUserId], references: [users.id] }),
  club: one(clubs, { fields: [referrals.clubId], references: [clubs.id] }),
  approvedBy: one(users, { fields: [referrals.approvedById], references: [users.id] }),
}));

export const insertReferralSchema = createInsertSchema(referrals).omit({ id: true, createdAt: true });
export type Referral = typeof referrals.$inferSelect;
export type InsertReferral = z.infer<typeof insertReferralSchema>;

// === GROUP CHAT SYSTEM ===
export const chatTypeEnum = pgEnum("chat_type", ["SESSION", "CLUB", "PREMIUM", "STAFF", "EVENT", "CUSTOM"]);
export const chatRoleEnum = pgEnum("chat_role", ["ADMIN", "ORGANISER", "COACH", "MEMBER"]);
export const chatMessageTypeEnum = pgEnum("chat_message_type", ["USER", "SYSTEM"]);

export const chats = pgTable("chats", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  type: chatTypeEnum("type").notNull(),
  clubId: integer("club_id").references(() => clubs.id),
  sessionId: integer("session_id").references(() => sessions.id),
  description: text("description"),
  isLocked: boolean("is_locked").default(false).notNull(),
  isReadOnlyForPlayers: boolean("is_read_only_for_players").default(false).notNull(),
  isJuniorLinked: boolean("is_junior_linked").default(false).notNull(),
  pinnedMessageId: integer("pinned_message_id"),
  createdById: integer("created_by_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const chatMembers = pgTable("chat_members", {
  id: serial("id").primaryKey(),
  chatId: integer("chat_id").references(() => chats.id, { onDelete: "cascade" }).notNull(),
  userId: integer("user_id").references(() => users.id).notNull(),
  role: chatRoleEnum("role").default("MEMBER").notNull(),
  isMuted: boolean("is_muted").default(false).notNull(),
  mutedUntil: timestamp("muted_until"),
  muteReason: text("mute_reason"),
  joinedAt: timestamp("joined_at").defaultNow().notNull(),
});

export const chatMessages = pgTable("chat_messages", {
  id: serial("id").primaryKey(),
  chatId: integer("chat_id").references(() => chats.id, { onDelete: "cascade" }).notNull(),
  senderId: integer("sender_id").references(() => users.id),
  body: text("body").notNull(),
  messageType: chatMessageTypeEnum("message_type").default("USER").notNull(),
  systemEventType: text("system_event_type"),
  isPinned: boolean("is_pinned").default(false).notNull(),
  deletedAt: timestamp("deleted_at"),
  deletedById: integer("deleted_by_id").references(() => users.id),
  deleteReason: text("delete_reason"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const chatReactions = pgTable("chat_reactions", {
  id: serial("id").primaryKey(),
  messageId: integer("message_id").references(() => chatMessages.id, { onDelete: "cascade" }).notNull(),
  userId: integer("user_id").references(() => users.id).notNull(),
  emoji: text("emoji").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const chatReports = pgTable("chat_reports", {
  id: serial("id").primaryKey(),
  messageId: integer("message_id").references(() => chatMessages.id, { onDelete: "cascade" }).notNull(),
  reporterId: integer("reporter_id").references(() => users.id).notNull(),
  reason: text("reason").notNull(),
  status: text("status").default("OPEN").notNull(),
  resolvedById: integer("resolved_by_id").references(() => users.id),
  resolvedAt: timestamp("resolved_at"),
  resolution: text("resolution"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const chatAuditLogs = pgTable("chat_audit_logs", {
  id: serial("id").primaryKey(),
  chatId: integer("chat_id").references(() => chats.id, { onDelete: "cascade" }).notNull(),
  actorId: integer("actor_id").references(() => users.id).notNull(),
  action: text("action").notNull(),
  targetUserId: integer("target_user_id").references(() => users.id),
  targetMessageId: integer("target_message_id").references(() => chatMessages.id),
  reason: text("reason"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const chatsRelations = relations(chats, ({ one, many }) => ({
  club: one(clubs, { fields: [chats.clubId], references: [clubs.id] }),
  session: one(sessions, { fields: [chats.sessionId], references: [sessions.id] }),
  createdBy: one(users, { fields: [chats.createdById], references: [users.id] }),
  members: many(chatMembers),
  messages: many(chatMessages),
}));

export const chatMembersRelations = relations(chatMembers, ({ one }) => ({
  chat: one(chats, { fields: [chatMembers.chatId], references: [chats.id] }),
  user: one(users, { fields: [chatMembers.userId], references: [users.id] }),
}));

export const chatMessagesRelations = relations(chatMessages, ({ one, many }) => ({
  chat: one(chats, { fields: [chatMessages.chatId], references: [chats.id] }),
  sender: one(users, { fields: [chatMessages.senderId], references: [users.id] }),
  reactions: many(chatReactions),
}));

export const chatReactionsRelations = relations(chatReactions, ({ one }) => ({
  message: one(chatMessages, { fields: [chatReactions.messageId], references: [chatMessages.id] }),
  user: one(users, { fields: [chatReactions.userId], references: [users.id] }),
}));

export const insertChatSchema = createInsertSchema(chats).omit({ id: true, createdAt: true, updatedAt: true });
export const insertChatMemberSchema = createInsertSchema(chatMembers).omit({ id: true, joinedAt: true });
export const insertChatMessageSchema = createInsertSchema(chatMessages).omit({ id: true, createdAt: true });
export const insertChatReactionSchema = createInsertSchema(chatReactions).omit({ id: true, createdAt: true });
export const insertChatReportSchema = createInsertSchema(chatReports).omit({ id: true, createdAt: true });
export const insertChatAuditLogSchema = createInsertSchema(chatAuditLogs).omit({ id: true, createdAt: true });

export type Chat = typeof chats.$inferSelect;
export type InsertChat = z.infer<typeof insertChatSchema>;
export type ChatMember = typeof chatMembers.$inferSelect;
export type InsertChatMember = z.infer<typeof insertChatMemberSchema>;
export type ChatMessage = typeof chatMessages.$inferSelect;
export type InsertChatMessage = z.infer<typeof insertChatMessageSchema>;
export type ChatReaction = typeof chatReactions.$inferSelect;
export type InsertChatReaction = z.infer<typeof insertChatReactionSchema>;
export type ChatReport = typeof chatReports.$inferSelect;
export type InsertChatReport = z.infer<typeof insertChatReportSchema>;
export type ChatAuditLog = typeof chatAuditLogs.$inferSelect;
export type InsertChatAuditLog = z.infer<typeof insertChatAuditLogSchema>;

// === AUTOMATED NOTIFICATION SYSTEM ===
export const notificationChannelEnum = pgEnum("notification_channel", ["IN_APP", "CHAT", "EMAIL"]);
export const notificationLogStatusEnum = pgEnum("notification_log_status", ["SENT", "FAILED", "SKIPPED"]);

export const notificationScheduleSettings = pgTable("notification_schedule_settings", {
  id: serial("id").primaryKey(),
  clubId: integer("club_id").references(() => clubs.id).notNull(),
  paymentRemindersEnabled: boolean("payment_reminders_enabled").default(true).notNull(),
  paymentReminderDaysBefore: integer("payment_reminder_days_before").default(2).notNull(),
  paymentReminderDailyAfter: boolean("payment_reminder_daily_after").default(true).notNull(),
  membershipRemindersEnabled: boolean("membership_reminders_enabled").default(true).notNull(),
  referralRemindersEnabled: boolean("referral_reminders_enabled").default(true).notNull(),
  ticketNotificationsEnabled: boolean("ticket_notifications_enabled").default(true).notNull(),
  messageNotificationsEnabled: boolean("message_notifications_enabled").default(true).notNull(),
  emailNotificationsEnabled: boolean("email_notifications_enabled").default(true).notNull(),
  sessionAvailabilityEnabled: boolean("session_availability_enabled").default(true).notNull(),
  sessionReminderEnabled: boolean("session_reminder_enabled").default(true).notNull(),
  sessionReminderHoursBefore: integer("session_reminder_hours_before").default(24).notNull(),
  announcementNotificationsEnabled: boolean("announcement_notifications_enabled").default(true).notNull(),
  chatNotificationsEnabled: boolean("chat_notifications_enabled").default(true).notNull(),
  tournamentNotificationsEnabled: boolean("tournament_notifications_enabled").default(true).notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const notificationLogs = pgTable("notification_logs", {
  id: serial("id").primaryKey(),
  recipientUserId: integer("recipient_user_id").references(() => users.id).notNull(),
  clubId: integer("club_id").references(() => clubs.id),
  entityType: text("entity_type").notNull(),
  entityId: integer("entity_id").notNull(),
  scheduleKey: text("schedule_key").notNull(),
  channel: notificationChannelEnum("channel").notNull(),
  status: notificationLogStatusEnum("status").default("SENT").notNull(),
  templateName: text("template_name").notNull(),
  messageContent: text("message_content"),
  errorMessage: text("error_message"),
  sentAt: timestamp("sent_at").defaultNow().notNull(),
});

export const notificationScheduleSettingsRelations = relations(notificationScheduleSettings, ({ one }) => ({
  club: one(clubs, { fields: [notificationScheduleSettings.clubId], references: [clubs.id] }),
}));

export const notificationLogsRelations = relations(notificationLogs, ({ one }) => ({
  recipient: one(users, { fields: [notificationLogs.recipientUserId], references: [users.id] }),
  club: one(clubs, { fields: [notificationLogs.clubId], references: [clubs.id] }),
}));

export const insertNotificationScheduleSettingsSchema = createInsertSchema(notificationScheduleSettings).omit({ id: true, updatedAt: true });
export const insertNotificationLogSchema = createInsertSchema(notificationLogs).omit({ id: true, sentAt: true });

export type NotificationScheduleSettings = typeof notificationScheduleSettings.$inferSelect;
export type InsertNotificationScheduleSettings = z.infer<typeof insertNotificationScheduleSettingsSchema>;
export type NotificationLog = typeof notificationLogs.$inferSelect;
export type InsertNotificationLog = z.infer<typeof insertNotificationLogSchema>;

// === REWARDS SYSTEM ===
export const rewardTypeEnum = pgEnum("reward_type", ["REFERRAL", "SESSION_ATTENDANCE", "GIFT", "MANUAL", "ANNIVERSARY", "POINTS", "GRADE", "BADGE_ACHIEVEMENT", "BIRTHDAY"]);
export const rewardStatusEnum = pgEnum("reward_status", ["AVAILABLE", "USED", "REQUESTED"]);

export interface ReferralLevel {
  level: number;
  referralsRequired: number;
  credits: number;
  gifts: string;
  freeSessions: number;
  unlockDescription: string;
}

export interface AttendanceRewardConfig {
  credits: number;
  gifts: string;
  freeSessions: number;
}

export const referralPrograms = pgTable("referral_programs", {
  id: serial("id").primaryKey(),
  clubId: integer("club_id").references(() => clubs.id).notNull(),
  name: text("name").notNull(),
  description: text("description"),
  levels: jsonb("levels").$type<ReferralLevel[]>().default([]).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdById: integer("created_by_id").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const referralProgramRelations = relations(referralPrograms, ({ one }) => ({
  club: one(clubs, { fields: [referralPrograms.clubId], references: [clubs.id] }),
  createdBy: one(users, { fields: [referralPrograms.createdById], references: [users.id] }),
}));

export const sessionAttendanceRewards = pgTable("session_attendance_rewards", {
  id: serial("id").primaryKey(),
  clubId: integer("club_id").references(() => clubs.id).notNull(),
  sessionsRequired: integer("sessions_required").notNull(),
  rewardConfig: jsonb("reward_config").$type<AttendanceRewardConfig>().notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdById: integer("created_by_id").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const sessionAttendanceRewardRelations = relations(sessionAttendanceRewards, ({ one }) => ({
  club: one(clubs, { fields: [sessionAttendanceRewards.clubId], references: [clubs.id] }),
  createdBy: one(users, { fields: [sessionAttendanceRewards.createdById], references: [users.id] }),
}));

export const playerRewardLedger = pgTable("player_reward_ledger", {
  id: serial("id").primaryKey(),
  playerId: integer("player_id").references(() => users.id).notNull(),
  clubId: integer("club_id").references(() => clubs.id).notNull(),
  rewardType: rewardTypeEnum("reward_type").notNull(),
  sourceId: integer("source_id"),
  sourceMilestone: integer("source_milestone"),
  description: text("description"),
  credits: integer("credits").default(0).notNull(),
  gifts: text("gifts"),
  freeSessions: integer("free_sessions").default(0).notNull(),
  status: rewardStatusEnum("status").default("AVAILABLE").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const playerRewardLedgerRelations = relations(playerRewardLedger, ({ one }) => ({
  player: one(users, { fields: [playerRewardLedger.playerId], references: [users.id] }),
  club: one(clubs, { fields: [playerRewardLedger.clubId], references: [clubs.id] }),
}));

export const insertReferralProgramSchema = createInsertSchema(referralPrograms).omit({ id: true, createdAt: true, updatedAt: true });
export const insertSessionAttendanceRewardSchema = createInsertSchema(sessionAttendanceRewards).omit({ id: true, createdAt: true, updatedAt: true });
export const insertPlayerRewardLedgerSchema = createInsertSchema(playerRewardLedger).omit({ id: true, createdAt: true, updatedAt: true });

export type ReferralProgram = typeof referralPrograms.$inferSelect;
export type InsertReferralProgram = z.infer<typeof insertReferralProgramSchema>;
export type SessionAttendanceReward = typeof sessionAttendanceRewards.$inferSelect;
export type InsertSessionAttendanceReward = z.infer<typeof insertSessionAttendanceRewardSchema>;
export type PlayerRewardLedgerEntry = typeof playerRewardLedger.$inferSelect;
export type InsertPlayerRewardLedgerEntry = z.infer<typeof insertPlayerRewardLedgerSchema>;

// === CLUB ANNIVERSARY SETTINGS ===
export const clubAnniversarySettings = pgTable("club_anniversary_settings", {
  id: serial("id").primaryKey(),
  clubId: integer("club_id").references(() => clubs.id).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  credits: integer("credits").default(1600).notNull(),
  gifts: text("gifts"),
  message: text("message").default("Happy Club Anniversary! Thank you for being a valued member.").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const clubAnniversarySettingsRelations = relations(clubAnniversarySettings, ({ one }) => ({
  club: one(clubs, { fields: [clubAnniversarySettings.clubId], references: [clubs.id] }),
}));

export const insertClubAnniversarySettingsSchema = createInsertSchema(clubAnniversarySettings).omit({ id: true, createdAt: true, updatedAt: true });
export type ClubAnniversarySetting = typeof clubAnniversarySettings.$inferSelect;
export type InsertClubAnniversarySetting = z.infer<typeof insertClubAnniversarySettingsSchema>;

// === CLUB BIRTHDAY SETTINGS ===
export const clubBirthdaySettings = pgTable("club_birthday_settings", {
  id: serial("id").primaryKey(),
  clubId: integer("club_id").references(() => clubs.id).notNull(),
  isActive: boolean("is_active").default(false).notNull(),
  credits: integer("credits").default(0).notNull(),
  gifts: text("gifts"),
  message: text("message").default("Happy Birthday! Enjoy your special day with us.").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const clubBirthdaySettingsRelations = relations(clubBirthdaySettings, ({ one }) => ({
  club: one(clubs, { fields: [clubBirthdaySettings.clubId], references: [clubs.id] }),
}));

export const insertClubBirthdaySettingsSchema = createInsertSchema(clubBirthdaySettings).omit({ id: true, createdAt: true, updatedAt: true });
export type ClubBirthdaySetting = typeof clubBirthdaySettings.$inferSelect;
export type InsertClubBirthdaySetting = z.infer<typeof insertClubBirthdaySettingsSchema>;

// === POINTS MILESTONE REWARDS ===
export const pointsMilestoneRewards = pgTable("points_milestone_rewards", {
  id: serial("id").primaryKey(),
  clubId: integer("club_id").references(() => clubs.id).notNull(),
  pointsRequired: integer("points_required").notNull(),
  rewardConfig: jsonb("reward_config").$type<AttendanceRewardConfig>().notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  isRepeating: boolean("is_repeating").default(true).notNull(),
  milestoneType: text("milestone_type").default("STANDARD").notNull(),
  createdById: integer("created_by_id").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const pointsMilestoneRewardRelations = relations(pointsMilestoneRewards, ({ one }) => ({
  club: one(clubs, { fields: [pointsMilestoneRewards.clubId], references: [clubs.id] }),
  createdBy: one(users, { fields: [pointsMilestoneRewards.createdById], references: [users.id] }),
}));

export const insertPointsMilestoneRewardSchema = createInsertSchema(pointsMilestoneRewards).omit({ id: true, createdAt: true, updatedAt: true });
export type PointsMilestoneReward = typeof pointsMilestoneRewards.$inferSelect;
export type InsertPointsMilestoneReward = z.infer<typeof insertPointsMilestoneRewardSchema>;

// === BADGE ACHIEVEMENT REWARDS ===
export const badgeAchievementRewards = pgTable("badge_achievement_rewards", {
  id: serial("id").primaryKey(),
  clubId: integer("club_id").references(() => clubs.id).notNull(),
  badge: text("badge").notNull(),
  rewardConfig: jsonb("reward_config").$type<AttendanceRewardConfig>().notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdById: integer("created_by_id").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const badgeAchievementRewardRelations = relations(badgeAchievementRewards, ({ one }) => ({
  club: one(clubs, { fields: [badgeAchievementRewards.clubId], references: [clubs.id] }),
  createdBy: one(users, { fields: [badgeAchievementRewards.createdById], references: [users.id] }),
}));

export const insertBadgeAchievementRewardSchema = createInsertSchema(badgeAchievementRewards).omit({ id: true, createdAt: true, updatedAt: true });
export type BadgeAchievementReward = typeof badgeAchievementRewards.$inferSelect;
export type InsertBadgeAchievementReward = z.infer<typeof insertBadgeAchievementRewardSchema>;

// === ADMIN AUDIT LOGS ===
export const adminAuditLogs = pgTable("admin_audit_logs", {
  id: serial("id").primaryKey(),
  actorId: integer("actor_id").references(() => users.id).notNull(),
  action: text("action").notNull(),
  targetType: text("target_type").notNull(),
  targetId: integer("target_id"),
  clubId: integer("club_id").references(() => clubs.id),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertAdminAuditLogSchema = createInsertSchema(adminAuditLogs).omit({ id: true, createdAt: true });
export type AdminAuditLog = typeof adminAuditLogs.$inferSelect;
export type InsertAdminAuditLog = z.infer<typeof insertAdminAuditLogSchema>;

// === LEAGUE MANAGEMENT ===
export const leagueMatchStatusEnum = pgEnum("league_match_status", ["UPCOMING", "LIVE", "COMPLETED"]);
export const leagueMatchCategoryEnum = pgEnum("league_match_category", ["MENS", "LADIES", "MIXED"]);
export const leagueMatchOutcomeEnum = pgEnum("league_match_outcome", ["WIN", "LOSS", "DRAW"]);

export const leagues = pgTable("leagues", {
  id: serial("id").primaryKey(),
  clubId: integer("club_id").references(() => clubs.id).notNull(),
  name: text("name").notNull(),
  season: text("season"),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const leagueRelations = relations(leagues, ({ one, many }) => ({
  club: one(clubs, { fields: [leagues.clubId], references: [clubs.id] }),
  matches: many(leagueMatches),
}));

export const insertLeagueSchema = createInsertSchema(leagues).omit({ id: true, createdAt: true });
export type League = typeof leagues.$inferSelect;
export type InsertLeague = z.infer<typeof insertLeagueSchema>;

export const leagueTeams = pgTable("league_teams", {
  id: serial("id").primaryKey(),
  clubId: integer("club_id").references(() => clubs.id).notNull(),
  name: text("name").notNull(),
  division: text("division"),
  season: text("season"),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const leagueTeamRelations = relations(leagueTeams, ({ one, many }) => ({
  club: one(clubs, { fields: [leagueTeams.clubId], references: [clubs.id] }),
  matches: many(leagueMatches),
}));

export const insertLeagueTeamSchema = createInsertSchema(leagueTeams).omit({ id: true, createdAt: true });
export type LeagueTeam = typeof leagueTeams.$inferSelect;
export type InsertLeagueTeam = z.infer<typeof insertLeagueTeamSchema>;

export const leagueMatches = pgTable("league_matches", {
  id: serial("id").primaryKey(),
  clubId: integer("club_id").references(() => clubs.id).notNull(),
  leagueId: integer("league_id").references(() => leagues.id),
  leagueTeamId: integer("league_team_id").references(() => leagueTeams.id),
  division: text("division"),
  category: leagueMatchCategoryEnum("category").notNull(),
  venue: text("venue"),
  venueAddress: text("venue_address"),
  googleMapsUrl: text("google_maps_url"),
  location: text("location"),
  matchDatetime: timestamp("match_datetime").notNull(),
  opponentClub: text("opponent_club").notNull(),
  pairsCount: integer("pairs_count").default(3).notNull(),
  setsPerPair: integer("sets_per_pair").default(3).notNull(),
  status: leagueMatchStatusEnum("status").default("UPCOMING").notNull(),
  revealTime: timestamp("reveal_time"),
  createdBy: integer("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const leagueMatchRelations = relations(leagueMatches, ({ one, many }) => ({
  club: one(clubs, { fields: [leagueMatches.clubId], references: [clubs.id] }),
  league: one(leagues, { fields: [leagueMatches.leagueId], references: [leagues.id] }),
  leagueTeam: one(leagueTeams, { fields: [leagueMatches.leagueTeamId], references: [leagueTeams.id] }),
  createdByUser: one(users, { fields: [leagueMatches.createdBy], references: [users.id] }),
  players: many(leagueMatchPlayers),
  result: one(leagueMatchResults),
}));

export const insertLeagueMatchSchema = createInsertSchema(leagueMatches).omit({ id: true, createdAt: true, updatedAt: true });
export type LeagueMatch = typeof leagueMatches.$inferSelect;
export type InsertLeagueMatch = z.infer<typeof insertLeagueMatchSchema>;

export const leagueMatchPlayers = pgTable("league_match_players", {
  id: serial("id").primaryKey(),
  matchId: integer("match_id").references(() => leagueMatches.id, { onDelete: "cascade" }).notNull(),
  userId: integer("user_id").references(() => users.id).notNull(),
  position: text("position"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const leagueMatchPlayerRelations = relations(leagueMatchPlayers, ({ one }) => ({
  match: one(leagueMatches, { fields: [leagueMatchPlayers.matchId], references: [leagueMatches.id] }),
  user: one(users, { fields: [leagueMatchPlayers.userId], references: [users.id] }),
}));

export const insertLeagueMatchPlayerSchema = createInsertSchema(leagueMatchPlayers).omit({ id: true, createdAt: true });
export type LeagueMatchPlayer = typeof leagueMatchPlayers.$inferSelect;
export type InsertLeagueMatchPlayer = z.infer<typeof insertLeagueMatchPlayerSchema>;

export const leagueMatchResults = pgTable("league_match_results", {
  id: serial("id").primaryKey(),
  matchId: integer("match_id").references(() => leagueMatches.id, { onDelete: "cascade" }).notNull(),
  dragonScore: integer("dragon_score").notNull(),
  opponentScore: integer("opponent_score").notNull(),
  outcome: leagueMatchOutcomeEnum("outcome").notNull(),
  locked: boolean("locked").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const leagueMatchResultRelations = relations(leagueMatchResults, ({ one, many }) => ({
  match: one(leagueMatches, { fields: [leagueMatchResults.matchId], references: [leagueMatches.id] }),
  gameScores: many(leagueGameScores),
}));

export const insertLeagueMatchResultSchema = createInsertSchema(leagueMatchResults).omit({ id: true, createdAt: true, updatedAt: true });
export type LeagueMatchResult = typeof leagueMatchResults.$inferSelect;
export type InsertLeagueMatchResult = z.infer<typeof insertLeagueMatchResultSchema>;

export const leagueGameScores = pgTable("league_game_scores", {
  id: serial("id").primaryKey(),
  matchResultId: integer("match_result_id").references(() => leagueMatchResults.id, { onDelete: "cascade" }).notNull(),
  pairNumber: integer("pair_number").default(1).notNull(),
  gameNumber: integer("game_number").notNull(),
  dragonPoints: integer("dragon_points").notNull(),
  opponentPoints: integer("opponent_points").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const leagueGameScoreRelations = relations(leagueGameScores, ({ one }) => ({
  matchResult: one(leagueMatchResults, { fields: [leagueGameScores.matchResultId], references: [leagueMatchResults.id] }),
}));

export const insertLeagueGameScoreSchema = createInsertSchema(leagueGameScores).omit({ id: true, createdAt: true });
export type LeagueGameScore = typeof leagueGameScores.$inferSelect;
export type InsertLeagueGameScore = z.infer<typeof insertLeagueGameScoreSchema>;

export const leagueOpponents = pgTable("league_opponents", {
  id: serial("id").primaryKey(),
  clubId: integer("club_id").references(() => clubs.id).notNull(),
  name: text("name").notNull(),
  venueName: text("venue_name"),
  venueAddress: text("venue_address"),
  googleMapsUrl: text("google_maps_url"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const leagueOpponentRelations = relations(leagueOpponents, ({ one }) => ({
  club: one(clubs, { fields: [leagueOpponents.clubId], references: [clubs.id] }),
}));

export const insertLeagueOpponentSchema = createInsertSchema(leagueOpponents).omit({ id: true, createdAt: true });
export type LeagueOpponent = typeof leagueOpponents.$inferSelect;
export type InsertLeagueOpponent = z.infer<typeof insertLeagueOpponentSchema>;

export const leagueSquadPlayers = pgTable("league_squad_players", {
  id: serial("id").primaryKey(),
  clubId: integer("club_id").references(() => clubs.id).notNull(),
  userId: integer("user_id").references(() => users.id).notNull(),
  formatPreference: text("format_preference"),
  addedBy: integer("added_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const leagueSquadPlayerRelations = relations(leagueSquadPlayers, ({ one }) => ({
  club: one(clubs, { fields: [leagueSquadPlayers.clubId], references: [clubs.id] }),
  user: one(users, { fields: [leagueSquadPlayers.userId], references: [users.id] }),
}));

export const insertLeagueSquadPlayerSchema = createInsertSchema(leagueSquadPlayers).omit({ id: true, createdAt: true });
export type LeagueSquadPlayer = typeof leagueSquadPlayers.$inferSelect;
export type InsertLeagueSquadPlayer = z.infer<typeof insertLeagueSquadPlayerSchema>;

export const leagueMatchAvailability = pgTable("league_match_availability", {
  id: serial("id").primaryKey(),
  matchId: integer("match_id").references(() => leagueMatches.id, { onDelete: "cascade" }).notNull(),
  userId: integer("user_id").references(() => users.id).notNull(),
  status: text("status").default("PENDING").notNull(),
  respondedAt: timestamp("responded_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const leagueMatchAvailabilityRelations = relations(leagueMatchAvailability, ({ one }) => ({
  match: one(leagueMatches, { fields: [leagueMatchAvailability.matchId], references: [leagueMatches.id] }),
  user: one(users, { fields: [leagueMatchAvailability.userId], references: [users.id] }),
}));

export const insertLeagueMatchAvailabilitySchema = createInsertSchema(leagueMatchAvailability).omit({ id: true, createdAt: true });
export type LeagueMatchAvailability = typeof leagueMatchAvailability.$inferSelect;
export type InsertLeagueMatchAvailability = z.infer<typeof insertLeagueMatchAvailabilitySchema>;

export const clubHomeVenues = pgTable("club_home_venues", {
  id: serial("id").primaryKey(),
  clubId: integer("club_id").references(() => clubs.id).notNull(),
  name: text("name").notNull(),
  address: text("address"),
  googleMapsUrl: text("google_maps_url"),
  isDefault: boolean("is_default").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const clubHomeVenueRelations = relations(clubHomeVenues, ({ one }) => ({
  club: one(clubs, { fields: [clubHomeVenues.clubId], references: [clubs.id] }),
}));

export const insertClubHomeVenueSchema = createInsertSchema(clubHomeVenues).omit({ id: true, createdAt: true });
export type ClubHomeVenue = typeof clubHomeVenues.$inferSelect;
export type InsertClubHomeVenue = z.infer<typeof insertClubHomeVenueSchema>;

// === JUNIOR SKILL DEVELOPMENT SYSTEM ===

export const juniorLevelEnum = pgEnum("junior_level", ["BEGINNER", "IMPROVER", "PERFORMANCE", "SQUAD", "COMPETITION_READY"]);

export const juniorSkillCategories = pgTable("junior_skill_categories", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  displayOrder: integer("display_order").notNull(),
  iconName: text("icon_name"),
});

export const juniorSkills = pgTable("junior_skills", {
  id: serial("id").primaryKey(),
  categoryId: integer("category_id").references(() => juniorSkillCategories.id).notNull(),
  name: text("name").notNull(),
  displayOrder: integer("display_order").notNull(),
});

export const juniorSkillCategoryRelations = relations(juniorSkillCategories, ({ many }) => ({
  skills: many(juniorSkills),
}));

export const juniorSkillRelations = relations(juniorSkills, ({ one }) => ({
  category: one(juniorSkillCategories, { fields: [juniorSkills.categoryId], references: [juniorSkillCategories.id] }),
}));

export const juniorProfiles = pgTable("junior_profiles", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  clubId: integer("club_id").references(() => clubs.id).notNull(),
  juniorLevel: juniorLevelEnum("junior_level").default("BEGINNER").notNull(),
  overallSkillPercentage: integer("overall_skill_percentage").default(0).notNull(),
  attendancePercentage: integer("attendance_percentage").default(0).notNull(),
  effortRating: integer("effort_rating").default(0).notNull(),
  coachRating: integer("coach_rating").default(0).notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const juniorProfileRelations = relations(juniorProfiles, ({ one }) => ({
  user: one(users, { fields: [juniorProfiles.userId], references: [users.id] }),
  club: one(clubs, { fields: [juniorProfiles.clubId], references: [clubs.id] }),
}));

export const juniorSkillProgress = pgTable("junior_skill_progress", {
  id: serial("id").primaryKey(),
  childId: integer("child_id").references(() => users.id).notNull(),
  skillId: integer("skill_id").references(() => juniorSkills.id).notNull(),
  level: integer("level").default(0).notNull(),
  percentage: integer("percentage").default(0).notNull(),
  comment: text("comment"),
  priority: boolean("priority").default(false).notNull(),
  updatedBy: integer("updated_by").references(() => users.id),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const juniorSkillProgressRelations = relations(juniorSkillProgress, ({ one }) => ({
  child: one(users, { fields: [juniorSkillProgress.childId], references: [users.id] }),
  skill: one(juniorSkills, { fields: [juniorSkillProgress.skillId], references: [juniorSkills.id] }),
  updater: one(users, { fields: [juniorSkillProgress.updatedBy], references: [users.id] }),
}));

export const juniorAchievements = pgTable("junior_achievements", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  achievementKey: text("achievement_key").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  iconName: text("icon_name"),
  unlockedAt: timestamp("unlocked_at").defaultNow().notNull(),
});

export const juniorAchievementRelations = relations(juniorAchievements, ({ one }) => ({
  user: one(users, { fields: [juniorAchievements.userId], references: [users.id] }),
}));

export const juniorVideos = pgTable("junior_videos", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  clubId: integer("club_id").references(() => clubs.id),
  title: text("title").notNull(),
  youtubeUrl: text("youtube_url").notNull(),
  categoryTag: text("category_tag"),
  coachComment: text("coach_comment"),
  addedBy: integer("added_by").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const juniorVideoRelations = relations(juniorVideos, ({ one }) => ({
  user: one(users, { fields: [juniorVideos.userId], references: [users.id] }),
  club: one(clubs, { fields: [juniorVideos.clubId], references: [clubs.id] }),
  author: one(users, { fields: [juniorVideos.addedBy], references: [users.id] }),
}));

export const juniorRankings = pgTable("junior_rankings", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  clubId: integer("club_id").references(() => clubs.id).notNull(),
  overallSkillPercent: integer("overall_skill_percent").default(0).notNull(),
  attendancePercent: integer("attendance_percent").default(0).notNull(),
  effortRating: integer("effort_rating").default(0).notNull(),
  consistencyScore: integer("consistency_score").default(0).notNull(),
  rankPosition: integer("rank_position").default(0).notNull(),
  previousPosition: integer("previous_position").default(0).notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const juniorRankingRelations = relations(juniorRankings, ({ one }) => ({
  user: one(users, { fields: [juniorRankings.userId], references: [users.id] }),
  club: one(clubs, { fields: [juniorRankings.clubId], references: [clubs.id] }),
}));

export const insertJuniorSkillCategorySchema = createInsertSchema(juniorSkillCategories).omit({ id: true });
export type JuniorSkillCategory = typeof juniorSkillCategories.$inferSelect;
export type InsertJuniorSkillCategory = z.infer<typeof insertJuniorSkillCategorySchema>;

export const insertJuniorSkillSchema = createInsertSchema(juniorSkills).omit({ id: true });
export type JuniorSkill = typeof juniorSkills.$inferSelect;
export type InsertJuniorSkill = z.infer<typeof insertJuniorSkillSchema>;

export const insertJuniorProfileSchema = createInsertSchema(juniorProfiles).omit({ id: true, updatedAt: true });
export type JuniorProfile = typeof juniorProfiles.$inferSelect;
export type InsertJuniorProfile = z.infer<typeof insertJuniorProfileSchema>;

export const insertJuniorSkillProgressSchema = createInsertSchema(juniorSkillProgress).omit({ id: true, updatedAt: true });
export type JuniorSkillProgress = typeof juniorSkillProgress.$inferSelect;
export type InsertJuniorSkillProgress = z.infer<typeof insertJuniorSkillProgressSchema>;

export const insertJuniorAchievementSchema = createInsertSchema(juniorAchievements).omit({ id: true, unlockedAt: true });
export type JuniorAchievement = typeof juniorAchievements.$inferSelect;
export type InsertJuniorAchievement = z.infer<typeof insertJuniorAchievementSchema>;

export const insertJuniorVideoSchema = createInsertSchema(juniorVideos).omit({ id: true, createdAt: true });
export type JuniorVideo = typeof juniorVideos.$inferSelect;
export type InsertJuniorVideo = z.infer<typeof insertJuniorVideoSchema>;

export const insertJuniorRankingSchema = createInsertSchema(juniorRankings).omit({ id: true, updatedAt: true });
export type JuniorRanking = typeof juniorRankings.$inferSelect;
export type InsertJuniorRanking = z.infer<typeof insertJuniorRankingSchema>;

export const juniorProgressHistory = pgTable("junior_progress_history", {
  id: serial("id").primaryKey(),
  childId: integer("child_id").references(() => users.id).notNull(),
  skillId: integer("skill_id").references(() => juniorSkills.id).notNull(),
  previousPercentage: integer("previous_percentage").default(0).notNull(),
  newPercentage: integer("new_percentage").default(0).notNull(),
  previousLevel: integer("previous_level").default(0).notNull(),
  newLevel: integer("new_level").default(0).notNull(),
  overallPercentageAtTime: integer("overall_percentage_at_time").default(0).notNull(),
  updatedBy: integer("updated_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const juniorProgressHistoryRelations = relations(juniorProgressHistory, ({ one }) => ({
  child: one(users, { fields: [juniorProgressHistory.childId], references: [users.id] }),
  skill: one(juniorSkills, { fields: [juniorProgressHistory.skillId], references: [juniorSkills.id] }),
  updater: one(users, { fields: [juniorProgressHistory.updatedBy], references: [users.id] }),
}));

export type JuniorProgressHistory = typeof juniorProgressHistory.$inferSelect;

export const exerciseCategoryEnum = pgEnum("exercise_category", ["HOME", "GYM", "COURT", "FOOTWORK", "CORE", "FLEXIBILITY", "STRENGTH", "CARDIO"]);
export const exerciseDifficultyEnum = pgEnum("exercise_difficulty", ["EASY", "MEDIUM", "HARD"]);

export const juniorExercises = pgTable("junior_exercises", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  category: exerciseCategoryEnum("category").notNull(),
  difficulty: exerciseDifficultyEnum("difficulty").notNull(),
  durationMinutes: integer("duration_minutes"),
  reps: integer("reps"),
  sets: integer("sets"),
  equipment: text("equipment"),
  videoUrl: text("video_url"),
  location: text("location").default("home").notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  displayOrder: integer("display_order").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const juniorExercisesRelations = relations(juniorExercises, ({ many }) => ({
  challengeDays: many(juniorChallengeDays),
  videos: many(juniorExerciseVideos),
}));

export const insertJuniorExerciseSchema = createInsertSchema(juniorExercises).omit({ id: true, createdAt: true });
export type JuniorExercise = typeof juniorExercises.$inferSelect;
export type InsertJuniorExercise = z.infer<typeof insertJuniorExerciseSchema>;

export const juniorWeeklyChallenges = pgTable("junior_weekly_challenges", {
  id: serial("id").primaryKey(),
  weekNumber: integer("week_number").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  isRevealed: boolean("is_revealed").default(false).notNull(),
  skillPointsReward: integer("skill_points_reward").default(10).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const juniorWeeklyChallengesRelations = relations(juniorWeeklyChallenges, ({ many }) => ({
  days: many(juniorChallengeDays),
  completions: many(juniorChallengeCompletions),
}));

export const insertJuniorWeeklyChallengeSchema = createInsertSchema(juniorWeeklyChallenges).omit({ id: true, createdAt: true });
export type JuniorWeeklyChallenge = typeof juniorWeeklyChallenges.$inferSelect;
export type InsertJuniorWeeklyChallenge = z.infer<typeof insertJuniorWeeklyChallengeSchema>;

export const juniorChallengeDays = pgTable("junior_challenge_days", {
  id: serial("id").primaryKey(),
  challengeId: integer("challenge_id").references(() => juniorWeeklyChallenges.id).notNull(),
  dayOfWeek: integer("day_of_week").notNull(),
  exerciseId: integer("exercise_id").references(() => juniorExercises.id).notNull(),
  displayOrder: integer("display_order").default(0).notNull(),
  targetReps: integer("target_reps"),
  targetSets: integer("target_sets"),
  targetDurationMinutes: integer("target_duration_minutes"),
});

export const juniorChallengeDaysRelations = relations(juniorChallengeDays, ({ one, many }) => ({
  challenge: one(juniorWeeklyChallenges, { fields: [juniorChallengeDays.challengeId], references: [juniorWeeklyChallenges.id] }),
  exercise: one(juniorExercises, { fields: [juniorChallengeDays.exerciseId], references: [juniorExercises.id] }),
  completions: many(juniorChallengeCompletions),
}));

export const insertJuniorChallengeDaySchema = createInsertSchema(juniorChallengeDays).omit({ id: true });
export type JuniorChallengeDay = typeof juniorChallengeDays.$inferSelect;
export type InsertJuniorChallengeDay = z.infer<typeof insertJuniorChallengeDaySchema>;

export const juniorChallengeCompletions = pgTable("junior_challenge_completions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  challengeDayId: integer("challenge_day_id").references(() => juniorChallengeDays.id).notNull(),
  challengeId: integer("challenge_id").references(() => juniorWeeklyChallenges.id).notNull(),
  completedAt: timestamp("completed_at").defaultNow().notNull(),
  skillPointsEarned: integer("skill_points_earned").default(0).notNull(),
});

export const juniorChallengeCompletionsRelations = relations(juniorChallengeCompletions, ({ one }) => ({
  user: one(users, { fields: [juniorChallengeCompletions.userId], references: [users.id] }),
  challengeDay: one(juniorChallengeDays, { fields: [juniorChallengeCompletions.challengeDayId], references: [juniorChallengeDays.id] }),
  challenge: one(juniorWeeklyChallenges, { fields: [juniorChallengeCompletions.challengeId], references: [juniorWeeklyChallenges.id] }),
}));

export const insertJuniorChallengeCompletionSchema = createInsertSchema(juniorChallengeCompletions).omit({ id: true, completedAt: true });
export type JuniorChallengeCompletion = typeof juniorChallengeCompletions.$inferSelect;
export type InsertJuniorChallengeCompletion = z.infer<typeof insertJuniorChallengeCompletionSchema>;

export const juniorExerciseVideos = pgTable("junior_exercise_videos", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  youtubeUrl: text("youtube_url").notNull(),
  exerciseId: integer("exercise_id").references(() => juniorExercises.id),
  category: exerciseCategoryEnum("category"),
  description: text("description"),
  addedBy: integer("added_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const juniorExerciseVideosRelations = relations(juniorExerciseVideos, ({ one }) => ({
  exercise: one(juniorExercises, { fields: [juniorExerciseVideos.exerciseId], references: [juniorExercises.id] }),
  addedByUser: one(users, { fields: [juniorExerciseVideos.addedBy], references: [users.id] }),
}));

export const insertJuniorExerciseVideoSchema = createInsertSchema(juniorExerciseVideos).omit({ id: true, createdAt: true });
export type JuniorExerciseVideo = typeof juniorExerciseVideos.$inferSelect;
export type InsertJuniorExerciseVideo = z.infer<typeof insertJuniorExerciseVideoSchema>;

// === DONATIONS SYSTEM ===
export const donationStatusEnum = pgEnum("donation_status", ["PLEDGED", "CONFIRMED", "RECEIVED", "CANCELLED"]);

export const donations = pgTable("donations", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  amount: integer("amount").notNull(),
  paymentDate: timestamp("payment_date"),
  reference: text("reference"),
  message: text("message"),
  status: donationStatusEnum("status").default("PLEDGED").notNull(),
  confirmedByAdminId: integer("confirmed_by_admin_id").references(() => users.id),
  confirmedAt: timestamp("confirmed_at"),
  adminNotes: text("admin_notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const donationsRelations = relations(donations, ({ one }) => ({
  user: one(users, { fields: [donations.userId], references: [users.id] }),
  confirmedByAdmin: one(users, { fields: [donations.confirmedByAdminId], references: [users.id] }),
}));

export const insertDonationSchema = createInsertSchema(donations).omit({ id: true, createdAt: true, confirmedAt: true, confirmedByAdminId: true });
export type Donation = typeof donations.$inferSelect;
export type InsertDonation = z.infer<typeof insertDonationSchema>;

// === COACH ANALYTICS REPORTS ===
export const generatedReports = pgTable("generated_reports", {
  id: serial("id").primaryKey(),
  createdBy: integer("created_by").references(() => users.id).notNull(),
  clubId: integer("club_id").references(() => clubs.id).notNull(),
  dateRangeStart: timestamp("date_range_start"),
  dateRangeEnd: timestamp("date_range_end"),
  squadFilter: text("squad_filter"),
  aiSummary: text("ai_summary").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const generatedReportsRelations = relations(generatedReports, ({ one }) => ({
  creator: one(users, { fields: [generatedReports.createdBy], references: [users.id] }),
  club: one(clubs, { fields: [generatedReports.clubId], references: [clubs.id] }),
}));

export const insertGeneratedReportSchema = createInsertSchema(generatedReports).omit({ id: true, createdAt: true });
export type GeneratedReport = typeof generatedReports.$inferSelect;
export type InsertGeneratedReport = z.infer<typeof insertGeneratedReportSchema>;

// === PREMIUM RECOGNITION CARDS ===
export const cardCategoryEnum = pgEnum("card_category", ["milestone", "admin_gifted"]);
export const cardRarityEnum = pgEnum("card_rarity", ["standard", "rare", "epic", "legendary", "mythic"]);

export const cards = pgTable("cards", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  cardCategory: cardCategoryEnum("card_category").default("milestone").notNull(),
  designConfig: jsonb("design_config").$type<{
    gradient: string;
    textColor: string;
    accentColor: string;
    pattern?: string;
  }>(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const userCards = pgTable("user_cards", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  cardId: integer("card_id").references(() => cards.id).notNull(),
  clubId: integer("club_id").references(() => clubs.id),
  issuedBy: integer("issued_by").references(() => users.id),
  customReason: text("custom_reason"),
  rarityLevel: cardRarityEnum("rarity_level").default("standard").notNull(),
  serialNumber: text("serial_number").notNull(),
  revokedAt: timestamp("revoked_at"),
  issuedAt: timestamp("issued_at").defaultNow().notNull(),
  expiresAt: timestamp("expires_at"),
  cardIsActive: boolean("card_is_active").default(true).notNull(),
  weeklyCreditValue: integer("weekly_credit_value").default(0).notNull(),
});

export const cardCreditTransactions = pgTable("card_credit_transactions", {
  id: serial("id").primaryKey(),
  userCardId: integer("user_card_id").references(() => userCards.id).notNull(),
  userId: integer("user_id").references(() => users.id).notNull(),
  amount: integer("amount").notNull(),
  cardName: text("card_name").notNull(),
  issuedById: integer("issued_by_id").references(() => users.id).notNull(),
  claimed: boolean("claimed").default(false).notNull(),
  claimedAt: timestamp("claimed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const cardsRelations = relations(cards, ({ many }) => ({
  userCards: many(userCards),
}));

export const userCardsRelations = relations(userCards, ({ one }) => ({
  user: one(users, { fields: [userCards.userId], references: [users.id] }),
  card: one(cards, { fields: [userCards.cardId], references: [cards.id] }),
  issuer: one(users, { fields: [userCards.issuedBy], references: [users.id] }),
}));

export const insertCardSchema = createInsertSchema(cards).omit({ id: true, createdAt: true });
export type CardRecord = typeof cards.$inferSelect;
export type InsertCard = z.infer<typeof insertCardSchema>;

export const insertUserCardSchema = createInsertSchema(userCards).omit({ id: true, issuedAt: true });
export type UserCardRecord = typeof userCards.$inferSelect;
export type InsertUserCard = z.infer<typeof insertUserCardSchema>;

// === PLAYER INTELLIGENCE & ANALYTICS SYSTEM ===

export const avatarStyleEnum = pgEnum("avatar_style", ["neutral", "ready", "smash", "defensive", "running", "jumping"]);
export const skillReviewStatusEnum = pgEnum("skill_review_status", ["PENDING", "ACCEPTED", "COMPLETED", "CANCELLED"]);

export const playerAvatarSelections = pgTable("player_avatar_selections", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  avatarStyle: avatarStyleEnum("avatar_style").default("neutral").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const playerSkillCategories = pgTable("player_skill_categories", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  displayOrder: integer("display_order").default(0).notNull(),
  iconName: text("icon_name"),
  clubId: integer("club_id").references(() => clubs.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const playerSkills = pgTable("player_skills", {
  id: serial("id").primaryKey(),
  categoryId: integer("category_id").references(() => playerSkillCategories.id).notNull(),
  name: text("name").notNull(),
  displayOrder: integer("display_order").default(0).notNull(),
  clubId: integer("club_id").references(() => clubs.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const playerSkillReviewRequests = pgTable("player_skill_review_requests", {
  id: serial("id").primaryKey(),
  playerId: integer("player_id").references(() => playerProfiles.id).notNull(),
  clubId: integer("club_id").references(() => clubs.id).notNull(),
  status: skillReviewStatusEnum("status").default("PENDING").notNull(),
  paymentMethod: text("payment_method"),
  paymentConfirmed: boolean("payment_confirmed").default(false).notNull(),
  requestedAt: timestamp("requested_at").defaultNow().notNull(),
  acceptedAt: timestamp("accepted_at"),
  completedAt: timestamp("completed_at"),
  acceptedByUserId: integer("accepted_by_user_id").references(() => users.id),
});

export const playerSkillEvaluations = pgTable("player_skill_evaluations", {
  id: serial("id").primaryKey(),
  reviewRequestId: integer("review_request_id").references(() => playerSkillReviewRequests.id).notNull(),
  playerId: integer("player_id").references(() => playerProfiles.id).notNull(),
  skillId: integer("skill_id").references(() => playerSkills.id).notNull(),
  rating: integer("rating").default(0).notNull(),
  comment: text("comment"),
  evaluatedByUserId: integer("evaluated_by_user_id").references(() => users.id).notNull(),
  evaluatedAt: timestamp("evaluated_at").defaultNow().notNull(),
});

export const playerAchievements = pgTable("player_achievements_record", {
  id: serial("id").primaryKey(),
  playerId: integer("player_id").references(() => playerProfiles.id).notNull(),
  achievementType: text("achievement_type").notNull(),
  achievementName: text("achievement_name").notNull(),
  description: text("description"),
  earnedAt: timestamp("earned_at").defaultNow().notNull(),
});

export const playerCoachNotes = pgTable("player_coach_notes", {
  id: serial("id").primaryKey(),
  playerId: integer("player_id").references(() => playerProfiles.id).notNull(),
  clubId: integer("club_id").references(() => clubs.id).notNull(),
  note: text("note").notNull(),
  createdByUserId: integer("created_by_user_id").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertPlayerAvatarSchema = createInsertSchema(playerAvatarSelections).omit({ id: true, createdAt: true });
export type PlayerAvatarSelection = typeof playerAvatarSelections.$inferSelect;
export type InsertPlayerAvatar = z.infer<typeof insertPlayerAvatarSchema>;

export const playerAnalyticsEnrollments = pgTable("player_analytics_enrollments", {
  id: serial("id").primaryKey(),
  playerId: integer("player_id").references(() => playerProfiles.id).notNull(),
  clubId: integer("club_id").references(() => clubs.id).notNull(),
  type: text("type").notNull(),
  enrolledByUserId: integer("enrolled_by_user_id").references(() => users.id).notNull(),
  enrolledAt: timestamp("enrolled_at").defaultNow().notNull(),
});

export const playerSkillProgress = pgTable("player_skill_progress", {
  id: serial("id").primaryKey(),
  playerId: integer("player_id").references(() => playerProfiles.id).notNull(),
  skillId: integer("skill_id").references(() => playerSkills.id).notNull(),
  percentage: integer("percentage").default(0).notNull(),
  level: integer("level").default(0).notNull(),
  comment: text("comment"),
  priority: boolean("priority").default(false).notNull(),
  updatedByUserId: integer("updated_by_user_id").references(() => users.id).notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const playerSkillProgressHistory = pgTable("player_skill_progress_history", {
  id: serial("id").primaryKey(),
  playerId: integer("player_id").references(() => playerProfiles.id).notNull(),
  skillId: integer("skill_id").references(() => playerSkills.id).notNull(),
  percentage: integer("percentage").notNull(),
  level: integer("level").notNull(),
  changedByUserId: integer("changed_by_user_id").references(() => users.id).notNull(),
  changedAt: timestamp("changed_at").defaultNow().notNull(),
});

export type PlayerAnalyticsEnrollment = typeof playerAnalyticsEnrollments.$inferSelect;
export type InsertPlayerAnalyticsEnrollment = typeof playerAnalyticsEnrollments.$inferInsert;
export type PlayerSkillProgress = typeof playerSkillProgress.$inferSelect;
export type InsertPlayerSkillProgress = typeof playerSkillProgress.$inferInsert;
export type PlayerSkillProgressHistory = typeof playerSkillProgressHistory.$inferSelect;

export const insertPlayerSkillCategorySchema = createInsertSchema(playerSkillCategories).omit({ id: true, createdAt: true });
export type PlayerSkillCategory = typeof playerSkillCategories.$inferSelect;
export type InsertPlayerSkillCategory = z.infer<typeof insertPlayerSkillCategorySchema>;

export const insertPlayerSkillSchema = createInsertSchema(playerSkills).omit({ id: true, createdAt: true });
export type PlayerSkill = typeof playerSkills.$inferSelect;
export type InsertPlayerSkill = z.infer<typeof insertPlayerSkillSchema>;

export const insertPlayerSkillReviewRequestSchema = createInsertSchema(playerSkillReviewRequests).omit({ id: true, requestedAt: true, acceptedAt: true, completedAt: true });
export type PlayerSkillReviewRequest = typeof playerSkillReviewRequests.$inferSelect;
export type InsertPlayerSkillReviewRequest = z.infer<typeof insertPlayerSkillReviewRequestSchema>;

export const insertPlayerSkillEvaluationSchema = createInsertSchema(playerSkillEvaluations).omit({ id: true, evaluatedAt: true });
export type PlayerSkillEvaluation = typeof playerSkillEvaluations.$inferSelect;
export type InsertPlayerSkillEvaluation = z.infer<typeof insertPlayerSkillEvaluationSchema>;

export const insertPlayerAchievementSchema = createInsertSchema(playerAchievements).omit({ id: true, earnedAt: true });
export type PlayerAchievementRecord = typeof playerAchievements.$inferSelect;
export type InsertPlayerAchievement = z.infer<typeof insertPlayerAchievementSchema>;

export const insertPlayerCoachNoteSchema = createInsertSchema(playerCoachNotes).omit({ id: true, createdAt: true });
export type PlayerCoachNote = typeof playerCoachNotes.$inferSelect;
export type InsertPlayerCoachNote = z.infer<typeof insertPlayerCoachNoteSchema>;

// === Incident Reports ===
export const incidentSeverityEnum = pgEnum("incident_severity", ["MINOR", "MODERATE", "SERIOUS", "EMERGENCY"]);
export const incidentStatusEnum = pgEnum("incident_status", ["PENDING_REVIEW", "UNDER_INVESTIGATION", "CLOSED"]);

export const incidentReports = pgTable("incident_reports", {
  id: serial("id").primaryKey(),
  reportNumber: text("report_number").notNull(),
  clubId: integer("club_id").references(() => clubs.id).notNull(),
  sessionId: integer("session_id").references(() => sessions.id),
  reportedByUserId: integer("reported_by_user_id").references(() => users.id).notNull(),
  reporterRole: text("reporter_role").notNull(),
  reporterContact: text("reporter_contact"),
  incidentDate: timestamp("incident_date").notNull(),
  incidentTime: text("incident_time"),
  location: text("location").notNull(),
  locationOther: text("location_other"),
  incidentType: text("incident_type").notNull(),
  incidentTypeOther: text("incident_type_other"),
  description: text("description").notNull(),
  severity: incidentSeverityEnum("severity").notNull(),
  medicalAttentionRequired: boolean("medical_attention_required").default(false).notNull(),
  hospitalAmbulanceCalled: boolean("hospital_ambulance_called").default(false).notNull(),
  immediateActions: jsonb("immediate_actions").$type<string[]>(),
  immediateActionsOther: text("immediate_actions_other"),
  followUpActions: jsonb("follow_up_actions").$type<string[]>(),
  followUpActionsOther: text("follow_up_actions_other"),
  assignedToUserId: integer("assigned_to_user_id").references(() => users.id),
  adminNotes: text("admin_notes"),
  status: incidentStatusEnum("status").default("PENDING_REVIEW").notNull(),
  isArchived: boolean("is_archived").default(false).notNull(),
  attachments: jsonb("attachments").$type<string[]>(),
  linkedTicketId: integer("linked_ticket_id").references(() => tickets.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const incidentAffectedMembers = pgTable("incident_affected_members", {
  id: serial("id").primaryKey(),
  incidentId: integer("incident_id").references(() => incidentReports.id).notNull(),
  userId: integer("user_id").references(() => users.id).notNull(),
  injuredBodyParts: jsonb("injured_body_parts").$type<string[]>(),
  injuryTypes: jsonb("injury_types").$type<string[]>(),
  notes: text("notes"),
});

export const insertIncidentReportSchema = createInsertSchema(incidentReports).omit({ id: true, createdAt: true, updatedAt: true });
export type IncidentReport = typeof incidentReports.$inferSelect;
export type InsertIncidentReport = z.infer<typeof insertIncidentReportSchema>;

export const insertIncidentAffectedMemberSchema = createInsertSchema(incidentAffectedMembers).omit({ id: true });
export type IncidentAffectedMember = typeof incidentAffectedMembers.$inferSelect;
export type InsertIncidentAffectedMember = z.infer<typeof insertIncidentAffectedMemberSchema>;

export const trialStatusEnum = pgEnum("trial_status", [
  "PENDING", "SCHEDULED", "ATTENDED", "EVALUATED", "APPROVED", "REDIRECTED", "REJECTED"
]);

export const trialPlayers = pgTable("trial_players", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  clubId: integer("club_id").references(() => clubs.id).notNull(),
  referralId: integer("referral_id").references(() => referrals.id),
  status: trialStatusEnum("status").default("PENDING").notNull(),
  assignedSessionId: integer("assigned_session_id").references(() => sessions.id),
  observerUserId: integer("observer_user_id").references(() => users.id),
  selfAssessedLevel: text("self_assessed_level"),
  experience: text("experience"),
  preferredDays: text("preferred_days").array(),
  adminNotes: text("admin_notes"),
  statusMessage: text("status_message"),
  finalDecision: text("final_decision"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const trialEvaluations = pgTable("trial_evaluations", {
  id: serial("id").primaryKey(),
  trialPlayerId: integer("trial_player_id").references(() => trialPlayers.id).notNull(),
  evaluatorUserId: integer("evaluator_user_id").references(() => users.id).notNull(),
  technicalLevel: integer("technical_level").notNull(),
  tacticalUnderstanding: integer("tactical_understanding").notNull(),
  movementFootwork: integer("movement_footwork").notNull(),
  matchAwareness: integer("match_awareness").notNull(),
  communicationAttitude: integer("communication_attitude").notNull(),
  overallScore: text("overall_score").notNull(),
  recommendation: text("recommendation").notNull(),
  adminOverrideDecision: text("admin_override_decision"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertTrialPlayerSchema = createInsertSchema(trialPlayers).omit({ id: true, createdAt: true, updatedAt: true });
export type TrialPlayer = typeof trialPlayers.$inferSelect;
export type InsertTrialPlayer = z.infer<typeof insertTrialPlayerSchema>;

export const insertTrialEvaluationSchema = createInsertSchema(trialEvaluations).omit({ id: true, createdAt: true });
export type TrialEvaluation = typeof trialEvaluations.$inferSelect;
export type InsertTrialEvaluation = z.infer<typeof insertTrialEvaluationSchema>;

export const lessonRequestStatusEnum = pgEnum("lesson_request_status", ["PENDING", "ACCEPTED", "DECLINED", "CANCELLED", "COMPLETED"]);
export const lessonTypeEnum = pgEnum("lesson_type", ["ONE_TO_ONE", "GROUP"]);

export const lessonRequests = pgTable("lesson_requests", {
  id: serial("id").primaryKey(),
  playerId: integer("player_id").references(() => users.id).notNull(),
  coachId: integer("coach_id").references(() => coaches.id).notNull(),
  clubId: integer("club_id").references(() => clubs.id),
  status: lessonRequestStatusEnum("status").default("PENDING").notNull(),
  lessonType: lessonTypeEnum("lesson_type").default("ONE_TO_ONE").notNull(),
  preferredDate: text("preferred_date").notNull(),
  preferredTime: text("preferred_time").notNull(),
  durationMinutes: integer("duration_minutes").default(60).notNull(),
  location: text("location"),
  playerMessage: text("player_message"),
  coachResponse: text("coach_response"),
  agreedPrice: integer("agreed_price"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertLessonRequestSchema = createInsertSchema(lessonRequests).omit({ id: true, createdAt: true, updatedAt: true });
export type LessonRequest = typeof lessonRequests.$inferSelect;
export type InsertLessonRequest = z.infer<typeof insertLessonRequestSchema>;

// === CLUB-RESTRICTED WALLETS ===
export const walletTransactionTypeEnum = pgEnum("wallet_transaction_type", ["CREDIT", "DEBIT", "ADJUSTMENT"]);

export const wallets = pgTable("wallets", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  name: text("name").notNull(),
  balance: integer("balance").default(0).notNull(),
  isGlobal: boolean("is_global").default(false).notNull(),
  allowedClubIds: integer("allowed_club_ids").array().default([]).notNull(),
  lowBalanceThreshold: integer("low_balance_threshold").default(500),
  isActive: boolean("is_active").default(true).notNull(),
  createdById: integer("created_by_id").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const walletTransactions = pgTable("wallet_transactions", {
  id: serial("id").primaryKey(),
  walletId: integer("wallet_id").references(() => wallets.id).notNull(),
  userId: integer("user_id").references(() => users.id).notNull(),
  clubId: integer("club_id").references(() => clubs.id),
  amount: integer("amount").notNull(),
  type: walletTransactionTypeEnum("type").notNull(),
  reason: text("reason").notNull(),
  linkedSessionId: integer("linked_session_id").references(() => sessions.id),
  createdById: integer("created_by_id").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const walletRelations = relations(wallets, ({ one, many }) => ({
  user: one(users, { fields: [wallets.userId], references: [users.id] }),
  createdBy: one(users, { fields: [wallets.createdById], references: [users.id], relationName: "walletCreator" }),
  transactions: many(walletTransactions),
}));

export const walletTransactionRelations = relations(walletTransactions, ({ one }) => ({
  wallet: one(wallets, { fields: [walletTransactions.walletId], references: [wallets.id] }),
  user: one(users, { fields: [walletTransactions.userId], references: [users.id] }),
  club: one(clubs, { fields: [walletTransactions.clubId], references: [clubs.id] }),
  createdBy: one(users, { fields: [walletTransactions.createdById], references: [users.id], relationName: "txCreator" }),
}));

export const insertWalletSchema = createInsertSchema(wallets).omit({ id: true, createdAt: true, updatedAt: true, balance: true });
export type Wallet = typeof wallets.$inferSelect;
export type InsertWallet = z.infer<typeof insertWalletSchema>;

export const insertWalletTransactionSchema = createInsertSchema(walletTransactions).omit({ id: true, createdAt: true });
export type WalletTransaction = typeof walletTransactions.$inferSelect;
export type InsertWalletTransaction = z.infer<typeof insertWalletTransactionSchema>;

export const tshirtCollectionStatusEnum = pgEnum("tshirt_collection_status", ["not_ready", "ready", "player_confirmed", "collected"]);
export const tshirtPaymentStatusEnum = pgEnum("tshirt_payment_status", ["paid", "pending"]);
export const tshirtRequestStatusEnum = pgEnum("tshirt_request_status", ["pending", "batched", "in_production"]);

export const tshirts = pgTable("tshirts", {
  id: serial("id").primaryKey(),
  playerId: integer("player_id").references(() => playerProfiles.id).notNull(),
  clubId: integer("club_id").references(() => clubs.id).notNull(),
  model: text("model").default("chaotica").notNull(),
  size: text("size").notNull(),
  printedName: text("printed_name").notNull(),
  paymentStatus: tshirtPaymentStatusEnum("payment_status").default("pending").notNull(),
  batchId: integer("batch_id"),
  collectionStatus: tshirtCollectionStatusEnum("collection_status").default("not_ready").notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  collectedAt: timestamp("collected_at"),
  confirmedById: integer("confirmed_by_id").references(() => users.id),
});

export const tshirtRequests = pgTable("tshirt_requests", {
  id: serial("id").primaryKey(),
  playerId: integer("player_id").references(() => playerProfiles.id).notNull(),
  clubId: integer("club_id").references(() => clubs.id).notNull(),
  model: text("model").default("chaotica").notNull(),
  size: text("size").notNull(),
  printedName: text("printed_name").notNull(),
  status: tshirtRequestStatusEnum("tshirt_request_status").default("pending").notNull(),
  batchId: integer("batch_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const tshirtBatches = pgTable("tshirt_batches", {
  id: serial("id").primaryKey(),
  clubId: integer("club_id").references(() => clubs.id).notNull(),
  createdById: integer("created_by_id").references(() => users.id).notNull(),
  requestCount: integer("request_count").notNull(),
  status: text("status").default("created").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertTshirtSchema = createInsertSchema(tshirts).omit({ id: true, createdAt: true, updatedAt: true, collectedAt: true, confirmedById: true });
export type Tshirt = typeof tshirts.$inferSelect;
export type InsertTshirt = z.infer<typeof insertTshirtSchema>;

export const insertTshirtRequestSchema = createInsertSchema(tshirtRequests).omit({ id: true, createdAt: true, batchId: true, status: true });
export type TshirtRequest = typeof tshirtRequests.$inferSelect;
export type InsertTshirtRequest = z.infer<typeof insertTshirtRequestSchema>;

export const insertTshirtBatchSchema = createInsertSchema(tshirtBatches).omit({ id: true, createdAt: true });
export type TshirtBatch = typeof tshirtBatches.$inferSelect;
export type InsertTshirtBatch = z.infer<typeof insertTshirtBatchSchema>;

// === MERCHANDISE SYSTEM ===
export const merchandiseCategories = pgTable("merchandise_categories", {
  id: serial("id").primaryKey(),
  clubId: integer("club_id").references(() => clubs.id),
  name: text("name").notNull(),
  emoji: text("emoji").default("🛍️"),
  gradient: text("gradient").default("from-purple-500 to-fuchsia-600"),
  imageUrl: text("image_url"),
  sortOrder: integer("sort_order").default(0),
  isDefault: boolean("is_default").default(false).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
export type MerchandiseCategory = typeof merchandiseCategories.$inferSelect;

export const merchandiseProductStatusEnum = pgEnum("merchandise_product_status", ["active", "draft", "out_of_stock", "discontinued"]);

export const merchandiseProducts = pgTable("merchandise_products", {
  id: serial("id").primaryKey(),
  clubId: integer("club_id").references(() => clubs.id).notNull(),
  categoryName: text("category_name").default("Other"),
  name: text("name").notNull(),
  description: text("description"),
  shortDescription: text("short_description"),
  imageUrl: text("image_url"),
  price: integer("price"),
  sizes: text("sizes").array(),
  genders: text("genders").array(),
  styles: text("styles").array(),
  materials: text("materials"),
  specifications: text("specifications"),
  tags: text("tags").array(),
  status: merchandiseProductStatusEnum("status").default("active").notNull(),
  isFeatured: boolean("is_featured").default(false).notNull(),
  sortOrder: integer("sort_order").default(0),
  stock: integer("stock").default(0).notNull(),
  lowStockThreshold: integer("low_stock_threshold").default(5).notNull(),
  variations: jsonb("variations").default([]).notNull(),
  assignedClubIds: integer("assigned_club_ids").array().default([]).notNull(),
  createdBy: integer("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
export type MerchandiseProduct = typeof merchandiseProducts.$inferSelect;

export const merchandiseOrderStatusEnum = pgEnum("merchandise_order_status", ["pending", "approved", "ready", "collected", "cancelled"]);

export const merchandiseOrderItems = pgTable("merchandise_order_items", {
  id: serial("id").primaryKey(),
  clubId: integer("club_id").references(() => clubs.id).notNull(),
  productId: integer("product_id").references(() => merchandiseProducts.id).notNull(),
  userId: integer("user_id").references(() => users.id).notNull(),
  size: text("size"),
  gender: text("gender"),
  style: text("style"),
  quantity: integer("quantity").default(1).notNull(),
  notes: text("notes"),
  backName: text("back_name"),
  status: merchandiseOrderStatusEnum("merchandise_order_status").default("pending").notNull(),
  adminNotes: text("admin_notes"),
  paymentStatus: text("payment_status").default("Unpaid").notNull(),
  unitPrice: integer("unit_price"),
  viewedByAdminAt: timestamp("viewed_by_admin_at"),
  stockDeducted: boolean("stock_deducted").default(false).notNull(),
  variationLabel: text("variation_label"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
export type MerchandiseOrderItem = typeof merchandiseOrderItems.$inferSelect;

export const merchandiseOrderHistory = pgTable("merchandise_order_history", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id").references(() => merchandiseOrderItems.id, { onDelete: "cascade" }).notNull(),
  fromStatus: text("from_status"),
  toStatus: text("to_status").notNull(),
  paymentChange: text("payment_change"),
  changedById: integer("changed_by_id").references(() => users.id),
  note: text("note"),
  changedAt: timestamp("changed_at").defaultNow().notNull(),
});
export type MerchandiseOrderHistory = typeof merchandiseOrderHistory.$inferSelect;

export const teamEvents = pgTable("team_events", {
  id: serial("id").primaryKey(),
  clubId: integer("club_id").references(() => clubs.id).notNull(),
  title: text("title").notNull(),
  description: text("description"),
  location: text("location"),
  date: timestamp("date").notNull(),
  startTime: text("start_time").notNull(),
  endTime: text("end_time"),
  durationMinutes: integer("duration_minutes").default(120).notNull(),
  maxParticipants: integer("max_participants").default(20).notNull(),
  eventType: text("event_type").default("SOCIAL").notNull(),
  status: text("status").default("UPCOMING").notNull(),
  meetingPoint: text("meeting_point"),
  transportInfo: text("transport_info"),
  dressCode: text("dress_code"),
  equipmentRequired: text("equipment_required"),
  contactPerson: text("contact_person"),
  contactPhone: text("contact_phone"),
  isPublic: boolean("is_public").default(true).notNull(),
  fee: integer("fee").default(0),
  notes: text("notes"),
  createdBy: integer("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const teamEventSignups = pgTable("team_event_signups", {
  id: serial("id").primaryKey(),
  teamEventId: integer("team_event_id").references(() => teamEvents.id).notNull(),
  userId: integer("user_id").references(() => users.id).notNull(),
  status: text("status").default("CONFIRMED").notNull(),
  paymentStatus: paymentStatusEnum("payment_status").default("UNPAID").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const teamEventsRelations = relations(teamEvents, ({ one, many }) => ({
  club: one(clubs, { fields: [teamEvents.clubId], references: [clubs.id] }),
  creator: one(users, { fields: [teamEvents.createdBy], references: [users.id] }),
  signups: many(teamEventSignups),
}));

export const teamEventSignupsRelations = relations(teamEventSignups, ({ one }) => ({
  teamEvent: one(teamEvents, { fields: [teamEventSignups.teamEventId], references: [teamEvents.id] }),
  user: one(users, { fields: [teamEventSignups.userId], references: [users.id] }),
}));

export const insertTeamEventSchema = createInsertSchema(teamEvents).omit({ id: true, createdAt: true });
export type TeamEvent = typeof teamEvents.$inferSelect;
export type InsertTeamEvent = z.infer<typeof insertTeamEventSchema>;

export const insertTeamEventSignupSchema = createInsertSchema(teamEventSignups).omit({ id: true, createdAt: true });
export type TeamEventSignup = typeof teamEventSignups.$inferSelect;
export type InsertTeamEventSignup = z.infer<typeof insertTeamEventSignupSchema>;

export const communityEvents = pgTable("community_events", {
  id: serial("id").primaryKey(),
  clubId: integer("club_id").references(() => clubs.id).notNull(),
  title: text("title").notNull(),
  description: text("description"),
  coverImage: text("cover_image"),
  eventType: text("event_type").notNull().default("social"),
  eventDate: timestamp("event_date"),
  location: text("location"),
  maxParticipants: integer("max_participants"),
  isFoodEnabled: boolean("is_food_enabled").notNull().default(false),
  isFeatured: boolean("is_featured").notNull().default(false),
  isVisible: boolean("is_visible").notNull().default(true),
  tags: text("tags").array(),
  createdBy: integer("created_by").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const communityEventParticipants = pgTable("community_event_participants", {
  id: serial("id").primaryKey(),
  eventId: integer("event_id").references(() => communityEvents.id).notNull(),
  userId: integer("user_id").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const foodEntries = pgTable("food_entries", {
  id: serial("id").primaryKey(),
  eventId: integer("event_id").references(() => communityEvents.id).notNull(),
  clubId: integer("club_id").references(() => clubs.id).notNull(),
  userId: integer("user_id").references(() => users.id).notNull(),
  dishName: text("dish_name").notNull(),
  country: text("country"),
  countryFlag: text("country_flag"),
  category: text("category"),
  imageUrl: text("image_url"),
  isHalal: boolean("is_halal").notNull().default(false),
  isVegetarian: boolean("is_vegetarian").notNull().default(false),
  isVegan: boolean("is_vegan").notNull().default(false),
  containsAlcohol: boolean("contains_alcohol").notNull().default(false),
  allergens: text("allergens").array(),
  ingredients: text("ingredients"),
  isApproved: boolean("is_approved").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const foodInterests = pgTable("food_interests", {
  id: serial("id").primaryKey(),
  foodEntryId: integer("food_entry_id").references(() => foodEntries.id).notNull(),
  userId: integer("user_id").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const communityPosts = pgTable("community_posts", {
  id: serial("id").primaryKey(),
  clubId: integer("club_id").references(() => clubs.id).notNull(),
  eventId: integer("event_id").references(() => communityEvents.id),
  userId: integer("user_id").references(() => users.id).notNull(),
  content: text("content").notNull(),
  images: text("images").array(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const communityComments = pgTable("community_comments", {
  id: serial("id").primaryKey(),
  postId: integer("post_id").references(() => communityPosts.id).notNull(),
  userId: integer("user_id").references(() => users.id).notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const communityLikes = pgTable("community_likes", {
  id: serial("id").primaryKey(),
  postId: integer("post_id").references(() => communityPosts.id).notNull(),
  userId: integer("user_id").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const communityReviews = pgTable("community_reviews", {
  id: serial("id").primaryKey(),
  clubId: integer("club_id").references(() => clubs.id).notNull(),
  eventId: integer("event_id").references(() => communityEvents.id),
  foodEntryId: integer("food_entry_id").references(() => foodEntries.id),
  userId: integer("user_id").references(() => users.id).notNull(),
  rating: integer("rating").notNull(),
  comment: text("comment"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertCommunityEventSchema = createInsertSchema(communityEvents).omit({ id: true, createdAt: true });
export type CommunityEvent = typeof communityEvents.$inferSelect;
export type InsertCommunityEvent = z.infer<typeof insertCommunityEventSchema>;

export const insertFoodEntrySchema = createInsertSchema(foodEntries).omit({ id: true, createdAt: true });
export type FoodEntry = typeof foodEntries.$inferSelect;
export type InsertFoodEntry = z.infer<typeof insertFoodEntrySchema>;

export const insertCommunityPostSchema = createInsertSchema(communityPosts).omit({ id: true, createdAt: true });
export type CommunityPost = typeof communityPosts.$inferSelect;
export type InsertCommunityPost = z.infer<typeof insertCommunityPostSchema>;

export const insertCommunityCommentSchema = createInsertSchema(communityComments).omit({ id: true, createdAt: true });
export type CommunityComment = typeof communityComments.$inferSelect;
export type InsertCommunityComment = z.infer<typeof insertCommunityCommentSchema>;

export const insertCommunityReviewSchema = createInsertSchema(communityReviews).omit({ id: true, createdAt: true });
export type CommunityReview = typeof communityReviews.$inferSelect;
export type InsertCommunityReview = z.infer<typeof insertCommunityReviewSchema>;

// =====================================================
// Debt & Payments Management
// =====================================================
export const debtCharges = pgTable("debt_charges", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  clubId: integer("club_id").notNull(),
  amount: integer("amount").notNull(),
  description: text("description").notNull(),
  category: text("category").notNull().default("OTHER"),
  chargeDate: timestamp("charge_date").notNull().defaultNow(),
  createdById: integer("created_by_id").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const debtPayments = pgTable("debt_payments", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  clubId: integer("club_id").notNull(),
  amount: integer("amount").notNull(),
  method: text("method").notNull().default("CASH"),
  paymentDate: timestamp("payment_date").notNull().defaultNow(),
  chargeId: integer("charge_id"),
  notes: text("notes"),
  createdById: integer("created_by_id").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const playerDebtNotes = pgTable("player_debt_notes", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  clubId: integer("club_id").notNull(),
  note: text("note").notNull(),
  createdById: integer("created_by_id").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertDebtChargeSchema = createInsertSchema(debtCharges).omit({ id: true, createdAt: true, createdById: true });
export type DebtCharge = typeof debtCharges.$inferSelect;
export type InsertDebtCharge = z.infer<typeof insertDebtChargeSchema>;

export const insertDebtPaymentSchema = createInsertSchema(debtPayments).omit({ id: true, createdAt: true, createdById: true });
export type DebtPayment = typeof debtPayments.$inferSelect;
export type InsertDebtPayment = z.infer<typeof insertDebtPaymentSchema>;

export const insertPlayerDebtNoteSchema = createInsertSchema(playerDebtNotes).omit({ id: true, createdAt: true, createdById: true });
export type PlayerDebtNote = typeof playerDebtNotes.$inferSelect;
export type InsertPlayerDebtNote = z.infer<typeof insertPlayerDebtNoteSchema>;

// ============================================================================
// === BIRMINGHAM SUPER LEAGUE (BSL) ==========================================
// ============================================================================

export const bslPaymentStatusEnum = pgEnum("bsl_payment_status", [
  "PENDING_PAYMENT", "PENDING_VERIFICATION", "ACTIVE", "REJECTED"
]);
export const bslFixtureStatusEnum = pgEnum("bsl_fixture_status", [
  "SCHEDULED", "WARMUP", "LIVE", "FINISHED"
]);
export const bslRubberTypeEnum = pgEnum("bsl_rubber_type", [
  "MS1", "MS2", "WS", "MD", "WD", "XD"
]);
export const bslWalletTxTypeEnum = pgEnum("bsl_wallet_tx_type", ["TOPUP", "DEDUCTION"]);
export const bslWalletTxStatusEnum = pgEnum("bsl_wallet_tx_status", [
  "PENDING", "APPROVED", "REJECTED"
]);

// Singleton league configuration row (id always = 1)
export const bslLeagues = pgTable("bsl_leagues", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().default("Birmingham Super League"),
  tagline: text("tagline").default("Compete. Connect. Elevate."),
  // Bank details for transfers (admin-editable)
  bankAccountName: text("bank_account_name").notNull().default("Birmingham Super League Ltd"),
  bankSortCode: text("bank_sort_code").notNull().default("00-00-00"),
  bankAccountNumber: text("bank_account_number").notNull().default("00000000"),
  clubFee: integer("club_fee").notNull().default(50000), // in pence (£500)
  playerFee: integer("player_fee").notNull().default(2500), // in pence (£25)
  nextLeagueDay: timestamp("next_league_day"), // countdown target
  venueName: text("venue_name").default("One Central Venue, Birmingham"),
  divisions: text("divisions").array().notNull().default(["Premier", "Championship", "Division 1"]),
  pointsWin: integer("points_win").notNull().default(3),
  pointsDraw: integer("points_draw").notNull().default(1),
  pointsLoss: integer("points_loss").notNull().default(0),
  matchFormat: text("match_format").notNull().default("6-RUBBER"),
  courtCount: integer("court_count").notNull().default(6),
  notificationsEnabled: boolean("notifications_enabled").notNull().default(true),
  brandingPrimary: text("branding_primary").default("hsl(42 95% 55%)"),
  brandingAccent: text("branding_accent").default("hsl(195 100% 60%)"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const bslClubs = pgTable("bsl_clubs", {
  id: serial("id").primaryKey(),
  clubId: integer("club_id").references(() => clubs.id), // optional link to existing club
  name: text("name").notNull(),
  managerUserId: integer("manager_user_id").notNull().references(() => users.id),
  logoUrl: text("logo_url"),
  division: text("division").notNull(),
  teamCount: integer("team_count").notNull().default(1),
  categories: text("categories").array().default(sql`ARRAY['MD']::text[]`),
  categoryPairs: jsonb("category_pairs").$type<Record<string, number>>().default({}),
  paymentReference: text("payment_reference").notNull().unique(), // e.g., "BSL-CLUB-XYZ123"
  paymentProofUrl: text("payment_proof_url"),
  inviteCode: text("invite_code").unique(), // generated on approval
  status: bslPaymentStatusEnum("status").notNull().default("PENDING_PAYMENT"),
  rejectionReason: text("rejection_reason"),
  approvedAt: timestamp("approved_at"),
  approvedById: integer("approved_by_id").references(() => users.id),
  isFlagged: boolean("is_flagged").notNull().default(false),
  isSuspended: boolean("is_suspended").notNull().default(false),
  adminNotes: text("admin_notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const bslTeams = pgTable("bsl_teams", {
  id: serial("id").primaryKey(),
  bslClubId: integer("bsl_club_id").notNull().references(() => bslClubs.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  division: text("division").notNull(),
  category: text("category"),
  pairNumber: integer("pair_number").default(1),
  // Standings
  played: integer("played").notNull().default(0),
  won: integer("won").notNull().default(0),
  drawn: integer("drawn").notNull().default(0),
  lost: integer("lost").notNull().default(0),
  rubbersFor: integer("rubbers_for").notNull().default(0),
  rubbersAgainst: integer("rubbers_against").notNull().default(0),
  points: integer("points").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const bslPlayers = pgTable("bsl_players", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  bslTeamId: integer("bsl_team_id").references(() => bslTeams.id, { onDelete: "set null" }),
  bslClubId: integer("bsl_club_id").references(() => bslClubs.id, { onDelete: "set null" }),
  paymentReference: text("payment_reference").notNull().unique(),
  paymentProofUrl: text("payment_proof_url"),
  status: bslPaymentStatusEnum("status").notNull().default("PENDING_PAYMENT"),
  walletBalance: integer("wallet_balance").notNull().default(0), // in pence
  rejectionReason: text("rejection_reason"),
  approvedAt: timestamp("approved_at"),
  approvedById: integer("approved_by_id").references(() => users.id),
  // Stats
  matchesPlayed: integer("matches_played").notNull().default(0),
  matchesWon: integer("matches_won").notNull().default(0),
  pointsScored: integer("points_scored").notNull().default(0),
  // Discipline
  warnings: integer("warnings").notNull().default(0),
  isSuspended: boolean("is_suspended").notNull().default(false),
  matchBanCount: integer("match_ban_count").notNull().default(0),
  disciplineNotes: text("discipline_notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const bslLeagueDays = pgTable("bsl_league_days", {
  id: serial("id").primaryKey(),
  bslLeagueId: integer("bsl_league_id").notNull().references(() => bslLeagues.id, { onDelete: "cascade" }),
  date: timestamp("date").notNull(),
  status: text("status").notNull().default("UPCOMING"), // UPCOMING, LIVE, COMPLETED
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const bslFixtures = pgTable("bsl_fixtures", {
  id: serial("id").primaryKey(),
  bslLeagueDayId: integer("bsl_league_day_id").references(() => bslLeagueDays.id, { onDelete: "cascade" }),
  homeTeamId: integer("home_team_id").notNull().references(() => bslTeams.id),
  awayTeamId: integer("away_team_id").notNull().references(() => bslTeams.id),
  court: integer("court"), // null = unassigned, set by drag-drop
  startTime: timestamp("start_time"),
  status: bslFixtureStatusEnum("status").notNull().default("SCHEDULED"),
  homeRubbers: integer("home_rubbers").notNull().default(0),
  awayRubbers: integer("away_rubbers").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const bslRubbers = pgTable("bsl_rubbers", {
  id: serial("id").primaryKey(),
  bslFixtureId: integer("bsl_fixture_id").notNull().references(() => bslFixtures.id, { onDelete: "cascade" }),
  rubberNumber: integer("rubber_number").notNull(), // 1..6
  rubberType: bslRubberTypeEnum("rubber_type").notNull(),
  homePlayer1Id: integer("home_player1_id").references(() => bslPlayers.id),
  homePlayer2Id: integer("home_player2_id").references(() => bslPlayers.id),
  awayPlayer1Id: integer("away_player1_id").references(() => bslPlayers.id),
  awayPlayer2Id: integer("away_player2_id").references(() => bslPlayers.id),
  homeScore: integer("home_score").notNull().default(0),
  awayScore: integer("away_score").notNull().default(0),
  status: bslFixtureStatusEnum("status").notNull().default("SCHEDULED"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const bslWalletTransactions = pgTable("bsl_wallet_transactions", {
  id: serial("id").primaryKey(),
  bslPlayerId: integer("bsl_player_id").notNull().references(() => bslPlayers.id, { onDelete: "cascade" }),
  type: bslWalletTxTypeEnum("type").notNull(),
  amount: integer("amount").notNull(), // in pence; positive
  status: bslWalletTxStatusEnum("status").notNull().default("PENDING"),
  proofUrl: text("proof_url"),
  reference: text("reference").notNull(),
  description: text("description"),
  reviewedById: integer("reviewed_by_id").references(() => users.id),
  reviewedAt: timestamp("reviewed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertBslLeagueSchema = createInsertSchema(bslLeagues).omit({ id: true, createdAt: true, updatedAt: true });
export type BslLeague = typeof bslLeagues.$inferSelect;
export type InsertBslLeague = z.infer<typeof insertBslLeagueSchema>;

export const insertBslClubSchema = createInsertSchema(bslClubs).omit({ id: true, createdAt: true, paymentReference: true, status: true, inviteCode: true, approvedAt: true, approvedById: true, paymentProofUrl: true, rejectionReason: true });
export type BslClub = typeof bslClubs.$inferSelect;
export type InsertBslClub = z.infer<typeof insertBslClubSchema>;

export const insertBslTeamSchema = createInsertSchema(bslTeams).omit({ id: true, createdAt: true, played: true, won: true, drawn: true, lost: true, rubbersFor: true, rubbersAgainst: true, points: true });
export type BslTeam = typeof bslTeams.$inferSelect;
export type InsertBslTeam = z.infer<typeof insertBslTeamSchema>;

export const insertBslPlayerSchema = createInsertSchema(bslPlayers).omit({ id: true, createdAt: true, paymentReference: true, status: true, walletBalance: true, approvedAt: true, approvedById: true, paymentProofUrl: true, rejectionReason: true, matchesPlayed: true, matchesWon: true, pointsScored: true });
export type BslPlayer = typeof bslPlayers.$inferSelect;
export type InsertBslPlayer = z.infer<typeof insertBslPlayerSchema>;

export const insertBslFixtureSchema = createInsertSchema(bslFixtures).omit({ id: true, createdAt: true, status: true, homeRubbers: true, awayRubbers: true });
export type BslFixture = typeof bslFixtures.$inferSelect;
export type InsertBslFixture = z.infer<typeof insertBslFixtureSchema>;

export type BslRubber = typeof bslRubbers.$inferSelect;
export type BslLeagueDay = typeof bslLeagueDays.$inferSelect;
export type BslWalletTransaction = typeof bslWalletTransactions.$inferSelect;

export const bslAuditLog = pgTable("bsl_audit_log", {
  id: serial("id").primaryKey(),
  actorUserId: integer("actor_user_id").references(() => users.id),
  actorRole: text("actor_role"),
  action: text("action").notNull(),
  entity: text("entity").notNull(),
  entityId: integer("entity_id"),
  detail: jsonb("detail"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
export type BslAuditEntry = typeof bslAuditLog.$inferSelect;

export const bslMedia = pgTable("bsl_media", {
  id: serial("id").primaryKey(),
  url: text("url").notNull(),
  caption: text("caption"),
  taggedClubId: integer("tagged_club_id").references(() => bslClubs.id, { onDelete: "set null" }),
  taggedPlayerId: integer("tagged_player_id").references(() => bslPlayers.id, { onDelete: "set null" }),
  isMvp: boolean("is_mvp").notNull().default(false),
  isFeatured: boolean("is_featured").notNull().default(false),
  uploadedById: integer("uploaded_by_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
export type BslMedia = typeof bslMedia.$inferSelect;

// === PUSH NOTIFICATIONS (OneSignal) ===
export const userPushSubscriptions = pgTable("user_push_subscriptions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  oneSignalPlayerId: text("onesignal_player_id").notNull(),
  platform: text("platform"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  lastSeenAt: timestamp("last_seen_at").defaultNow().notNull(),
});
export type UserPushSubscription = typeof userPushSubscriptions.$inferSelect;

export const userNotificationPrefs = pgTable("user_notification_prefs", {
  userId: integer("user_id").primaryKey().references(() => users.id, { onDelete: "cascade" }),
  paymentReceived: boolean("payment_received").default(true).notNull(),
  waitlistPromoted: boolean("waitlist_promoted").default(true).notNull(),
  newSessionMatchingLevel: boolean("new_session_matching_level").default(true).notNull(),
  postSessionUnpaidReminder: boolean("post_session_unpaid_reminder").default(true).notNull(),
  adminAnnouncement: boolean("admin_announcement").default(true).notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
export type UserNotificationPrefs = typeof userNotificationPrefs.$inferSelect;

export const pushSendLog = pgTable("push_send_log", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  category: text("category").notNull(),
  refType: text("ref_type"),
  refId: integer("ref_id"),
  sentAt: timestamp("sent_at").defaultNow().notNull(),
});
export type PushSendLog = typeof pushSendLog.$inferSelect;
