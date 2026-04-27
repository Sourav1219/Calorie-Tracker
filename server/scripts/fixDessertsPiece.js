const mongoose = require("mongoose");
const FoodItem = require("../models/FoodItem");
require("dotenv").config();

async function run() {
  await mongoose.connect(process.env.MONGODB_URI || process.env.DATABASE_URL);
  
  const items = await FoodItem.find({ category: "Sweets & Desserts" });
  let count = 0;

  for (const item of items) {
    let updated = false;
    
    // Find if piece already exists
    const pieceIndex = item.measurementOptions.findIndex(opt => opt.unit === "piece");
    
    if (pieceIndex !== -1) {
      // Update existing piece to 100g
      if (item.measurementOptions[pieceIndex].grams !== 100) {
        item.measurementOptions[pieceIndex].grams = 100;
        item.measurementOptions[pieceIndex].label = "Piece";
        updated = true;
      }
    } else {
      // Add new piece option
      item.measurementOptions.push({
        unit: "piece",
        grams: 100,
        label: "Piece"
      });
      updated = true;
    }

    if (updated) {
      await item.save();
      count++;
    }
  }

  console.log(`Updated Piece to 100g for ${count} Sweets & Desserts items.`);
  process.exit(0);
}

run().catch(console.error);
