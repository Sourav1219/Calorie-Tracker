const DailyLog = require("../models/DailyLog");
const FoodItem = require("../models/FoodItem");
const MealEntry = require("../models/MealEntry");
const {
	buildMeasurementOptions,
	chooseDefaultMeasurementUnit,
	toSectionCategory,
} = require("../utils/foodCatalog");
const {
	formatDateKey,
	ensureDailyLog,
	applyDailyLogNutritionDelta,
} = require("../utils/dailyLog");

function resolveMeasurementOptions(foodItem) {
	const generated = buildMeasurementOptions({
		name: foodItem.name,
		category: foodItem.category,
	});
	if (generated.length > 0) {
		return generated;
	}
	return Array.isArray(foodItem.measurementOptions) ? foodItem.measurementOptions : [];
}

function toMealResponse(entry, foodItem = null) {
	return {
		id: entry._id,
		dailyLogId: entry.dailyLogId,
		mealType: entry.mealType,
		foodItemId: entry.foodItemId,
		quantity: entry.quantity,
		unit: entry.unit,
		calories: entry.calories,
		proteinG: entry.proteinG,
		carbsG: entry.carbsG,
		fatG: entry.fatG,
		loggedAt: entry.loggedAt,
		foodItem: foodItem
			? {
				id: foodItem._id,
				name: foodItem.name,
				category: toSectionCategory(foodItem.category, foodItem.name, foodItem.brand),
				servingSize: foodItem.servingSize,
				servingUnit: foodItem.servingUnit,
			}
			: null,
	};
}

function getMeasurementFactor(foodItem, unit) {
	const measurementOptions = resolveMeasurementOptions(foodItem);
	const normalizedUnit = String(unit || foodItem.servingUnit || "g")
		.trim()
		.toLowerCase();
	const matchedOption = measurementOptions.find(
		(option) => String(option.unit).trim().toLowerCase() === normalizedUnit
	);

	if (matchedOption && Number.isFinite(Number(matchedOption.grams))) {
		return Number(matchedOption.grams);
	}

	if (normalizedUnit === "katori") {
		return 150;
	}

	return 1;
}

function resolveDefaultUnit(foodItem) {
	const measurementOptions = resolveMeasurementOptions(foodItem);

	return chooseDefaultMeasurementUnit(
		foodItem.name,
		foodItem.category,
		measurementOptions
	);
}

function normalizeQuantityForCalculation(foodItem, quantity, unit) {
	return quantity * getMeasurementFactor(foodItem, unit);
}

async function getTodayMeals(req, res) {
	try {
		const userId = req.user.userId;
		const date = req.query.date || formatDateKey();

		const dailyLog = await DailyLog.findOne({ userId, date }).lean();
		if (!dailyLog) {
			return res.status(200).json({ date, meals: [], groupedMeals: {} });
		}

		const mealEntries = await MealEntry.find({ dailyLogId: dailyLog._id })
			.sort({ loggedAt: -1 })
			.lean();

		const foodIds = [...new Set(mealEntries.map((entry) => entry.foodItemId))];
		const foods = await FoodItem.find({ _id: { $in: foodIds } }).lean();
		const foodsById = new Map(foods.map((food) => [food._id, food]));

		const meals = mealEntries.map((entry) =>
			toMealResponse(entry, foodsById.get(entry.foodItemId))
		);

		const groupedMeals = meals.reduce((acc, meal) => {
			if (!acc[meal.mealType]) {
				acc[meal.mealType] = [];
			}
			acc[meal.mealType].push(meal);
			return acc;
		}, {});

		return res.status(200).json({ date, meals, groupedMeals });
	} catch (error) {
		console.error("Get today meals error:", error);
		return res.status(500).json({ error: "Something went wrong" });
	}
}

async function createMeal(req, res) {
	try {
		const userId = req.user.userId;
		const { foodItemId, quantity, unit, mealType, date } = req.body;

		if (!foodItemId || !quantity || !mealType) {
			return res.status(400).json({
				error: "foodItemId, quantity, and mealType are required",
			});
		}

		const normalizedQuantity = Number(quantity);
		if (!Number.isFinite(normalizedQuantity) || normalizedQuantity <= 0) {
			return res.status(400).json({ error: "quantity must be a positive number" });
		}

		const foodItem = await FoodItem.findById(foodItemId);
		if (!foodItem) {
			return res.status(404).json({ error: "Food item not found" });
		}

		const dailyLog = await ensureDailyLog(userId, date || formatDateKey());
		const normalizedQuantityForCalculation = normalizeQuantityForCalculation(
			foodItem,
			normalizedQuantity,
			unit || resolveDefaultUnit(foodItem) || foodItem.servingUnit || "g"
		);
		const multiplier = normalizedQuantityForCalculation / foodItem.servingSize;

		const mealEntry = await MealEntry.create({
			dailyLogId: dailyLog._id,
			mealType: String(mealType).trim().toLowerCase(),
			foodItemId: foodItem._id,
			quantity: normalizedQuantity,
			unit: unit || foodItem.servingUnit || "g",
			calories: Number((foodItem.caloriesPer * multiplier).toFixed(2)),
			proteinG: Number((foodItem.proteinG * multiplier).toFixed(2)),
			carbsG: Number((foodItem.carbsG * multiplier).toFixed(2)),
			fatG: Number((foodItem.fatG * multiplier).toFixed(2)),
		});

		await applyDailyLogNutritionDelta(dailyLog._id, {
			calories: mealEntry.calories,
			proteinG: mealEntry.proteinG,
			carbsG: mealEntry.carbsG,
			fatG: mealEntry.fatG,
		});

		return res.status(201).json({
			message: "Meal added successfully",
			meal: toMealResponse(mealEntry, foodItem),
		});
	} catch (error) {
		console.error("Create meal error:", error);
		return res.status(500).json({ error: "Something went wrong" });
	}
}

async function deleteMeal(req, res) {
	try {
		const userId = req.user.userId;
		const { id } = req.params;

		const mealEntry = await MealEntry.findById(id);
		if (!mealEntry) {
			return res.status(404).json({ error: "Meal entry not found" });
		}

		const dailyLog = await DailyLog.findById(mealEntry.dailyLogId);
		if (!dailyLog || dailyLog.userId !== userId) {
			return res.status(403).json({ error: "Not allowed to delete this meal" });
		}

		await MealEntry.deleteOne({ _id: id });
		await applyDailyLogNutritionDelta(dailyLog._id, {
			calories: -mealEntry.calories,
			proteinG: -mealEntry.proteinG,
			carbsG: -mealEntry.carbsG,
			fatG: -mealEntry.fatG,
		});

		return res.status(200).json({ message: "Meal deleted successfully" });
	} catch (error) {
		console.error("Delete meal error:", error);
		return res.status(500).json({ error: "Something went wrong" });
	}
}

module.exports = {
	getTodayMeals,
	createMeal,
	deleteMeal,
};
