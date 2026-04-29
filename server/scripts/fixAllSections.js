const mongoose = require("mongoose");
const FoodItem = require("../models/FoodItem");
require("dotenv").config();

/**
 * This script performs ALL the database migration changes requested:
 *
 * 1. DOMINOS — Fix measurement units to: Piece, Regular(4 pieces), Medium(6 pieces), Large(8 pieces)
 * 2. AMUL — Add Pack(180ml) for all items EXCEPT ice cream stick bars
 * 3. BASKIN ROBBINS — Change scoop from 80g to 110g
 * 4. OTHER FOODS — Move items to correct categories, then delete remaining
 */

async function run() {
  await mongoose.connect(process.env.MONGODB_URI || process.env.DATABASE_URL);
  console.log("Connected to MongoDB\n");

  // ─────────────────────────────────────────────────
  // 1. DOMINOS — Fix measurement units
  // ─────────────────────────────────────────────────
  console.log("=== 1. DOMINOS — Fixing measurement units ===");
  const dominosResult = await FoodItem.updateMany(
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
  console.log(`  ✅ Fixed ${dominosResult.modifiedCount} Dominos items\n`);

  // ─────────────────────────────────────────────────
  // 2. AMUL — Add Pack(180ml) for non-ice cream items
  // ─────────────────────────────────────────────────
  console.log("=== 2. AMUL — Adding Pack(180ml) unit ===");
  const amulItems = await FoodItem.find({ category: "Amul" });
  let amulUpdated = 0;

  // Ice cream stick bar names to exclude
  const iceBarKeywords = ["stick", "bar", "chocobar", "malai"];

  for (const item of amulItems) {
    const nameLower = item.name.toLowerCase();
    const isIceBar = iceBarKeywords.some(kw => nameLower.includes(kw));

    if (isIceBar) {
      console.log(`  ⏭️  Skipping ice bar: ${item.name}`);
      continue;
    }

    // Check if Pack(180ml) already exists
    const hasPack180 = item.measurementOptions.some(
      o => o.unit === "pack180" || (o.unit === "pack" && o.grams === 180)
    );

    if (!hasPack180) {
      // Add Pack(180ml) option. Keep existing options.
      const newOpts = [...item.measurementOptions];
      
      // Remove any existing "pack" option that has a different grams
      const packIdx = newOpts.findIndex(o => o.unit === "pack");
      
      // Add the new pack180 alongside existing pack (if any)
      // Insert Pack(180ml) after the existing pack or at end before 'g'
      const pack180 = { unit: "pack180", grams: 180, label: "Pack (180ml)" };
      
      if (packIdx >= 0) {
        // Insert after existing pack
        newOpts.splice(packIdx + 1, 0, pack180);
      } else {
        // Insert before 'g' if it exists, otherwise at end
        const gIdx = newOpts.findIndex(o => o.unit === "g" || o.unit === "ml");
        if (gIdx >= 0) {
          newOpts.splice(gIdx, 0, pack180);
        } else {
          newOpts.push(pack180);
        }
      }

      item.measurementOptions = newOpts;
      await item.save();
      amulUpdated++;
      console.log(`  ✅ Added Pack(180ml) to: ${item.name}`);
    } else {
      console.log(`  ⏭️  Already has Pack(180ml): ${item.name}`);
    }
  }
  console.log(`  Total updated: ${amulUpdated}\n`);

  // ─────────────────────────────────────────────────
  // 3. BASKIN ROBBINS — Change scoop from 80g to 110g
  // ─────────────────────────────────────────────────
  console.log("=== 3. BASKIN ROBBINS — Changing scoop to 110g ===");
  const brItems = await FoodItem.find({ category: "Baskin Robbins" });
  let brUpdated = 0;

  for (const item of brItems) {
    let changed = false;
    const newOpts = item.measurementOptions.map(opt => {
      if (opt.unit === "scoop" && opt.grams === 80) {
        changed = true;
        return { ...opt.toObject(), grams: 110, label: "Scoop" };
      }
      return opt;
    });

    if (changed) {
      item.measurementOptions = newOpts;
      await item.save();
      brUpdated++;
      console.log(`  ✅ Fixed scoop for: ${item.name}`);
    }
  }
  console.log(`  Total updated: ${brUpdated}\n`);

  // ─────────────────────────────────────────────────
  // 4. OTHER FOODS — Move items to correct categories
  // ─────────────────────────────────────────────────
  console.log("=== 4. OTHER FOODS — Moving items to correct categories ===");

  // Move "American Style Cream & Onion" to Lays
  const creamOnion = await FoodItem.findOneAndUpdate(
    { category: "Other Foods", name: /American Style Cream.*Onion/i },
    { $set: { category: "Lays" } },
    { new: true }
  );
  if (creamOnion) console.log(`  ✅ Moved "${creamOnion.name}" → Lays`);

  // Move "Avocado (Butter Fruit)" to Fruits
  const avocado = await FoodItem.findOneAndUpdate(
    { category: "Other Foods", name: /Avocado/i },
    { $set: { category: "Fruits" } },
    { new: true }
  );
  if (avocado) console.log(`  ✅ Moved "${avocado.name}" → Fruits`);

  // Move Kool flavoured milks to Amul
  const koolNames = [
    /Kool Badam/i,
    /Kool Elaichi/i,
    /Kool Kesar/i,
    /Kool Koko/i,
    /Kool Rose/i,
  ];

  for (const regex of koolNames) {
    const item = await FoodItem.findOneAndUpdate(
      { category: "Other Foods", name: regex },
      { $set: { category: "Amul" } },
      { new: true }
    );
    if (item) console.log(`  ✅ Moved "${item.name}" → Amul`);
  }

  // Move "Milk Chocolate" to Chocolates
  const milkChoc = await FoodItem.findOneAndUpdate(
    { category: "Other Foods", name: /Milk Chocolate/i },
    { $set: { category: "Chocolates" } },
    { new: true }
  );
  if (milkChoc) console.log(`  ✅ Moved "${milkChoc.name}" → Chocolates`);

  // Delete any remaining items in "Other Foods"
  const remaining = await FoodItem.find({ category: "Other Foods" });
  if (remaining.length > 0) {
    console.log(`\n  ⚠️  ${remaining.length} item(s) still in "Other Foods":`);
    for (const r of remaining) {
      console.log(`    - ${r.name}`);
    }
    const deleteResult = await FoodItem.deleteMany({ category: "Other Foods" });
    console.log(`  🗑️  Deleted ${deleteResult.deletedCount} remaining "Other Foods" items`);
  } else {
    console.log(`  ✅ "Other Foods" category is now empty`);
  }

  // ─────────────────────────────────────────────────
  // 5. Also add Pack(180ml) to the newly moved Kool items (now in Amul)
  // ─────────────────────────────────────────────────
  console.log("\n=== 5. Adding Pack(180ml) to newly moved Kool items ===");
  const koolItems = await FoodItem.find({ 
    category: "Amul", 
    name: /^Kool (Badam|Elaichi|Kesar|Koko|Rose)/i 
  });
  
  for (const item of koolItems) {
    const hasPack180 = item.measurementOptions.some(
      o => o.unit === "pack180" || (o.unit === "pack" && o.grams === 180)
    );
    
    if (!hasPack180) {
      const newOpts = [...item.measurementOptions];
      const pack180 = { unit: "pack180", grams: 180, label: "Pack (180ml)" };
      const gIdx = newOpts.findIndex(o => o.unit === "g" || o.unit === "ml");
      if (gIdx >= 0) {
        newOpts.splice(gIdx, 0, pack180);
      } else {
        newOpts.push(pack180);
      }
      item.measurementOptions = newOpts;
      await item.save();
      console.log(`  ✅ Added Pack(180ml) to: ${item.name}`);
    }
  }

  // ─────────────────────────────────────────────────
  // Verification
  // ─────────────────────────────────────────────────
  console.log("\n=== VERIFICATION ===");
  
  const domSample = await FoodItem.findOne({ category: "Dominos" });
  console.log(`Dominos sample: ${domSample.name} → options:`, domSample.measurementOptions.map(o => `${o.label}(${o.grams}g)`).join(", "));
  
  const amulSample = await FoodItem.findOne({ category: "Amul", name: /Lassi/ });
  if (amulSample) console.log(`Amul sample: ${amulSample.name} → options:`, amulSample.measurementOptions.map(o => `${o.label}(${o.grams}g)`).join(", "));
  
  const brSample = await FoodItem.findOne({ category: "Baskin Robbins" });
  console.log(`BR sample: ${brSample.name} → scoop grams:`, brSample.measurementOptions.find(o => o.unit === "scoop")?.grams);
  
  const otherCount = await FoodItem.countDocuments({ category: "Other Foods" });
  console.log(`Other Foods remaining: ${otherCount}`);

  const laysChip = await FoodItem.findOne({ category: "Lays", name: /Cream.*Onion/i });
  console.log(`Lays has Cream & Onion: ${!!laysChip}`);

  const fruitAvo = await FoodItem.findOne({ category: "Fruits", name: /Avocado/i });
  console.log(`Fruits has Avocado: ${!!fruitAvo}`);

  const chocMilk = await FoodItem.findOne({ category: "Chocolates", name: /Milk Chocolate/i });
  console.log(`Chocolates has Milk Chocolate: ${!!chocMilk}`);

  const amulKool = await FoodItem.countDocuments({ category: "Amul", name: /^Kool/i });
  console.log(`Amul Kool items: ${amulKool}`);

  console.log("\n✅ All migrations complete!");
  process.exit(0);
}

run().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
