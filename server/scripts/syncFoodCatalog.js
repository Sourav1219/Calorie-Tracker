require("dotenv").config();

const mongoose = require("mongoose");
const FoodItem = require("../models/FoodItem");
const { buildFoodKey, normalizeFoodDocument } = require("../utils/foodCatalog");

async function main() {
  await mongoose.connect(process.env.MONGODB_URI || process.env.DATABASE_URL);

  const collection = mongoose.connection.collection("fooditems");
  const rawDocs = await collection.find({}).toArray();
  const existingStringDocsByKey = new Map();

  rawDocs.forEach((doc) => {
    if (typeof doc._id !== "string") {
      return;
    }

    const normalized = normalizeFoodDocument(doc, null);
    if (!normalized.name || normalized.caloriesPer <= 0) {
      return;
    }

    existingStringDocsByKey.set(buildFoodKey(normalized), normalized._id);
  });

  let updatedCount = 0;
  let insertedCount = 0;
  let deletedRawCount = 0;
  let deletedDuplicateCount = 0;
  let skippedCount = 0;

  for (const doc of rawDocs) {
    const normalized = normalizeFoodDocument(doc, null);

    if (!normalized.name || normalized.caloriesPer <= 0) {
      if (!doc.name && (doc["Food Item"] || doc["Dish Name"])) {
        await collection.deleteOne({ _id: doc._id });
        deletedRawCount += 1;
      }
      skippedCount += 1;
      continue;
    }

    const key = buildFoodKey(normalized);

    if (typeof doc._id === "string") {
      await collection.updateOne(
        { _id: doc._id },
        {
          $set: {
            name: normalized.name,
            brand: normalized.brand,
            category: normalized.category,
            servingSize: normalized.servingSize,
            servingUnit: normalized.servingUnit,
            defaultMeasurementUnit: normalized.defaultMeasurementUnit,
            measurementOptions: normalized.measurementOptions,
            caloriesPer: normalized.caloriesPer,
            proteinG: normalized.proteinG,
            carbsG: normalized.carbsG,
            fatG: normalized.fatG,
            fibreG: normalized.fibreG,
            sugarG: normalized.sugarG,
            sodiumMg: normalized.sodiumMg,
            isVerified: normalized.isVerified,
            createdBy: normalized.createdBy,
            createdAt: normalized.createdAt,
          },
        }
      );
      existingStringDocsByKey.set(key, doc._id);
      updatedCount += 1;
      continue;
    }

    const existingId = existingStringDocsByKey.get(key);
    if (existingId) {
      await collection.updateOne(
        { _id: existingId },
        {
          $set: {
            name: normalized.name,
            brand: normalized.brand,
            category: normalized.category,
            servingSize: normalized.servingSize,
            servingUnit: normalized.servingUnit,
            defaultMeasurementUnit: normalized.defaultMeasurementUnit,
            measurementOptions: normalized.measurementOptions,
            caloriesPer: normalized.caloriesPer,
            proteinG: normalized.proteinG,
            carbsG: normalized.carbsG,
            fatG: normalized.fatG,
            fibreG: normalized.fibreG,
            sugarG: normalized.sugarG,
            sodiumMg: normalized.sodiumMg,
            isVerified: normalized.isVerified,
            createdBy: normalized.createdBy,
            createdAt: normalized.createdAt,
          },
        }
      );
      await collection.deleteOne({ _id: doc._id });
      updatedCount += 1;
      deletedRawCount += 1;
      continue;
    }

    await FoodItem.create(normalized);
    existingStringDocsByKey.set(key, normalized._id);
    await collection.deleteOne({ _id: doc._id });
    insertedCount += 1;
    deletedRawCount += 1;
  }

  const duplicateGroups = await FoodItem.aggregate([
    {
      $group: {
        _id: {
          name: { $toLower: "$name" },
          category: "$category",
        },
        ids: { $push: "$_id" },
        count: { $sum: 1 },
      },
    },
    { $match: { count: { $gt: 1 } } },
  ]);

  for (const group of duplicateGroups) {
    const idsToDelete = group.ids.slice(1);
    if (idsToDelete.length === 0) {
      continue;
    }

    const deleteResult = await FoodItem.deleteMany({ _id: { $in: idsToDelete } });
    deletedDuplicateCount += deleteResult.deletedCount || 0;
  }

  const categoryCounts = await FoodItem.aggregate([
    { $group: { _id: "$category", count: { $sum: 1 } } },
    { $sort: { count: -1, _id: 1 } },
  ]);

  console.log(
    JSON.stringify(
      {
        totalFoods: await FoodItem.countDocuments(),
        updatedCount,
        insertedCount,
        deletedRawCount,
        deletedDuplicateCount,
        skippedCount,
        categoryCounts,
      },
      null,
      2
    )
  );

  await mongoose.disconnect();
}

main().catch(async (error) => {
  console.error(error);
  try {
    await mongoose.disconnect();
  } catch {}
  process.exit(1);
});
