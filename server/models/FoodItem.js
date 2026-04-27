const mongoose = require("mongoose");
const { randomUUID } = require("crypto");

const measurementOptionSchema = new mongoose.Schema(
  {
    unit: { type: String, required: true },
    grams: { type: Number, required: true },
    label: { type: String, default: null },
  },
  {
    _id: false,
  }
);

const foodItemSchema = new mongoose.Schema(
  {
    _id: { type: String, default: () => randomUUID() },
    name: { type: String, required: true, trim: true },
    brand: { type: String, default: null },
    category: { type: String, default: null },
    servingSize: { type: Number, default: 100 },
    servingUnit: { type: String, default: "g" },
    defaultMeasurementUnit: { type: String, default: null },
    defaultQuantity: { type: Number, default: null },
    measurementOptions: { type: [measurementOptionSchema], default: [] },
    caloriesPer: { type: Number, required: true },
    proteinG: { type: Number, default: 0 },
    carbsG: { type: Number, default: 0 },
    fatG: { type: Number, default: 0 },
    fibreG: { type: Number, default: 0 },
    sugarG: { type: Number, default: 0 },
    sodiumMg: { type: Number, default: 0 },
    isVerified: { type: Boolean, default: false },
    createdBy: { type: String, default: null },
    createdAt: { type: Date, default: Date.now },
  },
  {
    versionKey: false,
  }
);

foodItemSchema.index({ name: 1 });
foodItemSchema.index({ category: 1 });

module.exports =
  mongoose.models.FoodItem || mongoose.model("FoodItem", foodItemSchema);
