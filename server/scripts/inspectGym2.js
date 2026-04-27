const mongoose = require("mongoose");
const FoodItem = require("../models/FoodItem");
require("dotenv").config();

async function inspect() {
  await mongoose.connect(process.env.MONGODB_URI || process.env.DATABASE_URL);
  const items = await FoodItem.find({ category: "Gym Supplements" }).sort({ name: 1 });
  for (const item of items) {
    console.log(`${item.name}: cal=${item.caloriesPer}, p=${item.proteinG}, c=${item.carbsG}, f=${item.fatG}, servingSize=${item.servingSize}, servingUnit=${item.servingUnit}`);
  }
  process.exit(0);
}
inspect();
