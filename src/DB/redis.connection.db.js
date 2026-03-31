import { createClient } from "redis";
import { REDIS_URL } from "../../config/config.js";

export const redisClient = createClient({
  url: REDIS_URL,
});

export const redisDbConnection = async () => {
  try {
    redisClient.connect();
    console.log("Connected to Redis successfully");
  } catch (error) {
    console.log("Failed to connect to Redis", error);
  }
};
