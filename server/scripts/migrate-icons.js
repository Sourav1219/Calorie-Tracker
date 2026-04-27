/**
 * One-time migration: update existing meal section icons to modern emojis.
 * Run with: node scripts/migrate-icons.js
 */

const mongoose = require("mongoose");
require("dotenv").config();

const ICON_MAP = {
  Breakfast: "☕",
  Lunch: "🥘",
  Snacks: "🍪",
  Dinner: "🍽️",
};

async function migrate() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error("MONGODB_URI not set in .env");
    process.exit(1);
  }

  await mongoose.connect(uri);
  console.log("Connected to MongoDB");

  const MealSection = mongoose.model(
    "MealSection",
    new mongoose.Schema({ name: String, icon: String }, { strict: false }),
    "mealsections"
  );

  for (const [name, icon] of Object.entries(ICON_MAP)) {
    const result = await MealSection.updateMany(
      { name },
      { $set: { icon } }
    );
    console.log(`Updated ${result.modifiedCount} "${name}" sections → ${icon}`);
  }

  console.log("\n✅ Migration complete!");
  await mongoose.disconnect();
}

migrate().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
