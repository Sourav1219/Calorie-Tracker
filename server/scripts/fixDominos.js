require("dotenv").config();

const mongoose = require("mongoose");
const FoodItem = require("../models/FoodItem");
const {
  buildMeasurementOptions,
  chooseDefaultMeasurementUnit,
  toSectionCategory,
} = require("../utils/foodCatalog");

async function main() {
  const mongoUri = process.env.MONGODB_URI || process.env.DATABASE_URL;
  if (!mongoUri) {
    throw new Error("Missing MongoDB connection string");
  }

  await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 5000 });
  console.log("✅ Connected to MongoDB\\n");

  const allFoods = await FoodItem.find({}).lean();
  let updatedCount = 0;

  for (const food of allFoods) {
    const section = toSectionCategory(food.category, food.name, food.brand);

    if (section === "Dominos") {
      const newOptions = buildMeasurementOptions({
        name: food.name,
        category: food.category,
      });

      const newDefaultUnit = chooseDefaultMeasurementUnit(
        food.name,
        food.category,
        newOptions
      );

      await FoodItem.updateOne(
        { _id: food._id },
        {
          $set: {
            measurementOptions: newOptions,
            defaultMeasurementUnit: newDefaultUnit,
            defaultQuantity: 1, // Explicitly set to 1
          },
        }
      );
      updatedCount++;
    } else {
      // Just in case, if any other items need defaultQuantity fixed, but user specifically asked for Dominos.
      // We will only do Dominos for now.
    }
  }

  console.log(`✅ Updated ${updatedCount} Dominos items.`);
  await mongoose.disconnect();
}

main().catch(async (error) => {
  console.error("❌ Migration failed:", error);
  try {
    await mongoose.disconnect();
  } catch {}
  process.exit(1);
});
