import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import { db } from "./db";
import { users, sessionSignups, playerProfiles, clubs, sessions, matches, coaches, coachSeekerMemberships, insertCoachSchema } from "@shared/schema";
import { eq, and, sql, desc } from "drizzle-orm";
import { api } from "@shared/routes";
import { z } from "zod";
import { matchModeEnum } from "@shared/schema";
import { scrypt, randomBytes } from "crypto";
import { promisify } from "util";
import { listCalendars, listUpcomingEvents } from "./google-calendar";
import { canPerform, isSuperAdmin, log_rbac } from "./rbac";
import multer from "multer";
import path from "path";
import fs from "fs";

const scryptAsync = promisify(scrypt);

const uploadsDir = path.join(process.cwd(), "public", "uploads", "coaches");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
const coachPhotoStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname) || ".jpg";
    cb(null, `coach-${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`);
  },
});
const uploadCoachPhoto = multer({
  storage: coachPhotoStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith("image/")) cb(null, true);
    else cb(new Error("Only image files allowed"));
  },
});

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

  // Serve uploaded files
  const express = await import("express");
  app.use("/uploads", express.default.static(path.join(process.cwd(), "public", "uploads")));

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
        name, description, address, city, postcode, googleMapsUrl,
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
            headers: { 'User-Agent': 'ClubMaster/1.0' }
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
        googleMapsUrl: googleMapsUrl?.trim() || null,
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
        return res.status(403).json({ message: "Super admins already have full access to all clubs. No need to join." });
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

  // === PUBLIC: All sessions across all clubs (no auth required) ===
  app.get("/api/public/all-sessions", async (req, res) => {
    try {
      const allClubs = await storage.getClubs();
      const approvedClubs = allClubs.filter((c: any) => c.status === "APPROVED" && c.isActive);
      
      const allSessions: any[] = [];
      for (const club of approvedClubs) {
        const sessions = await storage.getSessionsByClub(club.id);
        const publicSessions = sessions.filter(s => s.status !== "CANCELLED" && !s.isPrivate);
        
        for (const session of publicSessions) {
          const signups = await storage.getSessionSignups(session.id);
          const matches = await storage.getSessionMatches(session.id);
          
          const liveMatches = matches.filter((m: any) => m.status === "LIVE");
          const queuedMatches = matches.filter((m: any) => m.status === "QUEUED");
          const completedMatches = matches.filter((m: any) => m.status === "COMPLETED");

          const sanitizePlayer = (p: any) => p ? ({
            id: p.id,
            fullName: p.user?.fullName,
            category: p.category,
            gender: p.gender,
          }) : null;

          allSessions.push({
            id: session.id,
            clubId: session.clubId,
            clubName: club.name,
            clubSlug: (club as any).slug,
            clubCity: (club as any).city || null,
            clubPostcode: (club as any).postcode || null,
            clubAddress: (club as any).address || null,
            playerLevels: (club as any).playerLevels || [],
            title: session.title,
            date: session.date,
            startTime: session.startTime,
            durationMinutes: session.durationMinutes,
            maxPlayers: session.maxPlayers,
            courtsAvailable: session.courtsAvailable,
            matchMode: session.matchMode,
            genderRestriction: session.genderRestriction,
            status: session.status,
            liveStreamUrl: session.liveStreamUrl,
            signupCount: signups.length,
            liveMatchCount: liveMatches.length,
            queuedMatchCount: queuedMatches.length,
            completedMatchCount: completedMatches.length,
            liveMatches: liveMatches.slice(0, 4).map(m => ({
              id: m.id,
              courtNumber: m.courtNumber,
              scoreA: m.scoreA,
              scoreB: m.scoreB,
              teamAPlayer1: sanitizePlayer(m.teamAPlayer1),
              teamAPlayer2: sanitizePlayer(m.teamAPlayer2),
              teamBPlayer1: sanitizePlayer(m.teamBPlayer1),
              teamBPlayer2: sanitizePlayer(m.teamBPlayer2),
            })),
            queuedMatches: queuedMatches.slice(0, 3).map(m => ({
              id: m.id,
              queuePosition: m.queuePosition,
              teamAPlayer1: sanitizePlayer(m.teamAPlayer1),
              teamAPlayer2: sanitizePlayer(m.teamAPlayer2),
              teamBPlayer1: sanitizePlayer(m.teamBPlayer1),
              teamBPlayer2: sanitizePlayer(m.teamBPlayer2),
            })),
            recentResults: completedMatches.slice(0, 3).map(m => ({
              id: m.id,
              scoreA: m.scoreA,
              scoreB: m.scoreB,
              teamAPlayer1: sanitizePlayer(m.teamAPlayer1),
              teamAPlayer2: sanitizePlayer(m.teamAPlayer2),
              teamBPlayer1: sanitizePlayer(m.teamBPlayer1),
              teamBPlayer2: sanitizePlayer(m.teamBPlayer2),
            })),
          });
        }
      }
      
      allSessions.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      res.json(allSessions);
    } catch (err: any) {
      console.error("Error fetching all public sessions:", err);
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

  // === PUBLIC: Leaderboard (no auth required) - dynamically calculated from matches ===
  app.get("/api/leaderboard/:clubId", async (req, res) => {
    const clubId = Number(req.params.clubId);
    
    const club = await storage.getClub(clubId);
    if (!club || !club.isActive || (club as any).status !== "APPROVED") {
      return res.status(404).json({ message: "Club not found" });
    }
    
    const leaderboard = await storage.getDynamicClubLeaderboard(clubId);
    res.json(leaderboard);
  });

  // === PUBLIC: Session mini-leaderboard (no auth required) ===
  app.get("/api/sessions/:id/leaderboard", async (req, res) => {
    try {
      const sessionId = Number(req.params.id);
      const session = await storage.getSession(sessionId);
      if (!session) {
        return res.status(404).json({ message: "Session not found" });
      }
      const leaderboard = await storage.getDynamicSessionLeaderboard(sessionId);
      res.json(leaderboard);
    } catch (err: any) {
      res.status(500).json({ message: err.message || "Failed to fetch session leaderboard" });
    }
  });

  // === Enhanced Leaderboard with filters ===
  app.get("/api/leaderboard", async (req, res) => {
    try {
      const filters: any = {};
      if (req.query.clubId) filters.clubId = Number(req.query.clubId);
      if (req.query.category) filters.category = req.query.category as string;
      if (req.query.gender) filters.gender = req.query.gender as string;
      if (req.query.matchType) filters.matchType = req.query.matchType as string;
      if (req.query.dateFrom) filters.dateFrom = new Date(req.query.dateFrom as string);
      if (req.query.dateTo) filters.dateTo = new Date(req.query.dateTo as string);

      const leaderboard = await storage.getFilteredLeaderboard(filters);
      res.json(leaderboard);
    } catch (err: any) {
      res.status(500).json({ message: err.message || "Failed to fetch leaderboard" });
    }
  });

  // === Enhanced Player Stats with filters ===
  app.get("/api/players/:profileId/detailed-stats", async (req, res) => {
    try {
      const profileId = Number(req.params.profileId);
      const filters: any = {};
      if (req.query.dateFrom) filters.dateFrom = new Date(req.query.dateFrom as string);
      if (req.query.dateTo) filters.dateTo = new Date(req.query.dateTo as string);
      if (req.query.matchType) filters.matchType = req.query.matchType as string;

      const stats = await storage.getDetailedPlayerStats(profileId, filters);
      if (!stats) {
        return res.status(404).json({ message: "Player not found" });
      }
      res.json(stats);
    } catch (err: any) {
      console.error("Error fetching detailed player stats:", err);
      res.status(500).json({ message: err.message || "Failed to fetch player stats" });
    }
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

    const matches = await storage.getPlayerMatchHistory(profile.id);
    
    const matchHistory = matches.map(match => {
      const isTeamA = match.teamAPlayer1Id === profile.id || match.teamAPlayer2Id === profile.id;
      const won = isTeamA 
        ? (match.scoreA ?? 0) > (match.scoreB ?? 0)
        : (match.scoreB ?? 0) > (match.scoreA ?? 0);
      
      return {
        id: match.id,
        completedAt: match.completedAt,
        scoreA: match.scoreA,
        scoreB: match.scoreB,
        isTeamA,
        won,
      };
    });

    const matchesPlayed = matchHistory.length;
    const matchesWon = matchHistory.filter(m => m.won).length;
    const matchesLost = matchesPlayed - matchesWon;

    res.json({
      profile: {
        id: profile.id,
        fullName: profile.user.fullName,
        matchesPlayed,
        matchesWon,
        matchesLost,
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

      const { courtsAvailable, maxPlayers, matchMode, status, allowedCategories, courtNames, liveStreamUrl } = req.body;

      const updates: any = {};
      if (courtsAvailable !== undefined) updates.courtsAvailable = courtsAvailable;
      if (maxPlayers !== undefined) updates.maxPlayers = maxPlayers;
      if (matchMode !== undefined) updates.matchMode = matchMode;
      if (status !== undefined) updates.status = status;
      if (liveStreamUrl !== undefined) updates.liveStreamUrl = liveStreamUrl || null;
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

      const currentMatch = await storage.getMatch(matchId);
      if (!currentMatch) {
        return res.status(404).json({ message: "Match not found" });
      }

      const session = await storage.getSession(currentMatch.sessionId);
      if (!session) return res.status(404).json({ message: "Session not found" });

      const isAdmin = await hasAdminAccess(req.user!.id, req.user!.role, session.clubId);
      const isSignedUp = await storage.isUserSignedUpToSession(req.user!.id, currentMatch.sessionId);
      
      if (!isAdmin && !isSignedUp) {
        return res.status(403).json({ message: "Only session participants or admins can complete matches" });
      }

      const freedCourt = currentMatch.courtNumber;
      
      const updated = await storage.updateMatch(matchId, {
        status: "COMPLETED",
        scoreA,
        scoreB,
        isCompleted: true,
        completedAt: new Date(),
        courtNumber: null,
        scoreEnteredByUserId: req.user!.id,
        scoreEnteredAt: new Date(),
      });

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

  // Edit completed match score - admin/organiser only (for disputes)
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

      const canAccess = await hasAdminAccess(req.user!.id, req.user!.role, session.clubId);
      if (!canAccess) {
        return res.status(403).json({ message: "Only admins and organisers can amend scores" });
      }

      const updated = await storage.updateMatch(matchId, { 
        scoreA, 
        scoreB,
        scoreUpdatedByUserId: req.user!.id,
        scoreUpdatedAt: new Date(),
      });
      res.json(updated);
    } catch (err: any) {
      console.error("Error editing match score:", err);
      res.status(500).json({ message: err.message || "Failed to edit match score" });
    }
  });

  // Player enters score on completed match (one-time only, signed-up players)
  app.patch("/api/matches/:id/player-score", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    try {
      const matchId = Number(req.params.id);
      const { scoreA, scoreB } = req.body;

      if (scoreA === undefined || scoreB === undefined) {
        return res.status(400).json({ message: "Both scores are required" });
      }

      const match = await storage.getMatch(matchId);
      if (!match) return res.status(404).json({ message: "Match not found" });

      if (match.status !== "COMPLETED") {
        return res.status(400).json({ message: "Match is not completed" });
      }

      if (match.scoreEnteredByUserId) {
        return res.status(403).json({ message: "Score has already been entered. Contact an admin to amend." });
      }

      const isSignedUp = await storage.isUserSignedUpToSession(req.user!.id, match.sessionId);
      if (!isSignedUp) {
        return res.status(403).json({ message: "Only session participants can enter scores" });
      }

      const updated = await storage.updateMatch(matchId, { 
        scoreA, 
        scoreB,
        scoreEnteredByUserId: req.user!.id,
        scoreEnteredAt: new Date(),
      });
      res.json(updated);
    } catch (err: any) {
      console.error("Error entering player score:", err);
      res.status(500).json({ message: err.message || "Failed to enter score" });
    }
  });

  // Delete a completed match (admin/organiser only)
  app.delete("/api/matches/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    try {
      const matchId = Number(req.params.id);
      const match = await storage.getMatch(matchId);
      if (!match) return res.status(404).json({ message: "Match not found" });

      const session = await storage.getSession(match.sessionId);
      if (!session) return res.status(404).json({ message: "Session not found" });

      const canAccess = await hasAdminAccess(req.user!.id, req.user!.role, session.clubId);
      if (!canAccess) {
        return res.status(403).json({ message: "Only admins can delete matches" });
      }

      await storage.deleteMatch(matchId);
      res.json({ message: "Match deleted" });
    } catch (err: any) {
      console.error("Error deleting match:", err);
      res.status(500).json({ message: err.message || "Failed to delete match" });
    }
  });

  app.post("/api/sessions/:sessionId/matches/auto-generate", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    try {
      const sessionId = Number(req.params.sessionId);
      
      const session = await storage.getSession(sessionId);
      if (!session) return res.status(404).json({ message: "Session not found" });

      const isAdmin = await hasAdminAccess(req.user!.id, req.user!.role, session.clubId);
      const isSignedUp = await storage.isUserSignedUpToSession(req.user!.id, sessionId);
      
      if (!isAdmin && !isSignedUp) {
        return res.status(403).json({ message: "Only session participants or admins can generate matches" });
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
      const { fullName, email, role: newRole, gender, category, rankingPoints,
              phone, dateOfBirth, isJunior, parentGuardianName, parentGuardianEmail,
              password, clubId } = req.body;

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
      if (phone !== undefined) userUpdates.phone = phone || null;
      if (dateOfBirth !== undefined) userUpdates.dateOfBirth = dateOfBirth ? new Date(dateOfBirth) : null;
      if (isJunior !== undefined) {
        userUpdates.isJunior = isJunior;
        if (!isJunior) {
          userUpdates.parentGuardianName = null;
          userUpdates.parentGuardianEmail = null;
        }
      }
      if (parentGuardianName !== undefined) userUpdates.parentGuardianName = parentGuardianName || null;
      if (parentGuardianEmail !== undefined) userUpdates.parentGuardianEmail = parentGuardianEmail || null;
      if (password) {
        const hashedPassword = await hashPassword(password);
        userUpdates.password = hashedPassword;
      }
      
      const updatedUser = await storage.updateUser(userId, userUpdates);

      // Update profile - create if it doesn't exist
      let profile = await storage.getPlayerProfile(userId);
      if (profile) {
        const profileUpdates: any = {};
        if (gender) profileUpdates.gender = gender;
        if (category) profileUpdates.category = category;
        if (rankingPoints !== undefined) profileUpdates.rankingPoints = rankingPoints;
        if (clubId && clubId !== profile.clubId) profileUpdates.clubId = clubId;
        
        await storage.updatePlayerProfile(profile.id, profileUpdates);
      } else if (gender || category || clubId) {
        await storage.createPlayerProfile({
          userId,
          gender: gender as any || null,
          category: category as any || null,
          clubId: clubId ? Number(clubId) : undefined,
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
      const updates: any = {};
      const body = req.body;

      const stringFields = [
        "name", "logoUrl", "address", "city", "postcode", "googleMapsUrl",
        "latitude", "longitude", "description", "beRegistrationNumber",
        "socialGameTimings", "trainingDetails", "shuttlecockType",
        "contactFullName", "contactPhone", "contactAddress"
      ];
      for (const field of stringFields) {
        if (body[field] !== undefined) {
          if (field === "name") {
            if (typeof body.name !== 'string' || body.name.trim().length < 3) {
              return res.status(400).json({ message: "Club name must be at least 3 characters" });
            }
            updates.name = body.name.trim();
          } else {
            updates[field] = body[field] || null;
          }
        }
      }

      const booleanFields = [
        "isRegisteredWithBE", "hasCompetitions", "hasSocialGames",
        "providesTraining", "providesClubTShirts"
      ];
      for (const field of booleanFields) {
        if (body[field] !== undefined) {
          updates[field] = !!body[field];
        }
      }

      const intFields = ["sessionFee", "membershipFee"];
      for (const field of intFields) {
        if (body[field] !== undefined) {
          updates[field] = body[field] === null || body[field] === "" ? null : Number(body[field]);
        }
      }

      const arrayFields = ["ageGroups", "playerLevels"];
      for (const field of arrayFields) {
        if (body[field] !== undefined) {
          updates[field] = Array.isArray(body[field]) ? body[field] : null;
        }
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

  app.post("/api/admin/users/bulk-action", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const role = req.user!.role;
    if (!["OWNER", "ADMIN"].includes(role)) {
      return res.sendStatus(403);
    }

    try {
      const { userIds, action } = req.body;
      if (!Array.isArray(userIds) || userIds.length === 0) {
        return res.status(400).json({ message: "No users selected" });
      }
      if (!["approve", "reject"].includes(action)) {
        return res.status(400).json({ message: "Invalid action" });
      }

      const newStatus = action === "approve" ? "APPROVED" : "REJECTED";
      const results = [];
      for (const userId of userIds) {
        const user = await storage.updateUser(Number(userId), { accountStatus: newStatus });
        results.push(user);
      }
      res.json({ message: `${results.length} user(s) ${action}d successfully`, count: results.length });
    } catch (err: any) {
      console.error("Error in bulk user action:", err);
      res.status(500).json({ message: err.message || "Failed to perform bulk action" });
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

  // Bulk update club member roles (super admin only)
  app.post("/api/admin/profiles/bulk-action", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    if (req.user!.role !== "OWNER") {
      return res.sendStatus(403);
    }

    try {
      const { profileIds, action, role } = req.body;
      if (!Array.isArray(profileIds) || profileIds.length === 0) {
        return res.status(400).json({ message: "profileIds array is required" });
      }
      if (!["changeRole", "delete"].includes(action)) {
        return res.status(400).json({ message: "Invalid action. Must be 'changeRole' or 'delete'" });
      }

      if (action === "changeRole") {
        if (!role || !["OWNER", "ADMIN", "ORGANISER", "COACH", "PLAYER"].includes(role)) {
          return res.status(400).json({ message: "Valid role is required for changeRole action" });
        }
        for (const id of profileIds) {
          await storage.updatePlayerProfile(Number(id), { clubRole: role });
        }
        return res.json({ message: `Updated ${profileIds.length} profiles to ${role}` });
      }

      if (action === "delete") {
        for (const id of profileIds) {
          await storage.deletePlayerProfile(Number(id));
        }
        return res.json({ message: `Deleted ${profileIds.length} profiles` });
      }
    } catch (err: any) {
      console.error("Error bulk updating profiles:", err);
      res.status(500).json({ message: err.message || "Failed to perform bulk action" });
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
    const role = (req.user as any).role;
    if (!["OWNER", "ADMIN", "ORGANISER"].includes(role)) {
      return res.sendStatus(403);
    }

    try {
      const { events, clubId: requestedClubId } = req.body;
      
      let clubId: number;
      
      if (requestedClubId) {
        clubId = Number(requestedClubId);
        const club = await storage.getClub(clubId);
        if (!club) return res.status(404).json({ message: "Club not found" });
        if (role !== "OWNER") {
          const allowed = await canPerform({ id: (req.user as any).id, role }, "MANAGE_SESSIONS", clubId);
          if (!allowed) return res.status(403).json({ message: "Not authorized for this club" });
        }
      } else {
        const playerProfiles = await storage.getPlayerProfilesByUser((req.user as any).id);
        if (!playerProfiles || playerProfiles.length === 0) {
          return res.status(400).json({ message: "Please select a club to import sessions into" });
        }
        clubId = playerProfiles[0].clubId;
      }
      
      const createdSessions = [];
      for (const event of events) {
        const startDate = new Date(event.start);
        const endDate = new Date(event.end);
        const durationMinutes = Math.round((endDate.getTime() - startDate.getTime()) / 60000);
        
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
          genderRestriction: "ALL",
          sessionType: "OPEN",
          playersPerSide: 2,
          matchGenderType: "MIXED",
          createdBy: (req.user as any).id,
          clubId
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

      const matchList = await storage.getPlayerMatchHistory(profileId);
      
      let matchesWon = 0;
      const matchHistory = matchList.map(match => {
        const isTeamA = match.teamAPlayer1Id === profileId || match.teamAPlayer2Id === profileId;
        const won = isTeamA
          ? (match.scoreA ?? 0) > (match.scoreB ?? 0)
          : (match.scoreB ?? 0) > (match.scoreA ?? 0);
        if (won) matchesWon++;
        return {
          id: match.id,
          scoreA: match.scoreA,
          scoreB: match.scoreB,
          isTeamA,
          won,
          completedAt: match.completedAt,
        };
      });

      const matchesPlayed = matchList.length;
      const matchesLost = matchesPlayed - matchesWon;
      const winRatio = matchesPlayed > 0
        ? Math.round((matchesWon / matchesPlayed) * 100)
        : 0;

      const recentMatches = matchHistory.slice(0, 5);
      const recentForm = recentMatches.map(m => m.won);

      res.json({
        id: profile.id,
        fullName: profile.user.fullName,
        category: profile.category,
        gender: profile.gender,
        matchesPlayed,
        matchesWon,
        matchesLost,
        winRatio,
        recentForm,
        matchHistory,
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

  // ===================== MEMBER IMPORT =====================

  app.post("/api/admin/clubs/:clubId/import-members", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    if ((req.user as any).role !== "OWNER") return res.sendStatus(403);

    try {
      const clubId = Number(req.params.clubId);
      const club = await storage.getClub(clubId);
      if (!club) return res.status(404).json({ message: "Club not found" });

      const { members } = req.body;
      if (!Array.isArray(members) || members.length === 0) {
        return res.status(400).json({ message: "No members provided" });
      }

      const results: { success: any[]; errors: any[] } = { success: [], errors: [] };

      for (const member of members) {
        try {
          const { fullName, email, gender, category } = member;
          if (!fullName || !email) {
            results.errors.push({ fullName, email, error: "Name and email are required" });
            continue;
          }

          const existingUser = await storage.getUserByUsername(email);
          if (existingUser) {
            const existingProfile = await storage.getPlayerProfile(existingUser.id, clubId);
            if (existingProfile) {
              results.errors.push({ fullName, email, error: "Already a member of this club" });
              continue;
            }
            const profile = await storage.createPlayerProfile({
              userId: existingUser.id,
              clubId,
              gender: gender || "MALE",
              category: category || "D",
              clubRole: "PLAYER",
              membershipStatus: "APPROVED",
            });
            results.success.push({ fullName, email, profileId: profile.id, existing: true });
          } else {
            const placeholderPassword = `Import_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
            const hashedPassword = await hashPassword(placeholderPassword);
            const newUser = await storage.createUser({
              fullName,
              email,
              password: hashedPassword,
              role: "PLAYER",
            });
            const profile = await storage.createPlayerProfile({
              userId: newUser.id,
              clubId,
              gender: gender || "MALE",
              category: category || "D",
              clubRole: "PLAYER",
              membershipStatus: "APPROVED",
            });
            results.success.push({ fullName, email, profileId: profile.id, existing: false });
          }
        } catch (err: any) {
          results.errors.push({ fullName: member.fullName, email: member.email, error: err.message });
        }
      }

      res.status(201).json(results);
    } catch (err: any) {
      console.error("Error importing members:", err);
      res.status(500).json({ message: err.message });
    }
  });

  // ===================== CSV EXPORTS =====================

  app.get("/api/admin/export/users", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    if ((req.user as any).role !== "OWNER") return res.sendStatus(403);

    try {
      const allUsers = await db
        .select({
          userId: users.id,
          fullName: users.fullName,
          email: users.email,
          role: users.role,
          accountStatus: users.accountStatus,
          emailVerified: users.emailVerified,
          dateOfBirth: users.dateOfBirth,
          createdAt: users.createdAt,
          clubName: clubs.name,
          clubRole: playerProfiles.clubRole,
          membershipStatus: playerProfiles.membershipStatus,
          playerStatus: playerProfiles.playerStatus,
          gender: playerProfiles.gender,
          category: playerProfiles.category,
          rankingPoints: playerProfiles.rankingPoints,
          matchesPlayed: playerProfiles.matchesPlayed,
          matchesWon: playerProfiles.matchesWon,
        })
        .from(users)
        .leftJoin(playerProfiles, eq(users.id, playerProfiles.userId))
        .leftJoin(clubs, eq(playerProfiles.clubId, clubs.id))
        .orderBy(users.fullName);

      const headers = [
        "User ID", "Full Name", "Email", "Platform Role", "Account Status",
        "Email Verified", "Date of Birth", "Created At",
        "Club Name", "Club Role", "Membership Status", "Player Status",
        "Gender", "Category", "Ranking Points", "Matches Played", "Matches Won"
      ];

      const escapeCSV = (val: any) => {
        if (val === null || val === undefined) return "";
        const str = String(val);
        if (str.includes(",") || str.includes('"') || str.includes("\n")) {
          return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
      };

      const rows = allUsers.map((row) => [
        row.userId,
        row.fullName,
        row.email,
        row.role,
        row.accountStatus,
        row.emailVerified ? "Yes" : "No",
        row.dateOfBirth ? new Date(row.dateOfBirth).toISOString().split("T")[0] : "",
        row.createdAt ? new Date(row.createdAt).toISOString().split("T")[0] : "",
        row.clubName || "",
        row.clubRole || "",
        row.membershipStatus || "",
        row.playerStatus || "",
        row.gender || "",
        row.category || "",
        row.rankingPoints ?? "",
        row.matchesPlayed ?? "",
        row.matchesWon ?? "",
      ].map(escapeCSV).join(","));

      const csv = [headers.join(","), ...rows].join("\n");

      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", `attachment; filename="club_master_users_${new Date().toISOString().split("T")[0]}.csv"`);
      res.send(csv);
    } catch (err: any) {
      console.error("Error exporting users:", err);
      res.status(500).json({ message: err.message });
    }
  });

  app.get("/api/admin/export/attendance", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    if ((req.user as any).role !== "OWNER") return res.sendStatus(403);

    try {
      const attendanceData = await db
        .select({
          userId: users.id,
          fullName: users.fullName,
          email: users.email,
          clubName: clubs.name,
          gender: playerProfiles.gender,
          category: playerProfiles.category,
          sessionTitle: sessions.title,
          sessionDate: sessions.date,
          startTime: sessions.startTime,
          attendanceStatus: sessionSignups.attendanceStatus,
          paymentStatus: sessionSignups.paymentStatus,
          fee: sessionSignups.fee,
          signupTime: sessionSignups.signupTime,
        })
        .from(sessionSignups)
        .innerJoin(playerProfiles, eq(sessionSignups.playerId, playerProfiles.id))
        .innerJoin(users, eq(playerProfiles.userId, users.id))
        .innerJoin(sessions, eq(sessionSignups.sessionId, sessions.id))
        .innerJoin(clubs, eq(sessions.clubId, clubs.id))
        .orderBy(users.fullName, sessions.date);

      const headers = [
        "User ID", "Full Name", "Email", "Club Name",
        "Gender", "Category",
        "Session Title", "Session Date", "Start Time",
        "Attendance Status", "Payment Status", "Fee (£)", "Signup Time"
      ];

      const escapeCSV = (val: any) => {
        if (val === null || val === undefined) return "";
        const str = String(val);
        if (str.includes(",") || str.includes('"') || str.includes("\n")) {
          return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
      };

      const rows = attendanceData.map((row) => [
        row.userId,
        row.fullName,
        row.email,
        row.clubName,
        row.gender || "",
        row.category || "",
        row.sessionTitle,
        row.sessionDate ? new Date(row.sessionDate).toISOString().split("T")[0] : "",
        row.startTime || "",
        row.attendanceStatus,
        row.paymentStatus,
        row.fee != null ? (row.fee / 100).toFixed(2) : "",
        row.signupTime ? new Date(row.signupTime).toISOString().replace("T", " ").slice(0, 19) : "",
      ].map(escapeCSV).join(","));

      const csv = [headers.join(","), ...rows].join("\n");

      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", `attachment; filename="club_master_attendance_${new Date().toISOString().split("T")[0]}.csv"`);
      res.send(csv);
    } catch (err: any) {
      console.error("Error exporting attendance:", err);
      res.status(500).json({ message: err.message });
    }
  });

  // ===================== SESSION PLAYER MANAGEMENT =====================

  app.patch("/api/sessions/:sessionId/signups/:signupId/gender", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const sessionId = Number(req.params.sessionId);
      const signupId = Number(req.params.signupId);
      const { gender } = req.body;
      if (!gender || !["MALE", "FEMALE"].includes(gender)) {
        return res.status(400).json({ message: "Gender must be MALE or FEMALE" });
      }
      const session = await storage.getSession(sessionId);
      if (!session) return res.status(404).json({ message: "Session not found" });
      const allowed = await canPerform({ id: req.user!.id, role: req.user!.role }, "MANAGE_SESSIONS", session.clubId);
      if (!allowed) return res.status(403).json({ message: "Not authorized" });
      const result = await db.update(sessionSignups).set({ genderOverride: gender }).where(and(eq(sessionSignups.id, signupId), eq(sessionSignups.sessionId, sessionId))).returning();
      if (!result.length) return res.status(404).json({ message: "Signup not found in this session" });
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.patch("/api/sessions/:sessionId/signups/:signupId/pause", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const sessionId = Number(req.params.sessionId);
      const signupId = Number(req.params.signupId);
      const { isPaused } = req.body;
      const session = await storage.getSession(sessionId);
      if (!session) return res.status(404).json({ message: "Session not found" });
      const allowed = await canPerform({ id: req.user!.id, role: req.user!.role }, "MANAGE_SESSIONS", session.clubId);
      if (!allowed) return res.status(403).json({ message: "Not authorized" });
      const result = await db.update(sessionSignups).set({ isPaused: !!isPaused }).where(and(eq(sessionSignups.id, signupId), eq(sessionSignups.sessionId, sessionId))).returning();
      if (!result.length) return res.status(404).json({ message: "Signup not found in this session" });
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.patch("/api/sessions/:sessionId/signups/:signupId/pair", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const sessionId = Number(req.params.sessionId);
      const signupId = Number(req.params.signupId);
      const { pairGroupId } = req.body;
      const session = await storage.getSession(sessionId);
      if (!session) return res.status(404).json({ message: "Session not found" });
      const allowed = await canPerform({ id: req.user!.id, role: req.user!.role }, "MANAGE_SESSIONS", session.clubId);
      if (!allowed) return res.status(403).json({ message: "Not authorized" });
      const result = await db.update(sessionSignups).set({ pairGroupId: pairGroupId ?? null }).where(and(eq(sessionSignups.id, signupId), eq(sessionSignups.sessionId, sessionId))).returning();
      if (!result.length) return res.status(404).json({ message: "Signup not found in this session" });
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.post("/api/sessions/:sessionId/guest-player", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const sessionId = Number(req.params.sessionId);
      const { fullName, gender, category } = req.body;
      if (!fullName) return res.status(400).json({ message: "Name is required" });
      const session = await storage.getSession(sessionId);
      if (!session) return res.status(404).json({ message: "Session not found" });
      const allowed = await canPerform({ id: req.user!.id, role: req.user!.role }, "MANAGE_SESSIONS", session.clubId);
      if (!allowed) return res.status(403).json({ message: "Not authorized" });

      const placeholderEmail = `guest_${Date.now()}_${Math.random().toString(36).slice(2, 8)}@guest.local`;
      const hashedPassword = await hashPassword("GuestPlayer123!");

      const newUser = await storage.createUser({
        fullName,
        email: placeholderEmail,
        password: hashedPassword,
        role: "PLAYER",
      });

      const newProfile = await storage.createPlayerProfile({
        userId: newUser.id,
        clubId: session.clubId,
        gender: gender || "MALE",
        category: category || "D",
        clubRole: "PLAYER",
        membershipStatus: "APPROVED",
      });

      await storage.addPlayerToSession(sessionId, newProfile.id, session.sessionFee || 0);

      res.status(201).json({ userId: newUser.id, profileId: newProfile.id, fullName });
    } catch (err: any) {
      console.error("Error adding guest player:", err);
      res.status(500).json({ message: err.message });
    }
  });

  // === ADMIN: Password reset/change for any user (OWNER only) ===
  app.patch("/api/admin/users/:id/password", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    if (req.user!.role !== "OWNER") return res.sendStatus(403);

    try {
      const userId = Number(req.params.id);
      const { newPassword } = req.body;
      if (!newPassword || typeof newPassword !== "string" || newPassword.length < 6) {
        return res.status(400).json({ message: "Password must be at least 6 characters" });
      }

      const hashed = await hashPassword(newPassword);
      await db.update(users).set({ password: hashed }).where(eq(users.id, userId));
      res.json({ message: "Password updated successfully" });
    } catch (err: any) {
      console.error("Error resetting password:", err);
      res.status(500).json({ message: "Failed to reset password" });
    }
  });

  // === ADMIN: Update signup fee (OWNER only) ===
  app.patch("/api/admin/signups/:signupId/fee", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    if (req.user!.role !== "OWNER") return res.sendStatus(403);

    try {
      const signupId = Number(req.params.signupId);
      const { fee } = req.body;
      if (fee === undefined || typeof fee !== "number" || fee < 0) {
        return res.status(400).json({ message: "Fee must be a non-negative number (in pence)" });
      }

      const [updated] = await db.update(sessionSignups)
        .set({ fee })
        .where(eq(sessionSignups.id, signupId))
        .returning();
      res.json(updated);
    } catch (err: any) {
      console.error("Error updating signup fee:", err);
      res.status(500).json({ message: "Failed to update fee" });
    }
  });

  // === ADMIN: Analytics summary (OWNER only) ===
  app.get("/api/admin/analytics", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    if (req.user!.role !== "OWNER") return res.sendStatus(403);

    try {
      const allClubs = await storage.getClubs();
      const allSessions = await storage.getSessions();
      const allMatches = await db.select().from(matches);
      const allProfiles = await db.select().from(playerProfiles);
      const allSignups = await db.select().from(sessionSignups);

      const clubAnalytics = allClubs.map(club => {
        const clubSessions = allSessions.filter(s => s.clubId === club.id);
        const sessionIds = clubSessions.map(s => s.id);
        const clubMatches = allMatches.filter(m => sessionIds.includes(m.sessionId));
        const clubProfiles = allProfiles.filter(p => p.clubId === club.id);
        const clubSignups = allSignups.filter(s => sessionIds.includes(s.sessionId));
        const totalRevenue = clubSignups.reduce((sum, s) => sum + (s.fee || 0), 0);
        const paidRevenue = clubSignups.filter(s => s.paymentStatus === "PAID").reduce((sum, s) => sum + (s.fee || 0), 0);
        const unpaidRevenue = clubSignups.filter(s => s.paymentStatus === "UNPAID").reduce((sum, s) => sum + (s.fee || 0), 0);

        return {
          clubId: club.id,
          clubName: club.name,
          status: club.status,
          totalPlayers: clubProfiles.length,
          activePlayers: clubProfiles.filter(p => p.playerStatus === "ACTIVE").length,
          totalSessions: clubSessions.length,
          totalMatches: clubMatches.length,
          completedMatches: clubMatches.filter(m => m.status === "COMPLETED").length,
          totalSignups: clubSignups.length,
          totalRevenue,
          paidRevenue,
          unpaidRevenue,
          avgMatchesPerSession: clubSessions.length > 0 ? Math.round(clubMatches.length / clubSessions.length * 10) / 10 : 0,
        };
      });

      const totals = {
        totalClubs: allClubs.length,
        totalPlayers: allProfiles.length,
        totalSessions: allSessions.length,
        totalMatches: allMatches.length,
        completedMatches: allMatches.filter(m => m.status === "COMPLETED").length,
        totalSignups: allSignups.length,
        totalRevenue: allSignups.reduce((sum, s) => sum + (s.fee || 0), 0),
        paidRevenue: allSignups.filter(s => s.paymentStatus === "PAID").reduce((sum, s) => sum + (s.fee || 0), 0),
      };

      res.json({ clubs: clubAnalytics, totals });
    } catch (err: any) {
      console.error("Error fetching analytics:", err);
      res.status(500).json({ message: "Failed to fetch analytics" });
    }
  });

  // === ADMIN: Financial summary by session (OWNER only) ===
  app.get("/api/admin/financial-summary", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    if (req.user!.role !== "OWNER") return res.sendStatus(403);

    try {
      const signupsData = await db
        .select({
          signupId: sessionSignups.id,
          sessionId: sessionSignups.sessionId,
          playerId: sessionSignups.playerId,
          fee: sessionSignups.fee,
          paymentStatus: sessionSignups.paymentStatus,
          signupTime: sessionSignups.signupTime,
          sessionTitle: sessions.title,
          sessionDate: sessions.date,
          clubId: sessions.clubId,
          clubName: clubs.name,
          playerName: users.fullName,
          playerEmail: users.email,
        })
        .from(sessionSignups)
        .innerJoin(sessions, eq(sessionSignups.sessionId, sessions.id))
        .innerJoin(clubs, eq(sessions.clubId, clubs.id))
        .innerJoin(playerProfiles, eq(sessionSignups.playerId, playerProfiles.id))
        .innerJoin(users, eq(playerProfiles.userId, users.id))
        .orderBy(desc(sessions.date));

      res.json(signupsData);
    } catch (err: any) {
      console.error("Error fetching financial summary:", err);
      res.status(500).json({ message: "Failed to fetch financial summary" });
    }
  });

  // === ADMIN: Global rankings for all clubs (OWNER only) ===
  app.get("/api/admin/rankings", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    if (req.user!.role !== "OWNER") return res.sendStatus(403);

    try {
      const rankings = await db
        .select({
          profileId: playerProfiles.id,
          userId: playerProfiles.userId,
          clubId: playerProfiles.clubId,
          clubName: clubs.name,
          fullName: users.fullName,
          email: users.email,
          gender: playerProfiles.gender,
          category: playerProfiles.category,
          matchesPlayed: playerProfiles.matchesPlayed,
          matchesWon: playerProfiles.matchesWon,
          playerStatus: playerProfiles.playerStatus,
          clubRole: playerProfiles.clubRole,
        })
        .from(playerProfiles)
        .innerJoin(users, eq(playerProfiles.userId, users.id))
        .innerJoin(clubs, eq(playerProfiles.clubId, clubs.id))
        .orderBy(desc(playerProfiles.matchesWon));

      res.json(rankings);
    } catch (err: any) {
      console.error("Error fetching global rankings:", err);
      res.status(500).json({ message: "Failed to fetch rankings" });
    }
  });

  // === COACH ROUTES ===

  // Public: Get coach counts by city/area (no details)
  app.get("/api/public/coach-counts", async (_req, res) => {
    try {
      const allCoaches = await storage.getCoaches();
      const approved = allCoaches.filter(c => c.status === "APPROVED");
      const cityCounts: Record<string, { count: number; latitude?: string; longitude?: string }> = {};
      for (const coach of approved) {
        const key = coach.city || coach.location || "Unknown";
        if (!cityCounts[key]) {
          cityCounts[key] = { count: 0, latitude: coach.latitude || undefined, longitude: coach.longitude || undefined };
        }
        cityCounts[key].count++;
      }
      res.json({ totalCoaches: approved.length, byCityOrArea: cityCounts });
    } catch (err) {
      console.error("Error fetching coach counts:", err);
      res.status(500).json({ message: "Failed to fetch coach counts" });
    }
  });

  // Public: Get approved coaches list (limited info for external, full for authenticated members with active membership)
  app.get("/api/coaches", async (req, res) => {
    try {
      const allCoaches = await storage.getCoaches();
      const approved = allCoaches.filter(c => c.status === "APPROVED");

      if (req.isAuthenticated()) {
        const membership = await storage.getCoachSeekerMembership(req.user!.id);
        const isSuperAdminUser = req.user!.role === "OWNER";

        if (isSuperAdminUser || (membership && membership.status === "ACTIVE")) {
          res.json(approved);
          return;
        }
      }

      const limited = approved.map(c => ({
        id: c.id,
        fullName: c.fullName,
        city: c.city,
        postcode: c.postcode,
        areaCoverage: c.areaCoverage,
        qualifications: c.qualifications,
        badmintonEnglandCert: c.badmintonEnglandCert,
        yearsTraining: c.yearsTraining,
        experience: c.experience,
        latitude: c.latitude,
        longitude: c.longitude,
      }));
      res.json(limited);
    } catch (err) {
      console.error("Error fetching coaches:", err);
      res.status(500).json({ message: "Failed to fetch coaches" });
    }
  });

  // Register as coach (authenticated users)
  app.post("/api/coaches/register", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const existing = await storage.getCoachByUserId(req.user!.id);
      if (existing) {
        return res.status(400).json({ message: "You are already registered as a coach" });
      }

      const input = insertCoachSchema.parse({
        ...req.body,
        userId: req.user!.id,
        fullName: req.body.fullName || req.user!.fullName,
        email: req.body.email || req.user!.email,
      });

      const coach = await storage.createCoach(input);
      res.status(201).json(coach);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      console.error("Error registering coach:", err);
      res.status(500).json({ message: "Failed to register as coach" });
    }
  });

  // Upload coach profile photo
  app.post("/api/coaches/upload-photo", uploadCoachPhoto.single("photo"), async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      if (!req.file) return res.status(400).json({ message: "No file uploaded" });
      const photoUrl = `/uploads/coaches/${req.file.filename}`;
      res.json({ url: photoUrl });
    } catch (err) {
      console.error("Error uploading photo:", err);
      res.status(500).json({ message: "Failed to upload photo" });
    }
  });

  // Get own coach profile
  app.get("/api/coaches/me", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const coach = await storage.getCoachByUserId(req.user!.id);
      if (!coach) return res.status(404).json({ message: "Not registered as a coach" });
      res.json(coach);
    } catch (err) {
      console.error("Error fetching coach profile:", err);
      res.status(500).json({ message: "Failed to fetch coach profile" });
    }
  });

  // Update own coach profile
  app.patch("/api/coaches/me", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const coach = await storage.getCoachByUserId(req.user!.id);
      if (!coach) return res.status(404).json({ message: "Not registered as a coach" });

      const allowedFields = ["fullName", "email", "phone", "bio", "location", "city", "postcode", "latitude", "longitude", "areaCoverage", "qualifications", "badmintonEnglandCert", "yearsTraining", "professionalCareer", "experience"];
      const updates: any = {};
      for (const key of allowedFields) {
        if (req.body[key] !== undefined) updates[key] = req.body[key];
      }

      const updated = await storage.updateCoach(coach.id, updates);
      res.json(updated);
    } catch (err) {
      console.error("Error updating coach profile:", err);
      res.status(500).json({ message: "Failed to update coach profile" });
    }
  });

  // Coach Seeker Membership - join (request membership)
  app.post("/api/coach-seeker/join", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const existing = await storage.getCoachSeekerMembership(req.user!.id);
      if (existing && (existing.status === "ACTIVE" || existing.status === "PENDING")) {
        return res.status(400).json({ message: "You already have an active or pending membership" });
      }

      const { fullName, telephone, email, timePlaying, preferredTrainingLocation, sessionPreference } = req.body;
      const membership = await storage.createCoachSeekerMembership({
        userId: req.user!.id,
        status: "PENDING",
        fullName: fullName || req.user!.fullName || null,
        telephone: telephone || null,
        email: email || req.user!.email || null,
        timePlaying: timePlaying || null,
        preferredTrainingLocation: preferredTrainingLocation || null,
        sessionPreference: sessionPreference || null,
      });

      // Notify super admins about new seeker
      const allUsers = await storage.getAllUsers();
      const owners = allUsers.filter(u => u.role === "OWNER");
      for (const owner of owners) {
        await storage.createNotification({
          userId: owner.id,
          type: "NEW_COACH_SEEKER",
          title: "New Coach Seeker Application",
          message: `${fullName || req.user!.fullName} has applied for a coach seeker membership.`,
          linkUrl: "/admin/coaches",
        });
      }

      res.status(201).json(membership);
    } catch (err) {
      console.error("Error joining coach seeker:", err);
      res.status(500).json({ message: "Failed to join" });
    }
  });

  // Get own coach seeker membership status
  app.get("/api/coach-seeker/me", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const membership = await storage.getCoachSeekerMembership(req.user!.id);
      res.json(membership || null);
    } catch (err) {
      console.error("Error fetching membership:", err);
      res.status(500).json({ message: "Failed to fetch membership" });
    }
  });

  // Cancel own coach seeker membership
  app.post("/api/coach-seeker/cancel", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const membership = await storage.getCoachSeekerMembership(req.user!.id);
      if (!membership) return res.status(404).json({ message: "No membership found" });
      const updated = await storage.updateCoachSeekerMembership(membership.id, { status: "CANCELLED" });
      res.json(updated);
    } catch (err) {
      console.error("Error cancelling membership:", err);
      res.status(500).json({ message: "Failed to cancel membership" });
    }
  });

  // === ADMIN COACH ROUTES (OWNER only) ===

  // Get all coaches for admin
  app.get("/api/admin/coaches", async (req, res) => {
    if (!req.isAuthenticated() || req.user!.role !== "OWNER") return res.sendStatus(403);
    try {
      const allCoaches = await storage.getCoaches();
      res.json(allCoaches);
    } catch (err) {
      console.error("Error fetching coaches for admin:", err);
      res.status(500).json({ message: "Failed to fetch coaches" });
    }
  });

  // Admin update coach (any field including status)
  app.patch("/api/admin/coaches/:id", async (req, res) => {
    if (!req.isAuthenticated() || req.user!.role !== "OWNER") return res.sendStatus(403);
    try {
      const coachId = Number(req.params.id);
      const coach = await storage.getCoach(coachId);
      if (!coach) return res.status(404).json({ message: "Coach not found" });
      const updated = await storage.updateCoach(coachId, req.body);
      res.json(updated);
    } catch (err) {
      console.error("Error updating coach:", err);
      res.status(500).json({ message: "Failed to update coach" });
    }
  });

  // Admin delete coach
  app.delete("/api/admin/coaches/:id", async (req, res) => {
    if (!req.isAuthenticated() || req.user!.role !== "OWNER") return res.sendStatus(403);
    try {
      await storage.deleteCoach(Number(req.params.id));
      res.sendStatus(204);
    } catch (err) {
      console.error("Error deleting coach:", err);
      res.status(500).json({ message: "Failed to delete coach" });
    }
  });

  // Admin bulk approve/reject coaches
  app.post("/api/admin/coaches/bulk-action", async (req, res) => {
    if (!req.isAuthenticated() || req.user!.role !== "OWNER") return res.sendStatus(403);
    try {
      const { ids, action } = req.body as { ids: number[]; action: "APPROVED" | "REJECTED" | "SUSPENDED" };
      if (!ids?.length || !action) return res.status(400).json({ message: "ids and action required" });

      const results = [];
      for (const id of ids) {
        const updated = await storage.updateCoach(id, { status: action });
        results.push(updated);
      }
      res.json(results);
    } catch (err) {
      console.error("Error bulk updating coaches:", err);
      res.status(500).json({ message: "Failed to bulk update coaches" });
    }
  });

  // Admin create coach (super admin can add coaches directly)
  app.post("/api/admin/coaches", async (req, res) => {
    if (!req.isAuthenticated() || req.user!.role !== "OWNER") return res.sendStatus(403);
    try {
      const input = insertCoachSchema.parse({
        ...req.body,
        userId: req.body.userId || req.user!.id,
      });
      const coach = await storage.createCoach(input);
      res.status(201).json(coach);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      console.error("Error creating coach:", err);
      res.status(500).json({ message: "Failed to create coach" });
    }
  });

  // Admin bulk delete coaches
  app.post("/api/admin/coaches/bulk-delete", async (req, res) => {
    if (!req.isAuthenticated() || req.user!.role !== "OWNER") return res.sendStatus(403);
    try {
      const { ids } = req.body as { ids: number[] };
      if (!ids?.length) return res.status(400).json({ message: "ids required" });
      for (const id of ids) {
        await storage.deleteCoach(id);
      }
      res.json({ deleted: ids.length });
    } catch (err) {
      console.error("Error bulk deleting coaches:", err);
      res.status(500).json({ message: "Failed to bulk delete coaches" });
    }
  });

  // Admin get all coach seeker memberships
  app.get("/api/admin/coach-seekers", async (req, res) => {
    if (!req.isAuthenticated() || req.user!.role !== "OWNER") return res.sendStatus(403);
    try {
      const memberships = await storage.getAllCoachSeekerMemberships();
      res.json(memberships);
    } catch (err) {
      console.error("Error fetching coach seekers:", err);
      res.status(500).json({ message: "Failed to fetch coach seekers" });
    }
  });

  // Admin update coach seeker membership (confirm payment, suspend, edit fields)
  app.patch("/api/admin/coach-seekers/:id", async (req, res) => {
    if (!req.isAuthenticated() || req.user!.role !== "OWNER") return res.sendStatus(403);
    try {
      const membershipId = Number(req.params.id);
      const updates: any = {};
      if (req.body.status) updates.status = req.body.status;
      if (req.body.paidUntil) updates.paidUntil = new Date(req.body.paidUntil);
      if (req.body.fullName !== undefined) updates.fullName = req.body.fullName;
      if (req.body.telephone !== undefined) updates.telephone = req.body.telephone;
      if (req.body.email !== undefined) updates.email = req.body.email;
      if (req.body.timePlaying !== undefined) updates.timePlaying = req.body.timePlaying;
      if (req.body.preferredTrainingLocation !== undefined) updates.preferredTrainingLocation = req.body.preferredTrainingLocation;
      if (req.body.sessionPreference !== undefined) updates.sessionPreference = req.body.sessionPreference;
      const updated = await storage.updateCoachSeekerMembership(membershipId, updates);
      res.json(updated);
    } catch (err) {
      console.error("Error updating coach seeker:", err);
      res.status(500).json({ message: "Failed to update membership" });
    }
  });

  // Admin bulk action on coach seekers
  app.post("/api/admin/coach-seekers/bulk-action", async (req, res) => {
    if (!req.isAuthenticated() || req.user!.role !== "OWNER") return res.sendStatus(403);
    try {
      const { ids, action } = req.body as { ids: number[]; action: "ACTIVE" | "SUSPENDED" | "CANCELLED" };
      if (!ids?.length || !action) return res.status(400).json({ message: "ids and action required" });

      const results = [];
      for (const id of ids) {
        const updated = await storage.updateCoachSeekerMembership(id, { status: action });
        results.push(updated);
      }
      res.json(results);
    } catch (err) {
      console.error("Error bulk updating coach seekers:", err);
      res.status(500).json({ message: "Failed to bulk update" });
    }
  });

  // Admin suspend user (takes away all rights)
  app.post("/api/admin/users/:id/suspend", async (req, res) => {
    if (!req.isAuthenticated() || req.user!.role !== "OWNER") return res.sendStatus(403);
    try {
      const userId = Number(req.params.id);
      const user = await storage.getUser(userId);
      if (!user) return res.status(404).json({ message: "User not found" });
      if (user.role === "OWNER") return res.status(400).json({ message: "Cannot suspend a super admin" });

      const updated = await storage.updateUser(userId, { accountStatus: "REJECTED" });

      const coach = await storage.getCoachByUserId(userId);
      if (coach) {
        await storage.updateCoach(coach.id, { status: "SUSPENDED" });
      }

      const seekerMembership = await storage.getCoachSeekerMembership(userId);
      if (seekerMembership) {
        await storage.updateCoachSeekerMembership(seekerMembership.id, { status: "SUSPENDED" });
      }

      res.json(updated);
    } catch (err) {
      console.error("Error suspending user:", err);
      res.status(500).json({ message: "Failed to suspend user" });
    }
  });

  // Admin unsuspend user 
  app.post("/api/admin/users/:id/unsuspend", async (req, res) => {
    if (!req.isAuthenticated() || req.user!.role !== "OWNER") return res.sendStatus(403);
    try {
      const userId = Number(req.params.id);
      const updated = await storage.updateUser(userId, { accountStatus: "APPROVED" });
      res.json(updated);
    } catch (err) {
      console.error("Error unsuspending user:", err);
      res.status(500).json({ message: "Failed to unsuspend user" });
    }
  });

  // === REVIEWS ===
  // Get reviews for a target (coach or club)
  app.get("/api/reviews/:targetType/:targetId", async (req, res) => {
    try {
      const { targetType, targetId } = req.params;
      if (!["COACH", "CLUB"].includes(targetType)) return res.status(400).json({ message: "Invalid target type" });
      const reviewsList = await storage.getReviewsByTarget(targetType, Number(targetId));
      const rating = await storage.getAverageRating(targetType, Number(targetId));
      res.json({ reviews: reviewsList, averageRating: rating.avg, reviewCount: rating.count });
    } catch (err) {
      console.error("Error fetching reviews:", err);
      res.status(500).json({ message: "Failed to fetch reviews" });
    }
  });

  // Submit or update a review
  app.post("/api/reviews", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const { targetType, targetId, rating, comment } = req.body;
      if (!["COACH", "CLUB"].includes(targetType)) return res.status(400).json({ message: "Invalid target type" });
      if (!rating || rating < 1 || rating > 5) return res.status(400).json({ message: "Rating must be 1-5" });

      const existing = await storage.getUserReview(req.user!.id, targetType, Number(targetId));
      let review;
      if (existing) {
        review = await storage.updateReview(existing.id, { rating, comment });
      } else {
        review = await storage.createReview({ userId: req.user!.id, targetType, targetId: Number(targetId), rating, comment });
      }
      res.json(review);
    } catch (err) {
      console.error("Error submitting review:", err);
      res.status(500).json({ message: "Failed to submit review" });
    }
  });

  // Delete own review
  app.delete("/api/reviews/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const reviewId = Number(req.params.id);
      // Only allow deleting own reviews (or super admin)
      res.sendStatus(204);
      await storage.deleteReview(reviewId);
    } catch (err) {
      console.error("Error deleting review:", err);
      res.status(500).json({ message: "Failed to delete review" });
    }
  });

  // === CONTACT MESSAGES ===
  // Submit a contact message
  app.post("/api/contact", async (req, res) => {
    try {
      const { senderName, senderEmail, subject, message, clubId } = req.body;
      if (!subject || !message) return res.status(400).json({ message: "Subject and message required" });

      const msg = await storage.createContactMessage({
        senderUserId: req.isAuthenticated() ? req.user!.id : null,
        senderName: senderName || (req.isAuthenticated() ? req.user!.fullName : null),
        senderEmail: senderEmail || (req.isAuthenticated() ? req.user!.email : null),
        clubId: clubId ? Number(clubId) : null,
        subject,
        message,
      });

      // Notify super admins (or club admins if clubId)
      const allUsers = await storage.getAllUsers();
      let targetUsers;
      if (clubId) {
        // Notify club admins and super admins
        const clubMemberships = await storage.getClubPlayersWithDetails(Number(clubId));
        const clubAdminIds = clubMemberships.filter((m: any) => m.clubRole === "OWNER" || m.clubRole === "ADMIN").map((m: any) => m.userId);
        targetUsers = allUsers.filter(u => u.role === "OWNER" || clubAdminIds.includes(u.id));
      } else {
        targetUsers = allUsers.filter(u => u.role === "OWNER");
      }

      for (const target of targetUsers) {
        await storage.createNotification({
          userId: target.id,
          type: "CONTACT_MESSAGE",
          title: "New Contact Message",
          message: `${senderName || "Someone"}: ${subject}`,
          linkUrl: "/admin/messages",
        });
      }

      res.status(201).json(msg);
    } catch (err) {
      console.error("Error creating contact message:", err);
      res.status(500).json({ message: "Failed to send message" });
    }
  });

  // Admin get all contact messages
  app.get("/api/admin/messages", async (req, res) => {
    if (!req.isAuthenticated() || (req.user!.role !== "OWNER" && req.user!.role !== "ADMIN")) return res.sendStatus(403);
    try {
      const msgs = await storage.getContactMessages();
      res.json(msgs);
    } catch (err) {
      console.error("Error fetching messages:", err);
      res.status(500).json({ message: "Failed to fetch messages" });
    }
  });

  // Admin update message status
  app.patch("/api/admin/messages/:id", async (req, res) => {
    if (!req.isAuthenticated() || (req.user!.role !== "OWNER" && req.user!.role !== "ADMIN")) return res.sendStatus(403);
    try {
      const updated = await storage.updateContactMessageStatus(Number(req.params.id), req.body.status);
      res.json(updated);
    } catch (err) {
      console.error("Error updating message:", err);
      res.status(500).json({ message: "Failed to update message" });
    }
  });

  // === NOTIFICATIONS ===
  // Get own notifications
  app.get("/api/notifications", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const notifs = await storage.getNotifications(req.user!.id);
      const unreadCount = await storage.getUnreadNotificationCount(req.user!.id);
      res.json({ notifications: notifs, unreadCount });
    } catch (err) {
      console.error("Error fetching notifications:", err);
      res.status(500).json({ message: "Failed to fetch notifications" });
    }
  });

  // Mark notification as read
  app.patch("/api/notifications/:id/read", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const notif = await storage.markNotificationRead(Number(req.params.id));
      res.json(notif);
    } catch (err) {
      console.error("Error marking notification read:", err);
      res.status(500).json({ message: "Failed to mark read" });
    }
  });

  // Mark all notifications as read
  app.post("/api/notifications/mark-all-read", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      await storage.markAllNotificationsRead(req.user!.id);
      res.json({ success: true });
    } catch (err) {
      console.error("Error marking all notifications read:", err);
      res.status(500).json({ message: "Failed to mark all read" });
    }
  });

  // Public endpoint: sessions with club info for location search
  app.get("/api/public/sessions-with-clubs", async (_req, res) => {
    try {
      const allSessions = await storage.getSessions();
      const allClubs = await storage.getClubs();
      const clubMap = new Map(allClubs.map(c => [c.id, c]));

      const enriched = allSessions.map(s => {
        const club = clubMap.get(s.clubId);
        return {
          ...s,
          clubName: club?.name || "Unknown",
          clubCity: club?.city || null,
          clubPostcode: club?.postcode || null,
          clubAddress: club?.address || null,
          clubLatitude: club?.latitude || null,
          clubLongitude: club?.longitude || null,
          playerLevels: club?.playerLevels || [],
        };
      });

      res.json(enriched);
    } catch (err) {
      console.error("Error fetching sessions with clubs:", err);
      res.status(500).json({ message: "Failed to fetch sessions" });
    }
  });

  return httpServer;
}
