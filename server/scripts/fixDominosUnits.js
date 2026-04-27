const mongoose = require("mongoose");
const FoodItem = require("../models/FoodItem");
require("dotenv").config();

async function run() {
  await mongoose.connect(process.env.MONGODB_URI || process.env.DATABASE_URL);
  
  // Fix: servingSize must be 100 (the per-100g base) so the multiplier math works correctly.
  // 1 Piece = 100g in measurementOptions, so multiplier = 100/100 = 1x (correct)
  // Regular (4 Pieces) = 400g, multiplier = 400/100 = 4x (correct)
  // Medium (6 Pieces) = 600g, multiplier = 600/100 = 6x (correct)
  // Large (8 Pieces) = 800g, multiplier = 800/100 = 8x (correct)
  const result = await FoodItem.updateMany(
    { category: "Dominos" },
    {
      $set: {
        servingSize: 100,
        servingUnit: "g",
        defaultMeasurementUnit: "Piece",
        defaultQuantity: 1,
        measurementOptions: [
          { unit: "Piece", grams: 100, label: "Piece" },
          { unit: "Regular (4 Pieces)", grams: 400, label: "Regular (4 Pieces)" },
          { unit: "Medium (6 Pieces)", grams: 600, label: "Medium (6 Pieces)" },
          { unit: "Large (8 Pieces)", grams: 800, label: "Large (8 Pieces)" },
          { unit: "g", grams: 1, label: "Gram" }
        ]
      }
    }
  );

  console.log(`Fixed ${result.modifiedCount} Dominos items.`);
  
  // Verify
  const sample = await FoodItem.findOne({ category: "Dominos" });
  console.log(`\nVerification — ${sample.name}:`);
  console.log(`  servingSize: ${sample.servingSize} ${sample.servingUnit}`);
  console.log(`  caloriesPer: ${sample.caloriesPer} kcal (per 100g base)`);
  console.log(`  1 Piece (100g) => ${sample.caloriesPer * (100/sample.servingSize)} kcal`);
  console.log(`  Regular 4pc (400g) => ${sample.caloriesPer * (400/sample.servingSize)} kcal`);
  console.log(`  Medium 6pc (600g) => ${sample.caloriesPer * (600/sample.servingSize)} kcal`);
  console.log(`  Large 8pc (800g) => ${sample.caloriesPer * (800/sample.servingSize)} kcal`);

  process.exit(0);
}

run().catch(console.error);
