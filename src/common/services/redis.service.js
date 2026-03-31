import { redisClient } from "../../DB/index.js";
import { emailEnum } from "../enums/email.enum.js";
import { internalServerError, notFoundException } from "../utils/index.js";

export const redisSet = async ({ key = "", value = "", ttl = "" } = {}) => {
  try {
    const data = typeof value === "string" ? value : JSON.stringify(value);
    return ttl
      ? await redisClient.set(key, data, { EX: ttl })
      : await redisClient.set(key, data);
  } catch (error) {
    internalServerError({
      message: "Something went wrong with setting the value within redis",
      extra: error,
    });
  }
};
export const redisUpdate = async ({ key = "", value = "", ttl = "" } = {}) => {
  try {
    // key has to exist before assigning it a different value
    if (!(await redisClient.exists(key))) {
      return 0;
    }
    return await redisSet({ key, value, ttl });
  } catch (error) {
    internalServerError({
      message: "Something went wrong with updating the value within redis",
      extra: error,
    });
  }
};
export const redisGet = async (key) => {
  try {
    try {
      return JSON.parse(await redisClient.get(key));
    } catch (error) {
      return await redisClient.get(key);
    }
  } catch (error) {
    internalServerError({
      message: "Something went wrong with getting the value within redis",
      extra: error,
    });
  }
};
export const redisGetTtl = async (key) => {
  try {
    if (!(await redisClient.ttl(key))) {
      notFoundException({
        message: "The value you are trying to have a ttl enabled",
      });
    }
    return await redisClient.ttl(key);
  } catch (error) {
    internalServerError({
      message: "Something went wrong with getting the ttl value within redis",
      extra: error,
    });
  }
};
export const redisCheckKey = async (key) => {
  try {
    return await redisClient.exists(key);
  } catch (error) {
    internalServerError({
      message: "Failed to check existing key",
      extra: error,
    });
  }
};
export const redisAddTtl = async ({ key = "", ttl = "" } = {}) => {
  try {
    return await redisClient.expire(key, ttl);
  } catch (error) {
    internalServerError({
      message: "Failed to add ttl to the key",
      extra: error,
    });
  }
};
export const redisMGet = async (keys = []) => {
  try {
    if (!keys.length) {
      return 0;
    }
    return await redisClient.mGet(...keys);
  } catch (error) {
    internalServerError({
      message: "Failed to get all of the specified keys",
      extra: error,
    });
  }
};
export const redisKeys = async (prefix) => {
  try {
    return await redisClient.keys(`${prefix}*`);
  } catch (error) {
    internalServerError({
      message: "Failed to get keys",
      extra: error,
    });
  }
};
export const redisDelKeys = async (keys) => {
  try {
    if (!keys.length) return 0;
    return await redisClient.del(keys);
  } catch (error) {
    internalServerError({
      message: "Failed to delete keys",
      extra: error,
    });
  }
};
export const redisIncrKey = async (key) => {
  try {
    if (!(await redisClient.exists(key))) return 0;
    return await redisClient.incr(key);
  } catch (error) {
    internalServerError({
      message: "Failed to increment keys",
      extra: error,
    });
  }
};

export const redisBaseRevokeTokenKey = (userId) => {
  return `RevokeToken::${userId.toString()}`;
};
export const redisRevokeTokenKey = ({ userId, jti }) => {
  return `${redisBaseRevokeTokenKey(userId)}::${jti}`;
};
export const otpKey = (email, { type = emailEnum.confirmEmail } = {}) => {
  return `OTP::User::${email}::${type}`;
};
export const maxOtpRequestsKey = (
  email,
  { type = emailEnum.confirmEmail } = {},
) => {
  return `${otpKey(email, { type })}::Request`;
};
export const otpBlockKey = (email, { type = emailEnum.confirmEmail } = {}) => {
  return `${otpKey(email, { type })}::Block::Request`;
};

export const generalLoginAttemptBlock = () => {
  return `OTP::Block::Request`;
};

export const otp2FAVerification = (email) => {
  return `OTP::Verification::Token::${email}`;
};
export const unverifiedAccountDuration = (email) => {
  return `User::AccountTTL::${email}`;
};
