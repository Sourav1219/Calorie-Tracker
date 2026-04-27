const dotenv = require("dotenv");
const { Client } = require("pg");
const mongoose = require("mongoose");

const User = require("../models/User");
const FoodItem = require("../models/FoodItem");
const DailyLog = require("../models/DailyLog");
const MealEntry = require("../models/MealEntry");
const WaterEntry = require("../models/WaterEntry");

dotenv.config();

function parseDate(value) {
  return value ? new Date(value) : undefined;
}

async function readAllRows(pgClient, tableName) {
  const result = await pgClient.query(`SELECT * FROM "${tableName}"`);
  return result.rows;
}

async function migrateCollection({
  label,
  model,
  rows,
  mapper,
}) {
  await model.deleteMany({});

  if (!rows.length) {
    console.log(`Migrated: ${label} (0 records)`);
    return;
  }

  const docs = rows.map(mapper);
  await model.insertMany(docs, { ordered: false });
  console.log(`Migrated: ${label} (${docs.length} records)`);
}

async function main() {
  const mongoUri = process.env.MONGODB_URI || process.env.DATABASE_URL;
  const postgresUrl = process.env.POSTGRES_URL;

  if (!mongoUri) {
    throw new Error("Missing MONGODB_URI (or DATABASE_URL)");
  }

  if (!postgresUrl) {
    throw new Error("Missing POSTGRES_URL");
  }

  const pgClient = new Client({ connectionString: postgresUrl });

  console.log("Starting PostgreSQL -> MongoDB migration...\n");

  await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 5000 });
  await pgClient.connect();

  const users = await readAllRows(pgClient, "User");
  const foodItems = await readAllRows(pgClient, "FoodItem");
  const dailyLogs = await readAllRows(pgClient, "DailyLog");
  const mealEntries = await readAllRows(pgClient, "MealEntry");
  const waterEntries = await readAllRows(pgClient, "WaterEntry");

  await migrateCollection({
    label: "users",
    model: User,
    rows: users,
    mapper: (row) => ({
      _id: row.id,
      name: row.name,
      email: row.email,
      password: row.password,
      age: row.age,
      weight: row.weight,
      height: row.height,
      gender: row.gender,
      goal: row.goal,
      activityLevel: row.activityLevel,
      dailyCalorieGoal: row.dailyCalorieGoal,
      dailyWaterGoalMl: row.dailyWaterGoalMl,
      createdAt: parseDate(row.createdAt),
    }),
  });

  await migrateCollection({
    label: "food items",
    model: FoodItem,
    rows: foodItems,
    mapper: (row) => ({
      _id: row.id,
      name: row.name,
      brand: row.brand,
      category: row.category,
      servingSize: row.servingSize,
      servingUnit: row.servingUnit,
      caloriesPer: row.caloriesPer,
      proteinG: row.proteinG,
      carbsG: row.carbsG,
      fatG: row.fatG,
      fibreG: row.fibreG,
      sugarG: row.sugarG,
      sodiumMg: row.sodiumMg,
      isVerified: row.isVerified,
      createdBy: row.createdBy,
      createdAt: parseDate(row.createdAt),
    }),
  });

  await migrateCollection({
    label: "daily logs",
    model: DailyLog,
    rows: dailyLogs,
    mapper: (row) => ({
      _id: row.id,
      userId: row.userId,
      date: row.date,
      totalCalories: row.totalCalories,
      totalProteinG: row.totalProteinG,
      totalCarbsG: row.totalCarbsG,
      totalFatG: row.totalFatG,
      totalWaterMl: row.totalWaterMl,
    }),
  });

  await migrateCollection({
    label: "meal entries",
    model: MealEntry,
    rows: mealEntries,
    mapper: (row) => ({
      _id: row.id,
      dailyLogId: row.dailyLogId,
      mealType: row.mealType,
      foodItemId: row.foodItemId,
      quantity: row.quantity,
      unit: row.unit,
      calories: row.calories,
      proteinG: row.proteinG,
      carbsG: row.carbsG,
      fatG: row.fatG,
      loggedAt: parseDate(row.loggedAt),
    }),
  });

  await migrateCollection({
    label: "water entries",
    model: WaterEntry,
    rows: waterEntries,
    mapper: (row) => ({
      _id: row.id,
      dailyLogId: row.dailyLogId,
      amountMl: row.amountMl,
      loggedAt: parseDate(row.loggedAt),
    }),
  });

  console.log("\nMigration completed successfully.");

  await pgClient.end();
  await mongoose.disconnect();
}

main().catch(async (error) => {
  console.error("Migration failed:", error);

  try {
    await mongoose.disconnect();
  } catch {
    // Ignore disconnect errors on failure path.
  }

  process.exit(1);
});
