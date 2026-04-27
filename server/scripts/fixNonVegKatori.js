const mongoose = require("mongoose");
const FoodItem = require("../models/FoodItem");
require("dotenv").config();

async function run() {
  await mongoose.connect(process.env.MONGODB_URI || process.env.DATABASE_URL);
  
  const items = await FoodItem.find({ category: "Non-Vegetarian" });
  let count = 0;

  for (const item of items) {
    let updated = false;
    
    // Find if katori already exists
    const katoriIndex = item.measurementOptions.findIndex(opt => opt.unit === "katori");
    
    if (katoriIndex !== -1) {
      // Update existing katori to 200g
      if (item.measurementOptions[katoriIndex].grams !== 200) {
        item.measurementOptions[katoriIndex].grams = 200;
        item.measurementOptions[katoriIndex].label = "Katori (200g)";
        updated = true;
      }
    } else {
      // Add new katori option
      item.measurementOptions.push({
        unit: "katori",
        grams: 200,
        label: "Katori (200g)"
      });
      updated = true;
    }

    if (updated) {
      // Move g to the end if it exists to keep common units at top
      const gIndex = item.measurementOptions.findIndex(opt => opt.unit === "g");
      if (gIndex !== -1 && gIndex !== item.measurementOptions.length - 1) {
        const [gOpt] = item.measurementOptions.splice(gIndex, 1);
        item.measurementOptions.push(gOpt);
      }
      
      await item.save();
      count++;
    }
  }

  console.log(`Updated Katori to 200g for ${count} Non-Vegetarian items.`);
  process.exit(0);
}

run().catch(console.error);
