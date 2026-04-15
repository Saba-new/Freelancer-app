import dotenv from "dotenv";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import User from "../src/models/User.js";

dotenv.config();

const accounts = [
  "freelancer@test.com",
  "k.sabarish2005@gmail.com",
];

const newPassword = "test123";

async function main() {
  try {
    await mongoose.connect(process.env.MONGO_URI);

    const hash = await bcrypt.hash(newPassword, 10);
    const result = await User.updateMany(
      { email: { $in: accounts } },
      { $set: { password: hash } }
    );

    const found = await User.find({ email: { $in: accounts } }).select("email role");

    if (found.length === 0) {
      console.log("No matching users found to reset.");
      return;
    }

    console.log("Password reset applied for:");
    found.forEach((user) => {
      console.log(`- ${user.email} (${user.role})`);
    });
    console.log(`Matched: ${result.matchedCount}, Updated: ${result.modifiedCount}`);
    console.log(`New password for both accounts: ${newPassword}`);
  } catch (error) {
    console.error("Password reset failed:", error.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
}

main();