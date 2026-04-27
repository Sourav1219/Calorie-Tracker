const dotenv = require("dotenv");
const mongoose = require("mongoose");
const FoodItem = require("../models/FoodItem");

dotenv.config();

// [name, cal, protein, carbs, fat, fibre, sugar, sodium]
// All values per 100g serving

const indianBreads = [
  ["Roti (wheat chapati)", 297, 9.0, 54.0, 4.0, 2.7, 0.5, 320],
  ["Whole wheat paratha", 326, 8.5, 45.0, 13.5, 2.4, 1.2, 410],
  ["Aloo paratha", 280, 6.0, 38.0, 12.0, 2.0, 1.5, 380],
  ["Puri (deep fried)", 432, 7.0, 46.0, 25.0, 1.5, 0.8, 290],
  ["Naan (plain)", 291, 8.5, 50.0, 6.0, 2.0, 2.5, 540],
  ["Butter naan", 330, 8.0, 48.0, 12.0, 1.8, 3.0, 580],
  ["Bhatura", 335, 6.5, 40.0, 16.5, 1.2, 1.5, 310],
  ["Missi roti", 280, 12.0, 42.0, 7.0, 4.5, 1.0, 350],
  ["Makki di roti", 350, 8.5, 67.0, 5.0, 3.8, 1.2, 280],
  ["Besan chilla", 240, 14.0, 30.0, 8.0, 5.0, 2.0, 420],
  ["Dosa (plain)", 168, 3.9, 27.0, 5.2, 1.0, 0.6, 310],
  ["Uttapam", 195, 5.5, 28.0, 6.5, 1.8, 1.5, 350],
  ["Appam", 148, 2.5, 28.0, 3.0, 0.8, 2.0, 180],
  ["Idli (plain)", 130, 3.9, 24.0, 1.5, 0.9, 0.5, 290],
  ["Poori", 432, 7.0, 46.0, 25.0, 1.5, 0.8, 290],
];

const riceGrains = [
  ["Steamed white rice", 130, 2.7, 28.0, 0.3, 0.4, 0.1, 5],
  ["Brown rice (cooked)", 123, 2.7, 25.5, 1.0, 1.8, 0.4, 4],
  ["Pulao (veg)", 145, 3.0, 22.0, 5.0, 1.2, 1.0, 380],
  ["Biryani (chicken)", 175, 10.5, 18.0, 7.5, 0.8, 0.9, 420],
  ["Biryani (veg)", 155, 3.5, 24.0, 5.5, 1.5, 1.2, 350],
  ["Khichdi", 125, 4.5, 18.0, 3.5, 1.5, 0.6, 340],
  ["Poha (flattened rice)", 250, 5.0, 40.0, 8.0, 1.5, 2.5, 310],
  ["Upma (semolina)", 155, 4.5, 22.0, 5.5, 1.8, 1.2, 380],
  ["Daliya (broken wheat)", 120, 4.8, 22.0, 1.5, 4.5, 0.8, 290],
  ["Sabudana khichdi", 175, 2.0, 32.0, 5.0, 0.5, 1.0, 310],
  ["Curd rice", 130, 3.5, 20.0, 3.5, 0.3, 2.0, 280],
  ["Lemon rice", 155, 2.8, 28.0, 4.0, 0.8, 0.6, 350],
  ["Fried rice (veg)", 170, 3.5, 26.0, 6.0, 1.5, 1.5, 480],
  ["Jeera rice", 145, 2.8, 28.0, 2.5, 0.5, 0.2, 320],
  ["Pongal", 140, 4.0, 20.0, 5.0, 1.2, 0.8, 360],
];

const dalLegumes = [
  ["Dal tadka (yellow)", 120, 7.0, 15.0, 3.5, 3.0, 1.0, 350],
  ["Rajma (kidney beans)", 130, 7.5, 18.0, 3.0, 5.5, 1.5, 380],
  ["Chole (chickpeas)", 140, 7.5, 19.0, 4.0, 5.0, 2.5, 420],
  ["Moong dal (yellow)", 105, 7.5, 14.0, 2.0, 2.5, 0.8, 310],
  ["Masoor dal (red)", 116, 9.0, 16.0, 1.5, 3.5, 0.6, 300],
  ["Chana dal", 125, 8.0, 17.0, 3.0, 4.0, 1.2, 290],
  ["Urad dal (black)", 118, 7.5, 15.0, 3.5, 3.0, 0.7, 320],
  ["Lobiya (black-eyed peas)", 115, 7.0, 17.0, 2.0, 4.5, 1.2, 310],
  ["Dal makhani", 155, 6.5, 14.0, 8.5, 3.0, 1.5, 450],
  ["Sambar", 78, 3.5, 10.0, 2.5, 2.5, 2.0, 520],
  ["Rasam", 32, 1.0, 5.0, 1.0, 0.8, 1.0, 480],
  ["Sprouted moong", 105, 7.5, 14.0, 1.5, 4.0, 1.2, 15],
  ["Besan (gram flour raw)", 387, 22.0, 58.0, 7.0, 10.8, 3.0, 64],
  ["Soya chunks (dry)", 345, 52.0, 33.0, 0.5, 13.0, 0.0, 50],
  ["Tofu", 76, 8.0, 1.9, 4.8, 0.3, 0.7, 7],
];

const vegCurries = [
  ["Aloo sabzi (dry)", 120, 2.5, 16.0, 5.5, 2.0, 1.5, 350],
  ["Baingan bharta", 92, 2.5, 8.0, 6.0, 3.5, 3.0, 380],
  ["Palak paneer", 155, 8.5, 6.5, 11.5, 2.5, 1.5, 420],
  ["Matar paneer", 165, 9.0, 9.0, 11.0, 2.5, 2.5, 400],
  ["Aloo gobi", 105, 3.0, 13.0, 5.0, 2.5, 2.0, 340],
  ["Bhindi masala", 95, 2.5, 9.0, 5.5, 3.5, 1.5, 320],
  ["Lauki curry", 55, 1.5, 7.0, 2.5, 1.5, 2.5, 300],
  ["Karela (bitter gourd)", 65, 2.0, 6.0, 3.5, 2.8, 1.0, 290],
  ["Mixed veg curry", 98, 3.0, 10.0, 5.5, 3.0, 2.5, 380],
  ["Aloo matar", 110, 3.0, 14.0, 4.5, 2.5, 2.0, 350],
  ["Jeera aloo", 115, 2.5, 16.0, 5.0, 1.8, 1.0, 330],
  ["Mushroom masala", 95, 4.0, 7.0, 6.0, 2.0, 1.5, 360],
  ["Egg curry", 155, 11.0, 5.0, 10.5, 0.8, 1.5, 450],
  ["Baingan masala", 88, 2.0, 8.5, 5.5, 3.0, 2.5, 370],
  ["Shimla mirch (capsicum)", 75, 2.0, 8.0, 4.0, 2.5, 3.0, 290],
  ["Methi sabzi", 80, 3.0, 6.0, 5.0, 3.5, 1.0, 310],
  ["Saag (mustard leaves)", 70, 3.5, 5.0, 4.0, 3.0, 1.0, 280],
  ["Drumstick curry", 65, 2.5, 8.0, 3.0, 2.0, 2.0, 320],
  ["Tinda sabzi", 58, 1.5, 7.0, 3.0, 2.0, 1.5, 270],
  ["Parwal sabzi", 62, 2.0, 7.5, 3.0, 2.5, 1.5, 280],
];

const dairy = [
  ["Full fat milk (3.5%)", 67, 3.3, 4.7, 3.6, 0.0, 4.7, 44],
  ["Toned milk (1.5%)", 47, 3.2, 4.9, 1.5, 0.0, 4.9, 48],
  ["Skim milk (0%)", 34, 3.4, 5.0, 0.1, 0.0, 5.0, 52],
  ["Curd (whole milk)", 60, 3.5, 4.7, 3.3, 0.0, 4.7, 46],
  ["Low fat curd", 42, 3.8, 5.5, 0.7, 0.0, 5.5, 50],
  ["Paneer (fresh)", 265, 18.3, 3.6, 20.8, 0.0, 0.5, 18],
  ["Butter (salted)", 717, 0.9, 0.1, 81.1, 0.0, 0.1, 576],
  ["Desi ghee", 900, 0.0, 0.0, 100.0, 0.0, 0.0, 0],
  ["Processed cheese slice", 330, 20.0, 2.0, 27.0, 0.0, 1.0, 1240],
  ["Lassi (sweet)", 90, 2.8, 14.0, 2.5, 0.0, 12.0, 40],
];

const snacksStreet = [
  ["Samosa (veg)", 308, 5.0, 30.0, 19.0, 2.0, 1.5, 520],
  ["Onion pakora", 305, 5.5, 28.0, 19.5, 2.0, 2.0, 480],
  ["Dhokla", 175, 6.5, 27.0, 4.5, 1.5, 4.0, 530],
  ["Medu vada", 295, 9.0, 24.0, 18.5, 2.5, 1.0, 420],
  ["Pav bhaji", 195, 4.5, 24.0, 9.5, 3.0, 4.0, 520],
  ["Bhel puri", 210, 5.0, 32.0, 7.5, 2.5, 4.0, 480],
  ["Sev puri", 285, 5.5, 30.0, 16.0, 2.0, 3.0, 520],
  ["Dahi puri", 240, 4.5, 28.0, 12.5, 1.5, 5.0, 450],
  ["Aloo tikki", 205, 3.5, 25.0, 10.5, 2.0, 1.5, 430],
  ["Kachori", 365, 6.5, 36.0, 22.0, 2.5, 1.5, 480],
  ["Mathri", 490, 7.0, 45.0, 32.0, 2.0, 1.0, 520],
  ["Chakli", 465, 8.0, 52.0, 25.0, 3.0, 1.0, 560],
  ["Namkeen sev", 530, 14.0, 42.0, 35.0, 3.5, 1.0, 680],
  ["Murukku", 450, 6.5, 55.0, 23.0, 2.0, 0.8, 540],
  ["Popcorn (salted)", 375, 11.0, 74.0, 4.3, 14.5, 0.9, 650],
  ["Roasted chana", 369, 22.0, 58.0, 5.0, 15.0, 2.5, 24],
  ["Roasted peanuts", 585, 26.0, 16.0, 49.0, 8.5, 4.0, 410],
  ["Moong dal namkeen", 510, 18.0, 40.0, 32.0, 4.0, 1.5, 620],
  ["Banana chips", 520, 2.0, 58.0, 32.0, 4.0, 14.0, 280],
  ["Khakhra", 420, 12.0, 60.0, 15.0, 5.0, 2.0, 580],
];

const fruits = [
  ["Banana (ripe)", 89, 1.1, 22.8, 0.3, 2.6, 12.2, 1],
  ["Apple (with skin)", 52, 0.3, 13.8, 0.2, 2.4, 10.4, 1],
  ["Mango (alphonso)", 60, 0.8, 15.0, 0.4, 1.6, 13.7, 1],
  ["Guava", 68, 2.6, 14.3, 1.0, 5.4, 8.9, 2],
  ["Papaya", 43, 0.5, 11.0, 0.3, 1.7, 7.8, 8],
  ["Orange", 47, 0.9, 11.8, 0.1, 2.4, 9.4, 0],
  ["Watermelon", 30, 0.6, 7.6, 0.2, 0.4, 6.2, 1],
  ["Grapes (black)", 69, 0.7, 18.1, 0.2, 0.9, 15.5, 2],
  ["Pomegranate (seeds)", 83, 1.7, 18.7, 1.2, 4.0, 13.7, 3],
  ["Pineapple", 50, 0.5, 13.1, 0.1, 1.4, 9.9, 1],
  ["Chikoo (sapota)", 83, 0.4, 20.0, 1.1, 5.3, 14.0, 12],
  ["Litchi", 66, 0.8, 16.5, 0.4, 1.3, 15.2, 1],
  ["Jamun (java plum)", 60, 0.7, 15.6, 0.2, 0.6, 14.0, 14],
  ["Amla (gooseberry)", 44, 0.9, 10.2, 0.6, 4.3, 4.0, 2],
  ["Pear", 57, 0.4, 15.2, 0.1, 3.1, 9.8, 1],
];

const beverages = [
  ["Chai (milk + sugar, homemade)", 50, 1.8, 8.0, 1.5, 0.0, 6.5, 25],
  ["Masala chai", 55, 1.8, 8.5, 1.8, 0.1, 6.5, 28],
  ["Black coffee (no sugar)", 2, 0.3, 0.0, 0.0, 0.0, 0.0, 5],
  ["Instant coffee with milk", 38, 1.5, 5.0, 1.5, 0.0, 4.5, 20],
  ["Fresh lime water (salted)", 8, 0.1, 2.0, 0.0, 0.1, 1.0, 380],
  ["Coconut water", 19, 0.7, 3.7, 0.2, 1.1, 2.6, 105],
  ["Sugarcane juice", 73, 0.2, 18.2, 0.0, 0.0, 17.0, 12],
  ["Nimbu pani (lemon water sweet)", 30, 0.1, 8.0, 0.0, 0.0, 7.0, 180],
  ["Lassi (mango)", 95, 2.5, 16.0, 2.5, 0.3, 13.0, 35],
  ["Cold coffee (with milk)", 62, 1.8, 9.0, 2.2, 0.0, 8.0, 30],
];

const nonVeg = [
  ["Chicken curry (home style)", 155, 16.0, 4.5, 8.5, 0.5, 1.0, 450],
  ["Chicken tikka (grilled)", 148, 25.0, 3.0, 4.5, 0.5, 0.5, 520],
  ["Tandoori chicken", 165, 24.0, 3.5, 6.5, 0.3, 0.5, 540],
  ["Butter chicken", 185, 14.5, 6.5, 12.0, 0.5, 2.5, 480],
  ["Egg boiled", 155, 12.6, 1.1, 10.6, 0.0, 1.1, 124],
  ["Egg bhurji (scrambled)", 170, 11.5, 2.5, 13.0, 0.5, 1.0, 380],
  ["Egg omelette (plain)", 154, 10.6, 0.7, 12.0, 0.0, 0.4, 310],
  ["Fish curry (mustard)", 125, 14.0, 4.0, 6.0, 0.5, 1.0, 420],
  ["Fish fry (shallow)", 220, 18.0, 8.0, 13.5, 0.5, 0.5, 380],
  ["Prawn masala", 115, 16.0, 4.5, 4.0, 0.5, 1.0, 460],
  ["Mutton curry", 195, 16.0, 3.5, 13.5, 0.3, 1.0, 440],
  ["Keema (minced meat)", 180, 15.0, 3.0, 12.5, 0.5, 0.5, 420],
  ["Chicken biryani", 175, 10.5, 18.0, 7.5, 0.8, 0.9, 420],
  ["Mutton biryani", 190, 11.0, 17.0, 9.0, 0.8, 1.0, 440],
  ["Egg fried rice", 165, 6.5, 22.0, 6.0, 1.0, 1.0, 460],
];

const fastFoodBakery = [
  ["Veg burger (homemade)", 210, 6.5, 28.0, 8.5, 2.0, 4.0, 480],
  ["Pizza (veg, thin crust)", 240, 9.0, 28.0, 10.5, 2.0, 3.5, 580],
  ["Instant noodles (Maggi)", 390, 8.5, 52.0, 16.5, 2.0, 2.0, 1120],
  ["Pasta (white sauce)", 175, 5.5, 20.0, 8.5, 1.0, 2.0, 380],
  ["Veg sandwich", 185, 5.5, 25.0, 7.0, 2.0, 3.5, 420],
  ["Club sandwich", 225, 10.0, 22.0, 11.0, 1.5, 3.0, 540],
  ["Paneer roll", 210, 9.5, 22.0, 10.0, 1.5, 2.0, 460],
  ["Egg roll", 215, 10.5, 20.0, 10.5, 1.0, 2.0, 480],
  ["Spring roll (veg)", 265, 4.5, 28.0, 15.0, 1.5, 2.0, 520],
  ["Bread white slice", 265, 9.0, 49.0, 3.2, 2.7, 5.0, 490],
  ["Brown bread slice", 250, 10.0, 46.0, 3.5, 6.0, 4.5, 480],
  ["Pav (dinner roll)", 290, 8.5, 52.0, 5.5, 2.0, 5.0, 510],
  ["Croissant", 406, 8.2, 45.8, 21.0, 2.3, 7.5, 410],
  ["Cream biscuit", 490, 5.5, 62.0, 24.0, 1.0, 28.0, 320],
  ["Marie biscuit", 420, 7.0, 72.0, 11.5, 1.5, 22.0, 380],
];

const categories = [
  { name: "Indian Breads", data: indianBreads },
  { name: "Rice & Grains", data: riceGrains },
  { name: "Dal & Legumes", data: dalLegumes },
  { name: "Vegetables & Curries", data: vegCurries },
  { name: "Dairy", data: dairy },
  { name: "Snacks & Street Food", data: snacksStreet },
  { name: "Fruits", data: fruits },
  { name: "Beverages", data: beverages },
  { name: "Non-Vegetarian", data: nonVeg },
  { name: "Fast Food & Bakery", data: fastFoodBakery },
];

function toFoodItem(category, row) {
  const [name, cal, protein, carbs, fat, fibre, sugar, sodium] = row;
  return {
    name,
    brand: null,
    category,
    servingSize: 100,
    servingUnit: "g",
    caloriesPer: cal,
    proteinG: protein,
    carbsG: carbs,
    fatG: fat,
    fibreG: fibre,
    sugarG: sugar,
    sodiumMg: sodium,
    isVerified: true,
    createdBy: null,
  };
}

function shouldRepairFood(existingFood) {
  if (!existingFood) {
    return false;
  }

  const requiredFields = [
    "category",
    "servingSize",
    "servingUnit",
    "caloriesPer",
    "proteinG",
    "carbsG",
    "fatG",
    "fibreG",
    "sugarG",
    "sodiumMg",
  ];

  return requiredFields.some((field) => {
    const value = existingFood[field];
    return value === undefined || value === null || value === "";
  });
}

function buildRepairPayload(seedFood, existingFood) {
  const payload = {};

  Object.entries(seedFood).forEach(([field, seedValue]) => {
    const currentValue = existingFood[field];
    if (currentValue === undefined || currentValue === null || currentValue === "") {
      payload[field] = seedValue;
    }
  });

  if (existingFood.isVerified !== true) {
    payload.isVerified = true;
  }

  return payload;
}

async function main() {
  console.log("🌱 Starting seed...\n");

  const mongoUri = process.env.MONGODB_URI || process.env.DATABASE_URL;
  if (!mongoUri) {
    throw new Error("Missing MongoDB connection string (MONGODB_URI)");
  }

  await mongoose.connect(mongoUri, {
    serverSelectionTimeoutMS: 5000,
  });

  let inserted = 0;
  let updated = 0;
  let skipped = 0;

  for (const cat of categories) {
    const items = cat.data.map((row) => toFoodItem(cat.name, row));

    for (const item of items) {
      const existingFood = await FoodItem.findOne({
        name: item.name,
        category: item.category,
      });

      if (!existingFood) {
        await FoodItem.create(item);
        inserted += 1;
        continue;
      }

      if (shouldRepairFood(existingFood)) {
        const repairPayload = buildRepairPayload(item, existingFood);
        if (Object.keys(repairPayload).length > 0) {
          await FoodItem.updateOne({ _id: existingFood._id }, { $set: repairPayload });
          updated += 1;
          continue;
        }
      }

      skipped += 1;
    }

    console.log(`Checked: ${cat.name} (${items.length} items)`);
  }

  console.log(`\n✅ Inserted missing items: ${inserted}`);
  console.log(`🛠️  Repaired incomplete items: ${updated}`);
  console.log(`⏭️  Already complete items: ${skipped}`);
  console.log("🎉 Seed completed successfully!");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
