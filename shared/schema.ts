import { pgTable, text, serial, integer, boolean, timestamp, jsonb, pgEnum } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
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
export const accountStatusEnum = pgEnum("account_status", ["PENDING", "APPROVED", "REJECTED"]);
export const clubStatusEnum = pgEnum("club_status", ["PENDING", "APPROVED", "REJECTED", "ARCHIVED", "PAUSED"]); // Club approval status
export const playerStatusEnum = pgEnum("player_status", ["ACTIVE", "SUSPENDED", "ARCHIVED", "BANNED"]); // Player profile status
export const genderRestrictionEnum = pgEnum("gender_restriction", ["ALL", "FEMALE_ONLY"]);
export const sessionTypeEnum = pgEnum("session_type", ["OPEN", "JUNIORS_ONLY"]);
export const tournamentStatusEnum = pgEnum("tournament_status", ["DRAFT", "PUBLISHED", "ONGOING", "COMPLETED"]);
export const tournamentTypeEnum = pgEnum("tournament_type", ["CLUB", "OPEN", "LEAGUE", "FRIENDLY"]);
export const tournamentFormatEnum = pgEnum("tournament_format", ["ROUND_ROBIN", "KNOCKOUT", "GROUP_KNOCKOUT"]);
export const tournamentMatchStatusEnum = pgEnum("tournament_match_status", ["UPCOMING", "LIVE", "FINISHED"]);
export const clubMembershipStatusEnum = pgEnum("club_membership_status", ["PENDING", "ACTIVE", "EXPIRING", "EXPIRED", "CANCELLED"]);
export const membershipRequestStatusEnum = pgEnum("membership_request_status", ["PENDING", "APPROVED", "REJECTED"]);
export const merchOrderStatusEnum = pgEnum("merch_order_status", ["PENDING", "CONFIRMED", "DELIVERED", "CANCELLED"]);
export const inventoryMovementTypeEnum = pgEnum("inventory_movement_type", ["RECEIPT", "USAGE", "SALE", "ADJUSTMENT"]);
export const recurrenceFrequencyEnum = pgEnum("recurrence_frequency", ["DAILY", "WEEKLY", "BIWEEKLY", "MONTHLY"]);

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
  // Contact Information (visible only to super admin)
  contactFullName: text("contact_full_name"),
  contactPhone: text("contact_phone"),
  contactAddress: text("contact_address"),
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
  membershipNumber: text("membership_number").unique(),
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
  rankingPoints: integer("ranking_points").default(0).notNull(),
  matchesPlayed: integer("matches_played").default(0).notNull(),
  matchesWon: integer("matches_won").default(0).notNull(),
  membershipId: integer("membership_id").references(() => membershipPlans.id),
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
  courtNames: jsonb("court_names").$type<string[]>(), // e.g. ["Court 1", "Main Court", "Back Court"]
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
  shuttlecockType: text("shuttlecock_type"),
  courtNames: jsonb("court_names").$type<string[]>(),
  liveStreamUrl: text("live_stream_url"),
  defaultPointsToPlayTo: integer("default_points_to_play_to").default(21),
  numberOfSets: integer("number_of_sets").default(1).notNull(),
  autoGenerateActive: boolean("auto_generate_active").default(false).notNull(),
  queueTargetSize: integer("queue_target_size").default(3),
  recurringEventId: integer("recurring_event_id").references(() => recurringEvents.id),
  publishAt: timestamp("publish_at"),
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
  isPaused: boolean("is_paused").default(false).notNull(),
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
  teamAPlayer1Id: integer("team_a_player_1_id").references(() => playerProfiles.id).notNull(),
  teamAPlayer2Id: integer("team_a_player_2_id").references(() => playerProfiles.id),
  teamBPlayer1Id: integer("team_b_player_1_id").references(() => playerProfiles.id).notNull(),
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
});

// === TOURNAMENTS ===
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
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const tournamentMatches = pgTable("tournament_matches", {
  id: serial("id").primaryKey(),
  categoryId: integer("category_id").references(() => tournamentCategories.id).notNull(),
  teamAId: integer("team_a_id").references(() => tournamentTeams.id),
  teamBId: integer("team_b_id").references(() => tournamentTeams.id),
  courtNumber: integer("court_number"),
  scheduledTime: timestamp("scheduled_time"),
  status: tournamentMatchStatusEnum("status").default("UPCOMING").notNull(),
  scores: jsonb("scores").$type<Array<{scoreA: number; scoreB: number}>>().default([]),
  winnerId: integer("winner_id").references(() => tournamentTeams.id),
  round: integer("round").default(1).notNull(),
  matchOrder: integer("match_order").default(0).notNull(),
  groupNumber: integer("group_number"),
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
  matchesPlayed: integer("matches_played").default(0).notNull(),
  matchesWon: integer("matches_won").default(0).notNull(),
  matchesLost: integer("matches_lost").default(0).notNull(),
  gamesWon: integer("games_won").default(0).notNull(),
  gamesLost: integer("games_lost").default(0).notNull(),
  pointsFor: integer("points_for").default(0).notNull(),
  pointsAgainst: integer("points_against").default(0).notNull(),
  points: integer("points").default(0).notNull(),
});

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

// === INTERNAL MESSAGES ===
export const internalMessages = pgTable("internal_messages", {
  id: serial("id").primaryKey(),
  senderId: integer("sender_id").references(() => users.id).notNull(),
  recipientId: integer("recipient_id").references(() => users.id).notNull(),
  subject: text("subject").notNull(),
  body: text("body").notNull(),
  clubId: integer("club_id").references(() => clubs.id),
  readAt: timestamp("read_at"),
  archivedBySender: boolean("archived_by_sender").default(false).notNull(),
  archivedByRecipient: boolean("archived_by_recipient").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// === POLICY ACCEPTANCES ===
export const policyAcceptances = pgTable("policy_acceptances", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
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
}));

export const tournamentStandingsRelations = relations(tournamentStandings, ({ one }) => ({
  category: one(tournamentCategories, { fields: [tournamentStandings.categoryId], references: [tournamentCategories.id] }),
  team: one(tournamentTeams, { fields: [tournamentStandings.teamId], references: [tournamentTeams.id] }),
}));

// === SCHEMAS ===
export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true, emailVerified: true });
export const insertClubSchema = createInsertSchema(clubs).omit({ id: true, createdAt: true });
export const insertPlayerProfileSchema = createInsertSchema(playerProfiles).omit({ id: true, rankingPoints: true, matchesPlayed: true, matchesWon: true });
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
export const insertTournamentCategorySchema = createInsertSchema(tournamentCategories).omit({ id: true, createdAt: true });
export const insertTournamentTeamSchema = createInsertSchema(tournamentTeams).omit({ id: true, createdAt: true });
export const insertTournamentMatchSchema = createInsertSchema(tournamentMatches).omit({ id: true, createdAt: true });

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
export type Membership = typeof memberships.$inferSelect;
export type Tournament = typeof tournaments.$inferSelect;
export type TournamentCategory = typeof tournamentCategories.$inferSelect;
export type TournamentTeam = typeof tournamentTeams.$inferSelect;
export type TournamentMatch = typeof tournamentMatches.$inferSelect;
export type TournamentStanding = typeof tournamentStandings.$inferSelect;
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

// === DISCOUNT CODES ===
export const discountCodes = pgTable("discount_codes", {
  id: serial("id").primaryKey(),
  clubId: integer("club_id").references(() => clubs.id).notNull(),
  code: text("code").notNull(),
  description: text("description"),
  discountPercent: integer("discount_percent"),
  shopName: text("shop_name"),
  shopUrl: text("shop_url"),
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
export const ticketCategoryEnum = pgEnum("ticket_category", ["CONCERN", "COMPLAINT", "SUGGESTION", "GENERAL", "SAFEGUARDING", "BAN_APPEAL"]);
export const ticketPriorityEnum = pgEnum("ticket_priority", ["LOW", "MEDIUM", "HIGH", "URGENT"]);

export const tickets = pgTable("tickets", {
  id: serial("id").primaryKey(),
  ticketNumber: text("ticket_number").notNull().unique(),
  clubId: integer("club_id").references(() => clubs.id).notNull(),
  createdByUserId: integer("created_by_user_id").references(() => users.id).notNull(),
  assignedToUserId: integer("assigned_to_user_id").references(() => users.id),
  subject: text("subject").notNull(),
  description: text("description").notNull(),
  category: ticketCategoryEnum("category").notNull(),
  priority: ticketPriorityEnum("priority").default("MEDIUM").notNull(),
  status: ticketStatusEnum("status").default("SUBMITTED").notNull(),
  isConfidential: boolean("is_confidential").default(false).notNull(),
  linkedBanUserId: integer("linked_ban_user_id").references(() => users.id),
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

export const referrals = pgTable("referrals", {
  id: serial("id").primaryKey(),
  referrerId: integer("referrer_id").references(() => users.id).notNull(),
  code: text("code").notNull().unique(),
  referredName: text("referred_name"),
  referredEmail: text("referred_email"),
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
