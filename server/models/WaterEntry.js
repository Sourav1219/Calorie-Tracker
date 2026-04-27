const mongoose = require("mongoose");
const { randomUUID } = require("crypto");

const waterEntrySchema = new mongoose.Schema(
  {
    _id: { type: String, default: () => randomUUID() },
    dailyLogId: { type: String, required: true },
    amountMl: { type: Number, required: true },
    loggedAt: { type: Date, default: Date.now },
  },
  {
    versionKey: false,
  }
);

waterEntrySchema.index({ dailyLogId: 1 });

module.exports =
  mongoose.models.WaterEntry || mongoose.model("WaterEntry", waterEntrySchema);
