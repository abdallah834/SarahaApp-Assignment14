import cors from "cors";
import e from "express";
import { resolve } from "node:path";
import { DEV_ORIGINS, port } from "../config/config.js";
import { globalErrorHandling, sendEmail } from "./common/utils/index.js";
import {
  redisClient,
  redisDbConnection,
  testDBConnection,
} from "./DB/index.js";
import { authRouter } from "./modules/auth/index.js";
import { userRouter } from "./modules/users/index.js";
import { checkNonConfirmedUsers } from "./common/utils/CRON/cronJob.js";
import { checkValidUsers } from "./modules/users/user.service.js";
import { messageRouter } from "./modules/message/index.js";
import helmet from "helmet";
import { ipKeyGenerator, rateLimit } from "express-rate-limit";
import axios from "axios";
import geoip from "geoip-lite";
export async function bootstrap() {
  // convert buffer data to json & use CORS
  const app = e();

  // const fromWhere = async (ip) => {
  //   try {
  //     // requires the x-forwarded-for in the headers of the req in order to function properly
  //     const response = await axios.get(`https://ipapi.co/${ip}/json`);
  //     return response.data;
  //   } catch (error) {
  //     console.error(error);
  //   }
  // };
  // corsOptions is passed as an arg to the cors function in order to restrict domains access
  const corsOptions = {
    origin: function (origin, cb) {
      const origins = DEV_ORIGINS;
      if (!origins.includes(origin)) {
        cb(
          new Error("Unauthorized CORS access", { cause: { statusCode: 401 } }),
        );
      } else {
        cb(null, origins);
      }
    },
  };
  // const limiter = rateLimit({
  //   windowMs: 2 * 60 * 1000,
  //   limit: async (req) => {
  //     //////////////// using ipApi
  //     // const { country_code } = (await fromWhere(req.ip)) || {};
  //     console.log(geoip.lookup(req.ip));
  //     const { country } = geoip.lookup(req.ip);
  //     return country === "EG" ? 5 : 3;
  //   },
  //   legacyHeaders: false,
  //   standardHeaders: "draft-8",
  //   requestPropertyName: "rateLimit",
  //   skipFailedRequests: true,
  //   handler: (req, res, next) => {
  //     return res
  //       .status(429)
  //       .json({ Error: "Too many requests were made, please try again later" });
  //   },
  //   keyGenerator: (req, res, next) => {
  //     const ip = ipKeyGenerator(req.ip, 56);
  //     return `${ip}-${req.path}`;
  //   },
  //   store: {
  //     async incr(key, cb) {
  //       try {
  //         const count = await redisClient.incr(key);
  //         if (count === 1) await redisClient.expire(key, 60);
  //         cb(null, count);
  //       } catch (error) {
  //         cb(error);
  //       }
  //     },
  //     async decrement(key, cb) {
  //       if (await redisClient.exists(key)) {
  //         await redisClient.decr(key);
  //       }
  //     },
  //   },
  // });
  // getting the request IP
  app.set("trust proxy", true);
  // helmet to prevent malicious script execution
  // corsOptions is passed as an arg to the cors function in order to restrict domains access
  app.use(cors(), helmet(), e.json());
  // to view all images/videos etc... within the uploads folder we use express.static
  app.use("/uploads", e.static(resolve("../uploads")));

  //DB Connections
  await testDBConnection();
  await redisDbConnection();

  ////////////////// CRON cleanup //////////////////

  await checkNonConfirmedUsers(checkValidUsers);
  ////////////////////////////////////////

  app.get("/", async (req, res, next) => {
    res.status(200).json({ message: "Hello world" });
  });
  ////////////////// APIs //////////////////
  app.use("/auth", authRouter);
  app.use("/profile", userRouter);
  app.use("/message", messageRouter);
  ////////////////////////////////////////
  app.use("{/*Dummy}", (req, res, next) => {
    res.status(404).json({ error: "Invalid Application Routing" });
  });

  // using global error handling on the entire level of the app using app.use
  app.use(globalErrorHandling);
  app.listen(port, () => console.log(`App is running on port ${port}`));
}
