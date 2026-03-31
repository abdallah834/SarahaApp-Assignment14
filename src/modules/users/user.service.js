import {
  ACCESS_TOKEN_EXPIRATION_TIME,
  REFRESH_TOKEN_EXPIRATION_TIME,
} from "../../../config/config.js";
import { logoutDevicesEnum } from "../../common/enums/security.enum.js";
import {
  otpKey,
  redisBaseRevokeTokenKey,
  redisDelKeys,
  redisGet,
  redisKeys,
  redisRevokeTokenKey,
  redisSet,
} from "../../common/services/redis.service.js";
import {
  conflictException,
  errorException,
  internalServerError,
  notFoundException,
  unauthorizedException,
} from "../../common/utils/index.js";
import {
  compareHash,
  createLoginTokens,
  generateHash,
} from "../../common/utils/security/index.js";
import { UserModel } from "../../DB/index.js";
import { generateAndSendConfirmationOtp } from "../auth/auth.service.js";

const createRevokeToken = async ({ userId, jti, ttl }) => {
  await redisSet({
    key: redisRevokeTokenKey({ userId, jti }),
    value: jti,
    ttl,
  });
  return;
};
export const profileImage = async (file, user) => {
  const updatedUser = await UserModel.findByIdAndUpdate(
    user._id,
    { profilePicture: file.finalPath },
    { new: true },
  );
  return updatedUser;
};
export const profile = async (user) => {
  return user;
};

// implementing token refresh logic
export const rotateToken = async (user, { sub, jti, iat }, issuer) => {
  // checking if the token token is about to expire (5mins before expiration at least 25min passed)
  if (Date.now() - iat * 1000 < ACCESS_TOKEN_EXPIRATION_TIME - 300 * 1000) {
    throw conflictException({ message: "Current access token is still valid" });
  }
  await createRevokeToken({
    userId: sub,
    jti,
    ttl: iat + REFRESH_TOKEN_EXPIRATION_TIME,
  });

  return await createLoginTokens(user, issuer);
};

export const uploadUserProfilePicture = async (file) => {
  // save in DB
};

export const profileCoverImages = async (files, user) => {
  const updatedUser = await UserModel.findByIdAndUpdate(
    user._id,
    { coverProfilePictures: files.map((file) => file.finalPath) },
    { new: true },
  );
  return updatedUser;
};
export const logout = async ({ flag }, user, { jti, iat, sub }) => {
  let statusCode = 200;

  // implementing logout from multiple devices or one device
  switch (flag) {
    case logoutDevicesEnum.all:
      await UserModel.findByIdAndUpdate(
        user._id,
        { changedCredentialsTime: new Date() },
        { new: true },
      );

      await redisDelKeys(await redisKeys(redisBaseRevokeTokenKey(sub)));
      statusCode = 201;

      break;

    default:
      await createRevokeToken({
        userId: sub,
        jti,
        ttl: iat + REFRESH_TOKEN_EXPIRATION_TIME,
      });
      statusCode = 201;
      break;
  }

  return statusCode;
};

export const enable2FA = async (user) => {
  if (user.TFAEnabled) {
    notFoundException({
      message: "This account already has 2FA enabled",
    });
  }
  await generateAndSendConfirmationOtp(user.email);
  return;
};
export const TFAConfirmation = async (user, otp) => {
  if (user.TFAEnabled) {
    notFoundException({
      message: "This account already has 2FA enabled",
    });
  }
  const redisOtpValue = await redisGet(otpKey(user.email));
  if (!redisOtpValue) {
    notFoundException({ message: "2FA OTP expired or doesn't exist" });
  }
  if (
    await compareHash({
      plainTxt: otp,
      cipherTxt: redisOtpValue,
    })
  ) {
    await UserModel.updateOne({ _id: user._id }, { TFAEnabled: true });
  } else {
    errorException({ message: "Make sure to enter a correct OTP" });
  }
  return;
};

export const sendResetPasswordVerification = async ({ email }) => {
  try {
    await generateAndSendConfirmationOtp(email);
  } catch (error) {
    internalServerError({
      message: "Something went wrong with sending a confirmation OTP",
    });
  }
};
export const confirmPasswordReset = async ({ email }, { otp, newPassword }) => {
  const storedOtpValue = await redisGet(otpKey(email));
  if (!(await compareHash({ plainTxt: otp, cipherTxt: storedOtpValue }))) {
    return unauthorizedException({ message: "Incorrect OTP" });
  }
  await UserModel.updateOne(
    { email },
    { password: await generateHash({ plainTxt: newPassword }) },
  );
  return;
};

// checking emails without confirmation every 24hrs using cron
export const checkValidUsers = async () => {
  await UserModel.deleteMany({ confirmEmail: { $exists: false } });
};
