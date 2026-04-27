const mongoose = require("mongoose");
const { randomUUID } = require("crypto");

const issueSchema = new mongoose.Schema(
  {
    index: { type: Number, required: true },
    name: { type: String, default: null },
    category: { type: String, default: null },
    reason: { type: String, required: true },
    scope: { type: String, default: null },
  },
  { _id: false }
);

const bulkUploadHistorySchema = new mongoose.Schema(
  {
    _id: { type: String, default: () => randomUUID() },
    uploadedBy: { type: String, required: true },
    uploaderEmail: { type: String, required: true },
    sourceFormat: { type: String, default: "mixed" },
    totalCount: { type: Number, default: 0 },
    validCount: { type: Number, default: 0 },
    insertedCount: { type: Number, default: 0 },
    invalidCount: { type: Number, default: 0 },
    duplicateCount: { type: Number, default: 0 },
    invalidItems: { type: [issueSchema], default: [] },
    duplicateItems: { type: [issueSchema], default: [] },
    insertedNames: { type: [String], default: [] },
    createdAt: { type: Date, default: Date.now },
  },
  {
    versionKey: false,
  }
);

bulkUploadHistorySchema.index({ uploadedBy: 1, createdAt: -1 });

module.exports =
  mongoose.models.BulkUploadHistory ||
  mongoose.model("BulkUploadHistory", bulkUploadHistorySchema);