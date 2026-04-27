const mongoose = require("mongoose");
const FoodItem = require("../models/FoodItem");
require("dotenv").config();

async function run() {
  await mongoose.connect(process.env.MONGODB_URI || process.env.DATABASE_URL);
  
  const categories = ["Soft Drinks", "Drinks", "O'cean", "Energy Drinks"];
  const items = await FoodItem.find({ category: { $in: categories } });
  
  const groups = {};

  // Group by base name
  for (const item of items) {
    let baseName = item.name.replace(/\s*-\s*\d+(?:\.\d+)?\s*(ml|l)\s*$/i, "").trim();
    const key = `${item.category}::${baseName.toLowerCase()}`;
    
    if (!groups[key]) {
      groups[key] = { baseName, category: item.category, items: [] };
    }
    groups[key].items.push(item);
  }

  let deletedCount = 0;
  let updatedCount = 0;

  for (const key in groups) {
    const group = groups[key];
    
    // Sort items so that the one with servingSize == 100 is preferred
    group.items.sort((a, b) => {
      if (a.servingSize === 100 && b.servingSize !== 100) return -1;
      if (b.servingSize === 100 && a.servingSize !== 100) return 1;
      return 0;
    });

    const primaryItem = group.items[0];
    const duplicates = group.items.slice(1);

    // Update primary item
    let updated = false;

    if (primaryItem.name !== group.baseName) {
      primaryItem.name = group.baseName;
      updated = true;
    }

    // Ensure serving unit is ml
    if (primaryItem.servingUnit !== "ml") {
      primaryItem.servingUnit = "ml";
      updated = true;
    }
    
    // Scale macros to 100ml if they are not 100
    if (primaryItem.servingSize !== 100 && primaryItem.servingSize > 0) {
      const scale = 100 / primaryItem.servingSize;
      primaryItem.caloriesPer = Math.round(primaryItem.caloriesPer * scale);
      primaryItem.proteinG = Number((primaryItem.proteinG * scale).toFixed(1));
      primaryItem.carbsG = Number((primaryItem.carbsG * scale).toFixed(1));
      primaryItem.fatG = Number((primaryItem.fatG * scale).toFixed(1));
      primaryItem.servingSize = 100;
      updated = true;
    }

    // Set bottle to 250ml, can to 300ml
    // Remove old measurement options or just reconstruct them
    let mOpts = Array.isArray(primaryItem.measurementOptions) ? [...primaryItem.measurementOptions] : [];
    
    // Keep only ml, bottle, can, glass, etc but we force bottle=250, can=300
    const mlOpt = mOpts.find(o => o.unit === "ml") || { unit: "ml", grams: 1, label: "Millilitre" };
    const bottleOpt = mOpts.find(o => o.unit === "bottle") || { unit: "bottle", grams: 250, label: "Bottle" };
    const canOpt = mOpts.find(o => o.unit === "can") || { unit: "can", grams: 300, label: "Can" };
    const glassOpt = mOpts.find(o => o.unit === "glass") || { unit: "glass", grams: 200, label: "Glass" };

    bottleOpt.grams = 250;
    canOpt.grams = 300;
    mlOpt.grams = 1;

    // Filter out old bottle/can/ml/glass to add updated ones
    mOpts = mOpts.filter(o => !["ml", "bottle", "can", "glass"].includes(o.unit));
    mOpts.unshift(glassOpt);
    mOpts.unshift(canOpt);
    mOpts.unshift(bottleOpt);
    mOpts.unshift(mlOpt); // ml at the top or wherever

    // Check if measurementOptions changed
    const oldOpts = JSON.stringify(primaryItem.measurementOptions);
    const newOpts = JSON.stringify(mOpts);
    if (oldOpts !== newOpts) {
      primaryItem.measurementOptions = mOpts;
      updated = true;
    }

    if (updated) {
      await primaryItem.save();
      updatedCount++;
    }

    // Delete duplicates
    for (const dup of duplicates) {
      await FoodItem.deleteOne({ _id: dup._id });
      deletedCount++;
    }
  }

  console.log(`Updated ${updatedCount} base drinks. Deleted ${deletedCount} duplicates.`);
  process.exit(0);
}

run().catch(console.error);
