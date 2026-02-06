import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import { db } from "./db";
import { users } from "@shared/schema";
import { eq } from "drizzle-orm";
import { api } from "@shared/routes";
import { z } from "zod";
import { matchModeEnum } from "@shared/schema";
import { scrypt, randomBytes } from "crypto";
import { promisify } from "util";
import { listCalendars, listUpcomingEvents } from "./google-calendar";
import { canPerform, isSuperAdmin, log_rbac } from "./rbac";

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function hasAdminAccess(userId: number, userRole: string, clubId?: number): Promise<boolean> {
  const result = await canPerform({ id: userId, role: userRole }, "MANAGE_CLUB", clubId);
  log_rbac("MANAGE_CLUB", userId, result, { clubId });
  return result;
}

async function canManageSessions(userId: number, userRole: string, clubId: number): Promise<boolean> {
  const result = await canPerform({ id: userId, role: userRole }, "MANAGE_SESSIONS", clubId);
  log_rbac("MANAGE_SESSIONS", userId, result, { clubId });
  return result;
}

async function hasClubMembership(userId: number, userRole: string, clubId: number): Promise<boolean> {
  const result = await canPerform({ id: userId, role: userRole }, "VIEW_CLUB", clubId);
  log_rbac("VIEW_CLUB", userId, result, { clubId });
  return result;
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Set up authentication first
  setupAuth(app);

  // === SEED DATA ===
  const existingUsers = await storage.getAllUsers();
  if (existingUsers.length === 0) {
    console.log("Seeding database...");
    const hashedPassword = await hashPassword("password123");
    const admin = await storage.createUser({
      fullName: "Club Admin",
      email: "admin@badminton.club",
      password: hashedPassword,
      role: "ADMIN",
      emailVerified: true,
      accountStatus: "APPROVED" as any
    });

    await storage.createPlayerProfile({
      userId: admin.id,
      clubId: 1, // Default club
      gender: "MALE",
      category: "A",
      membershipId: null
    });

    await storage.createSession({
      clubId: 1, // Default club
      title: "Friday Night Social",
      date: new Date(Date.now() + 86400000 * 5), // +5 days
      startTime: "19:00",
      durationMinutes: 120,
      maxPlayers: 24,
      courtsAvailable: 4,
      allowedCategories: ["A", "B", "C", "D"],
      matchMode: "SOCIAL",
      isPrivate: false,
      createdBy: admin.id
    });
    
    console.log("Database seeded!");
  }

  // Ensure super admin account exists
  const superAdminEmail = "Bpgbirmingham@gmail.com";
  let superAdmin = await storage.getUserByUsername(superAdminEmail);
  if (!superAdmin) {
    console.log("Creating super admin account...");
    const hashedPassword = await hashPassword("SuperAdmin123!");
    superAdmin = await storage.createUser({
      fullName: "Super Admin",
      email: superAdminEmail,
      password: hashedPassword,
      role: "OWNER",
      accountStatus: "APPROVED"
    });
    console.log("Super admin account created!");
  } else if ((superAdmin as any).role !== "OWNER") {
    // Upgrade existing user to OWNER if not already
    await storage.updateUser((superAdmin as any).id, { role: "OWNER" });
    console.log("Super admin account upgraded to OWNER!");
  }

  // === PUBLIC: Clubs ===
  // Public clubs list - only approved clubs for browsing
  app.get("/api/clubs", async (req, res) => {
    const allClubs = await storage.getClubs();
    // Filter to only show approved clubs for public viewing
    const approvedClubs = allClubs.filter((c: any) => c.status === "APPROVED");
    res.json(approvedClubs);
  });

  app.get("/api/my-clubs", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      if (isSuperAdmin(req.user!)) {
        const allClubs = await storage.getClubs();
        return res.json(allClubs.filter(c => c.isActive));
      }
      const userProfiles = await storage.getUserPlayerProfiles(req.user!.id);
      const myClubs = userProfiles
        .filter(p => p.membershipStatus === "APPROVED" && p.club.isActive)
        .map(p => p.club);
      res.json(myClubs);
    } catch (err: any) {
      console.error("Error fetching user clubs:", err);
      res.status(500).json({ message: "Failed to fetch clubs" });
    }
  });

  app.get("/api/my-session-clubs", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      if (req.user!.role === "OWNER") {
        const allClubs = await storage.getClubs();
        return res.json(allClubs.filter(c => c.isActive));
      }
      const userProfiles = await storage.getUserPlayerProfiles(req.user!.id);
      const sessionClubs = userProfiles
        .filter(p =>
          p.membershipStatus === "APPROVED" &&
          p.club.isActive &&
          ["OWNER", "ADMIN", "ORGANISER", "COACH"].includes(p.clubRole)
        )
        .map(p => p.club);
      const allClubs = await storage.getClubs();
      const ownedClubs = allClubs.filter(c => c.ownerId === req.user!.id && c.isActive);
      const clubIds = new Set(sessionClubs.map(c => c.id));
      for (const club of ownedClubs) {
        if (!clubIds.has(club.id)) sessionClubs.push(club);
      }
      res.json(sessionClubs);
    } catch (err: any) {
      console.error("Error fetching session clubs:", err);
      res.status(500).json({ message: "Failed to fetch session clubs" });
    }
  });

  // Get clubs where the current user has admin access (club OWNER or ADMIN role)
  // Clubs where the user can manage tournaments (OWNER, ADMIN, ORGANISER club role)
  app.get("/api/my-tournament-clubs", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      if (req.user!.role === "OWNER") {
        const allClubs = await storage.getClubs();
        return res.json(allClubs.filter(c => c.isActive));
      }
      const userProfiles = await storage.getUserPlayerProfiles(req.user!.id);
      const tournamentClubs = userProfiles
        .filter(p =>
          p.membershipStatus === "APPROVED" &&
          p.club.isActive &&
          ["OWNER", "ADMIN", "ORGANISER"].includes(p.clubRole)
        )
        .map(p => p.club);
      res.json(tournamentClubs);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/my-admin-clubs", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      if (isSuperAdmin(req.user!)) {
        const allClubs = await storage.getClubs();
        return res.json(allClubs.filter(c => c.isActive));
      }
      const userProfiles = await storage.getUserPlayerProfiles(req.user!.id);
      const adminClubs = userProfiles
        .filter(p => 
          p.membershipStatus === "APPROVED" && 
          p.club.isActive &&
          ["OWNER", "ADMIN"].includes(p.clubRole)
        )
        .map(p => p.club);
      
      const allClubs = await storage.getClubs();
      const ownedClubs = allClubs.filter(c => c.ownerId === req.user!.id && c.isActive);
      const clubIds = new Set(adminClubs.map(c => c.id));
      for (const club of ownedClubs) {
        if (!clubIds.has(club.id)) {
          adminClubs.push(club);
        }
      }
      
      res.json(adminClubs);
    } catch (err: any) {
      console.error("Error fetching admin clubs:", err);
      res.status(500).json({ message: "Failed to fetch admin clubs" });
    }
  });

  app.get("/api/clubs/:id", async (req, res) => {
    const club = await storage.getClub(Number(req.params.id));
    if (!club) return res.status(404).json({ message: "Club not found" });
    
    // For public access, only show approved and active clubs
    // Super admins can see all clubs
    if (!req.isAuthenticated() || req.user!.role !== "OWNER") {
      const clubAny = club as any;
      if (!club.isActive || clubAny.status !== "APPROVED") {
        return res.status(404).json({ message: "Club not found" });
      }
    }
    res.json(club);
  });

  app.get("/api/clubs/slug/:slug", async (req, res) => {
    const club = await storage.getClubBySlug(req.params.slug);
    if (!club) return res.status(404).json({ message: "Club not found" });
    
    // For public access, only show approved and active clubs
    if (!req.isAuthenticated() || req.user!.role !== "OWNER") {
      const clubAny = club as any;
      if (!club.isActive || clubAny.status !== "APPROVED") {
        return res.status(404).json({ message: "Club not found" });
      }
    }
    res.json(club);
  });

  // === Player Profiles (current user) ===
  app.get("/api/player-profiles", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const profiles = await storage.getUserPlayerProfiles(req.user!.id);
      res.json(profiles);
    } catch (err: any) {
      console.error("Error fetching player profiles:", err);
      res.status(500).json({ message: "Failed to fetch profiles" });
    }
  });

  app.patch("/api/player-profiles/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      const profileId = Number(req.params.id);
      const profiles = await storage.getUserPlayerProfiles(req.user!.id);
      const profile = profiles.find(p => p.id === profileId);
      
      // Verify the profile belongs to the current user
      if (!profile) {
        return res.status(403).json({ message: "You can only update your own profile" });
      }
      
      const { fullName, gender, category } = req.body;
      
      // Update user's fullName if provided
      if (fullName && typeof fullName === 'string') {
        await db.update(users).set({ fullName: fullName.trim() }).where(eq(users.id, req.user!.id));
      }
      
      // Update profile if gender or category provided
      if (gender || category) {
        await storage.updatePlayerProfile(profileId, { 
          gender: gender || undefined,
          category: category || undefined 
        });
      }
      
      // Return updated profile
      const updatedProfiles = await storage.getUserPlayerProfiles(req.user!.id);
      res.json(updatedProfiles.find(p => p.id === profileId));
    } catch (err: any) {
      console.error("Error updating player profile:", err);
      res.status(500).json({ message: err.message || "Failed to update profile" });
    }
  });

  // === Create Club (any authenticated user) ===
  app.post("/api/clubs", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    try {
      const { 
        name, description, address, city, postcode,
        isRegisteredWithBE, beRegistrationNumber,
        hasCompetitions, hasSocialGames, socialGameTimings,
        providesTraining, trainingDetails,
        sessionFee, hasMembership, membershipFee,
        ageGroups, playerLevels, shuttlecockType, providesClubTShirts
      } = req.body;
      
      // Validate name
      if (!name || typeof name !== 'string') {
        return res.status(400).json({ message: "Club name is required" });
      }
      const trimmedName = name.trim();
      if (trimmedName.length < 3 || trimmedName.length > 50) {
        return res.status(400).json({ message: "Club name must be between 3 and 50 characters" });
      }

      // Validate conditional fields
      const isRegisteredWithBEBool = Boolean(isRegisteredWithBE);
      if (isRegisteredWithBEBool && (!beRegistrationNumber || typeof beRegistrationNumber !== 'string' || !beRegistrationNumber.trim())) {
        return res.status(400).json({ message: "Badminton England registration number is required when registered" });
      }

      const hasSocialGamesBool = Boolean(hasSocialGames);
      if (hasSocialGamesBool && (!socialGameTimings || typeof socialGameTimings !== 'string' || !socialGameTimings.trim())) {
        return res.status(400).json({ message: "Social game timings are required when social games are offered" });
      }

      const hasMembershipBool = Boolean(hasMembership);
      if (hasMembershipBool) {
        const membershipFeeNum = Number(membershipFee);
        if (isNaN(membershipFeeNum) || membershipFeeNum < 0) {
          return res.status(400).json({ message: "Valid membership fee is required when membership is offered" });
        }
      }

      // Validate and parse numeric fees
      let parsedSessionFee: number | null = null;
      if (sessionFee !== undefined && sessionFee !== null && sessionFee !== '') {
        const sessionFeeNum = Number(sessionFee);
        if (isNaN(sessionFeeNum) || sessionFeeNum < 0) {
          return res.status(400).json({ message: "Session fee must be a valid positive number" });
        }
        parsedSessionFee = Math.round(sessionFeeNum);
      }

      let parsedMembershipFee: number | null = null;
      if (membershipFee !== undefined && membershipFee !== null && membershipFee !== '') {
        const membershipFeeNum = Number(membershipFee);
        if (isNaN(membershipFeeNum) || membershipFeeNum < 0) {
          return res.status(400).json({ message: "Membership fee must be a valid positive number" });
        }
        parsedMembershipFee = Math.round(membershipFeeNum);
      }

      // Validate ageGroups against allowed values
      const ALLOWED_AGE_GROUPS = ["junior", "adult", "senior", "mixed"];
      let validatedAgeGroups: string[] = [];
      if (Array.isArray(ageGroups)) {
        validatedAgeGroups = ageGroups.filter(
          (ag: unknown) => typeof ag === 'string' && ALLOWED_AGE_GROUPS.includes(ag)
        );
      }

      // Validate playerLevels against allowed values
      const ALLOWED_PLAYER_LEVELS = ["beginner", "intermediate", "advanced", "pro", "all"];
      let validatedPlayerLevels: string[] = [];
      if (Array.isArray(playerLevels)) {
        validatedPlayerLevels = playerLevels.filter(
          (pl: unknown) => typeof pl === 'string' && ALLOWED_PLAYER_LEVELS.includes(pl)
        );
      }

      // Validate shuttlecockType
      const ALLOWED_SHUTTLECOCK_TYPES = ["feather", "plastic", "both"];
      let validatedShuttlecockType: string | null = null;
      if (shuttlecockType && typeof shuttlecockType === 'string' && ALLOWED_SHUTTLECOCK_TYPES.includes(shuttlecockType)) {
        validatedShuttlecockType = shuttlecockType;
      }

      // Generate base slug from name
      let baseSlug = trimmedName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      if (!baseSlug || baseSlug.length < 2) {
        baseSlug = 'club';
      }
      
      // Generate unique slug with suffix if needed
      let slug = baseSlug;
      let suffix = 1;
      while (await storage.getClubBySlug(slug)) {
        slug = `${baseSlug}-${suffix}`;
        suffix++;
        if (suffix > 100) {
          return res.status(400).json({ message: "Could not generate unique slug" });
        }
      }

      const userId = req.user!.id;
      
      // Geocode the address if provided
      let latitude: string | null = null;
      let longitude: string | null = null;
      if (address || city || postcode) {
        try {
          const geocodeQuery = [address, city, postcode].filter(Boolean).join(", ");
          const geocodeUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(geocodeQuery)}&limit=1`;
          const geocodeResponse = await fetch(geocodeUrl, {
            headers: { 'User-Agent': 'SmashClub/1.0' }
          });
          const geocodeData = await geocodeResponse.json();
          if (geocodeData && geocodeData.length > 0) {
            latitude = geocodeData[0].lat;
            longitude = geocodeData[0].lon;
          }
        } catch (err) {
          console.log("Geocoding failed, continuing without coordinates:", err);
        }
      }

      const club = await storage.createClub({ 
        name: trimmedName, 
        slug, 
        description: description?.trim() || null,
        address: address?.trim() || null,
        city: city?.trim() || null,
        postcode: postcode?.trim() || null,
        latitude,
        longitude,
        ownerId: userId,
        status: "PENDING" as any, // Requires super admin approval
        isActive: true,
        // New fields (validated)
        isRegisteredWithBE: isRegisteredWithBEBool,
        beRegistrationNumber: isRegisteredWithBEBool ? beRegistrationNumber.trim() : null,
        hasCompetitions: Boolean(hasCompetitions),
        hasSocialGames: hasSocialGamesBool,
        socialGameTimings: hasSocialGamesBool ? socialGameTimings.trim() : null,
        providesTraining: Boolean(providesTraining),
        trainingDetails: providesTraining ? trainingDetails?.trim() || null : null,
        sessionFee: parsedSessionFee,
        hasMembership: hasMembershipBool,
        membershipFee: parsedMembershipFee,
        ageGroups: validatedAgeGroups,
        playerLevels: validatedPlayerLevels,
        shuttlecockType: validatedShuttlecockType,
        providesClubTShirts: Boolean(providesClubTShirts)
      });

      // Create a player profile for the owner in this club with OWNER role and APPROVED status
      await storage.createPlayerProfile({
        userId,
        clubId: club.id,
        clubRole: "OWNER",
        membershipStatus: "APPROVED",
        gender: null,
        category: "A",
        membershipId: null
      });

      res.status(201).json(club);
    } catch (err: any) {
      console.error("Error creating club:", err);
      res.status(500).json({ message: err.message || "Failed to create club" });
    }
  });

  app.post("/api/clubs/join", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    try {
      const { clubId, gender } = req.body;
      
      if (isSuperAdmin(req.user!)) {
        console.log(`[JOIN] BLOCKED: Super admin (userId=${req.user!.id}) attempted to join club ${clubId} - super admins have automatic access`);
        return res.status(400).json({ message: "Super admins already have full access to all clubs. No need to join." });
      }

      if (!clubId || typeof clubId !== 'number') {
        return res.status(400).json({ message: "Club ID is required" });
      }

      if (gender && !["MALE", "FEMALE"].includes(gender)) {
        return res.status(400).json({ message: "Gender must be MALE or FEMALE" });
      }

      const club = await storage.getClub(clubId);
      if (!club) {
        return res.status(404).json({ message: "Club not found" });
      }

      const existingProfile = await storage.getPlayerProfile(req.user!.id, clubId);
      if (existingProfile) {
        if (existingProfile.membershipStatus === "PENDING") {
          return res.status(400).json({ message: "Your join request is already pending" });
        }
        if (existingProfile.membershipStatus === "APPROVED") {
          return res.status(400).json({ message: "You are already a member of this club" });
        }
        return res.status(400).json({ message: "You already have a profile in this club" });
      }

      const profile = await storage.createPlayerProfile({
        userId: req.user!.id,
        clubId,
        clubRole: "PLAYER",
        membershipStatus: "PENDING",
        gender: gender || null,
        category: "D",
        membershipId: null
      });

      console.log(`[JOIN] REQUEST: userId=${req.user!.id} requested to join clubId=${clubId}`);
      res.status(201).json(profile);
    } catch (err: any) {
      console.error("[JOIN] ERROR:", err);
      res.status(500).json({ message: err.message || "Failed to join club" });
    }
  });

  // === ADMIN: All sessions for a club (including private) ===
  app.get("/api/clubs/:clubId/sessions", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const clubId = Number(req.params.clubId);
      const canAccess = await hasAdminAccess(req.user!.id, req.user!.role, clubId);
      if (!canAccess) return res.sendStatus(403);
      const sessions = await storage.getSessionsByClub(clubId);
      res.json(sessions);
    } catch (err: any) {
      console.error("Error fetching club sessions:", err);
      res.status(500).json({ message: "Failed to fetch sessions" });
    }
  });

  // === PUBLIC: Sessions for a club (no auth required) ===
  app.get("/api/public/clubs/:clubId/sessions", async (req, res) => {
    try {
      const clubId = Number(req.params.clubId);
      
      // Verify club is approved and active
      const club = await storage.getClub(clubId);
      if (!club || !club.isActive || (club as any).status !== "APPROVED") {
        return res.status(404).json({ message: "Club not found" });
      }
      
      const sessions = await storage.getSessionsByClub(clubId);
      // Filter to only public, non-cancelled sessions
      const publicSessions = sessions.filter(s => s.status !== "CANCELLED" && !s.isPrivate);
      res.json(publicSessions);
    } catch (err: any) {
      console.error("Error fetching public sessions:", err);
      res.status(500).json({ message: "Failed to fetch sessions" });
    }
  });

  // === PUBLIC: Session details with signups and matches (no auth required) ===
  app.get("/api/public/sessions/:id", async (req, res) => {
    try {
      const sessionId = Number(req.params.id);
      const session = await storage.getSession(sessionId);
      if (!session) return res.status(404).json({ message: "Session not found" });
      
      // Verify club is approved and active
      const club = await storage.getClub(session.clubId);
      if (!club || !club.isActive || (club as any).status !== "APPROVED") {
        return res.status(404).json({ message: "Session not found" });
      }
      
      // Don't expose private sessions to public
      if (session.isPrivate) {
        return res.status(404).json({ message: "Session not found" });
      }

      const signups = await storage.getSessionSignups(sessionId);
      const matches = await storage.getSessionMatches(sessionId);

      // Return public-safe data - exclude sensitive user info like email/password
      const publicSignups = signups.map(s => ({
        id: s.id,
        playerId: s.playerId,
        player: {
          id: s.player.id,
          fullName: s.player.user.fullName,
          category: s.player.category,
          gender: s.player.gender,
          rankingPoints: s.player.rankingPoints
        }
      }));

      // Sanitize match data to exclude sensitive user info
      const sanitizePlayer = (p: any) => p ? ({
        id: p.id,
        category: p.category,
        gender: p.gender,
        rankingPoints: p.rankingPoints,
        user: { fullName: p.user?.fullName }
      }) : null;

      const publicMatches = matches.map(m => ({
        id: m.id,
        sessionId: m.sessionId,
        status: m.status,
        courtNumber: m.courtNumber,
        queuePosition: m.queuePosition,
        scoreA: m.scoreA,
        scoreB: m.scoreB,
        startedAt: m.startedAt,
        completedAt: m.completedAt,
        teamAPlayer1: sanitizePlayer(m.teamAPlayer1),
        teamAPlayer2: sanitizePlayer(m.teamAPlayer2),
        teamBPlayer1: sanitizePlayer(m.teamBPlayer1),
        teamBPlayer2: sanitizePlayer(m.teamBPlayer2),
      }));

      res.json({
        session,
        signups: publicSignups,
        matches: publicMatches
      });
    } catch (err: any) {
      console.error("Error fetching public session:", err);
      res.status(500).json({ message: "Failed to fetch session details" });
    }
  });

  // === PUBLIC: Leaderboard (no auth required) ===
  app.get("/api/leaderboard/:clubId", async (req, res) => {
    const clubId = Number(req.params.clubId);
    
    // Verify club is approved and active for public access
    const club = await storage.getClub(clubId);
    if (!club || !club.isActive || (club as any).status !== "APPROVED") {
      return res.status(404).json({ message: "Club not found" });
    }
    
    const leaderboard = await storage.getClubLeaderboard(clubId);
    // Return public-safe data (no email/password)
    const safeLeaderboard = leaderboard.map(player => ({
      id: player.id,
      fullName: player.user.fullName,
      gender: player.gender,
      category: player.category,
      rankingPoints: player.rankingPoints,
      matchesPlayed: player.matchesPlayed,
      matchesWon: player.matchesWon
    }));
    res.json(safeLeaderboard);
  });

  // === Personal Match History (requires auth) ===
  app.get("/api/personal-ranking/:clubId", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const clubId = Number(req.params.clubId);
    
    // Get user's player profile for this club
    const profile = await storage.getPlayerProfile(req.user!.id, clubId);
    if (!profile) {
      return res.status(404).json({ message: "No player profile in this club" });
    }

    // Get match history
    const matches = await storage.getPlayerMatchHistory(profile.id);
    
    // Calculate points for each match (simplified: +10 for wins, -10 for losses)
    const matchHistory = matches.map(match => {
      const isTeamA = match.teamAPlayer1Id === profile.id || match.teamAPlayer2Id === profile.id;
      const won = isTeamA 
        ? (match.scoreA ?? 0) > (match.scoreB ?? 0)
        : (match.scoreB ?? 0) > (match.scoreA ?? 0);
      // Simple point change estimation (actual Elo would be more complex)
      const pointsChange = won ? 15 : -10;
      
      return {
        id: match.id,
        completedAt: match.completedAt,
        scoreA: match.scoreA,
        scoreB: match.scoreB,
        isTeamA,
        won,
        pointsChange
      };
    });

    res.json({
      profile: {
        id: profile.id,
        fullName: profile.user.fullName,
        rankingPoints: profile.rankingPoints,
        matchesPlayed: profile.matchesPlayed,
        matchesWon: profile.matchesWon,
        category: profile.category
      },
      matchHistory
    });
  });

  // === Users ===
  app.get(api.users.list.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    // Restrict to ADMIN/OWNER/ORGANISER/COACH roles
    const role = req.user!.role;
    if (!["OWNER", "ADMIN", "ORGANISER", "COACH"].includes(role)) {
      return res.sendStatus(403);
    }
    const users = await storage.getAllUsers();
    res.json(users);
  });

  app.get(api.users.profile.path, async (req, res) => {
    const userId = Number(req.params.id);
    const profile = await storage.getPlayerProfile(userId);
    if (!profile) return res.status(404).json({ message: "Profile not found" });
    res.json(profile);
  });

  // === Sessions ===
  app.get(api.sessions.list.path, async (req, res) => {
    const sessions = await storage.getSessions();
    res.json(sessions);
  });

  app.post(api.sessions.create.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const input = api.sessions.create.input.parse(req.body);
      
      // Check session management access (ORGANISER, COACH, ADMIN, OWNER roles)
      const canAccess = await canManageSessions(req.user!.id, req.user!.role, input.clubId);
      if (!canAccess) {
        return res.sendStatus(403);
      }

      const session = await storage.createSession({ 
        ...input, 
        createdBy: req.user!.id 
      });
      res.status(201).json(session);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      throw err;
    }
  });

  app.get(api.sessions.get.path, async (req, res) => {
    const session = await storage.getSession(Number(req.params.id));
    if (!session) return res.sendStatus(404);
    res.json(session);
  });

  app.get(api.sessions.signups.path, async (req, res) => {
    const signups = await storage.getSessionSignups(Number(req.params.id));
    res.json(signups);
  });

  app.post(api.sessions.join.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const sessionId = Number(req.params.id);
    const session = await storage.getSession(sessionId);
    if (!session) return res.status(404).json({ message: "Session not found" });

    // Check if profile exists
    const profile = await storage.getPlayerProfile(req.user!.id);
    if (!profile) return res.status(400).json({ message: "Player profile required" });

    // Check capacity (basic check, could be racy without transaction but OK for MVP)
    const signups = await storage.getSessionSignups(sessionId);
    if (signups.length >= session.maxPlayers) {
      return res.status(400).json({ message: "Session full" });
    }

    // Check if already signed up - prevent duplicates
    const alreadySignedUp = signups.some(s => s.playerId === profile.id);
    if (alreadySignedUp) {
      return res.status(400).json({ message: "You are already signed up for this session" });
    }

    // Check private session restriction
    if (session.isPrivate) {
      const canAccess = await canManageSessions(req.user!.id, req.user!.role, session.clubId);
      if (!canAccess) {
        return res.status(400).json({ message: "This is a private session. Only admins or organisers can add players." });
      }
    }

    // Check gender restriction (females-only sessions)
    if (session.genderRestriction === "FEMALE_ONLY") {
      if (profile.gender !== "FEMALE") {
        return res.status(400).json({ message: "This session is for female players only." });
      }
    }

    // Check juniors-only session restriction
    if (session.sessionType === "JUNIORS_ONLY") {
      const user = req.user!;
      if (!user.dateOfBirth) {
        return res.status(400).json({ message: "Please set your date of birth in your profile to join junior sessions." });
      }
      const today = new Date();
      const birth = new Date(user.dateOfBirth);
      let age = today.getFullYear() - birth.getFullYear();
      const m = today.getMonth() - birth.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;

      if (age >= 18) {
        return res.status(400).json({ message: "This session is for juniors only (under 18)." });
      }

      // Check specific age group restrictions if set
      if (session.juniorAgeGroups && session.juniorAgeGroups.length > 0) {
        const ageGroupMap: Record<string, [number, number]> = {
          "7-10": [7, 10],
          "10-12": [10, 12],
          "13-15": [13, 15],
          "16-18": [16, 18],
        };
        const inAllowedGroup = session.juniorAgeGroups.some(group => {
          const range = ageGroupMap[group];
          return range && age >= range[0] && age <= range[1];
        });
        if (!inAllowedGroup) {
          return res.status(400).json({ message: `This junior session is for ages: ${session.juniorAgeGroups.join(", ")} only.` });
        }
      }
    }

    // Check category restriction
    if (session.allowedCategories && session.allowedCategories.length > 0 && session.allowedCategories.length < 4) {
      if (profile.category && !session.allowedCategories.includes(profile.category)) {
        return res.status(400).json({ message: `This session is only open to categories: ${session.allowedCategories.join(", ")}` });
      }
    }

    // Use session fee or club default fee or fallback to 1000 pence
    let fee = session.sessionFee;
    if (fee == null) {
      const club = await storage.getClub(session.clubId);
      fee = club?.sessionFee ?? 1000;
    }
    
    const signup = await storage.createSessionSignup(sessionId, profile.id, fee);
    res.status(201).json(signup);
  });

  app.post(api.sessions.withdraw.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const sessionId = Number(req.params.id);
    const profile = await storage.getPlayerProfile(req.user!.id);
    if (!profile) return res.sendStatus(400);

    await storage.deleteSessionSignup(sessionId, profile.id);
    res.sendStatus(200);
  });

  app.patch(api.sessions.updateAttendance.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401); 
    // Add role check here (ORGANISER+)
    
    const status = req.body;
    const updated = await storage.updateSignupStatus(Number(req.params.signupId), status);
    res.json(updated);
  });

  app.patch(api.sessions.updatePayment.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    try {
      // Get the session to check admin access
      const sessionId = Number(req.params.id);
      const session = await storage.getSession(sessionId);
      if (!session) return res.status(404).json({ message: "Session not found" });
      
      const canAccess = await hasAdminAccess(req.user!.id, req.user!.role, session.clubId);
      if (!canAccess) {
        return res.sendStatus(403);
      }

      // Convert { status: "PAID" } to { paymentStatus: "PAID" }
      const { status } = req.body;
      const updated = await storage.updateSignupStatus(Number(req.params.signupId), { paymentStatus: status });
      res.json(updated);
    } catch (err: any) {
      console.error("Error updating payment status:", err);
      res.status(500).json({ message: err.message || "Failed to update payment" });
    }
  });

  // Update session settings (courts, max players, etc.)
  app.patch("/api/sessions/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    try {
      const sessionId = Number(req.params.id);
      const session = await storage.getSession(sessionId);
      if (!session) return res.status(404).json({ message: "Session not found" });

      // Check session management access (ORGANISER, COACH, ADMIN, OWNER roles)
      const canAccess = await canManageSessions(req.user!.id, req.user!.role, session.clubId);
      if (!canAccess) {
        return res.sendStatus(403);
      }

      const { courtsAvailable, maxPlayers, matchMode, status, allowedCategories, courtNames } = req.body;

      const updates: any = {};
      if (courtsAvailable !== undefined) updates.courtsAvailable = courtsAvailable;
      if (maxPlayers !== undefined) updates.maxPlayers = maxPlayers;
      if (matchMode !== undefined) updates.matchMode = matchMode;
      if (status !== undefined) updates.status = status;
      if (courtNames !== undefined) {
        if (!Array.isArray(courtNames) || !courtNames.every((n: any) => typeof n === "string" && n.trim().length > 0)) {
          return res.status(400).json({ message: "Court names must be an array of non-empty strings" });
        }
        updates.courtNames = courtNames.map((n: string) => n.trim());
      }
      if (allowedCategories !== undefined) {
        // Validate categories
        const validCategories = ["A", "B", "C", "D"];
        if (!Array.isArray(allowedCategories) || !allowedCategories.every(c => validCategories.includes(c))) {
          return res.status(400).json({ message: "Invalid categories" });
        }
        updates.allowedCategories = allowedCategories;
      }

      const updated = await storage.updateSession(sessionId, updates);
      res.json(updated);
    } catch (err: any) {
      console.error("Error updating session:", err);
      res.status(500).json({ message: err.message || "Failed to update session" });
    }
  });

  // Delete session
  app.delete("/api/sessions/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    try {
      const sessionId = Number(req.params.id);
      const session = await storage.getSession(sessionId);
      if (!session) return res.status(404).json({ message: "Session not found" });

      // Check session management access (ORGANISER, COACH, ADMIN, OWNER roles)
      const canAccess = await canManageSessions(req.user!.id, req.user!.role, session.clubId);
      if (!canAccess) {
        return res.sendStatus(403);
      }

      await storage.deleteSession(sessionId);
      res.json({ message: "Session deleted" });
    } catch (err: any) {
      console.error("Error deleting session:", err);
      res.status(500).json({ message: err.message || "Failed to delete session" });
    }
  });

  // Bulk delete sessions
  app.delete("/api/sessions", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    try {
      const { sessionIds } = req.body;
      if (!Array.isArray(sessionIds) || sessionIds.length === 0) {
        return res.status(400).json({ message: "sessionIds must be a non-empty array" });
      }

      // Verify all sessions belong to clubs user has access to
      for (const sessionId of sessionIds) {
        const session = await storage.getSession(Number(sessionId));
        if (!session) continue;
        const canAccess = await hasAdminAccess(req.user!.id, req.user!.role, session.clubId);
        if (!canAccess) {
          return res.status(403).json({ message: "No access to one or more sessions" });
        }
      }

      await storage.deleteSessions(sessionIds.map(Number));
      res.json({ message: `Deleted ${sessionIds.length} sessions` });
    } catch (err: any) {
      console.error("Error bulk deleting sessions:", err);
      res.status(500).json({ message: err.message || "Failed to delete sessions" });
    }
  });

  // === Venues ===
  app.get("/api/clubs/:clubId/venues", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const clubId = Number(req.params.clubId);
    
    // Check admin access for viewing venues
    const canAccess = await hasAdminAccess(req.user!.id, req.user!.role, clubId);
    if (!canAccess) {
      return res.sendStatus(403);
    }
    
    try {
      const venues = await storage.getVenues(clubId);
      res.json(venues);
    } catch (err: any) {
      console.error("Error fetching venues:", err);
      res.status(500).json({ message: err.message || "Failed to fetch venues" });
    }
  });

  app.post("/api/clubs/:clubId/venues", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const clubId = Number(req.params.clubId);

    const canAccess = await hasAdminAccess(req.user!.id, req.user!.role, clubId);
    if (!canAccess) {
      return res.sendStatus(403);
    }

    try {
      const { name, address, city, postcode, googleMapsUrl, isDefault, courtNames } = req.body;
      
      if (!name || !address) {
        return res.status(400).json({ message: "Name and address are required" });
      }

      const venue = await storage.createVenue({
        clubId,
        name,
        address,
        city: city || null,
        postcode: postcode || null,
        googleMapsUrl: googleMapsUrl || null,
        isDefault: isDefault || false,
        courtNames: courtNames || null,
      });
      res.status(201).json(venue);
    } catch (err: any) {
      console.error("Error creating venue:", err);
      res.status(500).json({ message: err.message || "Failed to create venue" });
    }
  });

  app.patch("/api/venues/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    try {
      const venueId = Number(req.params.id);
      const venue = await storage.getVenue(venueId);
      if (!venue) return res.status(404).json({ message: "Venue not found" });

      const canAccess = await hasAdminAccess(req.user!.id, req.user!.role, venue.clubId);
      if (!canAccess) {
        return res.sendStatus(403);
      }

      const { name, address, city, postcode, googleMapsUrl, isDefault, courtNames } = req.body;
      const updates: any = {};
      if (name !== undefined) updates.name = name;
      if (address !== undefined) updates.address = address;
      if (city !== undefined) updates.city = city;
      if (postcode !== undefined) updates.postcode = postcode;
      if (googleMapsUrl !== undefined) updates.googleMapsUrl = googleMapsUrl;
      if (isDefault !== undefined) updates.isDefault = isDefault;
      if (courtNames !== undefined) updates.courtNames = courtNames;

      const updated = await storage.updateVenue(venueId, updates);
      res.json(updated);
    } catch (err: any) {
      console.error("Error updating venue:", err);
      res.status(500).json({ message: err.message || "Failed to update venue" });
    }
  });

  app.delete("/api/venues/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    try {
      const venueId = Number(req.params.id);
      const venue = await storage.getVenue(venueId);
      if (!venue) return res.status(404).json({ message: "Venue not found" });

      const canAccess = await hasAdminAccess(req.user!.id, req.user!.role, venue.clubId);
      if (!canAccess) {
        return res.sendStatus(403);
      }

      await storage.deleteVenue(venueId);
      res.json({ message: "Venue deleted" });
    } catch (err: any) {
      console.error("Error deleting venue:", err);
      res.status(500).json({ message: err.message || "Failed to delete venue" });
    }
  });

  // Admin: Add player to session
  app.post("/api/admin/sessions/:id/players", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    try {
      const sessionId = Number(req.params.id);
      const { playerId } = req.body;
      
      const session = await storage.getSession(sessionId);
      if (!session) return res.status(404).json({ message: "Session not found" });

      // Check admin access (global role OR club owner)
      const canAccess = await hasAdminAccess(req.user!.id, req.user!.role, session.clubId);
      if (!canAccess) {
        return res.sendStatus(403);
      }

      // Check if already signed up
      const signups = await storage.getSessionSignups(sessionId);
      if (signups.some(s => s.playerId === playerId)) {
        return res.status(400).json({ message: "Player already in session" });
      }

      // Check capacity
      if (signups.length >= session.maxPlayers) {
        return res.status(400).json({ message: "Session is full" });
      }

      // Use session fee or club default fee or fallback to 1000 pence
      let fee = session.sessionFee;
      if (fee == null) {
        const club = await storage.getClub(session.clubId);
        fee = club?.sessionFee ?? 1000;
      }

      const signup = await storage.createSessionSignup(sessionId, playerId, fee);
      res.status(201).json(signup);
    } catch (err: any) {
      console.error("Error adding player to session:", err);
      res.status(500).json({ message: err.message || "Failed to add player" });
    }
  });

  // Admin: Remove player from session
  app.delete("/api/admin/sessions/:id/players/:playerId", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    try {
      const sessionId = Number(req.params.id);
      const playerId = Number(req.params.playerId);

      const session = await storage.getSession(sessionId);
      if (!session) return res.status(404).json({ message: "Session not found" });

      // Check admin access (global role OR club owner)
      const canAccess = await hasAdminAccess(req.user!.id, req.user!.role, session.clubId);
      if (!canAccess) {
        return res.sendStatus(403);
      }
      
      await storage.deleteSessionSignup(sessionId, playerId);
      res.sendStatus(200);
    } catch (err: any) {
      console.error("Error removing player from session:", err);
      res.status(500).json({ message: err.message || "Failed to remove player" });
    }
  });

  // === Matches ===
  app.get(api.matches.list.path, async (req, res) => {
    const matches = await storage.getSessionMatches(Number(req.params.sessionId));
    res.json(matches);
  });

  app.post(api.matches.generate.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const sessionId = Number(req.params.sessionId);
    const { mode } = req.body;
    
    const signups = await storage.getSessionSignups(sessionId);
    const attendedPlayers = signups
      .filter(s => s.attendanceStatus === "ATTENDED")
      .map(s => s.player);

    const session = await storage.getSession(sessionId);
    if (!session) return res.status(404).json({ message: "Session not found" });

    const playersPerSide = session.playersPerSide || 2;
    const playersPerMatch = playersPerSide * 2;
    const matchGenderType = (mode as string) || session.matchGenderType || "MIXED";

    // Filter by gender if needed
    let eligible = [...attendedPlayers];
    if (matchGenderType === "FEMALE") {
      eligible = eligible.filter(p => p.gender === "FEMALE");
    } else if (matchGenderType === "MALE") {
      eligible = eligible.filter(p => p.gender === "MALE");
    }

    if (eligible.length < playersPerMatch) {
      return res.status(400).json({ message: `Not enough eligible players marked as ATTENDED (need at least ${playersPerMatch} for ${playersPerSide}v${playersPerSide})` });
    }

    const shuffled = [...eligible].sort(() => 0.5 - Math.random());
    const generatedMatches = [];
    const courts = session.courtsAvailable || 1;

    for (let i = 0; i < Math.min(courts, Math.floor(shuffled.length / playersPerMatch)); i++) {
      const idx = i * playersPerMatch;
      generatedMatches.push({
        sessionId,
        courtNumber: i + 1,
        teamAPlayer1Id: shuffled[idx].id,
        teamAPlayer2Id: playersPerSide === 2 ? shuffled[idx + 1].id : null,
        teamBPlayer1Id: shuffled[idx + playersPerSide].id,
        teamBPlayer2Id: playersPerSide === 2 ? shuffled[idx + playersPerSide + 1].id : null,
        scoreA: 0,
        scoreB: 0,
        isCompleted: false
      });
    }

    const createdMatches = await Promise.all(generatedMatches.map(m => storage.createMatch(m)));
    res.status(201).json(createdMatches);
  });

  app.patch(api.matches.update.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const updated = await storage.updateMatch(Number(req.params.id), req.body);
    res.json(updated);
  });

  // === Match Management Endpoints ===
  app.post("/api/matches/:id/start", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    try {
      const matchId = Number(req.params.id);
      const match = await storage.getMatch(matchId);
      if (!match) return res.status(404).json({ message: "Match not found" });

      // Get session to check club ownership
      const session = await storage.getSession(match.sessionId);
      if (!session) return res.status(404).json({ message: "Session not found" });

      // Check admin access (global role OR club owner)
      const canAccess = await hasAdminAccess(req.user!.id, req.user!.role, session.clubId);
      if (!canAccess) {
        return res.sendStatus(403);
      }

      const { courtNumber } = req.body;
      
      const updated = await storage.updateMatch(matchId, {
        status: "LIVE",
        courtNumber,
        startedAt: new Date(),
        queuePosition: null
      });
      res.json(updated);
    } catch (err: any) {
      console.error("Error starting match:", err);
      res.status(500).json({ message: err.message || "Failed to start match" });
    }
  });

  app.post("/api/matches/:id/complete", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    try {
      const matchId = Number(req.params.id);
      const { scoreA, scoreB } = req.body;

      if (scoreA === undefined || scoreB === undefined) {
        return res.status(400).json({ message: "Scores are required" });
      }

      // Get the match to find its sessionId and courtNumber
      const currentMatch = await storage.getMatch(matchId);
      if (!currentMatch) {
        return res.status(404).json({ message: "Match not found" });
      }

      // Get session to check club ownership
      const session = await storage.getSession(currentMatch.sessionId);
      if (!session) return res.status(404).json({ message: "Session not found" });

      // Check admin access (global role OR club owner)
      const canAccess = await hasAdminAccess(req.user!.id, req.user!.role, session.clubId);
      if (!canAccess) {
        return res.sendStatus(403);
      }

      const freedCourt = currentMatch.courtNumber;
      
      // Complete the current match
      const updated = await storage.updateMatch(matchId, {
        status: "COMPLETED",
        scoreA,
        scoreB,
        isCompleted: true,
        completedAt: new Date(),
        courtNumber: null
      });

      // Auto-progress: Find next queued match and assign to the freed court
      if (freedCourt && currentMatch.sessionId) {
        const sessionMatches = await storage.getSessionMatches(currentMatch.sessionId);
        const queuedMatches = sessionMatches
          .filter(m => m.status === "QUEUED" && m.queuePosition !== null)
          .sort((a, b) => (a.queuePosition || 0) - (b.queuePosition || 0));

        if (queuedMatches.length > 0) {
          const nextMatch = queuedMatches[0];
          await storage.updateMatch(nextMatch.id, {
            status: "LIVE",
            courtNumber: freedCourt,
            startedAt: new Date(),
            queuePosition: null
          });
        }
      }

      res.json(updated);
    } catch (err: any) {
      console.error("Error completing match:", err);
      res.status(500).json({ message: err.message || "Failed to complete match" });
    }
  });

  app.post("/api/matches/:id/swap-player", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    try {
      const matchId = Number(req.params.id);
      const { position, newPlayerId } = req.body;

      if (!position || !newPlayerId) {
        return res.status(400).json({ message: "Position and newPlayerId are required" });
      }

      // Get match and session for permission check
      const match = await storage.getMatch(matchId);
      if (!match) return res.status(404).json({ message: "Match not found" });

      const session = await storage.getSession(match.sessionId);
      if (!session) return res.status(404).json({ message: "Session not found" });

      // Check admin access (global role OR club owner)
      const canAccess = await hasAdminAccess(req.user!.id, req.user!.role, session.clubId);
      if (!canAccess) {
        return res.sendStatus(403);
      }

      const validPositions = ["teamAPlayer1Id", "teamAPlayer2Id", "teamBPlayer1Id", "teamBPlayer2Id"];
      if (!validPositions.includes(position)) {
        return res.status(400).json({ message: "Invalid position" });
      }

      const updated = await storage.updateMatch(matchId, { [position]: newPlayerId });
      res.json(updated);
    } catch (err: any) {
      console.error("Error swapping player:", err);
      res.status(500).json({ message: err.message || "Failed to swap player" });
    }
  });

  // Edit completed match score
  app.patch("/api/matches/:id/edit-score", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    try {
      const matchId = Number(req.params.id);
      const { scoreA, scoreB } = req.body;

      if (scoreA === undefined || scoreB === undefined) {
        return res.status(400).json({ message: "Both scores are required" });
      }

      const match = await storage.getMatch(matchId);
      if (!match) return res.status(404).json({ message: "Match not found" });

      const session = await storage.getSession(match.sessionId);
      if (!session) return res.status(404).json({ message: "Session not found" });

      // Check admin access (global role OR club owner)
      const canAccess = await hasAdminAccess(req.user!.id, req.user!.role, session.clubId);
      if (!canAccess) {
        return res.sendStatus(403);
      }

      const updated = await storage.updateMatch(matchId, { scoreA, scoreB });
      res.json(updated);
    } catch (err: any) {
      console.error("Error editing match score:", err);
      res.status(500).json({ message: err.message || "Failed to edit match score" });
    }
  });

  app.post("/api/sessions/:sessionId/matches/auto-generate", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    try {
      const sessionId = Number(req.params.sessionId);
      
      // Get session first to check permissions
      const session = await storage.getSession(sessionId);
      if (!session) return res.status(404).json({ message: "Session not found" });

      // Check admin access (global role OR club owner)
      const canAccess = await hasAdminAccess(req.user!.id, req.user!.role, session.clubId);
      if (!canAccess) {
        return res.sendStatus(403);
      }

      const { numberOfMatches, courtsToUse, matchGenderType: requestGenderType } = req.body;

      const playersPerSide = session.playersPerSide || 2;
      const playersPerMatch = playersPerSide * 2;
      const genderType = requestGenderType || session.matchGenderType || "MIXED";

      // Get signups - prefer ATTENDED players, fall back to all if none marked
      const signups = await storage.getSessionSignups(sessionId);
      const attendedSignups = signups.filter(s => s.attendanceStatus === "ATTENDED");
      const eligibleSignups = attendedSignups.length >= playersPerMatch ? attendedSignups : signups;
      let players = eligibleSignups.map(s => s.player);

      // Filter by gender type
      if (genderType === "FEMALE") {
        players = players.filter(p => p.gender === "FEMALE");
      } else if (genderType === "MALE") {
        players = players.filter(p => p.gender === "MALE");
      }

      if (players.length < playersPerMatch) {
        return res.status(400).json({ message: `Need at least ${playersPerMatch} eligible players to generate ${playersPerSide}v${playersPerSide} matches` });
      }

      // Get existing queued matches to determine next queue position
      const existingMatches = await storage.getSessionMatches(sessionId);
      const maxQueuePos = Math.max(0, ...existingMatches
        .filter(m => m.queuePosition !== null)
        .map(m => m.queuePosition || 0));

      // Generate matches using round-robin style pairing
      const shuffled = [...players].sort(() => 0.5 - Math.random());
      const generatedMatches = [];
      const matchCount = Math.min(numberOfMatches || 8, Math.floor(shuffled.length / playersPerMatch) * 2);

      for (let i = 0; i < matchCount; i++) {
        const offset = (i * playersPerSide) % shuffled.length;
        const teamA: number[] = [];
        const teamB: number[] = [];
        for (let j = 0; j < playersPerSide; j++) {
          teamA.push(shuffled[(offset + j) % shuffled.length].id);
        }
        for (let j = 0; j < playersPerSide; j++) {
          teamB.push(shuffled[(offset + playersPerSide + j) % shuffled.length].id);
        }

        generatedMatches.push({
          sessionId,
          courtNumber: null,
          queuePosition: maxQueuePos + i + 1,
          status: "QUEUED" as const,
          teamAPlayer1Id: teamA[0],
          teamAPlayer2Id: playersPerSide === 2 ? teamA[1] : null,
          teamBPlayer1Id: teamB[0],
          teamBPlayer2Id: playersPerSide === 2 ? teamB[1] : null,
          scoreA: 0,
          scoreB: 0,
          isCompleted: false
        });
      }

      const createdMatches = await Promise.all(generatedMatches.map(m => storage.createMatch(m)));
      res.status(201).json(createdMatches);
    } catch (err: any) {
      console.error("Error auto-generating matches:", err);
      res.status(500).json({ message: err.message || "Failed to generate matches" });
    }
  });

  // === Announcements ===
  app.get(api.announcements.list.path, async (req, res) => {
    const announcements = await storage.getAnnouncements();
    res.json(announcements);
  });

  app.post(api.announcements.create.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    // Only admins can create announcements
    const role = req.user!.role;
    if (!["OWNER", "ADMIN", "ORGANISER"].includes(role)) {
      return res.sendStatus(403);
    }
    const input = api.announcements.create.input.parse(req.body);
    const announcement = await storage.createAnnouncement({
      ...input,
      authorId: req.user!.id
    });
    res.status(201).json(announcement);
  });

  // === Admin Endpoints ===
  app.get("/api/admin/signups", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    // Check role (ADMIN, OWNER, ORGANISER)
    const role = req.user!.role;
    if (!["OWNER", "ADMIN", "ORGANISER"].includes(role)) {
      return res.sendStatus(403);
    }
    const allSignups = await storage.getAllSignups();
    res.json(allSignups);
  });

  // === Player Management ===
  app.post("/api/admin/players", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const role = req.user!.role;
    if (!["OWNER", "ADMIN", "ORGANISER"].includes(role)) {
      return res.sendStatus(403);
    }

    try {
      const { fullName, email, password, role: playerRole, gender, category } = req.body;
      
      // Check if email already exists
      const existing = await storage.getUserByUsername(email);
      if (existing) {
        return res.status(400).json({ message: "Email already in use" });
      }

      const hashedPassword = await hashPassword(password || "password123");
      const result = await storage.createUserWithProfile(
        { fullName, email, password: hashedPassword, role: playerRole || "PLAYER" },
        { gender, category }
      );
      
      res.status(201).json({ ...result.user, playerProfile: result.profile });
    } catch (err) {
      console.error("Error creating player:", err);
      res.status(500).json({ message: "Failed to create player" });
    }
  });

  app.patch("/api/admin/players/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const role = req.user!.role;
    if (!["OWNER", "ADMIN", "ORGANISER"].includes(role)) {
      return res.sendStatus(403);
    }

    try {
      const userId = Number(req.params.id);
      const { fullName, email, role: newRole, gender, category, rankingPoints } = req.body;

      // Check email uniqueness if changing email
      if (email) {
        const existingUser = await storage.getUserByUsername(email);
        if (existingUser && existingUser.id !== userId) {
          return res.status(400).json({ message: "Email already in use by another user" });
        }
      }

      // Update user
      const userUpdates: any = {};
      if (fullName) userUpdates.fullName = fullName;
      if (email) userUpdates.email = email;
      if (newRole) userUpdates.role = newRole;
      
      const updatedUser = await storage.updateUser(userId, userUpdates);

      // Update profile - create if it doesn't exist
      let profile = await storage.getPlayerProfile(userId);
      if (profile) {
        const profileUpdates: any = {};
        if (gender) profileUpdates.gender = gender;
        if (category) profileUpdates.category = category;
        if (rankingPoints !== undefined) profileUpdates.rankingPoints = rankingPoints;
        
        await storage.updatePlayerProfile(profile.id, profileUpdates);
      } else if (gender || category) {
        // Create profile if any profile fields are provided
        await storage.createPlayerProfile({
          userId,
          gender: gender as any,
          category: category as any,
          membershipId: null
        });
      }

      const users = await storage.getAllUsers();
      const fullUser = users.find(u => u.id === userId);
      res.json(fullUser);
    } catch (err) {
      console.error("Error updating player:", err);
      res.status(500).json({ message: "Failed to update player" });
    }
  });

  // === Get all players for a specific club (Super Admin) ===
  app.get("/api/admin/clubs/:clubId/players", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    if (req.user!.role !== "OWNER") {
      return res.sendStatus(403);
    }

    try {
      const clubId = Number(req.params.clubId);
      const players = await storage.getClubPlayersWithDetails(clubId);
      res.json(players);
    } catch (err: any) {
      console.error("Error fetching club players:", err);
      res.status(500).json({ message: err.message || "Failed to fetch players" });
    }
  });

  // === Bulk action on players (suspend, archive, delete) ===
  app.post("/api/admin/players/bulk-action", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    if (req.user!.role !== "OWNER") {
      return res.sendStatus(403);
    }

    try {
      const { profileIds, action } = req.body;
      
      if (!Array.isArray(profileIds) || profileIds.length === 0) {
        return res.status(400).json({ message: "Profile IDs are required" });
      }
      
      if (!["suspend", "archive", "activate", "delete"].includes(action)) {
        return res.status(400).json({ message: "Invalid action. Use: suspend, archive, activate, or delete" });
      }

      const results: any[] = [];
      for (const profileId of profileIds) {
        try {
          if (action === "delete") {
            await storage.deletePlayerProfile(Number(profileId));
            results.push({ profileId, success: true });
          } else {
            const statusMap: Record<string, string> = {
              suspend: "SUSPENDED",
              archive: "ARCHIVED",
              activate: "ACTIVE"
            };
            await storage.updatePlayerProfile(Number(profileId), { playerStatus: statusMap[action] as any });
            results.push({ profileId, success: true });
          }
        } catch (e: any) {
          results.push({ profileId, success: false, error: e.message });
        }
      }

      res.json({ results, message: `Bulk ${action} completed` });
    } catch (err: any) {
      console.error("Error in bulk player action:", err);
      res.status(500).json({ message: err.message || "Failed to perform bulk action" });
    }
  });

  // === Delete a single player profile ===
  app.delete("/api/admin/players/:profileId", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    if (req.user!.role !== "OWNER") {
      return res.sendStatus(403);
    }

    try {
      const profileId = Number(req.params.profileId);
      await storage.deletePlayerProfile(profileId);
      res.json({ message: "Player profile deleted successfully" });
    } catch (err: any) {
      console.error("Error deleting player profile:", err);
      res.status(500).json({ message: err.message || "Failed to delete player profile" });
    }
  });

  // === Allocate player to additional clubs ===
  app.post("/api/admin/players/:userId/allocate", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    if (req.user!.role !== "OWNER") {
      return res.sendStatus(403);
    }

    try {
      const userId = Number(req.params.userId);
      const { clubIds, gender, category } = req.body;
      
      if (!Array.isArray(clubIds) || clubIds.length === 0) {
        return res.status(400).json({ message: "Club IDs are required" });
      }

      const results: any[] = [];
      for (const clubId of clubIds) {
        try {
          // Check if profile already exists
          const existingProfile = await storage.getPlayerProfile(userId, Number(clubId));
          if (existingProfile) {
            results.push({ clubId, success: false, error: "Profile already exists" });
            continue;
          }

          const profile = await storage.createPlayerProfile({
            userId,
            clubId: Number(clubId),
            clubRole: "PLAYER",
            membershipStatus: "APPROVED",
            gender: gender || null,
            category: category || "D",
            membershipId: null
          });
          results.push({ clubId, success: true, profileId: profile.id });
        } catch (e: any) {
          results.push({ clubId, success: false, error: e.message });
        }
      }

      res.json({ results, message: "Player allocation completed" });
    } catch (err: any) {
      console.error("Error allocating player to clubs:", err);
      res.status(500).json({ message: err.message || "Failed to allocate player" });
    }
  });

  // === Update club (name, logo) ===
  app.patch("/api/clubs/:clubId", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const clubId = Number(req.params.clubId);
    
    // Allow super admin or club owner
    const isSuperAdmin = req.user!.role === "OWNER";
    const club = await storage.getClub(clubId);
    if (!club) {
      return res.status(404).json({ message: "Club not found" });
    }
    const isClubOwner = club.ownerId === req.user!.id;
    
    if (!isSuperAdmin && !isClubOwner) {
      return res.sendStatus(403);
    }

    try {
      const { name, logoUrl } = req.body;
      
      const updates: any = {};
      if (name !== undefined) {
        if (typeof name !== 'string' || name.trim().length < 3) {
          return res.status(400).json({ message: "Club name must be at least 3 characters" });
        }
        updates.name = name.trim();
      }
      if (logoUrl !== undefined) {
        updates.logoUrl = logoUrl || null;
      }
      
      const updatedClub = await storage.updateClub(clubId, updates);
      res.json(updatedClub);
    } catch (err: any) {
      console.error("Error updating club:", err);
      res.status(500).json({ message: err.message || "Failed to update club" });
    }
  });

  // === User Account Approval ===
  app.get("/api/admin/pending-users", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const role = req.user!.role;
    if (!["OWNER", "ADMIN"].includes(role)) {
      return res.sendStatus(403);
    }

    try {
      const users = await storage.getPendingUsers();
      res.json(users);
    } catch (err: any) {
      console.error("Error fetching pending users:", err);
      res.status(500).json({ message: err.message || "Failed to fetch pending users" });
    }
  });

  app.patch("/api/admin/users/:id/approve", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const role = req.user!.role;
    if (!["OWNER", "ADMIN"].includes(role)) {
      return res.sendStatus(403);
    }

    try {
      const userId = Number(req.params.id);
      const user = await storage.updateUser(userId, { accountStatus: "APPROVED" });
      res.json(user);
    } catch (err: any) {
      console.error("Error approving user:", err);
      res.status(500).json({ message: err.message || "Failed to approve user" });
    }
  });

  app.patch("/api/admin/users/:id/reject", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const role = req.user!.role;
    if (!["OWNER", "ADMIN"].includes(role)) {
      return res.sendStatus(403);
    }

    try {
      const userId = Number(req.params.id);
      const user = await storage.updateUser(userId, { accountStatus: "REJECTED" });
      res.json(user);
    } catch (err: any) {
      console.error("Error rejecting user:", err);
      res.status(500).json({ message: err.message || "Failed to reject user" });
    }
  });

  // === Admin: Club Management ===
  app.post("/api/admin/clubs", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const role = req.user!.role;
    if (!["OWNER", "ADMIN"].includes(role)) {
      return res.sendStatus(403);
    }

    try {
      const { name, slug, description } = req.body;
      if (!name || !slug) {
        return res.status(400).json({ message: "Name and slug are required" });
      }
      
      const club = await storage.createClub({ name, slug, description, isActive: true, status: "APPROVED" as any });
      res.status(201).json(club);
    } catch (err: any) {
      console.error("Error creating club:", err);
      res.status(500).json({ message: err.message || "Failed to create club" });
    }
  });

  // Get all clubs for super admin (includes pending/rejected)
  app.get("/api/admin/clubs", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    if (req.user!.role !== "OWNER") {
      return res.sendStatus(403);
    }

    try {
      const allClubs = await storage.getAllClubsForAdmin();
      res.json(allClubs);
    } catch (err: any) {
      console.error("Error fetching all clubs:", err);
      res.status(500).json({ message: err.message || "Failed to fetch clubs" });
    }
  });

  // Approve or reject a club
  app.patch("/api/admin/clubs/:id/status", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    if (req.user!.role !== "OWNER") {
      return res.sendStatus(403);
    }

    try {
      const clubId = Number(req.params.id);
      const { status } = req.body;
      if (!["PENDING", "APPROVED", "REJECTED"].includes(status)) {
        return res.status(400).json({ message: "Invalid status" });
      }
      
      const updated = await storage.updateClubStatus(clubId, status);
      res.json(updated);
    } catch (err: any) {
      console.error("Error updating club status:", err);
      res.status(500).json({ message: err.message || "Failed to update club status" });
    }
  });

  // Delete a club (soft delete)
  app.delete("/api/admin/clubs/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    if (req.user!.role !== "OWNER") {
      return res.sendStatus(403);
    }

    try {
      const clubId = Number(req.params.id);
      await storage.deleteClub(clubId);
      res.sendStatus(204);
    } catch (err: any) {
      console.error("Error deleting club:", err);
      res.status(500).json({ message: err.message || "Failed to delete club" });
    }
  });

  // Get all users for super admin
  app.get("/api/admin/users", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    if (req.user!.role !== "OWNER") {
      return res.sendStatus(403);
    }

    try {
      const allUsers = await storage.getAllUsers();
      res.json(allUsers);
    } catch (err: any) {
      console.error("Error fetching all users:", err);
      res.status(500).json({ message: err.message || "Failed to fetch users" });
    }
  });

  // Update a user's platform role (super admin only)
  app.patch("/api/admin/users/:id/role", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    if (req.user!.role !== "OWNER") {
      return res.sendStatus(403);
    }

    try {
      const userId = Number(req.params.id);
      const { role } = req.body;
      if (!["OWNER", "ADMIN", "ORGANISER", "COACH", "PLAYER"].includes(role)) {
        return res.status(400).json({ message: "Invalid role" });
      }
      
      const updated = await storage.updateUser(userId, { role });
      res.json(updated);
    } catch (err: any) {
      console.error("Error updating user role:", err);
      res.status(500).json({ message: err.message || "Failed to update user role" });
    }
  });

  // === Club Admins Management (super admin only) ===
  // Get all club admins across all clubs
  app.get("/api/admin/club-admins", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    if (req.user!.role !== "OWNER") {
      return res.sendStatus(403);
    }

    try {
      const clubId = req.query.club;
      // Get all player profiles with user info
      let allMembers: any[] = [];
      
      if (clubId && clubId !== "all") {
        allMembers = await storage.getClubMembers(Number(clubId));
      } else {
        // Get all clubs and their members
        const clubs = await storage.getAllClubs();
        for (const club of clubs) {
          const members = await storage.getClubMembers(club.id);
          allMembers.push(...members.map(m => ({
            ...m,
            club: { id: club.id, name: club.name, slug: club.slug }
          })));
        }
      }
      
      res.json(allMembers);
    } catch (err: any) {
      console.error("Error fetching club admins:", err);
      res.status(500).json({ message: err.message || "Failed to fetch club admins" });
    }
  });

  // Add a user as club admin (super admin only)
  app.post("/api/admin/club-admins", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    if (req.user!.role !== "OWNER") {
      return res.sendStatus(403);
    }

    try {
      const { email, clubId, role } = req.body;
      
      if (!email || !clubId || !role) {
        return res.status(400).json({ message: "Email, club ID, and role are required" });
      }
      
      if (!["OWNER", "ADMIN", "ORGANISER", "COACH", "PLAYER"].includes(role)) {
        return res.status(400).json({ message: "Invalid role" });
      }
      
      // Find user by email
      const allUsers = await storage.getAllUsers();
      const user = allUsers.find(u => u.email.toLowerCase() === email.toLowerCase());
      
      if (!user) {
        return res.status(404).json({ message: "User not found with that email" });
      }
      
      // Check if user already has a profile for this club
      const profiles = await storage.getUserPlayerProfiles(user.id);
      const existingProfile = profiles.find(p => p.clubId === clubId);
      
      if (existingProfile) {
        // Update existing profile's role
        const updated = await storage.updatePlayerProfile(existingProfile.id, { 
          clubRole: role,
          membershipStatus: "APPROVED"
        });
        return res.json(updated);
      }
      
      // Create new profile for this club
      const club = await storage.getClub(clubId);
      if (!club) {
        return res.status(404).json({ message: "Club not found" });
      }
      
      const newProfile = await storage.createPlayerProfile({
        userId: user.id,
        clubId,
        fullName: user.fullName,
        gender: "MALE" as const, // Default gender
        category: "C" as const, // Default category
        rankingPoints: 1000,
        membershipStatus: "APPROVED" as const,
        clubRole: role as any,
      });
      
      res.status(201).json(newProfile);
    } catch (err: any) {
      console.error("Error adding club admin:", err);
      res.status(500).json({ message: err.message || "Failed to add club admin" });
    }
  });

  // Update club admin profile role (super admin only)
  app.patch("/api/admin/profiles/:profileId", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    if (req.user!.role !== "OWNER") {
      return res.sendStatus(403);
    }

    try {
      const profileId = Number(req.params.profileId);
      const { clubRole, membershipStatus } = req.body;
      
      const updates: any = {};
      if (clubRole) {
        if (!["OWNER", "ADMIN", "ORGANISER", "COACH", "PLAYER"].includes(clubRole)) {
          return res.status(400).json({ message: "Invalid club role" });
        }
        updates.clubRole = clubRole;
      }
      if (membershipStatus) {
        if (!["PENDING", "APPROVED", "REJECTED"].includes(membershipStatus)) {
          return res.status(400).json({ message: "Invalid membership status" });
        }
        updates.membershipStatus = membershipStatus;
      }
      
      const updated = await storage.updatePlayerProfile(profileId, updates);
      res.json(updated);
    } catch (err: any) {
      console.error("Error updating profile:", err);
      res.status(500).json({ message: err.message || "Failed to update profile" });
    }
  });

  // === Club Member Management (for club owners/admins) ===
  app.get("/api/clubs/:clubId/members", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const clubId = Number(req.params.clubId);
    
    // Check if user has admin access to this club
    const canAccess = await hasAdminAccess(req.user!.id, req.user!.role, clubId);
    if (!canAccess) {
      return res.sendStatus(403);
    }

    try {
      const members = await storage.getClubMembers(clubId);
      res.json(members);
    } catch (err: any) {
      console.error("Error fetching club members:", err);
      res.status(500).json({ message: err.message || "Failed to fetch members" });
    }
  });

  app.patch("/api/clubs/:clubId/members/:profileId", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const clubId = Number(req.params.clubId);
    const profileId = Number(req.params.profileId);
    
    // Check if user has admin access to this club
    const canAccess = await hasAdminAccess(req.user!.id, req.user!.role, clubId);
    if (!canAccess) {
      return res.sendStatus(403);
    }

    try {
      // Verify the profile belongs to this club
      const members = await storage.getClubMembers(clubId);
      const profile = members.find(m => m.id === profileId);
      if (!profile) {
        return res.status(404).json({ message: "Member not found in this club" });
      }

      const { membershipStatus, clubRole, category, gender, fullName } = req.body;
      
      if (membershipStatus && !["PENDING", "APPROVED", "REJECTED"].includes(membershipStatus)) {
        return res.status(400).json({ message: "Invalid membership status" });
      }
      if (clubRole && !["OWNER", "ADMIN", "ORGANISER", "COACH", "PLAYER"].includes(clubRole)) {
        return res.status(400).json({ message: "Invalid club role" });
      }
      if (category && !["A", "B", "C", "D"].includes(category)) {
        return res.status(400).json({ message: "Invalid category" });
      }
      if (gender && !["MALE", "FEMALE"].includes(gender)) {
        return res.status(400).json({ message: "Invalid gender" });
      }

      if (membershipStatus === "APPROVED" && profile.membershipStatus === "APPROVED") {
        return res.status(400).json({ message: "User is already approved" });
      }

      const updates: any = {};
      if (membershipStatus) updates.membershipStatus = membershipStatus;
      if (clubRole) updates.clubRole = clubRole;
      if (category) updates.category = category;
      if (gender) updates.gender = gender;

      if (membershipStatus === "APPROVED" && !clubRole) {
        updates.clubRole = profile.clubRole || "PLAYER";
      }

      const updated = await storage.updatePlayerProfileWithFullName(profileId, updates, fullName);
      console.log(`[MEMBERSHIP] ${membershipStatus || "UPDATE"}: profileId=${profileId} clubId=${clubId} by userId=${req.user!.id} updates=${JSON.stringify(updates)}`);
      res.json(updated);
    } catch (err: any) {
      console.error("[MEMBERSHIP] ERROR:", err);
      res.status(500).json({ message: err.message || "Failed to update member" });
    }
  });

  // === Bulk delete members (club owner/admin only) ===
  app.delete("/api/clubs/:clubId/members", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const clubId = Number(req.params.clubId);
    
    const canAccess = await hasAdminAccess(req.user!.id, req.user!.role, clubId);
    if (!canAccess) {
      return res.sendStatus(403);
    }

    try {
      const { profileIds } = req.body;
      if (!Array.isArray(profileIds) || profileIds.length === 0) {
        return res.status(400).json({ message: "profileIds must be a non-empty array" });
      }

      // Verify all profiles belong to this club
      const members = await storage.getClubMembers(clubId);
      const memberIds = new Set(members.map(m => m.id));
      const validIds = profileIds.map(Number).filter(id => memberIds.has(id));
      
      if (validIds.length === 0) {
        return res.status(400).json({ message: "No valid members found in this club" });
      }

      await storage.deletePlayerProfiles(validIds);
      res.json({ message: `Deleted ${validIds.length} members` });
    } catch (err: any) {
      console.error("Error deleting members:", err);
      res.status(500).json({ message: err.message || "Failed to delete members" });
    }
  });

  // === Create Organizer (club owner/admin only - NOT organizers) ===
  app.post("/api/clubs/:clubId/organizers", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const clubId = Number(req.params.clubId);
    
    // Only OWNER/ADMIN roles or club owner can create organizers (NOT organizers themselves)
    const isGlobalAdmin = ["OWNER", "ADMIN"].includes(req.user!.role);
    const club = await storage.getClub(clubId);
    const isClubOwner = club && club.ownerId === req.user!.id;
    
    if (!isGlobalAdmin && !isClubOwner) {
      return res.sendStatus(403);
    }

    try {
      const { fullName, email, password } = req.body;
      
      if (!fullName || !email || !password) {
        return res.status(400).json({ message: "Full name, email, and password are required" });
      }

      // Check if email already exists
      const existingUser = await storage.getUserByUsername(email);
      if (existingUser) {
        return res.status(400).json({ message: "Email already in use" });
      }

      // Hash password
      const hashedPassword = await hashPassword(password);

      // Create user with ORGANISER role
      const { user, profile } = await storage.createUserWithProfile(
        {
          fullName,
          email,
          password: hashedPassword,
          role: "ORGANISER",
          accountStatus: "APPROVED", // Auto-approve since admin is creating
        },
        {
          clubId,
          category: "D", // Default category
        }
      );

      // Update profile to be approved
      await storage.updatePlayerProfileStatus(profile.id, { 
        membershipStatus: "APPROVED",
        clubRole: "ADMIN" // Club-level admin role for organizers
      });

      res.status(201).json({ 
        message: "Organizer created successfully",
        user: { id: user.id, fullName: user.fullName, email: user.email, role: user.role }
      });
    } catch (err: any) {
      console.error("Error creating organizer:", err);
      res.status(500).json({ message: err.message || "Failed to create organizer" });
    }
  });

  // === Get Club Organizers (club owner/admin only - NOT organizers) ===
  app.get("/api/clubs/:clubId/organizers", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const clubId = Number(req.params.clubId);
    
    // Only OWNER/ADMIN roles or club owner can view organizers list
    const isGlobalAdmin = ["OWNER", "ADMIN"].includes(req.user!.role);
    const club = await storage.getClub(clubId);
    const isClubOwner = club && club.ownerId === req.user!.id;
    
    if (!isGlobalAdmin && !isClubOwner) {
      return res.sendStatus(403);
    }

    try {
      // Get all members of the club where the user has ORGANISER role
      const members = await storage.getClubMembers(clubId);
      const organizers = members.filter(m => m.user.role === "ORGANISER");
      res.json(organizers);
    } catch (err: any) {
      console.error("Error fetching organizers:", err);
      res.status(500).json({ message: err.message || "Failed to fetch organizers" });
    }
  });

  // === Google Calendar Integration ===
  app.get("/api/admin/calendar/calendars", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const role = req.user!.role;
    if (!["OWNER", "ADMIN", "ORGANISER"].includes(role)) {
      return res.sendStatus(403);
    }

    try {
      const calendars = await listCalendars();
      res.json(calendars);
    } catch (err: any) {
      console.error("Error fetching calendars:", err);
      res.status(500).json({ message: err.message || "Failed to fetch calendars" });
    }
  });

  app.get("/api/admin/calendar/events", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const role = req.user!.role;
    if (!["OWNER", "ADMIN", "ORGANISER"].includes(role)) {
      return res.sendStatus(403);
    }

    try {
      const calendarId = (req.query.calendarId as string) || "primary";
      const events = await listUpcomingEvents(calendarId, 50);
      res.json(events);
    } catch (err: any) {
      console.error("Error fetching events:", err);
      res.status(500).json({ message: err.message || "Failed to fetch events" });
    }
  });

  app.post("/api/admin/calendar/import", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const role = req.user!.role;
    if (!["OWNER", "ADMIN", "ORGANISER"].includes(role)) {
      return res.sendStatus(403);
    }

    try {
      const { events } = req.body;
      
      // Get user's club from their player profiles
      const playerProfiles = await storage.getPlayerProfilesByUser(req.user!.id);
      if (!playerProfiles || playerProfiles.length === 0) {
        return res.status(400).json({ message: "You must be a member of a club to import sessions" });
      }
      const clubId = playerProfiles[0].clubId;
      
      const createdSessions = [];
      for (const event of events) {
        const startDate = new Date(event.start);
        const endDate = new Date(event.end);
        const durationMinutes = Math.round((endDate.getTime() - startDate.getTime()) / 60000);
        
        // Format time as HH:mm
        const hours = startDate.getHours().toString().padStart(2, '0');
        const minutes = startDate.getMinutes().toString().padStart(2, '0');
        const startTime = `${hours}:${minutes}`;

        const session = await storage.createSession({
          title: event.summary,
          date: startDate,
          startTime,
          durationMinutes: durationMinutes > 0 ? durationMinutes : 120,
          maxPlayers: 24,
          courtsAvailable: 4,
          allowedCategories: ["A", "B", "C", "D"],
          matchMode: "SOCIAL",
          isPrivate: false,
          createdBy: req.user!.id,
          clubId: clubId
        });
        createdSessions.push(session);
      }
      
      res.status(201).json({ imported: createdSessions.length, sessions: createdSessions });
    } catch (err: any) {
      console.error("Error importing events:", err);
      res.status(500).json({ message: err.message || "Failed to import events" });
    }
  });

  // Get player stats (public endpoint)
  app.get("/api/players/:profileId/stats", async (req, res) => {
    try {
      const profileId = Number(req.params.profileId);
      const profile = await storage.getPlayerProfileById(profileId);
      if (!profile) {
        return res.status(404).json({ message: "Player not found" });
      }

      // Get match history for this player
      const matches = await storage.getPlayerMatchHistory(profileId);
      
      // Calculate recent form (last 5 matches)
      const recentMatches = matches.slice(0, 5);
      const recentForm = recentMatches.map(match => {
        const isTeamA = match.teamAPlayer1Id === profileId || match.teamAPlayer2Id === profileId;
        return isTeamA 
          ? (match.scoreA ?? 0) > (match.scoreB ?? 0)
          : (match.scoreB ?? 0) > (match.scoreA ?? 0);
      });

      const winRatio = profile.matchesPlayed > 0 
        ? Math.round((profile.matchesWon / profile.matchesPlayed) * 100) 
        : 0;

      res.json({
        id: profile.id,
        fullName: profile.user.fullName,
        category: profile.category,
        gender: profile.gender,
        rankingPoints: profile.rankingPoints,
        matchesPlayed: profile.matchesPlayed,
        matchesWon: profile.matchesWon,
        matchesLost: profile.matchesPlayed - profile.matchesWon,
        winRatio,
        recentForm, // Array of booleans [W, L, W, W, L]
      });
    } catch (err: any) {
      console.error("Error fetching player stats:", err);
      res.status(500).json({ message: err.message || "Failed to fetch player stats" });
    }
  });

  // Get player session history with payment info
  app.get("/api/admin/players/:playerId/sessions", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const role = req.user!.role;
    if (!["OWNER", "ADMIN", "ORGANISER"].includes(role)) {
      return res.sendStatus(403);
    }

    try {
      const playerId = Number(req.params.playerId);
      const playerProfile = await storage.getPlayerProfileById(playerId);
      if (!playerProfile) {
        return res.status(404).json({ message: "Player not found" });
      }

      const signups = await storage.getSignupsByPlayerId(playerId);
      
      res.json({
        player: {
          ...playerProfile,
          user: playerProfile.user ? { id: playerProfile.user.id, fullName: playerProfile.user.fullName, email: playerProfile.user.email } : null
        },
        signups
      });
    } catch (err: any) {
      console.error("Error fetching player sessions:", err);
      res.status(500).json({ message: err.message || "Failed to fetch player sessions" });
    }
  });

  // ===================== TOURNAMENT ROUTES =====================

  // Get tournaments (optionally filtered by clubId)
  app.get("/api/tournaments", async (req, res) => {
    try {
      const clubId = req.query.clubId ? Number(req.query.clubId) : undefined;
      const allTournaments = await storage.getTournaments(clubId);
      if (!req.isAuthenticated()) {
        return res.json(allTournaments.filter(t => t.status !== "DRAFT"));
      }
      res.json(allTournaments);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // Public: Get published tournament
  app.get("/api/public/tournaments/:id", async (req, res) => {
    try {
      const tournament = await storage.getTournament(Number(req.params.id));
      if (!tournament || tournament.status === "DRAFT") {
        return res.status(404).json({ message: "Tournament not found" });
      }
      const categories = await storage.getTournamentCategories(tournament.id);
      const venue = tournament.venueId ? await storage.getVenue(tournament.venueId) : null;
      const club = await storage.getClub(tournament.clubId);
      res.json({ ...tournament, categories, venue, club });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // Get single tournament with details
  app.get("/api/tournaments/:id", async (req, res) => {
    try {
      const tournament = await storage.getTournament(Number(req.params.id));
      if (!tournament) return res.status(404).json({ message: "Tournament not found" });
      const categories = await storage.getTournamentCategories(tournament.id);
      const venue = tournament.venueId ? await storage.getVenue(tournament.venueId) : null;
      const club = await storage.getClub(tournament.clubId);
      res.json({ ...tournament, categories, venue, club });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  async function canManageTournament(user: Express.User, clubId: number): Promise<boolean> {
    const result = await canPerform({ id: user.id, role: user.role }, "MANAGE_TOURNAMENTS", clubId);
    log_rbac("MANAGE_TOURNAMENTS", user.id, result, { clubId });
    return result;
  }

  // Create tournament
  app.post("/api/tournaments", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const clubId = Number(req.body.clubId);
      if (!clubId) return res.status(400).json({ message: "clubId is required" });
      if (!(await canManageTournament(req.user!, clubId))) return res.status(403).json({ message: "Only admins, organisers, and super admins can create tournaments" });
      const body = { ...req.body };
      if (body.startDate) body.startDate = new Date(body.startDate);
      if (body.endDate) body.endDate = new Date(body.endDate);
      const tournament = await storage.createTournament({ ...body, createdBy: req.user!.id });
      res.status(201).json(tournament);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // Update tournament
  app.patch("/api/tournaments/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const tournament = await storage.getTournament(Number(req.params.id));
      if (!tournament) return res.status(404).json({ message: "Tournament not found" });
      if (!(await canManageTournament(req.user!, tournament.clubId))) return res.status(403).json({ message: "Only admins, organisers, and super admins can edit tournaments" });
      const body = { ...req.body };
      if (body.startDate) body.startDate = new Date(body.startDate);
      if (body.endDate) body.endDate = new Date(body.endDate);
      const updated = await storage.updateTournament(tournament.id, body);
      res.json(updated);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // Delete tournament
  app.delete("/api/tournaments/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const tournament = await storage.getTournament(Number(req.params.id));
      if (!tournament) return res.status(404).json({ message: "Tournament not found" });
      if (!(await canManageTournament(req.user!, tournament.clubId))) return res.status(403).json({ message: "Only admins, organisers, and super admins can delete tournaments" });
      await storage.deleteTournament(tournament.id);
      res.sendStatus(204);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // === Tournament Categories ===
  app.get("/api/tournaments/:id/categories", async (req, res) => {
    try {
      const categories = await storage.getTournamentCategories(Number(req.params.id));
      res.json(categories);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/tournaments/:id/categories", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const tournament = await storage.getTournament(Number(req.params.id));
      if (!tournament) return res.status(404).json({ message: "Tournament not found" });
      if (!(await canManageTournament(req.user!, tournament.clubId))) return res.status(403).json({ message: "Only admins, organisers, and super admins can manage categories" });
      const category = await storage.createTournamentCategory({ ...req.body, tournamentId: tournament.id });
      res.status(201).json(category);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.patch("/api/tournament-categories/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const category = await storage.getTournamentCategory(Number(req.params.id));
      if (!category) return res.status(404).json({ message: "Category not found" });
      const tournament = await storage.getTournament(category.tournamentId);
      if (!tournament) return res.status(404).json({ message: "Tournament not found" });
      if (!(await canManageTournament(req.user!, tournament.clubId))) return res.status(403).json({ message: "Only admins, organisers, and super admins can manage categories" });
      const updated = await storage.updateTournamentCategory(category.id, req.body);
      res.json(updated);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.delete("/api/tournament-categories/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const category = await storage.getTournamentCategory(Number(req.params.id));
      if (!category) return res.status(404).json({ message: "Category not found" });
      const tournament = await storage.getTournament(category.tournamentId);
      if (!tournament) return res.status(404).json({ message: "Tournament not found" });
      if (!(await canManageTournament(req.user!, tournament.clubId))) return res.status(403).json({ message: "Only admins, organisers, and super admins can manage categories" });
      await storage.deleteTournamentCategory(category.id);
      res.sendStatus(204);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // === Tournament Teams ===
  app.get("/api/tournament-categories/:id/teams", async (req, res) => {
    try {
      const teams = await storage.getTournamentTeams(Number(req.params.id));
      res.json(teams);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/tournament-categories/:id/teams", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const category = await storage.getTournamentCategory(Number(req.params.id));
      if (!category) return res.status(404).json({ message: "Category not found" });
      const tournament = await storage.getTournament(category.tournamentId);
      if (!tournament) return res.status(404).json({ message: "Tournament not found" });
      if (!(await canManageTournament(req.user!, tournament.clubId))) return res.status(403).json({ message: "Only admins, organisers, and super admins can manage teams" });
      const team = await storage.createTournamentTeam({ ...req.body, categoryId: category.id });
      res.status(201).json(team);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.delete("/api/tournament-teams/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const team = await storage.getTournamentTeam(Number(req.params.id));
      if (!team) return res.status(404).json({ message: "Team not found" });
      const category = await storage.getTournamentCategory(team.categoryId);
      if (!category) return res.status(404).json({ message: "Category not found" });
      const tournament = await storage.getTournament(category.tournamentId);
      if (!tournament) return res.status(404).json({ message: "Tournament not found" });
      if (!(await canManageTournament(req.user!, tournament.clubId))) return res.status(403).json({ message: "Only admins, organisers, and super admins can manage teams" });
      await storage.deleteTournamentTeam(team.id);
      res.sendStatus(204);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // === Tournament Matches ===
  app.get("/api/tournament-categories/:id/matches", async (req, res) => {
    try {
      const matches = await storage.getTournamentMatches(Number(req.params.id));
      res.json(matches);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // Score a tournament match
  app.patch("/api/tournament-matches/:id/score", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const match = await storage.getTournamentMatch(Number(req.params.id));
      if (!match) return res.status(404).json({ message: "Match not found" });
      const category = await storage.getTournamentCategory(match.categoryId);
      if (!category) return res.status(404).json({ message: "Category not found" });
      const tournament = await storage.getTournament(category.tournamentId);
      if (!tournament) return res.status(404).json({ message: "Tournament not found" });
      if (!(await canManageTournament(req.user!, tournament.clubId))) return res.status(403).json({ message: "Only admins, organisers, and super admins can score matches" });
      
      const { scores, winnerId, status } = req.body;
      const updates: any = {};
      if (scores !== undefined) updates.scores = scores;
      if (winnerId !== undefined) updates.winnerId = winnerId;
      if (status !== undefined) updates.status = status;
      
      const updated = await storage.updateTournamentMatch(match.id, updates);
      
      if (status === "FINISHED" && winnerId) {
        await recalculateStandings(match.categoryId);
      }
      
      res.json(updated);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // Update tournament match (court, time, etc.)
  app.patch("/api/tournament-matches/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const match = await storage.getTournamentMatch(Number(req.params.id));
      if (!match) return res.status(404).json({ message: "Match not found" });
      const category = await storage.getTournamentCategory(match.categoryId);
      if (!category) return res.status(404).json({ message: "Category not found" });
      const tournament = await storage.getTournament(category.tournamentId);
      if (!tournament) return res.status(404).json({ message: "Tournament not found" });
      if (!(await canManageTournament(req.user!, tournament.clubId))) return res.status(403).json({ message: "Only admins, organisers, and super admins can edit matches" });
      const updated = await storage.updateTournamentMatch(match.id, req.body);
      res.json(updated);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // === Tournament Standings ===
  app.get("/api/tournament-categories/:id/standings", async (req, res) => {
    try {
      const standings = await storage.getTournamentStandings(Number(req.params.id));
      res.json(standings);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // Generate matches for a category
  app.post("/api/tournament-categories/:id/generate-matches", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const category = await storage.getTournamentCategory(Number(req.params.id));
      if (!category) return res.status(404).json({ message: "Category not found" });
      const tournament = await storage.getTournament(category.tournamentId);
      if (!tournament) return res.status(404).json({ message: "Tournament not found" });
      if (!(await canManageTournament(req.user!, tournament.clubId))) return res.status(403).json({ message: "Only admins, organisers, and super admins can generate matches" });

      // Clear existing matches and standings
      await storage.deleteTournamentMatchesByCategory(category.id);
      await storage.deleteTournamentStandingsByCategory(category.id);

      const teams = await storage.getTournamentTeams(category.id);
      if (teams.length < 2) {
        return res.status(400).json({ message: "Need at least 2 teams to generate matches" });
      }

      let generatedMatches: any[] = [];

      if (category.format === "ROUND_ROBIN") {
        generatedMatches = generateRoundRobinMatches(teams, category.id);
      } else if (category.format === "KNOCKOUT") {
        generatedMatches = generateKnockoutMatches(teams, category.id);
      } else if (category.format === "GROUP_KNOCKOUT") {
        generatedMatches = generateGroupKnockoutMatches(teams, category.id, category.groupCount || 2, category.advancePerGroup || 2);
      }

      const createdMatches = [];
      for (const match of generatedMatches) {
        const created = await storage.createTournamentMatch(match);
        createdMatches.push(created);
      }

      // Initialize standings for round robin / group stages
      if (category.format === "ROUND_ROBIN" || category.format === "GROUP_KNOCKOUT") {
        for (const team of teams) {
          await storage.upsertTournamentStanding({
            categoryId: category.id,
            teamId: team.id,
            groupNumber: team.groupNumber || 1,
            matchesPlayed: 0, matchesWon: 0, matchesLost: 0,
            gamesWon: 0, gamesLost: 0, pointsFor: 0, pointsAgainst: 0, points: 0
          });
        }
      }

      res.json(createdMatches);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // Advance winners from knockout round
  app.post("/api/tournament-categories/:id/advance-winners", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const category = await storage.getTournamentCategory(Number(req.params.id));
      if (!category) return res.status(404).json({ message: "Category not found" });
      const advTournament = await storage.getTournament(category.tournamentId);
      if (!advTournament) return res.status(404).json({ message: "Tournament not found" });
      if (!(await canManageTournament(req.user!, advTournament.clubId))) return res.status(403).json({ message: "Only admins, organisers, and super admins can advance winners" });

      const allMatches = await storage.getTournamentMatches(category.id);
      const currentRound = Math.max(...allMatches.map(m => m.round));
      const currentRoundMatches = allMatches.filter(m => m.round === currentRound);

      const allFinished = currentRoundMatches.every(m => m.status === "FINISHED" || m.isBye);
      if (!allFinished) {
        return res.status(400).json({ message: "Not all matches in the current round are finished" });
      }

      const winners = currentRoundMatches.map(m => m.winnerId || m.teamAId).filter(Boolean);
      if (winners.length < 2) {
        return res.json({ message: "Tournament complete", winners });
      }

      const nextRound = currentRound + 1;
      const newMatches = [];
      for (let i = 0; i < winners.length; i += 2) {
        const teamA = winners[i];
        const teamB = winners[i + 1] || null;
        const isBye = !teamB;
        newMatches.push({
          categoryId: category.id,
          teamAId: teamA,
          teamBId: teamB,
          round: nextRound,
          matchOrder: Math.floor(i / 2),
          bracketPosition: Math.floor(i / 2),
          status: "UPCOMING" as const,
          isBye,
          isWalkover: false,
          winnerId: isBye ? teamA : null,
        });
      }

      const created = [];
      for (const match of newMatches) {
        const m = await storage.createTournamentMatch(match);
        created.push(m);
      }

      res.json(created);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // Helper: Recalculate standings for a category
  async function recalculateStandings(categoryId: number) {
    const category = await storage.getTournamentCategory(categoryId);
    if (!category) return;
    
    const allMatches = await storage.getTournamentMatches(categoryId);
    const teams = await storage.getTournamentTeams(categoryId);
    const finishedMatches = allMatches.filter(m => m.status === "FINISHED" && !m.isBye);

    await storage.deleteTournamentStandingsByCategory(categoryId);

    for (const team of teams) {
      const teamMatches = finishedMatches.filter(m => m.teamAId === team.id || m.teamBId === team.id);
      let matchesWon = 0, matchesLost = 0, gamesWon = 0, gamesLost = 0, pointsFor = 0, pointsAgainst = 0;

      for (const m of teamMatches) {
        const isTeamA = m.teamAId === team.id;
        const won = m.winnerId === team.id;
        if (won) matchesWon++; else matchesLost++;

        const scores = (m.scores as Array<{scoreA: number; scoreB: number}>) || [];
        for (const game of scores) {
          const myScore = isTeamA ? game.scoreA : game.scoreB;
          const oppScore = isTeamA ? game.scoreB : game.scoreA;
          pointsFor += myScore;
          pointsAgainst += oppScore;
          if (myScore > oppScore) gamesWon++;
          else gamesLost++;
        }
      }

      await storage.upsertTournamentStanding({
        categoryId,
        teamId: team.id,
        groupNumber: team.groupNumber || 1,
        matchesPlayed: teamMatches.length,
        matchesWon,
        matchesLost,
        gamesWon,
        gamesLost,
        pointsFor,
        pointsAgainst,
        points: matchesWon * (category.pointsPerWin || 2) + matchesLost * (category.pointsPerLoss || 0),
      });
    }
  }

  // Match generation helpers
  function generateRoundRobinMatches(teams: any[], categoryId: number) {
    const matches: any[] = [];
    let matchOrder = 0;
    for (let i = 0; i < teams.length; i++) {
      for (let j = i + 1; j < teams.length; j++) {
        matches.push({
          categoryId,
          teamAId: teams[i].id,
          teamBId: teams[j].id,
          round: 1,
          matchOrder: matchOrder++,
          status: "UPCOMING",
          isBye: false,
          isWalkover: false,
        });
      }
    }
    return matches;
  }

  function generateKnockoutMatches(teams: any[], categoryId: number) {
    // Pad to next power of 2
    const n = teams.length;
    let size = 1;
    while (size < n) size *= 2;

    const seeded = [...teams];
    while (seeded.length < size) seeded.push(null); // byes

    const matches: any[] = [];
    for (let i = 0; i < seeded.length; i += 2) {
      const teamA = seeded[i];
      const teamB = seeded[i + 1];
      const isBye = !teamA || !teamB;
      matches.push({
        categoryId,
        teamAId: teamA?.id || null,
        teamBId: teamB?.id || null,
        round: 1,
        matchOrder: Math.floor(i / 2),
        bracketPosition: Math.floor(i / 2),
        status: isBye ? "FINISHED" : "UPCOMING",
        isBye,
        isWalkover: false,
        winnerId: isBye ? (teamA?.id || teamB?.id) : null,
      });
    }
    return matches;
  }

  function generateGroupKnockoutMatches(teams: any[], categoryId: number, groupCount: number, advancePerGroup: number) {
    // Distribute teams into groups
    const groups: any[][] = Array.from({ length: groupCount }, () => []);
    teams.forEach((team, i) => {
      const groupIdx = i % groupCount;
      groups[groupIdx].push(team);
      // Update team group number
      storage.updateTournamentTeam(team.id, { groupNumber: groupIdx + 1 });
    });

    const matches: any[] = [];
    let matchOrder = 0;

    // Generate round robin within each group
    for (let g = 0; g < groups.length; g++) {
      const groupTeams = groups[g];
      for (let i = 0; i < groupTeams.length; i++) {
        for (let j = i + 1; j < groupTeams.length; j++) {
          matches.push({
            categoryId,
            teamAId: groupTeams[i].id,
            teamBId: groupTeams[j].id,
            round: 1,
            matchOrder: matchOrder++,
            groupNumber: g + 1,
            status: "UPCOMING",
            isBye: false,
            isWalkover: false,
          });
        }
      }
    }

    return matches;
  }

  return httpServer;
}
