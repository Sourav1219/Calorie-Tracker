require("dotenv").config();

const mongoose = require("mongoose");
const FoodItem = require("../models/FoodItem");
const {
  buildMeasurementOptions,
  chooseDefaultMeasurementUnit,
  toSectionCategory,
  normalizeText,
} = require("../utils/foodCatalog");

async function main() {
  const mongoUri = process.env.MONGODB_URI || process.env.DATABASE_URL;
  if (!mongoUri) {
    throw new Error("Missing MongoDB connection string (MONGODB_URI or DATABASE_URL)");
  }

  await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 5000 });
  console.log("✅ Connected to MongoDB\n");

  const allFoods = await FoodItem.find({}).lean();
  console.log(`📦 Total food items: ${allFoods.length}\n`);

  let updatedCount = 0;
  let unchangedCount = 0;
  const changedSamples = [];
  const categorySummary = {};

  for (const food of allFoods) {
    const section = toSectionCategory(food.category, food.name, food.brand);

    // Generate fresh measurement options using the updated logic
    const newOptions = buildMeasurementOptions({
      name: food.name,
      category: food.category,
    });

    const newDefaultUnit = chooseDefaultMeasurementUnit(
      food.name,
      food.category,
      newOptions
    );

    const oldOptions = food.measurementOptions || [];
    const oldDefaultUnit = food.defaultMeasurementUnit;

    // Check if anything actually changed
    const optionsChanged =
      JSON.stringify(oldOptions.map(o => ({ unit: o.unit, grams: o.grams }))) !==
      JSON.stringify(newOptions.map(o => ({ unit: o.unit, grams: o.grams })));
    const defaultChanged = oldDefaultUnit !== newDefaultUnit;

    if (!optionsChanged && !defaultChanged) {
      unchangedCount++;
      if (!categorySummary[section]) categorySummary[section] = { updated: 0, unchanged: 0 };
      categorySummary[section].unchanged++;
      continue;
    }

    await FoodItem.updateOne(
      { _id: food._id },
      {
        $set: {
          measurementOptions: newOptions,
          defaultMeasurementUnit: newDefaultUnit,
        },
      }
    );

    updatedCount++;
    if (!categorySummary[section]) categorySummary[section] = { updated: 0, unchanged: 0 };
    categorySummary[section].updated++;

    // Track first 3 changed items per category for verification
    if (changedSamples.filter(s => s.section === section).length < 3) {
      changedSamples.push({
        section,
        name: food.name,
        oldUnits: oldOptions.map(o => `${o.unit}(${o.grams}g)`).join(", ") || "(none)",
        newUnits: newOptions.map(o => `${o.unit}(${o.grams}g)`).join(", "),
        oldDefault: oldDefaultUnit || "(none)",
        newDefault: newDefaultUnit,
      });
    }
  }

  console.log("═══════════════════════════════════════════");
  console.log("          MIGRATION SUMMARY");
  console.log("═══════════════════════════════════════════");
  console.log(`  Updated:   ${updatedCount}`);
  console.log(`  Unchanged: ${unchangedCount}`);
  console.log(`  Total:     ${allFoods.length}`);
  console.log("═══════════════════════════════════════════\n");

  console.log("📊 Per-Category Breakdown:");
  const sortedCategories = Object.entries(categorySummary).sort((a, b) => b[1].updated - a[1].updated);
  for (const [cat, counts] of sortedCategories) {
    const marker = counts.updated > 0 ? "🔄" : "✅";
    console.log(`  ${marker} ${cat}: ${counts.updated} updated, ${counts.unchanged} unchanged`);
  }

  if (changedSamples.length > 0) {
    console.log("\n📝 Sample Changes (first 3 per category):");
    for (const sample of changedSamples) {
      console.log(`\n  [${sample.section}] ${sample.name}`);
      console.log(`    Before: ${sample.oldUnits}  (default: ${sample.oldDefault})`);
      console.log(`    After:  ${sample.newUnits}  (default: ${sample.newDefault})`);
    }
  }

  console.log("\n🎉 Migration complete!");
  await mongoose.disconnect();
}

main().catch(async (error) => {
  console.error("❌ Migration failed:", error);
  try {
    await mongoose.disconnect();
  } catch {}
  process.exit(1);
});
