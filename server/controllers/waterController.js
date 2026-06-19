const DailyLog = require("../models/DailyLog");
const WaterEntry = require("../models/WaterEntry");
const UserActivity = require("../models/UserActivity");
const {
	formatDateKey,
	ensureDailyLog,
	applyDailyLogNutritionDelta,
} = require("../utils/dailyLog");

function toWaterResponse(entry) {
	return {
		id: entry._id,
		dailyLogId: entry.dailyLogId,
		amountMl: entry.amountMl,
		loggedAt: entry.loggedAt,
	};
}

async function getTodayWater(req, res) {
	try {
		const userId = req.user.userId;
		const date = req.query.date || formatDateKey();

		const dailyLog = await DailyLog.findOne({ userId, date }).lean();
		if (!dailyLog) {
			return res.status(200).json({ date, totalWaterMl: 0, entries: [] });
		}

		const entries = await WaterEntry.find({ dailyLogId: dailyLog._id })
			.sort({ loggedAt: -1 })
			.lean();

		return res.status(200).json({
			date,
			totalWaterMl: dailyLog.totalWaterMl,
			entries: entries.map(toWaterResponse),
		});
	} catch (error) {
		console.error("Get today water error:", error);
		return res.status(500).json({ error: "Something went wrong" });
	}
}

async function createWaterEntry(req, res) {
	try {
		const userId = req.user.userId;
		const { amountMl, date } = req.body;
		const normalizedAmount = Number(amountMl);

		if (!Number.isFinite(normalizedAmount) || normalizedAmount <= 0) {
			return res.status(400).json({ error: "amountMl must be a positive number" });
		}
		if (normalizedAmount > 5000) {
			return res.status(400).json({ error: "amountMl is too large (max 5000 per entry)" });
		}

		const dailyLog = await ensureDailyLog(userId, date || formatDateKey());
		const entry = await WaterEntry.create({
			dailyLogId: dailyLog._id,
			amountMl: normalizedAmount,
		});

		await applyDailyLogNutritionDelta(dailyLog._id, {
			waterMl: normalizedAmount,
		});

		// Update user activity in background (don't wait)
		updateUserActivityAsync(userId).catch(err => 
			console.error("Failed to update user activity:", err)
		);

		return res.status(201).json({
			message: "Water logged successfully",
			entry: toWaterResponse(entry),
		});
	} catch (error) {
		console.error("Create water entry error:", error);
		return res.status(500).json({ error: "Something went wrong" });
	}
}

async function deleteWaterEntry(req, res) {
	try {
		const userId = req.user.userId;
		const { id } = req.params;

		const entry = await WaterEntry.findById(id);
		if (!entry) {
			return res.status(404).json({ error: "Water entry not found" });
		}

		const dailyLog = await DailyLog.findById(entry.dailyLogId);
		if (!dailyLog || dailyLog.userId !== userId) {
			return res.status(403).json({ error: "Not allowed to delete this water entry" });
		}

		await WaterEntry.deleteOne({ _id: id });
		await applyDailyLogNutritionDelta(dailyLog._id, { waterMl: -entry.amountMl });

		return res.status(200).json({ message: "Water entry deleted successfully" });
	} catch (error) {
		console.error("Delete water entry error:", error);
		return res.status(500).json({ error: "Something went wrong" });
	}
}

// Helper function to update user activity asynchronously
async function updateUserActivityAsync(userId) {
	const today = formatDateKey();
	
	let activity = await UserActivity.findOne({ userId });
	if (!activity) {
		activity = new UserActivity({ userId });
	}

	// Update last logged date
	if (activity.lastLoggedDate !== today) {
		activity.totalDaysLogged += 1;
		activity.lastLoggedDate = today;
	}

	await activity.save();
}

module.exports = {
	getTodayWater,
	createWaterEntry,
	deleteWaterEntry,
};
