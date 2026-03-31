import mongoose from "mongoose";
import { DB_URI } from "../../config/config.js";
import { UserModel } from "./models/index.js";

export async function testDBConnection() {
  try {
    await mongoose.connect(DB_URI);
    console.log("successfully connected to DB");
    // syncing indexes is important to apply changes
    await UserModel.syncIndexes();
  } catch (error) {
    console.log("failed to connect to DB");
  }
}
