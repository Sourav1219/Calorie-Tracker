require("dotenv").config();
const mongoose = require("mongoose");
const User = require("../models/User");

async function main() {
  const email = process.argv[2]?.trim().toLowerCase();
  const rawValue = process.argv[3] ?? "true";
  const isAdmin = !["false", "0", "no"].includes(rawValue.toLowerCase());

  if (!email) {
    throw new Error("Usage: node scripts/setAdminRole.js <email> [true|false]");
  }

  await mongoose.connect(process.env.MONGODB_URI);

  const user = await User.findOneAndUpdate(
    { email },
    { $set: { isAdmin } },
    { new: true }
  ).lean();

  if (!user) {
    throw new Error(`User not found: ${email}`);
  }

  console.log(
    JSON.stringify(
      {
        email: user.email,
        isAdmin: user.isAdmin,
      },
      null,
      2
    )
  );

  await mongoose.disconnect();
}

main().catch(async (error) => {
  console.error(error.message || error);
  try {
    await mongoose.disconnect();
  } catch {}
  process.exit(1);
});