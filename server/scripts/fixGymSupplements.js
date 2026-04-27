const mongoose = require("mongoose");
const FoodItem = require("../models/FoodItem");
require("dotenv").config();

async function run() {
  await mongoose.connect(process.env.MONGODB_URI || process.env.DATABASE_URL);
  console.log("Connected to MongoDB.");

  const items = await FoodItem.find({ category: "Gym Supplements" });
  console.log(`Found ${items.length} items in Gym Supplements.`);

  // Group by base name
  const groups = {};

  const nameRegex = /^(.*?)(?:\s*(?:-\s*\d+(?:-\d+)?\s*g(?:m)?|\(\d+(?:-\d+)?\s*g(?:m)?\s*serving\)))\s*$/i;

  for (const item of items) {
    let baseName = item.name.trim();
    let scoopGrams = 30; // default
    
    // Attempt to extract serving size from name
    const match = item.name.match(/(?:-\s*|\()(\d+)(?:-(\d+))?\s*g(?:m)?/i);
    if (match) {
      const num1 = parseInt(match[1]);
      const num2 = match[2] ? parseInt(match[2]) : num1;
      scoopGrams = num1; // or Math.round((num1+num2)/2), let's use num1 as scoop size
      // Actually let's use average? Or first number? The user says "use them as default serving size of scoop". Let's use lower bound or first number. We'll use num1.
      
      // Extract base name
      const cleanName = item.name.replace(/\s*(?:-\s*\d+(?:-\d+)?\s*g(?:m)?|\(\d+(?:-\d+)?\s*g(?:m)?\s*serving\))\s*/i, "").trim();
      if (cleanName) {
        baseName = cleanName;
      }
    }

    if (!groups[baseName]) {
      groups[baseName] = { items: [], scoopGrams };
    } else {
      // update scoopGrams if we found a new one and it was 30
      if (scoopGrams !== 30) groups[baseName].scoopGrams = scoopGrams;
    }
    groups[baseName].items.push(item);
  }

  let deletedCount = 0;
  let updatedCount = 0;

  for (const [baseName, group] of Object.entries(groups)) {
    // Sort items so that the one with servingSize == 100 is preferred
    // Or if none, the one with largest caloriesPer maybe?
    group.items.sort((a, b) => {
      if (a.servingSize === 100 && b.servingSize !== 100) return -1;
      if (b.servingSize === 100 && a.servingSize !== 100) return 1;
      return 0;
    });

    const primaryItem = group.items[0];
    const duplicates = group.items.slice(1);

    // If it's creatine, maybe set standard per 100g values
    if (baseName.toLowerCase().includes("creatine")) {
      // pure creatine is 0 calories, 0 macros.
      // Or maybe the user meant it shouldn't be 1 cal? 
      // I'll set it to 0 cal, 0 protein, 0 carbs, 0 fat.
      // Wait, is there any case where creatine has nutritional details? Maybe people track it as protein?
      // Some apps count creatine as 100g protein per 100g because it's an amino acid.
      // If the user complained "some creatine items not showing nutritional details",
      // currently they have caloriesPer=1, proteinG=0, carbsG=0, fatG=0.
      // Let's just fix the serving size and scoop first. If servingSize was 3 and caloriesPer=1, then 100g = 33 cal.
      primaryItem.caloriesPer = 0;
      primaryItem.proteinG = 0;
      primaryItem.carbsG = 0;
      primaryItem.fatG = 0;
      primaryItem.servingSize = 100; // Standardize to 100g
    }

    // Always standardize to 100g servingSize if not already, to match other food items
    // Wait, if it wasn't 100g, and it wasn't creatine, we need to scale its macros!
    if (primaryItem.servingSize !== 100) {
      const scale = 100 / primaryItem.servingSize;
      primaryItem.caloriesPer = Math.round(primaryItem.caloriesPer * scale);
      primaryItem.proteinG = Number((primaryItem.proteinG * scale).toFixed(1));
      primaryItem.carbsG = Number((primaryItem.carbsG * scale).toFixed(1));
      primaryItem.fatG = Number((primaryItem.fatG * scale).toFixed(1));
      primaryItem.servingSize = 100;
    }

    primaryItem.name = baseName;
    primaryItem.servingUnit = "g";
    primaryItem.defaultMeasurementUnit = "scoop";
    primaryItem.defaultQuantity = 1;
    
    // Set measurement options
    primaryItem.measurementOptions = [
      { unit: "scoop", grams: group.scoopGrams, label: "Scoop" },
      { unit: "g", grams: 1, label: "Gram" }
    ];

    await primaryItem.save();
    updatedCount++;

    for (const dup of duplicates) {
      await FoodItem.deleteOne({ _id: dup._id });
      deletedCount++;
    }
  }

  console.log(`Updated ${updatedCount} base items. Deleted ${deletedCount} duplicates.`);
  process.exit(0);
}

run().catch(console.error);
