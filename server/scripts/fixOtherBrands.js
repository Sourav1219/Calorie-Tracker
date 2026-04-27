const mongoose = require("mongoose");
const FoodItem = require("../models/FoodItem");
require("dotenv").config();

async function run() {
  await mongoose.connect(process.env.MONGODB_URI || process.env.DATABASE_URL);
  
  const categoriesToFix = ["Amul", "Baskin Robbins", "O'cean"];
  let totalUpdated = 0;

  for (const cat of categoriesToFix) {
    const items = await FoodItem.find({ category: cat });
    let count = 0;
    for (const item of items) {
      if (item.defaultQuantity !== 1) {
        item.defaultQuantity = 1;
        await item.save();
        count++;
      }
    }
    console.log(`Updated ${count} items in category: ${cat}`);
    totalUpdated += count;
  }

  console.log(`Total items updated: ${totalUpdated}`);
  process.exit(0);
}

run().catch(console.error);
