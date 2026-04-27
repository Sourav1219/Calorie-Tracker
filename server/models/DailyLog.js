const mongoose = require("mongoose");
const { randomUUID } = require("crypto");

const dailyLogSchema = new mongoose.Schema(
  {
    _id: { type: String, default: () => randomUUID() },
    userId: { type: String, required: true },
    date: { type: String, required: true },
    totalCalories: { type: Number, default: 0 },
    totalProteinG: { type: Number, default: 0 },
    totalCarbsG: { type: Number, default: 0 },
    totalFatG: { type: Number, default: 0 },
    totalWaterMl: { type: Number, default: 0 },
  },
  {
    versionKey: false,
  }
);

dailyLogSchema.index({ userId: 1, date: 1 }, { unique: true });

module.exports =
  mongoose.models.DailyLog || mongoose.model("DailyLog", dailyLogSchema);
