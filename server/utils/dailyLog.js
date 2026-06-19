const { randomUUID } = require("crypto");
const DailyLog = require("../models/DailyLog");

function formatDateKey(input = new Date()) {
  // If already a valid YYYY-MM-DD string, return it as is to avoid timezone shifts
  if (typeof input === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(input)) {
    return input;
  }

  const date = input instanceof Date ? input : new Date(input);

  // Force Asia/Kolkata (IST) for the day boundary. en-CA formats as YYYY-MM-DD.
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

async function ensureDailyLog(userId, date = formatDateKey()) {
  // Atomic upsert avoids a findOne→create race that could violate the
  // unique (userId, date) index and 500 on the first concurrent log of a day.
  try {
    return await DailyLog.findOneAndUpdate(
      { userId, date },
      { $setOnInsert: { _id: randomUUID(), userId, date } },
      { upsert: true, new: true }
    );
  } catch (err) {
    // Two upserts raced and one hit the unique index — the doc exists now.
    if (err.code === 11000) {
      return DailyLog.findOne({ userId, date });
    }
    throw err;
  }
}

async function applyDailyLogNutritionDelta(dailyLogId, delta) {
  const inc = {
    totalCalories: delta.calories || 0,
    totalProteinG: delta.proteinG || 0,
    totalCarbsG: delta.carbsG || 0,
    totalFatG: delta.fatG || 0,
    totalWaterMl: delta.waterMl || 0,
  };

  // Atomic $inc prevents lost updates when requests overlap (e.g. rapid
  // water quick-adds), unlike a read-modify-write.
  const dailyLog = await DailyLog.findByIdAndUpdate(
    dailyLogId,
    { $inc: inc },
    { new: true }
  );
  if (!dailyLog) {
    return null;
  }

  // Safety net: clamp any total that somehow went negative back to 0.
  const clamp = {};
  for (const key of Object.keys(inc)) {
    if (dailyLog[key] < 0) {
      clamp[key] = 0;
      dailyLog[key] = 0;
    }
  }
  if (Object.keys(clamp).length > 0) {
    await DailyLog.updateOne({ _id: dailyLogId }, { $set: clamp });
  }

  return dailyLog;
}

module.exports = {
  formatDateKey,
  ensureDailyLog,
  applyDailyLogNutritionDelta,
};
