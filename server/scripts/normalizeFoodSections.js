const dotenv = require("dotenv");
const mongoose = require("mongoose");
const FoodItem = require("../models/FoodItem");
const MealEntry = require("../models/MealEntry");
const { normalizeText, toSectionCategory } = require("../utils/foodCatalog");

dotenv.config();

function buildDuplicateKey(food) {
  return [normalizeText(food.name), normalizeText(food.brand)]
    .map((value) => value.toLowerCase())
    .join("::");
}

function numericScore(value) {
  return Number.isFinite(Number(value)) && Number(value) > 0 ? 1 : 0;
}

function qualityScore(food) {
  const nutritionScore = [
    food.caloriesPer,
    food.proteinG,
    food.carbsG,
    food.fatG,
    food.fibreG,
    food.sugarG,
    food.sodiumMg,
  ].reduce((sum, value) => sum + numericScore(value), 0);

  const optionsScore = Array.isArray(food.measurementOptions)
    ? Math.min(food.measurementOptions.length, 5)
    : 0;

  return (
    (food.isVerified ? 100 : 0) +
    (food.defaultMeasurementUnit ? 5 : 0) +
    nutritionScore * 2 +
    optionsScore
  );
}

function pickCanonicalFood(group) {
  return [...group].sort((a, b) => {
    const qualityDelta = qualityScore(b) - qualityScore(a);
    if (qualityDelta !== 0) {
      return qualityDelta;
    }

    const aCreated = new Date(a.createdAt || 0).getTime();
    const bCreated = new Date(b.createdAt || 0).getTime();
    if (aCreated !== bCreated) {
      return aCreated - bCreated;
    }

    return String(a._id).localeCompare(String(b._id));
  })[0];
}

async function main() {
  const apply = process.argv.includes("--apply");
  const mongoUri = process.env.MONGODB_URI || process.env.DATABASE_URL;

  if (!mongoUri) {
    throw new Error("Missing MongoDB connection string (MONGODB_URI)");
  }

  await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 5000 });

  const foods = await FoodItem.find({}).lean();
  const groups = new Map();

  for (const food of foods) {
    const key = buildDuplicateKey(food);
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key).push(food);
  }

  const replacementMap = new Map();
  const categoryUpdates = [];
  let duplicateGroups = 0;

  for (const group of groups.values()) {
    const canonical = pickCanonicalFood(group);
    const canonicalCategory = toSectionCategory(
      canonical.category,
      canonical.name,
      canonical.brand
    );

    if (canonicalCategory !== canonical.category) {
      categoryUpdates.push({
        updateOne: {
          filter: { _id: canonical._id },
          update: { $set: { category: canonicalCategory } },
        },
      });
    }

    if (group.length <= 1) {
      continue;
    }

    duplicateGroups += 1;

    for (const item of group) {
      if (item._id !== canonical._id) {
        replacementMap.set(item._id, canonical._id);
      }
    }
  }

  const duplicateIds = [...replacementMap.keys()];

  console.log(`Scanned foods: ${foods.length}`);
  console.log(`Unique keys: ${groups.size}`);
  console.log(`Duplicate groups: ${duplicateGroups}`);
  console.log(`Duplicate records to remove: ${duplicateIds.length}`);
  console.log(`Canonical category updates: ${categoryUpdates.length}`);

  if (!apply) {
    console.log("Dry run complete. Re-run with --apply to write changes.");
    return;
  }

  let mealEntryRepointCount = 0;
  for (const [duplicateId, canonicalId] of replacementMap.entries()) {
    const result = await MealEntry.updateMany(
      { foodItemId: duplicateId },
      { $set: { foodItemId: canonicalId } }
    );
    mealEntryRepointCount += result.modifiedCount || 0;
  }

  if (categoryUpdates.length > 0) {
    await FoodItem.bulkWrite(categoryUpdates, { ordered: false });
  }

  if (duplicateIds.length > 0) {
    await FoodItem.deleteMany({ _id: { $in: duplicateIds } });
  }

  console.log(`Meal entries repointed: ${mealEntryRepointCount}`);
  console.log(`Foods deleted: ${duplicateIds.length}`);
  console.log("Section normalization applied successfully.");
}

if (require.main === module) {
  main()
    .catch((error) => {
      console.error("Section normalization failed:", error);
      process.exit(1);
    })
    .finally(async () => {
      try {
        await mongoose.disconnect();
      } catch (_error) {
        // ignore disconnect errors
      }
    });
}

module.exports = { main };
