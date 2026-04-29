const mongoose = require("mongoose");
const FoodItem = require("../models/FoodItem");
require("dotenv").config();

async function run() {
  await mongoose.connect(process.env.MONGODB_URI || process.env.DATABASE_URL);

  // 1. Dominos — check current measurement options
  const dominos = await FoodItem.find({ category: "Dominos" }).limit(2);
  console.log("=== DOMINOS ===");
  for (const d of dominos) {
    console.log(`  ${d.name}: servingSize=${d.servingSize} ${d.servingUnit}, defaultUnit=${d.defaultMeasurementUnit}`);
    console.log(`    options:`, JSON.stringify(d.measurementOptions));
  }

  // 2. Amul — check items
  const amul = await FoodItem.find({ category: "Amul" });
  console.log("\n=== AMUL ===");
  for (const a of amul) {
    console.log(`  ${a.name}: servingSize=${a.servingSize} ${a.servingUnit}, defaultUnit=${a.defaultMeasurementUnit}`);
    console.log(`    options:`, JSON.stringify(a.measurementOptions));
  }

  // 3. Baskin Robbins
  const br = await FoodItem.find({ category: "Baskin Robbins" });
  console.log("\n=== BASKIN ROBBINS ===");
  for (const b of br) {
    console.log(`  ${b.name}: servingSize=${b.servingSize} ${b.servingUnit}`);
    console.log(`    options:`, JSON.stringify(b.measurementOptions));
  }

  // 4. Other Foods
  const others = await FoodItem.find({ category: "Other Foods" });
  console.log("\n=== OTHER FOODS ===");
  for (const o of others) {
    console.log(`  ${o.name} (id: ${o._id})`);
  }

  // 5. Check all categories
  const cats = await FoodItem.distinct("category");
  console.log("\n=== ALL CATEGORIES ===");
  console.log(cats);

  process.exit(0);
}

run().catch(console.error);
