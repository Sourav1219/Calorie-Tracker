const mongoose = require("mongoose");
const FoodItem = require("../models/FoodItem");
require("dotenv").config();

async function run() {
  await mongoose.connect(process.env.MONGODB_URI || process.env.DATABASE_URL);
  
  const items = await FoodItem.find({ category: "McDonald's" });
  let count = 0;

  for (const item of items) {
    if (item.defaultQuantity !== 1) {
      item.defaultQuantity = 1;
      await item.save();
      count++;
    }
  }

  console.log(`Updated defaultQuantity to 1 for ${count} McDonald's items.`);
  process.exit(0);
}

run().catch(console.error);
