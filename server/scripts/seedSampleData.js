require("dotenv").config();
const bcrypt = require("bcryptjs");
const mongoose = require("mongoose");

const User = require("../models/User");
const FoodItem = require("../models/FoodItem");
const DailyLog = require("../models/DailyLog");
const MealEntry = require("../models/MealEntry");
const WaterEntry = require("../models/WaterEntry");
const { formatDateKey } = require("../utils/dailyLog");

const SAMPLE_USERS = [
  {
    name: "Demo User",
    email: "demo@pureintake.com",
    password: "Demo12345",
    age: 28,
    weight: 68,
    height: 172,
    gender: "male",
    goal: "maintain",
    activityLevel: "lightly_active",
    dailyCalorieGoal: 2200,
    dailyWaterGoalMl: 2800,
    isAdmin: false,
  },
  {
    name: "Admin Demo",
    email: "admin-demo@pureintake.com",
    password: "Demo12345",
    age: 31,
    weight: 60,
    height: 165,
    gender: "female",
    goal: "maintain",
    activityLevel: "moderately_active",
    dailyCalorieGoal: 2050,
    dailyWaterGoalMl: 2600,
    isAdmin: true,
  },
];

const SAMPLE_PLANS = {
  "demo@pureintake.com": [
    {
      offsetDays: 0,
      meals: [
        ["breakfast", "Idli (plain)", 200],
        ["lunch", "Dal tadka (yellow)", 250],
        ["lunch", "Steamed white rice", 220],
        ["snacks", "Banana (ripe)", 120],
        ["dinner", "Palak paneer", 180],
        ["dinner", "Roti (wheat chapati)", 120],
      ],
      waterEntries: [300, 250, 500, 400],
    },
    {
      offsetDays: 1,
      meals: [
        ["breakfast", "Poha (flattened rice)", 180],
        ["lunch", "Chole (chickpeas)", 240],
        ["lunch", "Jeera rice", 200],
        ["snacks", "Apple (with skin)", 150],
        ["dinner", "Egg curry", 220],
        ["dinner", "Whole wheat paratha", 140],
      ],
      waterEntries: [250, 250, 300, 350],
    },
    {
      offsetDays: 2,
      meals: [
        ["breakfast", "Dosa (plain)", 180],
        ["breakfast", "Sambar", 150],
        ["lunch", "Rajma (kidney beans)", 250],
        ["lunch", "Brown rice (cooked)", 220],
        ["snacks", "Guava", 160],
        ["dinner", "Mixed veg curry", 200],
        ["dinner", "Roti (wheat chapati)", 120],
      ],
      waterEntries: [300, 300, 400, 300],
    },
    {
      offsetDays: 3,
      meals: [
        ["breakfast", "Besan chilla", 180],
        ["lunch", "Chicken curry (home style)", 220],
        ["lunch", "Steamed white rice", 200],
        ["snacks", "Coconut water", 200],
        ["dinner", "Bhindi masala", 180],
        ["dinner", "Naan (plain)", 130],
      ],
      waterEntries: [250, 400, 350, 450],
    },
    {
      offsetDays: 4,
      meals: [
        ["breakfast", "Upma (semolina)", 200],
        ["lunch", "Dal makhani", 220],
        ["lunch", "Jeera rice", 180],
        ["snacks", "Orange", 140],
        ["dinner", "Aloo gobi", 200],
        ["dinner", "Roti (wheat chapati)", 120],
      ],
      waterEntries: [250, 250, 350, 350],
    },
    {
      offsetDays: 5,
      meals: [
        ["breakfast", "Appam", 200],
        ["lunch", "Fish curry (mustard)", 220],
        ["lunch", "Curd rice", 220],
        ["snacks", "Roasted chana", 60],
        ["dinner", "Matar paneer", 180],
        ["dinner", "Butter naan", 130],
      ],
      waterEntries: [300, 300, 300, 400],
    },
    {
      offsetDays: 6,
      meals: [
        ["breakfast", "Uttapam", 180],
        ["lunch", "Moong dal (yellow)", 240],
        ["lunch", "Brown rice (cooked)", 200],
        ["snacks", "Papaya", 160],
        ["dinner", "Mushroom masala", 180],
        ["dinner", "Missi roti", 130],
      ],
      waterEntries: [250, 350, 350, 300],
    },
  ],
  "admin-demo@pureintake.com": [
    {
      offsetDays: 0,
      meals: [
        ["breakfast", "Egg omelette (plain)", 140],
        ["lunch", "Chicken tikka (grilled)", 220],
        ["lunch", "Jeera rice", 180],
        ["snacks", "Black coffee (no sugar)", 200],
        ["dinner", "Paneer roll", 180],
      ],
      waterEntries: [300, 400, 350, 300],
    },
    {
      offsetDays: 1,
      meals: [
        ["breakfast", "Brown bread slice", 80],
        ["breakfast", "Paneer (fresh)", 90],
        ["lunch", "Pulao (veg)", 220],
        ["lunch", "Palak paneer", 180],
        ["snacks", "Apple (with skin)", 150],
        ["dinner", "Egg bhurji (scrambled)", 180],
      ],
      waterEntries: [250, 250, 500, 350],
    },
    {
      offsetDays: 2,
      meals: [
        ["breakfast", "Dhokla", 160],
        ["lunch", "Butter chicken", 220],
        ["lunch", "Steamed white rice", 180],
        ["snacks", "Coconut water", 200],
        ["dinner", "Tofu", 160],
        ["dinner", "Mixed veg curry", 180],
      ],
      waterEntries: [300, 300, 300, 400],
    },
  ],
};

function dateFromOffset(offsetDays) {
  const date = new Date();
  date.setHours(12, 0, 0, 0);
  date.setDate(date.getDate() - offsetDays);
  return date;
}

function buildMealNutrition(food, quantity) {
  const multiplier = quantity / food.servingSize;
  return {
    calories: Number((food.caloriesPer * multiplier).toFixed(2)),
    proteinG: Number((food.proteinG * multiplier).toFixed(2)),
    carbsG: Number((food.carbsG * multiplier).toFixed(2)),
    fatG: Number((food.fatG * multiplier).toFixed(2)),
  };
}

async function clearSampleUsers() {
  const emails = SAMPLE_USERS.map((user) => user.email);
  const users = await User.find({ email: { $in: emails } }).select("_id").lean();
  const userIds = users.map((user) => user._id);

  if (!userIds.length) {
    return;
  }

  const dailyLogs = await DailyLog.find({ userId: { $in: userIds } }).select("_id").lean();
  const dailyLogIds = dailyLogs.map((log) => log._id);

  if (dailyLogIds.length) {
    await MealEntry.deleteMany({ dailyLogId: { $in: dailyLogIds } });
    await WaterEntry.deleteMany({ dailyLogId: { $in: dailyLogIds } });
    await DailyLog.deleteMany({ _id: { $in: dailyLogIds } });
  }

  await User.deleteMany({ _id: { $in: userIds } });
}

async function createSampleUser(user) {
  const hashedPassword = await bcrypt.hash(user.password, 10);
  return User.create({
    name: user.name,
    email: user.email,
    password: hashedPassword,
    age: user.age,
    weight: user.weight,
    height: user.height,
    gender: user.gender,
    goal: user.goal,
    activityLevel: user.activityLevel,
    dailyCalorieGoal: user.dailyCalorieGoal,
    dailyWaterGoalMl: user.dailyWaterGoalMl,
    isAdmin: user.isAdmin,
  });
}

async function seedUserActivity(user) {
  const plans = SAMPLE_PLANS[user.email] || [];

  for (const plan of plans) {
    const date = dateFromOffset(plan.offsetDays);
    const dateKey = formatDateKey(date);
    const dailyLog = await DailyLog.create({
      userId: user._id,
      date: dateKey,
      totalCalories: 0,
      totalProteinG: 0,
      totalCarbsG: 0,
      totalFatG: 0,
      totalWaterMl: 0,
    });

    const totals = {
      totalCalories: 0,
      totalProteinG: 0,
      totalCarbsG: 0,
      totalFatG: 0,
      totalWaterMl: 0,
    };

    for (let index = 0; index < plan.meals.length; index += 1) {
      const [mealType, foodName, quantity] = plan.meals[index];
      const food = await FoodItem.findOne({ name: foodName }).lean();
      if (!food) {
        throw new Error(`Missing seeded food item: ${foodName}`);
      }

      const nutrition = buildMealNutrition(food, quantity);
      const loggedAt = new Date(date);
      loggedAt.setHours(8 + index * 2, 15, 0, 0);

      await MealEntry.create({
        dailyLogId: dailyLog._id,
        mealType,
        foodItemId: food._id,
        quantity,
        unit: food.servingUnit,
        calories: nutrition.calories,
        proteinG: nutrition.proteinG,
        carbsG: nutrition.carbsG,
        fatG: nutrition.fatG,
        loggedAt,
      });

      totals.totalCalories += nutrition.calories;
      totals.totalProteinG += nutrition.proteinG;
      totals.totalCarbsG += nutrition.carbsG;
      totals.totalFatG += nutrition.fatG;
    }

    for (let index = 0; index < plan.waterEntries.length; index += 1) {
      const amountMl = plan.waterEntries[index];
      const loggedAt = new Date(date);
      loggedAt.setHours(9 + index * 3, 0, 0, 0);

      await WaterEntry.create({
        dailyLogId: dailyLog._id,
        amountMl,
        loggedAt,
      });

      totals.totalWaterMl += amountMl;
    }

    await DailyLog.updateOne(
      { _id: dailyLog._id },
      {
        $set: {
          totalCalories: Number(totals.totalCalories.toFixed(2)),
          totalProteinG: Number(totals.totalProteinG.toFixed(2)),
          totalCarbsG: Number(totals.totalCarbsG.toFixed(2)),
          totalFatG: Number(totals.totalFatG.toFixed(2)),
          totalWaterMl: totals.totalWaterMl,
        },
      }
    );
  }
}

async function main() {
  console.log("🌱 Seeding sample users and activity data...\n");

  const mongoUri = process.env.MONGODB_URI || process.env.DATABASE_URL;
  if (!mongoUri) {
    throw new Error("Missing MongoDB connection string (MONGODB_URI)");
  }

  await mongoose.connect(mongoUri, {
    serverSelectionTimeoutMS: 5000,
  });

  const foodCount = await FoodItem.countDocuments();
  if (!foodCount) {
    throw new Error("Food catalog is empty. Run npm run seed first.");
  }

  await clearSampleUsers();

  const createdUsers = [];
  for (const sampleUser of SAMPLE_USERS) {
    const user = await createSampleUser(sampleUser);
    createdUsers.push(user);
    await seedUserActivity(user);
  }

  const dailyLogCount = await DailyLog.countDocuments({
    userId: { $in: createdUsers.map((user) => user._id) },
  });
  const mealCount = await MealEntry.countDocuments({
    dailyLogId: {
      $in: (await DailyLog.find({ userId: { $in: createdUsers.map((user) => user._id) } }).select("_id").lean()).map((log) => log._id),
    },
  });
  const waterCount = await WaterEntry.countDocuments({
    dailyLogId: {
      $in: (await DailyLog.find({ userId: { $in: createdUsers.map((user) => user._id) } }).select("_id").lean()).map((log) => log._id),
    },
  });

  console.log(`✅ Sample users created: ${createdUsers.length}`);
  console.log(`📅 Sample daily logs created: ${dailyLogCount}`);
  console.log(`🍽️  Sample meal entries created: ${mealCount}`);
  console.log(`💧 Sample water entries created: ${waterCount}`);
  console.log("\nDemo credentials:");
  console.log("- demo@pureintake.com / Demo12345");
  console.log("- admin-demo@pureintake.com / Demo12345");
}

main()
  .catch((error) => {
    console.error("❌ Sample seed failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await mongoose.disconnect();
  });