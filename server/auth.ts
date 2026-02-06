import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import { User } from "@shared/schema";

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
        return res.status(400).send("Email already exists");
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
        membershipId: null // No membership by default
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

      req.login(user, (err) => {
        if (err) return next(err);
        res.status(201).json(user);
      });
    } catch (err) {
      next(err);
    }
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
