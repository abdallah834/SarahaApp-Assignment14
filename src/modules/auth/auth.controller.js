import { Router } from "express";
import rateLimit, { ipKeyGenerator } from "express-rate-limit";
import geoip from "geoip-lite";
import { redisDelKeys, successResponse } from "../../common/utils/index.js";
import { redisClient } from "../../DB/redis.connection.db.js";
import { validation } from "../../middleware/index.js";
import {
  changeForgottenPassword,
  confirmEmail,
  get2FaTokens,
  login,
  loginWithGmail,
  reqForgetPasswordOTP,
  resendConfirmationEmail,
  signup,
  signupWithGmail,
  verifyForgetPasswordOTP,
} from "./auth.service.js";
import * as validators from "./auth.validation.js";
// using redis store instead of default memory-store

const router = Router();

const loginLimiter = rateLimit({
  windowMs: 2 * 60 * 1000,
  limit: async (req) => {
    //////////////// using ipApi
    // const { country_code } = (await fromWhere(req.ip)) || {};
    console.log(geoip.lookup(req.ip));
    const { country } = geoip.lookup(req.ip);
    return country === "EG" ? 5 : 3;
  },
  legacyHeaders: false,
  standardHeaders: "draft-8",
  requestPropertyName: "rateLimit",
  skipFailedRequests: true,
  handler: (req, res, next) => {
    return res
      .status(429)
      .json({ Error: "Too many requests were made, please try again later" });
  },
  keyGenerator: (req, res, next) => {
    const ip = ipKeyGenerator(req.ip, 56);
    return `${ip}-${req.path}`;
  },
  store: {
    async incr(key, cb) {
      try {
        const count = await redisClient.incr(key);
        if (count === 1) await redisClient.expire(key, 60);
        cb(null, count);
      } catch (error) {
        cb(error);
      }
    },
    async decrement(key, cb) {
      if (await redisClient.exists(key)) {
        await redisClient.decr(key);
      }
    },
  },
});

router.post(
  "/signup",
  validation(validators.signupSchema),

  async (req, res, next) => {
    const account = await signup(req.body);
    successResponse({
      res,
      message: "Account Created",
      data: account,
      status: 201,
    });
  },
);
router.post(
  "/login",
  loginLimiter,
  validation(validators.loginSchema),
  async (req, res, next) => {
    const tokens = await login(req.body, `${req.protocol}://${req.host}`);
    await redisDelKeys(`${req.ip}-${req.path}`);
    successResponse({
      res,
      message: "Login Success",
      data:
        tokens === "2FA"
          ? { message: "A verification OTP was sent to your email" }
          : { ...tokens },
    });
  },
);
router.post("/signup/gmail", async (req, res, next) => {
  const { account, status = 201 } = await signupWithGmail(
    req.body,
    `${req.protocol}://${req.host}`,
  );
  successResponse({
    res,
    status,
    message: "Account Created",
    data: { account },
  });
});
router.post("/login/gmail", async (req, res, next) => {
  const account = await loginWithGmail(
    req.body,
    `${req.protocol}://${req.host}`,
  );
  successResponse({
    res,
    message: "Account Created",
    data: { account },
  });
});

router.patch(
  "/confirmEmail",
  validation(validators.confirmEmail),
  async (req, res, next) => {
    await confirmEmail(req.body);
    return successResponse({
      res,
      message: "Account confirmation completed",
      status: 201,
    });
  },
);
router.patch(
  "/resendConfirmationEmail",
  validation(validators.confirmationEmail),
  async (req, res, next) => {
    await resendConfirmationEmail(req.body);
    return successResponse({
      res,
      message: "OTP resent successfully",
      status: 201,
    });
  },
);

router.post("/verifyLogin", async (req, res, next) => {
  const tokens = await get2FaTokens(req.body);
  successResponse({ res, message: "Verification success", data: { tokens } });
});
///////// Forgot password /////////
router.post(
  "/requestForgetPasswordOTP",
  validation(validators.confirmationEmail),
  async (req, res, next) => {
    await reqForgetPasswordOTP(req.body);
    successResponse({ res, message: "OTP link sent successfully" });
  },
);
router.patch(
  "/verifyForgotPasswordOTP",
  validation(validators.confirmEmail),
  async (req, res, next) => {
    await verifyForgetPasswordOTP(req.body);
    successResponse({ res, message: "Forgot password verification success" });
  },
);
router.patch(
  "/changeForgottenPassword",
  validation(validators.resetForgottenPassword),
  async (req, res, next) => {
    await changeForgottenPassword(req.body);
    successResponse({ res, message: "Password changed successfully" });
  },
);
export default router;
