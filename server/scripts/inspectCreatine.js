const mongoose = require("mongoose");
const FoodItem = require("../models/FoodItem");
require("dotenv").config();

async function inspect() {
  await mongoose.connect(process.env.MONGODB_URI || process.env.DATABASE_URL);
  const items = await FoodItem.find({ category: "Gym Supplements", name: /creatine/i }).sort({ name: 1 });
  for (const item of items) {
    console.log(item.name);
    console.log(JSON.stringify(item, null, 2));
  }
  process.exit(0);
}
inspect();
