const mongoose = require("mongoose");
const FoodItem = require("../models/FoodItem");
require("dotenv").config();

async function inspect() {
  await mongoose.connect(process.env.MONGODB_URI || process.env.DATABASE_URL);
  
  // Find all drinks categories
  const items = await FoodItem.find({ category: { $in: ["Soft Drinks", "Drinks", "O'cean"] } }).sort({ name: 1 });
  
  for (const item of items) {
    if (item.name.toLowerCase().match(/-\s*\d+\s*(ml|l)/i)) {
      console.log(`${item.category}: ${item.name} | M.Opts: ${JSON.stringify(item.measurementOptions)}`);
    } else {
      console.log(`(no volume match) ${item.category}: ${item.name}`);
    }
  }
  process.exit(0);
}
inspect();
