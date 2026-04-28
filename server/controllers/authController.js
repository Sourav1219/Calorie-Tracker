const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const { calculateMacroTargets } = require("../utils/macroTargets");

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

    // ── 9. Respond ───────────────────────────────────────────
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
  const { email, password } = req.body;
  console.log("User login:", email);

  try {
    // 1. Find user
    const user = await User.findOne({ email: email?.toLowerCase().trim() });
    if (!user) {
      return res.status(400).json({ message: "User not found" });
    }

    // 2. Sync admin role if needed
    await syncAdminRole(user);

    // 3. Check password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials" });
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

    // ✅ SEND TOKEN + USER (including full profile for the Dashboard)
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
      if (!Number.isFinite(parsedAge) || parsedAge < 10 || parsedAge > 120) {
        return res.status(400).json({ error: "age must be between 10 and 120" });
      }
      user.age = parsedAge;
    }

    if (weight !== undefined) {
      const parsedWeight = Number(weight);
      if (!Number.isFinite(parsedWeight) || parsedWeight < 25 || parsedWeight > 350) {
        return res.status(400).json({ error: "weight must be between 25 and 350 kg" });
      }
      user.weight = parsedWeight;
    }

    if (height !== undefined) {
      const parsedHeight = Number(height);
      if (!Number.isFinite(parsedHeight) || parsedHeight < 100 || parsedHeight > 250) {
        return res.status(400).json({ error: "height must be between 100 and 250 cm" });
      }
      user.height = parsedHeight;
    }

    if (gender !== undefined) {
      const allowedGenders = new Set(["male", "female", "other"]);
      if (!allowedGenders.has(gender)) {
        return res.status(400).json({ error: "Invalid gender value" });
      }
      user.gender = gender;
    }

    if (goal !== undefined) {
      const allowedGoals = new Set(["lose_weight", "maintain", "gain_weight"]);
      if (!allowedGoals.has(goal)) {
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
      if (!Number.isFinite(parsedWaterGoal) || parsedWaterGoal < 1000 || parsedWaterGoal > 5000) {
        return res.status(400).json({ error: "dailyWaterGoalMl must be between 1000 and 5000" });
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

module.exports = { register, login, getMe, updateProfile };
