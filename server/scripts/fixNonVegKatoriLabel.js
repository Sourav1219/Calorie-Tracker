const mongoose = require("mongoose");
const FoodItem = require("../models/FoodItem");
require("dotenv").config();

async function run() {
  await mongoose.connect(process.env.MONGODB_URI || process.env.DATABASE_URL);
  
  const items = await FoodItem.find({ category: "Non-Vegetarian" });
  let count = 0;

  for (const item of items) {
    let updated = false;
    
    const katoriIndex = item.measurementOptions.findIndex(opt => opt.unit === "katori");
    
    if (katoriIndex !== -1) {
      // Keep 200g but change label to just "Katori"
      item.measurementOptions[katoriIndex].grams = 200;
      item.measurementOptions[katoriIndex].label = "Katori";
      updated = true;
    }

    if (updated) {
      await item.save();
      count++;
    }
  }

  console.log(`Updated Katori label to "Katori" (keeping 200g) for ${count} Non-Vegetarian items.`);
  process.exit(0);
}

run().catch(console.error);
