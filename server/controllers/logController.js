const DailyLog = require("../models/DailyLog");
const FoodItem = require("../models/FoodItem");
const MealEntry = require("../models/MealEntry");
const WaterEntry = require("../models/WaterEntry");
const { formatDateKey } = require("../utils/dailyLog");
const { toSectionCategory } = require("../utils/foodCatalog");

function monthRange(year, month) {
	const start = `${year}-${String(month).padStart(2, "0")}-01`;
	const lastDay = new Date(year, month, 0).getDate();
	const end = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
	return { start, end };
}

async function buildLogPayload(dailyLog) {
	if (!dailyLog) {
		return null;
	}

	const [mealEntries, waterEntries] = await Promise.all([
		MealEntry.find({ dailyLogId: dailyLog._id }).sort({ loggedAt: -1 }).lean(),
		WaterEntry.find({ dailyLogId: dailyLog._id }).sort({ loggedAt: -1 }).lean(),
	]);

	const foodIds = [...new Set(mealEntries.map((entry) => entry.foodItemId))];
	const foods = await FoodItem.find({ _id: { $in: foodIds } }).lean();
	const foodsById = new Map(foods.map((food) => [food._id, food]));

	const meals = mealEntries.map((entry) => ({
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
		foodItem: foodsById.get(entry.foodItemId)
			? {
					id: foodsById.get(entry.foodItemId)._id,
					name: foodsById.get(entry.foodItemId).name,
					category: toSectionCategory(
						foodsById.get(entry.foodItemId).category,
						foodsById.get(entry.foodItemId).name,
						foodsById.get(entry.foodItemId).brand
					),
				}
			: null,
	}));

	const groupedMeals = meals.reduce((acc, meal) => {
		if (!acc[meal.mealType]) {
			acc[meal.mealType] = [];
		}
		acc[meal.mealType].push(meal);
		return acc;
	}, {});

	return {
		id: dailyLog._id,
		date: dailyLog.date,
		userId: dailyLog.userId,
		totalCalories: dailyLog.totalCalories,
		totalProteinG: dailyLog.totalProteinG,
		totalCarbsG: dailyLog.totalCarbsG,
		totalFatG: dailyLog.totalFatG,
		totalWaterMl: dailyLog.totalWaterMl,
		meals,
		groupedMeals,
		waterEntries: waterEntries.map((entry) => ({
			id: entry._id,
			amountMl: entry.amountMl,
			loggedAt: entry.loggedAt,
		})),
	};
}

async function getTodayLog(req, res) {
	try {
		const userId = req.user.userId;
		const date = req.query.date || formatDateKey();
		const dailyLog = await DailyLog.findOne({ userId, date }).lean();

		if (!dailyLog) {
			return res.status(200).json({
				log: {
					date,
					totalCalories: 0,
					totalProteinG: 0,
					totalCarbsG: 0,
					totalFatG: 0,
					totalWaterMl: 0,
					meals: [],
					groupedMeals: {},
					waterEntries: [],
				},
			});
		}

		const log = await buildLogPayload(dailyLog);
		return res.status(200).json({ log });
	} catch (error) {
		console.error("Get today log error:", error);
		return res.status(500).json({ error: "Something went wrong" });
	}
}

async function getMonthlyLogs(req, res) {
	try {
		const userId = req.user.userId;
		const now = new Date();
		const month = Number(req.query.month || now.getMonth() + 1);
		const year = Number(req.query.year || now.getFullYear());
		const { start, end } = monthRange(year, month);

		const logs = await DailyLog.find({
			userId,
			date: { $gte: start, $lte: end },
		})
			.sort({ date: 1 })
			.lean();

		return res.status(200).json({
			month,
			year,
			logs: logs.map((log) => ({
				id: log._id,
				date: log.date,
				totalCalories: log.totalCalories,
				totalProteinG: log.totalProteinG,
				totalCarbsG: log.totalCarbsG,
				totalFatG: log.totalFatG,
				totalWaterMl: log.totalWaterMl,
			})),
		});
	} catch (error) {
		console.error("Get monthly logs error:", error);
		return res.status(500).json({ error: "Something went wrong" });
	}
}

async function getLogByDate(req, res) {
	try {
		const userId = req.user.userId;
		const { date } = req.params;
		const dailyLog = await DailyLog.findOne({ userId, date }).lean();

		if (!dailyLog) {
			return res.status(200).json({
				log: {
					date,
					totalCalories: 0,
					totalProteinG: 0,
					totalCarbsG: 0,
					totalFatG: 0,
					totalWaterMl: 0,
					meals: [],
					groupedMeals: {},
					waterEntries: [],
				},
			});
		}

		const log = await buildLogPayload(dailyLog);
		return res.status(200).json({ log });
	} catch (error) {
		console.error("Get log by date error:", error);
		return res.status(500).json({ error: "Something went wrong" });
	}
}

async function resetTodayLog(req, res) {
	try {
		const userId = req.user.userId;
		const date = req.query.date || formatDateKey();
		const dailyLog = await DailyLog.findOne({ userId, date });

		if (!dailyLog) {
			return res.status(200).json({ message: "Already empty" });
		}

		// Delete all meal and water entries for today
		await MealEntry.deleteMany({ dailyLogId: dailyLog._id });
		await WaterEntry.deleteMany({ dailyLogId: dailyLog._id });

		// Reset daily log counters
		dailyLog.totalCalories = 0;
		dailyLog.totalProteinG = 0;
		dailyLog.totalCarbsG = 0;
		dailyLog.totalFatG = 0;
		dailyLog.totalWaterMl = 0;
		await dailyLog.save();

		return res.status(200).json({ message: "Dashboard reset successfully" });
	} catch (error) {
		console.error("Reset today log error:", error);
		return res.status(500).json({ error: "Failed to reset dashboard" });
	}
}

module.exports = {
	getTodayLog,
	getMonthlyLogs,
	getLogByDate,
	resetTodayLog,
};
