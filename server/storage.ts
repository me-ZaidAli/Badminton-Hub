import { db, pool } from "./db";
import { 
  users, playerProfiles, sessions, sessionSignups, matches, announcements, memberships, clubs, venues,
  tournaments, tournamentCategories, tournamentTeams, tournamentMatches, tournamentStandings,
  coaches, coachSeekerMemberships, reviews, contactMessages, notifications, policyAcceptances,
  type User, type InsertUser, type PlayerProfile, type InsertPlayerProfile,
  type Session, type InsertSession, type SessionSignup,
  type Match, type Announcement, type InsertAnnouncement, type Club, type InsertClub,
  type Venue, type InsertVenue,
  type Tournament, type InsertTournament, type TournamentCategory, type InsertTournamentCategory,
  type TournamentTeam, type InsertTournamentTeam, type TournamentMatch, type InsertTournamentMatch,
  type TournamentStanding,
  type Coach, type InsertCoach, type CoachSeekerMembership, type InsertCoachSeekerMembership,
  type Review, type InsertReview, type ContactMessage, type InsertContactMessage,
  type Notification, type InsertNotification,
  type PolicyAcceptance, type InsertPolicyAcceptance
} from "@shared/schema";
import { eq, and, or, desc, asc, sql, inArray } from "drizzle-orm";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";

const PgSession = connectPgSimple(session);

export interface IStorage {
  // Clubs
  getClubs(): Promise<Club[]>;
  getAllClubsForAdmin(): Promise<Club[]>; // All clubs including inactive for super admin
  getClub(id: number): Promise<Club | undefined>;
  getClubBySlug(slug: string): Promise<Club | undefined>;
  createClub(club: InsertClub): Promise<Club>;
  updateClub(id: number, updates: Partial<Club>): Promise<Club>;
  updateClubStatus(id: number, status: string): Promise<Club>;
  deleteClub(id: number): Promise<void>;
  getClubPlayersWithDetails(clubId: number): Promise<any[]>;
  getUserPlayerProfiles(userId: number): Promise<(PlayerProfile & { club: Club })[]>;
  
  // Users & Profiles
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>; // Using email as username
  createUser(user: InsertUser): Promise<User>;
  getPlayerProfile(userId: number, clubId?: number): Promise<(PlayerProfile & { user: User }) | undefined>;
  getPlayerProfileById(id: number): Promise<(PlayerProfile & { user: User }) | undefined>;
  getPlayerProfilesByUser(userId: number): Promise<(PlayerProfile & { club: Club })[]>;
  createPlayerProfile(profile: InsertPlayerProfile): Promise<PlayerProfile>;
  getAllUsers(): Promise<(User & { playerProfile: PlayerProfile | null })[]>;
  getUsersByRole(role: string): Promise<User[]>;
  getAllPlayerProfiles(): Promise<(PlayerProfile & { user: User })[]>;
  getClubLeaderboard(clubId: number): Promise<(PlayerProfile & { user: User })[]>;
  getSignupsByPlayerId(playerId: number): Promise<(SessionSignup & { session: Session })[]>;

  // Venues
  getVenues(clubId: number): Promise<Venue[]>;
  getVenue(id: number): Promise<Venue | undefined>;
  createVenue(venue: InsertVenue): Promise<Venue>;
  updateVenue(id: number, updates: Partial<Venue>): Promise<Venue>;
  deleteVenue(id: number): Promise<void>;

  // Sessions
  getSessions(from?: Date, to?: Date): Promise<(Session & { signupCount: number; venue?: Venue })[]>;
  getSession(id: number): Promise<(Session & { venue?: Venue }) | undefined>;
  createSession(session: InsertSession & { createdBy: number }): Promise<Session>;
  updateSession(id: number, updates: Partial<Session>): Promise<Session>;
  deleteSession(id: number): Promise<void>;
  deleteSessions(ids: number[]): Promise<void>;
  getSessionSignups(sessionId: number): Promise<(SessionSignup & { player: PlayerProfile & { user: User } })[]>;
  createSessionSignup(sessionId: number, playerId: number, fee: number): Promise<SessionSignup>;
  deleteSessionSignup(sessionId: number, playerId: number): Promise<void>;
  updateSignupStatus(signupId: number, status: { paymentStatus?: "PAID" | "UNPAID", attendanceStatus?: "ATTENDED" | "NOT_ATTENDED" }): Promise<SessionSignup>;

  // Matches
  getSessionMatches(sessionId: number): Promise<(Match & { 
    teamAPlayer1: PlayerProfile & { user: User },
    teamAPlayer2: PlayerProfile & { user: User } | null,
    teamBPlayer1: PlayerProfile & { user: User },
    teamBPlayer2: PlayerProfile & { user: User } | null,
    scoreEnteredByUser?: { id: number; fullName: string } | null,
    scoreUpdatedByUser?: { id: number; fullName: string } | null,
  })[]>;
  getMatch(id: number): Promise<Match | undefined>;
  createMatch(match: any): Promise<Match>;
  updateMatch(id: number, updates: Partial<Match>): Promise<Match>;
  deleteMatch(id: number): Promise<void>;
  isUserSignedUpToSession(userId: number, sessionId: number): Promise<boolean>;

  // Announcements
  getAnnouncements(): Promise<(Announcement & { author: User })[]>;
  createAnnouncement(announcement: InsertAnnouncement & { authorId: number }): Promise<Announcement>;

  // Admin
  getAllSignups(): Promise<(SessionSignup & { player: PlayerProfile & { user: User }, session: Session })[]>;
  
  // Player Management
  updateUser(id: number, updates: { fullName?: string; email?: string; role?: string; accountStatus?: string }): Promise<User>;
  updatePlayerProfile(id: number, updates: { gender?: string; category?: string; rankingPoints?: number; playerStatus?: string }): Promise<PlayerProfile>;
  updatePlayerProfileWithFullName(profileId: number, updates: { membershipStatus?: string; clubRole?: string; category?: string; gender?: string }, fullName?: string): Promise<PlayerProfile>;
  deletePlayerProfile(id: number): Promise<void>;
  createUserWithProfile(userData: InsertUser, profileData: { gender?: string; category?: string; clubId?: number }): Promise<{ user: User; profile: PlayerProfile }>;
  getPendingUsers(): Promise<(User & { playerProfile: PlayerProfile | null })[]>;
  getPlayerMatchHistory(playerProfileId: number): Promise<Match[]>;
  getDynamicClubLeaderboard(clubId: number): Promise<{
    id: number;
    fullName: string;
    gender: string | null;
    category: string | null;
    matchesPlayed: number;
    matchesWon: number;
    matchesLost: number;
    winPercentage: number;
  }[]>;
  getDynamicSessionLeaderboard(sessionId: number): Promise<{
    id: number;
    fullName: string;
    gender: string | null;
    category: string | null;
    matchesPlayed: number;
    matchesWon: number;
    matchesLost: number;
    winPercentage: number;
  }[]>;
  getFilteredLeaderboard(filters: {
    clubId?: number;
    category?: string;
    gender?: string;
    matchType?: string;
    dateFrom?: Date;
    dateTo?: Date;
  }): Promise<{
    id: number;
    fullName: string;
    gender: string | null;
    category: string | null;
    clubId: number;
    clubName: string;
    matchesPlayed: number;
    matchesWon: number;
    matchesLost: number;
    winPercentage: number;
    isJunior: boolean;
  }[]>;
  getDetailedPlayerStats(profileId: number, filters?: {
    dateFrom?: Date;
    dateTo?: Date;
    matchType?: string;
  }): Promise<{
    id: number;
    fullName: string;
    category: string | null;
    gender: string | null;
    clubId: number;
    clubName: string;
    matchesPlayed: number;
    matchesWon: number;
    matchesLost: number;
    winRatio: number;
    recentForm: boolean[];
    isJunior: boolean;
    matchHistory: {
      id: number;
      sessionId: number;
      sessionTitle: string;
      scoreA: number | null;
      scoreB: number | null;
      isTeamA: boolean;
      won: boolean;
      completedAt: string | null;
      opponent1: string;
      opponent2: string | null;
      partner: string | null;
      playersPerSide: number;
    }[];
  } | null>;

  // Tournaments
  getTournaments(clubId?: number): Promise<Tournament[]>;
  getTournament(id: number): Promise<Tournament | undefined>;
  createTournament(tournament: InsertTournament & { createdBy: number }): Promise<Tournament>;
  updateTournament(id: number, updates: Partial<Tournament>): Promise<Tournament>;
  deleteTournament(id: number): Promise<void>;

  // Tournament Categories
  getTournamentCategories(tournamentId: number): Promise<TournamentCategory[]>;
  getTournamentCategory(id: number): Promise<TournamentCategory | undefined>;
  createTournamentCategory(category: InsertTournamentCategory): Promise<TournamentCategory>;
  updateTournamentCategory(id: number, updates: Partial<TournamentCategory>): Promise<TournamentCategory>;
  deleteTournamentCategory(id: number): Promise<void>;

  // Tournament Teams
  getTournamentTeams(categoryId: number): Promise<(TournamentTeam & { player1: PlayerProfile & { user: User }; player2?: PlayerProfile & { user: User } | null })[]>;
  getTournamentTeam(id: number): Promise<TournamentTeam | undefined>;
  createTournamentTeam(team: InsertTournamentTeam): Promise<TournamentTeam>;
  deleteTournamentTeam(id: number): Promise<void>;
  updateTournamentTeam(id: number, updates: Partial<TournamentTeam>): Promise<TournamentTeam>;

  // Tournament Matches
  getTournamentMatches(categoryId: number): Promise<TournamentMatch[]>;
  getTournamentMatch(id: number): Promise<TournamentMatch | undefined>;
  createTournamentMatch(match: any): Promise<TournamentMatch>;
  updateTournamentMatch(id: number, updates: Partial<TournamentMatch>): Promise<TournamentMatch>;
  deleteTournamentMatchesByCategory(categoryId: number): Promise<void>;

  // Tournament Standings
  getTournamentStandings(categoryId: number): Promise<TournamentStanding[]>;
  upsertTournamentStanding(standing: Omit<TournamentStanding, "id">): Promise<TournamentStanding>;
  deleteTournamentStandingsByCategory(categoryId: number): Promise<void>;

  // Coaches
  getCoaches(): Promise<Coach[]>;
  getCoach(id: number): Promise<Coach | undefined>;
  getCoachByUserId(userId: number): Promise<Coach | undefined>;
  createCoach(coach: InsertCoach): Promise<Coach>;
  updateCoach(id: number, updates: Partial<Coach>): Promise<Coach>;
  deleteCoach(id: number): Promise<void>;

  // Coach Seeker Memberships
  getCoachSeekerMembership(userId: number): Promise<CoachSeekerMembership | undefined>;
  getAllCoachSeekerMemberships(): Promise<(CoachSeekerMembership & { user: User })[]>;
  createCoachSeekerMembership(membership: InsertCoachSeekerMembership): Promise<CoachSeekerMembership>;
  updateCoachSeekerMembership(id: number, updates: Partial<CoachSeekerMembership>): Promise<CoachSeekerMembership>;

  // Reviews
  getReviewsByTarget(targetType: string, targetId: number): Promise<(Review & { user: User })[]>;
  getUserReview(userId: number, targetType: string, targetId: number): Promise<Review | undefined>;
  createReview(review: InsertReview): Promise<Review>;
  updateReview(id: number, updates: Partial<Review>): Promise<Review>;
  deleteReview(id: number): Promise<void>;
  getAverageRating(targetType: string, targetId: number): Promise<{ avg: number; count: number }>;

  // Contact Messages
  getContactMessages(forUserId?: number): Promise<(ContactMessage & { sender?: User; club?: Club })[]>;
  getContactMessage(id: number): Promise<ContactMessage | undefined>;
  createContactMessage(message: InsertContactMessage): Promise<ContactMessage>;
  updateContactMessageStatus(id: number, status: string): Promise<ContactMessage>;

  // Notifications
  getNotifications(userId: number): Promise<Notification[]>;
  getUnreadNotificationCount(userId: number): Promise<number>;
  createNotification(notification: InsertNotification): Promise<Notification>;
  markNotificationRead(id: number): Promise<Notification>;
  markAllNotificationsRead(userId: number): Promise<void>;

  // Policy Acceptances
  createPolicyAcceptance(acceptance: InsertPolicyAcceptance): Promise<PolicyAcceptance>;
  getPolicyAcceptances(userId: number): Promise<PolicyAcceptance[]>;
}

export class DatabaseStorage implements IStorage {
  sessionStore = new PgSession({
    pool: pool,
    tableName: "user_sessions",
    createTableIfMissing: true,
  });

  // Club methods
  async getClubs(): Promise<Club[]> {
    return db.select().from(clubs).where(eq(clubs.isActive, true));
  }

  async getClub(id: number): Promise<Club | undefined> {
    const [club] = await db.select().from(clubs).where(eq(clubs.id, id));
    return club;
  }

  async getClubBySlug(slug: string): Promise<Club | undefined> {
    const [club] = await db.select().from(clubs).where(eq(clubs.slug, slug));
    return club;
  }

  async createClub(club: InsertClub): Promise<Club> {
    const [newClub] = await db.insert(clubs).values(club).returning();
    return newClub;
  }

  async getAllClubsForAdmin(): Promise<Club[]> {
    return db.select().from(clubs).orderBy(desc(clubs.createdAt));
  }

  async updateClubStatus(id: number, status: string): Promise<Club> {
    const [updated] = await db.update(clubs)
      .set({ status: status as any })
      .where(eq(clubs.id, id))
      .returning();
    return updated;
  }

  async updateClub(id: number, updates: Partial<Club>): Promise<Club> {
    const [updated] = await db.update(clubs)
      .set(updates as any)
      .where(eq(clubs.id, id))
      .returning();
    return updated;
  }

  async getClubPlayersWithDetails(clubId: number): Promise<any[]> {
    const result = await db
      .select({
        profile: playerProfiles,
        user: users
      })
      .from(playerProfiles)
      .innerJoin(users, eq(playerProfiles.userId, users.id))
      .where(eq(playerProfiles.clubId, clubId));
    
    return result.map(r => ({
      ...r.profile,
      user: r.user
    }));
  }

  async deleteClub(id: number): Promise<void> {
    // Soft delete by setting isActive to false
    await db.update(clubs).set({ isActive: false }).where(eq(clubs.id, id));
  }

  async getUserPlayerProfiles(userId: number): Promise<(PlayerProfile & { club: Club })[]> {
    const result = await db
      .select({
        ...playerProfiles,
        club: clubs
      })
      .from(playerProfiles)
      .innerJoin(clubs, eq(playerProfiles.clubId, clubs.id))
      .where(eq(playerProfiles.userId, userId));
    
    return result.map(r => ({
      id: r.id,
      userId: r.userId,
      clubId: r.clubId,
      clubRole: r.clubRole,
      membershipStatus: r.membershipStatus,
      gender: r.gender,
      category: r.category,
      rankingPoints: r.rankingPoints,
      matchesPlayed: r.matchesPlayed,
      matchesWon: r.matchesWon,
      membershipId: r.membershipId,
      club: r.club
    }));
  }

  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async getPlayerProfile(userId: number, clubId?: number): Promise<(PlayerProfile & { user: User }) | undefined> {
    const conditions = clubId 
      ? and(eq(playerProfiles.userId, userId), eq(playerProfiles.clubId, clubId))
      : eq(playerProfiles.userId, userId);
    
    const result = await db.select()
      .from(playerProfiles)
      .innerJoin(users, eq(playerProfiles.userId, users.id))
      .where(conditions);
    
    if (result.length === 0) return undefined;
    return { ...result[0].player_profiles, user: result[0].users };
  }

  async getPlayerProfilesByUser(userId: number): Promise<(PlayerProfile & { club: Club })[]> {
    const result = await db.select()
      .from(playerProfiles)
      .innerJoin(clubs, eq(playerProfiles.clubId, clubs.id))
      .where(eq(playerProfiles.userId, userId));
    return result.map(r => ({ ...r.player_profiles, club: r.clubs }));
  }

  async createPlayerProfile(profile: InsertPlayerProfile): Promise<PlayerProfile> {
    const [newProfile] = await db.insert(playerProfiles).values(profile).returning();
    return newProfile;
  }

  async getAllUsers(): Promise<(User & { playerProfile: PlayerProfile | null })[]> {
    const result = await db.select().from(users).leftJoin(playerProfiles, eq(users.id, playerProfiles.userId));
    return result.map(r => ({ ...r.users, playerProfile: r.player_profiles }));
  }

  async getUsersByRole(role: string): Promise<User[]> {
    return db.select().from(users).where(eq(users.role, role as any));
  }

  async getAllPlayerProfiles(): Promise<(PlayerProfile & { user: User })[]> {
    const result = await db.select()
      .from(playerProfiles)
      .innerJoin(users, eq(playerProfiles.userId, users.id));
    return result.map(r => ({ ...r.player_profiles, user: r.users }));
  }

  async getClubLeaderboard(clubId: number): Promise<(PlayerProfile & { user: User })[]> {
    const result = await db.select()
      .from(playerProfiles)
      .innerJoin(users, eq(playerProfiles.userId, users.id))
      .where(eq(playerProfiles.clubId, clubId))
      .orderBy(desc(playerProfiles.rankingPoints));
    return result.map(r => ({ ...r.player_profiles, user: r.users }));
  }

  async getClubMembers(clubId: number): Promise<(PlayerProfile & { user: User })[]> {
    const result = await db.select()
      .from(playerProfiles)
      .innerJoin(users, eq(playerProfiles.userId, users.id))
      .where(eq(playerProfiles.clubId, clubId));
    return result.map(r => ({ ...r.player_profiles, user: r.users }));
  }

  async updatePlayerProfileWithFullName(profileId: number, updates: { membershipStatus?: string; clubRole?: string; category?: string; gender?: string }, fullName?: string): Promise<PlayerProfile> {
    const cleanUpdates = Object.fromEntries(Object.entries(updates).filter(([_, v]) => v !== undefined));
    const [updated] = await db.update(playerProfiles).set(cleanUpdates as any).where(eq(playerProfiles.id, profileId)).returning();
    
    // If fullName is provided, update the associated user as well
    if (fullName && updated.userId) {
      await db.update(users).set({ fullName }).where(eq(users.id, updated.userId));
    }
    
    return updated;
  }

  async deletePlayerProfiles(profileIds: number[]): Promise<void> {
    if (profileIds.length === 0) return;
    await db.delete(playerProfiles).where(inArray(playerProfiles.id, profileIds));
  }

  async getSessions(from?: Date, to?: Date): Promise<(Session & { signupCount: number; venue?: Venue })[]> {
    // Simple implementation for now, ignoring dates
    const allSessions = await db.select().from(sessions).orderBy(desc(sessions.date));
    
    // Get signup counts and venue data
    const sessionsWithData = await Promise.all(allSessions.map(async (s) => {
      const countResult = await db.select({ count: sql<number>`count(*)` })
        .from(sessionSignups)
        .where(eq(sessionSignups.sessionId, s.id));
      
      let venue: Venue | undefined;
      if (s.venueId) {
        const [v] = await db.select().from(venues).where(eq(venues.id, s.venueId));
        venue = v;
      }
      
      return { ...s, signupCount: Number(countResult[0]?.count || 0), venue };
    }));

    return sessionsWithData;
  }

  async getSessionsByClub(clubId: number): Promise<(Session & { signupCount: number; venue?: Venue })[]> {
    const clubSessions = await db.select().from(sessions)
      .where(eq(sessions.clubId, clubId))
      .orderBy(desc(sessions.date));
    
    const sessionsWithData = await Promise.all(clubSessions.map(async (s) => {
      const countResult = await db.select({ count: sql<number>`count(*)` })
        .from(sessionSignups)
        .where(eq(sessionSignups.sessionId, s.id));
      
      let venue: Venue | undefined;
      if (s.venueId) {
        const [v] = await db.select().from(venues).where(eq(venues.id, s.venueId));
        venue = v;
      }
      
      return { ...s, signupCount: Number(countResult[0]?.count || 0), venue };
    }));

    return sessionsWithData;
  }

  async getSession(id: number): Promise<(Session & { venue?: Venue }) | undefined> {
    const [session] = await db.select().from(sessions).where(eq(sessions.id, id));
    if (!session) return undefined;
    
    let venue: Venue | undefined;
    if (session.venueId) {
      const [v] = await db.select().from(venues).where(eq(venues.id, session.venueId));
      venue = v;
    }
    
    return { ...session, venue };
  }

  async createSession(session: InsertSession & { createdBy: number }): Promise<Session> {
    const [newSession] = await db.insert(sessions).values(session).returning();
    return newSession;
  }

  async updateSession(id: number, updates: Partial<Session>): Promise<Session> {
    const [updated] = await db.update(sessions).set(updates).where(eq(sessions.id, id)).returning();
    return updated;
  }

  async deleteSession(id: number): Promise<void> {
    // Delete related signups and matches first
    await db.delete(sessionSignups).where(eq(sessionSignups.sessionId, id));
    await db.delete(matches).where(eq(matches.sessionId, id));
    await db.delete(sessions).where(eq(sessions.id, id));
  }

  async deleteSessions(ids: number[]): Promise<void> {
    if (ids.length === 0) return;
    await db.delete(sessionSignups).where(inArray(sessionSignups.sessionId, ids));
    await db.delete(matches).where(inArray(matches.sessionId, ids));
    await db.delete(sessions).where(inArray(sessions.id, ids));
  }

  // Venue CRUD
  async getVenues(clubId: number): Promise<Venue[]> {
    return db.select().from(venues).where(eq(venues.clubId, clubId)).orderBy(desc(venues.createdAt));
  }

  async getVenue(id: number): Promise<Venue | undefined> {
    const [venue] = await db.select().from(venues).where(eq(venues.id, id));
    return venue;
  }

  async createVenue(venue: InsertVenue): Promise<Venue> {
    const [newVenue] = await db.insert(venues).values(venue).returning();
    return newVenue;
  }

  async updateVenue(id: number, updates: Partial<Venue>): Promise<Venue> {
    const [updated] = await db.update(venues).set(updates).where(eq(venues.id, id)).returning();
    return updated;
  }

  async deleteVenue(id: number): Promise<void> {
    // First, unlink any sessions using this venue
    await db.update(sessions).set({ venueId: null }).where(eq(sessions.venueId, id));
    await db.delete(venues).where(eq(venues.id, id));
  }

  async getSessionSignups(sessionId: number): Promise<(SessionSignup & { player: PlayerProfile & { user: User } })[]> {
    const result = await db.select()
      .from(sessionSignups)
      .innerJoin(playerProfiles, eq(sessionSignups.playerId, playerProfiles.id))
      .innerJoin(users, eq(playerProfiles.userId, users.id))
      .where(eq(sessionSignups.sessionId, sessionId));
    
    return result.map(r => ({
      ...r.session_signups,
      player: { ...r.player_profiles, user: r.users }
    }));
  }

  async createSessionSignup(sessionId: number, playerId: number, fee: number): Promise<SessionSignup> {
    const [signup] = await db.insert(sessionSignups).values({
      sessionId,
      playerId,
      fee,
      paymentStatus: "UNPAID",
      attendanceStatus: "NOT_ATTENDED"
    }).returning();
    return signup;
  }

  async deleteSessionSignup(sessionId: number, playerId: number): Promise<void> {
    await db.delete(sessionSignups)
      .where(and(eq(sessionSignups.sessionId, sessionId), eq(sessionSignups.playerId, playerId)));
  }

  async updateSignupStatus(signupId: number, status: { paymentStatus?: "PAID" | "UNPAID", attendanceStatus?: "ATTENDED" | "NOT_ATTENDED" }): Promise<SessionSignup> {
    const [updated] = await db.update(sessionSignups)
      .set(status)
      .where(eq(sessionSignups.id, signupId))
      .returning();
    return updated;
  }

  async getSignupsByPlayerId(playerId: number): Promise<(SessionSignup & { session: Session })[]> {
    const signupsList = await db.select()
      .from(sessionSignups)
      .innerJoin(sessions, eq(sessionSignups.sessionId, sessions.id))
      .where(eq(sessionSignups.playerId, playerId))
      .orderBy(desc(sessions.date));
    
    return signupsList.map(row => ({
      ...row.session_signups,
      session: row.sessions
    }));
  }

  async getSessionMatches(sessionId: number): Promise<(Match & { 
    teamAPlayer1: PlayerProfile & { user: User },
    teamAPlayer2: PlayerProfile & { user: User } | null,
    teamBPlayer1: PlayerProfile & { user: User },
    teamBPlayer2: PlayerProfile & { user: User } | null,
    scoreEnteredByUser?: { id: number; fullName: string } | null,
    scoreUpdatedByUser?: { id: number; fullName: string } | null,
  })[]> {
    const matchesList = await db.select().from(matches).where(eq(matches.sessionId, sessionId)).orderBy(desc(matches.createdAt));
    
    const getPlayer = async (id: number | null) => {
      if (!id) return null;
      return this.getPlayerProfileById(id);
    };

    const getUser = async (id: number | null | undefined) => {
      if (!id) return null;
      const [user] = await db.select({ id: users.id, fullName: users.fullName }).from(users).where(eq(users.id, id));
      return user || null;
    };

    const enrichedMatches = await Promise.all(matchesList.map(async (m) => {
      const p1 = await getPlayer(m.teamAPlayer1Id);
      const p2 = await getPlayer(m.teamAPlayer2Id);
      const p3 = await getPlayer(m.teamBPlayer1Id);
      const p4 = await getPlayer(m.teamBPlayer2Id);
      const scoreEnteredByUser = await getUser(m.scoreEnteredByUserId);
      const scoreUpdatedByUser = await getUser(m.scoreUpdatedByUserId);

      if (!p1 || !p3) throw new Error("Invalid match state: missing required players");

      return {
        ...m,
        teamAPlayer1: p1,
        teamAPlayer2: p2,
        teamBPlayer1: p3,
        teamBPlayer2: p4,
        scoreEnteredByUser,
        scoreUpdatedByUser,
      };
    }));

    return enrichedMatches;
  }

  // Helper for internal use
  async getPlayerProfileById(id: number): Promise<(PlayerProfile & { user: User }) | undefined> {
    const result = await db.select()
      .from(playerProfiles)
      .innerJoin(users, eq(playerProfiles.userId, users.id))
      .where(eq(playerProfiles.id, id));
    if (result.length === 0) return undefined;
    return { ...result[0].player_profiles, user: result[0].users };
  }

  async createMatch(match: any): Promise<Match> {
    const [newMatch] = await db.insert(matches).values(match).returning();
    return newMatch;
  }

  async getMatch(id: number): Promise<Match | undefined> {
    const [match] = await db.select().from(matches).where(eq(matches.id, id));
    return match;
  }

  async updateMatch(id: number, updates: Partial<Match>): Promise<Match> {
    const [updated] = await db.update(matches).set(updates).where(eq(matches.id, id)).returning();
    return updated;
  }

  async deleteMatch(id: number): Promise<void> {
    await db.delete(matches).where(eq(matches.id, id));
  }

  async isUserSignedUpToSession(userId: number, sessionId: number): Promise<boolean> {
    const profile = await db.select().from(playerProfiles).where(eq(playerProfiles.userId, userId));
    if (profile.length === 0) return false;
    const signup = await db.select().from(sessionSignups)
      .where(and(eq(sessionSignups.sessionId, sessionId), eq(sessionSignups.playerId, profile[0].id)));
    return signup.length > 0;
  }

  async getAnnouncements(): Promise<(Announcement & { author: User })[]> {
    const result = await db.select()
      .from(announcements)
      .innerJoin(users, eq(announcements.authorId, users.id))
      .orderBy(desc(announcements.createdAt));
    return result.map(r => ({ ...r.announcements, author: r.users }));
  }

  async createAnnouncement(announcement: InsertAnnouncement & { authorId: number }): Promise<Announcement> {
    const [newAnnouncement] = await db.insert(announcements).values(announcement).returning();
    return newAnnouncement;
  }

  async getAllSignups(): Promise<(SessionSignup & { player: PlayerProfile & { user: User }, session: Session })[]> {
    const result = await db.select()
      .from(sessionSignups)
      .innerJoin(playerProfiles, eq(sessionSignups.playerId, playerProfiles.id))
      .innerJoin(users, eq(playerProfiles.userId, users.id))
      .innerJoin(sessions, eq(sessionSignups.sessionId, sessions.id))
      .orderBy(desc(sessionSignups.signupTime));
    
    return result.map(r => ({
      ...r.session_signups,
      player: { ...r.player_profiles, user: r.users },
      session: r.sessions
    }));
  }

  async updateUser(id: number, updates: { fullName?: string; email?: string; role?: string }): Promise<User> {
    const [updated] = await db.update(users).set(updates).where(eq(users.id, id)).returning();
    return updated;
  }

  async updatePlayerProfile(id: number, updates: { gender?: string; category?: string; rankingPoints?: number; playerStatus?: string }): Promise<PlayerProfile> {
    const [updated] = await db.update(playerProfiles).set(updates as any).where(eq(playerProfiles.id, id)).returning();
    return updated;
  }

  async deletePlayerProfile(id: number): Promise<void> {
    // First delete related session signups
    await db.delete(sessionSignups).where(eq(sessionSignups.playerId, id));
    // Then delete the player profile
    await db.delete(playerProfiles).where(eq(playerProfiles.id, id));
  }

  async createUserWithProfile(userData: InsertUser, profileData: { gender?: string; category?: string; clubId?: number }): Promise<{ user: User; profile: PlayerProfile }> {
    const [user] = await db.insert(users).values(userData).returning();
    // Default to club 1 if not specified
    const [profile] = await db.insert(playerProfiles).values({
      userId: user.id,
      clubId: profileData.clubId || 1,
      gender: profileData.gender as any,
      category: profileData.category as any,
    }).returning();
    return { user, profile };
  }

  async getPendingUsers(): Promise<(User & { playerProfile: PlayerProfile | null })[]> {
    const result = await db.select()
      .from(users)
      .leftJoin(playerProfiles, eq(users.id, playerProfiles.userId))
      .where(eq(users.accountStatus, "PENDING"));
    return result.map(r => ({ ...r.users, playerProfile: r.player_profiles }));
  }

  async getPlayerMatchHistory(playerProfileId: number): Promise<Match[]> {
    const result = await db.select()
      .from(matches)
      .where(
        and(
          eq(matches.isCompleted, true),
          or(
            eq(matches.teamAPlayer1Id, playerProfileId),
            eq(matches.teamAPlayer2Id, playerProfileId),
            eq(matches.teamBPlayer1Id, playerProfileId),
            eq(matches.teamBPlayer2Id, playerProfileId)
          )
        )
      )
      .orderBy(desc(matches.completedAt));
    return result;
  }

  private computeLeaderboardFromMatches(
    matchList: Match[],
    players: Map<number, { fullName: string; gender: string | null; category: string | null }>
  ) {
    const statsMap = new Map<number, { matchesPlayed: number; matchesWon: number }>();

    for (const match of matchList) {
      if (match.status !== "COMPLETED" || !match.isCompleted) continue;

      const teamAWon = (match.scoreA ?? 0) > (match.scoreB ?? 0);
      const playerIds = [
        match.teamAPlayer1Id,
        match.teamAPlayer2Id,
        match.teamBPlayer1Id,
        match.teamBPlayer2Id,
      ].filter((id): id is number => id !== null);

      for (const pid of playerIds) {
        if (!statsMap.has(pid)) {
          statsMap.set(pid, { matchesPlayed: 0, matchesWon: 0 });
        }
        const s = statsMap.get(pid)!;
        s.matchesPlayed++;
        const isTeamA = pid === match.teamAPlayer1Id || pid === match.teamAPlayer2Id;
        if ((isTeamA && teamAWon) || (!isTeamA && !teamAWon)) {
          s.matchesWon++;
        }
      }
    }

    const results: {
      id: number;
      fullName: string;
      gender: string | null;
      category: string | null;
      matchesPlayed: number;
      matchesWon: number;
      matchesLost: number;
      winPercentage: number;
    }[] = [];

    for (const [pid, stats] of statsMap) {
      const player = players.get(pid);
      if (!player) continue;
      results.push({
        id: pid,
        fullName: player.fullName,
        gender: player.gender,
        category: player.category,
        matchesPlayed: stats.matchesPlayed,
        matchesWon: stats.matchesWon,
        matchesLost: stats.matchesPlayed - stats.matchesWon,
        winPercentage: stats.matchesPlayed > 0
          ? Math.round((stats.matchesWon / stats.matchesPlayed) * 100)
          : 0,
      });
    }

    results.sort((a, b) => {
      if (b.matchesWon !== a.matchesWon) return b.matchesWon - a.matchesWon;
      if (b.winPercentage !== a.winPercentage) return b.winPercentage - a.winPercentage;
      return b.matchesPlayed - a.matchesPlayed;
    });

    return results;
  }

  async getDynamicClubLeaderboard(clubId: number) {
    const clubSessions = await db.select({ id: sessions.id })
      .from(sessions)
      .where(eq(sessions.clubId, clubId));

    if (clubSessions.length === 0) return [];

    const sessionIds = clubSessions.map(s => s.id);
    const completedMatches = await db.select()
      .from(matches)
      .where(
        and(
          inArray(matches.sessionId, sessionIds),
          eq(matches.isCompleted, true),
          eq(matches.status, "COMPLETED")
        )
      );

    if (completedMatches.length === 0) return [];

    const playerIds = new Set<number>();
    for (const m of completedMatches) {
      if (m.teamAPlayer1Id) playerIds.add(m.teamAPlayer1Id);
      if (m.teamAPlayer2Id) playerIds.add(m.teamAPlayer2Id);
      if (m.teamBPlayer1Id) playerIds.add(m.teamBPlayer1Id);
      if (m.teamBPlayer2Id) playerIds.add(m.teamBPlayer2Id);
    }

    const profileRows = await db.select()
      .from(playerProfiles)
      .innerJoin(users, eq(playerProfiles.userId, users.id))
      .where(inArray(playerProfiles.id, [...playerIds]));

    const playerMap = new Map<number, { fullName: string; gender: string | null; category: string | null }>();
    for (const r of profileRows) {
      playerMap.set(r.player_profiles.id, {
        fullName: r.users.fullName,
        gender: r.player_profiles.gender,
        category: r.player_profiles.category,
      });
    }

    return this.computeLeaderboardFromMatches(completedMatches, playerMap);
  }

  async getDynamicSessionLeaderboard(sessionId: number) {
    const completedMatches = await db.select()
      .from(matches)
      .where(
        and(
          eq(matches.sessionId, sessionId),
          eq(matches.isCompleted, true),
          eq(matches.status, "COMPLETED")
        )
      );

    if (completedMatches.length === 0) return [];

    const playerIds = new Set<number>();
    for (const m of completedMatches) {
      if (m.teamAPlayer1Id) playerIds.add(m.teamAPlayer1Id);
      if (m.teamAPlayer2Id) playerIds.add(m.teamAPlayer2Id);
      if (m.teamBPlayer1Id) playerIds.add(m.teamBPlayer1Id);
      if (m.teamBPlayer2Id) playerIds.add(m.teamBPlayer2Id);
    }

    const profileRows = await db.select()
      .from(playerProfiles)
      .innerJoin(users, eq(playerProfiles.userId, users.id))
      .where(inArray(playerProfiles.id, [...playerIds]));

    const playerMap = new Map<number, { fullName: string; gender: string | null; category: string | null }>();
    for (const r of profileRows) {
      playerMap.set(r.player_profiles.id, {
        fullName: r.users.fullName,
        gender: r.player_profiles.gender,
        category: r.player_profiles.category,
      });
    }

    return this.computeLeaderboardFromMatches(completedMatches, playerMap);
  }

  async getFilteredLeaderboard(filters: {
    clubId?: number;
    category?: string;
    gender?: string;
    matchType?: string;
    dateFrom?: Date;
    dateTo?: Date;
  }) {
    const conditions: any[] = [
      eq(matches.isCompleted, true),
      eq(matches.status, "COMPLETED")
    ];

    if (filters.dateFrom) {
      conditions.push(sql`${matches.completedAt} >= ${filters.dateFrom}`);
    }
    if (filters.dateTo) {
      conditions.push(sql`${matches.completedAt} <= ${filters.dateTo}`);
    }

    let sessionFilter: number[] | null = null;
    if (filters.clubId || filters.matchType) {
      const sessionConditions: any[] = [];
      if (filters.clubId) {
        sessionConditions.push(eq(sessions.clubId, filters.clubId));
      }
      if (filters.matchType === "SINGLES") {
        sessionConditions.push(eq(sessions.playersPerSide, 1));
      } else if (filters.matchType === "DOUBLES") {
        sessionConditions.push(eq(sessions.playersPerSide, 2));
        sessionConditions.push(sql`${sessions.matchGenderType} != 'MIXED'`);
      } else if (filters.matchType === "MIXED") {
        sessionConditions.push(eq(sessions.playersPerSide, 2));
        sessionConditions.push(eq(sessions.matchGenderType, "MIXED"));
      }

      const filteredSessions = await db.select({ id: sessions.id })
        .from(sessions)
        .where(and(...sessionConditions));

      if (filteredSessions.length === 0) return [];
      sessionFilter = filteredSessions.map(s => s.id);
    }

    if (sessionFilter) {
      conditions.push(inArray(matches.sessionId, sessionFilter));
    }

    const completedMatches = await db.select()
      .from(matches)
      .where(and(...conditions));

    if (completedMatches.length === 0) return [];

    const playerIds = new Set<number>();
    for (const m of completedMatches) {
      if (m.teamAPlayer1Id) playerIds.add(m.teamAPlayer1Id);
      if (m.teamAPlayer2Id) playerIds.add(m.teamAPlayer2Id);
      if (m.teamBPlayer1Id) playerIds.add(m.teamBPlayer1Id);
      if (m.teamBPlayer2Id) playerIds.add(m.teamBPlayer2Id);
    }

    const profileRows = await db.select()
      .from(playerProfiles)
      .innerJoin(users, eq(playerProfiles.userId, users.id))
      .innerJoin(clubs, eq(playerProfiles.clubId, clubs.id))
      .where(inArray(playerProfiles.id, [...playerIds]));

    const playerMap = new Map<number, {
      fullName: string;
      gender: string | null;
      category: string | null;
      clubId: number;
      clubName: string;
      isJunior: boolean;
    }>();

    for (const r of profileRows) {
      if (filters.category && r.player_profiles.category !== filters.category) continue;
      if (filters.gender === "JUNIOR") {
        if (!r.users.isJunior) continue;
      } else if (filters.gender && r.player_profiles.gender !== filters.gender) continue;

      playerMap.set(r.player_profiles.id, {
        fullName: r.users.fullName,
        gender: r.player_profiles.gender,
        category: r.player_profiles.category,
        clubId: r.player_profiles.clubId,
        clubName: r.clubs.name,
        isJunior: r.users.isJunior,
      });
    }

    const statsMap = new Map<number, { matchesPlayed: number; matchesWon: number }>();

    for (const match of completedMatches) {
      const teamAWon = (match.scoreA ?? 0) > (match.scoreB ?? 0);
      const pids = [
        match.teamAPlayer1Id,
        match.teamAPlayer2Id,
        match.teamBPlayer1Id,
        match.teamBPlayer2Id,
      ].filter((id): id is number => id !== null);

      for (const pid of pids) {
        if (!playerMap.has(pid)) continue;
        if (!statsMap.has(pid)) statsMap.set(pid, { matchesPlayed: 0, matchesWon: 0 });
        const s = statsMap.get(pid)!;
        s.matchesPlayed++;
        const isTeamA = pid === match.teamAPlayer1Id || pid === match.teamAPlayer2Id;
        if ((isTeamA && teamAWon) || (!isTeamA && !teamAWon)) s.matchesWon++;
      }
    }

    const results: any[] = [];
    for (const [pid, stats] of statsMap) {
      const player = playerMap.get(pid);
      if (!player) continue;
      results.push({
        id: pid,
        fullName: player.fullName,
        gender: player.gender,
        category: player.category,
        clubId: player.clubId,
        clubName: player.clubName,
        matchesPlayed: stats.matchesPlayed,
        matchesWon: stats.matchesWon,
        matchesLost: stats.matchesPlayed - stats.matchesWon,
        winPercentage: stats.matchesPlayed > 0
          ? Math.round((stats.matchesWon / stats.matchesPlayed) * 100)
          : 0,
        isJunior: player.isJunior,
      });
    }

    results.sort((a, b) => {
      if (b.matchesWon !== a.matchesWon) return b.matchesWon - a.matchesWon;
      if (b.winPercentage !== a.winPercentage) return b.winPercentage - a.winPercentage;
      return b.matchesPlayed - a.matchesPlayed;
    });

    return results;
  }

  async getDetailedPlayerStats(profileId: number, filters?: {
    dateFrom?: Date;
    dateTo?: Date;
    matchType?: string;
  }) {
    const profile = await this.getPlayerProfileById(profileId);
    if (!profile) return null;

    const club = await this.getClub(profile.clubId);

    const conditions: any[] = [
      eq(matches.isCompleted, true),
      or(
        eq(matches.teamAPlayer1Id, profileId),
        eq(matches.teamAPlayer2Id, profileId),
        eq(matches.teamBPlayer1Id, profileId),
        eq(matches.teamBPlayer2Id, profileId)
      )
    ];

    if (filters?.dateFrom) {
      conditions.push(sql`${matches.completedAt} >= ${filters.dateFrom}`);
    }
    if (filters?.dateTo) {
      conditions.push(sql`${matches.completedAt} <= ${filters.dateTo}`);
    }

    let sessionFilter: number[] | null = null;
    if (filters?.matchType) {
      const sessionConditions: any[] = [];
      if (filters.matchType === "SINGLES") {
        sessionConditions.push(eq(sessions.playersPerSide, 1));
      } else if (filters.matchType === "DOUBLES") {
        sessionConditions.push(eq(sessions.playersPerSide, 2));
        sessionConditions.push(sql`${sessions.matchGenderType} != 'MIXED'`);
      } else if (filters.matchType === "MIXED") {
        sessionConditions.push(eq(sessions.playersPerSide, 2));
        sessionConditions.push(eq(sessions.matchGenderType, "MIXED"));
      }
      if (sessionConditions.length > 0) {
        const filteredSessions = await db.select({ id: sessions.id })
          .from(sessions)
          .where(and(...sessionConditions));
        if (filteredSessions.length === 0) {
          return {
            id: profile.id,
            fullName: profile.user.fullName,
            category: profile.category,
            gender: profile.gender,
            clubId: profile.clubId,
            clubName: club?.name || "Unknown",
            matchesPlayed: 0,
            matchesWon: 0,
            matchesLost: 0,
            winRatio: 0,
            recentForm: [],
            isJunior: profile.user.isJunior,
            matchHistory: [],
          };
        }
        sessionFilter = filteredSessions.map(s => s.id);
      }
    }

    if (sessionFilter) {
      conditions.push(inArray(matches.sessionId, sessionFilter));
    }

    const matchList = await db.select()
      .from(matches)
      .innerJoin(sessions, eq(matches.sessionId, sessions.id))
      .where(and(...conditions))
      .orderBy(desc(matches.completedAt));

    const allPlayerIds = new Set<number>();
    for (const m of matchList) {
      if (m.matches.teamAPlayer1Id) allPlayerIds.add(m.matches.teamAPlayer1Id);
      if (m.matches.teamAPlayer2Id) allPlayerIds.add(m.matches.teamAPlayer2Id);
      if (m.matches.teamBPlayer1Id) allPlayerIds.add(m.matches.teamBPlayer1Id);
      if (m.matches.teamBPlayer2Id) allPlayerIds.add(m.matches.teamBPlayer2Id);
    }
    allPlayerIds.delete(profileId);

    const nameMap = new Map<number, string>();
    if (allPlayerIds.size > 0) {
      const otherProfiles = await db.select()
        .from(playerProfiles)
        .innerJoin(users, eq(playerProfiles.userId, users.id))
        .where(inArray(playerProfiles.id, [...allPlayerIds]));
      for (const r of otherProfiles) {
        nameMap.set(r.player_profiles.id, r.users.fullName);
      }
    }

    let matchesWon = 0;
    const matchHistory = matchList.map(row => {
      const m = row.matches;
      const s = row.sessions;
      const isTeamA = m.teamAPlayer1Id === profileId || m.teamAPlayer2Id === profileId;
      const won = isTeamA
        ? (m.scoreA ?? 0) > (m.scoreB ?? 0)
        : (m.scoreB ?? 0) > (m.scoreA ?? 0);
      if (won) matchesWon++;

      let opponent1 = "";
      let opponent2: string | null = null;
      let partner: string | null = null;

      if (isTeamA) {
        opponent1 = nameMap.get(m.teamBPlayer1Id) || "Unknown";
        opponent2 = m.teamBPlayer2Id ? nameMap.get(m.teamBPlayer2Id) || null : null;
        const partnerId = m.teamAPlayer1Id === profileId ? m.teamAPlayer2Id : m.teamAPlayer1Id;
        partner = partnerId ? nameMap.get(partnerId) || null : null;
      } else {
        opponent1 = nameMap.get(m.teamAPlayer1Id) || "Unknown";
        opponent2 = m.teamAPlayer2Id ? nameMap.get(m.teamAPlayer2Id) || null : null;
        const partnerId = m.teamBPlayer1Id === profileId ? m.teamBPlayer2Id : m.teamBPlayer1Id;
        partner = partnerId ? nameMap.get(partnerId) || null : null;
      }

      return {
        id: m.id,
        sessionId: s.id,
        sessionTitle: s.title,
        scoreA: m.scoreA,
        scoreB: m.scoreB,
        isTeamA,
        won,
        completedAt: m.completedAt?.toISOString() || null,
        opponent1,
        opponent2,
        partner,
        playersPerSide: s.playersPerSide,
      };
    });

    const matchesPlayed = matchList.length;
    const matchesLost = matchesPlayed - matchesWon;
    const winRatio = matchesPlayed > 0 ? Math.round((matchesWon / matchesPlayed) * 100) : 0;
    const recentForm = matchHistory.slice(0, 5).map(m => m.won);

    return {
      id: profile.id,
      fullName: profile.user.fullName,
      category: profile.category,
      gender: profile.gender,
      clubId: profile.clubId,
      clubName: club?.name || "Unknown",
      matchesPlayed,
      matchesWon,
      matchesLost,
      winRatio,
      recentForm,
      isJunior: profile.user.isJunior,
      matchHistory,
    };
  }

  // === TOURNAMENT METHODS ===
  async getTournaments(clubId?: number): Promise<Tournament[]> {
    if (clubId) {
      return db.select().from(tournaments).where(eq(tournaments.clubId, clubId)).orderBy(desc(tournaments.startDate));
    }
    return db.select().from(tournaments).orderBy(desc(tournaments.startDate));
  }

  async getTournament(id: number): Promise<Tournament | undefined> {
    const [result] = await db.select().from(tournaments).where(eq(tournaments.id, id));
    return result;
  }

  async createTournament(tournament: InsertTournament & { createdBy: number }): Promise<Tournament> {
    const [result] = await db.insert(tournaments).values(tournament).returning();
    return result;
  }

  async updateTournament(id: number, updates: Partial<Tournament>): Promise<Tournament> {
    const [result] = await db.update(tournaments).set(updates).where(eq(tournaments.id, id)).returning();
    return result;
  }

  async deleteTournament(id: number): Promise<void> {
    const cats = await db.select({ id: tournamentCategories.id }).from(tournamentCategories).where(eq(tournamentCategories.tournamentId, id));
    for (const cat of cats) {
      await this.deleteTournamentCategory(cat.id);
    }
    await db.delete(tournaments).where(eq(tournaments.id, id));
  }

  async getTournamentCategories(tournamentId: number): Promise<TournamentCategory[]> {
    return db.select().from(tournamentCategories).where(eq(tournamentCategories.tournamentId, tournamentId)).orderBy(asc(tournamentCategories.id));
  }

  async getTournamentCategory(id: number): Promise<TournamentCategory | undefined> {
    const [result] = await db.select().from(tournamentCategories).where(eq(tournamentCategories.id, id));
    return result;
  }

  async createTournamentCategory(category: InsertTournamentCategory): Promise<TournamentCategory> {
    const [result] = await db.insert(tournamentCategories).values(category).returning();
    return result;
  }

  async updateTournamentCategory(id: number, updates: Partial<TournamentCategory>): Promise<TournamentCategory> {
    const [result] = await db.update(tournamentCategories).set(updates).where(eq(tournamentCategories.id, id)).returning();
    return result;
  }

  async deleteTournamentCategory(id: number): Promise<void> {
    await db.delete(tournamentStandings).where(eq(tournamentStandings.categoryId, id));
    await db.delete(tournamentMatches).where(eq(tournamentMatches.categoryId, id));
    await db.delete(tournamentTeams).where(eq(tournamentTeams.categoryId, id));
    await db.delete(tournamentCategories).where(eq(tournamentCategories.id, id));
  }

  async getTournamentTeams(categoryId: number): Promise<(TournamentTeam & { player1: PlayerProfile & { user: User }; player2?: PlayerProfile & { user: User } | null })[]> {
    const teams = await db.select().from(tournamentTeams).where(eq(tournamentTeams.categoryId, categoryId)).orderBy(asc(tournamentTeams.seedNumber));
    const result: any[] = [];
    for (const team of teams) {
      const [p1] = await db.select().from(playerProfiles).where(eq(playerProfiles.id, team.player1Id));
      const [u1] = p1 ? await db.select().from(users).where(eq(users.id, p1.userId)) : [undefined];
      let player2 = null;
      if (team.player2Id) {
        const [p2] = await db.select().from(playerProfiles).where(eq(playerProfiles.id, team.player2Id));
        const [u2] = p2 ? await db.select().from(users).where(eq(users.id, p2.userId)) : [undefined];
        player2 = p2 ? { ...p2, user: u2 } : null;
      }
      result.push({ ...team, player1: { ...p1, user: u1 }, player2 });
    }
    return result;
  }

  async getTournamentTeam(id: number): Promise<TournamentTeam | undefined> {
    const [result] = await db.select().from(tournamentTeams).where(eq(tournamentTeams.id, id));
    return result;
  }

  async createTournamentTeam(team: InsertTournamentTeam): Promise<TournamentTeam> {
    const [result] = await db.insert(tournamentTeams).values(team).returning();
    return result;
  }

  async deleteTournamentTeam(id: number): Promise<void> {
    await db.delete(tournamentMatches).where(or(eq(tournamentMatches.teamAId, id), eq(tournamentMatches.teamBId, id)));
    await db.delete(tournamentStandings).where(eq(tournamentStandings.teamId, id));
    await db.delete(tournamentTeams).where(eq(tournamentTeams.id, id));
  }

  async updateTournamentTeam(id: number, updates: Partial<TournamentTeam>): Promise<TournamentTeam> {
    const [result] = await db.update(tournamentTeams).set(updates).where(eq(tournamentTeams.id, id)).returning();
    return result;
  }

  async getTournamentMatches(categoryId: number): Promise<TournamentMatch[]> {
    return db.select().from(tournamentMatches).where(eq(tournamentMatches.categoryId, categoryId)).orderBy(asc(tournamentMatches.round), asc(tournamentMatches.matchOrder));
  }

  async getTournamentMatch(id: number): Promise<TournamentMatch | undefined> {
    const [result] = await db.select().from(tournamentMatches).where(eq(tournamentMatches.id, id));
    return result;
  }

  async createTournamentMatch(match: any): Promise<TournamentMatch> {
    const [result] = await db.insert(tournamentMatches).values(match).returning();
    return result;
  }

  async updateTournamentMatch(id: number, updates: Partial<TournamentMatch>): Promise<TournamentMatch> {
    const [result] = await db.update(tournamentMatches).set(updates).where(eq(tournamentMatches.id, id)).returning();
    return result;
  }

  async deleteTournamentMatchesByCategory(categoryId: number): Promise<void> {
    await db.delete(tournamentMatches).where(eq(tournamentMatches.categoryId, categoryId));
  }

  async getTournamentStandings(categoryId: number): Promise<TournamentStanding[]> {
    return db.select().from(tournamentStandings).where(eq(tournamentStandings.categoryId, categoryId)).orderBy(desc(tournamentStandings.points), desc(sql`${tournamentStandings.gamesWon} - ${tournamentStandings.gamesLost}`));
  }

  async upsertTournamentStanding(standing: Omit<TournamentStanding, "id">): Promise<TournamentStanding> {
    const existing = await db.select().from(tournamentStandings).where(and(
      eq(tournamentStandings.categoryId, standing.categoryId),
      eq(tournamentStandings.teamId, standing.teamId)
    ));
    if (existing.length > 0) {
      const [result] = await db.update(tournamentStandings).set(standing).where(eq(tournamentStandings.id, existing[0].id)).returning();
      return result;
    }
    const [result] = await db.insert(tournamentStandings).values(standing).returning();
    return result;
  }

  async deleteTournamentStandingsByCategory(categoryId: number): Promise<void> {
    await db.delete(tournamentStandings).where(eq(tournamentStandings.categoryId, categoryId));
  }

  async getCoaches(): Promise<Coach[]> {
    return db.select().from(coaches).orderBy(desc(coaches.createdAt));
  }

  async getCoach(id: number): Promise<Coach | undefined> {
    const [coach] = await db.select().from(coaches).where(eq(coaches.id, id));
    return coach;
  }

  async getCoachByUserId(userId: number): Promise<Coach | undefined> {
    const [coach] = await db.select().from(coaches).where(eq(coaches.userId, userId));
    return coach;
  }

  async createCoach(coach: InsertCoach): Promise<Coach> {
    const [result] = await db.insert(coaches).values(coach).returning();
    return result;
  }

  async updateCoach(id: number, updates: Partial<Coach>): Promise<Coach> {
    const [result] = await db.update(coaches).set(updates).where(eq(coaches.id, id)).returning();
    return result;
  }

  async deleteCoach(id: number): Promise<void> {
    await db.delete(coaches).where(eq(coaches.id, id));
  }

  async getCoachSeekerMembership(userId: number): Promise<CoachSeekerMembership | undefined> {
    const [membership] = await db.select().from(coachSeekerMemberships).where(eq(coachSeekerMemberships.userId, userId));
    return membership;
  }

  async getAllCoachSeekerMemberships(): Promise<(CoachSeekerMembership & { user: User })[]> {
    const results = await db.select().from(coachSeekerMemberships)
      .innerJoin(users, eq(coachSeekerMemberships.userId, users.id))
      .orderBy(desc(coachSeekerMemberships.createdAt));
    return results.map(r => ({ ...r.coach_seeker_memberships, user: r.users }));
  }

  async createCoachSeekerMembership(membership: InsertCoachSeekerMembership): Promise<CoachSeekerMembership> {
    const [result] = await db.insert(coachSeekerMemberships).values(membership).returning();
    return result;
  }

  async updateCoachSeekerMembership(id: number, updates: Partial<CoachSeekerMembership>): Promise<CoachSeekerMembership> {
    const [result] = await db.update(coachSeekerMemberships).set(updates).where(eq(coachSeekerMemberships.id, id)).returning();
    return result;
  }

  // Reviews
  async getReviewsByTarget(targetType: string, targetId: number): Promise<(Review & { user: User })[]> {
    const result = await db.select().from(reviews)
      .innerJoin(users, eq(reviews.userId, users.id))
      .where(and(eq(reviews.targetType, targetType), eq(reviews.targetId, targetId)))
      .orderBy(desc(reviews.createdAt));
    return result.map(r => ({ ...r.reviews, user: r.users }));
  }

  async getUserReview(userId: number, targetType: string, targetId: number): Promise<Review | undefined> {
    const [result] = await db.select().from(reviews)
      .where(and(eq(reviews.userId, userId), eq(reviews.targetType, targetType), eq(reviews.targetId, targetId)));
    return result;
  }

  async createReview(review: InsertReview): Promise<Review> {
    const [result] = await db.insert(reviews).values(review).returning();
    return result;
  }

  async updateReview(id: number, updates: Partial<Review>): Promise<Review> {
    const [result] = await db.update(reviews).set(updates).where(eq(reviews.id, id)).returning();
    return result;
  }

  async deleteReview(id: number): Promise<void> {
    await db.delete(reviews).where(eq(reviews.id, id));
  }

  async getAverageRating(targetType: string, targetId: number): Promise<{ avg: number; count: number }> {
    const result = await db.select({
      avg: sql<number>`COALESCE(AVG(${reviews.rating}), 0)`,
      count: sql<number>`COUNT(*)::int`,
    }).from(reviews).where(and(eq(reviews.targetType, targetType), eq(reviews.targetId, targetId)));
    return { avg: Number(result[0]?.avg || 0), count: Number(result[0]?.count || 0) };
  }

  // Contact Messages
  async getContactMessages(forUserId?: number): Promise<(ContactMessage & { sender?: User; club?: Club })[]> {
    const result = await db.select().from(contactMessages)
      .leftJoin(users, eq(contactMessages.senderUserId, users.id))
      .leftJoin(clubs, eq(contactMessages.clubId, clubs.id))
      .orderBy(desc(contactMessages.createdAt));
    return result.map(r => ({ ...r.contact_messages, sender: r.users || undefined, club: r.clubs || undefined }));
  }

  async getContactMessage(id: number): Promise<ContactMessage | undefined> {
    const [result] = await db.select().from(contactMessages).where(eq(contactMessages.id, id));
    return result;
  }

  async createContactMessage(message: InsertContactMessage): Promise<ContactMessage> {
    const [result] = await db.insert(contactMessages).values(message).returning();
    return result;
  }

  async updateContactMessageStatus(id: number, status: string): Promise<ContactMessage> {
    const [result] = await db.update(contactMessages).set({ status }).where(eq(contactMessages.id, id)).returning();
    return result;
  }

  // Notifications
  async getNotifications(userId: number): Promise<Notification[]> {
    return db.select().from(notifications).where(eq(notifications.userId, userId)).orderBy(desc(notifications.createdAt)).limit(50);
  }

  async getUnreadNotificationCount(userId: number): Promise<number> {
    const result = await db.select({ count: sql<number>`COUNT(*)::int` }).from(notifications)
      .where(and(eq(notifications.userId, userId), sql`${notifications.readAt} IS NULL`));
    return Number(result[0]?.count || 0);
  }

  async createNotification(notification: InsertNotification): Promise<Notification> {
    const [result] = await db.insert(notifications).values(notification).returning();
    return result;
  }

  async markNotificationRead(id: number): Promise<Notification> {
    const [result] = await db.update(notifications).set({ readAt: new Date() }).where(eq(notifications.id, id)).returning();
    return result;
  }

  async markAllNotificationsRead(userId: number): Promise<void> {
    await db.update(notifications).set({ readAt: new Date() }).where(and(eq(notifications.userId, userId), sql`${notifications.readAt} IS NULL`));
  }

  async createPolicyAcceptance(acceptance: InsertPolicyAcceptance): Promise<PolicyAcceptance> {
    const [result] = await db.insert(policyAcceptances).values(acceptance).returning();
    return result;
  }

  async getPolicyAcceptances(userId: number): Promise<PolicyAcceptance[]> {
    return await db.select().from(policyAcceptances).where(eq(policyAcceptances.userId, userId)).orderBy(desc(policyAcceptances.acceptedAt));
  }
}

export const storage = new DatabaseStorage();
