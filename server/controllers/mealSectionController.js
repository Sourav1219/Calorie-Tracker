const MealSection = require("../models/MealSection");
const MealEntry = require("../models/MealEntry");
const DailyLog = require("../models/DailyLog");
const { formatDateKey, applyDailyLogNutritionDelta } = require("../utils/dailyLog");

const DEFAULT_SECTIONS = [
  { name: "Breakfast", icon: "☕", sortOrder: 0 },
  { name: "Lunch", icon: "🥘", sortOrder: 1 },
  { name: "Snacks", icon: "🍪", sortOrder: 2 },
  { name: "Dinner", icon: "🍽️", sortOrder: 3 },
];

async function getSections(req, res) {
  try {
    const userId = req.user.userId;
    let sections = await MealSection.find({ userId }).sort({ name: 1 });

    // For existing users who don't have seeded sections
    if (sections.length === 0) {
      const toInsert = DEFAULT_SECTIONS.map(s => ({ ...s, userId }));
      const inserted = await MealSection.insertMany(toInsert);
      sections = inserted.sort((a, b) => a.name.localeCompare(b.name));

      // Migrate existing meal entries safely for this user only
      const DailyLog = require("../models/DailyLog");
      const userLogs = await DailyLog.find({ userId }, '_id');
      const userLogIds = userLogs.map(l => String(l._id));

      const mapOldToNew = {
        "breakfast": sections.find(s => s.name === "Breakfast")?._id,
        "lunch": sections.find(s => s.name === "Lunch")?._id,
        "snacks": sections.find(s => s.name === "Snacks")?._id,
        "dinner": sections.find(s => s.name === "Dinner")?._id,
      };

      for (const [oldType, newId] of Object.entries(mapOldToNew)) {
        if (newId && userLogIds.length > 0) {
          await MealEntry.updateMany(
            { mealType: oldType, dailyLogId: { $in: userLogIds } },
            { $set: { mealType: String(newId) } }
          );
        }
      }
    }

    return res.status(200).json({ sections });
  } catch (error) {
    console.error("getSections error:", error);
    return res.status(500).json({ error: "Failed to fetch meal sections" });
  }
}

async function createSection(req, res) {
  try {
    const userId = req.user.userId;
    const { name, icon } = req.body;

    if (!name || name.trim().length === 0) {
      return res.status(400).json({ error: "Name is required" });
    }
    if (name.trim().length > 30) {
      return res.status(400).json({ error: "Name cannot exceed 30 characters" });
    }

    const count = await MealSection.countDocuments({ userId });
    if (count >= 10) {
      return res.status(400).json({ error: "You've reached the limit of 10 sections" });
    }

    const section = await MealSection.create({
      userId,
      name: name.trim(),
      icon: icon || "",
      sortOrder: count,
    });

    return res.status(201).json({ section });
  } catch (error) {
    console.error("createSection error:", error);
    return res.status(500).json({ error: "Failed to create meal section" });
  }
}

async function updateSection(req, res) {
  try {
    const userId = req.user.userId;
    const { id } = req.params;
    const { name, icon } = req.body;

    const section = await MealSection.findOne({ _id: id, userId });
    if (!section) {
      return res.status(404).json({ error: "Section not found" });
    }

    if (name !== undefined) {
      if (name.trim().length === 0) return res.status(400).json({ error: "Name is required" });
      if (name.trim().length > 30) return res.status(400).json({ error: "Name cannot exceed 30 characters" });
      section.name = name.trim();
    }
    if (icon !== undefined) {
      section.icon = icon;
    }

    await section.save();

    return res.status(200).json({ section });
  } catch (error) {
    console.error("updateSection error:", error);
    return res.status(500).json({ error: "Failed to update meal section" });
  }
}

async function deleteSection(req, res) {
  try {
    const userId = req.user.userId;
    const { id } = req.params;

    const count = await MealSection.countDocuments({ userId });
    if (count <= 1) {
      return res.status(400).json({ error: "You must have at least one meal section" });
    }

    const section = await MealSection.findOne({ _id: id, userId });
    if (!section) {
      return res.status(404).json({ error: "Section not found" });
    }

    // Find today's daily log and subtract calories from deleted section's entries
    const today = formatDateKey();
    const dailyLog = await DailyLog.findOne({ userId, date: today });

    if (dailyLog) {
      // Find all of today's entries for this section
      const todayEntries = await MealEntry.find({
        dailyLogId: dailyLog._id,
        mealType: String(id),
      }).lean();

      if (todayEntries.length > 0) {
        // Sum up nutrition from today's entries
        const totalCal = todayEntries.reduce((sum, e) => sum + (e.calories || 0), 0);
        const totalProtein = todayEntries.reduce((sum, e) => sum + (e.proteinG || 0), 0);
        const totalCarbs = todayEntries.reduce((sum, e) => sum + (e.carbsG || 0), 0);
        const totalFat = todayEntries.reduce((sum, e) => sum + (e.fatG || 0), 0);

        // Subtract from daily log
        await applyDailyLogNutritionDelta(dailyLog._id, {
          calories: -totalCal,
          proteinG: -totalProtein,
          carbsG: -totalCarbs,
          fatG: -totalFat,
        });

        // Delete only today's entries (past entries remain for calendar history)
        await MealEntry.deleteMany({
          dailyLogId: dailyLog._id,
          mealType: String(id),
        });
      }
    }

    await MealSection.deleteOne({ _id: id });

    return res.status(200).json({ message: "Section deleted successfully" });
  } catch (error) {
    console.error("deleteSection error:", error);
    return res.status(500).json({ error: "Failed to delete meal section" });
  }
}

async function reorderSections(req, res) {
  try {
    const userId = req.user.userId;
    const { orderIds } = req.body; // Array of section IDs in the new order

    if (!Array.isArray(orderIds)) {
      return res.status(400).json({ error: "orderIds must be an array" });
    }

    const bulkOps = orderIds.map((id, index) => ({
      updateOne: {
        filter: { _id: id, userId },
        update: { $set: { sortOrder: index } }
      }
    }));

    if (bulkOps.length > 0) {
      await MealSection.bulkWrite(bulkOps);
    }

    return res.status(200).json({ message: "Sections reordered successfully" });
  } catch (error) {
    console.error("reorderSections error:", error);
    return res.status(500).json({ error: "Failed to reorder sections" });
  }
}

module.exports = {
  getSections,
  createSection,
  updateSection,
  deleteSection,
  reorderSections
};
