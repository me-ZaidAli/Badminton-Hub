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

const scryptAsync = promisify(scrypt);

export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function comparePasswords(supplied: string, stored: string) {
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

export function setupAuth(app: Express) {
  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET || "secret",
    resave: false,
    saveUninitialized: false,
    store: storage.sessionStore,
  };

  if (app.get("env") === "production") {
    app.set("trust proxy", 1);
  }

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

      // Validate club exists
      const clubId = req.body.clubId ? Number(req.body.clubId) : 1;
      const club = await storage.getClub(clubId);
      if (!club) {
        return res.status(400).send("Invalid club selected");
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

      const hashedPassword = await hashPassword(req.body.password);
      const user = await storage.createUser({
        ...req.body,
        password: hashedPassword,
        emailVerified: false,
        dateOfBirth: req.body.dateOfBirth ? new Date(req.body.dateOfBirth) : null,
        isJunior,
        parentGuardianName: isJunior ? req.body.parentGuardianName : null,
        parentGuardianEmail: isJunior ? req.body.parentGuardianEmail : null,
      });

      // Create profile automatically for the selected club
      await storage.createPlayerProfile({
        userId: user.id,
        clubId: clubId,
        gender: req.body.gender,
        category: req.body.category || "D",
        membershipId: null
      });

      // Store policy acceptance logs
      const policyVersion = "1.0";
      if (req.body.acceptedPolicies && Array.isArray(req.body.acceptedPolicies)) {
        for (const policyType of req.body.acceptedPolicies) {
          await storage.createPolicyAcceptance({
            userId: user.id,
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
            message: `${req.body.fullName} (${req.body.email}) has registered and is awaiting approval for ${club.name}.`,
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
        for (const owner of owners) {
          await storage.createNotification({
            userId: owner.id,
            type: "PASSWORD_RESET_REQUEST",
            title: "Password Reset Request",
            message: `${user.fullName} (${user.email}) has requested a password reset. Share the reset link from Admin > Password Resets.`,
            linkUrl: "/admin/password-resets",
          });
        }
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

  app.post("/api/auth/login", (req, res, next) => {
    passport.authenticate("local", (err: any, user: User | false, info: { message?: string }) => {
      if (err) return next(err);
      if (!user) {
        return res.status(401).json({ message: info?.message || "Invalid credentials" });
      }
      req.login(user, (loginErr) => {
        if (loginErr) return next(loginErr);
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
    
    // Enrich with profile
    const profile = await storage.getPlayerProfile(req.user!.id);
    res.json({ ...req.user, playerProfile: profile });
  });
}
