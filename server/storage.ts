import { db } from "./db";
import { 
  users, playerProfiles, sessions, sessionSignups, matches, announcements, memberships,
  type User, type InsertUser, type PlayerProfile, type InsertPlayerProfile,
  type Session, type InsertSession, type SessionSignup,
  type Match, type Announcement, type InsertAnnouncement
} from "@shared/schema";
import { eq, and, desc, sql, inArray } from "drizzle-orm";

export interface IStorage {
  // Users & Profiles
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>; // Using email as username
  createUser(user: InsertUser): Promise<User>;
  getPlayerProfile(userId: number): Promise<(PlayerProfile & { user: User }) | undefined>;
  createPlayerProfile(profile: InsertPlayerProfile & { userId: number }): Promise<PlayerProfile>;
  getAllUsers(): Promise<(User & { playerProfile: PlayerProfile | null })[]>;
  getAllPlayerProfiles(): Promise<(PlayerProfile & { user: User })[]>;

  // Sessions
  getSessions(from?: Date, to?: Date): Promise<(Session & { signupCount: number })[]>;
  getSession(id: number): Promise<Session | undefined>;
  createSession(session: InsertSession & { createdBy: number }): Promise<Session>;
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
  })[]>;
  createMatch(match: any): Promise<Match>; // Simplified type for bulk insert usually
  updateMatch(id: number, updates: Partial<Match>): Promise<Match>;

  // Announcements
  getAnnouncements(): Promise<(Announcement & { author: User })[]>;
  createAnnouncement(announcement: InsertAnnouncement & { authorId: number }): Promise<Announcement>;
}

export class DatabaseStorage implements IStorage {
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

  async getPlayerProfile(userId: number): Promise<(PlayerProfile & { user: User }) | undefined> {
    const result = await db.select()
      .from(playerProfiles)
      .innerJoin(users, eq(playerProfiles.userId, users.id))
      .where(eq(playerProfiles.userId, userId));
    
    if (result.length === 0) return undefined;
    return { ...result[0].player_profiles, user: result[0].users };
  }

  async createPlayerProfile(profile: InsertPlayerProfile & { userId: number }): Promise<PlayerProfile> {
    const [newProfile] = await db.insert(playerProfiles).values(profile).returning();
    return newProfile;
  }

  async getAllUsers(): Promise<(User & { playerProfile: PlayerProfile | null })[]> {
    const result = await db.select().from(users).leftJoin(playerProfiles, eq(users.id, playerProfiles.userId));
    return result.map(r => ({ ...r.users, playerProfile: r.player_profiles }));
  }

  async getAllPlayerProfiles(): Promise<(PlayerProfile & { user: User })[]> {
    const result = await db.select()
      .from(playerProfiles)
      .innerJoin(users, eq(playerProfiles.userId, users.id));
    return result.map(r => ({ ...r.player_profiles, user: r.users }));
  }

  async getSessions(from?: Date, to?: Date): Promise<(Session & { signupCount: number })[]> {
    // Simple implementation for now, ignoring dates
    const allSessions = await db.select().from(sessions).orderBy(desc(sessions.date));
    
    // Get signup counts (could be optimized with a group by query)
    const sessionsWithCounts = await Promise.all(allSessions.map(async (s) => {
      const countResult = await db.select({ count: sql<number>`count(*)` })
        .from(sessionSignups)
        .where(eq(sessionSignups.sessionId, s.id));
      return { ...s, signupCount: Number(countResult[0]?.count || 0) };
    }));

    return sessionsWithCounts;
  }

  async getSession(id: number): Promise<Session | undefined> {
    const [session] = await db.select().from(sessions).where(eq(sessions.id, id));
    return session;
  }

  async createSession(session: InsertSession & { createdBy: number }): Promise<Session> {
    const [newSession] = await db.insert(sessions).values(session).returning();
    return newSession;
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

  async getSessionMatches(sessionId: number): Promise<(Match & { 
    teamAPlayer1: PlayerProfile & { user: User },
    teamAPlayer2: PlayerProfile & { user: User } | null,
    teamBPlayer1: PlayerProfile & { user: User },
    teamBPlayer2: PlayerProfile & { user: User } | null,
  })[]> {
    // This is a complex join, simplifying for this stage or doing multiple queries
    // Doing multiple queries is cleaner to write without complex alias handling in drizzle core
    const matchesList = await db.select().from(matches).where(eq(matches.sessionId, sessionId)).orderBy(desc(matches.createdAt));
    
    // Helper to fetch player details
    const getPlayer = async (id: number | null) => {
      if (!id) return null;
      return this.getPlayerProfileById(id);
    };

    const enrichedMatches = await Promise.all(matchesList.map(async (m) => {
      const p1 = await getPlayer(m.teamAPlayer1Id);
      const p2 = await getPlayer(m.teamAPlayer2Id);
      const p3 = await getPlayer(m.teamBPlayer1Id);
      const p4 = await getPlayer(m.teamBPlayer2Id);

      if (!p1 || !p3) throw new Error("Invalid match state: missing required players");

      return {
        ...m,
        teamAPlayer1: p1,
        teamAPlayer2: p2,
        teamBPlayer1: p3,
        teamBPlayer2: p4
      };
    }));

    return enrichedMatches;
  }

  // Helper for internal use
  private async getPlayerProfileById(id: number): Promise<(PlayerProfile & { user: User }) | undefined> {
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

  async updateMatch(id: number, updates: Partial<Match>): Promise<Match> {
    const [updated] = await db.update(matches).set(updates).where(eq(matches.id, id)).returning();
    return updated;
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
}

export const storage = new DatabaseStorage();
