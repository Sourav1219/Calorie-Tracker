const mongoose = require("mongoose");
const { randomUUID } = require("crypto");

const mealSectionSchema = new mongoose.Schema(
  {
    _id: { type: String, default: () => randomUUID() },
    userId: { type: String, required: true },
    name: { type: String, required: true },
    icon: { type: String, default: "" },
    sortOrder: { type: Number, default: 0 },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  },
  {
    versionKey: false,
    timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' }
  }
);

mealSectionSchema.index({ userId: 1, sortOrder: 1 });

module.exports =
  mongoose.models.MealSection || mongoose.model("MealSection", mealSectionSchema);
