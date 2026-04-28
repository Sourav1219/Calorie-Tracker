const mongoose = require('mongoose');
const FoodItem = require('./models/FoodItem');
require('dotenv').config();

async function checkItem() {
  await mongoose.connect(process.env.MONGODB_URI);
  const item = await FoodItem.findOne({ name: 'Amul Fresh Lassi' }).lean();
  console.log(JSON.stringify(item.measurementOptions, null, 2));
  await mongoose.disconnect();
}
checkItem();
