const mongoose = require("mongoose");
const { randomUUID } = require("crypto");

const mealEntrySchema = new mongoose.Schema(
  {
    _id: { type: String, default: () => randomUUID() },
    dailyLogId: { type: String, required: true },
    mealType: { type: String, required: true },
    foodItemId: { type: String, required: true },
    quantity: { type: Number, required: true },
    unit: { type: String, required: true },
    calories: { type: Number, required: true },
    proteinG: { type: Number, default: 0 },
    carbsG: { type: Number, default: 0 },
    fatG: { type: Number, default: 0 },
    loggedAt: { type: Date, default: Date.now },
  },
  {
    versionKey: false,
  }
);

mealEntrySchema.index({ dailyLogId: 1 });
mealEntrySchema.index({ foodItemId: 1 });

module.exports =
  mongoose.models.MealEntry || mongoose.model("MealEntry", mealEntrySchema);
