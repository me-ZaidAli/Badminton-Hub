import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import { User, users } from "@shared/schema";
import { eq, isNotNull, gt, and } from "drizzle-orm";
import { db } from "./db";
import { ensureOwnerProfilesInAllClubs } from "./ownerSync";

const scryptAsync = promisify(scrypt);

export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function comparePasswords(supplied: string, stored: string | null | undefined) {
  if (!stored || !stored.includes(".")) return false;
  const [hashed, salt] = stored.split(".");
  if (!hashed || !salt) return false;
  try {
    const hashedBuf = Buffer.from(hashed, "hex");
    const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
    return timingSafeEqual(hashedBuf, suppliedBuf);
  } catch {
    return false;
  }
}

export function setupAuth(app: Express) {
  app.set("trust proxy", 1);

  const isProduction = app.get("env") === "production" || !!process.env.REPL_SLUG;

  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET || "secret",
    resave: false,
    saveUninitialized: false,
    store: storage.sessionStore,
    cookie: {
      maxAge: 30 * 24 * 60 * 60 * 1000,
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? "none" : "lax",
    },
  };

  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        const user = await storage.getUserByUsername(username);
        if (!user || !(await comparePasswords(password, user.password))) {
          console.log(`[AUTH] LOGIN FAILED: email=${username} reason=invalid_credentials`);
          return done(null, false, { message: "Invalid email or password" });
        }
        if ((user as any).closedAt) {
          console.log(`[AUTH] LOGIN BLOCKED: email=${username} reason=account_closed`);
          return done(null, false, { message: "This account has been closed. Please contact your club administrator." });
        }
        console.log(`[AUTH] LOGIN SUCCESS: userId=${user.id} email=${username} role=${user.role}`);
        return done(null, user);
      } catch (err) {
        console.error(`[AUTH] LOGIN ERROR: email=${username}`, err);
        return done(err);
      }
    }),
  );

  passport.serializeUser((user, done) => done(null, (user as User).id));
  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user);
    } catch (err) {
      done(err);
    }
  });

  app.post("/api/auth/register", async (req, res, next) => {
    try {
      const existingUser = await storage.getUserByUsername(req.body.email);
      if (existingUser) {
        const canClaim = existingUser.accountStatus === "PENDING" && !existingUser.emailVerified;
        return res.status(409).json({
          message: canClaim
            ? "This email is associated with a pre-existing account. You can claim it by setting a password."
            : "An account with this email already exists. Please sign in instead.",
          code: "EMAIL_EXISTS",
          canClaim,
        });
      }

      // Server-side validation: require policy acceptances
      const acceptedPolicies = req.body.acceptedPolicies;
      if (!acceptedPolicies || !Array.isArray(acceptedPolicies)) {
        return res.status(400).send("Policy acceptances are required");
      }
      if (!acceptedPolicies.includes("TERMS_CONDITIONS") || !acceptedPolicies.includes("PRIVACY_POLICY")) {
        return res.status(400).send("You must accept the Terms & Conditions and Privacy Policy");
      }

      const isJunior = req.body.isJunior || false;

      // Server-side validation: junior accounts require parent details and consent
      if (isJunior) {
        if (!req.body.parentGuardianName || req.body.parentGuardianName.length < 2) {
          return res.status(400).send("Parent/guardian name is required for junior accounts");
        }
        if (!req.body.parentGuardianEmail || !req.body.parentGuardianEmail.includes("@")) {
          return res.status(400).send("A valid parent/guardian email is required for junior accounts");
        }
        if (!acceptedPolicies.includes("JUNIOR_PARENTAL_CONSENT")) {
          return res.status(400).send("Parental consent is required for junior accounts");
        }
      }

      const validSources = ["FACEBOOK", "INSTAGRAM", "TIKTOK", "WEBSITE", "WORD_OF_MOUTH", "LEISURE_CENTRE", "SAW_SESSION", "THROUGH_COACH", "REFERRAL", "OTHER"];
      const acquisitionSource = validSources.includes(req.body.acquisitionSource) ? req.body.acquisitionSource : null;
      if (!acquisitionSource) {
        return res.status(400).json({ message: "Please select how you heard about us" });
      }
      if (acquisitionSource === "OTHER" && (!req.body.acquisitionSourceOther || !req.body.acquisitionSourceOther.trim())) {
        return res.status(400).json({ message: "Please provide details for 'Other'" });
      }

      const hashedPassword = await hashPassword(req.body.password);
      const user = await storage.createUser({
        ...req.body,
        email: req.body.email?.toLowerCase?.() || req.body.email,
        password: hashedPassword,
        emailVerified: false,
        dateOfBirth: req.body.dateOfBirth ? new Date(req.body.dateOfBirth) : null,
        isJunior,
        parentGuardianName: isJunior ? req.body.parentGuardianName : null,
        parentGuardianEmail: isJunior ? req.body.parentGuardianEmail : null,
        acquisitionSource,
        acquisitionSourceOther: acquisitionSource === "OTHER" ? (req.body.acquisitionSourceOther || null) : null,
        lastActivityAt: new Date(),
      });

      // Store policy acceptance logs
      const policyVersion = "Version 1 - 20/02/2026";
      if (req.body.acceptedPolicies && Array.isArray(req.body.acceptedPolicies)) {
        for (const policyType of req.body.acceptedPolicies) {
          await storage.createPolicyAcceptance({
            userId: user.id,
            email: (req.body.email || "").toLowerCase(),
            policyType,
            policyVersion,
          });
        }
      }

      // Send notification to all OWNER (super admin) users about new registration
      try {
        const owners = await storage.getUsersByRole("OWNER");
        for (const owner of owners) {
          await storage.createNotification({
            userId: owner.id,
            type: "NEW_REGISTRATION",
            title: "New Player Registration",
            message: `${req.body.fullName} (${req.body.email}) has registered on the platform.`,
            linkUrl: "/admin/approvals",
          });
        }
      } catch (notifErr) {
        console.error("[AUTH] Failed to send registration notifications:", notifErr);
      }

      req.login(user, (err) => {
        if (err) return next(err);
        res.status(201).json(user);
      });
    } catch (err) {
      next(err);
    }
  });

  // Claim an existing email - set password for an account that was pre-created (e.g. guest player)
  app.post("/api/auth/claim-account", async (req, res, next) => {
    try {
      const { email, password, fullName } = req.body;
      if (!email || !password) {
        return res.status(400).json({ message: "Email and password are required" });
      }
      if (typeof password !== "string" || password.length < 6) {
        return res.status(400).json({ message: "Password must be at least 6 characters" });
      }

      const existingUser = await storage.getUserByUsername(email);
      if (!existingUser) {
        return res.status(404).json({ message: "No account found with this email" });
      }

      const canClaim = existingUser.accountStatus === "PENDING" && !existingUser.emailVerified;
      if (!canClaim) {
        return res.status(403).json({ message: "This account cannot be claimed. Please sign in with your existing password." });
      }

      const hashedPassword = await hashPassword(password);
      const updates: any = { password: hashedPassword };
      if (fullName && fullName.trim().length >= 2) {
        updates.fullName = fullName.trim();
      }

      await db.update(users).set(updates).where(eq(users.id, existingUser.id));

      const updatedUser = await storage.getUser(existingUser.id);

      // Send notification to OWNER users about claimed account
      try {
        const owners = await storage.getUsersByRole("OWNER");
        for (const owner of owners) {
          await storage.createNotification({
            userId: owner.id,
            type: "ACCOUNT_CLAIMED",
            title: "Account Claimed",
            message: `${fullName || existingUser.fullName} has claimed the account for ${email}.`,
            linkUrl: "/admin/approvals",
          });
        }
      } catch (notifErr) {
        console.error("[AUTH] Failed to send claim notifications:", notifErr);
      }

      req.login(updatedUser!, (err) => {
        if (err) return next(err);
        res.status(200).json(updatedUser);
      });
    } catch (err) {
      next(err);
    }
  });

  app.post("/api/auth/forgot-password", async (req, res, next) => {
    try {
      const { email } = req.body;
      if (!email) {
        return res.status(400).json({ message: "Email is required" });
      }

      const user = await storage.getUserByUsername(email);
      if (!user) {
        return res.status(200).json({ message: "If an account with that email exists, a password reset has been initiated." });
      }

      const token = randomBytes(32).toString("hex");
      const expiry = new Date(Date.now() + 24 * 60 * 60 * 1000);

      await db.update(users).set({
        passwordResetToken: token,
        passwordResetExpiry: expiry,
      }).where(eq(users.id, user.id));

      try {
        const owners = await storage.getUsersByRole("OWNER");
        console.log(`[AUTH] Found ${owners.length} OWNER users to notify about password reset for ${user.email}`);
        for (const owner of owners) {
          console.log(`[AUTH] Creating password reset notification for owner ${(owner as any).id} (${(owner as any).email})`);
          await storage.createNotification({
            userId: (owner as any).id,
            type: "PASSWORD_RESET_REQUEST",
            title: "Password Reset Request",
            message: `${user.fullName} (${user.email}) has requested a password reset. Share the reset link from Admin > Password Resets.`,
            linkUrl: "/admin/password-resets",
          });
        }
        console.log("[AUTH] All password reset notifications created successfully");
      } catch (notifErr) {
        console.error("[AUTH] Failed to send password reset notifications:", notifErr);
      }

      res.status(200).json({ message: "If an account with that email exists, a password reset has been initiated. Please contact your club admin for the reset link." });
    } catch (err) {
      next(err);
    }
  });

  app.post("/api/auth/reset-password", async (req, res, next) => {
    try {
      const { token, password } = req.body;
      if (!token || !password) {
        return res.status(400).json({ message: "Token and password are required" });
      }
      if (typeof password !== "string" || password.length < 6) {
        return res.status(400).json({ message: "Password must be at least 6 characters" });
      }

      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.passwordResetToken, token))
        .limit(1);

      if (!user) {
        return res.status(400).json({ message: "Invalid or expired reset link" });
      }

      if (!user.passwordResetExpiry || new Date() > user.passwordResetExpiry) {
        await db.update(users).set({
          passwordResetToken: null,
          passwordResetExpiry: null,
        }).where(eq(users.id, user.id));
        return res.status(400).json({ message: "This reset link has expired. Please request a new one." });
      }

      const hashedPassword = await hashPassword(password);
      await db.update(users).set({
        password: hashedPassword,
        passwordResetToken: null,
        passwordResetExpiry: null,
      }).where(eq(users.id, user.id));

      res.status(200).json({ message: "Password has been reset successfully. You can now sign in." });
    } catch (err) {
      next(err);
    }
  });

  app.get("/api/admin/password-resets", async (req, res) => {
    if (!req.isAuthenticated() || req.user!.role !== "OWNER") {
      return res.status(403).json({ message: "Access denied" });
    }

    const pendingResets = await db
      .select({
        id: users.id,
        fullName: users.fullName,
        email: users.email,
        passwordResetToken: users.passwordResetToken,
        passwordResetExpiry: users.passwordResetExpiry,
      })
      .from(users)
      .where(
        and(
          isNotNull(users.passwordResetToken),
          gt(users.passwordResetExpiry, new Date())
        )
      );

    res.json(pendingResets);
  });

  app.post("/api/admin/generate-reset", async (req, res, next) => {
    try {
      if (!req.isAuthenticated() || req.user!.role !== "OWNER") {
        return res.status(403).json({ message: "Access denied" });
      }
      const { email } = req.body;
      if (!email) {
        return res.status(400).json({ message: "Email is required" });
      }
      const user = await storage.getUserByUsername(email);
      if (!user) {
        return res.status(404).json({ message: "No user found with that email address" });
      }
      const token = randomBytes(32).toString("hex");
      const expiry = new Date(Date.now() + 24 * 60 * 60 * 1000);
      await db.update(users).set({
        passwordResetToken: token,
        passwordResetExpiry: expiry,
      }).where(eq(users.id, user.id));
      res.json({ token, fullName: user.fullName, email: user.email, id: user.id });
    } catch (err) {
      next(err);
    }
  });

  app.post("/api/admin/set-password", async (req, res, next) => {
    try {
      if (!req.isAuthenticated() || req.user!.role !== "OWNER") {
        return res.status(403).json({ message: "Access denied" });
      }
      const { userId, password } = req.body;
      if (!userId || !password) {
        return res.status(400).json({ message: "User ID and password are required" });
      }
      if (typeof password !== "string" || password.length < 6) {
        return res.status(400).json({ message: "Password must be at least 6 characters" });
      }
      const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      const hashedPassword = await hashPassword(password);
      await db.update(users).set({
        password: hashedPassword,
        passwordResetToken: null,
        passwordResetExpiry: null,
      }).where(eq(users.id, userId));
      res.json({ message: `Password updated successfully for ${user.fullName}` });
    } catch (err) {
      next(err);
    }
  });

  app.get("/api/admin/search-users", async (req, res) => {
    if (!req.isAuthenticated() || req.user!.role !== "OWNER") {
      return res.status(403).json({ message: "Access denied" });
    }
    const q = (req.query.q as string || "").trim().toLowerCase();
    if (q.length < 2) {
      return res.json([]);
    }
    const allUsers = await db.select({
      id: users.id,
      fullName: users.fullName,
      email: users.email,
      role: users.role,
    }).from(users);
    const filtered = allUsers.filter(u =>
      u.fullName.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)
    ).slice(0, 20);
    res.json(filtered);
  });

  app.post("/api/auth/login", (req, res, next) => {
    passport.authenticate("local", (err: any, user: User | false, info: { message?: string }) => {
      if (err) return next(err);
      if (!user) {
        return res.status(401).json({ message: info?.message || "Invalid credentials" });
      }
      req.login(user, async (loginErr) => {
        if (loginErr) return next(loginErr);
        try { await storage.updateUserActivity(user.id); } catch (e) { console.error("[AUTH] Failed to update activity:", e); }
        if (user.role === "OWNER") {
          try { await ensureOwnerProfilesInAllClubs(user.id); } catch (e) { console.error("[SYNC] Error syncing owner profiles on login:", e); }
        }
        res.status(200).json(user);
      });
    })(req, res, next);
  });

  app.post("/api/auth/logout", (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      res.sendStatus(200);
    });
  });

  app.get("/api/auth/me", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    const profiles = await storage.getPlayerProfilesByUser(req.user!.id);
    const profile = profiles.length > 0 ? profiles[0] : null;
    res.json({ ...req.user, playerProfile: profile, playerProfiles: profiles });
  });
}
