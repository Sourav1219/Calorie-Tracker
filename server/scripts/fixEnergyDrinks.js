require("dotenv").config();

const mongoose = require("mongoose");
const FoodItem = require("../models/FoodItem");
const {
  normalizeText,
  inferCategory,
  buildMeasurementOptions,
  chooseDefaultMeasurementUnit,
} = require("../utils/foodCatalog");

async function main() {
  const mongoUri = process.env.MONGODB_URI || process.env.DATABASE_URL;
  if (!mongoUri) {
    throw new Error("Missing MongoDB connection string");
  }

  await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 5000 });
  console.log("✅ Connected to MongoDB\n");

  const allFoods = await FoodItem.find({}).lean();
  let updatedCount = 0;
  let deletedCount = 0;

  // We will track the seen names to avoid duplicates
  const seenNames = new Set();

  const targetKeywords = ["cloud 9", "sting", "xtreme", "energy drink", "red bull", "monster", "tzinga", "hell energy", "prime energy"];

  for (const food of allFoods) {
    let oldName = food.name;
    let newName = normalizeText(oldName);
    
    // Strip common volume/weight suffixes
    newName = newName.replace(/\s*-\s*\d+(?:\.\d+)?\s*(ml|g|kg|l)\s*$/i, "").trim();

    const isTarget = targetKeywords.some(k => newName.toLowerCase().includes(k));

    if (isTarget) {
      const newCategory = inferCategory(newName, food.category, food.brand);
      const key = `${newName.toLowerCase()}::${newCategory.toLowerCase()}`;

      if (seenNames.has(key)) {
        await FoodItem.deleteOne({ _id: food._id });
        console.log(`Deleted duplicate: ${oldName}`);
        deletedCount++;
      } else {
        seenNames.add(key);

        const newOptions = buildMeasurementOptions({
          name: newName,
          category: newCategory,
        });

        const newDefaultUnit = chooseDefaultMeasurementUnit(
          newName,
          newCategory,
          newOptions
        );

        await FoodItem.updateOne(
          { _id: food._id },
          {
            $set: {
              name: newName,
              category: newCategory,
              measurementOptions: newOptions,
              defaultMeasurementUnit: newDefaultUnit,
            },
          }
        );
        console.log(`Updated: ${oldName} -> ${newName} (${newCategory})`);
        updatedCount++;
      }
    } else {
      const key = `${newName.toLowerCase()}::${(food.category || "").toLowerCase()}`;
      seenNames.add(key);
    }
  }

  console.log(`\n✅ Updated ${updatedCount} items.`);
  console.log(`✅ Deleted ${deletedCount} duplicate items.`);
  await mongoose.disconnect();
}

main().catch(async (error) => {
  console.error("❌ Migration failed:", error);
  try {
    await mongoose.disconnect();
  } catch { }
  process.exit(1);
});
