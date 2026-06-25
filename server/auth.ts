import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import { User, users, clubMemberships } from "@shared/schema";
import { eq, isNotNull, gt, gte, and } from "drizzle-orm";
import { db } from "./db";
import { ensureOwnerProfilesInAllClubs } from "./ownerSync";
import { sendEmail } from "./email";
import { notifyUser } from "./notify";
import { sendRulePush } from "./notificationRules";
import { authLoginLimiter, authRegisterLimiter } from "./rateLimit";

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

  // Set COOKIE_SECURE=true in .env when serving over HTTPS.
  // Leave unset (or false) for plain HTTP (local / no-TLS deployments).
  const forceSecureCookie = process.env.COOKIE_SECURE === "true";
  const cookieSecure = forceSecureCookie;
  const cookieSameSite: "none" | "lax" = cookieSecure ? "none" : "lax";

  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET || "secret",
    resave: false,
    saveUninitialized: false,
    store: storage.sessionStore,
    cookie: {
      maxAge: 30 * 24 * 60 * 60 * 1000,
      httpOnly: true,
      secure: cookieSecure,
      sameSite: cookieSameSite,
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
          // Password is valid but the account has been closed. Decide whether to
          // offer the self-service reopen flow:
          //   - SUSPENDED status (covers merged accounts and any future
          //     disciplinary suspension) -> no self-reopen.
          //   - everything else (e.g. REJECTED via inactive-member archival) ->
          //     allow self-reopen by signalling ACCOUNT_CLOSED to the client.
          const closedReason = String((user as any).closedReason || "");
          const accountStatus = String((user as any).accountStatus || "");
          if (accountStatus === "SUSPENDED" || closedReason === "MERGED") {
            console.log(`[AUTH] LOGIN BLOCKED: email=${username} reason=account_suspended_or_merged`);
            return done(null, false, {
              message: closedReason === "MERGED"
                ? "This account has been merged into another account. Please sign in using your other email or contact your club administrator."
                : "This account has been suspended. Please contact your club administrator.",
              code: closedReason === "MERGED" ? "ACCOUNT_MERGED" : "ACCOUNT_SUSPENDED",
            } as any);
          }
          console.log(`[AUTH] LOGIN BLOCKED: email=${username} reason=account_closed (reopen offered)`);
          return done(null, false, { message: "This account has been closed.", code: "ACCOUNT_CLOSED" } as any);
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

  app.post("/api/auth/register", authRegisterLimiter, async (req, res, next) => {
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

      // Welcome push to the newly registered user
      sendRulePush(
        "accountCreated",
        [user.id],
        { fullName: user.fullName || "there", clubName: "Club Master" },
        { url: "/profile" },
      ).catch(e => console.error("[push accountCreated]", e));

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

      const baseUrl = process.env.REPLIT_DEPLOYMENT_URL
        ? `https://${process.env.REPLIT_DEPLOYMENT_URL}`
        : process.env.REPLIT_DEV_DOMAIN
          ? `https://${process.env.REPLIT_DEV_DOMAIN}`
          : "https://badmintonhub.org";
      const resetLink = `${baseUrl}/reset-password/${token}`;

      try {
        await sendEmail(user.email, "Password Reset - Club Master", `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #333;">Password Reset Request</h2>
            <p>Hi ${user.fullName},</p>
            <p>We received a request to reset your password. Click the button below to set a new password:</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${resetLink}" style="background-color: #2563eb; color: white; padding: 12px 32px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
                Reset Password
              </a>
            </div>
            <p style="color: #666; font-size: 14px;">Or copy and paste this link into your browser:</p>
            <p style="color: #666; font-size: 14px; word-break: break-all;">${resetLink}</p>
            <p style="color: #999; font-size: 12px; margin-top: 30px;">This link expires in 24 hours. If you didn't request this, you can safely ignore this email.</p>
          </div>
        `);
        console.log(`[AUTH] Password reset email sent to ${user.email}`);
      } catch (emailErr) {
        console.error("[AUTH] Failed to send password reset email:", emailErr);
      }

      try {
        const owners = await storage.getUsersByRole("OWNER");
        for (const owner of owners) {
          await storage.createNotification({
            userId: (owner as any).id,
            type: "PASSWORD_RESET_REQUEST",
            title: "Password Reset Request",
            message: `${user.fullName} (${user.email}) has requested a password reset.`,
            linkUrl: "/admin/password-resets",
          });
        }
      } catch (notifErr) {
        console.error("[AUTH] Failed to send password reset notifications:", notifErr);
      }

      res.status(200).json({ message: "If an account with that email exists, a password reset link has been sent to your email." });
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

  app.post("/api/auth/login", authLoginLimiter, (req, res, next) => {
    passport.authenticate("local", (err: any, user: User | false, info: { message?: string; code?: string }) => {
      if (err) return next(err);
      if (!user) {
        const payload: { message: string; code?: string } = { message: info?.message || "Invalid credentials" };
        if (info?.code) payload.code = info.code;
        return res.status(401).json(payload);
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

  // Self-service reopen for accounts that were closed (but not merged).
  // Requires the same email + password the account was last using; logs the
  // user in on success and notifies club owners so admins know it happened.
  app.post("/api/auth/reopen-account", authLoginLimiter, async (req, res, next) => {
    try {
      const { email, password } = req.body || {};
      if (!email || !password || typeof email !== "string" || typeof password !== "string") {
        return res.status(400).json({ message: "Email and password are required" });
      }

      const user = await storage.getUserByUsername(email);
      if (!user || !(await comparePasswords(password, user.password))) {
        console.log(`[AUTH] REOPEN FAILED: email=${email} reason=invalid_credentials`);
        return res.status(401).json({ message: "Invalid email or password" });
      }
      if (!(user as any).closedAt) {
        return res.status(400).json({ message: "This account is already active. Please sign in normally." });
      }
      const closedReason = String((user as any).closedReason || "");
      const accountStatus = String((user as any).accountStatus || "");
      // SUSPENDED accounts (incl. merged) must never be self-reopenable. Only
      // accounts that were closed via inactive-member archival (REJECTED) or
      // similar non-disciplinary closures may be reopened by their owner.
      if (accountStatus === "SUSPENDED" || closedReason === "MERGED") {
        console.log(`[AUTH] REOPEN BLOCKED: userId=${user.id} email=${email} reason=suspended_or_merged`);
        return res.status(403).json({
          message: closedReason === "MERGED"
            ? "This account has been merged into another account and cannot be reopened. Please sign in using your other email or contact your club administrator."
            : "This account has been suspended and cannot be reopened. Please contact your club administrator.",
        });
      }

      // Preserve previous closure metadata for audit before clearing it.
      const previousClosedAt = (user as any).closedAt as Date | null;
      const previousClosedReason = (user as any).closedReason as string | null;
      const previousAccountStatus = accountStatus;

      await db.update(users).set({
        closedAt: null,
        closedReason: null,
        accountStatus: "APPROVED",
        lastActivityAt: new Date(),
      } as any).where(eq(users.id, user.id));

      const refreshed = await storage.getUser(user.id);
      if (!refreshed) {
        return res.status(500).json({ message: "Failed to reopen account" });
      }

      console.log(`[AUTH] ACCOUNT REOPENED: userId=${refreshed.id} email=${email} previousReason=${previousClosedReason || "(none)"} previousStatus=${previousAccountStatus}`);

      // Best-effort: notify OWNER users (in-app + email) that the user reopened
      // their account so admins can spot unintended reactivations quickly.
      try {
        const owners = await storage.getUsersByRole("OWNER");
        for (const owner of owners) {
          try {
            await notifyUser({
              userId: (owner as any).id,
              type: "ACCOUNT_REOPENED",
              title: "Account reopened",
              message: `${refreshed.fullName} (${refreshed.email}) has reopened their account.\n\nPrevious status: ${previousAccountStatus || "(unknown)"}\nPrevious reason: ${previousClosedReason || "(none)"}\nClosed at: ${previousClosedAt ? new Date(previousClosedAt).toISOString() : "(unknown)"}`,
              linkUrl: "/admin/inactive-members",
              email: true,
            });
          } catch (innerErr) {
            console.error("[AUTH] notifyUser failed for owner", (owner as any).id, innerErr);
          }
        }
      } catch (notifErr) {
        console.error("[AUTH] Failed to send reopen notifications:", notifErr);
      }

      // Regenerate session before logging in to mitigate session-fixation.
      req.session.regenerate((regenErr) => {
        if (regenErr) return next(regenErr);
        req.login(refreshed, async (loginErr) => {
          if (loginErr) return next(loginErr);
          try { await storage.updateUserActivity(refreshed.id); } catch (e) { console.error("[AUTH] Failed to update activity:", e); }
          if (refreshed.role === "OWNER") {
            try { await ensureOwnerProfilesInAllClubs(refreshed.id); } catch (e) { console.error("[SYNC] Error syncing owner profiles on reopen:", e); }
          }
          res.status(200).json(refreshed);
        });
      });
    } catch (err) {
      next(err);
    }
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
    const children = await storage.getJuniorAccounts(req.user!.id);
    const activeMemberships = await db.select({ id: clubMemberships.id })
      .from(clubMemberships)
      .where(and(
        eq(clubMemberships.userId, req.user!.id),
        eq(clubMemberships.status, "ACTIVE"),
        gte(clubMemberships.endDate, new Date())
      ))
      .limit(1);
    const hasActiveAnnualMembership = activeMemberships.length > 0;
    res.json({ ...req.user, playerProfile: profile, playerProfiles: profiles, hasChildren: children.length > 0, hasActiveAnnualMembership });
  });
}
