import dotenv from "dotenv";
import mongoose from "mongoose";
import User from "../src/models/User.js";

dotenv.config();

const emailsToDelete = [
  "k.sabarish20052gmail.com",
  "t.sabarish20052gmail.com",
];

async function main() {
  try {
    await mongoose.connect(process.env.MONGO_URI);

    const users = await User.find({ email: { $in: emailsToDelete } }).select("email role");

    if (users.length === 0) {
      console.log("No duplicate users found.");
      return;
    }

    console.log("Deleting these users:");
    users.forEach((user) => {
      console.log(`- ${user.email} (${user.role})`);
    });

    const result = await User.deleteMany({ email: { $in: emailsToDelete } });
    console.log(`Deleted ${result.deletedCount} user(s).`);
  } catch (error) {
    console.error("Cleanup failed:", error.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
}

main();