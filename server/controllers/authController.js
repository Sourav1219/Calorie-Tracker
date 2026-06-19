const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { OAuth2Client } = require("google-auth-library");
const User = require("../models/User");
const { calculateMacroTargets } = require("../utils/macroTargets");

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const AUTH_COOKIE = "token";
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Cookie options tuned per environment.
 * - Prod: SameSite=None + Secure so it works over HTTPS.
 * - Dev:  SameSite=Lax + non-secure for http://localhost (same-site).
 * rememberMe → persistent (7d) cookie; otherwise a session cookie.
 *
 * Set COOKIE_DOMAIN=.pureintake.app when the API runs on a subdomain (e.g.
 * api.pureintake.app) and the app on www.pureintake.app: scoping the cookie
 * to the shared parent domain makes it first-party/same-site, so Safari (which
 * blocks third-party cookies by default) accepts it. Left unset, the cookie is
 * host-only — correct for same-origin or single-host deployments.
 */
function authCookieOptions(rememberMe = true) {
  const isProd = process.env.NODE_ENV === "production";
  const options = {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? "none" : "lax",
    path: "/",
  };
  if (process.env.COOKIE_DOMAIN) options.domain = process.env.COOKIE_DOMAIN;
  if (rememberMe) options.maxAge = SEVEN_DAYS_MS;
  return options;
}

function setAuthCookie(res, token, rememberMe = true) {
  res.cookie(AUTH_COOKIE, token, authCookieOptions(rememberMe));
}

function clearAuthCookie(res) {
  // Must match the path/sameSite/secure used when setting it.
  const { maxAge, ...clearOpts } = authCookieOptions(true);
  res.clearCookie(AUTH_COOKIE, clearOpts);
}

function parseAdminEmails(raw) {
  if (!raw || !raw.trim()) {
    return new Set();
  }

  return new Set(
    raw
      .split(",")
      .map((value) => value.trim().toLowerCase())
      .filter(Boolean)
  );
}

function shouldBootstrapAdmin(email) {
  const adminEmails = parseAdminEmails(process.env.ADMIN_EMAILS);
  if (!adminEmails.size) {
    return false;
  }

  return adminEmails.has("*") || adminEmails.has(email.toLowerCase());
}

async function syncAdminRole(user) {
  if (!user) {
    return user;
  }

  if (!user.isAdmin && shouldBootstrapAdmin(user.email)) {
    user.isAdmin = true;
    await user.save();
  }

  return user;
}

// ─── Activity-level multipliers (Harris-Benedict) ─────────
const ACTIVITY_MULTIPLIERS = {
  sedentary: 1.2,
  lightly_active: 1.375,
  moderately_active: 1.55,
  very_active: 1.725,
  extra_active: 1.9,
};

// ─── Shared input validation ──────────────────────────────
// Physiologically sane bounds, kept in sync with the client (Register/Profile).
const BODY_LIMITS = {
  age: { min: 13, max: 120 },
  weight: { min: 25, max: 350 }, // kg
  height: { min: 100, max: 250 }, // cm
};
const ALLOWED_GENDERS = new Set(["male", "female", "other"]);
const ALLOWED_GOALS = new Set(["lose_weight", "maintain", "gain_weight"]);
// Daily water goal accepts any custom amount within a sane safety range (ml).
const WATER_GOAL_LIMITS = { min: 500, max: 20000 };
// Strict email shape — local part is letters/digits/dots only ("@" is the
// only symbol there); the domain also allows "-" (e.g. my-host.com).
const EMAIL_REGEX = /^[a-zA-Z0-9.]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
// Password must contain a lowercase, an uppercase, a number, and a symbol.
const PASSWORD_COMPLEXITY = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).+$/;

function toPublicUser(user) {
  const dailyCalorieGoal = user.dailyCalorieGoal;
  const macroTargets = calculateMacroTargets(dailyCalorieGoal, user.goal, {
    weight: user.weight,
    height: user.height,
    age: user.age,
  });

  return {
    id: user._id,
    name: user.name,
    email: user.email,
    isAdmin: Boolean(user.isAdmin),
    age: user.age,
    weight: user.weight,
    height: user.height,
    gender: user.gender,
    goal: user.goal,
    activityLevel: user.activityLevel,
    dailyCalorieGoal: user.dailyCalorieGoal,
    dailyWaterGoalMl: user.dailyWaterGoalMl,
    photoUrl: user.photoUrl,
    macroTargets,
  };
}

/**
 * Calculate BMR using the Harris-Benedict formula.
 * Male:   88.362  + (13.397 × weight) + (4.799 × height) − (5.677 × age)
 * Female: 447.593 + (9.247  × weight) + (3.098 × height) − (4.330 × age)
 * Other:  Average of male and female formulas
 */
function calculateBMR(weight, height, age, gender) {
  const maleBMR = 88.362 + 13.397 * weight + 4.799 * height - 5.677 * age;
  const femaleBMR = 447.593 + 9.247 * weight + 3.098 * height - 4.33 * age;

  if (gender === "male") return maleBMR;
  if (gender === "female") return femaleBMR;
  // "other" — average of both
  return (maleBMR + femaleBMR) / 2;
}

/**
 * POST /api/auth/register
 *
 * Accepts user profile data, calculates a personalised daily
 * calorie goal (BMR → TDEE → goal adjustment), hashes the
 * password, persists the user, and returns a signed JWT.
 */
async function register(req, res) {
  try {
    const {
      name,
      email,
      password,
      age,
      weight,
      height,
      gender,
      goal,
      activityLevel,
    } = req.body;

    const normalizedEmail = email?.trim().toLowerCase();
    const parsedAge = Number(age);
    const parsedWeight = Number(weight);
    const parsedHeight = Number(height);

    // ── 1. Validate required fields ──────────────────────────
    if (
      !name ||
      !normalizedEmail ||
      !password ||
      !parsedAge ||
      !parsedWeight ||
      !parsedHeight ||
      !gender ||
      !goal ||
      !activityLevel
    ) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // ── 1a. Password strength + type safety ──────────────────
    if (typeof password !== "string" || password.length < 8) {
      return res
        .status(400)
        .json({ error: "Password must be at least 8 characters" });
    }
    if (!PASSWORD_COMPLEXITY.test(password)) {
      return res.status(400).json({
        error: "Password must include uppercase, lowercase, a number, and a symbol",
      });
    }

    // ── 1b. Email format ─────────────────────────────────────
    if (!EMAIL_REGEX.test(normalizedEmail)) {
      return res.status(400).json({ error: "Please enter a valid email address" });
    }

    // ── 1c. Physiologically sane body stats ──────────────────
    if (!Number.isFinite(parsedAge) || parsedAge < BODY_LIMITS.age.min || parsedAge > BODY_LIMITS.age.max) {
      return res.status(400).json({ error: `age must be between ${BODY_LIMITS.age.min} and ${BODY_LIMITS.age.max}` });
    }
    if (!Number.isFinite(parsedWeight) || parsedWeight < BODY_LIMITS.weight.min || parsedWeight > BODY_LIMITS.weight.max) {
      return res.status(400).json({ error: `weight must be between ${BODY_LIMITS.weight.min} and ${BODY_LIMITS.weight.max} kg` });
    }
    if (!Number.isFinite(parsedHeight) || parsedHeight < BODY_LIMITS.height.min || parsedHeight > BODY_LIMITS.height.max) {
      return res.status(400).json({ error: `height must be between ${BODY_LIMITS.height.min} and ${BODY_LIMITS.height.max} cm` });
    }

    // ── 1d. Enum fields ──────────────────────────────────────
    if (!ALLOWED_GENDERS.has(gender)) {
      return res.status(400).json({ error: "Invalid gender value" });
    }
    if (!ALLOWED_GOALS.has(goal)) {
      return res.status(400).json({ error: "Invalid goal value" });
    }
    if (!ACTIVITY_MULTIPLIERS[activityLevel]) {
      return res.status(400).json({ error: "Invalid activityLevel value" });
    }

    // ── 2. Check for duplicate email ─────────────────────────
    const existingUser = await User.findOne({ email: normalizedEmail }).lean();
    if (existingUser) {
      return res.status(409).json({ error: "Email already registered" });
    }

    // ── 3. Calculate BMR ─────────────────────────────────────
    const bmr = calculateBMR(parsedWeight, parsedHeight, parsedAge, gender);

    // ── 4. TDEE = BMR × activity multiplier ──────────────────
    const multiplier = ACTIVITY_MULTIPLIERS[activityLevel] || 1.2;
    let tdee = bmr * multiplier;

    // ── 5. Adjust for goal ───────────────────────────────────
    if (goal === "lose_weight") {
      tdee -= 500;
      if (tdee < 1200) tdee = 1200; // safety floor
    } else if (goal === "gain_weight") {
      tdee += 300;
    }
    // "maintain" → no change

    const dailyCalorieGoal = Math.round(tdee);
    const macroTargets = calculateMacroTargets(dailyCalorieGoal, goal, {
      weight: parsedWeight,
      height: parsedHeight,
      age: parsedAge,
    });

    // ── 6. Hash password ─────────────────────────────────────
    const hashedPassword = await bcrypt.hash(password, 10);

    // ── 7. Create user in DB ─────────────────────────────────
    const user = await User.create({
      name,
      email: normalizedEmail,
      password: hashedPassword,
      age: parsedAge,
      weight: parsedWeight,
      height: parsedHeight,
      gender,
      goal,
      activityLevel,
      dailyCalorieGoal,
      isAdmin: shouldBootstrapAdmin(normalizedEmail),
    });

    // ── 8. Sign JWT ──────────────────────────────────────────
    const token = jwt.sign(
      { userId: user._id, email: user.email, isAdmin: Boolean(user.isAdmin) },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    // ── 9. Set httpOnly auth cookie + respond ────────────────
    setAuthCookie(res, token, true);
    return res.status(201).json({
      message: "Registration successful",
      token,
      user: { ...toPublicUser(user), macroTargets },
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ error: "Email already registered" });
    }

    console.error("Register error:", error);
    return res
      .status(500)
      .json({ error: "Something went wrong. Please try again." });
  }
}

/**
 * POST /api/auth/login
 *
 * Authenticates a user by email and password, returning a signed JWT.
 */
async function login(req, res) {
  const { email, password, rememberMe = true } = req.body;

  try {
    // 0. Enforce string inputs — blocks NoSQL operator injection ({$gt:""} etc.)
    if (typeof email !== "string" || typeof password !== "string") {
      return res.status(400).json({ message: "Invalid email or password" });
    }

    // 1. Find user — generic error avoids leaking which emails are registered.
    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      return res.status(400).json({ message: "Invalid email or password" });
    }

    // 2. Google-only accounts have no password — guide them to Google sign-in.
    if (!user.password) {
      return res.status(400).json({ message: "Invalid email or password" });
    }

    // 3. Sync admin role if needed
    await syncAdminRole(user);

    // 4. Check password — same generic message as "user not found".
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid email or password" });
    }

    // ✅ CREATE TOKEN (including userId for compatibility with your other routes)
    const token = jwt.sign(
      { 
        userId: user._id, 
        id: user._id, 
        email: user.email, 
        isAdmin: Boolean(user.isAdmin) 
      },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    // Set httpOnly auth cookie (primary), still return token + user for the client.
    setAuthCookie(res, token, Boolean(rememberMe));
    res.json({
      token,
      user: toPublicUser(user),
    });

  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ message: "Server error" });
  }
}

/**
 * POST /api/auth/logout
 *
 * Clears the httpOnly auth cookie. Stateless JWTs can't be revoked
 * server-side, so clearing the cookie is the logout action.
 */
async function logout(req, res) {
  clearAuthCookie(res);
  return res.status(200).json({ message: "Logged out" });
}

/**
 * POST /api/auth/google
 *
 * Verifies a Google Identity Services ID token, then finds-or-creates the
 * matching user and issues our own httpOnly session cookie. New Google users
 * start with default goals and can complete their body stats in Profile.
 */
async function googleAuth(req, res) {
  try {
    if (!process.env.GOOGLE_CLIENT_ID) {
      return res.status(503).json({ error: "Google sign-in is not configured" });
    }

    const { credential, mode } = req.body;
    if (typeof credential !== "string" || !credential) {
      return res.status(400).json({ error: "Missing Google credential" });
    }

    // "signin" only authenticates an existing account; "signup" creates a new
    // one. Default to "signin" so a missing/unknown mode can never silently
    // create an account. The client always sends the intent of the page.
    const intent = mode === "signup" ? "signup" : "signin";

    // Verify the token's signature, audience, and expiry against Google.
    let payload;
    try {
      const ticket = await googleClient.verifyIdToken({
        idToken: credential,
        audience: process.env.GOOGLE_CLIENT_ID,
      });
      payload = ticket.getPayload();
    } catch {
      return res.status(401).json({ error: "Invalid Google credential" });
    }

    if (!payload?.email || !payload.email_verified) {
      return res.status(401).json({ error: "Google account email not verified" });
    }

    const email = payload.email.toLowerCase().trim();
    const googleId = payload.sub;

    let user = await User.findOne({ email });

    if (intent === "signin") {
      // Sign-in must never create an account — reject unknown Google accounts
      // so the user is sent to sign up instead of being silently registered.
      if (!user) {
        return res.status(404).json({
          error: "No account found for this Google account. Please sign up first.",
        });
      }
      // Existing account → link the Google identity / backfill the photo.
      let dirty = false;
      if (!user.googleId) { user.googleId = googleId; dirty = true; }
      if (!user.photoUrl && payload.picture) { user.photoUrl = payload.picture; dirty = true; }
      if (dirty) await user.save();
    } else {
      // Sign-up must not clobber an existing account — tell them to sign in.
      if (user) {
        return res.status(409).json({
          error: "An account with this email already exists. Please sign in instead.",
        });
      }
      user = await User.create({
        name: payload.name || email.split("@")[0],
        email,
        googleId,
        photoUrl: payload.picture || null,
        isAdmin: shouldBootstrapAdmin(email),
      });
    }

    await syncAdminRole(user);

    const token = jwt.sign(
      { userId: user._id, id: user._id, email: user.email, isAdmin: Boolean(user.isAdmin) },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    setAuthCookie(res, token, true);
    return res.status(200).json({ token, user: toPublicUser(user) });
  } catch (error) {
    console.error("Google auth error:", error);
    return res.status(500).json({ error: "Something went wrong. Please try again." });
  }
}

/**
 * GET /api/auth/me
 *
 * Retrieves the currently authenticated user's profile based on the JWT payload.
 * Auth middleware attaches req.user.userId.
 */
async function getMe(req, res) {
  try {
    const userId = req.user.userId;

    let user = await User.findById(userId);

    user = await syncAdminRole(user);

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    return res.status(200).json({ user: toPublicUser(user) });
  } catch (error) {
    console.error("Get me error:", error);
    return res
      .status(500)
      .json({ error: "Something went wrong. Please try again." });
  }
}

/**
 * PATCH /api/auth/me
 *
 * Updates editable profile fields and recalculates daily calorie goal
 * from the latest body/activity/goal inputs.
 */
async function updateProfile(req, res) {
  try {
    const userId = req.user.userId;
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const {
      name,
      email,
      age,
      weight,
      height,
      gender,
      goal,
      activityLevel,
      dailyWaterGoalMl,
      photoUrl,
    } = req.body;

    if (photoUrl !== undefined) {
      user.photoUrl = photoUrl;
    }

    if (typeof name === "string") {
      const trimmedName = name.trim();
      if (!trimmedName) {
        return res.status(400).json({ error: "name cannot be empty" });
      }
      user.name = trimmedName;
    }

    if (typeof email === "string") {
      const normalizedEmail = email.trim().toLowerCase();
      if (!normalizedEmail) {
        return res.status(400).json({ error: "email cannot be empty" });
      }
      if (!EMAIL_REGEX.test(normalizedEmail)) {
        return res.status(400).json({ error: "Please enter a valid email address" });
      }

      if (normalizedEmail !== user.email) {
        const emailInUse = await User.findOne({ email: normalizedEmail, _id: { $ne: user._id } }).lean();
        if (emailInUse) {
          return res.status(409).json({ error: "Email already registered" });
        }
        user.email = normalizedEmail;
      }
    }

    if (age !== undefined) {
      const parsedAge = Number(age);
      if (!Number.isFinite(parsedAge) || parsedAge < BODY_LIMITS.age.min || parsedAge > BODY_LIMITS.age.max) {
        return res.status(400).json({ error: `age must be between ${BODY_LIMITS.age.min} and ${BODY_LIMITS.age.max}` });
      }
      user.age = parsedAge;
    }

    if (weight !== undefined) {
      const parsedWeight = Number(weight);
      if (!Number.isFinite(parsedWeight) || parsedWeight < BODY_LIMITS.weight.min || parsedWeight > BODY_LIMITS.weight.max) {
        return res.status(400).json({ error: `weight must be between ${BODY_LIMITS.weight.min} and ${BODY_LIMITS.weight.max} kg` });
      }
      user.weight = parsedWeight;
    }

    if (height !== undefined) {
      const parsedHeight = Number(height);
      if (!Number.isFinite(parsedHeight) || parsedHeight < BODY_LIMITS.height.min || parsedHeight > BODY_LIMITS.height.max) {
        return res.status(400).json({ error: `height must be between ${BODY_LIMITS.height.min} and ${BODY_LIMITS.height.max} cm` });
      }
      user.height = parsedHeight;
    }

    if (gender !== undefined) {
      if (!ALLOWED_GENDERS.has(gender)) {
        return res.status(400).json({ error: "Invalid gender value" });
      }
      user.gender = gender;
    }

    if (goal !== undefined) {
      if (!ALLOWED_GOALS.has(goal)) {
        return res.status(400).json({ error: "Invalid goal value" });
      }
      user.goal = goal;
    }

    if (activityLevel !== undefined) {
      const allowedActivityLevels = new Set(Object.keys(ACTIVITY_MULTIPLIERS));
      if (!allowedActivityLevels.has(activityLevel)) {
        return res.status(400).json({ error: "Invalid activityLevel value" });
      }
      user.activityLevel = activityLevel;
    }

    if (dailyWaterGoalMl !== undefined) {
      const parsedWaterGoal = Number(dailyWaterGoalMl);
      if (!Number.isFinite(parsedWaterGoal) || parsedWaterGoal < WATER_GOAL_LIMITS.min || parsedWaterGoal > WATER_GOAL_LIMITS.max) {
        return res.status(400).json({ error: `dailyWaterGoalMl must be between ${WATER_GOAL_LIMITS.min} and ${WATER_GOAL_LIMITS.max}` });
      }
      user.dailyWaterGoalMl = Math.round(parsedWaterGoal);
    }

    if (user.age && user.weight && user.height && user.gender && user.goal && user.activityLevel) {
      const bmr = calculateBMR(user.weight, user.height, user.age, user.gender);
      const multiplier = ACTIVITY_MULTIPLIERS[user.activityLevel] || 1.2;
      let tdee = bmr * multiplier;

      if (user.goal === "lose_weight") {
        tdee -= 500;
        if (tdee < 1200) tdee = 1200;
      } else if (user.goal === "gain_weight") {
        tdee += 300;
      }

      user.dailyCalorieGoal = Math.round(tdee);
    }

    await user.save();

    return res.status(200).json({
      message: "Profile updated successfully",
      user: toPublicUser(user),
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ error: "Email already registered" });
    }

    console.error("Update profile error:", error);
    return res
      .status(500)
      .json({ error: "Something went wrong. Please try again." });
  }
}

module.exports = { register, login, logout, googleAuth, getMe, updateProfile };
