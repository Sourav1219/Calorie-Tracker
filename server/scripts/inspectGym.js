const mongoose = require("mongoose");
const FoodItem = require("../models/FoodItem");
require("dotenv").config(); // running from server/

async function inspect() {
  await mongoose.connect(process.env.MONGODB_URI || process.env.DATABASE_URL);
  const items = await FoodItem.find({ category: "Gym Supplements" }).sort({ name: 1 });
  console.log(`Found ${items.length} Gym Supplements`);
  for (const item of items) {
    console.log(
      `Name: "${item.name}" | Brand: "${item.brand}" | DefQty: ${item.defaultQuantity} | DefUnit: ${item.defaultMeasurementUnit} | M.Opts: ${JSON.stringify(item.measurementOptions)}`
    );
    if (item.name.toLowerCase().includes("creatine")) {
      console.log(`  -> Creatine details: Calories: ${item.caloriesPer}, Protein: ${item.proteinG}, Carbs: ${item.carbsG}`);
    }
  }
  process.exit(0);
}
inspect();
