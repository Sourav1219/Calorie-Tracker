const FoodItem = require("../models/FoodItem");
const BulkUploadHistory = require("../models/BulkUploadHistory");
const {
  STANDARD_CATEGORIES,
  buildFoodKey,
  buildMeasurementOptions,
  chooseDefaultMeasurementUnit,
  normalizeFoodDocument,
  normalizeText,
  toSectionCategory,
} = require("../utils/foodCatalog");

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function toFoodResponse(food) {
  const sectionCategory = toSectionCategory(food.category, food.name, food.brand);
  const generatedMeasurementOptions = buildMeasurementOptions({
    name: food.name,
    category: food.category,
  });
  let measurementOptions =
    (food.measurementOptions && food.measurementOptions.length > 0)
      ? food.measurementOptions
      : generatedMeasurementOptions;

  let resolvedDefaultUnit = food.defaultMeasurementUnit || food.servingUnit;
  const isUnitValid = measurementOptions.some(opt => opt.unit === resolvedDefaultUnit);
  if (!isUnitValid) {
    resolvedDefaultUnit = measurementOptions[0]?.unit || "g";
  }

  // Sort options so the default unit is always at the top
  measurementOptions.sort((a, b) => {
    if (a.unit === resolvedDefaultUnit) return -1;
    if (b.unit === resolvedDefaultUnit) return 1;
    return 0;
  });

  return {
    id: food._id,
    name: food.name,
    brand: food.brand,
    category: sectionCategory,
    servingSize: food.servingSize,
    servingUnit: food.servingUnit,
    defaultMeasurementUnit: resolvedDefaultUnit,
    defaultQuantity: food.defaultQuantity || null,
    measurementOptions,
    caloriesPer: food.caloriesPer,
    proteinG: food.proteinG,
    carbsG: food.carbsG,
    fatG: food.fatG,
    fibreG: food.fibreG,
    sugarG: food.sugarG,
    sodiumMg: food.sodiumMg,
    isVerified: food.isVerified,
    createdBy: food.createdBy,
    createdAt: food.createdAt,
  };
}

function buildFoodDisplayKey(food) {
  return [normalizeText(food.name), normalizeText(food.brand)]
    .map((value) => value.toLowerCase())
    .join("::");
}

function dedupeFoodResponses(foods) {
  const seen = new Set();
  const deduped = [];

  for (const food of foods) {
    const key = buildFoodDisplayKey(food);
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    deduped.push(food);
  }

  return deduped;
}

function toHistoryResponse(entry) {
  return {
    id: entry._id,
    uploadedBy: entry.uploadedBy,
    uploaderEmail: entry.uploaderEmail,
    sourceFormat: entry.sourceFormat,
    totalCount: entry.totalCount,
    validCount: entry.validCount,
    insertedCount: entry.insertedCount,
    invalidCount: entry.invalidCount,
    duplicateCount: entry.duplicateCount,
    invalidItems: entry.invalidItems || [],
    duplicateItems: entry.duplicateItems || [],
    insertedNames: entry.insertedNames || [],
    createdAt: entry.createdAt,
  };
}

function normalizeFoodPayload(item, fallbackCreatedBy) {
  return normalizeFoodDocument(item, fallbackCreatedBy);
}

function normalizeUnit(value) {
  const normalized = normalizeText(value).toLowerCase();
  return normalized || null;
}

function unitLabel(unit) {
  const knownLabels = {
    g: "Gram",
    ml: "Millilitre",
    tsp: "Teaspoon",
    tbsp: "Tablespoon",
  };

  if (knownLabels[unit]) {
    return knownLabels[unit];
  }

  return unit
    .split(" ")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function getRawItems(body) {
  if (Array.isArray(body)) {
    return body;
  }

  if (Array.isArray(body?.items)) {
    return body.items;
  }

  return null;
}

async function buildExistingFoodKeySet() {
  const existingFoods = await FoodItem.find({}, "name brand category").lean();
  return new Set(existingFoods.map(buildFoodKey));
}

async function analyzeItems(rawItems, fallbackCreatedBy) {
  const invalidItems = [];
  const duplicateItems = [];
  const validEntries = [];

  rawItems.forEach((item, index) => {
    const normalized = normalizeFoodPayload(item, fallbackCreatedBy);

    if (!normalized.name) {
      invalidItems.push({
        index,
        name: null,
        category: normalized.category,
        reason: "name is required",
        scope: "validation",
      });
      return;
    }

    if (!Number.isFinite(normalized.caloriesPer) || normalized.caloriesPer <= 0) {
      invalidItems.push({
        index,
        name: normalized.name,
        category: normalized.category,
        reason: "caloriesPer must be a positive number",
        scope: "validation",
      });
      return;
    }

    if (!Number.isFinite(normalized.servingSize) || normalized.servingSize <= 0) {
      invalidItems.push({
        index,
        name: normalized.name,
        category: normalized.category,
        reason: "servingSize must be a positive number",
        scope: "validation",
      });
      return;
    }

    validEntries.push({
      index,
      item: normalized,
      key: buildFoodKey(normalized),
    });
  });

  const seenPayloadKeys = new Set();
  const payloadUniqueEntries = [];

  validEntries.forEach((entry) => {
    if (seenPayloadKeys.has(entry.key)) {
      duplicateItems.push({
        index: entry.index,
        name: entry.item.name,
        category: entry.item.category,
        reason: "Duplicate item in current payload",
        scope: "payload",
      });
      return;
    }

    seenPayloadKeys.add(entry.key);
    payloadUniqueEntries.push(entry);
  });

  const existingKeys = await buildExistingFoodKeySet();
  const insertableItems = [];

  payloadUniqueEntries.forEach((entry) => {
    if (existingKeys.has(entry.key)) {
      duplicateItems.push({
        index: entry.index,
        name: entry.item.name,
        category: entry.item.category,
        reason: "Food already exists in catalog",
        scope: "database",
      });
      return;
    }

    insertableItems.push(entry.item);
  });

  return {
    totalCount: rawItems.length,
    validCount: validEntries.length,
    invalidItems,
    duplicateItems,
    insertableItems,
  };
}

async function searchFood(req, res) {
  try {
    const { q, category } = req.query;
    const selectedSection = category ? toSectionCategory(category) : null;

    const where = {};
    if (q && q.trim()) {
      where.name = {
        $regex: escapeRegex(q.trim()),
        $options: "i",
      };
    }
    const results = await FoodItem.find(where)
      .sort({ name: 1 })
      .lean();

    let payload = dedupeFoodResponses(results.map(toFoodResponse));
    if (selectedSection) {
      payload = payload.filter((food) => food.category === selectedSection);
    }

    res.set("Cache-Control", "no-store");
    return res.status(200).json({ results: payload, count: payload.length });
  } catch (error) {
    console.error("Search food error:", error);
    return res.status(500).json({ error: "Something went wrong" });
  }
}

async function getFoodById(req, res) {
  try {
    const { id } = req.params;

    const food = await FoodItem.findById(id).lean();

    if (!food) {
      return res.status(404).json({ error: "Food item not found" });
    }

    res.set("Cache-Control", "no-store");
    return res.status(200).json({ food: toFoodResponse(food) });
  } catch (error) {
    console.error("Get food error:", error);
    return res.status(500).json({ error: "Something went wrong" });
  }
}

async function createFood(req, res) {
  try {
    const {
      name,
      category,
      servingSize,
      servingUnit,
      caloriesPer,
      proteinG,
      carbsG,
      fatG,
      fibreG,
      sugarG,
      sodiumMg,
      brand,
    } = req.body;

    if (!name || caloriesPer === undefined || servingSize === undefined) {
      return res
        .status(400)
        .json({ error: "name, caloriesPer, and servingSize are required" });
    }

    if (Number(caloriesPer) <= 0 || Number(servingSize) <= 0) {
      return res.status(400).json({ error: "Invalid nutritional values" });
    }

    // Reject physically implausible values (and negatives) so a typo or a
    // tampered request can't poison the catalog.
    const numericChecks = [
      { value: caloriesPer, max: 9000, label: "Calories" },
      { value: servingSize, max: 10000, label: "Serving size" },
      { value: proteinG, max: 1000, label: "Protein" },
      { value: carbsG, max: 1000, label: "Carbs" },
      { value: fatG, max: 1000, label: "Fat" },
      { value: fibreG, max: 1000, label: "Fibre" },
      { value: sugarG, max: 1000, label: "Sugar" },
      { value: sodiumMg, max: 100000, label: "Sodium" },
    ];
    for (const { value, max, label } of numericChecks) {
      if (value === undefined || value === null || value === "") continue;
      const n = Number(value);
      if (!Number.isFinite(n) || n < 0 || n > max) {
        return res.status(400).json({ error: `${label} must be between 0 and ${max}` });
      }
    }

    const normalized = normalizeFoodPayload(
      {
        name,
        category,
        servingSize,
        servingUnit,
        caloriesPer,
        proteinG,
        carbsG,
        fatG,
        fibreG,
        sugarG,
        sodiumMg,
        brand,
        isVerified: false,
      },
      req.user.userId
    );

    const preferredUnit = normalizeUnit(servingUnit);
    if (preferredUnit) {
      normalized.servingUnit = preferredUnit;
      normalized.defaultMeasurementUnit = preferredUnit;

      const measurementOptions = Array.isArray(normalized.measurementOptions)
        ? normalized.measurementOptions
          .map((option) => ({
            ...option,
            unit: normalizeUnit(option?.unit),
          }))
          .filter((option) => option.unit)
        : [];

      const hasPreferredUnit = measurementOptions.some(
        (option) => option.unit === preferredUnit
      );

      if (!hasPreferredUnit) {
        measurementOptions.unshift({
          unit: preferredUnit,
          grams: 1,
          label: unitLabel(preferredUnit),
        });
      }

      normalized.measurementOptions = measurementOptions;
    }

    const existingKeys = await buildExistingFoodKeySet();
    if (existingKeys.has(buildFoodKey(normalized))) {
      return res.status(409).json({ error: "A matching food item already exists" });
    }

    const food = await FoodItem.create(normalized);

    return res
      .status(201)
      .json({ message: "Food item created", food: toFoodResponse(food) });
  } catch (error) {
    console.error("Create food error:", error);
    return res.status(500).json({ error: "Something went wrong" });
  }
}

async function analyzeBulkFoods(req, res) {
  try {
    const rawItems = getRawItems(req.body);

    if (!rawItems) {
      return res.status(400).json({
        error: "Request body must be an array or { items: [] }",
      });
    }

    if (rawItems.length === 0) {
      return res.status(400).json({ error: "No items provided" });
    }

    if (rawItems.length > 2000) {
      return res.status(400).json({ error: "Maximum 2000 items per request" });
    }

    const analysis = await analyzeItems(rawItems, req.user.userId);

    return res.status(200).json({
      totalCount: analysis.totalCount,
      validCount: analysis.validCount,
      insertableCount: analysis.insertableItems.length,
      invalidCount: analysis.invalidItems.length,
      duplicateCount: analysis.duplicateItems.length,
      invalidItems: analysis.invalidItems,
      duplicateItems: analysis.duplicateItems,
      preview: analysis.insertableItems.slice(0, 5),
    });
  } catch (error) {
    console.error("Bulk analysis error:", error);
    return res.status(500).json({ error: "Something went wrong during analysis" });
  }
}

async function bulkCreateFoods(req, res) {
  try {
    const rawItems = getRawItems(req.body);

    if (!rawItems) {
      return res.status(400).json({
        error: "Request body must be an array or { items: [] }",
      });
    }

    if (rawItems.length === 0) {
      return res.status(400).json({ error: "No items provided" });
    }

    if (rawItems.length > 2000) {
      return res.status(400).json({ error: "Maximum 2000 items per request" });
    }

    const analysis = await analyzeItems(rawItems, req.user.userId);
    const inserted = analysis.insertableItems.length
      ? await FoodItem.insertMany(analysis.insertableItems, { ordered: true })
      : [];

    const history = await BulkUploadHistory.create({
      uploadedBy: req.user.userId,
      uploaderEmail: req.user.email,
      sourceFormat: normalizeText(req.body?.format).toLowerCase() || "mixed",
      totalCount: analysis.totalCount,
      validCount: analysis.validCount,
      insertedCount: inserted.length,
      invalidCount: analysis.invalidItems.length,
      duplicateCount: analysis.duplicateItems.length,
      invalidItems: analysis.invalidItems.slice(0, 25),
      duplicateItems: analysis.duplicateItems.slice(0, 25),
      insertedNames: inserted.slice(0, 10).map((item) => item.name),
    });

    return res.status(201).json({
      message: "Bulk upload completed",
      insertedCount: inserted.length,
      duplicateCount: analysis.duplicateItems.length,
      invalidCount: analysis.invalidItems.length,
      duplicateItems: analysis.duplicateItems,
      invalidItems: analysis.invalidItems,
      sample: inserted.slice(0, 5).map(toFoodResponse),
      historyEntry: toHistoryResponse(history),
    });
  } catch (error) {
    console.error("Bulk upload error:", error);
    return res.status(500).json({ error: "Something went wrong during bulk upload" });
  }
}

async function getBulkUploadHistory(req, res) {
  try {
    const entries = await BulkUploadHistory.find({})
      .sort({ createdAt: -1 })
      .limit(20)
      .lean();

    return res.status(200).json({
      history: entries.map(toHistoryResponse),
    });
  } catch (error) {
    console.error("Get bulk upload history error:", error);
    return res.status(500).json({ error: "Something went wrong" });
  }
}

async function getCategories(req, res) {
  try {
    const foods = await FoodItem.find(
      { category: { $nin: [null, ""] } },
      "name brand category"
    ).lean();

    const categorySet = new Set();
    const uniqueFoodKeys = new Set();

    foods.forEach((food) => {
      const section = toSectionCategory(food.category, food.name, food.brand);
      categorySet.add(section);
      uniqueFoodKeys.add(buildFoodDisplayKey(food));
    });

    const categories = [...categorySet];

    const categoryOrder = new Map(
      STANDARD_CATEGORIES.map((category, index) => [category, index])
    );

    categories.sort((a, b) => {
      const aIndex = categoryOrder.has(a)
        ? categoryOrder.get(a)
        : Number.MAX_SAFE_INTEGER;
      const bIndex = categoryOrder.has(b)
        ? categoryOrder.get(b)
        : Number.MAX_SAFE_INTEGER;

      if (aIndex !== bIndex) {
        return aIndex - bIndex;
      }

      return a.localeCompare(b);
    });

    const totalCount = uniqueFoodKeys.size;

    return res.status(200).json({ categories, totalCount });
  } catch (error) {
    console.error("Get categories error:", error);
    return res.status(500).json({ error: "Something went wrong" });
  }
}

module.exports = {
  searchFood,
  getFoodById,
  createFood,
  analyzeBulkFoods,
  bulkCreateFoods,
  getBulkUploadHistory,
  getCategories,
};
