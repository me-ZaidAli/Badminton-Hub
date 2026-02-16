import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import { db } from "./db";
import { users, sessionSignups, playerProfiles, clubs, sessions, matches, coaches, coachSeekerMemberships, insertCoachSchema, notifications, creditLedger, membershipPlans, clubMemberships, membershipRequests, merchandise, merchandiseOrders, inventoryItems, inventoryMovements, expenses, internalMessages, recurringEvents, insertRecurringEventSchema, insertSessionSchema } from "@shared/schema";
import { eq, and, sql, desc, inArray, or, isNotNull, gt, gte, lte, like, ilike, sum } from "drizzle-orm";
import { api } from "@shared/routes";
import { z } from "zod";
import { matchModeEnum } from "@shared/schema";
import { scrypt, randomBytes } from "crypto";
import { promisify } from "util";
import { listCalendars, listUpcomingEvents } from "./google-calendar";
import { canPerform, isSuperAdmin, log_rbac } from "./rbac";
import { generateSmartMatches, buildPairingHistory, replacePlayerInQueuedMatches } from "./matchEngine";
import { evaluateClubGrades, computePlayerGradingStats, evaluatePlayerGrade } from "./grading";
import { ensureOwnerProfilesInAllClubs, ensureAllOwnersInClub } from "./ownerSync";
import multer from "multer";
import path from "path";
import fs from "fs";

function extractFixedPairs(signups: any[]): [number, number][] {
  const pairGroups = new Map<number, number[]>();
  for (const s of signups) {
    const pgId = s.pairGroupId;
    if (pgId != null) {
      if (!pairGroups.has(pgId)) pairGroups.set(pgId, []);
      pairGroups.get(pgId)!.push(s.player.id);
    }
  }
  const pairs: [number, number][] = [];
  for (const [, playerIds] of pairGroups) {
    if (playerIds.length === 2) {
      pairs.push([playerIds[0], playerIds[1]]);
    }
  }
  return pairs;
}

const scryptAsync = promisify(scrypt);

const uploadsDir = path.join(process.cwd(), "public", "uploads", "coaches");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
const profileUploadsDir = path.join(process.cwd(), "public", "uploads", "profiles");
if (!fs.existsSync(profileUploadsDir)) {
  fs.mkdirSync(profileUploadsDir, { recursive: true });
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

const profilePhotoStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, profileUploadsDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname) || ".jpg";
    cb(null, `profile-${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`);
  },
});
const uploadProfilePhoto = multer({
  storage: profilePhotoStorage,
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

async function comparePasswords(supplied: string, stored: string | null | undefined) {
  if (!stored || !stored.includes(".")) return false;
  const [hashed, salt] = stored.split(".");
  if (!salt) return false;
  const buf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return buf.toString("hex") === hashed;
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
      accountStatus: "APPROVED" as any
    } as any);

    await storage.createPlayerProfile({
      userId: admin.id,
      clubId: 1, // Default club
      gender: "MALE",
      category: "A",
      membershipId: null
    });

    await storage.createSession({
      clubId: 1,
      title: "Friday Night Social",
      date: new Date(Date.now() + 86400000 * 5),
      startTime: "19:00",
      durationMinutes: 120,
      maxPlayers: 24,
      courtsAvailable: 4,
      allowedCategories: ["A", "B", "C", "D"],
      matchMode: "SOCIAL",
      isPrivate: false,
      createdBy: admin.id,
      genderRestriction: "ALL",
      sessionType: "OPEN",
      playersPerSide: 2,
      matchGenderType: "MIXED"
    } as any);
    
    console.log("Database seeded!");
  }

  // Ensure super admin account exists with correct credentials
  const superAdminEmail = "Bpgbirmingham@gmail.com";
  const superAdminPassword = "SuperAdmin123!";
  let superAdmin = await storage.getUserByUsername(superAdminEmail);
  if (!superAdmin) {
    console.log("Creating super admin account...");
    const hashedPassword = await hashPassword(superAdminPassword);
    superAdmin = await storage.createUser({
      fullName: "Super Admin",
      email: superAdminEmail,
      password: hashedPassword,
      role: "OWNER",
      accountStatus: "APPROVED"
    });
    console.log("Super admin account created!");
  } else {
    const updates: any = {};
    if ((superAdmin as any).role !== "OWNER") {
      updates.role = "OWNER";
    }
    if ((superAdmin as any).accountStatus !== "APPROVED") {
      updates.accountStatus = "APPROVED";
    }
    const passwordValid = await comparePasswords(superAdminPassword, superAdmin.password);
    if (!passwordValid) {
      updates.password = await hashPassword(superAdminPassword);
      console.log("Super admin password reset to default.");
    }
    if (Object.keys(updates).length > 0) {
      await storage.updateUser((superAdmin as any).id, updates);
      console.log("Super admin account updated:", Object.keys(updates).join(", "));
    }
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
          ["OWNER", "ADMIN"].includes(p.clubRole)
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
      
      const { fullName, gender } = req.body;
      
      if (fullName && typeof fullName === 'string') {
        await db.update(users).set({ fullName: fullName.trim() }).where(eq(users.id, req.user!.id));
      }
      
      if (gender) {
        await storage.updatePlayerProfile(profileId, { 
          gender: gender || undefined,
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

      try { await ensureAllOwnersInClub(club.id); } catch (e) { console.error("[SYNC] Error syncing owners to new club:", e); }

      res.status(201).json(club);
    } catch (err: any) {
      console.error("Error creating club:", err);
      res.status(500).json({ message: err.message || "Failed to create club" });
    }
  });

  app.patch("/api/user/profile", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const { fullName, phone, dateOfBirth, city, country, region, continent, nickname, showPublicName } = req.body;
      const updates: any = {};
      if (fullName && typeof fullName === 'string' && fullName.trim().length >= 2) {
        updates.fullName = fullName.trim();
      }
      if (phone !== undefined) updates.phone = phone || null;
      if (dateOfBirth !== undefined) updates.dateOfBirth = dateOfBirth ? new Date(dateOfBirth) : null;
      if (city !== undefined) updates.city = city || null;
      if (country !== undefined) updates.country = country || null;
      if (region !== undefined) updates.region = region || null;
      if (continent !== undefined) updates.continent = continent || null;
      if (nickname !== undefined) updates.nickname = nickname ? nickname.trim() : null;
      if (showPublicName !== undefined) updates.showPublicName = !!showPublicName;
      if (req.body.displayMode !== undefined) updates.displayMode = req.body.displayMode;
      if (req.body.reducedMotion !== undefined) updates.reducedMotion = !!req.body.reducedMotion;

      if (Object.keys(updates).length === 0) {
        return res.status(400).json({ message: "No valid fields to update" });
      }

      const updated = await storage.updateUser(req.user!.id, updates);
      res.json(updated);
    } catch (err: any) {
      console.error("Error updating user profile:", err);
      res.status(500).json({ message: err.message || "Failed to update profile" });
    }
  });

  app.patch("/api/user/display-preferences", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const validModes = ["light", "dark", "sepia", "migraine", "high-contrast", "grayscale"];
      const updates: any = {};
      if (req.body.displayMode && validModes.includes(req.body.displayMode)) {
        updates.displayMode = req.body.displayMode;
      }
      if (req.body.reducedMotion !== undefined) {
        updates.reducedMotion = !!req.body.reducedMotion;
      }
      if (Object.keys(updates).length === 0) {
        return res.status(400).json({ message: "No valid preferences to update" });
      }
      const updated = await storage.updateUser(req.user!.id, updates);
      res.json({ displayMode: updated.displayMode, reducedMotion: updated.reducedMotion });
    } catch (err: any) {
      res.status(500).json({ message: err.message || "Failed to update display preferences" });
    }
  });

  app.post("/api/user/profile-picture", uploadProfilePhoto.single("photo"), async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      if (!req.file) return res.status(400).json({ message: "No image file provided" });
      const profilePictureUrl = `/uploads/profiles/${req.file.filename}`;
      await storage.updateUser(req.user!.id, { profilePictureUrl });
      res.json({ profilePictureUrl });
    } catch (err: any) {
      console.error("Error uploading profile picture:", err);
      res.status(500).json({ message: err.message || "Failed to upload profile picture" });
    }
  });

  app.post("/api/admin/users/:userId/profile-picture", uploadProfilePhoto.single("photo"), async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const role = req.user!.role;
    if (!["OWNER", "ADMIN"].includes(role)) return res.sendStatus(403);
    try {
      if (!req.file) return res.status(400).json({ message: "No image file provided" });
      const userId = Number(req.params.userId);
      const profilePictureUrl = `/uploads/profiles/${req.file.filename}`;
      await storage.updateUser(userId, { profilePictureUrl });
      res.json({ profilePictureUrl });
    } catch (err: any) {
      console.error("Error uploading admin profile picture:", err);
      res.status(500).json({ message: err.message || "Failed to upload profile picture" });
    }
  });

  app.patch("/api/admin/player-profiles/:profileId/inline", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const role = req.user!.role;
    if (!["OWNER", "ADMIN"].includes(role)) return res.sendStatus(403);

    try {
      const profileId = Number(req.params.profileId);
      const { fullName, gender, category } = req.body;

      const [profileRow] = await db.select()
        .from(playerProfiles)
        .innerJoin(users, eq(playerProfiles.userId, users.id))
        .where(eq(playerProfiles.id, profileId));
      if (!profileRow) return res.status(404).json({ message: "Player profile not found" });

      if (fullName && typeof fullName === 'string' && fullName.trim().length >= 2) {
        await db.update(users).set({ fullName: fullName.trim() }).where(eq(users.id, profileRow.users.id));
      }

      const profileUpdates: any = {};
      if (gender && ["MALE", "FEMALE"].includes(gender)) {
        profileUpdates.gender = gender;
      }
      const { grade: gradeUpdate } = req.body;
      const gradeVal = gradeUpdate || category;
      if (gradeVal) {
        const { GRADE_ORDER: GO } = await import("@shared/schema");
        if (GO.includes(gradeVal) || ["A", "B", "C", "D"].includes(gradeVal)) {
          profileUpdates.grade = gradeVal;
        }
      }
      if (Object.keys(profileUpdates).length > 0) {
        await storage.updatePlayerProfile(profileId, profileUpdates);
      }

      res.json({ success: true });
    } catch (err: any) {
      console.error("Error inline updating player profile:", err);
      res.status(500).json({ message: err.message || "Failed to update player profile" });
    }
  });

  app.get("/api/player-profiles/:profileId/grading-stats", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const profileId = Number(req.params.profileId);
      const profile = await db.select().from(playerProfiles).where(eq(playerProfiles.id, profileId)).then(r => r[0]);
      if (!profile) return res.status(404).json({ message: "Profile not found" });

      const stats = await computePlayerGradingStats(profileId, profile.clubId, profile.gradingResetAt);
      res.json(stats);
    } catch (err: any) {
      console.error("Error fetching grading stats:", err);
      res.status(500).json({ message: err.message || "Failed to fetch grading stats" });
    }
  });

  app.patch("/api/admin/player-profiles/:profileId/grade", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const role = req.user!.role;
    if (!["OWNER", "ADMIN"].includes(role)) return res.sendStatus(403);

    try {
      const profileId = Number(req.params.profileId);
      const { grade } = req.body;
      const { GRADE_ORDER } = await import("@shared/schema");

      if (!grade || !GRADE_ORDER.includes(grade)) {
        return res.status(400).json({ message: `Invalid grade. Must be one of: ${GRADE_ORDER.join(", ")}` });
      }

      await storage.updatePlayerProfile(profileId, { 
        grade, 
        gradingResetAt: new Date()
      });
      res.json({ success: true });
    } catch (err: any) {
      console.error("Error updating grade:", err);
      res.status(500).json({ message: err.message || "Failed to update grade" });
    }
  });

  app.patch("/api/admin/player-profiles/:profileId/admin-locked", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const role = req.user!.role;
    if (!["OWNER", "ADMIN"].includes(role)) return res.sendStatus(403);

    try {
      const profileId = Number(req.params.profileId);
      const { adminLocked } = req.body;

      if (typeof adminLocked !== "boolean") {
        return res.status(400).json({ message: "adminLocked must be a boolean" });
      }

      await storage.updatePlayerProfile(profileId, { adminLocked });
      res.json({ success: true });
    } catch (err: any) {
      console.error("Error updating admin lock:", err);
      res.status(500).json({ message: err.message || "Failed to update admin lock" });
    }
  });

  app.patch("/api/admin/clubs/:clubId/auto-grading", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const role = req.user!.role;
    if (!["OWNER", "ADMIN"].includes(role)) return res.sendStatus(403);

    try {
      const clubId = Number(req.params.clubId);
      const { autoGradingEnabled } = req.body;

      if (typeof autoGradingEnabled !== "boolean") {
        return res.status(400).json({ message: "autoGradingEnabled must be a boolean" });
      }

      await db.update(clubs).set({ autoGradingEnabled }).where(eq(clubs.id, clubId));
      res.json({ success: true });
    } catch (err: any) {
      console.error("Error updating auto grading:", err);
      res.status(500).json({ message: err.message || "Failed to update auto grading" });
    }
  });

  app.post("/api/admin/clubs/:clubId/evaluate-grades", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const role = req.user!.role;
    if (!["OWNER", "ADMIN"].includes(role)) return res.sendStatus(403);

    try {
      const clubId = Number(req.params.clubId);
      const changes = await evaluateClubGrades(clubId);
      res.json({ changes, count: changes.length });
    } catch (err: any) {
      console.error("Error evaluating grades:", err);
      res.status(500).json({ message: err.message || "Failed to evaluate grades" });
    }
  });

  app.get("/api/user/memberships", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const profiles = await storage.getPlayerProfilesByUser(req.user!.id);
      const memberships = profiles.map(p => ({
        clubId: (p as any).club?.id || p.clubId,
        clubName: (p as any).club?.name || "",
        membershipStatus: p.membershipStatus,
        profileId: p.id,
      }));
      res.json(memberships);
    } catch (err: any) {
      res.status(500).json({ message: "Failed to fetch memberships" });
    }
  });

  app.post("/api/clubs/join", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    try {
      const { clubId, gender: providedGender } = req.body;
      const user = req.user!;
      
      if (isSuperAdmin(user)) {
        return res.status(403).json({ message: "Super admins already have full access to all clubs. No need to join." });
      }

      if (!clubId || typeof clubId !== 'number') {
        return res.status(400).json({ message: "Club ID is required" });
      }

      if (!user.fullName || user.fullName.trim().length < 2) {
        return res.status(400).json({ message: "Please complete your profile before requesting to join a club.", code: "PROFILE_INCOMPLETE" });
      }

      let gender = providedGender;
      if (!gender || !["MALE", "FEMALE"].includes(gender)) {
        const existingProfiles = await storage.getPlayerProfilesByUser(user.id);
        const profileWithGender = existingProfiles?.find((p: any) => p.gender && ["MALE", "FEMALE"].includes(p.gender));
        gender = profileWithGender?.gender || null;
      }

      const club = await storage.getClub(clubId);
      if (!club) {
        return res.status(404).json({ message: "Club not found" });
      }

      const existingProfile = await storage.getPlayerProfile(user.id, clubId);
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
        userId: user.id,
        clubId,
        clubRole: "PLAYER",
        membershipStatus: "PENDING",
        gender: gender || null,
        category: "D",
        grade: "C3",
        membershipId: null
      });

      const profileSnapshot = [
        `Name: ${user.fullName}`,
        `Email: ${user.email}`,
        `Gender: ${gender}`,
        user.dateOfBirth ? `Date of Birth: ${new Date(user.dateOfBirth).toLocaleDateString()}` : null,
        user.city ? `City: ${user.city}` : null,
        user.region ? `Region: ${user.region}` : null,
        user.country ? `Country: ${user.country}` : null,
        user.phone ? `Phone: ${user.phone}` : null,
      ].filter(Boolean).join("\n");

      try {
        const owners = await storage.getUsersByRole("OWNER");
        const clubProfiles = await (storage as any).getClubPlayers(clubId);
        const clubAdmins = clubProfiles
          .filter((p: any) => p.profile.clubRole === "ADMIN" || p.profile.clubRole === "OWNER")
          .map((p: any) => p.profile.userId);
        
        const notifyUserIds = new Set([...owners.map(o => o.id), ...clubAdmins]);
        
        for (const notifyUserId of notifyUserIds) {
          await storage.createNotification({
            userId: notifyUserId,
            type: "JOIN_REQUEST",
            title: "New Club Join Request",
            message: `${user.fullName} has requested to join ${club.name}.\n\n${profileSnapshot}`,
            linkUrl: "/admin/approvals",
          });
        }
      } catch (notifErr) {
        console.error("[JOIN] Failed to send notifications:", notifErr);
      }

      console.log(`[JOIN] REQUEST: userId=${user.id} requested to join clubId=${clubId}`);
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

          const sanitizePlayer = (p: any) => {
            if (!p) return null;
            const showPublic = p.user?.showPublicName === true;
            const displayName = showPublic
              ? (p.user?.nickname || p.user?.fullName)
              : p.user?.fullName;
            return {
              id: p.id,
              fullName: displayName,
              category: p.category,
              nameBlurred: !showPublic,
            };
          };

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
            signupCount: signups.filter((s: any) => s.signupStatus === "CONFIRMED").length,
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

      // Sanitize player names based on public visibility consent
      const getPublicDisplayName = (user: any) => {
        const showPublic = user?.showPublicName === true;
        return {
          displayName: showPublic ? (user?.nickname || user?.fullName) : user?.fullName,
          nameBlurred: !showPublic,
        };
      };

      const publicSignups = signups.map(s => {
        const { displayName, nameBlurred } = getPublicDisplayName(s.player.user);
        return {
          id: s.id,
          playerId: s.playerId,
          player: {
            id: s.player.id,
            fullName: displayName,
            category: s.player.category,
            rankingPoints: s.player.rankingPoints,
            nameBlurred,
          }
        };
      });

      const sanitizePlayer = (p: any) => {
        if (!p) return null;
        const { displayName, nameBlurred } = getPublicDisplayName(p.user);
        return {
          id: p.id,
          category: p.category,
          rankingPoints: p.rankingPoints,
          user: { fullName: displayName },
          nameBlurred,
        };
      };

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
        numberOfSets: m.numberOfSets,
        setScores: m.setScores,
        setsWonA: m.setsWonA,
        setsWonB: m.setsWonB,
        currentSet: m.currentSet,
        pointsToPlayTo: m.pointsToPlayTo,
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
      const publicLeaderboard = leaderboard.map(({ gender, showPublicName, ...rest }: any) => {
        const displayName = showPublicName ? (rest.nickname || rest.fullName) : rest.fullName;
        return {
          ...rest,
          fullName: displayName,
          nameBlurred: !showPublicName,
        };
      });
      res.json(publicLeaderboard);
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
      const isAuthenticated = !!(req as any).user;
      if (isAuthenticated) {
        res.json(leaderboard);
      } else {
        const publicLeaderboard = leaderboard.map(({ gender, ...rest }: any) => ({
          ...rest,
          nameBlurred: !rest.showPublicName,
        }));
        res.json(publicLeaderboard);
      }
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
    const user = req.user!;
    const isOwner = user.role === "OWNER";
    const isPlatformAdmin = user.role === "ADMIN";

    if (!isOwner && !isPlatformAdmin) {
      const ownedClubs = await db.select({ id: clubs.id }).from(clubs).where(eq(clubs.ownerId, user.id));
      const adminProfiles = await db.select({ clubId: playerProfiles.clubId }).from(playerProfiles)
        .where(and(eq(playerProfiles.userId, user.id), eq(playerProfiles.membershipStatus, "APPROVED"), inArray(playerProfiles.clubRole, ["ADMIN"])));
      const clubIdSet = new Set([...ownedClubs.map(c => c.id), ...adminProfiles.map(p => p.clubId)]);
      if (clubIdSet.size === 0) return res.sendStatus(403);

      const allUsers = await storage.getAllUsers();
      const scopedUsers = (allUsers as any[]).filter((u: any) =>
        u.playerProfiles?.some((p: any) => clubIdSet.has(p.clubId))
      );
      return res.json(scopedUsers);
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
      const { inviteePlayerIds, ...bodyWithoutInvitees } = req.body;
      const input = api.sessions.create.input.parse(bodyWithoutInvitees);
      
      const canAccess = await canManageSessions(req.user!.id, req.user!.role, input.clubId);
      if (!canAccess) {
        return res.sendStatus(403);
      }

      const session = await storage.createSession({ 
        ...input, 
        createdBy: req.user!.id 
      });

      if (inviteePlayerIds && Array.isArray(inviteePlayerIds) && inviteePlayerIds.length > 0) {
        try {
          const clubMembers = await storage.getClubMembers(input.clubId);
          const approvedMembers = clubMembers.filter(m => m.membershipStatus === "APPROVED");
          const club = await storage.getClub(input.clubId);
          const clubName = club?.name || "your club";
          const existingSignups = await storage.getSessionSignups(session.id);
          const existingPlayerIds = new Set(existingSignups.map(s => s.playerId));
          const selectedPlayerIds = new Set(inviteePlayerIds as number[]);
          
          for (const member of approvedMembers) {
            if (member.userId === req.user!.id) continue;
            if (existingPlayerIds.has(member.id)) continue;
            if (!selectedPlayerIds.has(member.id)) continue;
            
            try {
              await storage.createSessionSignupEnhanced({
                sessionId: session.id,
                playerId: member.id,
                fee: session.sessionFee || club?.sessionFee || 0,
                signupStatus: "INVITED",
                signedUpByUserId: req.user!.id,
              });
            } catch (signupErr) {
              console.error(`[SESSION CREATE] Failed to create invite signup for member ${member.id}:`, signupErr);
              continue;
            }
            
            await storage.createNotification({
              userId: member.userId,
              type: "SESSION_INVITE",
              title: "New Session Available",
              message: `You've been invited to "${session.title}" at ${clubName} on ${new Date(input.date).toLocaleDateString()}. Sign up now to confirm your spot!`,
              linkUrl: `/sessions/${session.id}`,
            });
          }
        } catch (inviteErr) {
          console.error("[SESSION CREATE] Failed to send invitations:", inviteErr);
        }
      }

      res.status(201).json(session);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      throw err;
    }
  });

  app.post("/api/recurring-events", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const recurringEventInput = insertRecurringEventSchema.parse(req.body.recurringEvent);
      const sessionTemplate = insertSessionSchema.parse(req.body.sessionTemplate);
      const inviteePlayerIds: number[] | undefined = req.body.inviteePlayerIds;

      const canAccess = await canManageSessions(req.user!.id, req.user!.role, recurringEventInput.clubId);
      if (!canAccess) return res.sendStatus(403);

      const isNeverEnd = recurringEventInput.neverEnd === true;

      if (!isNeverEnd && recurringEventInput.endDate) {
        if (new Date(recurringEventInput.endDate) < new Date(recurringEventInput.startDate)) {
          return res.status(400).json({ message: "End date must be after start date" });
        }
      }

      if (!isNeverEnd && !recurringEventInput.endDate) {
        return res.status(400).json({ message: "End date is required unless 'Never End' is selected" });
      }

      const MAX_OCCURRENCES = 52;
      let useOccurrenceLimit = isNeverEnd;
      let effectiveEndDate: Date | null = null;

      if (isNeverEnd) {
        useOccurrenceLimit = true;
      } else {
        effectiveEndDate = new Date(recurringEventInput.endDate!);
        let countCheck = 0;
        const checkDate = new Date(recurringEventInput.startDate);
        while (checkDate <= effectiveEndDate) {
          countCheck++;
          if (countCheck > MAX_OCCURRENCES) {
            return res.status(400).json({ message: `Too many sessions would be generated (max ${MAX_OCCURRENCES}). Please shorten the date range.` });
          }
          if (recurringEventInput.frequency === "DAILY") checkDate.setDate(checkDate.getDate() + 1);
          else if (recurringEventInput.frequency === "WEEKLY") checkDate.setDate(checkDate.getDate() + 7);
          else if (recurringEventInput.frequency === "BIWEEKLY") checkDate.setDate(checkDate.getDate() + 14);
          else checkDate.setMonth(checkDate.getMonth() + 1);
        }
      }

      const [recurringEvent] = await db.insert(recurringEvents).values({
        ...recurringEventInput,
        endDate: isNeverEnd ? null : recurringEventInput.endDate,
        createdBy: req.user!.id,
      }).returning();

      const generatedSessions: any[] = [];
      const startDate = new Date(recurringEventInput.startDate);
      let current = new Date(startDate);
      let occurrenceCount = 0;

      const publishWeeksBefore = req.body.publishWeeksBefore;

      while (true) {
        if (useOccurrenceLimit && occurrenceCount >= MAX_OCCURRENCES) break;
        if (effectiveEndDate && current > effectiveEndDate) break;
        let computedPublishAt: Date | null = null;
        if (publishWeeksBefore && publishWeeksBefore > 0) {
          const pubDate = new Date(current);
          pubDate.setDate(pubDate.getDate() - publishWeeksBefore * 7);
          computedPublishAt = pubDate;
        }
        const session = await storage.createSession({
          ...sessionTemplate,
          date: new Date(current),
          recurringEventId: recurringEvent.id,
          createdBy: req.user!.id,
          publishAt: computedPublishAt,
        });
        generatedSessions.push(session);
        occurrenceCount++;

        if (recurringEventInput.frequency === "DAILY") {
          current.setDate(current.getDate() + 1);
        } else if (recurringEventInput.frequency === "WEEKLY") {
          current.setDate(current.getDate() + 7);
        } else if (recurringEventInput.frequency === "BIWEEKLY") {
          current.setDate(current.getDate() + 14);
        } else if (recurringEventInput.frequency === "MONTHLY") {
          current.setMonth(current.getMonth() + 1);
        }
      }

      const club = await storage.getClub(recurringEventInput.clubId);
      const clubName = club?.name || "your club";
      if (inviteePlayerIds && Array.isArray(inviteePlayerIds) && inviteePlayerIds.length > 0) {
        try {
          const clubMembers = await storage.getClubMembers(recurringEventInput.clubId);
          const approvedMembers = clubMembers.filter(m => m.membershipStatus === "APPROVED");
          const selectedPlayerIds = new Set(inviteePlayerIds as number[]);
          
          for (const session of generatedSessions) {
            for (const member of approvedMembers) {
              if (member.userId === req.user!.id) continue;
              if (!selectedPlayerIds.has(member.id)) continue;
              try {
                await storage.createSessionSignupEnhanced({
                  sessionId: session.id,
                  playerId: member.id,
                  fee: session.sessionFee || club?.sessionFee || 0,
                  signupStatus: "INVITED",
                  signedUpByUserId: req.user!.id,
                });
              } catch (signupErr) {
                continue;
              }
            }
          }
          for (const member of approvedMembers) {
            if (member.userId === req.user!.id) continue;
            if (!selectedPlayerIds.has(member.id)) continue;
            await storage.createNotification({
              userId: member.userId,
              type: "SESSION_INVITE",
              title: "New Recurring Sessions",
              message: `${generatedSessions.length} recurring sessions for "${recurringEvent.title}" have been created at ${clubName}. Sign up now to confirm your spot!`,
              linkUrl: `/sessions`,
            });
          }
        } catch (inviteErr) {
          console.error("[RECURRING EVENT] Failed to send invitations:", inviteErr);
        }
      }

      res.status(201).json({ recurringEvent, sessions: generatedSessions });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      console.error("[RECURRING EVENT] Error:", err);
      res.status(500).json({ message: "Failed to create recurring event" });
    }
  });

  app.get("/api/recurring-events", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const clubId = req.query.clubId ? Number(req.query.clubId) : undefined;
    if (clubId) {
      const canAccess = await canManageSessions(req.user!.id, req.user!.role, clubId);
      if (!canAccess) return res.sendStatus(403);
      const result = await db.select().from(recurringEvents).where(eq(recurringEvents.clubId, clubId));
      return res.json(result);
    }
    if (req.user!.role !== "OWNER") {
      return res.json([]);
    }
    const result = await db.select().from(recurringEvents);
    res.json(result);
  });

  app.delete("/api/recurring-events/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const recurringEventId = Number(req.params.id);
    const [event] = await db.select().from(recurringEvents).where(eq(recurringEvents.id, recurringEventId));
    if (!event) return res.status(404).json({ message: "Recurring event not found" });

    const canAccess = await canManageSessions(req.user!.id, req.user!.role, event.clubId);
    if (!canAccess) return res.sendStatus(403);

    const fromDate = req.query.fromDate ? new Date(req.query.fromDate as string) : null;

    const linkedSessions = await db.select().from(sessions).where(eq(sessions.recurringEventId, recurringEventId));

    const sessionsToDelete = fromDate
      ? linkedSessions.filter(s => new Date(s.date) >= fromDate)
      : linkedSessions;

    for (const session of sessionsToDelete) {
      await db.delete(sessionSignups).where(eq(sessionSignups.sessionId, session.id));
      await db.delete(matches).where(eq(matches.sessionId, session.id));
      await db.delete(sessions).where(eq(sessions.id, session.id));
    }

    const remainingSessions = linkedSessions.length - sessionsToDelete.length;
    if (remainingSessions === 0) {
      await db.delete(recurringEvents).where(eq(recurringEvents.id, recurringEventId));
    }

    res.json({ deleted: sessionsToDelete.length, remaining: remainingSessions, message: `Deleted ${sessionsToDelete.length} session(s)` });
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

    const profile = await storage.getPlayerProfile(req.user!.id, session.clubId);
    if (!profile) return res.status(403).json({ message: "You must be an accepted member of this club to join this session." });

    if (profile.membershipStatus !== "APPROVED") {
      const statusMsg = profile.membershipStatus === "PENDING"
        ? "Your membership is pending approval. You cannot join sessions until approved."
        : "You must be an accepted member of this club to join this session.";
      return res.status(403).json({ message: statusMsg });
    }

    const signups = await storage.getSessionSignups(sessionId);

    const existingSignup = signups.find((s: any) => s.playerId === profile.id);
    if (existingSignup) {
      if (existingSignup.signupStatus === "CONFIRMED") {
        return res.status(400).json({ message: "You are already confirmed for this session" });
      }
      if (existingSignup.signupStatus === "WAITING") {
        return res.status(400).json({ message: "You are already on the waiting list for this session" });
      }
      const confirmedCurrent = signups.filter((s: any) => !s.signupStatus || s.signupStatus === "CONFIRMED").length;
      const sessionFull = confirmedCurrent >= session.maxPlayers;
      if (sessionFull) {
        const waitingSignups = signups.filter((s: any) => s.signupStatus === "WAITING");
        const maxPos = waitingSignups.reduce((max: number, s: any) => Math.max(max, s.waitingListPosition || 0), 0);
        const updated = await storage.updateSessionSignupStatus(existingSignup.id, {
          signupStatus: "WAITING",
          waitingListPosition: maxPos + 1,
        });
        return res.json({ ...updated, addedToWaitingList: true });
      }
      const updated = await storage.updateSessionSignupStatus(existingSignup.id, {
        signupStatus: "CONFIRMED",
        waitingListPosition: null,
      });
      return res.json(updated);
    }

    // Check private session restriction
    if (session.isPrivate) {
      const canAccess = await canManageSessions(req.user!.id, req.user!.role, session.clubId);
      if (!canAccess) {
        return res.status(400).json({ message: "This is a private session. Only admins or organisers can add players." });
      }
    }

    const confirmedCount = signups.filter((s: any) => !s.signupStatus || s.signupStatus === "CONFIRMED").length;
    const isFull = confirmedCount >= session.maxPlayers;

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

    // Check category/grade restriction
    if (session.allowedCategories && session.allowedCategories.length > 0 && session.allowedCategories.length < 9) {
      const playerGrade = profile.grade || profile.category;
      if (playerGrade && !session.allowedCategories.includes(playerGrade)) {
        return res.status(400).json({ message: `This session is only open to grades: ${session.allowedCategories.join(", ")}` });
      }
    }

    // Use session fee or club default fee or fallback to 1000 pence
    let fee = session.sessionFee;
    if (fee == null) {
      const club = await storage.getClub(session.clubId);
      fee = club?.sessionFee ?? 1000;
    }

    if (isFull) {
      const waitingSignups = signups.filter((s: any) => s.signupStatus === "WAITING");
      const maxPos = waitingSignups.reduce((max: number, s: any) => Math.max(max, s.waitingListPosition || 0), 0);
      const signup = await storage.createSessionSignupEnhanced({
        sessionId,
        playerId: profile.id,
        fee,
        signupStatus: "WAITING",
        waitingListPosition: maxPos + 1,
        signedUpByUserId: req.user!.id,
      });
      return res.status(201).json({ ...signup, addedToWaitingList: true });
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

    // Auto-promote first waiting list player
    const session = await storage.getSession(sessionId);
    if (session) {
      const allSignups = await storage.getSessionSignups(sessionId);
      const confirmedCount = allSignups.filter((s: any) => !s.signupStatus || s.signupStatus === "CONFIRMED").length;
      if (confirmedCount < session.maxPlayers) {
        const waitingPlayers = allSignups
          .filter((s: any) => s.signupStatus === "WAITING")
          .sort((a: any, b: any) => (a.waitingListPosition || 0) - (b.waitingListPosition || 0));
        if (waitingPlayers.length > 0) {
          await storage.updateSessionSignupStatus(waitingPlayers[0].id, {
            signupStatus: "CONFIRMED",
            waitingListPosition: null,
          });
        }
      }
    }

    res.sendStatus(200);
  });

  app.post("/api/sessions/:id/player-status", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const sessionId = Number(req.params.id);
    const session = await storage.getSession(sessionId);
    if (!session) return res.status(404).json({ message: "Session not found" });

    const profile = await storage.getPlayerProfile(req.user!.id, session.clubId);
    if (!profile) return res.status(403).json({ message: "You must be a member of this club." });

    const { action } = req.body;
    if (!["accept", "decline", "cancel", "join", "wait"].includes(action)) {
      return res.status(400).json({ message: "Invalid action" });
    }

    if ((session as any).publishAt && new Date((session as any).publishAt) > new Date()) {
      if (["accept", "join", "wait"].includes(action)) {
        return res.status(403).json({ message: "Signups are not yet open for this session." });
      }
    }

    const signups = await storage.getSessionSignups(sessionId);
    const existingSignup = signups.find((s: any) => s.playerId === profile.id);
    const confirmedCount = signups.filter((s: any) => !s.signupStatus || s.signupStatus === "CONFIRMED").length;
    const isFull = confirmedCount >= session.maxPlayers;

    if (action === "accept" || action === "join") {
      if (existingSignup) {
        if (existingSignup.signupStatus === "CONFIRMED") {
          return res.status(400).json({ message: "You are already confirmed." });
        }
        if (isFull && existingSignup.signupStatus !== "WAITING") {
          const waitingSignups = signups.filter((s: any) => s.signupStatus === "WAITING");
          const maxPos = waitingSignups.reduce((max: number, s: any) => Math.max(max, s.waitingListPosition || 0), 0);
          const updated = await storage.updateSessionSignupStatus(existingSignup.id, {
            signupStatus: "WAITING",
            waitingListPosition: maxPos + 1,
          });
          return res.json({ ...updated, addedToWaitingList: true });
        }
        const updated = await storage.updateSessionSignupStatus(existingSignup.id, {
          signupStatus: "CONFIRMED",
          waitingListPosition: null,
        });
        return res.json(updated);
      }
      let fee = session.sessionFee;
      if (fee == null) {
        const club = await storage.getClub(session.clubId);
        fee = club?.sessionFee ?? 1000;
      }
      if (isFull) {
        const waitingSignups = signups.filter((s: any) => s.signupStatus === "WAITING");
        const maxPos = waitingSignups.reduce((max: number, s: any) => Math.max(max, s.waitingListPosition || 0), 0);
        const signup = await storage.createSessionSignupEnhanced({
          sessionId,
          playerId: profile.id,
          fee,
          signupStatus: "WAITING",
          waitingListPosition: maxPos + 1,
          signedUpByUserId: req.user!.id,
        });
        return res.status(201).json({ ...signup, addedToWaitingList: true });
      }
      const signup = await storage.createSessionSignup(sessionId, profile.id, fee);
      return res.status(201).json(signup);
    }

    if (action === "wait") {
      if (existingSignup) {
        if (existingSignup.signupStatus === "WAITING") {
          return res.status(400).json({ message: "You are already on the waiting list." });
        }
        const waitingSignups = signups.filter((s: any) => s.signupStatus === "WAITING");
        const maxPos = waitingSignups.reduce((max: number, s: any) => Math.max(max, s.waitingListPosition || 0), 0);
        const updated = await storage.updateSessionSignupStatus(existingSignup.id, {
          signupStatus: "WAITING",
          waitingListPosition: maxPos + 1,
        });
        return res.json(updated);
      }
      let fee = session.sessionFee;
      if (fee == null) {
        const club = await storage.getClub(session.clubId);
        fee = club?.sessionFee ?? 1000;
      }
      const waitingSignups = signups.filter((s: any) => s.signupStatus === "WAITING");
      const maxPos = waitingSignups.reduce((max: number, s: any) => Math.max(max, s.waitingListPosition || 0), 0);
      const signup = await storage.createSessionSignupEnhanced({
        sessionId,
        playerId: profile.id,
        fee,
        signupStatus: "WAITING",
        waitingListPosition: maxPos + 1,
        signedUpByUserId: req.user!.id,
      });
      return res.status(201).json(signup);
    }

    if (action === "decline") {
      if (!existingSignup) {
        return res.status(400).json({ message: "You are not signed up for this session." });
      }
      const wasConfirmed = !existingSignup.signupStatus || existingSignup.signupStatus === "CONFIRMED";
      const updated = await storage.updateSessionSignupStatus(existingSignup.id, {
        signupStatus: "NOT_ATTENDING",
        waitingListPosition: null,
      });
      if (wasConfirmed) {
        const refreshedSignups = await storage.getSessionSignups(sessionId);
        const newConfirmedCount = refreshedSignups.filter((s: any) => !s.signupStatus || s.signupStatus === "CONFIRMED").length;
        if (newConfirmedCount < session.maxPlayers) {
          const waitingPlayers = refreshedSignups
            .filter((s: any) => s.signupStatus === "WAITING")
            .sort((a: any, b: any) => (a.waitingListPosition || 0) - (b.waitingListPosition || 0));
          if (waitingPlayers.length > 0) {
            await storage.updateSessionSignupStatus(waitingPlayers[0].id, {
              signupStatus: "CONFIRMED",
              waitingListPosition: null,
            });
          }
        }
      }
      return res.json(updated);
    }

    if (action === "cancel") {
      if (!existingSignup) {
        return res.status(400).json({ message: "You are not signed up for this session." });
      }
      const wasConfirmed = !existingSignup.signupStatus || existingSignup.signupStatus === "CONFIRMED";
      const updated = await storage.updateSessionSignupStatus(existingSignup.id, {
        signupStatus: "NOT_ATTENDING",
        waitingListPosition: null,
      });
      if (wasConfirmed) {
        const refreshedSignups = await storage.getSessionSignups(sessionId);
        const newConfirmedCount = refreshedSignups.filter((s: any) => !s.signupStatus || s.signupStatus === "CONFIRMED").length;
        if (newConfirmedCount < session.maxPlayers) {
          const waitingPlayers = refreshedSignups
            .filter((s: any) => s.signupStatus === "WAITING")
            .sort((a: any, b: any) => (a.waitingListPosition || 0) - (b.waitingListPosition || 0));
          if (waitingPlayers.length > 0) {
            await storage.updateSessionSignupStatus(waitingPlayers[0].id, {
              signupStatus: "CONFIRMED",
              waitingListPosition: null,
            });
          }
        }
      }
      return res.json(updated);
    }
  });

  // === JUNIOR ACCOUNTS ===
  app.get("/api/juniors", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const juniors = await storage.getJuniorAccounts(req.user!.id);
    res.json(juniors);
  });

  app.post("/api/juniors", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const { fullName, dateOfBirth, gender, emergencyContact, medicalNotes } = req.body;
      if (!fullName || fullName.trim().length === 0) {
        return res.status(400).json({ message: "Full name is required" });
      }
      const junior = await storage.createJuniorAccount(req.user!.id, {
        fullName: fullName.trim(),
        dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : undefined,
        gender,
        emergencyContact,
        medicalNotes,
      });
      res.status(201).json(junior);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.patch("/api/juniors/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const juniorId = Number(req.params.id);
      const junior = await storage.getUser(juniorId);
      if (!junior || junior.parentUserId !== req.user!.id) {
        if (req.user!.role !== "OWNER") {
          return res.status(403).json({ message: "Not authorized to edit this junior account" });
        }
      }
      const { fullName, dateOfBirth, emergencyContact, medicalNotes } = req.body;
      const updates: any = {};
      if (fullName !== undefined) updates.fullName = fullName;
      if (dateOfBirth !== undefined) updates.dateOfBirth = dateOfBirth ? new Date(dateOfBirth) : null;
      if (emergencyContact !== undefined) updates.emergencyContact = emergencyContact;
      if (medicalNotes !== undefined) updates.medicalNotes = medicalNotes;
      const updated = await storage.updateUser(juniorId, updates);
      res.json(updated);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  app.delete("/api/juniors/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const juniorId = Number(req.params.id);
      const junior = await storage.getUser(juniorId);
      if (!junior || junior.parentUserId !== req.user!.id) {
        if (req.user!.role !== "OWNER") {
          return res.status(403).json({ message: "Not authorized to delete this junior account" });
        }
      }
      await storage.deleteUserCompletely(juniorId);
      res.sendStatus(200);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // Add junior to a club (create player profile for junior in parent's club)
  app.post("/api/juniors/:id/clubs/:clubId", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const juniorId = Number(req.params.id);
      const clubId = Number(req.params.clubId);
      const junior = await storage.getUser(juniorId);
      if (!junior || junior.parentUserId !== req.user!.id) {
        if (req.user!.role !== "OWNER") {
          return res.status(403).json({ message: "Not authorized" });
        }
      }
      const existing = await storage.getPlayerProfile(juniorId, clubId);
      if (existing) {
        return res.status(400).json({ message: "Junior already has a profile in this club" });
      }
      const { gender, grade } = req.body;
      const profile = await storage.createPlayerProfile({
        userId: juniorId,
        clubId,
        clubRole: "PLAYER",
        membershipStatus: "APPROVED",
        gender: gender || undefined,
        category: "D",
        grade: grade || "C3",
      });
      res.status(201).json(profile);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  });

  // === MULTI-ATTENDEE SESSION JOIN ===
  app.post("/api/sessions/:id/join-multi", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const sessionId = Number(req.params.id);
    const session = await storage.getSession(sessionId);
    if (!session) return res.status(404).json({ message: "Session not found" });

    const { attendees } = req.body;
    if (!attendees || !Array.isArray(attendees) || attendees.length === 0) {
      return res.status(400).json({ message: "At least one attendee is required" });
    }

    const signups = await storage.getSessionSignups(sessionId);
    const confirmedCount = signups.filter(s => (s as any).signupStatus !== "CANCELLED").length;
    let fee = session.sessionFee;
    if (fee == null) {
      const club = await storage.getClub(session.clubId);
      fee = club?.sessionFee ?? 1000;
    }

    const results: any[] = [];
    const errors: string[] = [];

    for (const attendee of attendees) {
      const { userId, paymentMethod } = attendee;
      if (!paymentMethod || !["CARD", "BANK_TRANSFER", "NONE"].includes(paymentMethod)) {
        errors.push(`${userId}: Payment method required (CARD, BANK_TRANSFER, or NONE)`);
        continue;
      }

      const targetUser = await storage.getUser(userId);
      if (!targetUser) {
        errors.push(`${userId}: User not found`);
        continue;
      }

      if (targetUser.id !== req.user!.id && targetUser.parentUserId !== req.user!.id) {
        if (req.user!.role !== "OWNER") {
          errors.push(`${targetUser.fullName}: Not authorized to sign up this user`);
          continue;
        }
      }

      const profile = await storage.getPlayerProfile(userId, session.clubId);
      if (!profile) {
        errors.push(`${targetUser.fullName}: Not a member of this club`);
        continue;
      }

      if (profile.membershipStatus !== "APPROVED") {
        errors.push(`${targetUser.fullName}: Membership not approved`);
        continue;
      }

      const alreadySignedUp = signups.some(s => s.playerId === profile.id);
      if (alreadySignedUp) {
        errors.push(`${targetUser.fullName}: Already signed up`);
        continue;
      }

      if (session.genderRestriction === "FEMALE_ONLY" && profile.gender !== "FEMALE") {
        errors.push(`${targetUser.fullName}: This session is for female players only`);
        continue;
      }

      const currentConfirmed = confirmedCount + results.filter(r => r.signupStatus === "CONFIRMED").length;
      const isFull = currentConfirmed >= session.maxPlayers;

      const signup = await storage.createSessionSignupEnhanced({
        sessionId,
        playerId: profile.id,
        fee,
        paymentMethod,
        signupStatus: isFull ? "WAITING" : "CONFIRMED",
        waitingListPosition: isFull ? currentConfirmed - session.maxPlayers + 1 : undefined,
        signedUpByUserId: req.user!.id,
      });

      results.push({ ...signup, userName: targetUser.fullName });
    }

    res.status(201).json({ signups: results, errors });
  });

  // === MANAGE PLAYERS (Admin) ===
  app.get("/api/sessions/:id/manage-players", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const sessionId = Number(req.params.id);
    const session = await storage.getSession(sessionId);
    if (!session) return res.status(404).json({ message: "Session not found" });

    const canAccess = await hasAdminAccess(req.user!.id, req.user!.role, session.clubId);
    if (!canAccess) return res.sendStatus(403);

    const signups = await storage.getSessionSignups(sessionId);
    const confirmed = signups.filter((s: any) => !s.signupStatus || s.signupStatus === "CONFIRMED");
    const waiting = signups.filter((s: any) => s.signupStatus === "WAITING");
    const invited = signups.filter((s: any) => s.signupStatus === "INVITED");
    const notAttending = signups.filter((s: any) => s.signupStatus === "NOT_ATTENDING");
    const cancelled = signups.filter((s: any) => s.signupStatus === "CANCELLED");

    const paidCount = confirmed.filter((s: any) => s.paymentStatus === "PAID").length;
    const pendingCount = confirmed.filter((s: any) => s.paymentStatus === "PENDING").length;
    const unpaidCount = confirmed.filter((s: any) => s.paymentStatus === "UNPAID").length;
    const cashCount = confirmed.filter((s: any) => s.paymentMethod === "CASH").length;
    const onlineCount = confirmed.filter((s: any) => s.paymentMethod === "ONLINE").length;
    const cardCount = confirmed.filter((s: any) => s.paymentMethod === "CARD").length;
    const bankTransferCount = confirmed.filter((s: any) => s.paymentMethod === "BANK_TRANSFER").length;
    const membershipCreditCount = confirmed.filter((s: any) => s.paymentMethod === "MEMBERSHIP_CREDIT").length;

    const totalCollected = confirmed
      .filter((s: any) => s.paymentStatus === "PAID")
      .reduce((sum: number, s: any) => sum + (s.fee || 0), 0);

    res.json({
      summary: {
        totalAttendees: confirmed.length,
        paid: paidCount,
        pendingBankTransfer: pendingCount,
        unpaid: unpaidCount,
        cashPayments: cashCount,
        onlinePayments: onlineCount,
        cardPayments: cardCount,
        bankTransfers: bankTransferCount,
        membershipCredits: membershipCreditCount,
        waitingListCount: waiting.length,
        invitedCount: invited.length,
        notAttendingCount: notAttending.length,
        totalCollected,
      },
      confirmed,
      waiting: waiting.sort((a: any, b: any) => (a.waitingListPosition || 0) - (b.waitingListPosition || 0)),
      invited,
      notAttending,
      cancelled,
    });
  });

  // Admin: Update signup payment status
  app.patch("/api/sessions/:sessionId/signups/:signupId/payment-override", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const sessionId = Number(req.params.sessionId);
    const signupId = Number(req.params.signupId);
    const session = await storage.getSession(sessionId);
    if (!session) return res.status(404).json({ message: "Session not found" });

    const canAccess = await hasAdminAccess(req.user!.id, req.user!.role, session.clubId);
    if (!canAccess) return res.sendStatus(403);

    const { paymentStatus, paymentMethod, verifiedByAdmin, adminNotes, paymentNotes } = req.body;
    const updated = await storage.updateSessionSignupPayment(signupId, {
      paymentStatus,
      paymentMethod,
      verifiedByAdmin,
      adminNotes,
      paymentNotes,
    });
    res.json(updated);
  });

  // Admin: Move player between lists (confirm/waiting/cancel/invited/not_attending)
  app.patch("/api/sessions/:sessionId/signups/:signupId/status", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const sessionId = Number(req.params.sessionId);
    const signupId = Number(req.params.signupId);
    const session = await storage.getSession(sessionId);
    if (!session) return res.status(404).json({ message: "Session not found" });

    const canAccess = await hasAdminAccess(req.user!.id, req.user!.role, session.clubId);
    if (!canAccess) return res.sendStatus(403);

    let { signupStatus } = req.body;

    const allSignups = await storage.getSessionSignups(sessionId);
    const existingSignup = allSignups.find((s: any) => s.id === signupId);
    if (!existingSignup) return res.status(404).json({ message: "Signup not found" });

    const wasConfirmed = !existingSignup.signupStatus || existingSignup.signupStatus === "CONFIRMED";
    const isLeavingConfirmed = wasConfirmed && signupStatus !== "CONFIRMED";

    let newWaitingPosition: number | null = null;

    if (signupStatus === "WAITING") {
      const waitingPlayers = allSignups.filter((s: any) => s.signupStatus === "WAITING");
      const maxPos = waitingPlayers.reduce((max: number, s: any) => Math.max(max, s.waitingListPosition || 0), 0);
      newWaitingPosition = maxPos + 1;
    }

    if (signupStatus === "CONFIRMED") {
      const confirmedCount = allSignups.filter((s: any) => (!s.signupStatus || s.signupStatus === "CONFIRMED") && s.id !== signupId).length;
      if (session.maxPlayers && confirmedCount >= session.maxPlayers) {
        signupStatus = "WAITING";
        const waitingPlayers = allSignups.filter((s: any) => s.signupStatus === "WAITING");
        const maxPos = waitingPlayers.reduce((max: number, s: any) => Math.max(max, s.waitingListPosition || 0), 0);
        newWaitingPosition = maxPos + 1;
      }
    }

    const updated = await storage.updateSessionSignupStatus(signupId, {
      signupStatus,
      waitingListPosition: newWaitingPosition,
    });

    if (isLeavingConfirmed && signupStatus !== "WAITING") {
      const refreshedSignups = await storage.getSessionSignups(sessionId);
      const confirmedCount = refreshedSignups.filter((s: any) => !s.signupStatus || s.signupStatus === "CONFIRMED").length;
      if (!session.maxPlayers || confirmedCount < session.maxPlayers) {
        const waitingPlayers = refreshedSignups
          .filter((s: any) => s.signupStatus === "WAITING")
          .sort((a: any, b: any) => (a.waitingListPosition || 0) - (b.waitingListPosition || 0));
        if (waitingPlayers.length > 0) {
          await storage.updateSessionSignupStatus(waitingPlayers[0].id, {
            signupStatus: "CONFIRMED",
            waitingListPosition: null,
          });
        }
      }
    }

    res.json({ ...updated, actualStatus: signupStatus });
  });

  app.delete("/api/sessions/:sessionId/signups/:signupId", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const sessionId = Number(req.params.sessionId);
    const signupId = Number(req.params.signupId);
    const session = await storage.getSession(sessionId);
    if (!session) return res.status(404).json({ message: "Session not found" });

    const canAccess = await hasAdminAccess(req.user!.id, req.user!.role, session.clubId);
    if (!canAccess) return res.sendStatus(403);

    try {
      const allSignups = await storage.getSessionSignups(sessionId);
      const signup = allSignups.find((s: any) => s.id === signupId);
      if (!signup) return res.status(404).json({ message: "Signup not found" });

      const wasConfirmed = !signup.signupStatus || signup.signupStatus === "CONFIRMED";

      await db.delete(sessionSignups).where(eq(sessionSignups.id, signupId));

      if (wasConfirmed) {
        const refreshedSignups = await storage.getSessionSignups(sessionId);
        const confirmedCount = refreshedSignups.filter((s: any) => !s.signupStatus || s.signupStatus === "CONFIRMED").length;
        if (confirmedCount < session.maxPlayers) {
          const waitingPlayers = refreshedSignups
            .filter((s: any) => s.signupStatus === "WAITING")
            .sort((a: any, b: any) => (a.waitingListPosition || 0) - (b.waitingListPosition || 0));
          if (waitingPlayers.length > 0) {
            await storage.updateSessionSignupStatus(waitingPlayers[0].id, {
              signupStatus: "CONFIRMED",
              waitingListPosition: null,
            });
          }
        }
      }

      res.json({ success: true });
    } catch (error) {
      console.error("Error removing signup:", error);
      res.status(500).json({ message: "Failed to remove player" });
    }
  });

  // Admin: Add club member to session waiting list
  app.post("/api/sessions/:sessionId/add-to-waiting-list", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const sessionId = Number(req.params.sessionId);
    const session = await storage.getSession(sessionId);
    if (!session) return res.status(404).json({ message: "Session not found" });

    const canAccess = await hasAdminAccess(req.user!.id, req.user!.role, session.clubId);
    if (!canAccess) return res.sendStatus(403);

    const { playerId } = req.body;
    if (!playerId) return res.status(400).json({ message: "playerId is required" });

    try {
      const allSignups = await storage.getSessionSignups(sessionId);
      const existingSignup = allSignups.find((s: any) => s.playerId === playerId);
      if (existingSignup) {
        return res.status(400).json({ message: "Player is already signed up for this session" });
      }

      const waitingPlayers = allSignups.filter((s: any) => s.signupStatus === "WAITING");
      const maxPos = waitingPlayers.reduce((max: number, s: any) => Math.max(max, s.waitingListPosition || 0), 0);

      const signup = await storage.createSessionSignupEnhanced({
        sessionId,
        playerId,
        fee: session.sessionFee || 0,
        signupStatus: "WAITING",
        waitingListPosition: maxPos + 1,
        signedUpByUserId: req.user!.id,
      });

      res.json(signup);
    } catch (error) {
      console.error("Error adding player to waiting list:", error);
      res.status(500).json({ message: "Failed to add player to waiting list" });
    }
  });

  // Update session invitees - add/remove INVITED signups
  app.patch("/api/sessions/:sessionId/invitees", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const sessionId = Number(req.params.sessionId);
    const session = await storage.getSession(sessionId);
    if (!session) return res.status(404).json({ message: "Session not found" });

    const canAccess = await canManageSessions(req.user!.id, req.user!.role, session.clubId);
    if (!canAccess) return res.sendStatus(403);

    const { inviteePlayerIds } = req.body;
    if (!Array.isArray(inviteePlayerIds)) {
      return res.status(400).json({ message: "inviteePlayerIds must be an array" });
    }

    try {
      const currentSignups = await storage.getSessionSignups(sessionId);
      const currentInvited = currentSignups.filter((s: any) => s.signupStatus === "INVITED");
      const currentInvitedIds = new Set(currentInvited.map((s: any) => s.playerId));
      const desiredInvitedIds = new Set(inviteePlayerIds as number[]);
      
      const club = await storage.getClub(session.clubId);
      const clubName = club?.name || "your club";
      const fee = session.sessionFee || club?.sessionFee || 0;

      // Remove invitations for players no longer in the list
      for (const signup of currentInvited) {
        if (!desiredInvitedIds.has(signup.playerId)) {
          await db.delete(sessionSignups).where(eq(sessionSignups.id, signup.id));
        }
      }

      // Add new invitations for players not already invited/confirmed
      const allSignupPlayerIds = new Set(currentSignups.map((s: any) => s.playerId));
      const newInvitees: number[] = [];
      for (const playerId of inviteePlayerIds) {
        if (!allSignupPlayerIds.has(playerId)) {
          try {
            await storage.createSessionSignupEnhanced({
              sessionId,
              playerId,
              fee,
              signupStatus: "INVITED",
              signedUpByUserId: req.user!.id,
            });
            newInvitees.push(playerId);
          } catch (signupErr) {
            continue;
          }
        }
      }

      // Send notifications to newly invited players
      if (newInvitees.length > 0) {
        const clubMembers = await storage.getClubMembers(session.clubId);
        for (const playerId of newInvitees) {
          const member = clubMembers.find(m => m.id === playerId);
          if (member && member.userId !== req.user!.id) {
            await storage.createNotification({
              userId: member.userId,
              type: "SESSION_INVITE",
              title: "Session Invitation",
              message: `You've been invited to "${session.title}" at ${clubName} on ${new Date(session.date).toLocaleDateString()}. Sign up now to confirm your spot!`,
              linkUrl: `/sessions/${session.id}`,
            });
          }
        }
      }

      res.json({ message: "Invitees updated successfully", added: newInvitees.length, removed: currentInvited.filter((s: any) => !desiredInvitedIds.has(s.playerId)).length });
    } catch (error) {
      console.error("[UPDATE INVITEES] Error:", error);
      res.status(500).json({ message: "Failed to update invitees" });
    }
  });

  // Admin: Promote from waiting list
  app.post("/api/sessions/:sessionId/promote-waiting", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const sessionId = Number(req.params.sessionId);
    const session = await storage.getSession(sessionId);
    if (!session) return res.status(404).json({ message: "Session not found" });

    const canAccess = await hasAdminAccess(req.user!.id, req.user!.role, session.clubId);
    if (!canAccess) return res.sendStatus(403);

    const { signupId } = req.body;
    const updated = await storage.updateSessionSignupStatus(signupId, {
      signupStatus: "CONFIRMED",
      waitingListPosition: null,
    });
    res.json(updated);
  });

  app.patch(api.sessions.updateAttendance.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401); 
    // Add role check here (ADMIN+)
    
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

      // Check session edit access (Super Admin, Club Owner, Club Admin only)
      const canEdit = await canPerform({ id: req.user!.id, role: req.user!.role }, "EDIT_SESSIONS", session.clubId);
      if (!canEdit) {
        return res.sendStatus(403);
      }

      const { courtsAvailable, maxPlayers, matchMode, status, allowedCategories, courtNames, liveStreamUrl, clubId, autoGenerateActive, isPrivate, shuttleTubesUsed, title, date, startTime, durationMinutes, genderRestriction, sessionType, juniorAgeGroups, playersPerSide, matchGenderType, sessionFee, shuttlecockType, defaultPointsToPlayTo, venueId, queueTargetSize, publishAt } = req.body;

      const updates: any = {};
      if (autoGenerateActive !== undefined) updates.autoGenerateActive = !!autoGenerateActive;
      if (isPrivate !== undefined) updates.isPrivate = !!isPrivate;
      if (shuttleTubesUsed !== undefined) updates.shuttleTubesUsed = Number(shuttleTubesUsed);
      if (clubId !== undefined && clubId !== session.clubId) {
        if (req.user!.role !== "OWNER") return res.status(403).json({ message: "Only platform owners can reassign sessions to another club" });
        const targetClub = await storage.getClub(clubId);
        if (!targetClub) return res.status(400).json({ message: "Target club not found" });
        updates.clubId = clubId;
      }
      if (courtsAvailable !== undefined) updates.courtsAvailable = courtsAvailable;
      if (maxPlayers !== undefined) updates.maxPlayers = maxPlayers;
      if (matchMode !== undefined) updates.matchMode = matchMode;
      if (status !== undefined) updates.status = status;
      if (liveStreamUrl !== undefined) updates.liveStreamUrl = liveStreamUrl || null;
      if (title !== undefined) updates.title = title.trim();
      if (date !== undefined) updates.date = new Date(date);
      if (startTime !== undefined) updates.startTime = startTime;
      if (durationMinutes !== undefined) updates.durationMinutes = Number(durationMinutes);
      if (genderRestriction !== undefined) updates.genderRestriction = genderRestriction;
      if (sessionType !== undefined) updates.sessionType = sessionType;
      if (juniorAgeGroups !== undefined) updates.juniorAgeGroups = juniorAgeGroups;
      if (playersPerSide !== undefined) updates.playersPerSide = Number(playersPerSide);
      if (matchGenderType !== undefined) updates.matchGenderType = matchGenderType;
      if (sessionFee !== undefined) updates.sessionFee = sessionFee !== null ? Number(sessionFee) : null;
      if (shuttlecockType !== undefined) updates.shuttlecockType = shuttlecockType || null;
      if (defaultPointsToPlayTo !== undefined) updates.defaultPointsToPlayTo = Number(defaultPointsToPlayTo);
      if (queueTargetSize !== undefined) updates.queueTargetSize = Number(queueTargetSize);
      if (venueId !== undefined) updates.venueId = venueId !== null ? Number(venueId) : null;
      if (courtNames !== undefined) {
        if (!Array.isArray(courtNames) || !courtNames.every((n: any) => typeof n === "string" && n.trim().length > 0)) {
          return res.status(400).json({ message: "Court names must be an array of non-empty strings" });
        }
        updates.courtNames = courtNames.map((n: string) => n.trim());
      }
      if (allowedCategories !== undefined) {
        const validCategories = ["A", "B", "C", "D", "C3", "C2", "C1", "B3", "B2", "B1", "A3", "A2", "A1"];
        if (!Array.isArray(allowedCategories) || !allowedCategories.every(c => validCategories.includes(c))) {
          return res.status(400).json({ message: "Invalid categories" });
        }
        updates.allowedCategories = allowedCategories;
      }
      if (publishAt !== undefined) updates.publishAt = publishAt ? new Date(publishAt) : null;

      const updated = await storage.updateSession(sessionId, updates);
      res.json(updated);
    } catch (err: any) {
      console.error("Error updating session:", err);
      res.status(500).json({ message: err.message || "Failed to update session" });
    }
  });

  app.post("/api/sessions/:id/restart", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    try {
      const sessionId = Number(req.params.id);
      const session = await storage.getSession(sessionId);
      if (!session) return res.status(404).json({ message: "Session not found" });

      const canAccess = await canManageSessions(req.user!.id, req.user!.role, session.clubId);
      if (!canAccess) {
        return res.status(403).json({ message: "Only admins and organisers can restart sessions" });
      }

      const matches = await storage.getSessionMatches(sessionId);
      for (const match of matches) {
        await storage.deleteMatch(match.id);
      }

      const signups = await storage.getSessionSignups(sessionId);
      for (const signup of signups) {
        await storage.updateSignupStatus(signup.id, { attendanceStatus: "NOT_ATTENDED" });
        if (signup.isPaused) {
          await db.update(sessionSignups).set({ isPaused: false }).where(eq(sessionSignups.id, signup.id));
        }
        if (signup.pairGroupId) {
          await db.update(sessionSignups).set({ pairGroupId: null }).where(eq(sessionSignups.id, signup.id));
        }
      }

      const updated = await storage.updateSession(sessionId, { status: "ACTIVE", autoGenerateActive: false });
      res.json({ message: "Session restarted", matchesDeleted: matches.length, signupsReset: signups.length, session: updated });
    } catch (err: any) {
      console.error("Error restarting session:", err);
      res.status(500).json({ message: err.message || "Failed to restart session" });
    }
  });

  // Delete session
  app.delete("/api/sessions/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    try {
      const sessionId = Number(req.params.id);
      const session = await storage.getSession(sessionId);
      if (!session) return res.status(404).json({ message: "Session not found" });

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
      const existingSignup = signups.find(s => s.playerId === playerId);
      if (existingSignup) {
        if ((existingSignup as any).signupStatus === "INVITED") {
          const updated = await storage.updateSessionSignupStatus(existingSignup.id, {
            signupStatus: "CONFIRMED",
            waitingListPosition: null,
          });
          return res.status(200).json(updated);
        }
        return res.status(400).json({ message: "Player already in session" });
      }

      // Use session fee or club default fee or fallback to 1000 pence
      let fee = session.sessionFee;
      if (fee == null) {
        const club = await storage.getClub(session.clubId);
        fee = club?.sessionFee ?? 1000;
      }

      // Check capacity - admin can still add but to waiting list
      const confirmedCount = signups.filter((s: any) => !s.signupStatus || s.signupStatus === "CONFIRMED").length;
      if (confirmedCount >= session.maxPlayers) {
        const waitingSignups = signups.filter((s: any) => s.signupStatus === "WAITING");
        const maxPos = waitingSignups.reduce((max: number, s: any) => Math.max(max, s.waitingListPosition || 0), 0);
        const signup = await storage.createSessionSignupEnhanced({
          sessionId,
          playerId,
          fee,
          signupStatus: "WAITING",
          waitingListPosition: maxPos + 1,
          signedUpByUserId: req.user!.id,
        });
        return res.status(201).json({ ...signup, addedToWaitingList: true });
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
        isCompleted: false,
        pointsToPlayTo: session.defaultPointsToPlayTo || 21,
        numberOfSets: session.numberOfSets || 1,
        currentSet: 1,
        setsWonA: 0,
        setsWonB: 0,
        setScores: [],
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

  app.post("/api/matches/:id/end-set", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    try {
      const matchId = Number(req.params.id);
      const { scoreA, scoreB } = req.body;

      if (scoreA === undefined || scoreB === undefined) {
        return res.status(400).json({ message: "Scores are required" });
      }

      const currentMatch = await storage.getMatch(matchId);
      if (!currentMatch) return res.status(404).json({ message: "Match not found" });

      const session = await storage.getSession(currentMatch.sessionId);
      if (!session) return res.status(404).json({ message: "Session not found" });

      const isAdmin = await hasAdminAccess(req.user!.id, req.user!.role, session.clubId);
      const isSignedUp = await storage.isUserSignedUpToSession(req.user!.id, currentMatch.sessionId);
      if (!isAdmin && !isSignedUp) {
        return res.status(403).json({ message: "Only session participants or admins can end a set" });
      }

      const target = currentMatch.pointsToPlayTo || session.defaultPointsToPlayTo || 21;
      const sA = Number(scoreA);
      const sB = Number(scoreB);

      if (sA < target && sB < target) {
        return res.status(400).json({ message: `At least one side must reach ${target} points.` });
      }

      const existingSetScores = (currentMatch.setScores as { scoreA: number; scoreB: number }[]) || [];
      const newSetScores = [...existingSetScores, { scoreA: sA, scoreB: sB }];
      
      let newSetsWonA = (currentMatch.setsWonA || 0) + (sA > sB ? 1 : 0);
      let newSetsWonB = (currentMatch.setsWonB || 0) + (sB > sA ? 1 : 0);
      const totalSets = currentMatch.numberOfSets || 1;
      const currentSetNum = currentMatch.currentSet || 1;

      const setsToWin = totalSets === 3 ? 2 : (totalSets === 2 ? 2 : 1);
      const matchOver = newSetsWonA >= setsToWin || newSetsWonB >= setsToWin || currentSetNum >= totalSets;

      if (matchOver) {
        const totalScoreA = newSetScores.reduce((sum, s) => sum + s.scoreA, 0);
        const totalScoreB = newSetScores.reduce((sum, s) => sum + s.scoreB, 0);
        const freedCourt = currentMatch.courtNumber;

        const updated = await storage.updateMatch(matchId, {
          status: "COMPLETED",
          scoreA: totalScoreA,
          scoreB: totalScoreB,
          isCompleted: true,
          completedAt: new Date(),
          courtNumber: null,
          scoreEnteredByUserId: req.user!.id,
          scoreEnteredAt: new Date(),
          setScores: newSetScores,
          setsWonA: newSetsWonA,
          setsWonB: newSetsWonB,
          currentSet: currentSetNum,
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

        const gradingSession = currentMatch.sessionId ? await storage.getSession(currentMatch.sessionId) : null;
        if (gradingSession) {
          const playerIds = [currentMatch.teamAPlayer1Id, currentMatch.teamAPlayer2Id, currentMatch.teamBPlayer1Id, currentMatch.teamBPlayer2Id].filter(Boolean) as number[];
          for (const pid of playerIds) {
            evaluatePlayerGrade(pid, gradingSession.clubId).catch(err => console.error("Grading error:", err));
          }
        }

        return res.json({ ...updated, matchCompleted: true });
      } else {
        const updated = await storage.updateMatch(matchId, {
          setScores: newSetScores,
          setsWonA: newSetsWonA,
          setsWonB: newSetsWonB,
          currentSet: currentSetNum + 1,
        });
        return res.json({ ...updated, matchCompleted: false });
      }
    } catch (err: any) {
      console.error("Error ending set:", err);
      res.status(500).json({ message: err.message || "Failed to end set" });
    }
  });

  app.post("/api/matches/:id/complete", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    try {
      const matchId = Number(req.params.id);
      const { scoreA, scoreB, setScores: providedSetScores } = req.body;

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

      const target = currentMatch.pointsToPlayTo || session.defaultPointsToPlayTo || 21;
      const sA = Number(scoreA);
      const sB = Number(scoreB);
      const totalSets = currentMatch.numberOfSets || 1;

      if (totalSets === 1) {
        const aWins = sA >= target && sB < target;
        const bWins = sB >= target && sA < target;
        if (!aWins && !bWins) {
          return res.status(400).json({ 
            message: `Invalid score. One side must reach ${target} points and the other must be below ${target}.`
          });
        }
      }

      const finalSetScores = providedSetScores || currentMatch.setScores || [{ scoreA: sA, scoreB: sB }];
      let finalSetsWonA = 0;
      let finalSetsWonB = 0;
      for (const s of finalSetScores) {
        if (s.scoreA > s.scoreB) finalSetsWonA++;
        else if (s.scoreB > s.scoreA) finalSetsWonB++;
      }

      const freedCourt = currentMatch.courtNumber;
      
      const updated = await storage.updateMatch(matchId, {
        status: "COMPLETED",
        scoreA: sA,
        scoreB: sB,
        isCompleted: true,
        completedAt: new Date(),
        courtNumber: null,
        scoreEnteredByUserId: req.user!.id,
        scoreEnteredAt: new Date(),
        setScores: finalSetScores,
        setsWonA: finalSetsWonA,
        setsWonB: finalSetsWonB,
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

      const gradingSession2 = currentMatch.sessionId ? await storage.getSession(currentMatch.sessionId) : null;
      if (gradingSession2) {
        const playerIds = [currentMatch.teamAPlayer1Id, currentMatch.teamAPlayer2Id, currentMatch.teamBPlayer1Id, currentMatch.teamBPlayer2Id].filter(Boolean) as number[];
        for (const pid of playerIds) {
          evaluatePlayerGrade(pid, gradingSession2.clubId).catch(err => console.error("Grading error:", err));
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

  // Update match points-to-play-to target - admin/organiser only
  app.patch("/api/matches/:id/points-target", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    try {
      const matchId = Number(req.params.id);
      const { pointsToPlayTo } = req.body;

      if (!pointsToPlayTo || pointsToPlayTo < 1 || pointsToPlayTo > 50) {
        return res.status(400).json({ message: "Points target must be between 1 and 50" });
      }

      const match = await storage.getMatch(matchId);
      if (!match) return res.status(404).json({ message: "Match not found" });

      const session = await storage.getSession(match.sessionId);
      if (!session) return res.status(404).json({ message: "Session not found" });

      const canAccess = await hasAdminAccess(req.user!.id, req.user!.role, session.clubId);
      if (!canAccess) {
        return res.status(403).json({ message: "Only admins and organisers can change points target" });
      }

      const updated = await storage.updateMatch(matchId, { pointsToPlayTo });
      res.json(updated);
    } catch (err: any) {
      console.error("Error updating points target:", err);
      res.status(500).json({ message: err.message || "Failed to update points target" });
    }
  });

  app.patch("/api/matches/:id/number-of-sets", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    try {
      const matchId = Number(req.params.id);
      const { numberOfSets } = req.body;

      if (![1, 2, 3].includes(numberOfSets)) {
        return res.status(400).json({ message: "Number of sets must be 1, 2, or 3" });
      }

      const match = await storage.getMatch(matchId);
      if (!match) return res.status(404).json({ message: "Match not found" });

      const session = await storage.getSession(match.sessionId);
      if (!session) return res.status(404).json({ message: "Session not found" });

      const canAccess = await hasAdminAccess(req.user!.id, req.user!.role, session.clubId);
      if (!canAccess) {
        return res.status(403).json({ message: "Only admins and organisers can change number of sets" });
      }

      const updated = await storage.updateMatch(matchId, { numberOfSets });
      res.json(updated);
    } catch (err: any) {
      console.error("Error updating number of sets:", err);
      res.status(500).json({ message: err.message || "Failed to update number of sets" });
    }
  });

  // Delete a queued match and regenerate a replacement
  app.delete("/api/matches/:id/queued", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    try {
      const matchId = Number(req.params.id);
      const match = await storage.getMatch(matchId);
      if (!match) return res.status(404).json({ message: "Match not found" });

      if (match.status !== "QUEUED") {
        return res.status(400).json({ message: "Only queued matches can be deleted with this endpoint" });
      }

      const session = await storage.getSession(match.sessionId);
      if (!session) return res.status(404).json({ message: "Session not found" });

      const canAccess = await hasAdminAccess(req.user!.id, req.user!.role, session.clubId);
      if (!canAccess) {
        return res.status(403).json({ message: "Only admins can delete queued matches" });
      }

      await storage.deleteMatch(matchId);

      let replacement = null;
      if (session.autoGenerateActive) {
        const mode = req.query.mode as string || req.body?.mode;
        const genderType = req.query.genderType as string || req.body?.genderType;
        const matchMode = mode || session.matchMode || "SOCIAL";
        const playersPerSide = session.playersPerSide || 2;
        const playersPerMatch = playersPerSide * 2;
        const gType = genderType || session.matchGenderType || "MIXED";

        const signups = await storage.getSessionSignups(match.sessionId);
        const attendedSignups = signups.filter(s => s.attendanceStatus === "ATTENDED");
        const eligibleSignups = attendedSignups.length >= playersPerMatch ? attendedSignups : signups;
        const players = eligibleSignups
          .filter(s => !s.isPaused)
          .map(s => ({
            id: s.player.id,
            gender: s.player.gender,
            category: s.player.category,
            isPaused: s.isPaused,
            genderOverride: s.genderOverride,
          }));

        if (players.length >= playersPerMatch) {
          const existingMatches = await storage.getSessionMatches(match.sessionId);
          const { recentPairings, recentOpponents, playerMatchCounts } = buildPairingHistory(
            existingMatches.map(m => ({
              teamAPlayer1Id: m.teamAPlayer1Id,
              teamAPlayer2Id: m.teamAPlayer2Id,
              teamBPlayer1Id: m.teamBPlayer1Id,
              teamBPlayer2Id: m.teamBPlayer2Id,
              status: m.status,
            }))
          );

          const generated = generateSmartMatches({
            mode: matchMode as "SOCIAL" | "COMPETITIVE",
            players,
            playersPerSide: playersPerSide as 1 | 2,
            genderType: gType,
            queueTarget: 1,
            recentPairings,
            recentOpponents,
            playerMatchCounts,
            fixedPairs: extractFixedPairs(signups),
          });

          if (generated.matches.length > 0) {
            const maxQueuePos = Math.max(0, ...existingMatches
              .filter(m => m.queuePosition !== null)
              .map(m => m.queuePosition || 0));

            replacement = await storage.createMatch({
              sessionId: match.sessionId,
              courtNumber: null,
              queuePosition: maxQueuePos + 1,
              status: "QUEUED" as const,
              teamAPlayer1Id: generated.matches[0].teamAPlayer1Id,
              teamAPlayer2Id: generated.matches[0].teamAPlayer2Id,
              teamBPlayer1Id: generated.matches[0].teamBPlayer1Id,
              teamBPlayer2Id: generated.matches[0].teamBPlayer2Id,
              scoreA: 0,
              scoreB: 0,
              isCompleted: false,
              pointsToPlayTo: session.defaultPointsToPlayTo || 21,
              numberOfSets: session.numberOfSets || 1,
              currentSet: 1,
              setsWonA: 0,
              setsWonB: 0,
              setScores: [],
            });
          }
        }
      }

      res.json({ message: "Match deleted", replacement });
    } catch (err: any) {
      console.error("Error deleting queued match:", err);
      res.status(500).json({ message: err.message || "Failed to delete queued match" });
    }
  });

  // === Reshuffle Queued Match - replace players with a fresh smart-generated combination ===
  app.post("/api/matches/:id/reshuffle", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    try {
      const matchId = Number(req.params.id);
      const match = await storage.getMatch(matchId);
      if (!match) return res.status(404).json({ message: "Match not found" });

      if (match.status !== "QUEUED") {
        return res.status(400).json({ message: "Only queued matches can be reshuffled" });
      }

      const session = await storage.getSession(match.sessionId);
      if (!session) return res.status(404).json({ message: "Session not found" });

      const canAccess = await hasAdminAccess(req.user!.id, req.user!.role, session.clubId);
      if (!canAccess) {
        return res.status(403).json({ message: "Only admins can reshuffle matches" });
      }

      const mode = req.query.mode as string || req.body?.mode;
      const genderType = req.query.genderType as string || req.body?.genderType;
      const filterType = req.body?.filterType as string | undefined;
      const matchMode = mode || session.matchMode || "SOCIAL";
      const playersPerSide = session.playersPerSide || 2;
      const playersPerMatch = playersPerSide * 2;

      let gType = genderType || session.matchGenderType || "MIXED";
      if (filterType === "female_only") gType = "FEMALE";
      else if (filterType === "male_only") gType = "MALE";
      else if (filterType === "mixed") gType = "MIXED";

      const signups = await storage.getSessionSignups(match.sessionId);
      const attendedSignups = signups.filter(s => s.attendanceStatus === "ATTENDED");
      const eligibleSignups = attendedSignups.length >= playersPerMatch ? attendedSignups : signups;

      const existingMatches = await storage.getSessionMatches(match.sessionId);
      const busyPlayerIds = new Set<number>();
      existingMatches
        .filter(m => m.status === "LIVE")
        .forEach(m => {
          if (m.teamAPlayer1Id) busyPlayerIds.add(m.teamAPlayer1Id);
          if (m.teamAPlayer2Id) busyPlayerIds.add(m.teamAPlayer2Id);
          if (m.teamBPlayer1Id) busyPlayerIds.add(m.teamBPlayer1Id);
          if (m.teamBPlayer2Id) busyPlayerIds.add(m.teamBPlayer2Id);
        });

      let players = eligibleSignups
        .filter(s => !s.isPaused)
        .filter(s => !busyPlayerIds.has(s.player.id))
        .map(s => ({
          id: s.player.id,
          gender: s.player.gender,
          category: s.player.category,
          isPaused: s.isPaused,
          genderOverride: s.genderOverride,
        }));

      if (filterType === "female_only") {
        players = players.filter(p => (p.genderOverride || p.gender) === "FEMALE");
      } else if (filterType === "male_only") {
        players = players.filter(p => (p.genderOverride || p.gender) === "MALE");
      } else if (filterType === "high_grade") {
        players = players.filter(p => p.category === "A" || p.category === "B");
      } else if (filterType === "low_grade") {
        players = players.filter(p => p.category === "C" || p.category === "D");
      } else if (filterType === "mixed") {
        const males = players.filter(p => (p.genderOverride || p.gender) !== "FEMALE");
        const females = players.filter(p => (p.genderOverride || p.gender) === "FEMALE");
        if (playersPerSide > 1) {
          if (males.length < 2 || females.length < 2) {
            return res.status(400).json({ message: `Not enough mixed gender players available (need at least 2 males and 2 females)` });
          }
          const shuffledMales = males.sort(() => Math.random() - 0.5);
          const shuffledFemales = females.sort(() => Math.random() - 0.5);
          const updated = await storage.updateMatch(matchId, {
            teamAPlayer1Id: shuffledMales[0].id,
            teamAPlayer2Id: shuffledFemales[0].id,
            teamBPlayer1Id: shuffledMales[1].id,
            teamBPlayer2Id: shuffledFemales[1].id,
          });
          return res.json({ message: "Match reshuffled (mixed)", match: updated });
        } else {
          if (males.length < 1 || females.length < 1) {
            return res.status(400).json({ message: `Not enough mixed gender players available` });
          }
          const shuffledMales = males.sort(() => Math.random() - 0.5);
          const shuffledFemales = females.sort(() => Math.random() - 0.5);
          const updated = await storage.updateMatch(matchId, {
            teamAPlayer1Id: shuffledMales[0].id,
            teamBPlayer1Id: shuffledFemales[0].id,
          });
          return res.json({ message: "Match reshuffled (mixed)", match: updated });
        }
      }

      if (players.length < playersPerMatch) {
        const filterLabels: Record<string, string> = {
          female_only: "female",
          male_only: "male",
          high_grade: "high grade (A/B)",
          low_grade: "low grade (C/D)",
        };
        const label = filterType ? filterLabels[filterType] || filterType : "";
        return res.status(400).json({ message: `Not enough ${label} players available` });
      }

      const { recentPairings, recentOpponents, playerMatchCounts } = buildPairingHistory(
        existingMatches
          .filter(m => m.id !== matchId)
          .map(m => ({
            teamAPlayer1Id: m.teamAPlayer1Id,
            teamAPlayer2Id: m.teamAPlayer2Id,
            teamBPlayer1Id: m.teamBPlayer1Id,
            teamBPlayer2Id: m.teamBPlayer2Id,
            status: m.status,
          }))
      );

      const generated = generateSmartMatches({
        mode: matchMode as "SOCIAL" | "COMPETITIVE",
        players,
        playersPerSide: playersPerSide as 1 | 2,
        genderType: gType,
        queueTarget: 1,
        recentPairings,
        recentOpponents,
        playerMatchCounts,
        fixedPairs: extractFixedPairs(signups),
      });

      if (generated.matches.length === 0) {
        return res.status(400).json({ message: "Could not generate a replacement match" });
      }

      const updated = await storage.updateMatch(matchId, {
        teamAPlayer1Id: generated.matches[0].teamAPlayer1Id,
        teamAPlayer2Id: generated.matches[0].teamAPlayer2Id,
        teamBPlayer1Id: generated.matches[0].teamBPlayer1Id,
        teamBPlayer2Id: generated.matches[0].teamBPlayer2Id,
      });

      res.json({ message: "Match reshuffled", match: updated });
    } catch (err: any) {
      console.error("Error reshuffling match:", err);
      res.status(500).json({ message: err.message || "Failed to reshuffle match" });
    }
  });

  // Edit completed match score - admin/organiser only (for disputes)
  app.patch("/api/matches/:id/edit-score", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    try {
      const matchId = Number(req.params.id);
      const { scoreA, scoreB, setScores } = req.body;

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

      const updateData: any = { 
        scoreA, 
        scoreB,
        scoreUpdatedByUserId: req.user!.id,
        scoreUpdatedAt: new Date(),
      };

      if (setScores && Array.isArray(setScores)) {
        updateData.setScores = setScores;
        let setsWonA = 0;
        let setsWonB = 0;
        for (const s of setScores) {
          if (s.scoreA > s.scoreB) setsWonA++;
          else if (s.scoreB > s.scoreA) setsWonB++;
        }
        updateData.setsWonA = setsWonA;
        updateData.setsWonB = setsWonB;
        updateData.currentSet = setScores.length;
      }

      const updated = await storage.updateMatch(matchId, updateData);
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

  app.post("/api/matches/:id/cancel-live", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    try {
      const matchId = Number(req.params.id);
      const match = await storage.getMatch(matchId);
      if (!match) return res.status(404).json({ message: "Match not found" });

      if (match.status !== "LIVE") {
        return res.status(400).json({ message: "Only live matches can be cancelled" });
      }

      const session = await storage.getSession(match.sessionId);
      if (!session) return res.status(404).json({ message: "Session not found" });

      const canAccess = await hasAdminAccess(req.user!.id, req.user!.role, session.clubId);
      if (!canAccess) {
        return res.status(403).json({ message: "Only admins can cancel live matches" });
      }

      await storage.deleteMatch(matchId);
      res.json({ message: "Live match cancelled", courtNumber: match.courtNumber });
    } catch (err: any) {
      console.error("Error cancelling live match:", err);
      res.status(500).json({ message: err.message || "Failed to cancel live match" });
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

      // Exclude players currently in LIVE or QUEUED matches
      const busyPlayerIds = new Set<number>();
      existingMatches
        .filter(m => m.status === "LIVE" || m.status === "QUEUED")
        .forEach(m => {
          if (m.teamAPlayer1Id) busyPlayerIds.add(m.teamAPlayer1Id);
          if (m.teamAPlayer2Id) busyPlayerIds.add(m.teamAPlayer2Id);
          if (m.teamBPlayer1Id) busyPlayerIds.add(m.teamBPlayer1Id);
          if (m.teamBPlayer2Id) busyPlayerIds.add(m.teamBPlayer2Id);
        });
      players = players.filter(p => !busyPlayerIds.has(p.id));

      if (players.length < playersPerMatch) {
        return res.status(400).json({ message: `Not enough available players. ${busyPlayerIds.size} players are already in live or queued matches.` });
      }

      // Build pairing history for fair match distribution
      const { recentPairings, recentOpponents, playerMatchCounts } = buildPairingHistory(
        existingMatches.map(m => ({
          teamAPlayer1Id: m.teamAPlayer1Id,
          teamAPlayer2Id: m.teamAPlayer2Id,
          teamBPlayer1Id: m.teamBPlayer1Id,
          teamBPlayer2Id: m.teamBPlayer2Id,
          status: m.status,
        }))
      );

      // Ensure all eligible players appear in playerMatchCounts
      for (const p of players) {
        if (!playerMatchCounts.has(p.id)) {
          playerMatchCounts.set(p.id, 0);
        }
      }

      const matchCount = Math.min(numberOfMatches || 8, Math.floor(players.length / playersPerMatch));
      const smartPlayers = players.map(p => ({
        id: p.id,
        gender: p.gender,
        category: p.category,
        isPaused: false,
        genderOverride: null as string | null,
      }));

      const generated = generateSmartMatches({
        mode: (session.matchMode as "SOCIAL" | "COMPETITIVE") || "SOCIAL",
        players: smartPlayers,
        playersPerSide: playersPerSide as 1 | 2,
        genderType: genderType,
        queueTarget: matchCount,
        recentPairings,
        recentOpponents,
        playerMatchCounts,
        fixedPairs: extractFixedPairs(eligibleSignups),
      });

      const createdMatches = await Promise.all(
        generated.matches.map((m, i) => storage.createMatch({
          sessionId,
          courtNumber: null,
          queuePosition: maxQueuePos + i + 1,
          status: "QUEUED" as const,
          teamAPlayer1Id: m.teamAPlayer1Id,
          teamAPlayer2Id: m.teamAPlayer2Id,
          teamBPlayer1Id: m.teamBPlayer1Id,
          teamBPlayer2Id: m.teamBPlayer2Id,
          scoreA: 0,
          scoreB: 0,
          isCompleted: false,
          pointsToPlayTo: session.defaultPointsToPlayTo || 21,
          numberOfSets: session.numberOfSets || 1,
          currentSet: 1,
          setsWonA: 0,
          setsWonB: 0,
          setScores: [],
        }))
      );
      res.status(201).json(createdMatches);
    } catch (err: any) {
      console.error("Error auto-generating matches:", err);
      res.status(500).json({ message: err.message || "Failed to generate matches" });
    }
  });

  // === Smart Match Generation ===
  app.post("/api/sessions/:sessionId/matches/smart-generate", async (req, res) => {
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

      if (session.status === "COMPLETED") {
        return res.status(400).json({ message: "Cannot generate matches for a completed session" });
      }

      const { mode, queueTargetSize, genderType, isAutoGenerate } = req.body;

      if (isAutoGenerate && !session.autoGenerateActive) {
        return res.json({ status: "stopped", message: "Auto-generation is stopped for this session", matches: [] });
      }

      const matchMode = mode || session.matchMode || "SOCIAL";
      const playersPerSide = session.playersPerSide || 2;
      const playersPerMatch = playersPerSide * 2;
      const gType = genderType || session.matchGenderType || "MIXED";
      const queueTarget = Math.min(Math.max(queueTargetSize || 3, 1), 10);

      const signups = await storage.getSessionSignups(sessionId);
      const attendedSignups = signups.filter(s => s.attendanceStatus === "ATTENDED");
      const eligibleSignups = attendedSignups.length >= playersPerMatch ? attendedSignups : signups;

      const existingMatches = await storage.getSessionMatches(sessionId);

      // Exclude players currently in LIVE or QUEUED matches
      const busyPlayerIds = new Set<number>();
      existingMatches
        .filter(m => m.status === "LIVE" || m.status === "QUEUED")
        .forEach(m => {
          if (m.teamAPlayer1Id) busyPlayerIds.add(m.teamAPlayer1Id);
          if (m.teamAPlayer2Id) busyPlayerIds.add(m.teamAPlayer2Id);
          if (m.teamBPlayer1Id) busyPlayerIds.add(m.teamBPlayer1Id);
          if (m.teamBPlayer2Id) busyPlayerIds.add(m.teamBPlayer2Id);
        });

      const players = eligibleSignups
        .filter(s => !s.isPaused)
        .filter(s => !busyPlayerIds.has(s.player.id))
        .map(s => ({
          id: s.player.id,
          gender: s.player.gender,
          category: s.player.category,
          isPaused: s.isPaused,
          genderOverride: s.genderOverride,
        }));

      if (players.length < playersPerMatch) {
        if (isAutoGenerate) {
          return res.json({ status: "waiting", message: `Waiting for players to finish. ${busyPlayerIds.size} players are in live or queued matches.`, matches: [] });
        }
        return res.status(400).json({ message: `Not enough available players. ${busyPlayerIds.size} players are already in live or queued matches.` });
      }

      const queuedCount = existingMatches.filter(m => m.status === "QUEUED").length;
      const matchesNeeded = Math.max(0, queueTarget - queuedCount);

      if (matchesNeeded === 0) {
        return res.json({ status: "full", message: "Queue is already full", matches: [] });
      }

      const effectiveTarget = isAutoGenerate ? Math.min(1, matchesNeeded) : matchesNeeded;

      const { recentPairings, recentOpponents, playerMatchCounts } = buildPairingHistory(
        existingMatches.map(m => ({
          teamAPlayer1Id: m.teamAPlayer1Id,
          teamAPlayer2Id: m.teamAPlayer2Id,
          teamBPlayer1Id: m.teamBPlayer1Id,
          teamBPlayer2Id: m.teamBPlayer2Id,
          status: m.status,
        }))
      );

      // Ensure all eligible players appear in playerMatchCounts (even those with 0 matches)
      // so the global minimum is accurate and players who haven't played get prioritized
      for (const s of eligibleSignups) {
        if (!playerMatchCounts.has(s.player.id)) {
          playerMatchCounts.set(s.player.id, 0);
        }
      }

      const generated = generateSmartMatches({
        mode: matchMode as "SOCIAL" | "COMPETITIVE",
        players,
        playersPerSide: playersPerSide as 1 | 2,
        genderType: gType,
        queueTarget: effectiveTarget,
        recentPairings,
        recentOpponents,
        playerMatchCounts,
        fixedPairs: extractFixedPairs(eligibleSignups),
      });

      if (generated.pairConstraintBlocked) {
        return res.json({ status: "pair_blocked", message: generated.pairConstraintMessage || "Pair constraint blocked match generation", matches: [] });
      }

      const maxQueuePos = Math.max(0, ...existingMatches
        .filter(m => m.queuePosition !== null)
        .map(m => m.queuePosition || 0));

      const defaultTarget = session.defaultPointsToPlayTo || 21;
      const createdMatches = await Promise.all(
        generated.matches.map((m, i) => storage.createMatch({
          sessionId,
          courtNumber: null,
          queuePosition: maxQueuePos + i + 1,
          status: "QUEUED" as const,
          teamAPlayer1Id: m.teamAPlayer1Id,
          teamAPlayer2Id: m.teamAPlayer2Id,
          teamBPlayer1Id: m.teamBPlayer1Id,
          teamBPlayer2Id: m.teamBPlayer2Id,
          scoreA: 0,
          scoreB: 0,
          isCompleted: false,
          pointsToPlayTo: defaultTarget,
          numberOfSets: session.numberOfSets || 1,
          currentSet: 1,
          setsWonA: 0,
          setsWonB: 0,
          setScores: [],
        }))
      );

      res.status(201).json(createdMatches);
    } catch (err: any) {
      console.error("Error smart-generating matches:", err);
      res.status(500).json({ message: err.message || "Failed to generate matches" });
    }
  });

  // === Trim Queue - reduce queued matches to target size ===
  app.post("/api/sessions/:sessionId/matches/trim-queue", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    try {
      const sessionId = Number(req.params.sessionId);
      const { targetSize } = req.body;
      if (typeof targetSize !== "number" || targetSize < 0) {
        return res.status(400).json({ message: "Invalid target size" });
      }

      const session = await storage.getSession(sessionId);
      if (!session) return res.status(404).json({ message: "Session not found" });

      const isAdmin = await hasAdminAccess(req.user!.id, req.user!.role, session.clubId);
      if (!isAdmin) return res.status(403).json({ message: "Only admins can trim queue" });

      const allMatches = await storage.getSessionMatches(sessionId);
      const queuedMatches = allMatches
        .filter(m => m.status === "QUEUED")
        .sort((a, b) => (a.queuePosition || 0) - (b.queuePosition || 0));

      let deletedCount = 0;
      if (queuedMatches.length > targetSize) {
        const toDelete = queuedMatches.slice(targetSize);
        for (const m of toDelete) {
          await storage.deleteMatch(m.id);
          deletedCount++;
        }
      }

      res.json({ deleted: deletedCount, remaining: Math.min(queuedMatches.length, targetSize) });
    } catch (err: any) {
      console.error("Error trimming queue:", err);
      res.status(500).json({ message: err.message || "Failed to trim queue" });
    }
  });

  // === Clear Queue - delete all queued matches and stop auto-generation ===
  app.post("/api/sessions/:sessionId/matches/clear-queue", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    try {
      const sessionId = Number(req.params.sessionId);
      const session = await storage.getSession(sessionId);
      if (!session) return res.status(404).json({ message: "Session not found" });

      const isAdmin = await hasAdminAccess(req.user!.id, req.user!.role, session.clubId);
      if (!isAdmin) return res.status(403).json({ message: "Only admins can clear queue" });

      await storage.updateSession(sessionId, { autoGenerateActive: false });

      const allMatches = await storage.getSessionMatches(sessionId);
      const queuedMatches = allMatches.filter(m => m.status === "QUEUED");

      for (const m of queuedMatches) {
        await storage.deleteMatch(m.id);
      }

      res.json({ deleted: queuedMatches.length });
    } catch (err: any) {
      console.error("Error clearing queue:", err);
      res.status(500).json({ message: err.message || "Failed to clear queue" });
    }
  });

  // === Stop All Matches - Delete queued, freeze live ===
  app.post("/api/sessions/:sessionId/matches/stop-all", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    try {
      const sessionId = Number(req.params.sessionId);
      const session = await storage.getSession(sessionId);
      if (!session) return res.status(404).json({ message: "Session not found" });

      const isAdmin = await hasAdminAccess(req.user!.id, req.user!.role, session.clubId);
      if (!isAdmin) {
        return res.status(403).json({ message: "Only admins and organisers can stop all matches" });
      }

      await storage.updateSession(sessionId, { autoGenerateActive: false });

      const allMatches = await storage.getSessionMatches(sessionId);
      const queuedMatches = allMatches.filter(m => m.status === "QUEUED");
      const liveMatches = allMatches.filter(m => m.status === "LIVE");

      for (const m of queuedMatches) {
        await storage.deleteMatch(m.id);
      }

      res.json({
        deletedQueued: queuedMatches.length,
        frozenLive: liveMatches.length,
        liveMatchIds: liveMatches.map(m => m.id),
        frozenMatches: liveMatches,
      });
    } catch (err: any) {
      console.error("Error stopping all matches:", err);
      res.status(500).json({ message: err.message || "Failed to stop all matches" });
    }
  });

  // === Handle Player Pause - Replace in queued matches ===
  app.post("/api/sessions/:sessionId/handle-pause", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    try {
      const sessionId = Number(req.params.sessionId);
      const { pausedPlayerId } = req.body;

      const session = await storage.getSession(sessionId);
      if (!session) return res.status(404).json({ message: "Session not found" });

      const isAdmin = await hasAdminAccess(req.user!.id, req.user!.role, session.clubId);
      if (!isAdmin) return res.sendStatus(403);

      const existingMatches = await storage.getSessionMatches(sessionId);
      const queuedMatches = existingMatches
        .filter(m => m.status === "QUEUED")
        .map(m => ({
          id: m.id,
          teamAPlayer1Id: m.teamAPlayer1Id,
          teamAPlayer2Id: m.teamAPlayer2Id,
          teamBPlayer1Id: m.teamBPlayer1Id,
          teamBPlayer2Id: m.teamBPlayer2Id,
        }));

      const signups = await storage.getSessionSignups(sessionId);
      const availablePlayers = signups
        .filter(s => !s.isPaused && s.player.id !== pausedPlayerId)
        .map(s => ({
          id: s.player.id,
          gender: s.player.gender,
          category: s.player.category,
          isPaused: false,
          genderOverride: s.genderOverride,
        }));

      const replacements = replacePlayerInQueuedMatches(queuedMatches, pausedPlayerId, availablePlayers, extractFixedPairs(signups));

      for (const rep of replacements) {
        await storage.updateMatch(rep.matchId, { [rep.position]: rep.newPlayerId });
      }

      res.json({ replacements: replacements.length });
    } catch (err: any) {
      console.error("Error handling pause:", err);
      res.status(500).json({ message: err.message || "Failed to handle pause" });
    }
  });

  app.post("/api/sessions/:sessionId/handle-resume", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    try {
      const sessionId = Number(req.params.sessionId);
      const { resumedPlayerId, mode, genderType } = req.body;

      const session = await storage.getSession(sessionId);
      if (!session) return res.status(404).json({ message: "Session not found" });

      const isAdmin = await hasAdminAccess(req.user!.id, req.user!.role, session.clubId);
      if (!isAdmin) return res.sendStatus(403);

      const existingMatches = await storage.getSessionMatches(sessionId);
      const queuedMatches = existingMatches
        .filter(m => m.status === "QUEUED")
        .sort((a, b) => (a.queuePosition || 0) - (b.queuePosition || 0));

      for (const qm of queuedMatches) {
        await storage.deleteMatch(qm.id);
      }

      const queueTarget = session.autoGenerateActive ? 1 : Math.max(queuedMatches.length, 3);
      const matchMode = (mode || session.matchMode || "SOCIAL") as "SOCIAL" | "COMPETITIVE";
      const playersPerSide = session.playersPerSide || 2;
      const playersPerMatch = playersPerSide * 2;
      const gType = genderType || session.matchGenderType || "MIXED";

      const signups = await storage.getSessionSignups(sessionId);
      const attendedSignups = signups.filter(s => s.attendanceStatus === "ATTENDED");
      const eligibleSignups = attendedSignups.length >= playersPerMatch ? attendedSignups : signups;
      const players = eligibleSignups
        .filter(s => !s.isPaused)
        .map(s => ({
          id: s.player.id,
          gender: s.player.gender,
          category: s.player.category,
          isPaused: false,
          genderOverride: s.genderOverride,
        }));

      if (players.length < playersPerMatch) {
        return res.json({ message: "Not enough active players to regenerate queue", rebalanced: 0, matches: [] });
      }

      const nonQueuedMatches = existingMatches.filter(m => m.status !== "QUEUED");
      const { recentPairings, recentOpponents, playerMatchCounts } = buildPairingHistory(
        nonQueuedMatches.map(m => ({
          teamAPlayer1Id: m.teamAPlayer1Id,
          teamAPlayer2Id: m.teamAPlayer2Id,
          teamBPlayer1Id: m.teamBPlayer1Id,
          teamBPlayer2Id: m.teamBPlayer2Id,
          status: m.status,
        }))
      );

      for (const p of players) {
        if (!playerMatchCounts.has(p.id)) {
          playerMatchCounts.set(p.id, 0);
        }
      }

      const generated = generateSmartMatches({
        mode: matchMode,
        players,
        playersPerSide: playersPerSide as 1 | 2,
        genderType: gType,
        queueTarget,
        recentPairings,
        recentOpponents,
        playerMatchCounts,
        priorityPlayerIds: [resumedPlayerId],
        fixedPairs: extractFixedPairs(eligibleSignups),
      });

      const defaultTarget = session.defaultPointsToPlayTo || 21;
      const createdMatches = await Promise.all(
        generated.matches.map((m, i) => storage.createMatch({
          sessionId,
          courtNumber: null,
          queuePosition: i + 1,
          status: "QUEUED" as const,
          teamAPlayer1Id: m.teamAPlayer1Id,
          teamAPlayer2Id: m.teamAPlayer2Id,
          teamBPlayer1Id: m.teamBPlayer1Id,
          teamBPlayer2Id: m.teamBPlayer2Id,
          scoreA: 0,
          scoreB: 0,
          isCompleted: false,
          pointsToPlayTo: defaultTarget,
          numberOfSets: session.numberOfSets || 1,
          currentSet: 1,
          setsWonA: 0,
          setsWonB: 0,
          setScores: [],
        }))
      );

      res.json({ rebalanced: createdMatches.length, matches: createdMatches });
    } catch (err: any) {
      console.error("Error handling resume:", err);
      res.status(500).json({ message: err.message || "Failed to handle resume" });
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
    if (!["OWNER", "ADMIN"].includes(role)) {
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
    // Check role (ADMIN, OWNER)
    const role = req.user!.role;
    if (!["OWNER", "ADMIN"].includes(role)) {
      return res.sendStatus(403);
    }
    const allSignups = await storage.getAllSignups();
    res.json(allSignups);
  });

  // === Player Management ===
  app.post("/api/admin/players", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const role = req.user!.role;
    if (!["OWNER", "ADMIN"].includes(role)) {
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
    if (!["OWNER", "ADMIN"].includes(role)) {
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
      
      if (Object.keys(userUpdates).length > 0) {
        await storage.updateUser(userId, userUpdates);
      }

      // Update profile - create if it doesn't exist
      let profile = await storage.getPlayerProfile(userId);
      if (profile) {
        const profileUpdates: any = {};
        if (gender) profileUpdates.gender = gender;
        if (category) profileUpdates.category = category;
        if (rankingPoints !== undefined) profileUpdates.rankingPoints = rankingPoints;
        if (clubId && clubId !== profile.clubId) profileUpdates.clubId = clubId;
        
        if (Object.keys(profileUpdates).length > 0) {
          await storage.updatePlayerProfile(profile.id, profileUpdates);
        }
      } else if (gender || category || clubId) {
        await storage.createPlayerProfile({
          userId,
          gender: gender as any || null,
          category: category as any || null,
          clubId: clubId ? Number(clubId) : 0,
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

  // === Delete a user account completely (admin/super admin) ===
  app.delete("/api/admin/users/:userId", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const requestingUser = req.user!;

    if (requestingUser.role !== "OWNER" && requestingUser.role !== "ADMIN") {
      return res.sendStatus(403);
    }

    try {
      const targetUserId = Number(req.params.userId);

      if (targetUserId === requestingUser.id) {
        return res.status(400).json({ message: "You cannot delete your own account from here" });
      }

      const targetUser = await storage.getUser(targetUserId);
      if (!targetUser) {
        return res.status(404).json({ message: "User not found" });
      }

      if (targetUser.role === "OWNER" && requestingUser.role !== "OWNER") {
        return res.status(403).json({ message: "Only super admins can delete other super admin accounts" });
      }

      await storage.deleteUserCompletely(targetUserId);
      res.json({ message: "User account deleted completely" });
    } catch (err: any) {
      console.error("Error deleting user account:", err);
      res.status(500).json({ message: err.message || "Failed to delete user account" });
    }
  });

  // === Merge duplicate accounts (case-insensitive email duplicates) ===
  app.post("/api/admin/merge-duplicate-accounts", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    if (req.user!.role !== "OWNER") return res.sendStatus(403);

    const dryRun = req.query.dryRun === "true";

    try {
      const duplicates = await db.execute(sql`
        SELECT LOWER(email) as normalized_email, 
               array_agg(id ORDER BY created_at ASC) as user_ids
        FROM users 
        GROUP BY LOWER(email) 
        HAVING COUNT(*) > 1
      `);

      if (!duplicates.rows || duplicates.rows.length === 0) {
        return res.json({ message: "No duplicate accounts found", details: [] });
      }

      if (dryRun) {
        const preview = (duplicates.rows || []).map((row: any) => ({
          email: row.normalized_email,
          userIds: row.user_ids,
          keepId: row.user_ids[0],
          removeIds: row.user_ids.slice(1),
        }));
        return res.json({ message: `Found ${preview.length} duplicate email groups`, dryRun: true, details: preview });
      }

      const merged: string[] = [];

      await db.execute(sql`BEGIN`);
      try {
        for (const row of (duplicates.rows || [])) {
          const userIds = row.user_ids as number[];
          const keepId = userIds[0];
          const removeIds = userIds.slice(1);

          for (const removeId of removeIds) {
            const removeProfiles = await db.select().from(playerProfiles).where(eq(playerProfiles.userId, removeId));
            const keepProfiles = await db.select().from(playerProfiles).where(eq(playerProfiles.userId, keepId));
            const keepClubIds = new Set(keepProfiles.map(p => p.clubId));

            for (const rp of removeProfiles) {
              if (keepClubIds.has(rp.clubId)) {
                const keepProfile = keepProfiles.find(p => p.clubId === rp.clubId)!;
                const betterRole = rp.clubRole === "ADMIN" || rp.clubRole === "OWNER" ? rp.clubRole : keepProfile.clubRole;
                const betterStatus = rp.membershipStatus === "APPROVED" ? "APPROVED" : keepProfile.membershipStatus;
                await db.update(playerProfiles).set({ 
                  clubRole: betterRole, 
                  membershipStatus: betterStatus 
                }).where(eq(playerProfiles.id, keepProfile.id));

                await db.execute(sql`UPDATE session_signups SET player_id = ${keepProfile.id} WHERE player_id = ${rp.id} AND session_id NOT IN (SELECT session_id FROM session_signups WHERE player_id = ${keepProfile.id})`);
                await db.execute(sql`DELETE FROM session_signups WHERE player_id = ${rp.id}`);
                await db.execute(sql`UPDATE matches SET team_a_player_1_id = ${keepProfile.id} WHERE team_a_player_1_id = ${rp.id}`);
                await db.execute(sql`UPDATE matches SET team_a_player_2_id = ${keepProfile.id} WHERE team_a_player_2_id = ${rp.id}`);
                await db.execute(sql`UPDATE matches SET team_b_player_1_id = ${keepProfile.id} WHERE team_b_player_1_id = ${rp.id}`);
                await db.execute(sql`UPDATE matches SET team_b_player_2_id = ${keepProfile.id} WHERE team_b_player_2_id = ${rp.id}`);
                await db.execute(sql`UPDATE tournament_teams SET player1_id = ${keepProfile.id} WHERE player1_id = ${rp.id}`);
                await db.execute(sql`UPDATE tournament_teams SET player2_id = ${keepProfile.id} WHERE player2_id = ${rp.id}`);

                await db.delete(playerProfiles).where(eq(playerProfiles.id, rp.id));
              } else {
                await db.update(playerProfiles).set({ userId: keepId }).where(eq(playerProfiles.id, rp.id));
              }
            }

            await db.execute(sql`UPDATE internal_messages SET sender_id = ${keepId} WHERE sender_id = ${removeId}`);
            await db.execute(sql`UPDATE internal_messages SET recipient_id = ${keepId} WHERE recipient_id = ${removeId}`);
            await db.execute(sql`UPDATE credit_ledger SET user_id = ${keepId} WHERE user_id = ${removeId}`);
            await db.execute(sql`UPDATE credit_ledger SET created_by_id = ${keepId} WHERE created_by_id = ${removeId}`);
            await db.execute(sql`UPDATE club_memberships SET user_id = ${keepId} WHERE user_id = ${removeId} AND club_id NOT IN (SELECT club_id FROM club_memberships WHERE user_id = ${keepId})`);
            await db.execute(sql`DELETE FROM club_memberships WHERE user_id = ${removeId}`);
            await db.execute(sql`UPDATE membership_requests SET user_id = ${keepId} WHERE user_id = ${removeId} AND club_id NOT IN (SELECT club_id FROM membership_requests WHERE user_id = ${keepId})`);
            await db.execute(sql`DELETE FROM membership_requests WHERE user_id = ${removeId}`);
            await db.delete(notifications).where(eq(notifications.userId, removeId));
            await db.execute(sql`DELETE FROM policy_acceptances WHERE user_id = ${removeId}`);
            await db.execute(sql`DELETE FROM reviews WHERE user_id = ${removeId}`);
            await db.execute(sql`DELETE FROM coaches WHERE user_id = ${removeId}`);
            await db.execute(sql`DELETE FROM coach_seeker_memberships WHERE user_id = ${removeId}`);
            await db.execute(sql`DELETE FROM announcements WHERE author_id = ${removeId}`);
            await db.execute(sql`UPDATE contact_messages SET sender_user_id = NULL WHERE sender_user_id = ${removeId}`);
            await db.execute(sql`UPDATE sessions SET created_by = ${keepId} WHERE created_by = ${removeId}`);
            await db.execute(sql`UPDATE clubs SET owner_id = ${keepId} WHERE owner_id = ${removeId}`);
            await db.execute(sql`UPDATE tournaments SET created_by = ${keepId} WHERE created_by = ${removeId}`);
            await db.execute(sql`UPDATE matches SET score_entered_by_user_id = ${keepId} WHERE score_entered_by_user_id = ${removeId}`);
            await db.execute(sql`UPDATE matches SET score_updated_by_user_id = ${keepId} WHERE score_updated_by_user_id = ${removeId}`);
            await db.delete(users).where(eq(users.id, removeId));

            merged.push(`Merged user ${removeId} into ${keepId} (${row.normalized_email})`);
          }
        }

        await db.execute(sql`UPDATE users SET email = LOWER(email) WHERE email != LOWER(email)`);
        await db.execute(sql`COMMIT`);
      } catch (txErr) {
        await db.execute(sql`ROLLBACK`);
        throw txErr;
      }

      console.log(`[ADMIN] Merged duplicate accounts:`, merged);
      res.json({ message: `Merged ${merged.length} duplicate accounts`, details: merged });
    } catch (err: any) {
      console.error("Error merging duplicates:", err);
      res.status(500).json({ message: err.message || "Failed to merge duplicates" });
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
            category: "D",
            grade: category || "C3",
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
      const { 
        name, description, address, city, postcode, country, region, continent,
        contactFullName, contactPhone, contactAddress, googleMapsUrl,
        isRegisteredWithBE, beRegistrationNumber,
        hasCompetitions, hasSocialGames, socialGameTimings,
        providesTraining, trainingDetails,
        sessionFee, hasMembership, membershipFee,
        shuttlecockType, providesClubTShirts,
        adminUserId
      } = req.body;
      if (!name || typeof name !== 'string' || name.trim().length < 3) {
        return res.status(400).json({ message: "Club name is required (min 3 characters)" });
      }
      const slug = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
      
      const club = await storage.createClub({ 
        name: name.trim(), slug, description, isActive: true, status: "APPROVED" as any,
        address, city, postcode, country, region, continent,
        contactFullName, contactPhone, contactAddress, googleMapsUrl,
        isRegisteredWithBE: isRegisteredWithBE || false,
        beRegistrationNumber,
        hasCompetitions: hasCompetitions || false,
        hasSocialGames: hasSocialGames || false,
        socialGameTimings,
        providesTraining: providesTraining || false,
        trainingDetails,
        sessionFee: sessionFee ? parseInt(sessionFee) : null,
        hasMembership: hasMembership || false,
        membershipFee: membershipFee ? parseInt(membershipFee) : null,
        shuttlecockType,
        providesClubTShirts: providesClubTShirts || false,
      });

      if (adminUserId) {
        const uid = parseInt(adminUserId);
        await storage.createPlayerProfile({
          userId: uid,
          clubId: club.id,
          clubRole: "ADMIN" as any,
          membershipStatus: "APPROVED" as any,
          playerStatus: "ACTIVE" as any,
        });
        if (club.id) {
          await storage.updateClub(club.id, { ownerId: uid });
        }
      }

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
      const { status, adminUserId } = req.body;
      if (!["PENDING", "APPROVED", "REJECTED"].includes(status)) {
        return res.status(400).json({ message: "Invalid status" });
      }
      
      const updated = await storage.updateClubStatus(clubId, status);

      if (status === "APPROVED") {
        if (adminUserId) {
          const uid = parseInt(adminUserId);
          const existingProfiles = await storage.getClubMembers(clubId);
          const existingProfile = existingProfiles.find((p: any) => p.userId === uid);
          if (existingProfile) {
            await storage.updatePlayerProfileWithFullName(existingProfile.id, { clubRole: "ADMIN", membershipStatus: "APPROVED" });
          } else {
            await storage.createPlayerProfile({
              userId: uid,
              clubId,
              clubRole: "ADMIN" as any,
              membershipStatus: "APPROVED" as any,
              playerStatus: "ACTIVE" as any,
            });
          }
          await storage.updateClub(clubId, { ownerId: uid });
        }
        try { await ensureAllOwnersInClub(clubId); } catch (e) { console.error("[SYNC] Error syncing owners to approved club:", e); }
      }

      res.json(updated);
    } catch (err: any) {
      console.error("Error updating club status:", err);
      res.status(500).json({ message: err.message || "Failed to update club status" });
    }
  });

  // Pause or resume a club
  app.patch("/api/admin/clubs/:id/pause", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    if (req.user!.role !== "OWNER") {
      return res.sendStatus(403);
    }

    try {
      const clubId = Number(req.params.id);
      const { paused } = req.body;
      
      const club = await storage.getClub(clubId);
      if (!club) {
        return res.status(404).json({ message: "Club not found" });
      }
      if (!club.isActive) {
        return res.status(400).json({ message: "Cannot pause/resume an archived club" });
      }
      if (paused && club.status !== "APPROVED") {
        return res.status(400).json({ message: "Only approved clubs can be paused" });
      }
      if (!paused && club.status !== "PAUSED") {
        return res.status(400).json({ message: "Only paused clubs can be resumed" });
      }
      
      const newStatus = paused ? "PAUSED" : "APPROVED";
      const updated = await storage.updateClubStatus(clubId, newStatus);
      res.json(updated);
    } catch (err: any) {
      console.error("Error pausing/resuming club:", err);
      res.status(500).json({ message: err.message || "Failed to update club pause status" });
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
      if (!["OWNER", "ADMIN", "PLAYER"].includes(role)) {
        return res.status(400).json({ message: "Invalid role" });
      }
      
      const updated = await storage.updateUser(userId, { role });
      res.json(updated);
    } catch (err: any) {
      console.error("Error updating user role:", err);
      res.status(500).json({ message: err.message || "Failed to update user role" });
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

      const { membershipStatus, clubRole, category, grade: gradeField, gender, fullName } = req.body;
      
      if (membershipStatus && !["PENDING", "APPROVED", "REJECTED"].includes(membershipStatus)) {
        return res.status(400).json({ message: "Invalid membership status" });
      }
      if (clubRole && !["OWNER", "ADMIN", "PLAYER"].includes(clubRole)) {
        return res.status(400).json({ message: "Invalid club role" });
      }
      const gradeInput = gradeField || category;
      if (gradeInput && !["C3", "C2", "C1", "B3", "B2", "B1", "A3", "A2", "A1", "A", "B", "C", "D"].includes(gradeInput)) {
        return res.status(400).json({ message: "Invalid grade" });
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
      if (gradeInput) {
        updates.grade = gradeInput;
      }
      if (gender) updates.gender = gender;

      if (membershipStatus === "APPROVED" && !clubRole) {
        updates.clubRole = "ADMIN";
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

      const { user, profile } = await storage.createUserWithProfile(
        {
          fullName,
          email,
          password: hashedPassword,
          role: "ADMIN",
          accountStatus: "APPROVED", // Auto-approve since admin is creating
        },
        {
          clubId,
          category: "D",
        }
      );

      // Update profile to be approved
      await storage.updatePlayerProfile(profile.id, { 
        membershipStatus: "APPROVED" as any,
        clubRole: "ADMIN" as any
      } as any);

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
      const members = await storage.getClubMembers(clubId);
      const organizers = members.filter(m => m.user.role === "ADMIN");
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
    if (!["OWNER", "ADMIN"].includes(role)) {
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
    if (!["OWNER", "ADMIN"].includes(role)) {
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
    if (!["OWNER", "ADMIN"].includes(role)) {
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
    if (!["OWNER", "ADMIN"].includes(role)) {
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

    const user = req.user as any;
    const clubId = Number(req.params.clubId);
    const isOwner = user.role === "OWNER";
    const isAdmin = user.role === "ADMIN";

    if (!isOwner && !isAdmin) {
      const profiles = await storage.getUserPlayerProfiles(user.id);
      const hasClubAdmin = profiles.some(
        (p: any) => p.clubId === clubId && p.membershipStatus === "APPROVED" && ["ADMIN"].includes(p.clubRole)
      );
      const isClubOwner = await storage.getClub(clubId).then(c => c?.ownerId === user.id);
      if (!hasClubAdmin && !isClubOwner) return res.sendStatus(403);
    }

    try {
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
              category: "D",
              grade: category || "C3",
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
              category: "D",
              grade: category || "C3",
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

  // ===================== ADMIN PASSWORD MANAGEMENT =====================

  app.get("/api/admin/search-users", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const user = req.user!;
    const isOwner = user.role === "OWNER";
    const isAdmin = user.role === "ADMIN";

    if (!isOwner && !isAdmin) {
      const ownedClubs = await db.select({ id: clubs.id }).from(clubs).where(eq(clubs.ownerId, user.id));
      const adminProfiles = await db.select({ clubId: playerProfiles.clubId }).from(playerProfiles)
        .where(and(eq(playerProfiles.userId, user.id), eq(playerProfiles.membershipStatus, "APPROVED"), inArray(playerProfiles.clubRole, ["ADMIN"])));
      if (ownedClubs.length === 0 && adminProfiles.length === 0) return res.sendStatus(403);
    }

    try {
      const q = (req.query.q as string || "").trim().toLowerCase();
      if (q.length < 2) return res.json([]);

      let accessibleClubIds: number[] | null = null;
      if (!isOwner && !isAdmin) {
        const ownedClubs = await db.select({ id: clubs.id }).from(clubs).where(eq(clubs.ownerId, user.id));
        const adminProfiles = await db.select({ clubId: playerProfiles.clubId }).from(playerProfiles)
          .where(and(eq(playerProfiles.userId, user.id), eq(playerProfiles.membershipStatus, "APPROVED"), inArray(playerProfiles.clubRole, ["ADMIN"])));
        const clubIdSet = new Set([...ownedClubs.map(c => c.id), ...adminProfiles.map(p => p.clubId)]);
        accessibleClubIds = [...clubIdSet];
      }

      let results;
      if (accessibleClubIds && accessibleClubIds.length > 0) {
        results = await db.selectDistinct({
          id: users.id,
          fullName: users.fullName,
          email: users.email,
          role: users.role,
        }).from(users)
          .innerJoin(playerProfiles, eq(users.id, playerProfiles.userId))
          .where(and(
            inArray(playerProfiles.clubId, accessibleClubIds),
            or(
              sql`LOWER(${users.fullName}) LIKE ${'%' + q + '%'}`,
              sql`LOWER(${users.email}) LIKE ${'%' + q + '%'}`
            )
          ))
          .limit(20);
      } else {
        results = await db.select({
          id: users.id,
          fullName: users.fullName,
          email: users.email,
          role: users.role,
        }).from(users)
          .where(or(
            sql`LOWER(${users.fullName}) LIKE ${'%' + q + '%'}`,
            sql`LOWER(${users.email}) LIKE ${'%' + q + '%'}`
          ))
          .limit(20);
      }

      res.json(results);
    } catch (err: any) {
      console.error("Error searching users:", err);
      res.status(500).json({ message: "Failed to search users" });
    }
  });

  app.get("/api/admin/password-resets", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const user = req.user!;
    const isOwner = user.role === "OWNER";
    const isAdmin = user.role === "ADMIN";

    if (!isOwner && !isAdmin) {
      const ownedClubs = await db.select({ id: clubs.id }).from(clubs).where(eq(clubs.ownerId, user.id));
      const adminProfiles = await db.select({ clubId: playerProfiles.clubId }).from(playerProfiles)
        .where(and(eq(playerProfiles.userId, user.id), eq(playerProfiles.membershipStatus, "APPROVED"), inArray(playerProfiles.clubRole, ["ADMIN"])));
      if (ownedClubs.length === 0 && adminProfiles.length === 0) return res.sendStatus(403);
    }

    try {
      let accessibleClubIds: number[] | null = null;
      if (!isOwner && !isAdmin) {
        const ownedClubs = await db.select({ id: clubs.id }).from(clubs).where(eq(clubs.ownerId, user.id));
        const adminProfiles = await db.select({ clubId: playerProfiles.clubId }).from(playerProfiles)
          .where(and(eq(playerProfiles.userId, user.id), eq(playerProfiles.membershipStatus, "APPROVED"), inArray(playerProfiles.clubRole, ["ADMIN"])));
        const clubIdSet = new Set([...ownedClubs.map(c => c.id), ...adminProfiles.map(p => p.clubId)]);
        accessibleClubIds = [...clubIdSet];
      }

      let pendingResets;
      if (accessibleClubIds && accessibleClubIds.length > 0) {
        pendingResets = await db.selectDistinct({
          id: users.id,
          fullName: users.fullName,
          email: users.email,
          passwordResetToken: users.passwordResetToken,
          passwordResetExpiry: users.passwordResetExpiry,
        }).from(users)
          .innerJoin(playerProfiles, eq(users.id, playerProfiles.userId))
          .where(and(
            isNotNull(users.passwordResetToken),
            gt(users.passwordResetExpiry!, new Date()),
            inArray(playerProfiles.clubId, accessibleClubIds)
          ));
      } else {
        pendingResets = await db.select({
          id: users.id,
          fullName: users.fullName,
          email: users.email,
          passwordResetToken: users.passwordResetToken,
          passwordResetExpiry: users.passwordResetExpiry,
        }).from(users)
          .where(and(
            isNotNull(users.passwordResetToken),
            gt(users.passwordResetExpiry!, new Date())
          ));
      }

      res.json(pendingResets);
    } catch (err: any) {
      console.error("Error fetching password resets:", err);
      res.status(500).json({ message: "Failed to fetch password resets" });
    }
  });

  app.post("/api/admin/generate-reset", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const user = req.user!;
    const isOwner = user.role === "OWNER";
    const isAdmin = user.role === "ADMIN";

    if (!isOwner && !isAdmin) {
      const ownedClubs = await db.select({ id: clubs.id }).from(clubs).where(eq(clubs.ownerId, user.id));
      const adminProfiles = await db.select({ clubId: playerProfiles.clubId }).from(playerProfiles)
        .where(and(eq(playerProfiles.userId, user.id), eq(playerProfiles.membershipStatus, "APPROVED"), inArray(playerProfiles.clubRole, ["ADMIN"])));
      if (ownedClubs.length === 0 && adminProfiles.length === 0) return res.sendStatus(403);
    }

    try {
      const { email } = req.body;
      if (!email) return res.status(400).json({ message: "Email is required" });

      const targetUser = await storage.getUserByUsername(email);
      if (!targetUser) return res.status(404).json({ message: "User not found" });

      if (!isOwner && !isAdmin) {
        const ownedClubs2 = await db.select({ id: clubs.id }).from(clubs).where(eq(clubs.ownerId, user.id));
        const adminProfiles2 = await db.select({ clubId: playerProfiles.clubId }).from(playerProfiles)
          .where(and(eq(playerProfiles.userId, user.id), eq(playerProfiles.membershipStatus, "APPROVED"), inArray(playerProfiles.clubRole, ["ADMIN"])));
        const myClubIds = new Set([...ownedClubs2.map(c => c.id), ...adminProfiles2.map(p => p.clubId)]);
        const targetProfiles = await db.select({ clubId: playerProfiles.clubId }).from(playerProfiles)
          .where(eq(playerProfiles.userId, targetUser.id));
        const hasAccess = targetProfiles.some(p => myClubIds.has(p.clubId));
        if (!hasAccess) return res.status(403).json({ message: "You can only reset passwords for members in your club" });
      }

      const token = randomBytes(32).toString("hex");
      const expiry = new Date(Date.now() + 24 * 60 * 60 * 1000);

      await db.update(users)
        .set({ passwordResetToken: token, passwordResetExpiry: expiry })
        .where(eq(users.id, targetUser.id));

      res.json({ token, fullName: targetUser.fullName });
    } catch (err: any) {
      console.error("Error generating reset:", err);
      res.status(500).json({ message: "Failed to generate reset link" });
    }
  });

  app.post("/api/admin/set-password", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const user = req.user!;
    const isOwner = user.role === "OWNER";
    const isAdmin = user.role === "ADMIN";

    if (!isOwner && !isAdmin) {
      const ownedClubs = await db.select({ id: clubs.id }).from(clubs).where(eq(clubs.ownerId, user.id));
      const adminProfiles = await db.select({ clubId: playerProfiles.clubId }).from(playerProfiles)
        .where(and(eq(playerProfiles.userId, user.id), eq(playerProfiles.membershipStatus, "APPROVED"), inArray(playerProfiles.clubRole, ["ADMIN"])));
      if (ownedClubs.length === 0 && adminProfiles.length === 0) return res.sendStatus(403);
    }

    try {
      const { userId, password } = req.body;
      if (!userId || !password) return res.status(400).json({ message: "userId and password are required" });
      if (password.length < 6) return res.status(400).json({ message: "Password must be at least 6 characters" });

      if (!isOwner && !isAdmin) {
        const ownedClubs2 = await db.select({ id: clubs.id }).from(clubs).where(eq(clubs.ownerId, user.id));
        const adminProfiles2 = await db.select({ clubId: playerProfiles.clubId }).from(playerProfiles)
          .where(and(eq(playerProfiles.userId, user.id), eq(playerProfiles.membershipStatus, "APPROVED"), inArray(playerProfiles.clubRole, ["ADMIN"])));
        const myClubIds = new Set([...ownedClubs2.map(c => c.id), ...adminProfiles2.map(p => p.clubId)]);
        const targetProfiles = await db.select({ clubId: playerProfiles.clubId }).from(playerProfiles)
          .where(eq(playerProfiles.userId, userId));
        const hasAccess = targetProfiles.some(p => myClubIds.has(p.clubId));
        if (!hasAccess) return res.status(403).json({ message: "You can only set passwords for members in your club" });
      }

      const hashedPassword = await hashPassword(password);
      const [updated] = await db.update(users)
        .set({ password: hashedPassword, passwordResetToken: null, passwordResetExpiry: null })
        .where(eq(users.id, userId))
        .returning({ id: users.id, fullName: users.fullName });

      if (!updated) return res.status(404).json({ message: "User not found" });

      res.json({ message: `Password updated for ${updated.fullName}` });
    } catch (err: any) {
      console.error("Error setting password:", err);
      res.status(500).json({ message: "Failed to set password" });
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
          grade: playerProfiles.grade,
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
          grade: playerProfiles.grade,
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
        category: "D",
        grade: category || "C3",
        clubRole: "PLAYER",
        membershipStatus: "APPROVED",
      });

      await storage.createSessionSignup(sessionId, newProfile.id, session.sessionFee || 0);

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

  // === DELETE ACCOUNT (self-service) ===
  app.post("/api/account/close", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const userId = req.user!.id;
    const userName = req.user!.fullName;
    const userEmail = req.user!.email;

    try {
      const ownerUsers = await db.select().from(users).where(and(eq(users.role, "OWNER"), sql`${users.id} != ${userId}`));

      await storage.deleteUserCompletely(userId);

      for (const owner of ownerUsers) {
        try {
          await storage.createNotification({
            userId: owner.id,
            type: "ACCOUNT_DELETED",
            title: "Account Deleted",
            message: `${userName} (${userEmail}) has deleted their account.`,
            linkUrl: "/admin",
          });
        } catch (notifErr) {
          console.error("Failed to notify owner:", notifErr);
        }
      }

      req.logout((err) => {
        if (err) console.error("Logout error:", err);
        req.session.destroy(() => {
          res.json({ message: "Account deleted successfully" });
        });
      });
    } catch (err: any) {
      console.error("Error deleting account:", err);
      res.status(500).json({ message: "Failed to delete account" });
    }
  });

  // === ADMIN: View closed accounts ===
  app.get("/api/admin/closed-accounts", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    if (req.user!.role !== "OWNER") return res.sendStatus(403);

    try {
      const closedUsers = await db.select({
        id: users.id,
        fullName: users.fullName,
        email: users.email,
        role: users.role,
        closedAt: users.closedAt,
        closedReason: users.closedReason,
      }).from(users).where(sql`${users.closedAt} IS NOT NULL`).orderBy(desc(users.closedAt));
      res.json(closedUsers);
    } catch (err: any) {
      res.status(500).json({ message: "Failed to fetch closed accounts" });
    }
  });

  // === ADMIN: Update signup fee (OWNER only) ===
  app.patch("/api/admin/signups/:signupId/fee", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const user = req.user!;
    const isOwner = user.role === "OWNER";

    try {
      const signupId = Number(req.params.signupId);
      const { fee } = req.body;
      if (fee === undefined || typeof fee !== "number" || fee < 0) {
        return res.status(400).json({ message: "Fee must be a non-negative number (in pence)" });
      }

      if (!isOwner) {
        const signup = await db.select({ sessionId: sessionSignups.sessionId }).from(sessionSignups).where(eq(sessionSignups.id, signupId)).limit(1);
        if (signup.length === 0) return res.status(404).json({ message: "Signup not found" });
        const session = await db.select({ clubId: sessions.clubId }).from(sessions).where(eq(sessions.id, signup[0].sessionId)).limit(1);
        if (session.length === 0) return res.status(404).json({ message: "Session not found" });
        const clubId = session[0].clubId;
        const ownedClub = await db.select({ id: clubs.id }).from(clubs).where(and(eq(clubs.id, clubId), eq(clubs.ownerId, user.id)));
        const adminProfile = await db.select({ id: playerProfiles.id }).from(playerProfiles)
          .where(and(eq(playerProfiles.userId, user.id), eq(playerProfiles.clubId, clubId), eq(playerProfiles.membershipStatus, "APPROVED"), inArray(playerProfiles.clubRole, ["ADMIN"])));
        if (ownedClub.length === 0 && adminProfile.length === 0) return res.sendStatus(403);
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

  app.patch("/api/admin/sessions/:sessionId/bulk-fee", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const user = req.user!;
    const isOwner = user.role === "OWNER";

    try {
      const sessionId = Number(req.params.sessionId);
      const { fee } = req.body;
      if (fee === undefined || typeof fee !== "number" || fee < 0) {
        return res.status(400).json({ message: "Fee must be a non-negative number (in pence)" });
      }

      const sessionRows = await db.select({ id: sessions.id, clubId: sessions.clubId }).from(sessions).where(eq(sessions.id, sessionId)).limit(1);
      if (sessionRows.length === 0) return res.status(404).json({ message: "Session not found" });

      if (!isOwner) {
        const clubId = sessionRows[0].clubId;
        const ownedClub = await db.select({ id: clubs.id }).from(clubs).where(and(eq(clubs.id, clubId), eq(clubs.ownerId, user.id)));
        const adminProfile = await db.select({ id: playerProfiles.id }).from(playerProfiles)
          .where(and(eq(playerProfiles.userId, user.id), eq(playerProfiles.clubId, clubId), eq(playerProfiles.membershipStatus, "APPROVED"), inArray(playerProfiles.clubRole, ["ADMIN"])));
        if (ownedClub.length === 0 && adminProfile.length === 0) return res.sendStatus(403);
      }

      const updated = await db.update(sessionSignups)
        .set({ fee })
        .where(eq(sessionSignups.sessionId, sessionId))
        .returning();

      res.json({ updated: updated.length, fee });
    } catch (err: any) {
      console.error("Error bulk updating session fees:", err);
      res.status(500).json({ message: "Failed to bulk update fees" });
    }
  });

  app.patch("/api/sessions/:sessionId/signups/:signupId/payment", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const user = req.user!;
    const isOwner = user.role === "OWNER";

    try {
      const signupId = Number(req.params.signupId);
      const sessionId = Number(req.params.sessionId);
      const { status } = req.body;
      if (!status || !["PAID", "UNPAID"].includes(status)) {
        return res.status(400).json({ message: "Status must be PAID or UNPAID" });
      }

      const signupRows = await db.select({ id: sessionSignups.id, sessionId: sessionSignups.sessionId })
        .from(sessionSignups).where(eq(sessionSignups.id, signupId)).limit(1);
      if (signupRows.length === 0) return res.status(404).json({ message: "Signup not found" });
      if (signupRows[0].sessionId !== sessionId) return res.status(400).json({ message: "Signup does not belong to this session" });

      if (!isOwner) {
        const session = await db.select({ clubId: sessions.clubId }).from(sessions).where(eq(sessions.id, sessionId)).limit(1);
        if (session.length === 0) return res.status(404).json({ message: "Session not found" });
        const clubId = session[0].clubId;
        const ownedClub = await db.select({ id: clubs.id }).from(clubs).where(and(eq(clubs.id, clubId), eq(clubs.ownerId, user.id)));
        const adminProfile = await db.select({ id: playerProfiles.id }).from(playerProfiles)
          .where(and(eq(playerProfiles.userId, user.id), eq(playerProfiles.clubId, clubId), eq(playerProfiles.membershipStatus, "APPROVED"), inArray(playerProfiles.clubRole, ["ADMIN"])));
        if (ownedClub.length === 0 && adminProfile.length === 0) return res.sendStatus(403);
      }

      const [updated] = await db.update(sessionSignups)
        .set({ paymentStatus: status })
        .where(eq(sessionSignups.id, signupId))
        .returning();
      res.json(updated);
    } catch (err: any) {
      console.error("Error updating payment status:", err);
      res.status(500).json({ message: "Failed to update payment status" });
    }
  });

  // === ADMIN: Analytics summary ===
  app.get("/api/admin/analytics", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const user = req.user!;

    const ownedClubs = await db.select({ id: clubs.id }).from(clubs).where(eq(clubs.ownerId, user.id));
    const adminProfiles = await db.select({ clubId: playerProfiles.clubId }).from(playerProfiles)
      .where(and(eq(playerProfiles.userId, user.id), eq(playerProfiles.membershipStatus, "APPROVED"), inArray(playerProfiles.clubRole, ["ADMIN"])));
    const clubIdSet = new Set([...ownedClubs.map(c => c.id), ...adminProfiles.map(p => p.clubId)]);
    if (clubIdSet.size === 0) return res.sendStatus(403);
    const accessibleClubIds = [...clubIdSet];

    try {
      const allClubs = await storage.getClubs();
      const filteredClubs = allClubs.filter(c => accessibleClubIds.includes(c.id));
      const allSessions = await storage.getSessions();
      const allMatches = await db.select().from(matches);
      const allProfiles = await db.select().from(playerProfiles);
      const allSignups = await db.select().from(sessionSignups);

      const clubAnalytics = filteredClubs.map(club => {
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

      const relevantSessionIds = new Set(filteredClubs.flatMap(club => allSessions.filter(s => s.clubId === club.id).map(s => s.id)));
      const relevantProfiles = allProfiles.filter(p => accessibleClubIds.includes(p.clubId));
      const relevantMatches = allMatches.filter(m => relevantSessionIds.has(m.sessionId));
      const relevantSignups = allSignups.filter(s => relevantSessionIds.has(s.sessionId));

      const totals = {
        totalClubs: filteredClubs.length,
        totalPlayers: relevantProfiles.length,
        totalSessions: allSessions.filter(s => accessibleClubIds.includes(s.clubId)).length,
        totalMatches: relevantMatches.length,
        completedMatches: relevantMatches.filter(m => m.status === "COMPLETED").length,
        totalSignups: relevantSignups.length,
        totalRevenue: relevantSignups.reduce((sum, s) => sum + (s.fee || 0), 0),
        paidRevenue: relevantSignups.filter(s => s.paymentStatus === "PAID").reduce((sum, s) => sum + (s.fee || 0), 0),
      };

      res.json({ clubs: clubAnalytics, totals });
    } catch (err: any) {
      console.error("Error fetching analytics:", err);
      res.status(500).json({ message: "Failed to fetch analytics" });
    }
  });

  app.get("/api/admin/financial-summary", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const user = req.user!;
    const isOwner = user.role === "OWNER";

    let accessibleClubIds: number[] = [];
    if (isOwner) {
      const allClubs = await db.select({ id: clubs.id }).from(clubs);
      accessibleClubIds = allClubs.map(c => c.id);
    } else {
      const ownedClubs = await db.select({ id: clubs.id }).from(clubs).where(eq(clubs.ownerId, user.id));
      const adminProfiles = await db.select({ clubId: playerProfiles.clubId }).from(playerProfiles)
        .where(and(eq(playerProfiles.userId, user.id), eq(playerProfiles.membershipStatus, "APPROVED"), inArray(playerProfiles.clubRole, ["ADMIN"])));
      const clubIdSet = new Set([...ownedClubs.map(c => c.id), ...adminProfiles.map(p => p.clubId)]);
      if (clubIdSet.size === 0) return res.sendStatus(403);
      accessibleClubIds = [...clubIdSet];
    }

    try {
      const queryConditions: any[] = [];

      queryConditions.push(inArray(sessions.clubId, accessibleClubIds));

      const qClubId = req.query.clubId ? Number(req.query.clubId) : null;
      if (qClubId) queryConditions.push(eq(sessions.clubId, qClubId));

      const qDateFrom = req.query.dateFrom ? new Date(req.query.dateFrom as string) : null;
      const qDateTo = req.query.dateTo ? new Date(req.query.dateTo as string) : null;
      if (qDateFrom) queryConditions.push(gte(sessions.date, qDateFrom));
      if (qDateTo) {
        const endOfDay = new Date(qDateTo);
        endOfDay.setHours(23, 59, 59, 999);
        queryConditions.push(lte(sessions.date, endOfDay));
      }

      const qSessionType = req.query.sessionType as string | undefined;
      if (qSessionType && qSessionType !== "all") {
        queryConditions.push(eq(sessions.sessionType, qSessionType as any));
      }

      const qMatchMode = req.query.matchMode as string | undefined;
      if (qMatchMode && qMatchMode !== "all") {
        queryConditions.push(eq(sessions.matchMode, qMatchMode as any));
      }

      const qSearch = req.query.search as string | undefined;
      if (qSearch && qSearch.trim()) {
        const searchTerm = `%${qSearch.trim()}%`;
        queryConditions.push(
          or(
            ilike(sessions.title, searchTerm),
            ilike(users.fullName, searchTerm),
            ilike(clubs.name, searchTerm),
            sql`CAST(${sessions.id} AS TEXT) LIKE ${searchTerm}`
          )
        );
      }

      const signupsData = await db
        .select({
          signupId: sessionSignups.id,
          sessionId: sessionSignups.sessionId,
          playerId: sessionSignups.playerId,
          fee: sessionSignups.fee,
          paymentStatus: sessionSignups.paymentStatus,
          paymentMethod: sessionSignups.paymentMethod,
          signupStatus: sessionSignups.signupStatus,
          verifiedByAdmin: sessionSignups.verifiedByAdmin,
          attendanceStatus: sessionSignups.attendanceStatus,
          attendanceNote: sessionSignups.attendanceNote,
          partialPercentage: sessionSignups.partialPercentage,
          policyMet: sessionSignups.policyMet,
          signupTime: sessionSignups.signupTime,
          sessionTitle: sessions.title,
          sessionDate: sessions.date,
          sessionType: sessions.sessionType,
          matchMode: sessions.matchMode,
          sessionFee: sessions.sessionFee,
          clubId: sessions.clubId,
          clubName: clubs.name,
          playerName: users.fullName,
          playerEmail: users.email,
          playerUserId: users.id,
        })
        .from(sessionSignups)
        .innerJoin(sessions, eq(sessionSignups.sessionId, sessions.id))
        .innerJoin(clubs, eq(sessions.clubId, clubs.id))
        .innerJoin(playerProfiles, eq(sessionSignups.playerId, playerProfiles.id))
        .innerJoin(users, eq(playerProfiles.userId, users.id))
        .where(queryConditions.length > 0 ? and(...queryConditions) : undefined)
        .orderBy(desc(sessions.date));

      res.json(signupsData);
    } catch (err: any) {
      console.error("Error fetching financial summary:", err);
      res.status(500).json({ message: "Failed to fetch financial summary" });
    }
  });

  // === CREDIT LEDGER ENDPOINTS ===

  // Get credit balance for a user in a club
  app.get("/api/credits/balance", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const user = req.user!;
    const userId = req.query.userId ? Number(req.query.userId) : user.id;
    const clubId = req.query.clubId ? Number(req.query.clubId) : null;

    try {
      const conditions: any[] = [eq(creditLedger.userId, userId)];
      if (clubId) conditions.push(eq(creditLedger.clubId, clubId));

      if (userId !== user.id) {
        const isOwner = user.role === "OWNER";
        if (!isOwner && clubId) {
          const allowed = await canPerform({ id: user.id, role: user.role }, "MANAGE_CREDITS", clubId);
          if (!allowed) return res.sendStatus(403);
        } else if (!isOwner) {
          return res.sendStatus(403);
        }
      }

      const result = await db
        .select({ total: sql<number>`COALESCE(SUM(${creditLedger.amount}), 0)` })
        .from(creditLedger)
        .where(and(...conditions));

      res.json({ balance: Number(result[0]?.total || 0) });
    } catch (err: any) {
      console.error("Error fetching credit balance:", err);
      res.status(500).json({ message: "Failed to fetch credit balance" });
    }
  });

  // Get credit ledger entries for a user
  app.get("/api/credits/history", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const user = req.user!;
    const userId = req.query.userId ? Number(req.query.userId) : user.id;
    const clubId = req.query.clubId ? Number(req.query.clubId) : null;

    try {
      if (userId !== user.id) {
        const isOwner = user.role === "OWNER";
        if (!isOwner && clubId) {
          const allowed = await canPerform({ id: user.id, role: user.role }, "MANAGE_CREDITS", clubId);
          if (!allowed) return res.sendStatus(403);
        } else if (!isOwner) {
          return res.sendStatus(403);
        }
      }

      const conditions: any[] = [eq(creditLedger.userId, userId)];
      if (clubId) conditions.push(eq(creditLedger.clubId, clubId));

      const entries = await db
        .select({
          id: creditLedger.id,
          userId: creditLedger.userId,
          clubId: creditLedger.clubId,
          amount: creditLedger.amount,
          reason: creditLedger.reason,
          linkedSessionId: creditLedger.linkedSessionId,
          linkedSignupId: creditLedger.linkedSignupId,
          attendanceStatus: creditLedger.attendanceStatus,
          createdById: creditLedger.createdById,
          createdAt: creditLedger.createdAt,
          clubName: clubs.name,
          sessionTitle: sessions.title,
          sessionDate: sessions.date,
          createdByName: users.fullName,
        })
        .from(creditLedger)
        .innerJoin(clubs, eq(creditLedger.clubId, clubs.id))
        .leftJoin(sessions, eq(creditLedger.linkedSessionId, sessions.id))
        .innerJoin(users, eq(creditLedger.createdById, users.id))
        .where(and(...conditions))
        .orderBy(desc(creditLedger.createdAt));

      res.json(entries);
    } catch (err: any) {
      console.error("Error fetching credit history:", err);
      res.status(500).json({ message: "Failed to fetch credit history" });
    }
  });

  // Create a credit ledger entry (admin action)
  app.post("/api/credits", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const admin = req.user!;

    const schema = z.object({
      userId: z.number(),
      clubId: z.number(),
      amount: z.number(),
      reason: z.string().min(1, "Reason is required"),
      linkedSessionId: z.number().optional().nullable(),
      linkedSignupId: z.number().optional().nullable(),
      attendanceStatus: z.string().optional().nullable(),
    });

    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });

    const { userId, clubId, amount, reason, linkedSessionId, linkedSignupId, attendanceStatus } = parsed.data;

    try {
      const allowed = await canPerform({ id: admin.id, role: admin.role }, "MANAGE_CREDITS", clubId);
      if (!allowed) return res.sendStatus(403);

      if (linkedSessionId && linkedSignupId && amount > 0) {
        const existing = await db
          .select({ id: creditLedger.id, amount: creditLedger.amount })
          .from(creditLedger)
          .where(and(
            eq(creditLedger.userId, userId),
            eq(creditLedger.linkedSessionId, linkedSessionId),
            eq(creditLedger.linkedSignupId, linkedSignupId),
          ));
        const existingPositive = existing.filter(e => e.amount > 0);
        const existingNegative = existing.filter(e => e.amount < 0);
        const hasUnusedCredit = existingPositive.length > existingNegative.length;
        if (hasUnusedCredit) {
          return res.status(400).json({ message: "Credit already exists for this session signup" });
        }
      }

      if (linkedSignupId && amount > 0) {
        const signup = await db
          .select({ fee: sessionSignups.fee })
          .from(sessionSignups)
          .where(eq(sessionSignups.id, linkedSignupId));
        if (signup.length > 0 && amount > signup[0].fee) {
          return res.status(400).json({ message: "Credit amount cannot exceed session fee" });
        }
      }

      const [entry] = await db
        .insert(creditLedger)
        .values({
          userId,
          clubId,
          amount,
          reason,
          linkedSessionId: linkedSessionId || null,
          linkedSignupId: linkedSignupId || null,
          attendanceStatus: attendanceStatus || null,
          createdById: admin.id,
        })
        .returning();

      res.json(entry);
    } catch (err: any) {
      console.error("Error creating credit entry:", err);
      res.status(500).json({ message: "Failed to create credit entry" });
    }
  });

  // Get credit balances for all users in a club (admin view)
  app.get("/api/credits/club/:clubId/balances", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const user = req.user!;
    const clubId = Number(req.params.clubId);

    try {
      const allowed = await canPerform({ id: user.id, role: user.role }, "MANAGE_CREDITS", clubId);
      if (!allowed) return res.sendStatus(403);

      const balances = await db
        .select({
          userId: creditLedger.userId,
          balance: sql<number>`COALESCE(SUM(${creditLedger.amount}), 0)`,
        })
        .from(creditLedger)
        .where(eq(creditLedger.clubId, clubId))
        .groupBy(creditLedger.userId);

      res.json(balances);
    } catch (err: any) {
      console.error("Error fetching club credit balances:", err);
      res.status(500).json({ message: "Failed to fetch credit balances" });
    }
  });

  app.get("/api/admin/credit-history", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const user = req.user!;
    const clubId = req.query.clubId ? Number(req.query.clubId) : null;

    try {
      const isOwner = user.role === "OWNER";
      if (!isOwner) {
        if (clubId) {
          const allowed = await canPerform({ id: user.id, role: user.role }, "MANAGE_CREDITS", clubId);
          if (!allowed) return res.sendStatus(403);
        } else {
          return res.sendStatus(403);
        }
      }

      const query = clubId
        ? sql`SELECT cl.id, cl.user_id AS "userId", cl.club_id AS "clubId", cl.amount, cl.reason,
              cl.linked_session_id AS "linkedSessionId", cl.attendance_status AS "attendanceStatus",
              cl.created_at AS "createdAt", c.name AS "clubName", s.title AS "sessionTitle",
              s.date AS "sessionDate", pu.full_name AS "playerName", pu.email AS "playerEmail",
              cu.full_name AS "createdByName"
              FROM credit_ledger cl
              INNER JOIN clubs c ON cl.club_id = c.id
              LEFT JOIN sessions s ON cl.linked_session_id = s.id
              INNER JOIN users pu ON cl.user_id = pu.id
              INNER JOIN users cu ON cl.created_by_id = cu.id
              WHERE cl.club_id = ${clubId}
              ORDER BY cl.created_at DESC`
        : sql`SELECT cl.id, cl.user_id AS "userId", cl.club_id AS "clubId", cl.amount, cl.reason,
              cl.linked_session_id AS "linkedSessionId", cl.attendance_status AS "attendanceStatus",
              cl.created_at AS "createdAt", c.name AS "clubName", s.title AS "sessionTitle",
              s.date AS "sessionDate", pu.full_name AS "playerName", pu.email AS "playerEmail",
              cu.full_name AS "createdByName"
              FROM credit_ledger cl
              INNER JOIN clubs c ON cl.club_id = c.id
              LEFT JOIN sessions s ON cl.linked_session_id = s.id
              INNER JOIN users pu ON cl.user_id = pu.id
              INNER JOIN users cu ON cl.created_by_id = cu.id
              ORDER BY cl.created_at DESC`;

      const entries = await db.execute(query);
      res.json(entries.rows);
    } catch (err: any) {
      console.error("Error fetching admin credit history:", err);
      res.status(500).json({ message: "Failed to fetch credit history" });
    }
  });

  // Update attendance status for a signup (with policy validation fields)
  app.patch("/api/sessions/:sessionId/signups/:signupId/attendance", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const admin = req.user!;
    const sessionId = Number(req.params.sessionId);
    const signupId = Number(req.params.signupId);

    const schema = z.object({
      attendanceStatus: z.enum([
        "ATTENDED", "NOT_ATTENDED", "PARTIAL_ATTENDANCE", "LATE_ARRIVAL",
        "NO_SHOW", "JUSTIFIED_CANCELLATION", "SICKNESS", "EMERGENCY",
        "SESSION_ABANDONED", "OTHER"
      ]),
      attendanceNote: z.string().optional().nullable(),
      partialPercentage: z.number().min(0).max(100).optional().nullable(),
      policyMet: z.boolean().optional().nullable(),
    });

    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });

    try {
      const session = await db.select().from(sessions).where(eq(sessions.id, sessionId)).then(r => r[0]);
      if (!session) return res.status(404).json({ message: "Session not found" });

      const allowed = await canPerform({ id: admin.id, role: admin.role }, "MANAGE_SESSIONS", session.clubId);
      if (!allowed) return res.sendStatus(403);

      const [updated] = await db
        .update(sessionSignups)
        .set({
          attendanceStatus: parsed.data.attendanceStatus,
          attendanceNote: parsed.data.attendanceNote || null,
          partialPercentage: parsed.data.partialPercentage ?? null,
          policyMet: parsed.data.policyMet ?? null,
        })
        .where(and(eq(sessionSignups.id, signupId), eq(sessionSignups.sessionId, sessionId)))
        .returning();

      if (!updated) return res.status(404).json({ message: "Signup not found" });
      res.json(updated);
    } catch (err: any) {
      console.error("Error updating attendance:", err);
      res.status(500).json({ message: "Failed to update attendance" });
    }
  });

  // Apply credit from session (deduct credit when player signs up / uses credit)
  app.post("/api/credits/use", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const admin = req.user!;

    const schema = z.object({
      userId: z.number(),
      clubId: z.number(),
      sessionId: z.number(),
      signupId: z.number(),
      amount: z.number().min(1),
    });

    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.message });

    const { userId, clubId, sessionId, signupId, amount } = parsed.data;

    try {
      const allowed = await canPerform({ id: admin.id, role: admin.role }, "MANAGE_CREDITS", clubId);
      if (!allowed) return res.sendStatus(403);

      const balanceResult = await db
        .select({ total: sql<number>`COALESCE(SUM(${creditLedger.amount}), 0)` })
        .from(creditLedger)
        .where(and(eq(creditLedger.userId, userId), eq(creditLedger.clubId, clubId)));

      const currentBalance = Number(balanceResult[0]?.total || 0);
      if (currentBalance < amount) {
        return res.status(400).json({ message: "Insufficient credit balance" });
      }

      const [entry] = await db
        .insert(creditLedger)
        .values({
          userId,
          clubId,
          amount: -amount,
          reason: `Credit used for session`,
          linkedSessionId: sessionId,
          linkedSignupId: signupId,
          createdById: admin.id,
        })
        .returning();

      res.json(entry);
    } catch (err: any) {
      console.error("Error using credit:", err);
      res.status(500).json({ message: "Failed to use credit" });
    }
  });

  // Get all credit balances the current user has across clubs (for profile view)
  app.get("/api/my-credits", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const user = req.user!;

    try {
      const balances = await db
        .select({
          clubId: creditLedger.clubId,
          clubName: clubs.name,
          balance: sql<number>`COALESCE(SUM(${creditLedger.amount}), 0)`,
        })
        .from(creditLedger)
        .innerJoin(clubs, eq(creditLedger.clubId, clubs.id))
        .where(eq(creditLedger.userId, user.id))
        .groupBy(creditLedger.clubId, clubs.name);

      res.json(balances);
    } catch (err: any) {
      console.error("Error fetching user credits:", err);
      res.status(500).json({ message: "Failed to fetch credits" });
    }
  });

  // Get outstanding (unpaid) session fees for the current user across all clubs
  app.get("/api/my-outstanding-payments", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const user = req.user!;

    try {
      const profiles = await db
        .select({ id: playerProfiles.id, clubId: playerProfiles.clubId })
        .from(playerProfiles)
        .where(eq(playerProfiles.userId, user.id));

      if (profiles.length === 0) return res.json([]);

      const profileIds = profiles.map(p => p.id);
      const unpaidSignups = await db
        .select({
          signupId: sessionSignups.id,
          sessionId: sessionSignups.sessionId,
          playerId: sessionSignups.playerId,
          fee: sessionSignups.fee,
          paymentStatus: sessionSignups.paymentStatus,
          paymentMethod: sessionSignups.paymentMethod,
          paymentNotes: sessionSignups.paymentNotes,
          signupStatus: sessionSignups.signupStatus,
          signupTime: sessionSignups.signupTime,
          sessionTitle: sessions.title,
          sessionDate: sessions.date,
          clubId: sessions.clubId,
          clubName: clubs.name,
        })
        .from(sessionSignups)
        .innerJoin(sessions, eq(sessionSignups.sessionId, sessions.id))
        .innerJoin(clubs, eq(sessions.clubId, clubs.id))
        .where(
          and(
            inArray(sessionSignups.playerId, profileIds),
            eq(sessionSignups.paymentStatus, "UNPAID"),
            inArray(sessionSignups.signupStatus, ["CONFIRMED", "WAITING"])
          )
        )
        .orderBy(desc(sessions.date));

      res.json(unpaidSignups);
    } catch (err: any) {
      console.error("Error fetching outstanding payments:", err);
      res.status(500).json({ message: "Failed to fetch outstanding payments" });
    }
  });

  // Admin: Request payment from a player (sends notification)
  app.post("/api/admin/request-payment", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const { signupId, sessionId, playerId, message } = req.body;
    
    const session = await storage.getSession(sessionId);
    if (!session) return res.status(404).json({ message: "Session not found" });

    const canAccess = await hasAdminAccess(req.user!.id, req.user!.role, session.clubId);
    if (!canAccess) return res.sendStatus(403);

    const signup = await db.select().from(sessionSignups).where(eq(sessionSignups.id, signupId)).limit(1);
    if (!signup.length) return res.status(404).json({ message: "Signup not found" });

    const profile = await db.select().from(playerProfiles).where(eq(playerProfiles.id, playerId)).limit(1);
    if (!profile.length) return res.status(404).json({ message: "Player not found" });

    const club = await storage.getClub(session.clubId);
    const feeDisplay = `£${(signup[0].fee / 100).toFixed(2)}`;

    await storage.createNotification({
      userId: profile[0].userId,
      type: "PAYMENT_REQUEST",
      title: "Payment Requested",
      message: message || `Payment of ${feeDisplay} is due for "${session.title}" at ${club?.name || "your club"}. Please arrange payment.`,
      linkUrl: "/profile",
    });

    res.json({ success: true });
  });

  // Admin: Get outstanding payments for a specific player in a club
  app.get("/api/admin/clubs/:clubId/player/:playerId/outstanding", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const clubId = Number(req.params.clubId);
    const playerId = Number(req.params.playerId);

    const canAccess = await hasAdminAccess(req.user!.id, req.user!.role, clubId);
    if (!canAccess) return res.sendStatus(403);

    try {
      const unpaidSignups = await db
        .select({
          signupId: sessionSignups.id,
          sessionId: sessionSignups.sessionId,
          playerId: sessionSignups.playerId,
          fee: sessionSignups.fee,
          paymentStatus: sessionSignups.paymentStatus,
          paymentMethod: sessionSignups.paymentMethod,
          paymentNotes: sessionSignups.paymentNotes,
          signupStatus: sessionSignups.signupStatus,
          signupTime: sessionSignups.signupTime,
          sessionTitle: sessions.title,
          sessionDate: sessions.date,
        })
        .from(sessionSignups)
        .innerJoin(sessions, eq(sessionSignups.sessionId, sessions.id))
        .where(
          and(
            eq(sessionSignups.playerId, playerId),
            eq(sessions.clubId, clubId),
            eq(sessionSignups.paymentStatus, "UNPAID"),
            inArray(sessionSignups.signupStatus, ["CONFIRMED", "WAITING"])
          )
        )
        .orderBy(desc(sessions.date));

      res.json(unpaidSignups);
    } catch (err: any) {
      console.error("Error fetching player outstanding payments:", err);
      res.status(500).json({ message: "Failed to fetch outstanding payments" });
    }
  });

  // Get credit history for current user (for profile view)
  app.get("/api/my-credits/history", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const user = req.user!;
    const clubId = req.query.clubId ? Number(req.query.clubId) : null;

    try {
      const conditions: any[] = [eq(creditLedger.userId, user.id)];
      if (clubId) conditions.push(eq(creditLedger.clubId, clubId));

      const entries = await db
        .select({
          id: creditLedger.id,
          clubId: creditLedger.clubId,
          amount: creditLedger.amount,
          reason: creditLedger.reason,
          linkedSessionId: creditLedger.linkedSessionId,
          attendanceStatus: creditLedger.attendanceStatus,
          createdAt: creditLedger.createdAt,
          clubName: clubs.name,
          sessionTitle: sessions.title,
          sessionDate: sessions.date,
        })
        .from(creditLedger)
        .innerJoin(clubs, eq(creditLedger.clubId, clubs.id))
        .leftJoin(sessions, eq(creditLedger.linkedSessionId, sessions.id))
        .where(and(...conditions))
        .orderBy(desc(creditLedger.createdAt));

      res.json(entries);
    } catch (err: any) {
      console.error("Error fetching credit history:", err);
      res.status(500).json({ message: "Failed to fetch credit history" });
    }
  });

  // === ADMIN: Global rankings (OWNER and ADMIN only) ===
  app.get("/api/admin/rankings", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);

    const user = req.user!;
    const isOwner = user.role === "OWNER";
    const isAdmin = user.role === "ADMIN";

    if (!isOwner && !isAdmin) {
      return res.sendStatus(403);
    }

    try {
      let accessibleClubIds: number[] | null = null;
      if (!isOwner) {
        const ownedClubs = await db.select({ id: clubs.id }).from(clubs).where(eq(clubs.ownerId, user.id));
        const adminProfiles = await db.select({ clubId: playerProfiles.clubId }).from(playerProfiles)
          .where(and(eq(playerProfiles.userId, user.id), inArray(playerProfiles.clubRole, ["ADMIN"])));
        const clubIdSet = new Set([...ownedClubs.map(c => c.id), ...adminProfiles.map(p => p.clubId)]);
        accessibleClubIds = clubIdSet.size > 0 ? [...clubIdSet] : [];
      }

      const conditions: any[] = [];

      const qClubId = req.query.clubId ? Number(req.query.clubId) : null;
      if (qClubId) {
        conditions.push(eq(playerProfiles.clubId, qClubId));
      } else if (accessibleClubIds && accessibleClubIds.length > 0) {
        conditions.push(inArray(playerProfiles.clubId, accessibleClubIds));
      } else if (accessibleClubIds && accessibleClubIds.length === 0) {
        return res.json([]);
      }
      if (req.query.category) conditions.push(eq(playerProfiles.category, req.query.category as any));
      if (req.query.gender) conditions.push(eq(playerProfiles.gender, req.query.gender as any));
      if (req.query.city) conditions.push(eq(clubs.city, req.query.city as string));
      if (req.query.country) conditions.push(eq(clubs.country, req.query.country as string));

      const hasDateFilter = req.query.dateFrom || req.query.dateTo;
      const combineAcrossClubs = !qClubId;

      if (hasDateFilter) {
        const profileRows = await db
          .select({
            profileId: playerProfiles.id,
            userId: playerProfiles.userId,
            clubId: playerProfiles.clubId,
            clubName: clubs.name,
            clubCity: clubs.city,
            clubCountry: clubs.country,
            fullName: users.fullName,
            email: users.email,
            phone: users.phone,
            gender: playerProfiles.gender,
            category: playerProfiles.category,
            grade: playerProfiles.grade,
            playerStatus: playerProfiles.playerStatus,
            clubRole: playerProfiles.clubRole,
            membershipStatus: playerProfiles.membershipStatus,
            emailVerified: users.emailVerified,
            isJunior: users.isJunior,
            userCountry: users.country,
            userCity: users.city,
            userRegion: users.region,
            createdAt: users.createdAt,
          })
          .from(playerProfiles)
          .innerJoin(users, eq(playerProfiles.userId, users.id))
          .innerJoin(clubs, eq(playerProfiles.clubId, clubs.id))
          .where(conditions.length > 0 ? and(...conditions) : undefined);

        if (profileRows.length === 0) return res.json([]);

        const profileIds = profileRows.map(p => p.profileId);
        const matchConditions: any[] = [
          eq(matches.isCompleted, true),
          eq(matches.status, "COMPLETED"),
        ];
        if (req.query.dateFrom) matchConditions.push(sql`${matches.completedAt} >= ${new Date(req.query.dateFrom as string)}`);
        if (req.query.dateTo) matchConditions.push(sql`${matches.completedAt} <= ${new Date(req.query.dateTo as string)}`);

        const completedMatches = await db.select()
          .from(matches)
          .where(and(...matchConditions));

        const statsMap: Record<number, { played: number; won: number }> = {};
        for (const id of profileIds) statsMap[id] = { played: 0, won: 0 };

        for (const m of completedMatches) {
          const teamA = [m.teamAPlayer1Id, m.teamAPlayer2Id].filter(Boolean) as number[];
          const teamB = [m.teamBPlayer1Id, m.teamBPlayer2Id].filter(Boolean) as number[];
          const aWon = (m.scoreA || 0) > (m.scoreB || 0);
          for (const pid of [...teamA, ...teamB]) {
            if (statsMap[pid] !== undefined) {
              statsMap[pid].played++;
              if ((teamA.includes(pid) && aWon) || (teamB.includes(pid) && !aWon)) {
                statsMap[pid].won++;
              }
            }
          }
        }

        if (combineAcrossClubs) {
          const userMap = new Map<number, any>();
          for (const p of profileRows) {
            const s = statsMap[p.profileId] || { played: 0, won: 0 };
            if (userMap.has(p.userId)) {
              const existing = userMap.get(p.userId);
              existing.matchesPlayed += s.played;
              existing.matchesWon += s.won;
              if (!existing._clubNames.includes(p.clubName)) {
                existing._clubNames.push(p.clubName);
                existing.clubName = existing._clubNames.join(", ");
              }
              if (!existing.clubCity && p.clubCity) existing.clubCity = p.clubCity;
              if (!existing.clubCountry && p.clubCountry) existing.clubCountry = p.clubCountry;
            } else {
              userMap.set(p.userId, { ...p, matchesPlayed: s.played, matchesWon: s.won, _clubNames: [p.clubName] });
            }
          }
          const rankings = [...userMap.values()]
            .map(({ _clubNames, ...rest }: any) => rest)
            .filter((p: any) => p.matchesPlayed > 0)
            .sort((a: any, b: any) => {
              if (b.matchesWon !== a.matchesWon) return b.matchesWon - a.matchesWon;
              const bPct = b.matchesPlayed > 0 ? b.matchesWon / b.matchesPlayed : 0;
              const aPct = a.matchesPlayed > 0 ? a.matchesWon / a.matchesPlayed : 0;
              if (bPct !== aPct) return bPct - aPct;
              return b.matchesPlayed - a.matchesPlayed;
            });
          return res.json(rankings);
        }

        const rankings = profileRows
          .map(p => ({
            ...p,
            matchesPlayed: statsMap[p.profileId]?.played || 0,
            matchesWon: statsMap[p.profileId]?.won || 0,
          }))
          .filter(p => p.matchesPlayed > 0)
          .sort((a, b) => b.matchesWon - a.matchesWon);

        return res.json(rankings);
      }

      const profileRows = await db
        .select({
          profileId: playerProfiles.id,
          userId: playerProfiles.userId,
          clubId: playerProfiles.clubId,
          clubName: clubs.name,
          clubCity: clubs.city,
          clubCountry: clubs.country,
          fullName: users.fullName,
          email: users.email,
          phone: users.phone,
          gender: playerProfiles.gender,
          category: playerProfiles.category,
          grade: playerProfiles.grade,
          playerStatus: playerProfiles.playerStatus,
          clubRole: playerProfiles.clubRole,
          membershipStatus: playerProfiles.membershipStatus,
          emailVerified: users.emailVerified,
          isJunior: users.isJunior,
          userCountry: users.country,
          userCity: users.city,
          userRegion: users.region,
          createdAt: users.createdAt,
        })
        .from(playerProfiles)
        .innerJoin(users, eq(playerProfiles.userId, users.id))
        .innerJoin(clubs, eq(playerProfiles.clubId, clubs.id))
        .where(conditions.length > 0 ? and(...conditions) : undefined);

      if (profileRows.length === 0) return res.json([]);

      const profileIds = profileRows.map(p => p.profileId);

      const matchQueryConditions: any[] = [
        eq(matches.isCompleted, true),
        eq(matches.status, "COMPLETED"),
      ];

      if (qClubId || accessibleClubIds) {
        const clubIdsForSessions = qClubId ? [qClubId] : accessibleClubIds!;
        const clubSessions = await db.select({ id: sessions.id })
          .from(sessions)
          .where(inArray(sessions.clubId, clubIdsForSessions));
        if (clubSessions.length === 0) return res.json(profileRows.map(p => ({ ...p, matchesPlayed: 0, matchesWon: 0 })));
        matchQueryConditions.push(inArray(matches.sessionId, clubSessions.map(s => s.id)));
      }

      const completedMatches = await db.select()
        .from(matches)
        .where(and(...matchQueryConditions));

      const statsMap: Record<number, { played: number; won: number }> = {};
      for (const id of profileIds) statsMap[id] = { played: 0, won: 0 };

      for (const m of completedMatches) {
        const teamA = [m.teamAPlayer1Id, m.teamAPlayer2Id].filter(Boolean) as number[];
        const teamB = [m.teamBPlayer1Id, m.teamBPlayer2Id].filter(Boolean) as number[];
        const aWon = (m.scoreA || 0) > (m.scoreB || 0);
        for (const pid of [...teamA, ...teamB]) {
          if (statsMap[pid] !== undefined) {
            statsMap[pid].played++;
            if ((teamA.includes(pid) && aWon) || (teamB.includes(pid) && !aWon)) {
              statsMap[pid].won++;
            }
          }
        }
      }

      if (combineAcrossClubs) {
        const userMap = new Map<number, any>();
        for (const p of profileRows) {
          const s = statsMap[p.profileId] || { played: 0, won: 0 };
          if (userMap.has(p.userId)) {
            const existing = userMap.get(p.userId);
            existing.matchesPlayed += s.played;
            existing.matchesWon += s.won;
            if (!existing._clubNames.includes(p.clubName)) {
              existing._clubNames.push(p.clubName);
              existing.clubName = existing._clubNames.join(", ");
            }
            if (!existing.clubCity && p.clubCity) existing.clubCity = p.clubCity;
            if (!existing.clubCountry && p.clubCountry) existing.clubCountry = p.clubCountry;
          } else {
            userMap.set(p.userId, { ...p, matchesPlayed: s.played, matchesWon: s.won, _clubNames: [p.clubName] });
          }
        }
        const rankings = [...userMap.values()]
          .map(({ _clubNames, ...rest }: any) => rest)
          .sort((a: any, b: any) => {
            if (b.matchesWon !== a.matchesWon) return b.matchesWon - a.matchesWon;
            const bPct = b.matchesPlayed > 0 ? b.matchesWon / b.matchesPlayed : 0;
            const aPct = a.matchesPlayed > 0 ? a.matchesWon / a.matchesPlayed : 0;
            if (bPct !== aPct) return bPct - aPct;
            return b.matchesPlayed - a.matchesPlayed;
          });
        return res.json(rankings);
      }

      const rankings = profileRows
        .map(p => ({
          ...p,
          matchesPlayed: statsMap[p.profileId]?.played || 0,
          matchesWon: statsMap[p.profileId]?.won || 0,
        }))
        .sort((a: any, b: any) => {
          if (b.matchesWon !== a.matchesWon) return b.matchesWon - a.matchesWon;
          const bPct = b.matchesPlayed > 0 ? b.matchesWon / b.matchesPlayed : 0;
          const aPct = a.matchesPlayed > 0 ? a.matchesWon / a.matchesPlayed : 0;
          if (bPct !== aPct) return bPct - aPct;
          return b.matchesPlayed - a.matchesPlayed;
        });
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

      const ratingsMap = new Map<number, { avg: number; count: number }>();
      for (const c of approved) {
        try {
          const rating = await storage.getAverageRating("COACH", c.id);
          ratingsMap.set(c.id, { avg: rating.avg, count: rating.count });
        } catch {}
      }

      if (req.isAuthenticated()) {
        const membership = await storage.getCoachSeekerMembership(req.user!.id);
        const isSuperAdminUser = req.user!.role === "OWNER";

        if (isSuperAdminUser || (membership && membership.status === "ACTIVE")) {
          const enriched = approved.map(c => ({
            ...c,
            averageRating: ratingsMap.get(c.id)?.avg ?? null,
            reviewCount: ratingsMap.get(c.id)?.count ?? 0,
          }));
          res.json(enriched);
          return;
        }
      }

      const limited = approved.map(c => ({
        id: c.id,
        fullName: c.fullName,
        profilePhoto: c.profilePhoto,
        city: c.city,
        postcode: c.postcode,
        areaCoverage: c.areaCoverage,
        qualifications: c.qualifications,
        badmintonEnglandCert: c.badmintonEnglandCert,
        yearsTraining: c.yearsTraining,
        experience: c.experience,
        latitude: c.latitude,
        longitude: c.longitude,
        averageRating: ratingsMap.get(c.id)?.avg ?? null,
        reviewCount: ratingsMap.get(c.id)?.count ?? 0,
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

  // Update notification status (in_progress, completed, archived)
  app.patch("/api/notifications/:id/status", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const { status } = req.body;
      if (!["in_progress", "completed", "archived"].includes(status)) {
        return res.status(400).json({ message: "Invalid status" });
      }
      const notif = await storage.updateNotificationStatus(Number(req.params.id), req.user!.id, status);
      if (!notif) return res.status(404).json({ message: "Notification not found" });
      res.json(notif);
    } catch (err) {
      console.error("Error updating notification status:", err);
      res.status(500).json({ message: "Failed to update notification status" });
    }
  });

  // Bulk update notification statuses
  app.post("/api/notifications/bulk-status", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const { ids, status } = req.body;
      if (!Array.isArray(ids) || !["in_progress", "completed", "archived"].includes(status)) {
        return res.status(400).json({ message: "Invalid request" });
      }
      const validIds = ids.filter((id: any) => typeof id === "number" && Number.isInteger(id) && id > 0);
      if (validIds.length === 0) return res.status(400).json({ message: "No valid IDs provided" });
      await storage.bulkUpdateNotificationStatus(validIds, req.user!.id, status);
      res.json({ success: true });
    } catch (err) {
      console.error("Error bulk updating notification status:", err);
      res.status(500).json({ message: "Failed to bulk update" });
    }
  });

  // Public endpoint: sessions with club info for location search
  app.get("/api/public/sessions-with-clubs", async (_req, res) => {
    try {
      const allSessions = await storage.getSessions();
      const allClubs = await storage.getClubs();
      const clubMap = new Map(allClubs.map(c => [c.id, c]));

      const enriched = allSessions
        .filter(s => clubMap.has(s.clubId))
        .map(s => {
          const club = clubMap.get(s.clubId)!;
          return {
            ...s,
            clubName: club.name,
            clubCity: club.city || null,
            clubPostcode: club.postcode || null,
            clubAddress: club.address || null,
            clubLatitude: club.latitude || null,
            clubLongitude: club.longitude || null,
            playerLevels: club.playerLevels || [],
          };
        });

      res.json(enriched);
    } catch (err) {
      console.error("Error fetching sessions with clubs:", err);
      res.status(500).json({ message: "Failed to fetch sessions" });
    }
  });

  // ============================================================
  // === SUPER ADMIN DASHBOARD ENDPOINTS (OWNER only) ===
  // ============================================================

  app.get("/api/super-admin/stats", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    if (req.user!.role !== "OWNER") return res.sendStatus(403);

    try {
      const allUsers = await db.select().from(users);
      const allClubs = await storage.getClubs();
      const allSessions = await storage.getSessions();
      const allMatches = await db.select().from(matches);
      const allProfiles = await db.select().from(playerProfiles);
      const allCoaches = await db.select().from(coaches);
      const allSignups = await db.select().from(sessionSignups);

      const activeUsers = allUsers.filter(u => !u.closedAt);
      const usersByRole = {
        OWNER: activeUsers.filter(u => u.role === "OWNER").length,
        ADMIN: activeUsers.filter(u => u.role === "ADMIN").length,
        PLAYER: activeUsers.filter(u => u.role === "PLAYER").length,
      };

      const clubsByStatus = {
        APPROVED: allClubs.filter(c => c.status === "APPROVED").length,
        PENDING: allClubs.filter(c => c.status === "PENDING").length,
        REJECTED: allClubs.filter(c => c.status === "REJECTED").length,
        PAUSED: allClubs.filter(c => c.status === "PAUSED").length,
      };

      const activeSessions = allSessions.filter(s => s.status === "ACTIVE" || s.status === "LIVE").length;
      const upcomingSessions = allSessions.filter(s => s.status === "UPCOMING").length;
      const completedSessions = allSessions.filter(s => s.status === "COMPLETED").length;

      const pendingJoinRequests = allProfiles.filter(p => p.membershipStatus === "PENDING").length;
      const pendingUserApprovals = allUsers.filter(u => u.accountStatus === "PENDING" && !u.closedAt).length;
      const pendingClubApprovals = allClubs.filter(c => c.status === "PENDING").length;

      const liveMatches = allMatches.filter(m => m.status === "LIVE").length;
      const completedMatches = allMatches.filter(m => m.status === "COMPLETED").length;
      const totalRevenue = allSignups.reduce((sum, s) => sum + (s.fee || 0), 0);
      const paidRevenue = allSignups.filter(s => s.paymentStatus === "PAID").reduce((sum, s) => sum + (s.fee || 0), 0);

      res.json({
        users: {
          total: activeUsers.length,
          byRole: usersByRole,
          pendingApprovals: pendingUserApprovals,
          closedAccounts: allUsers.filter(u => !!u.closedAt).length,
        },
        clubs: {
          total: allClubs.length,
          byStatus: clubsByStatus,
          pendingApprovals: pendingClubApprovals,
        },
        sessions: {
          total: allSessions.length,
          active: activeSessions,
          upcoming: upcomingSessions,
          completed: completedSessions,
        },
        matches: {
          total: allMatches.length,
          live: liveMatches,
          completed: completedMatches,
        },
        coaches: {
          total: allCoaches.length,
          active: allCoaches.filter(c => !(c as any).isSuspended).length,
          suspended: allCoaches.filter(c => (c as any).isSuspended).length,
        },
        memberships: {
          totalProfiles: allProfiles.length,
          approved: allProfiles.filter(p => p.membershipStatus === "APPROVED").length,
          pending: pendingJoinRequests,
          rejected: allProfiles.filter(p => p.membershipStatus === "REJECTED").length,
        },
        financials: {
          totalRevenue,
          paidRevenue,
          unpaidRevenue: totalRevenue - paidRevenue,
        },
      });
    } catch (err: any) {
      console.error("Error fetching super admin stats:", err);
      res.status(500).json({ message: "Failed to fetch stats" });
    }
  });

  app.get("/api/super-admin/sessions", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    if (req.user!.role !== "OWNER") return res.sendStatus(403);

    try {
      const allSessions = await storage.getSessions();
      const allClubs = await storage.getClubs();
      const clubMap = new Map(allClubs.map(c => [c.id, c]));
      const allSignups = await db.select().from(sessionSignups);
      const allMatches = await db.select().from(matches);

      const enriched = allSessions.map(s => {
        const club = clubMap.get(s.clubId);
        const sSignups = allSignups.filter(su => su.sessionId === s.id);
        const sMatches = allMatches.filter(m => m.sessionId === s.id);
        return {
          ...s,
          clubName: club?.name || "Unknown",
          clubCity: club?.city || null,
          playerCount: sSignups.length,
          matchCount: sMatches.length,
          liveMatchCount: sMatches.filter(m => m.status === "LIVE").length,
          completedMatchCount: sMatches.filter(m => m.status === "COMPLETED").length,
        };
      });

      enriched.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      res.json(enriched);
    } catch (err: any) {
      console.error("Error fetching super admin sessions:", err);
      res.status(500).json({ message: "Failed to fetch sessions" });
    }
  });

  app.patch("/api/super-admin/sessions/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    if (req.user!.role !== "OWNER") return res.sendStatus(403);

    try {
      const sessionId = parseInt(req.params.id);
      const { status, title, maxPlayers, courtsAvailable } = req.body;
      const updateData: Record<string, any> = {};
      if (status !== undefined) updateData.status = status;
      if (title !== undefined) updateData.title = title;
      if (maxPlayers !== undefined) updateData.maxPlayers = maxPlayers;
      if (courtsAvailable !== undefined) updateData.courtsAvailable = courtsAvailable;

      if (Object.keys(updateData).length === 0) {
        return res.status(400).json({ message: "No fields to update" });
      }

      const [updated] = await db.update(sessions).set(updateData).where(eq(sessions.id, sessionId)).returning();
      if (!updated) return res.status(404).json({ message: "Session not found" });
      res.json(updated);
    } catch (err: any) {
      console.error("Error updating session:", err);
      res.status(500).json({ message: "Failed to update session" });
    }
  });

  app.patch("/api/super-admin/matches/:id/score", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    if (req.user!.role !== "OWNER") return res.sendStatus(403);

    try {
      const matchId = parseInt(req.params.id);
      const { scoreA, scoreB } = req.body;
      if (scoreA === undefined || scoreB === undefined) {
        return res.status(400).json({ message: "scoreA and scoreB are required" });
      }

      const [updated] = await db.update(matches)
        .set({
          scoreA,
          scoreB,
          scoreUpdatedByUserId: req.user!.id,
          scoreUpdatedAt: new Date(),
        })
        .where(eq(matches.id, matchId))
        .returning();
      if (!updated) return res.status(404).json({ message: "Match not found" });
      res.json(updated);
    } catch (err: any) {
      console.error("Error updating match score:", err);
      res.status(500).json({ message: "Failed to update score" });
    }
  });

  app.patch("/api/super-admin/users/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    if (req.user!.role !== "OWNER") return res.sendStatus(403);

    try {
      const userId = parseInt(req.params.id);
      const { role, fullName, email, emailVerified, accountStatus, phone, city, country,
        dateOfBirth, isJunior, parentGuardianName, parentGuardianEmail, continent, region } = req.body;
      const updateData: Record<string, any> = {};
      if (role !== undefined) updateData.role = role;
      if (fullName !== undefined) updateData.fullName = fullName;
      if (email !== undefined) updateData.email = email;
      if (emailVerified !== undefined) updateData.emailVerified = emailVerified;
      if (accountStatus !== undefined) updateData.accountStatus = accountStatus;
      if (phone !== undefined) updateData.phone = phone;
      if (city !== undefined) updateData.city = city;
      if (country !== undefined) updateData.country = country;
      if (dateOfBirth !== undefined) updateData.dateOfBirth = dateOfBirth ? new Date(dateOfBirth) : null;
      if (isJunior !== undefined) updateData.isJunior = isJunior;
      if (parentGuardianName !== undefined) updateData.parentGuardianName = parentGuardianName || null;
      if (parentGuardianEmail !== undefined) updateData.parentGuardianEmail = parentGuardianEmail || null;
      if (continent !== undefined) updateData.continent = continent || null;
      if (region !== undefined) updateData.region = region || null;

      if (Object.keys(updateData).length === 0) {
        return res.status(400).json({ message: "No fields to update" });
      }

      const [updated] = await db.update(users).set(updateData).where(eq(users.id, userId)).returning();
      if (!updated) return res.status(404).json({ message: "User not found" });
      const { password, passwordResetToken, ...safeUser } = updated;
      res.json(safeUser);
    } catch (err: any) {
      console.error("Error updating user:", err);
      res.status(500).json({ message: "Failed to update user" });
    }
  });

  app.get("/api/super-admin/players-comprehensive", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    if (req.user!.role !== "OWNER") return res.sendStatus(403);

    try {
      const allUsersData = await db.select({
        id: users.id,
        fullName: users.fullName,
        email: users.email,
        role: users.role,
        accountStatus: users.accountStatus,
        dateOfBirth: users.dateOfBirth,
        isJunior: users.isJunior,
        phone: users.phone,
        parentGuardianName: users.parentGuardianName,
        parentGuardianEmail: users.parentGuardianEmail,
        continent: users.continent,
        country: users.country,
        region: users.region,
        city: users.city,
        nickname: users.nickname,
        showPublicName: users.showPublicName,
        createdAt: users.createdAt,
      }).from(users).orderBy(users.fullName);

      const allProfiles = await db.select({
        id: playerProfiles.id,
        userId: playerProfiles.userId,
        clubId: playerProfiles.clubId,
        clubRole: playerProfiles.clubRole,
        membershipStatus: playerProfiles.membershipStatus,
        playerStatus: playerProfiles.playerStatus,
        gender: playerProfiles.gender,
        category: playerProfiles.category,
        grade: playerProfiles.grade,
        rankingPoints: playerProfiles.rankingPoints,
        matchesPlayed: playerProfiles.matchesPlayed,
        matchesWon: playerProfiles.matchesWon,
      }).from(playerProfiles);

      const allClubs = await db.select({
        id: clubs.id,
        name: clubs.name,
        city: clubs.city,
      }).from(clubs);

      const clubMap = new Map(allClubs.map(c => [c.id, c]));
      const profilesByUser = new Map<number, any[]>();
      for (const p of allProfiles) {
        const list = profilesByUser.get(p.userId) || [];
        list.push({ ...p, clubName: clubMap.get(p.clubId)?.name || "Unknown", clubCity: clubMap.get(p.clubId)?.city || "" });
        profilesByUser.set(p.userId, list);
      }

      const result = allUsersData.map(u => {
        const profiles = profilesByUser.get(u.id) || [];
        const totalMatchesWon = profiles.reduce((sum, p) => sum + (p.matchesWon || 0), 0);
        const totalMatchesPlayed = profiles.reduce((sum, p) => sum + (p.matchesPlayed || 0), 0);
        return { ...u, profiles, totalMatchesWon, totalMatchesPlayed };
      });

      result.sort((a, b) => b.totalMatchesWon - a.totalMatchesWon);

      res.json(result);
    } catch (err: any) {
      console.error("Error fetching comprehensive players:", err);
      res.status(500).json({ message: "Failed to fetch players" });
    }
  });

  app.patch("/api/super-admin/player-profiles/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    if (req.user!.role !== "OWNER") return res.sendStatus(403);

    try {
      const profileId = parseInt(req.params.id);
      const { gender, category, grade: gradeField, clubRole, membershipStatus, playerStatus } = req.body;
      const updateData: Record<string, any> = {};
      if (gender !== undefined) updateData.gender = gender || null;
      const gradeVal = gradeField || category;
      if (gradeVal !== undefined) {
        updateData.grade = gradeVal;
      }
      if (clubRole !== undefined) updateData.clubRole = clubRole;
      if (membershipStatus !== undefined) updateData.membershipStatus = membershipStatus;
      if (playerStatus !== undefined) updateData.playerStatus = playerStatus;

      if (Object.keys(updateData).length === 0) {
        return res.status(400).json({ message: "No fields to update" });
      }

      const [updated] = await db.update(playerProfiles).set(updateData).where(eq(playerProfiles.id, profileId)).returning();
      if (!updated) return res.status(404).json({ message: "Profile not found" });
      res.json(updated);
    } catch (err: any) {
      console.error("Error updating player profile:", err);
      res.status(500).json({ message: "Failed to update player profile" });
    }
  });

  app.post("/api/super-admin/users/:id/reset-password", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    if (req.user!.role !== "OWNER") return res.sendStatus(403);

    try {
      const userId = parseInt(req.params.id);
      const token = randomBytes(32).toString("hex");
      const expiry = new Date(Date.now() + 24 * 60 * 60 * 1000);

      const [updated] = await db.update(users)
        .set({ passwordResetToken: token, passwordResetExpiry: expiry })
        .where(eq(users.id, userId))
        .returning();
      if (!updated) return res.status(404).json({ message: "User not found" });

      res.json({ token, resetLink: `/reset-password/${token}` });
    } catch (err: any) {
      console.error("Error resetting password:", err);
      res.status(500).json({ message: "Failed to reset password" });
    }
  });

  app.patch("/api/super-admin/clubs/:id/transfer", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    if (req.user!.role !== "OWNER") return res.sendStatus(403);

    try {
      const clubId = parseInt(req.params.id);
      const { newOwnerId } = req.body;
      if (!newOwnerId) return res.status(400).json({ message: "newOwnerId required" });

      const [updated] = await db.update(clubs)
        .set({ ownerId: newOwnerId })
        .where(eq(clubs.id, clubId))
        .returning();
      if (!updated) return res.status(404).json({ message: "Club not found" });
      res.json(updated);
    } catch (err: any) {
      console.error("Error transferring club:", err);
      res.status(500).json({ message: "Failed to transfer club" });
    }
  });

  app.patch("/api/super-admin/clubs/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    if (req.user!.role !== "OWNER") return res.sendStatus(403);

    try {
      const clubId = parseInt(req.params.id);
      const { name, description, address, city, postcode, country, continent, region,
        contactFullName, contactPhone, contactAddress, status,
        isRegisteredWithBE, beRegistrationNumber, hasCompetitions, hasSocialGames,
        socialGameTimings, providesTraining, trainingDetails,
        sessionFee, hasMembership, membershipFee, shuttlecockType,
        providesClubTShirts, ageGroups, playerLevels, adminUserId } = req.body;
      const updateData: Record<string, any> = {};
      if (name !== undefined) updateData.name = name;
      if (description !== undefined) updateData.description = description || null;
      if (address !== undefined) updateData.address = address || null;
      if (city !== undefined) updateData.city = city || null;
      if (postcode !== undefined) updateData.postcode = postcode || null;
      if (country !== undefined) updateData.country = country || null;
      if (continent !== undefined) updateData.continent = continent || null;
      if (region !== undefined) updateData.region = region || null;
      if (contactFullName !== undefined) updateData.contactFullName = contactFullName || null;
      if (contactPhone !== undefined) updateData.contactPhone = contactPhone || null;
      if (contactAddress !== undefined) updateData.contactAddress = contactAddress || null;
      if (status !== undefined) updateData.status = status;
      if (isRegisteredWithBE !== undefined) updateData.isRegisteredWithBE = isRegisteredWithBE;
      if (beRegistrationNumber !== undefined) updateData.beRegistrationNumber = beRegistrationNumber || null;
      if (hasCompetitions !== undefined) updateData.hasCompetitions = hasCompetitions;
      if (hasSocialGames !== undefined) updateData.hasSocialGames = hasSocialGames;
      if (socialGameTimings !== undefined) updateData.socialGameTimings = socialGameTimings || null;
      if (providesTraining !== undefined) updateData.providesTraining = providesTraining;
      if (trainingDetails !== undefined) updateData.trainingDetails = trainingDetails || null;
      if (sessionFee !== undefined) updateData.sessionFee = sessionFee ? parseInt(sessionFee) : null;
      if (hasMembership !== undefined) updateData.hasMembership = hasMembership;
      if (membershipFee !== undefined) updateData.membershipFee = membershipFee ? parseInt(membershipFee) : null;
      if (shuttlecockType !== undefined) updateData.shuttlecockType = shuttlecockType || null;
      if (providesClubTShirts !== undefined) updateData.providesClubTShirts = providesClubTShirts;
      if (ageGroups !== undefined) updateData.ageGroups = ageGroups;
      if (playerLevels !== undefined) updateData.playerLevels = playerLevels;

      if (adminUserId) {
        const uid = parseInt(adminUserId);
        updateData.ownerId = uid;
        const existingProfiles = await storage.getClubMembers(clubId);
        const existingProfile = existingProfiles.find((p: any) => p.userId === uid);
        if (existingProfile) {
          await storage.updatePlayerProfileWithFullName(existingProfile.id, { clubRole: "ADMIN", membershipStatus: "APPROVED" });
        } else {
          await storage.createPlayerProfile({
            userId: uid,
            clubId,
            clubRole: "ADMIN" as any,
            membershipStatus: "APPROVED" as any,
            playerStatus: "ACTIVE" as any,
          });
        }
      }

      if (Object.keys(updateData).length === 0) {
        return res.status(400).json({ message: "No fields to update" });
      }

      const [updated] = await db.update(clubs).set(updateData).where(eq(clubs.id, clubId)).returning();
      if (!updated) return res.status(404).json({ message: "Club not found" });
      res.json(updated);
    } catch (err: any) {
      console.error("Error updating club:", err);
      res.status(500).json({ message: "Failed to update club" });
    }
  });

  // === MEMBERSHIP & MERCHANDISE ENDPOINTS ===

  function calculateProration(startDate: Date, membershipYearEnd?: Date): { factor: string; months: number } {
    const yearEnd = membershipYearEnd || new Date(startDate.getMonth() >= 8 ? startDate.getFullYear() + 1 : startDate.getFullYear(), 7, 31);
    let months = 0;
    const d = new Date(startDate);
    while (d < yearEnd) {
      d.setMonth(d.getMonth() + 1);
      if (d <= yearEnd) months++;
    }
    if (months === 0 && startDate < yearEnd) months = 1;
    const factor = Math.min(1, months / 12);
    return { factor: factor.toFixed(4), months };
  }

  // 1. GET /api/clubs/:clubId/membership-plans
  app.get("/api/clubs/:clubId/membership-plans", async (req, res) => {
    try {
      const clubId = Number(req.params.clubId);
      const plans = await db.select().from(membershipPlans).where(and(eq(membershipPlans.clubId, clubId), eq(membershipPlans.isActive, true)));
      res.json(plans);
    } catch (err: any) {
      console.error("Error fetching membership plans:", err);
      res.status(500).json({ message: "Failed to fetch membership plans" });
    }
  });

  // 2. POST /api/clubs/:clubId/membership-plans
  app.post("/api/clubs/:clubId/membership-plans", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const clubId = Number(req.params.clubId);
      const allowed = await canPerform({ id: req.user!.id, role: req.user!.role }, "MANAGE_MEMBERSHIPS", clubId);
      if (!allowed) return res.sendStatus(403);

      const body = z.object({
        name: z.string().min(1),
        annualPrice: z.number().int().min(0),
        defaultSessionFee: z.number().int().min(0),
        defaultDurationDays: z.number().int().min(1).max(3650).optional().default(365),
        isDefault: z.boolean().optional().default(false),
      }).parse(req.body);

      if (body.isDefault) {
        await db.update(membershipPlans).set({ isDefault: false }).where(and(eq(membershipPlans.clubId, clubId), eq(membershipPlans.isDefault, true)));
      }

      const [plan] = await db.insert(membershipPlans).values({
        clubId,
        name: body.name,
        annualPrice: body.annualPrice,
        defaultSessionFee: body.defaultSessionFee,
        defaultDurationDays: body.defaultDurationDays,
        isDefault: body.isDefault,
      }).returning();
      res.status(201).json(plan);
    } catch (err: any) {
      console.error("Error creating membership plan:", err);
      if (err.name === "ZodError") return res.status(400).json({ message: "Invalid input", errors: err.errors });
      res.status(500).json({ message: "Failed to create membership plan" });
    }
  });

  // 3. PATCH /api/membership-plans/:id
  app.patch("/api/membership-plans/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const planId = Number(req.params.id);
      const [plan] = await db.select().from(membershipPlans).where(eq(membershipPlans.id, planId));
      if (!plan) return res.status(404).json({ message: "Plan not found" });

      const allowed = await canPerform({ id: req.user!.id, role: req.user!.role }, "MANAGE_MEMBERSHIPS", plan.clubId);
      if (!allowed) return res.sendStatus(403);

      const body = z.object({
        name: z.string().min(1).optional(),
        annualPrice: z.number().int().min(0).optional(),
        defaultSessionFee: z.number().int().min(0).optional(),
        defaultDurationDays: z.number().int().min(1).max(3650).optional(),
        isDefault: z.boolean().optional(),
      }).parse(req.body);

      if (body.isDefault) {
        await db.update(membershipPlans).set({ isDefault: false }).where(and(eq(membershipPlans.clubId, plan.clubId), eq(membershipPlans.isDefault, true)));
      }

      const [updated] = await db.update(membershipPlans).set(body).where(eq(membershipPlans.id, planId)).returning();
      res.json(updated);
    } catch (err: any) {
      console.error("Error updating membership plan:", err);
      if (err.name === "ZodError") return res.status(400).json({ message: "Invalid input", errors: err.errors });
      res.status(500).json({ message: "Failed to update membership plan" });
    }
  });

  // 4. DELETE /api/membership-plans/:id
  app.delete("/api/membership-plans/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const planId = Number(req.params.id);
      const [plan] = await db.select().from(membershipPlans).where(eq(membershipPlans.id, planId));
      if (!plan) return res.status(404).json({ message: "Plan not found" });

      const allowed = await canPerform({ id: req.user!.id, role: req.user!.role }, "MANAGE_MEMBERSHIPS", plan.clubId);
      if (!allowed) return res.sendStatus(403);

      const [updated] = await db.update(membershipPlans).set({ isActive: false }).where(eq(membershipPlans.id, planId)).returning();
      res.json(updated);
    } catch (err: any) {
      console.error("Error deleting membership plan:", err);
      res.status(500).json({ message: "Failed to delete membership plan" });
    }
  });

  // 5. POST /api/membership-requests
  app.post("/api/membership-requests", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const body = z.object({
        clubId: z.number().int(),
        planId: z.number().int(),
      }).parse(req.body);

      const existingActive = await db.select().from(clubMemberships).where(and(
        eq(clubMemberships.userId, req.user!.id),
        eq(clubMemberships.clubId, body.clubId),
        eq(clubMemberships.status, "ACTIVE")
      ));
      if (existingActive.length > 0) return res.status(400).json({ message: "You already have an active membership for this club" });

      const existingPending = await db.select().from(membershipRequests).where(and(
        eq(membershipRequests.userId, req.user!.id),
        eq(membershipRequests.clubId, body.clubId),
        eq(membershipRequests.status, "PENDING")
      ));
      if (existingPending.length > 0) return res.status(400).json({ message: "You already have a pending membership request for this club" });

      const [plan] = await db.select().from(membershipPlans).where(eq(membershipPlans.id, body.planId));
      if (!plan) return res.status(404).json({ message: "Membership plan not found" });

      const proration = calculateProration(new Date());
      const proratedPrice = Math.round(plan.annualPrice * parseFloat(proration.factor));

      const [request] = await db.insert(membershipRequests).values({
        userId: req.user!.id,
        clubId: body.clubId,
        planId: body.planId,
        status: "PENDING",
        proratedPrice,
        prorationFactor: proration.factor,
      }).returning();

      const admins = await db.select().from(playerProfiles).where(and(
        eq(playerProfiles.clubId, body.clubId),
        eq(playerProfiles.membershipStatus, "APPROVED"),
        or(eq(playerProfiles.clubRole, "OWNER"), eq(playerProfiles.clubRole, "ADMIN"))
      ));
      for (const admin of admins) {
        await db.insert(notifications).values({
          userId: admin.userId,
          type: "MEMBERSHIP_REQUEST",
          title: "New Membership Request",
          message: `${req.user!.fullName} has requested membership.`,
          linkUrl: `/admin/memberships`,
        });
      }

      res.status(201).json(request);
    } catch (err: any) {
      console.error("Error creating membership request:", err);
      if (err.name === "ZodError") return res.status(400).json({ message: "Invalid input", errors: err.errors });
      res.status(500).json({ message: "Failed to create membership request" });
    }
  });

  // 6. GET /api/my-membership-requests
  app.get("/api/my-membership-requests", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const requests = await db.select().from(membershipRequests).where(eq(membershipRequests.userId, req.user!.id)).orderBy(desc(membershipRequests.createdAt));
      res.json(requests);
    } catch (err: any) {
      console.error("Error fetching membership requests:", err);
      res.status(500).json({ message: "Failed to fetch membership requests" });
    }
  });

  // 7. GET /api/clubs/:clubId/membership-requests
  app.get("/api/clubs/:clubId/membership-requests", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const clubId = Number(req.params.clubId);
      const allowed = await canPerform({ id: req.user!.id, role: req.user!.role }, "MANAGE_MEMBERSHIPS", clubId);
      if (!allowed) return res.sendStatus(403);

      const requests = await db.select({
        id: membershipRequests.id,
        userId: membershipRequests.userId,
        clubId: membershipRequests.clubId,
        planId: membershipRequests.planId,
        status: membershipRequests.status,
        rejectionReason: membershipRequests.rejectionReason,
        approvedById: membershipRequests.approvedById,
        approvedAt: membershipRequests.approvedAt,
        requestedStartDate: membershipRequests.requestedStartDate,
        requestedEndDate: membershipRequests.requestedEndDate,
        proratedPrice: membershipRequests.proratedPrice,
        prorationFactor: membershipRequests.prorationFactor,
        createdAt: membershipRequests.createdAt,
        fullName: users.fullName,
        email: users.email,
        planName: membershipPlans.name,
      }).from(membershipRequests)
        .leftJoin(users, eq(membershipRequests.userId, users.id))
        .leftJoin(membershipPlans, eq(membershipRequests.planId, membershipPlans.id))
        .where(eq(membershipRequests.clubId, clubId))
        .orderBy(desc(membershipRequests.createdAt));

      res.json(requests);
    } catch (err: any) {
      console.error("Error fetching club membership requests:", err);
      res.status(500).json({ message: "Failed to fetch membership requests" });
    }
  });

  // 8. PATCH /api/membership-requests/:id/approve
  app.patch("/api/membership-requests/:id/approve", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const requestId = Number(req.params.id);
      const [request] = await db.select().from(membershipRequests).where(eq(membershipRequests.id, requestId));
      if (!request) return res.status(404).json({ message: "Request not found" });

      const allowed = await canPerform({ id: req.user!.id, role: req.user!.role }, "MANAGE_MEMBERSHIPS", request.clubId);
      if (!allowed) return res.sendStatus(403);

      const existingActive = await db.select().from(clubMemberships).where(and(
        eq(clubMemberships.userId, request.userId),
        eq(clubMemberships.clubId, request.clubId),
        eq(clubMemberships.status, "ACTIVE"),
      ));
      if (existingActive.length > 0) {
        return res.status(400).json({ message: "User already has an active membership for this club" });
      }

      const body = z.object({
        startDate: z.string(),
        endDate: z.string(),
      }).parse(req.body);

      const start = new Date(body.startDate);
      const end = new Date(body.endDate);
      const totalDays = Math.ceil((end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000));
      const proration = calculateProration(start, end);

      const [plan] = await db.select().from(membershipPlans).where(eq(membershipPlans.id, request.planId));
      const proratedPrice = plan ? Math.round(plan.annualPrice * parseFloat(proration.factor)) : request.proratedPrice || 0;

      const [membership] = await db.insert(clubMemberships).values({
        userId: request.userId,
        clubId: request.clubId,
        planId: request.planId,
        startDate: start,
        endDate: end,
        totalDays,
        status: "PENDING",
        proratedPrice,
        prorationFactor: proration.factor,
      }).returning();

      await db.update(membershipRequests).set({
        status: "APPROVED",
        approvedById: req.user!.id,
        approvedAt: new Date(),
        requestedStartDate: start,
        requestedEndDate: end,
        proratedPrice,
        prorationFactor: proration.factor,
      }).where(eq(membershipRequests.id, requestId));

      await db.insert(notifications).values({
        userId: request.userId,
        type: "MEMBERSHIP_APPROVED",
        title: "Membership Request Approved",
        message: `Your membership request has been approved. Please complete payment to activate.`,
        linkUrl: `/my-memberships`,
      });

      res.json(membership);
    } catch (err: any) {
      console.error("Error approving membership request:", err);
      if (err.name === "ZodError") return res.status(400).json({ message: "Invalid input", errors: err.errors });
      res.status(500).json({ message: "Failed to approve membership request" });
    }
  });

  // 9. PATCH /api/membership-requests/:id/reject
  app.patch("/api/membership-requests/:id/reject", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const requestId = Number(req.params.id);
      const [request] = await db.select().from(membershipRequests).where(eq(membershipRequests.id, requestId));
      if (!request) return res.status(404).json({ message: "Request not found" });

      const allowed = await canPerform({ id: req.user!.id, role: req.user!.role }, "MANAGE_MEMBERSHIPS", request.clubId);
      if (!allowed) return res.sendStatus(403);

      const body = z.object({
        reason: z.string().optional(),
      }).parse(req.body);

      await db.update(membershipRequests).set({
        status: "REJECTED",
        rejectionReason: body.reason || null,
      }).where(eq(membershipRequests.id, requestId));

      await db.insert(notifications).values({
        userId: request.userId,
        type: "MEMBERSHIP_REJECTED",
        title: "Membership Request Rejected",
        message: body.reason ? `Your membership request was rejected: ${body.reason}` : "Your membership request was rejected.",
        linkUrl: `/my-memberships`,
      });

      res.json({ success: true });
    } catch (err: any) {
      console.error("Error rejecting membership request:", err);
      if (err.name === "ZodError") return res.status(400).json({ message: "Invalid input", errors: err.errors });
      res.status(500).json({ message: "Failed to reject membership request" });
    }
  });

  // 10. GET /api/my-memberships
  app.get("/api/my-memberships", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const memberships = await db.select({
        id: clubMemberships.id,
        userId: clubMemberships.userId,
        clubId: clubMemberships.clubId,
        planId: clubMemberships.planId,
        startDate: clubMemberships.startDate,
        endDate: clubMemberships.endDate,
        totalDays: clubMemberships.totalDays,
        status: clubMemberships.status,
        proratedPrice: clubMemberships.proratedPrice,
        prorationFactor: clubMemberships.prorationFactor,
        paymentConfirmed: clubMemberships.paymentConfirmed,
        cancelledAt: clubMemberships.cancelledAt,
        cancelReason: clubMemberships.cancelReason,
        createdAt: clubMemberships.createdAt,
        planName: membershipPlans.name,
        planAnnualPrice: membershipPlans.annualPrice,
        planDefaultSessionFee: membershipPlans.defaultSessionFee,
        clubName: clubs.name,
      }).from(clubMemberships)
        .leftJoin(membershipPlans, eq(clubMemberships.planId, membershipPlans.id))
        .leftJoin(clubs, eq(clubMemberships.clubId, clubs.id))
        .where(eq(clubMemberships.userId, req.user!.id))
        .orderBy(desc(clubMemberships.createdAt));

      res.json(memberships);
    } catch (err: any) {
      console.error("Error fetching user memberships:", err);
      res.status(500).json({ message: "Failed to fetch memberships" });
    }
  });

  // 11. GET /api/clubs/:clubId/memberships
  app.get("/api/clubs/:clubId/memberships", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const clubId = Number(req.params.clubId);
      const allowed = await canPerform({ id: req.user!.id, role: req.user!.role }, "MANAGE_MEMBERSHIPS", clubId);
      if (!allowed) return res.sendStatus(403);

      const statusFilter = req.query.status as string | undefined;
      const searchFilter = req.query.search as string | undefined;

      let query = db.select({
        id: clubMemberships.id,
        userId: clubMemberships.userId,
        clubId: clubMemberships.clubId,
        planId: clubMemberships.planId,
        startDate: clubMemberships.startDate,
        endDate: clubMemberships.endDate,
        totalDays: clubMemberships.totalDays,
        status: clubMemberships.status,
        proratedPrice: clubMemberships.proratedPrice,
        prorationFactor: clubMemberships.prorationFactor,
        paymentConfirmed: clubMemberships.paymentConfirmed,
        cancelledAt: clubMemberships.cancelledAt,
        cancelReason: clubMemberships.cancelReason,
        createdAt: clubMemberships.createdAt,
        fullName: users.fullName,
        email: users.email,
        planName: membershipPlans.name,
        planAnnualPrice: membershipPlans.annualPrice,
      }).from(clubMemberships)
        .leftJoin(users, eq(clubMemberships.userId, users.id))
        .leftJoin(membershipPlans, eq(clubMemberships.planId, membershipPlans.id))
        .$dynamic();

      const conditions: any[] = [eq(clubMemberships.clubId, clubId)];
      if (statusFilter) conditions.push(eq(clubMemberships.status, statusFilter as any));
      if (searchFilter) conditions.push(ilike(users.fullName, `%${searchFilter}%`));

      query = query.where(and(...conditions)).orderBy(desc(clubMemberships.createdAt));

      const results = await query;
      const mapped = results.map((r: any) => ({
        ...r,
        paymentStatus: r.paymentConfirmed ? "PAID" : "UNPAID",
      }));
      res.json(mapped);
    } catch (err: any) {
      console.error("Error fetching club memberships:", err);
      res.status(500).json({ message: "Failed to fetch memberships" });
    }
  });

  // 12. PATCH /api/club-memberships/:id/activate
  app.patch("/api/club-memberships/:id/activate", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const membershipId = Number(req.params.id);
      const [membership] = await db.select().from(clubMemberships).where(eq(clubMemberships.id, membershipId));
      if (!membership) return res.status(404).json({ message: "Membership not found" });

      const allowed = await canPerform({ id: req.user!.id, role: req.user!.role }, "MANAGE_MEMBERSHIPS", membership.clubId);
      if (!allowed) return res.sendStatus(403);

      const existingActive = await db.select().from(clubMemberships).where(and(
        eq(clubMemberships.userId, membership.userId),
        eq(clubMemberships.clubId, membership.clubId),
        eq(clubMemberships.status, "ACTIVE"),
      ));
      const otherActive = existingActive.filter(m => m.id !== membershipId);
      if (otherActive.length > 0) {
        return res.status(400).json({ message: "User already has an active membership for this club. Cancel the existing one first." });
      }

      const [updated] = await db.update(clubMemberships).set({
        status: "ACTIVE",
        paymentConfirmed: true,
      }).where(eq(clubMemberships.id, membershipId)).returning();

      const [plan] = await db.select().from(membershipPlans).where(eq(membershipPlans.id, membership.planId));
      const amount = membership.proratedPrice || (plan ? plan.annualPrice : 0);

      await db.insert(creditLedger).values({
        userId: membership.userId,
        clubId: membership.clubId,
        amount: -amount,
        reason: "Membership payment - " + (plan?.name || "membership"),
        createdById: req.user!.id,
      });

      res.json(updated);
    } catch (err: any) {
      console.error("Error activating membership:", err);
      res.status(500).json({ message: "Failed to activate membership" });
    }
  });

  // 13. PATCH /api/club-memberships/:id/cancel
  app.patch("/api/club-memberships/:id/cancel", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const membershipId = Number(req.params.id);
      const [membership] = await db.select().from(clubMemberships).where(eq(clubMemberships.id, membershipId));
      if (!membership) return res.status(404).json({ message: "Membership not found" });

      const isOwn = membership.userId === req.user!.id;
      const allowed = isOwn || await canPerform({ id: req.user!.id, role: req.user!.role }, "MANAGE_MEMBERSHIPS", membership.clubId);
      if (!allowed) return res.sendStatus(403);

      const body = z.object({
        reason: z.string().optional(),
      }).parse(req.body);

      const [updated] = await db.update(clubMemberships).set({
        status: "CANCELLED",
        cancelledAt: new Date(),
        cancelReason: body.reason || null,
      }).where(eq(clubMemberships.id, membershipId)).returning();

      res.json(updated);
    } catch (err: any) {
      console.error("Error cancelling membership:", err);
      if (err.name === "ZodError") return res.status(400).json({ message: "Invalid input", errors: err.errors });
      res.status(500).json({ message: "Failed to cancel membership" });
    }
  });

  // 14. PATCH /api/club-memberships/:id/dates
  app.patch("/api/club-memberships/:id/dates", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const membershipId = Number(req.params.id);
      const [membership] = await db.select().from(clubMemberships).where(eq(clubMemberships.id, membershipId));
      if (!membership) return res.status(404).json({ message: "Membership not found" });

      const allowed = await canPerform({ id: req.user!.id, role: req.user!.role }, "MANAGE_MEMBERSHIPS", membership.clubId);
      if (!allowed) return res.sendStatus(403);

      const body = z.object({
        startDate: z.string(),
        endDate: z.string(),
      }).parse(req.body);

      const start = new Date(body.startDate);
      const end = new Date(body.endDate);
      const totalDays = Math.ceil((end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000));

      const [updated] = await db.update(clubMemberships).set({
        startDate: start,
        endDate: end,
        totalDays,
      }).where(eq(clubMemberships.id, membershipId)).returning();

      res.json(updated);
    } catch (err: any) {
      console.error("Error updating membership dates:", err);
      if (err.name === "ZodError") return res.status(400).json({ message: "Invalid input", errors: err.errors });
      res.status(500).json({ message: "Failed to update membership dates" });
    }
  });

  // 15b. PATCH /api/club-memberships/:id/payment - Toggle payment status
  app.patch("/api/club-memberships/:id/payment", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const membershipId = Number(req.params.id);
      const [membership] = await db.select().from(clubMemberships).where(eq(clubMemberships.id, membershipId));
      if (!membership) return res.status(404).json({ message: "Membership not found" });

      const allowed = await canPerform({ id: req.user!.id, role: req.user!.role }, "MANAGE_MEMBERSHIPS", membership.clubId);
      if (!allowed) return res.sendStatus(403);

      const body = z.object({
        paymentConfirmed: z.boolean(),
      }).parse(req.body);

      const [updated] = await db.update(clubMemberships).set({
        paymentConfirmed: body.paymentConfirmed,
      }).where(eq(clubMemberships.id, membershipId)).returning();

      res.json(updated);
    } catch (err: any) {
      console.error("Error updating membership payment:", err);
      if (err.name === "ZodError") return res.status(400).json({ message: "Invalid input", errors: err.errors });
      res.status(500).json({ message: "Failed to update payment status" });
    }
  });

  // 15c. PATCH /api/club-memberships/:id/details - Edit full membership details
  app.patch("/api/club-memberships/:id/details", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const membershipId = Number(req.params.id);
      const [membership] = await db.select().from(clubMemberships).where(eq(clubMemberships.id, membershipId));
      if (!membership) return res.status(404).json({ message: "Membership not found" });

      const allowed = await canPerform({ id: req.user!.id, role: req.user!.role }, "MANAGE_MEMBERSHIPS", membership.clubId);
      if (!allowed) return res.sendStatus(403);

      const body = z.object({
        planId: z.number().int().optional(),
        status: z.enum(["PENDING", "ACTIVE", "EXPIRED", "CANCELLED"]).optional(),
        startDate: z.string().optional(),
        endDate: z.string().optional(),
        paymentConfirmed: z.boolean().optional(),
      }).parse(req.body);

      const updates: Record<string, any> = {};
      if (body.planId !== undefined) updates.planId = body.planId;
      if (body.status !== undefined) updates.status = body.status;
      if (body.paymentConfirmed !== undefined) updates.paymentConfirmed = body.paymentConfirmed;
      if (body.startDate) {
        updates.startDate = new Date(body.startDate);
      }
      if (body.endDate) {
        updates.endDate = new Date(body.endDate);
      }
      if (body.startDate && body.endDate) {
        const start = new Date(body.startDate);
        const end = new Date(body.endDate);
        updates.totalDays = Math.ceil((end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000));
      }

      if (body.status === "CANCELLED") {
        updates.cancelledAt = new Date();
      }

      if (Object.keys(updates).length === 0) {
        return res.status(400).json({ message: "No updates provided" });
      }

      const [updated] = await db.update(clubMemberships).set(updates).where(eq(clubMemberships.id, membershipId)).returning();
      res.json(updated);
    } catch (err: any) {
      console.error("Error updating membership details:", err);
      if (err.name === "ZodError") return res.status(400).json({ message: "Invalid input", errors: err.errors });
      res.status(500).json({ message: "Failed to update membership details" });
    }
  });

  // 15a. POST /api/clubs/:clubId/memberships/add - Directly add a membership for a user
  app.post("/api/clubs/:clubId/memberships/add", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const clubId = Number(req.params.clubId);
      const allowed = await canPerform({ id: req.user!.id, role: req.user!.role }, "MANAGE_MEMBERSHIPS", clubId);
      if (!allowed) return res.sendStatus(403);

      const body = z.object({
        userId: z.number().int(),
        planId: z.number().int(),
        startDate: z.string(),
        durationDays: z.number().int().min(1).max(3650).default(365),
        paymentStatus: z.enum(["PAID", "UNPAID"]).default("UNPAID"),
      }).parse(req.body);

      const [targetUser] = await db.select().from(users).where(eq(users.id, body.userId));
      if (!targetUser) return res.status(404).json({ message: "User not found" });

      const [plan] = await db.select().from(membershipPlans).where(
        and(eq(membershipPlans.id, body.planId), eq(membershipPlans.clubId, clubId))
      );
      if (!plan) return res.status(404).json({ message: "Membership plan not found for this club" });

      const existingActive = await db.select().from(clubMemberships).where(
        and(
          eq(clubMemberships.userId, body.userId),
          eq(clubMemberships.clubId, clubId),
          eq(clubMemberships.status, "ACTIVE")
        )
      );
      if (existingActive.length > 0) {
        return res.status(400).json({ message: "User already has an active membership for this club" });
      }

      const duration = body.durationDays;
      const start = new Date(body.startDate);
      const end = new Date(start);
      end.setDate(end.getDate() + duration);

      const [newMembership] = await db.insert(clubMemberships).values({
        userId: body.userId,
        clubId,
        planId: body.planId,
        startDate: start,
        endDate: end,
        totalDays: duration,
        status: "ACTIVE",
        paymentConfirmed: body.paymentStatus === "PAID",
      }).returning();

      res.json(newMembership);
    } catch (err: any) {
      console.error("Error adding membership:", err);
      if (err instanceof z.ZodError) return res.status(400).json({ message: "Invalid data", errors: err.errors });
      res.status(500).json({ message: err.message || "Failed to add membership" });
    }
  });

  // 15. POST /api/clubs/:clubId/memberships/bulk-action
  app.post("/api/clubs/:clubId/memberships/bulk-action", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const clubId = Number(req.params.clubId);
      const allowed = await canPerform({ id: req.user!.id, role: req.user!.role }, "MANAGE_MEMBERSHIPS", clubId);
      if (!allowed) return res.sendStatus(403);

      const body = z.object({
        membershipIds: z.array(z.number().int()),
        action: z.enum(["cancel", "delete", "mark_paid", "mark_unpaid"]),
      }).parse(req.body);

      if (body.action === "mark_paid") {
        await db.update(clubMemberships).set({
          paymentConfirmed: true,
        }).where(and(
          inArray(clubMemberships.id, body.membershipIds),
          eq(clubMemberships.clubId, clubId)
        ));
        res.json({ success: true, action: "mark_paid", count: body.membershipIds.length });
      } else if (body.action === "mark_unpaid") {
        await db.update(clubMemberships).set({
          paymentConfirmed: false,
        }).where(and(
          inArray(clubMemberships.id, body.membershipIds),
          eq(clubMemberships.clubId, clubId)
        ));
        res.json({ success: true, action: "mark_unpaid", count: body.membershipIds.length });
      } else if (body.action === "cancel") {
        await db.update(clubMemberships).set({
          status: "CANCELLED",
          cancelledAt: new Date(),
        }).where(and(
          inArray(clubMemberships.id, body.membershipIds),
          eq(clubMemberships.clubId, clubId)
        ));
        res.json({ success: true, action: "cancel", count: body.membershipIds.length });
      } else if (body.action === "delete") {
        if (!isSuperAdmin(req.user!)) return res.status(403).json({ message: "Only OWNER can delete memberships" });
        await db.delete(clubMemberships).where(and(
          inArray(clubMemberships.id, body.membershipIds),
          eq(clubMemberships.clubId, clubId)
        ));
        res.json({ success: true, action: "delete", count: body.membershipIds.length });
      } else {
        res.status(400).json({ message: "Invalid action" });
      }
    } catch (err: any) {
      console.error("Error bulk action memberships:", err);
      if (err.name === "ZodError") return res.status(400).json({ message: "Invalid input", errors: err.errors });
      res.status(500).json({ message: "Failed to perform bulk action" });
    }
  });

  // 16. GET /api/clubs/:clubId/merchandise
  app.get("/api/clubs/:clubId/merchandise", async (req, res) => {
    try {
      const clubId = Number(req.params.clubId);
      const items = await db.select().from(merchandise).where(and(eq(merchandise.clubId, clubId), eq(merchandise.isActive, true)));
      res.json(items);
    } catch (err: any) {
      console.error("Error fetching merchandise:", err);
      res.status(500).json({ message: "Failed to fetch merchandise" });
    }
  });

  // 17. POST /api/clubs/:clubId/merchandise
  app.post("/api/clubs/:clubId/merchandise", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const clubId = Number(req.params.clubId);
      const allowed = await canPerform({ id: req.user!.id, role: req.user!.role }, "MANAGE_MEMBERSHIPS", clubId);
      if (!allowed) return res.sendStatus(403);

      const body = z.object({
        name: z.string().min(1),
        price: z.number().int().min(0),
        includedInMembership: z.boolean().optional().default(false),
        sizes: z.array(z.string()).optional(),
      }).parse(req.body);

      const [item] = await db.insert(merchandise).values({
        clubId,
        name: body.name,
        price: body.price,
        includedInMembership: body.includedInMembership,
        sizes: body.sizes || null,
      }).returning();
      res.status(201).json(item);
    } catch (err: any) {
      console.error("Error creating merchandise:", err);
      if (err.name === "ZodError") return res.status(400).json({ message: "Invalid input", errors: err.errors });
      res.status(500).json({ message: "Failed to create merchandise" });
    }
  });

  // 18. PATCH /api/merchandise/:id
  app.patch("/api/merchandise/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const itemId = Number(req.params.id);
      const [item] = await db.select().from(merchandise).where(eq(merchandise.id, itemId));
      if (!item) return res.status(404).json({ message: "Merchandise not found" });

      const allowed = await canPerform({ id: req.user!.id, role: req.user!.role }, "MANAGE_MEMBERSHIPS", item.clubId);
      if (!allowed) return res.sendStatus(403);

      const body = z.object({
        name: z.string().min(1).optional(),
        price: z.number().int().min(0).optional(),
        includedInMembership: z.boolean().optional(),
        sizes: z.array(z.string()).optional(),
      }).parse(req.body);

      const [updated] = await db.update(merchandise).set(body).where(eq(merchandise.id, itemId)).returning();
      res.json(updated);
    } catch (err: any) {
      console.error("Error updating merchandise:", err);
      if (err.name === "ZodError") return res.status(400).json({ message: "Invalid input", errors: err.errors });
      res.status(500).json({ message: "Failed to update merchandise" });
    }
  });

  // 19. DELETE /api/merchandise/:id
  app.delete("/api/merchandise/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const itemId = Number(req.params.id);
      const [item] = await db.select().from(merchandise).where(eq(merchandise.id, itemId));
      if (!item) return res.status(404).json({ message: "Merchandise not found" });

      const allowed = await canPerform({ id: req.user!.id, role: req.user!.role }, "MANAGE_MEMBERSHIPS", item.clubId);
      if (!allowed) return res.sendStatus(403);

      const [updated] = await db.update(merchandise).set({ isActive: false }).where(eq(merchandise.id, itemId)).returning();
      res.json(updated);
    } catch (err: any) {
      console.error("Error deleting merchandise:", err);
      res.status(500).json({ message: "Failed to delete merchandise" });
    }
  });

  // 20. POST /api/merchandise-orders
  app.post("/api/merchandise-orders", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const body = z.object({
        merchandiseId: z.number().int(),
        size: z.string().optional(),
        quantity: z.number().int().min(1).default(1),
        clubId: z.number().int(),
      }).parse(req.body);

      const [item] = await db.select().from(merchandise).where(eq(merchandise.id, body.merchandiseId));
      if (!item) return res.status(404).json({ message: "Merchandise not found" });

      let totalPrice = item.price * body.quantity;
      let membershipId: number | null = null;

      if (item.includedInMembership) {
        const activeMembership = await db.select().from(clubMemberships).where(and(
          eq(clubMemberships.userId, req.user!.id),
          eq(clubMemberships.clubId, body.clubId),
          eq(clubMemberships.status, "ACTIVE")
        ));
        if (activeMembership.length > 0) {
          totalPrice = 0;
          membershipId = activeMembership[0].id;
        }
      }

      const [order] = await db.insert(merchandiseOrders).values({
        userId: req.user!.id,
        clubId: body.clubId,
        merchandiseId: body.merchandiseId,
        size: body.size || null,
        quantity: body.quantity,
        totalPrice,
        membershipId,
      }).returning();
      res.status(201).json(order);
    } catch (err: any) {
      console.error("Error creating merchandise order:", err);
      if (err.name === "ZodError") return res.status(400).json({ message: "Invalid input", errors: err.errors });
      res.status(500).json({ message: "Failed to create merchandise order" });
    }
  });

  // 21. GET /api/my-merchandise-orders
  app.get("/api/my-merchandise-orders", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const orders = await db.select({
        id: merchandiseOrders.id,
        userId: merchandiseOrders.userId,
        clubId: merchandiseOrders.clubId,
        merchandiseId: merchandiseOrders.merchandiseId,
        size: merchandiseOrders.size,
        quantity: merchandiseOrders.quantity,
        totalPrice: merchandiseOrders.totalPrice,
        status: merchandiseOrders.status,
        membershipId: merchandiseOrders.membershipId,
        createdAt: merchandiseOrders.createdAt,
        itemName: merchandise.name,
      }).from(merchandiseOrders)
        .leftJoin(merchandise, eq(merchandiseOrders.merchandiseId, merchandise.id))
        .where(eq(merchandiseOrders.userId, req.user!.id))
        .orderBy(desc(merchandiseOrders.createdAt));

      res.json(orders);
    } catch (err: any) {
      console.error("Error fetching merchandise orders:", err);
      res.status(500).json({ message: "Failed to fetch merchandise orders" });
    }
  });

  // 22. GET /api/clubs/:clubId/merchandise-orders
  app.get("/api/clubs/:clubId/merchandise-orders", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const clubId = Number(req.params.clubId);
      const allowed = await canPerform({ id: req.user!.id, role: req.user!.role }, "MANAGE_MEMBERSHIPS", clubId);
      if (!allowed) return res.sendStatus(403);

      const orders = await db.select({
        id: merchandiseOrders.id,
        userId: merchandiseOrders.userId,
        clubId: merchandiseOrders.clubId,
        merchandiseId: merchandiseOrders.merchandiseId,
        size: merchandiseOrders.size,
        quantity: merchandiseOrders.quantity,
        totalPrice: merchandiseOrders.totalPrice,
        status: merchandiseOrders.status,
        membershipId: merchandiseOrders.membershipId,
        createdAt: merchandiseOrders.createdAt,
        itemName: merchandise.name,
        fullName: users.fullName,
        email: users.email,
      }).from(merchandiseOrders)
        .leftJoin(merchandise, eq(merchandiseOrders.merchandiseId, merchandise.id))
        .leftJoin(users, eq(merchandiseOrders.userId, users.id))
        .where(eq(merchandiseOrders.clubId, clubId))
        .orderBy(desc(merchandiseOrders.createdAt));

      res.json(orders);
    } catch (err: any) {
      console.error("Error fetching club merchandise orders:", err);
      res.status(500).json({ message: "Failed to fetch merchandise orders" });
    }
  });

  // 23. GET /api/session-fee/:sessionId/:userId
  app.get("/api/session-fee/:sessionId/:userId", async (req, res) => {
    try {
      const sessionId = Number(req.params.sessionId);
      const userId = Number(req.params.userId);

      const [session] = await db.select().from(sessions).where(eq(sessions.id, sessionId));
      if (!session) return res.status(404).json({ message: "Session not found" });

      const [club] = await db.select().from(clubs).where(eq(clubs.id, session.clubId));

      let fee: number = 0;
      let source: "membership" | "session" | "club" = "club";

      const activeMembership = await db.select({
        id: clubMemberships.id,
        defaultSessionFee: membershipPlans.defaultSessionFee,
      }).from(clubMemberships)
        .leftJoin(membershipPlans, eq(clubMemberships.planId, membershipPlans.id))
        .where(and(
          eq(clubMemberships.userId, userId),
          eq(clubMemberships.clubId, session.clubId),
          eq(clubMemberships.status, "ACTIVE")
        ));

      if (activeMembership.length > 0 && activeMembership[0].defaultSessionFee !== null) {
        fee = activeMembership[0].defaultSessionFee;
        source = "membership";
      } else if (session.sessionFee !== null && session.sessionFee !== undefined) {
        fee = session.sessionFee;
        source = "session";
      } else if (club && club.sessionFee !== null) {
        fee = club.sessionFee;
        source = "club";
      }

      const creditResult = await db.select({ total: sum(creditLedger.amount) }).from(creditLedger).where(and(
        eq(creditLedger.userId, userId),
        eq(creditLedger.clubId, session.clubId)
      ));
      const creditBalance = Number(creditResult[0]?.total || 0);
      const netPayable = Math.max(0, fee - creditBalance);

      res.json({ fee, source, creditBalance, netPayable });
    } catch (err: any) {
      console.error("Error resolving session fee:", err);
      res.status(500).json({ message: "Failed to resolve session fee" });
    }
  });

  // === INVENTORY & EXPENSE ENDPOINTS ===

  // GET /api/inventory/items?clubId=
  app.get("/api/inventory/items", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const clubId = req.query.clubId ? Number(req.query.clubId) : null;
      const user = req.user!;
      const isOwner = user.role === "OWNER";

      let accessibleClubIds: number[] = [];
      if (isOwner) {
        if (clubId) {
          accessibleClubIds = [clubId];
        } else {
          const allClubs = await db.select({ id: clubs.id }).from(clubs);
          accessibleClubIds = allClubs.map(c => c.id);
        }
      } else {
        const ownedClubs = await db.select({ id: clubs.id }).from(clubs).where(eq(clubs.ownerId, user.id));
        const adminProfiles = await db.select({ clubId: playerProfiles.clubId }).from(playerProfiles)
          .where(and(eq(playerProfiles.userId, user.id), eq(playerProfiles.membershipStatus, "APPROVED"), inArray(playerProfiles.clubRole, ["ADMIN"])));
        const clubIdSet = new Set([...ownedClubs.map(c => c.id), ...adminProfiles.map(p => p.clubId)]);
        if (clubIdSet.size === 0) return res.sendStatus(403);
        accessibleClubIds = clubId && clubIdSet.has(clubId) ? [clubId] : [...clubIdSet];
      }

      if (accessibleClubIds.length === 0) return res.json([]);

      const items = await db.select().from(inventoryItems)
        .where(inArray(inventoryItems.clubId, accessibleClubIds))
        .orderBy(desc(inventoryItems.createdAt));
      res.json(items);
    } catch (err: any) {
      console.error("Error fetching inventory items:", err);
      res.status(500).json({ message: "Failed to fetch inventory items" });
    }
  });

  // POST /api/inventory/items
  app.post("/api/inventory/items", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const body = z.object({
        clubId: z.number().int(),
        name: z.string().min(1),
        supplier: z.string().optional(),
        unitPrice: z.number().int().min(0).default(0),
        stockAvailable: z.number().int().min(0).default(0),
        isSessionLinked: z.boolean().default(false),
        canBeSold: z.boolean().default(false),
        notes: z.string().optional(),
      }).parse(req.body);

      const allowed = await canPerform({ id: req.user!.id, role: req.user!.role }, "MANAGE_INVENTORY", body.clubId);
      if (!allowed) return res.sendStatus(403);

      const [item] = await db.insert(inventoryItems).values({
        clubId: body.clubId,
        name: body.name,
        supplier: body.supplier || null,
        unitPrice: body.unitPrice,
        stockAvailable: body.stockAvailable,
        isSessionLinked: body.isSessionLinked,
        canBeSold: body.canBeSold,
        notes: body.notes || null,
      }).returning();

      if (body.stockAvailable > 0) {
        await db.insert(inventoryMovements).values({
          clubId: body.clubId,
          itemId: item.id,
          quantityDelta: body.stockAvailable,
          unitPrice: body.unitPrice,
          totalAmount: body.stockAvailable * body.unitPrice,
          movementType: "RECEIPT",
          notes: "Initial stock",
          createdById: req.user!.id,
        });
      }

      res.status(201).json(item);
    } catch (err: any) {
      console.error("Error creating inventory item:", err);
      if (err.name === "ZodError") return res.status(400).json({ message: "Invalid input", errors: err.errors });
      res.status(500).json({ message: "Failed to create inventory item" });
    }
  });

  // PATCH /api/inventory/items/:id
  app.patch("/api/inventory/items/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const itemId = Number(req.params.id);
      const [item] = await db.select().from(inventoryItems).where(eq(inventoryItems.id, itemId));
      if (!item) return res.status(404).json({ message: "Item not found" });

      const allowed = await canPerform({ id: req.user!.id, role: req.user!.role }, "MANAGE_INVENTORY", item.clubId);
      if (!allowed) return res.sendStatus(403);

      const body = z.object({
        name: z.string().min(1).optional(),
        supplier: z.string().optional().nullable(),
        unitPrice: z.number().int().min(0).optional(),
        stockAvailable: z.number().int().min(0).optional(),
        isSessionLinked: z.boolean().optional(),
        canBeSold: z.boolean().optional(),
        isActive: z.boolean().optional(),
        notes: z.string().optional().nullable(),
      }).parse(req.body);

      const [updated] = await db.update(inventoryItems).set(body).where(eq(inventoryItems.id, itemId)).returning();
      res.json(updated);
    } catch (err: any) {
      console.error("Error updating inventory item:", err);
      if (err.name === "ZodError") return res.status(400).json({ message: "Invalid input", errors: err.errors });
      res.status(500).json({ message: "Failed to update inventory item" });
    }
  });

  // DELETE /api/inventory/items/:id - Delete an inventory item and its movements
  app.delete("/api/inventory/items/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const itemId = Number(req.params.id);
      const [item] = await db.select().from(inventoryItems).where(eq(inventoryItems.id, itemId));
      if (!item) return res.status(404).json({ message: "Item not found" });

      const allowed = await canPerform({ id: req.user!.id, role: req.user!.role }, "MANAGE_INVENTORY", item.clubId);
      if (!allowed) return res.sendStatus(403);

      await db.delete(inventoryMovements).where(eq(inventoryMovements.itemId, itemId));
      await db.delete(inventoryItems).where(eq(inventoryItems.id, itemId));
      res.json({ success: true });
    } catch (err: any) {
      console.error("Error deleting inventory item:", err);
      res.status(500).json({ message: "Failed to delete inventory item" });
    }
  });

  // DELETE /api/inventory/movements/:id - Delete a single stock movement
  app.delete("/api/inventory/movements/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const movementId = Number(req.params.id);
      const [movement] = await db.select().from(inventoryMovements).where(eq(inventoryMovements.id, movementId));
      if (!movement) return res.status(404).json({ message: "Movement not found" });

      const allowed = await canPerform({ id: req.user!.id, role: req.user!.role }, "MANAGE_INVENTORY", movement.clubId);
      if (!allowed) return res.sendStatus(403);

      const [item] = await db.select().from(inventoryItems).where(eq(inventoryItems.id, movement.itemId));
      if (item) {
        const newStock = item.stockAvailable - movement.quantityDelta;
        await db.update(inventoryItems).set({ stockAvailable: Math.max(0, newStock) }).where(eq(inventoryItems.id, item.id));
      }

      await db.delete(inventoryMovements).where(eq(inventoryMovements.id, movementId));
      res.json({ success: true });
    } catch (err: any) {
      console.error("Error deleting movement:", err);
      res.status(500).json({ message: "Failed to delete movement" });
    }
  });

  // POST /api/inventory/items/:id/receive - Add stock
  app.post("/api/inventory/items/:id/receive", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const itemId = Number(req.params.id);
      const [item] = await db.select().from(inventoryItems).where(eq(inventoryItems.id, itemId));
      if (!item) return res.status(404).json({ message: "Item not found" });

      const allowed = await canPerform({ id: req.user!.id, role: req.user!.role }, "MANAGE_INVENTORY", item.clubId);
      if (!allowed) return res.sendStatus(403);

      const body = z.object({
        quantity: z.number().int().min(1),
        unitPrice: z.number().int().min(0),
        notes: z.string().optional(),
      }).parse(req.body);

      const totalAmount = body.quantity * body.unitPrice;

      const [movement] = await db.insert(inventoryMovements).values({
        clubId: item.clubId,
        itemId: item.id,
        quantityDelta: body.quantity,
        unitPrice: body.unitPrice,
        totalAmount,
        movementType: "RECEIPT",
        notes: body.notes || null,
        createdById: req.user!.id,
      }).returning();

      const newStock = item.stockAvailable + body.quantity;
      await db.update(inventoryItems).set({
        stockAvailable: newStock,
        unitPrice: body.unitPrice,
      }).where(eq(inventoryItems.id, itemId));

      res.status(201).json(movement);
    } catch (err: any) {
      console.error("Error receiving stock:", err);
      if (err.name === "ZodError") return res.status(400).json({ message: "Invalid input", errors: err.errors });
      res.status(500).json({ message: "Failed to receive stock" });
    }
  });

  // POST /api/inventory/items/:id/adjust - Manual adjustment
  app.post("/api/inventory/items/:id/adjust", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const itemId = Number(req.params.id);
      const [item] = await db.select().from(inventoryItems).where(eq(inventoryItems.id, itemId));
      if (!item) return res.status(404).json({ message: "Item not found" });

      const allowed = await canPerform({ id: req.user!.id, role: req.user!.role }, "MANAGE_INVENTORY", item.clubId);
      if (!allowed) return res.sendStatus(403);

      const body = z.object({
        quantityDelta: z.number().int(),
        notes: z.string().min(1),
      }).parse(req.body);

      const newStock = item.stockAvailable + body.quantityDelta;
      if (newStock < 0) return res.status(400).json({ message: "Insufficient stock for this adjustment" });

      const [movement] = await db.insert(inventoryMovements).values({
        clubId: item.clubId,
        itemId: item.id,
        quantityDelta: body.quantityDelta,
        movementType: "ADJUSTMENT",
        notes: body.notes,
        createdById: req.user!.id,
      }).returning();

      await db.update(inventoryItems).set({ stockAvailable: newStock }).where(eq(inventoryItems.id, itemId));

      res.status(201).json(movement);
    } catch (err: any) {
      console.error("Error adjusting stock:", err);
      if (err.name === "ZodError") return res.status(400).json({ message: "Invalid input", errors: err.errors });
      res.status(500).json({ message: "Failed to adjust stock" });
    }
  });

  // POST /api/inventory/items/:id/sell - Sell item
  app.post("/api/inventory/items/:id/sell", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const itemId = Number(req.params.id);
      const [item] = await db.select().from(inventoryItems).where(eq(inventoryItems.id, itemId));
      if (!item) return res.status(404).json({ message: "Item not found" });

      const allowed = await canPerform({ id: req.user!.id, role: req.user!.role }, "MANAGE_INVENTORY", item.clubId);
      if (!allowed) return res.sendStatus(403);

      const body = z.object({
        quantity: z.number().int().min(1),
        unitPrice: z.number().int().min(0),
        buyerName: z.string().min(1),
        notes: z.string().optional(),
      }).parse(req.body);

      if (item.stockAvailable < body.quantity) return res.status(400).json({ message: "Insufficient stock" });

      const totalAmount = body.quantity * body.unitPrice;

      const [movement] = await db.insert(inventoryMovements).values({
        clubId: item.clubId,
        itemId: item.id,
        quantityDelta: -body.quantity,
        unitPrice: body.unitPrice,
        totalAmount,
        movementType: "SALE",
        buyerName: body.buyerName,
        notes: body.notes || null,
        createdById: req.user!.id,
      }).returning();

      await db.update(inventoryItems).set({
        stockAvailable: item.stockAvailable - body.quantity,
      }).where(eq(inventoryItems.id, itemId));

      res.status(201).json(movement);
    } catch (err: any) {
      console.error("Error selling item:", err);
      if (err.name === "ZodError") return res.status(400).json({ message: "Invalid input", errors: err.errors });
      res.status(500).json({ message: "Failed to sell item" });
    }
  });

  // POST /api/inventory/session-usage - Link usage to session
  app.post("/api/inventory/session-usage", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const body = z.object({
        sessionId: z.number().int(),
        itemId: z.number().int(),
        quantity: z.number().int().min(1),
        notes: z.string().optional(),
      }).parse(req.body);

      const [session] = await db.select().from(sessions).where(eq(sessions.id, body.sessionId));
      if (!session) return res.status(404).json({ message: "Session not found" });

      const allowed = await canPerform({ id: req.user!.id, role: req.user!.role }, "MANAGE_INVENTORY", session.clubId);
      if (!allowed) return res.sendStatus(403);

      const [item] = await db.select().from(inventoryItems).where(eq(inventoryItems.id, body.itemId));
      if (!item) return res.status(404).json({ message: "Item not found" });
      if (item.stockAvailable < body.quantity) return res.status(400).json({ message: "Insufficient stock" });

      const totalAmount = body.quantity * item.unitPrice;

      const [movement] = await db.insert(inventoryMovements).values({
        clubId: session.clubId,
        itemId: body.itemId,
        quantityDelta: -body.quantity,
        unitPrice: item.unitPrice,
        totalAmount,
        movementType: "USAGE",
        sessionId: body.sessionId,
        notes: body.notes || null,
        createdById: req.user!.id,
      }).returning();

      await db.update(inventoryItems).set({
        stockAvailable: item.stockAvailable - body.quantity,
      }).where(eq(inventoryItems.id, body.itemId));

      if (item.isSessionLinked) {
        const currentUsed = session.shuttleTubesUsed || 0;
        await db.update(sessions).set({
          shuttleTubesUsed: currentUsed + body.quantity,
        }).where(eq(sessions.id, body.sessionId));
      }

      res.status(201).json(movement);
    } catch (err: any) {
      console.error("Error recording session usage:", err);
      if (err.name === "ZodError") return res.status(400).json({ message: "Invalid input", errors: err.errors });
      res.status(500).json({ message: "Failed to record session usage" });
    }
  });

  // GET /api/inventory/movements?clubId&itemId&dateFrom&dateTo&type
  app.get("/api/inventory/movements", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const user = req.user!;
      const isOwner = user.role === "OWNER";
      const qClubId = req.query.clubId ? Number(req.query.clubId) : null;

      let accessibleClubIds: number[] = [];
      if (isOwner) {
        if (qClubId) {
          accessibleClubIds = [qClubId];
        } else {
          const allClubs = await db.select({ id: clubs.id }).from(clubs);
          accessibleClubIds = allClubs.map(c => c.id);
        }
      } else {
        const ownedClubs = await db.select({ id: clubs.id }).from(clubs).where(eq(clubs.ownerId, user.id));
        const adminProfiles = await db.select({ clubId: playerProfiles.clubId }).from(playerProfiles)
          .where(and(eq(playerProfiles.userId, user.id), eq(playerProfiles.membershipStatus, "APPROVED"), inArray(playerProfiles.clubRole, ["ADMIN"])));
        const clubIdSet = new Set([...ownedClubs.map(c => c.id), ...adminProfiles.map(p => p.clubId)]);
        if (clubIdSet.size === 0) return res.sendStatus(403);
        accessibleClubIds = qClubId && clubIdSet.has(qClubId) ? [qClubId] : [...clubIdSet];
      }

      const conditions: any[] = [inArray(inventoryMovements.clubId, accessibleClubIds)];

      const qItemId = req.query.itemId ? Number(req.query.itemId) : null;
      if (qItemId) conditions.push(eq(inventoryMovements.itemId, qItemId));

      const qDateFrom = req.query.dateFrom ? new Date(req.query.dateFrom as string) : null;
      const qDateTo = req.query.dateTo ? new Date(req.query.dateTo as string) : null;
      if (qDateFrom) conditions.push(gte(inventoryMovements.createdAt, qDateFrom));
      if (qDateTo) {
        const endOfDay = new Date(qDateTo);
        endOfDay.setHours(23, 59, 59, 999);
        conditions.push(lte(inventoryMovements.createdAt, endOfDay));
      }

      const qType = req.query.type as string | undefined;
      if (qType && qType !== "all") conditions.push(eq(inventoryMovements.movementType, qType as any));

      const movementsData = await db.select({
        id: inventoryMovements.id,
        clubId: inventoryMovements.clubId,
        itemId: inventoryMovements.itemId,
        quantityDelta: inventoryMovements.quantityDelta,
        unitPrice: inventoryMovements.unitPrice,
        totalAmount: inventoryMovements.totalAmount,
        movementType: inventoryMovements.movementType,
        sessionId: inventoryMovements.sessionId,
        buyerName: inventoryMovements.buyerName,
        notes: inventoryMovements.notes,
        createdById: inventoryMovements.createdById,
        createdAt: inventoryMovements.createdAt,
        itemName: inventoryItems.name,
        clubName: clubs.name,
        createdByName: users.fullName,
      }).from(inventoryMovements)
        .innerJoin(inventoryItems, eq(inventoryMovements.itemId, inventoryItems.id))
        .innerJoin(clubs, eq(inventoryMovements.clubId, clubs.id))
        .innerJoin(users, eq(inventoryMovements.createdById, users.id))
        .where(and(...conditions))
        .orderBy(desc(inventoryMovements.createdAt));

      res.json(movementsData);
    } catch (err: any) {
      console.error("Error fetching inventory movements:", err);
      res.status(500).json({ message: "Failed to fetch inventory movements" });
    }
  });

  // === EXPENSES ENDPOINTS ===

  // GET /api/expenses?clubId&dateFrom&dateTo
  app.get("/api/expenses", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const user = req.user!;
      const isOwner = user.role === "OWNER";
      const qClubId = req.query.clubId ? Number(req.query.clubId) : null;

      let accessibleClubIds: number[] = [];
      if (isOwner) {
        if (qClubId) {
          accessibleClubIds = [qClubId];
        } else {
          const allClubs = await db.select({ id: clubs.id }).from(clubs);
          accessibleClubIds = allClubs.map(c => c.id);
        }
      } else {
        const ownedClubs = await db.select({ id: clubs.id }).from(clubs).where(eq(clubs.ownerId, user.id));
        const adminProfiles = await db.select({ clubId: playerProfiles.clubId }).from(playerProfiles)
          .where(and(eq(playerProfiles.userId, user.id), eq(playerProfiles.membershipStatus, "APPROVED"), inArray(playerProfiles.clubRole, ["ADMIN"])));
        const clubIdSet = new Set([...ownedClubs.map(c => c.id), ...adminProfiles.map(p => p.clubId)]);
        if (clubIdSet.size === 0) return res.sendStatus(403);
        accessibleClubIds = qClubId && clubIdSet.has(qClubId) ? [qClubId] : [...clubIdSet];
      }

      const conditions: any[] = [inArray(expenses.clubId, accessibleClubIds)];

      const qDateFrom = req.query.dateFrom ? new Date(req.query.dateFrom as string) : null;
      const qDateTo = req.query.dateTo ? new Date(req.query.dateTo as string) : null;
      if (qDateFrom) conditions.push(gte(expenses.createdAt, qDateFrom));
      if (qDateTo) {
        const endOfDay = new Date(qDateTo);
        endOfDay.setHours(23, 59, 59, 999);
        conditions.push(lte(expenses.createdAt, endOfDay));
      }

      const expensesData = await db.select({
        id: expenses.id,
        clubId: expenses.clubId,
        name: expenses.name,
        amount: expenses.amount,
        notes: expenses.notes,
        createdById: expenses.createdById,
        createdAt: expenses.createdAt,
        clubName: clubs.name,
        createdByName: users.fullName,
      }).from(expenses)
        .innerJoin(clubs, eq(expenses.clubId, clubs.id))
        .innerJoin(users, eq(expenses.createdById, users.id))
        .where(and(...conditions))
        .orderBy(desc(expenses.createdAt));

      res.json(expensesData);
    } catch (err: any) {
      console.error("Error fetching expenses:", err);
      res.status(500).json({ message: "Failed to fetch expenses" });
    }
  });

  // POST /api/expenses
  app.post("/api/expenses", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const body = z.object({
        clubId: z.number().int(),
        name: z.string().min(1),
        amount: z.number().int().min(1),
        notes: z.string().optional(),
      }).parse(req.body);

      const allowed = await canPerform({ id: req.user!.id, role: req.user!.role }, "MANAGE_INVENTORY", body.clubId);
      if (!allowed) return res.sendStatus(403);

      const [expense] = await db.insert(expenses).values({
        clubId: body.clubId,
        name: body.name,
        amount: body.amount,
        notes: body.notes || null,
        createdById: req.user!.id,
      }).returning();

      res.status(201).json(expense);
    } catch (err: any) {
      console.error("Error creating expense:", err);
      if (err.name === "ZodError") return res.status(400).json({ message: "Invalid input", errors: err.errors });
      res.status(500).json({ message: "Failed to create expense" });
    }
  });

  // PATCH /api/expenses/:id
  app.patch("/api/expenses/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const expenseId = Number(req.params.id);
      const [expense] = await db.select().from(expenses).where(eq(expenses.id, expenseId));
      if (!expense) return res.status(404).json({ message: "Expense not found" });

      const allowed = await canPerform({ id: req.user!.id, role: req.user!.role }, "MANAGE_INVENTORY", expense.clubId);
      if (!allowed) return res.sendStatus(403);

      const body = z.object({
        name: z.string().min(1).optional(),
        amount: z.number().int().min(1).optional(),
        notes: z.string().optional().nullable(),
      }).parse(req.body);

      const [updated] = await db.update(expenses).set(body).where(eq(expenses.id, expenseId)).returning();
      res.json(updated);
    } catch (err: any) {
      console.error("Error updating expense:", err);
      if (err.name === "ZodError") return res.status(400).json({ message: "Invalid input", errors: err.errors });
      res.status(500).json({ message: "Failed to update expense" });
    }
  });

  // DELETE /api/expenses/:id
  app.delete("/api/expenses/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const expenseId = Number(req.params.id);
      const [expense] = await db.select().from(expenses).where(eq(expenses.id, expenseId));
      if (!expense) return res.status(404).json({ message: "Expense not found" });

      const allowed = await canPerform({ id: req.user!.id, role: req.user!.role }, "MANAGE_INVENTORY", expense.clubId);
      if (!allowed) return res.sendStatus(403);

      await db.delete(expenses).where(eq(expenses.id, expenseId));
      res.json({ success: true });
    } catch (err: any) {
      console.error("Error deleting expense:", err);
      res.status(500).json({ message: "Failed to delete expense" });
    }
  });

  // GET /api/admin/financial-dashboard - Aggregated financial data with inventory & expenses
  app.get("/api/admin/financial-dashboard", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const user = req.user!;
      const isOwner = user.role === "OWNER";

      let accessibleClubIds: number[] = [];
      if (isOwner) {
        const allClubs = await db.select({ id: clubs.id }).from(clubs);
        accessibleClubIds = allClubs.map(c => c.id);
      } else {
        const ownedClubs = await db.select({ id: clubs.id }).from(clubs).where(eq(clubs.ownerId, user.id));
        const adminProfiles = await db.select({ clubId: playerProfiles.clubId }).from(playerProfiles)
          .where(and(eq(playerProfiles.userId, user.id), eq(playerProfiles.membershipStatus, "APPROVED"), inArray(playerProfiles.clubRole, ["ADMIN"])));
        const clubIdSet = new Set([...ownedClubs.map(c => c.id), ...adminProfiles.map(p => p.clubId)]);
        if (clubIdSet.size === 0) return res.sendStatus(403);
        accessibleClubIds = [...clubIdSet];
      }

      const qClubId = req.query.clubId ? Number(req.query.clubId) : null;
      const filteredClubIds = qClubId ? accessibleClubIds.filter(id => id === qClubId) : accessibleClubIds;
      if (filteredClubIds.length === 0) return res.sendStatus(403);

      const qDateFrom = req.query.dateFrom ? new Date(req.query.dateFrom as string) : null;
      const qDateTo = req.query.dateTo ? (() => { const d = new Date(req.query.dateTo as string); d.setHours(23, 59, 59, 999); return d; })() : null;

      const sessionConditions: any[] = [inArray(sessions.clubId, filteredClubIds)];
      if (qDateFrom) sessionConditions.push(gte(sessions.date, qDateFrom));
      if (qDateTo) sessionConditions.push(lte(sessions.date, qDateTo));

      const signupsData = await db.select({
        fee: sessionSignups.fee,
        paymentStatus: sessionSignups.paymentStatus,
      }).from(sessionSignups)
        .innerJoin(sessions, eq(sessionSignups.sessionId, sessions.id))
        .where(sessionConditions.length > 0 ? and(...sessionConditions) : undefined);

      const sessionIncome = signupsData.reduce((sum, s) => sum + (s.fee || 0), 0);
      const sessionPaid = signupsData.filter(s => s.paymentStatus === "PAID").reduce((sum, s) => sum + (s.fee || 0), 0);
      const sessionPending = signupsData.filter(s => s.paymentStatus === "PENDING").reduce((sum, s) => sum + (s.fee || 0), 0);

      const movementConditions: any[] = [inArray(inventoryMovements.clubId, filteredClubIds)];
      if (qDateFrom) movementConditions.push(gte(inventoryMovements.createdAt, qDateFrom));
      if (qDateTo) movementConditions.push(lte(inventoryMovements.createdAt, qDateTo));

      const movementsAll = await db.select({
        movementType: inventoryMovements.movementType,
        totalAmount: inventoryMovements.totalAmount,
        quantityDelta: inventoryMovements.quantityDelta,
        itemName: inventoryItems.name,
      }).from(inventoryMovements)
        .innerJoin(inventoryItems, eq(inventoryMovements.itemId, inventoryItems.id))
        .where(and(...movementConditions));

      const inventoryPurchases = movementsAll.filter(m => m.movementType === "RECEIPT").reduce((sum, m) => sum + (m.totalAmount || 0), 0);
      const inventorySales = movementsAll.filter(m => m.movementType === "SALE").reduce((sum, m) => sum + (m.totalAmount || 0), 0);
      const stockUsed = movementsAll.filter(m => m.movementType === "USAGE").reduce((sum, m) => sum + Math.abs(m.quantityDelta), 0);

      const expenseConditions: any[] = [inArray(expenses.clubId, filteredClubIds)];
      if (qDateFrom) expenseConditions.push(gte(expenses.createdAt, qDateFrom));
      if (qDateTo) expenseConditions.push(lte(expenses.createdAt, qDateTo));

      const expensesAll = await db.select({
        amount: expenses.amount,
      }).from(expenses).where(and(...expenseConditions));

      const generalExpenses = expensesAll.reduce((sum, e) => sum + (e.amount || 0), 0);

      const membershipConditions: any[] = [inArray(clubMemberships.clubId, filteredClubIds)];
      const membershipsData = await db.select({
        id: clubMemberships.id,
        userId: clubMemberships.userId,
        clubId: clubMemberships.clubId,
        planId: clubMemberships.planId,
        status: clubMemberships.status,
        startDate: clubMemberships.startDate,
        endDate: clubMemberships.endDate,
        paymentConfirmed: clubMemberships.paymentConfirmed,
        proratedPrice: clubMemberships.proratedPrice,
        createdAt: clubMemberships.createdAt,
        fullName: users.fullName,
        email: users.email,
        planName: membershipPlans.name,
        planAnnualPrice: membershipPlans.annualPrice,
      }).from(clubMemberships)
        .leftJoin(users, eq(clubMemberships.userId, users.id))
        .leftJoin(membershipPlans, eq(clubMemberships.planId, membershipPlans.id))
        .leftJoin(clubs, eq(clubMemberships.clubId, clubs.id))
        .where(and(...membershipConditions));

      const activeMemberships = membershipsData.filter(m => m.status === "ACTIVE");
      const membershipTotalRevenue = activeMemberships.reduce((sum, m) => sum + (m.proratedPrice || m.planAnnualPrice || 0), 0);
      const membershipPaid = activeMemberships.filter(m => m.paymentConfirmed).reduce((sum, m) => sum + (m.proratedPrice || m.planAnnualPrice || 0), 0);
      const membershipUnpaid = membershipTotalRevenue - membershipPaid;
      const membershipOverdue = activeMemberships.filter(m => !m.paymentConfirmed && m.endDate && new Date(m.endDate) < new Date()).length;

      const membershipMembers = membershipsData.map(m => ({
        id: m.id,
        userId: m.userId,
        clubId: m.clubId,
        fullName: m.fullName,
        email: m.email,
        planName: m.planName,
        planPrice: m.proratedPrice || m.planAnnualPrice || 0,
        status: m.status,
        paymentStatus: m.paymentConfirmed ? "PAID" : "UNPAID",
        startDate: m.startDate,
        endDate: m.endDate,
        createdAt: m.createdAt,
        isOverdue: !m.paymentConfirmed && m.endDate && new Date(m.endDate) < new Date(),
      }));

      const totalIncome = sessionIncome + inventorySales + membershipPaid;
      const totalExpenses = inventoryPurchases + generalExpenses;
      const netRevenue = totalIncome - totalExpenses;

      res.json({
        sessionIncome,
        sessionPaid,
        sessionPending,
        sessionOutstanding: sessionIncome - sessionPaid,
        inventorySales,
        inventoryPurchases,
        generalExpenses,
        totalIncome,
        totalExpenses,
        netRevenue,
        stockUsed,
        collectionRate: sessionIncome > 0 ? ((sessionPaid / sessionIncome) * 100).toFixed(1) : "0.0",
        membershipTotalRevenue,
        membershipPaid,
        membershipUnpaid,
        membershipOverdue,
        membershipActiveCount: activeMemberships.length,
        membershipMembers,
      });
    } catch (err: any) {
      console.error("Error fetching financial dashboard:", err);
      res.status(500).json({ message: "Failed to fetch financial dashboard" });
    }
  });

  // === INTERNAL MESSAGES ===

  app.get("/api/messages/contacts", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Not authenticated" });
    try {
      const userId = (req.user as any).id;
      const userRole = (req.user as any).role;

      let contactableUserIds = new Set<number>();

      if (userRole === "OWNER") {
        const allUsers = await db.select({ id: users.id }).from(users);
        allUsers.forEach(u => contactableUserIds.add(u.id));
      } else {
        const myProfiles = await db.select({ clubId: playerProfiles.clubId })
          .from(playerProfiles)
          .where(and(eq(playerProfiles.userId, userId), eq(playerProfiles.membershipStatus, "APPROVED")));
        const myClubIds = myProfiles.map(p => p.clubId);

        if (myClubIds.length > 0) {
          const clubMembers = await db.select({ userId: playerProfiles.userId })
            .from(playerProfiles)
            .where(and(inArray(playerProfiles.clubId, myClubIds), eq(playerProfiles.membershipStatus, "APPROVED")));
          clubMembers.forEach(m => contactableUserIds.add(m.userId));
        }

        const superAdmins = await db.select({ id: users.id }).from(users).where(eq(users.role, "OWNER"));
        superAdmins.forEach(a => contactableUserIds.add(a.id));
      }

      contactableUserIds.delete(userId);

      if (contactableUserIds.size === 0) {
        return res.json([]);
      }

      const contactUsers = await db.select({
        id: users.id,
        fullName: users.fullName,
        role: users.role,
      }).from(users).where(inArray(users.id, [...contactableUserIds]));

      res.json(contactUsers.sort((a, b) => (a.fullName || "").localeCompare(b.fullName || "")));
    } catch (err: any) {
      res.status(500).json({ message: "Failed to fetch contacts" });
    }
  });

  app.get("/api/messages/conversations", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Not authenticated" });
    try {
      const userId = (req.user as any).id;
      const allMessages = await db.select({
        id: internalMessages.id,
        senderId: internalMessages.senderId,
        recipientId: internalMessages.recipientId,
        body: internalMessages.body,
        readAt: internalMessages.readAt,
        archivedBySender: internalMessages.archivedBySender,
        archivedByRecipient: internalMessages.archivedByRecipient,
        createdAt: internalMessages.createdAt,
      }).from(internalMessages)
        .where(or(eq(internalMessages.senderId, userId), eq(internalMessages.recipientId, userId)))
        .orderBy(desc(internalMessages.createdAt));

      const conversations: Record<number, {
        contactId: number;
        lastMessage: string;
        lastMessageAt: string;
        unreadCount: number;
        isArchived: boolean;
      }> = {};

      allMessages.forEach(msg => {
        const isSender = msg.senderId === userId;
        const contactId = isSender ? msg.recipientId : msg.senderId;
        const isArchived = isSender ? msg.archivedBySender : msg.archivedByRecipient;

        if (!conversations[contactId]) {
          conversations[contactId] = {
            contactId,
            lastMessage: msg.body.substring(0, 100),
            lastMessageAt: msg.createdAt.toISOString(),
            unreadCount: 0,
            isArchived: true,
          };
        }

        if (!isArchived) {
          conversations[contactId].isArchived = false;
        }

        if (!isSender && !msg.readAt) {
          conversations[contactId].unreadCount++;
        }
      });

      const contactIds = Object.keys(conversations).map(Number);
      if (contactIds.length === 0) return res.json([]);

      const contactUsers = await db.select({
        id: users.id,
        fullName: users.fullName,
        role: users.role,
      }).from(users).where(inArray(users.id, contactIds));

      const contactMap = new Map(contactUsers.map(u => [u.id, u]));

      const result = Object.values(conversations)
        .filter(c => !c.isArchived)
        .map(c => ({
          ...c,
          contactName: contactMap.get(c.contactId)?.fullName || "Unknown",
          contactRole: contactMap.get(c.contactId)?.role || "PLAYER",
        }))
        .sort((a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime());

      res.json(result);
    } catch (err: any) {
      res.status(500).json({ message: "Failed to fetch conversations" });
    }
  });

  app.get("/api/messages/thread/:contactId", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Not authenticated" });
    try {
      const userId = (req.user as any).id;
      const contactId = Number(req.params.contactId);

      const messages = await db.select({
        id: internalMessages.id,
        senderId: internalMessages.senderId,
        recipientId: internalMessages.recipientId,
        body: internalMessages.body,
        readAt: internalMessages.readAt,
        createdAt: internalMessages.createdAt,
      }).from(internalMessages)
        .where(
          or(
            and(eq(internalMessages.senderId, userId), eq(internalMessages.recipientId, contactId)),
            and(eq(internalMessages.senderId, contactId), eq(internalMessages.recipientId, userId))
          )
        )
        .orderBy(internalMessages.createdAt);

      await db.update(internalMessages)
        .set({ readAt: new Date() })
        .where(
          and(
            eq(internalMessages.senderId, contactId),
            eq(internalMessages.recipientId, userId),
            sql`${internalMessages.readAt} IS NULL`
          )
        );

      res.json(messages);
    } catch (err: any) {
      res.status(500).json({ message: "Failed to fetch thread" });
    }
  });

  app.get("/api/messages/unread-count", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Not authenticated" });
    try {
      const userId = (req.user as any).id;
      const result = await db.select({ count: sql<number>`count(*)::int` })
        .from(internalMessages)
        .where(and(
          eq(internalMessages.recipientId, userId),
          sql`${internalMessages.readAt} IS NULL`,
          eq(internalMessages.archivedByRecipient, false)
        ));
      res.json({ count: result[0]?.count || 0 });
    } catch (err: any) {
      res.status(500).json({ message: "Failed to fetch unread count" });
    }
  });

  app.post("/api/messages/send", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Not authenticated" });
    try {
      const senderId = (req.user as any).id;
      const senderRole = (req.user as any).role;
      const { recipientId, body } = req.body;
      const resolvedRecipientId = recipientId ? Number(recipientId) : null;

      if (!resolvedRecipientId || !body) {
        return res.status(400).json({ message: "Recipient and message body are required" });
      }

      if (senderRole !== "OWNER") {
        const [recipient] = await db.select({ role: users.role }).from(users).where(eq(users.id, resolvedRecipientId));
        if (!recipient) return res.status(404).json({ message: "Recipient not found" });

        if (recipient.role !== "OWNER") {
          const senderClubs = await db.select({ clubId: playerProfiles.clubId })
            .from(playerProfiles)
            .where(and(eq(playerProfiles.userId, senderId), eq(playerProfiles.membershipStatus, "APPROVED")));
          const senderClubIds = senderClubs.map(p => p.clubId);

          if (senderClubIds.length === 0) {
            return res.status(403).json({ message: "You must belong to a club to send messages" });
          }

          const recipientClubs = await db.select({ clubId: playerProfiles.clubId })
            .from(playerProfiles)
            .where(and(eq(playerProfiles.userId, resolvedRecipientId), eq(playerProfiles.membershipStatus, "APPROVED")));
          const recipientClubIds = recipientClubs.map(p => p.clubId);

          const sharedClub = senderClubIds.some(id => recipientClubIds.includes(id));
          if (!sharedClub) {
            return res.status(403).json({ message: "You can only message players from the same club" });
          }
        }
      }

      const [msg] = await db.insert(internalMessages).values({
        senderId,
        recipientId: resolvedRecipientId,
        subject: "",
        body,
        clubId: null,
      }).returning();
      res.json(msg);
    } catch (err: any) {
      res.status(500).json({ message: "Failed to send message" });
    }
  });

  app.patch("/api/messages/:id/read", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Not authenticated" });
    try {
      const userId = (req.user as any).id;
      const messageId = Number(req.params.id);
      const [msg] = await db.update(internalMessages)
        .set({ readAt: new Date() })
        .where(and(eq(internalMessages.id, messageId), eq(internalMessages.recipientId, userId)))
        .returning();
      if (!msg) return res.status(404).json({ message: "Message not found" });
      res.json(msg);
    } catch (err: any) {
      res.status(500).json({ message: "Failed to mark message as read" });
    }
  });

  app.post("/api/messages/archive-conversation/:contactId", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Not authenticated" });
    try {
      const userId = (req.user as any).id;
      const contactId = Number(req.params.contactId);

      await db.update(internalMessages)
        .set({ archivedBySender: true })
        .where(and(eq(internalMessages.senderId, userId), eq(internalMessages.recipientId, contactId)));

      await db.update(internalMessages)
        .set({ archivedByRecipient: true })
        .where(and(eq(internalMessages.senderId, contactId), eq(internalMessages.recipientId, userId)));

      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ message: "Failed to archive conversation" });
    }
  });

  app.delete("/api/messages/conversation/:contactId", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Not authenticated" });
    try {
      const userId = (req.user as any).id;
      const contactId = Number(req.params.contactId);

      await db.delete(internalMessages)
        .where(
          or(
            and(eq(internalMessages.senderId, userId), eq(internalMessages.recipientId, contactId)),
            and(eq(internalMessages.senderId, contactId), eq(internalMessages.recipientId, userId))
          )
        );

      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ message: "Failed to delete conversation" });
    }
  });

  // Club member comprehensive data for management
  app.get("/api/clubs/:clubId/members-comprehensive", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Not authenticated" });
    try {
      const user = req.user as any;
      const clubId = Number(req.params.clubId);
      if (user.role !== "OWNER") {
        const adminProfile = await db.select().from(playerProfiles)
          .where(and(eq(playerProfiles.userId, user.id), eq(playerProfiles.clubId, clubId), eq(playerProfiles.clubRole, "ADMIN")));
        if (adminProfile.length === 0) return res.status(403).json({ message: "Not authorized" });
      }
      const rows = await db.select({
        profileId: playerProfiles.id,
        userId: playerProfiles.userId,
        clubId: playerProfiles.clubId,
        clubRole: playerProfiles.clubRole,
        membershipStatus: playerProfiles.membershipStatus,
        playerStatus: playerProfiles.playerStatus,
        gender: playerProfiles.gender,
        category: playerProfiles.category,
        grade: playerProfiles.grade,
        rankingPoints: playerProfiles.rankingPoints,
        matchesPlayed: playerProfiles.matchesPlayed,
        matchesWon: playerProfiles.matchesWon,
        fullName: users.fullName,
        email: users.email,
        phone: users.phone,
        city: users.city,
        country: users.country,
        region: users.region,
        continent: users.continent,
        nickname: users.nickname,
        dateOfBirth: users.dateOfBirth,
        isJunior: users.isJunior,
        parentGuardianName: users.parentGuardianName,
        parentGuardianEmail: users.parentGuardianEmail,
        profilePictureUrl: users.profilePictureUrl,
        accountStatus: users.accountStatus,
        role: users.role,
        createdAt: users.createdAt,
      }).from(playerProfiles)
        .innerJoin(users, eq(playerProfiles.userId, users.id))
        .where(eq(playerProfiles.clubId, clubId))
        .orderBy(users.fullName);
      const members = rows.map(r => ({
        id: r.profileId,
        userId: r.userId,
        clubId: r.clubId,
        clubRole: r.clubRole,
        membershipStatus: r.membershipStatus,
        playerStatus: r.playerStatus,
        gender: r.gender,
        category: r.category,
        rankingPoints: r.rankingPoints,
        matchesPlayed: r.matchesPlayed,
        matchesWon: r.matchesWon,
        user: {
          id: r.userId,
          fullName: r.fullName,
          email: r.email,
          phone: r.phone,
          city: r.city,
          country: r.country,
          region: r.region,
          continent: r.continent,
          nickname: r.nickname,
          dateOfBirth: r.dateOfBirth,
          isJunior: r.isJunior,
          parentGuardianName: r.parentGuardianName,
          parentGuardianEmail: r.parentGuardianEmail,
          profilePictureUrl: r.profilePictureUrl,
          accountStatus: r.accountStatus,
          role: r.role,
        },
        createdAt: r.createdAt,
      }));
      res.json(members);
    } catch (err: any) {
      console.error("Error fetching club members:", err);
      res.status(500).json({ message: "Failed to fetch club members" });
    }
  });

  // Club pending approvals 
  app.get("/api/clubs/:clubId/pending-approvals", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Not authenticated" });
    try {
      const user = req.user as any;
      const clubId = Number(req.params.clubId);
      if (user.role !== "OWNER") {
        const adminProfile = await db.select().from(playerProfiles)
          .where(and(eq(playerProfiles.userId, user.id), eq(playerProfiles.clubId, clubId), eq(playerProfiles.clubRole, "ADMIN")));
        if (adminProfile.length === 0) return res.status(403).json({ message: "Not authorized" });
      }
      const pendingRows = await db.select({
        profileId: playerProfiles.id,
        userId: playerProfiles.userId,
        clubRole: playerProfiles.clubRole,
        membershipStatus: playerProfiles.membershipStatus,
        gender: playerProfiles.gender,
        category: playerProfiles.category,
        grade: playerProfiles.grade,
        fullName: users.fullName,
        email: users.email,
        phone: users.phone,
        city: users.city,
        createdAt: users.createdAt,
        dateOfBirth: users.dateOfBirth,
      }).from(playerProfiles)
        .innerJoin(users, eq(playerProfiles.userId, users.id))
        .where(and(eq(playerProfiles.clubId, clubId), eq(playerProfiles.membershipStatus, "PENDING")))
        .orderBy(users.fullName);
      const pending = pendingRows.map(r => ({
        id: r.profileId,
        userId: r.userId,
        clubRole: r.clubRole,
        membershipStatus: r.membershipStatus,
        gender: r.gender,
        category: r.category,
        user: {
          id: r.userId,
          fullName: r.fullName,
          email: r.email,
          phone: r.phone,
          city: r.city,
          dateOfBirth: r.dateOfBirth,
          createdAt: r.createdAt,
        },
      }));
      res.json(pending);
    } catch (err: any) {
      res.status(500).json({ message: "Failed to fetch pending approvals" });
    }
  });

  // Approve/Reject club membership
  app.patch("/api/clubs/:clubId/members/:profileId/status", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Not authenticated" });
    try {
      const user = req.user as any;
      const clubId = Number(req.params.clubId);
      const profileId = Number(req.params.profileId);
      const { membershipStatus } = req.body;
      if (user.role !== "OWNER") {
        const adminProfile = await db.select().from(playerProfiles)
          .where(and(eq(playerProfiles.userId, user.id), eq(playerProfiles.clubId, clubId), eq(playerProfiles.clubRole, "ADMIN")));
        if (adminProfile.length === 0) return res.status(403).json({ message: "Not authorized" });
      }
      const [updated] = await db.update(playerProfiles)
        .set({ membershipStatus })
        .where(and(eq(playerProfiles.id, profileId), eq(playerProfiles.clubId, clubId)))
        .returning();
      if (!updated) return res.status(404).json({ message: "Profile not found" });
      res.json(updated);
    } catch (err: any) {
      res.status(500).json({ message: "Failed to update member status" });
    }
  });

  // Bulk member actions (delete, archive, pause, suspend)
  app.post("/api/clubs/:clubId/members/bulk-action", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Not authenticated" });
    try {
      const user = req.user as any;
      const clubId = Number(req.params.clubId);
      const { profileIds, action } = req.body;
      if (user.role !== "OWNER") {
        const adminProfile = await db.select().from(playerProfiles)
          .where(and(eq(playerProfiles.userId, user.id), eq(playerProfiles.clubId, clubId), eq(playerProfiles.clubRole, "ADMIN")));
        if (adminProfile.length === 0) return res.status(403).json({ message: "Not authorized" });
      }
      if (!Array.isArray(profileIds) || profileIds.length === 0) {
        return res.status(400).json({ message: "No profiles selected" });
      }
      const ids = profileIds.map(Number);
      if (action === "DELETE") {
        await db.delete(playerProfiles).where(and(inArray(playerProfiles.id, ids), eq(playerProfiles.clubId, clubId)));
      } else if (action === "ARCHIVE") {
        await db.update(playerProfiles).set({ playerStatus: "ARCHIVED" as any }).where(and(inArray(playerProfiles.id, ids), eq(playerProfiles.clubId, clubId)));
      } else if (action === "PAUSE" || action === "SUSPEND") {
        await db.update(playerProfiles).set({ playerStatus: "SUSPENDED" as any }).where(and(inArray(playerProfiles.id, ids), eq(playerProfiles.clubId, clubId)));
      } else {
        return res.status(400).json({ message: "Invalid action" });
      }
      res.json({ success: true, affected: ids.length });
    } catch (err: any) {
      console.error("Bulk action error:", err);
      res.status(500).json({ message: "Failed to perform bulk action" });
    }
  });

  // Delete club permanently (super admin only)
  app.delete("/api/super-admin/clubs/:id/permanent", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Not authenticated" });
    const user = req.user as any;
    if (user.role !== "OWNER") return res.status(403).json({ message: "Not authorized" });
    try {
      const clubId = Number(req.params.id);
      await db.delete(sessionSignups).where(
        inArray(sessionSignups.sessionId, db.select({ id: sessions.id }).from(sessions).where(eq(sessions.clubId, clubId)))
      );
      await db.delete(matches).where(
        inArray(matches.sessionId, db.select({ id: sessions.id }).from(sessions).where(eq(sessions.clubId, clubId)))
      );
      await db.delete(sessions).where(eq(sessions.clubId, clubId));
      await db.delete(playerProfiles).where(eq(playerProfiles.clubId, clubId));
      await db.delete(clubMemberships).where(eq(clubMemberships.clubId, clubId));
      await db.delete(membershipRequests).where(eq(membershipRequests.clubId, clubId));
      await db.delete(clubs).where(eq(clubs.id, clubId));
      res.json({ success: true });
    } catch (err: any) {
      console.error("Error permanently deleting club:", err);
      res.status(500).json({ message: "Failed to permanently delete club" });
    }
  });

  // Archive club (super admin only) 
  app.patch("/api/super-admin/clubs/:id/archive", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Not authenticated" });
    const user = req.user as any;
    if (user.role !== "OWNER") return res.status(403).json({ message: "Not authorized" });
    try {
      const clubId = Number(req.params.id);
      const [updated] = await db.update(clubs)
        .set({ status: "ARCHIVED" as any, isActive: false })
        .where(eq(clubs.id, clubId))
        .returning();
      if (!updated) return res.status(404).json({ message: "Club not found" });
      res.json(updated);
    } catch (err: any) {
      res.status(500).json({ message: "Failed to archive club" });
    }
  });

  // Update member profile comprehensive (for club management)
  app.patch("/api/clubs/:clubId/members/:profileId/comprehensive", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Not authenticated" });
    try {
      const user = req.user as any;
      const clubId = Number(req.params.clubId);
      const profileId = Number(req.params.profileId);
      if (user.role !== "OWNER") {
        const adminProfile = await db.select().from(playerProfiles)
          .where(and(eq(playerProfiles.userId, user.id), eq(playerProfiles.clubId, clubId), eq(playerProfiles.clubRole, "ADMIN")));
        if (adminProfile.length === 0) return res.status(403).json({ message: "Not authorized" });
      }
      const profile = await db.select().from(playerProfiles).where(and(eq(playerProfiles.id, profileId), eq(playerProfiles.clubId, clubId)));
      if (profile.length === 0) return res.status(404).json({ message: "Profile not found" });
      const { gender, category, grade: gradeField, clubRole, playerStatus, membershipStatus, fullName, email, phone, city, country, region, continent, nickname, dateOfBirth, isJunior, parentGuardianName, parentGuardianEmail, role } = req.body;
      const profileUpdates: any = {};
      if (gender !== undefined) profileUpdates.gender = gender;
      const gradeValue = gradeField || category;
      if (gradeValue !== undefined) {
        profileUpdates.grade = gradeValue;
      }
      if (clubRole !== undefined) profileUpdates.clubRole = clubRole;
      if (playerStatus !== undefined) profileUpdates.playerStatus = playerStatus;
      if (membershipStatus !== undefined) profileUpdates.membershipStatus = membershipStatus;
      if (Object.keys(profileUpdates).length > 0) {
        await db.update(playerProfiles).set(profileUpdates).where(eq(playerProfiles.id, profileId));
      }
      const userUpdates: any = {};
      if (fullName !== undefined) userUpdates.fullName = fullName;
      if (email !== undefined) userUpdates.email = email;
      if (phone !== undefined) userUpdates.phone = phone;
      if (city !== undefined) userUpdates.city = city;
      if (country !== undefined) userUpdates.country = country;
      if (region !== undefined) userUpdates.region = region;
      if (continent !== undefined) userUpdates.continent = continent;
      if (nickname !== undefined) userUpdates.nickname = nickname;
      if (dateOfBirth !== undefined) userUpdates.dateOfBirth = dateOfBirth ? new Date(dateOfBirth) : null;
      if (isJunior !== undefined) userUpdates.isJunior = isJunior;
      if (parentGuardianName !== undefined) userUpdates.parentGuardianName = parentGuardianName;
      if (parentGuardianEmail !== undefined) userUpdates.parentGuardianEmail = parentGuardianEmail;
      if (role !== undefined && user.role === "OWNER") userUpdates.role = role;
      if (Object.keys(userUpdates).length > 0) {
        await db.update(users).set(userUpdates).where(eq(users.id, profile[0].userId));
      }
      res.json({ success: true });
    } catch (err: any) {
      console.error("Error updating member:", err);
      res.status(500).json({ message: "Failed to update member" });
    }
  });

  // Delete member profile completely
  app.delete("/api/clubs/:clubId/members/:profileId/permanent", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Not authenticated" });
    try {
      const user = req.user as any;
      const clubId = Number(req.params.clubId);
      const profileId = Number(req.params.profileId);
      if (user.role !== "OWNER") {
        const adminProfile = await db.select().from(playerProfiles)
          .where(and(eq(playerProfiles.userId, user.id), eq(playerProfiles.clubId, clubId), eq(playerProfiles.clubRole, "ADMIN")));
        if (adminProfile.length === 0) return res.status(403).json({ message: "Not authorized" });
      }
      await db.delete(sessionSignups).where(eq(sessionSignups.playerId, profileId));
      await db.delete(playerProfiles).where(and(eq(playerProfiles.id, profileId), eq(playerProfiles.clubId, clubId)));
      res.json({ success: true });
    } catch (err: any) {
      console.error("Error deleting member:", err);
      res.status(500).json({ message: "Failed to delete member" });
    }
  });

  // Reset password for a member (admin/super admin)
  app.post("/api/clubs/:clubId/members/:userId/reset-password", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Not authenticated" });
    try {
      const adminUser = req.user as any;
      const clubId = Number(req.params.clubId);
      const targetUserId = Number(req.params.userId);
      if (adminUser.role !== "OWNER") {
        const adminProfile = await db.select().from(playerProfiles)
          .where(and(eq(playerProfiles.userId, adminUser.id), eq(playerProfiles.clubId, clubId), eq(playerProfiles.clubRole, "ADMIN")));
        if (adminProfile.length === 0) return res.status(403).json({ message: "Not authorized" });
      }
      const token = randomBytes(32).toString("hex");
      const expiry = new Date(Date.now() + 24 * 60 * 60 * 1000);
      await db.update(users).set({ passwordResetToken: token, passwordResetExpiry: expiry }).where(eq(users.id, targetUserId));
      res.json({ success: true, resetToken: token });
    } catch (err: any) {
      res.status(500).json({ message: "Failed to generate reset token" });
    }
  });

  app.post("/api/god-mode/clubs/:clubId/add-member", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Not authenticated" });
    if (req.user!.role !== "OWNER") return res.status(403).json({ message: "Super admin only" });
    try {
      const clubId = Number(req.params.clubId);
      const club = await storage.getClub(clubId);
      if (!club) return res.status(404).json({ message: "Club not found" });

      const { fullName, email, phone, nickname, gender, category, clubRole, password } = req.body;
      if (!fullName || !email) return res.status(400).json({ message: "Name and email are required" });

      let existingUser = await storage.getUserByUsername(email);
      if (!existingUser) {
        const { hashPassword } = await import("./auth");
        const hashed = await hashPassword(password || "changeme123");
        existingUser = await storage.createUser({
          fullName,
          email,
          password: hashed,
          role: "PLAYER",
        });
      }

      const existingProfile = await storage.getPlayerProfile(existingUser.id, clubId);
      if (existingProfile) {
        return res.status(400).json({ message: "User is already a member of this club" });
      }

      const profile = await storage.createPlayerProfile({
        userId: existingUser.id,
        clubId,
        clubRole: clubRole || "PLAYER",
        membershipStatus: "APPROVED",
        playerStatus: "ACTIVE",
        gender: gender || null,
        category: "D",
        grade: category || "C3",
        rankingPoints: 1000,
        matchesPlayed: 0,
        matchesWon: 0,
      });

      if (phone) await db.update(users).set({ phone }).where(eq(users.id, existingUser.id));
      if (nickname) await db.update(users).set({ nickname }).where(eq(users.id, existingUser.id));

      res.status(201).json({ ...profile, user: { id: existingUser.id, fullName: existingUser.fullName, email: existingUser.email } });
    } catch (err: any) {
      console.error("Error adding member:", err);
      res.status(500).json({ message: err.message || "Failed to add member" });
    }
  });

  return httpServer;
}
