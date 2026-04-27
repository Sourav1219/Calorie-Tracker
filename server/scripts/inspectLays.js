const mongoose = require("mongoose");
const FoodItem = require("../models/FoodItem");
require("dotenv").config();

async function inspect() {
  await mongoose.connect(process.env.MONGODB_URI || process.env.DATABASE_URL);
  const items = await FoodItem.find({ category: "Lays" }).sort({ name: 1 });
  for (const item of items) {
    console.log(
      `${item.name} | defQty: ${item.defaultQuantity} | defUnit: ${item.defaultMeasurementUnit} | M.Opts: ${JSON.stringify(item.measurementOptions)}`
    );
  }
  process.exit(0);
}
inspect();
