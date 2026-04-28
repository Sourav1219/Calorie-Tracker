const DailyLog = require("../models/DailyLog");

function formatDateKey(input = new Date()) {
  // If already a valid YYYY-MM-DD string, return it as is to avoid timezone shifts
  if (typeof input === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(input)) {
    return input;
  }
  
  const date = input instanceof Date ? input : new Date(input);
  
  // Force Asia/Kolkata (IST) for date generation
  const istDateStr = date.toLocaleString("en-US", { timeZone: "Asia/Kolkata" });
  const istDate = new Date(istDateStr);
  
  const year = istDate.getFullYear();
  const month = String(istDate.getMonth() + 1).padStart(2, "0");
  const day = String(istDate.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

async function ensureDailyLog(userId, date = formatDateKey()) {
  let dailyLog = await DailyLog.findOne({ userId, date });
  if (!dailyLog) {
    dailyLog = await DailyLog.create({ userId, date });
  }
  return dailyLog;
}

async function applyDailyLogNutritionDelta(dailyLogId, delta) {
  const updates = {
    totalCalories: delta.calories || 0,
    totalProteinG: delta.proteinG || 0,
    totalCarbsG: delta.carbsG || 0,
    totalFatG: delta.fatG || 0,
    totalWaterMl: delta.waterMl || 0,
  };

  const dailyLog = await DailyLog.findById(dailyLogId);
  if (!dailyLog) {
    return null;
  }

  dailyLog.totalCalories = Math.max(0, dailyLog.totalCalories + updates.totalCalories);
  dailyLog.totalProteinG = Math.max(0, dailyLog.totalProteinG + updates.totalProteinG);
  dailyLog.totalCarbsG = Math.max(0, dailyLog.totalCarbsG + updates.totalCarbsG);
  dailyLog.totalFatG = Math.max(0, dailyLog.totalFatG + updates.totalFatG);
  dailyLog.totalWaterMl = Math.max(0, dailyLog.totalWaterMl + updates.totalWaterMl);

  await dailyLog.save();
  return dailyLog;
}

module.exports = {
  formatDateKey,
  ensureDailyLog,
  applyDailyLogNutritionDelta,
};
