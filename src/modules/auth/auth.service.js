import { OAuth2Client } from "google-auth-library";
import { WEB_CLIENT_ID } from "../../../config/config.js";
import { emailEnum } from "../../common/enums/email.enum.js";
import { providerEnum } from "../../common/enums/user.enum.js";
import {
  generalLoginAttemptBlock,
  maxOtpRequestsKey,
  otp2FAVerification,
  otpBlockKey,
  otpKey,
  redisDelKeys,
  redisGet,
  redisGetTtl,
  redisIncrKey,
  redisKeys,
  redisSet,
  redisUpdate,
} from "../../common/services/redis.service.js";
import {
  compareHash,
  conflictException,
  decrypt,
  emailEmitter,
  encrypt,
  errorException,
  generateHash,
  notFoundException,
  redisBaseRevokeTokenKey,
  sendEmail,
  unauthorizedException,
} from "../../common/utils/index.js";
import { createLoginTokens } from "../../common/utils/security/token.security.js";
import { create, createOne, findOne } from "../../DB/index.js";
import { UserModel } from "../../DB/models/index.js";
const generateOTP = () => {
  return Math.floor(Math.random() * 900000 + 100000);
};

////////////////////////////
// const sendGmailVerification = async (userEmail, OTP) => {
//   await transporter.sendMail({
//     from: "verificationTest@test.com",
//     to: userEmail,
//     subject: "confirm email test",
//     text: `To confirm your email use the following One Time Password (OTP): ${OTP}`,
//     // html: "<p>Some HTML test</p>",
//   });
// };
export const generateAndSendConfirmationOtp = async (
  email,
  { subject = emailEnum.confirmEmail, title = "Email verification" } = {},
) => {
  /////////////// checking if there is a blocked timer
  const blockKey = otpBlockKey(email, { type: subject });
  const maxRequests = maxOtpRequestsKey(email, {
    type: subject,
  });
  const [remainingBlockTime, checkMaxOtpRequests, maxRequestsTtl, ,] =
    await Promise.all([
      redisGetTtl(blockKey),
      Number(redisGet(maxRequests) || 0),
      redisGetTtl(maxOtpRequestsKey(email)),
    ]);

  if (remainingBlockTime > 0) {
    conflictException({
      message: `You have been blocked from requesting newer OTPs try again after ${remainingBlockTime} ${remainingBlockTime > 1 ? `seconds` : `second`}`,
    });
  }

  /////////////// handling max attempts for OTP requests

  if (checkMaxOtpRequests >= 3) {
    await redisSet({
      key: blockKey,
      value: 0,
      ttl: 300,
    });
    conflictException({
      message: `You have reached the maximum amount of requests for the OTP try again after ${maxRequestsTtl} ${maxRequestsTtl > 1 ? `second` : `seconds`}`,
    });
  }
  const generatedOtp = generateOTP();
  await redisSet({
    key: otpKey(email, { type: subject }),
    value: await generateHash({ plainTxt: `${generatedOtp}` }),
    ttl: 120,
  });
  checkMaxOtpRequests > 0
    ? await redisIncrKey(maxRequests)
    : await redisSet({ key: maxRequests, value: 1, ttl: 300 });
  ///////// fixing performance issue where the api would take too long to process
  ///// instead of sending an email using this method
  // await sendEmail({
  //   to: email,
  //   subject: "Email verification",
  //   html: `<span>The confirmation code for your account is</span><h2>${generatedOtp}</h2>`,
  // });
  ///// we use this
  await sendEmail({
    to: email,
    title,
    subject,
    html: `<span>The confirmation code for your account is</span><h2>${generatedOtp}</h2>`,
  });

  return;
};
export const signup = async (userInfo) => {
  const { userName, email, password, phone, role } = userInfo;
  const [checkExistingAcc, hashedPassword, encryptedPhoneNum] =
    await Promise.all([
      findOne({
        model: UserModel,
        filter: { email },
        options: { lean: true },
      }),
      generateHash({ plainTxt: password }),
      encrypt(phone),
    ]);
  if (checkExistingAcc) {
    conflictException({
      message: "This account already exists",
    });
  }
  /// to make hashing work for ASCII characters only , "b" works with non ASCII characters
  // const salt = genSalt(SALT_ROUND,"a");
  const createdUser = await createOne({
    model: UserModel,
    data: {
      userName,
      email,
      //////////// hashing by default is bcrypt
      // hashingApproachEnum.argon2
      password: hashedPassword,
      phone: encryptedPhoneNum,
      role,
    },
    options: { lean: true },
  });

  emailEmitter.emit(emailEnum.confirmEmail, async () => {
    await generateAndSendConfirmationOtp(email);
  });

  return createdUser;
};
export const login = async (userInfo, issuer) => {
  const { email, password } = userInfo;
  const user = await findOne({
    model: UserModel,
    filter: {
      email,
      provider: providerEnum.system,
      confirmEmail: { $exists: true },
    },
    options: { lean: true },
  });
  if (!user) {
    notFoundException({
      message: "Please make sure to verify you account before login",
    });
  }
  /////////////// handling logout timeout for 5 mins after failing to login 5 consecutive times
  const globalAttemptsKey = generalLoginAttemptBlock();
  const globalBlockTtl = await redisGetTtl(globalAttemptsKey);
  if (globalBlockTtl > 0) {
    errorException({
      message: `You have been blocked for ${globalBlockTtl} ${globalBlockTtl > 1 ? `seconds` : `second`} for entering an invalid password too many times`,
    });
  }
  if (!(await compareHash({ plainTxt: password, cipherTxt: user.password }))) {
    (await redisGet(globalAttemptsKey))
      ? await redisIncrKey(globalAttemptsKey)
      : await redisSet({ key: globalAttemptsKey, value: 1 });

    if ((await redisGet(globalAttemptsKey)) >= 5) {
      await redisUpdate({
        key: globalAttemptsKey,
        value: 0,
        ttl: 300,
      });
    }
    notFoundException({
      message: "Invalid login credentials",
    });
  }
  user.phone = await decrypt(user.phone);
  ///////////////// handling 2FA
  if (user.TFAEnabled) {
    await generateAndSendConfirmationOtp(user.email);
    await redisSet({
      key: otp2FAVerification(user.email),
      value: await createLoginTokens(user, issuer),
      ttl: 120,
    });
    return "2FA";
  }

  //////////////////////////////////////////// using a secret key based on the user's role (admin | user)
  return await createLoginTokens(user, issuer);
};
const verifyGoogleAccount = async (idToken) => {
  const client = new OAuth2Client();

  const ticket = await client.verifyIdToken({
    idToken,
    audience: WEB_CLIENT_ID, // Specify the WEB_CLIENT_ID of the app that accesses the backend
    // Or, if multiple clients access the backend:
    //[WEB_CLIENT_ID_1, WEB_CLIENT_ID_2, WEB_CLIENT_ID_3]
  });
  const payload = ticket.getPayload();
  if (!payload.email_verified) {
    throw errorException({
      message: "Failed to authenticate this account with gmail",
    });
  }
  return payload;
};
export const loginWithGmail = async ({ idToken, issuer }) => {
  const payload = await verifyGoogleAccount(idToken);
  const existingUser = await findOne({
    model: UserModel,
    filter: { email: payload.email, provider: providerEnum.google },
    options: { lean: true },
  });
  if (!existingUser) {
    throw errorException({
      message: "Invalid login credentials or invalid login approach",
    });
  }

  return await createLoginTokens(existingUser, issuer);
};

export const signupWithGmail = async ({ idToken, issuer }) => {
  const payload = await verifyGoogleAccount(idToken);

  const existingUser = await findOne({
    model: UserModel,
    filter: { email: payload.email },
    options: { lean: true },
  });
  if (existingUser) {
    if (existingUser.provider === providerEnum.system) {
      throw conflictException({
        message: "Account already exists with different provider",
      });
    }
    const account = await loginWithGmail(idToken, issuer);
    return { account, status: 200 };
  }
  const createdUser = await create({
    model: UserModel,
    data: [
      {
        firstName: payload.given_name,
        lastName: payload.family_name,
        email: payload.email,
        provider: providerEnum.google,
        profilePicture: payload.picture,
        confirmEmail: new Date(),
      },
    ],
  });
  return await createLoginTokens(createdUser[0], issuer);
};

export const confirmEmail = async (inputs) => {
  const { email, otp } = inputs;
  const existingAcc = await findOne({
    model: UserModel,
    filter: {
      email,
      confirmEmail: { $exists: false },
      provider: providerEnum.system,
    },
    options: { lean: true },
  });
  if (!existingAcc) {
    notFoundException({
      message: "This account is either already verified or doesn't exist",
    });
  }

  const hashedOtp = await redisGet(otpKey(email));

  if (!hashedOtp) {
    notFoundException({ message: "Expired OTP" });
  }

  if (!(await compareHash({ plainTxt: `${otp}`, cipherTxt: `${hashedOtp}` }))) {
    errorException({ message: "Invalid OTP" });
  }
  // existingAcc.confirmEmail = new Date();
  await UserModel.updateOne({ email }, { confirmEmail: new Date() });
  await redisDelKeys(
    await redisKeys(otpKey(email, { type: emailEnum.confirmEmail })),
  );
  return;
};

export const resendConfirmationEmail = async ({ email }) => {
  const account = await findOne({
    model: UserModel,
    filter: {
      email,
      confirmEmail: { $exists: false },
      provider: providerEnum.system,
    },
  });
  if (!account) {
    notFoundException({
      message: "Account is either already verified or not found",
    });
  }
  const otpTtl = await redisGetTtl(
    otpKey(email, { type: emailEnum.confirmEmail }),
  );

  if (otpTtl > 0) {
    conflictException({
      message: `Can't send a new OTP while the older OTP is still valid try again after ${otpTtl} ${otpTtl > 1 ? `seconds` : `second`}.`,
    });
  }
  await generateAndSendConfirmationOtp(email);
  return;
};

export const get2FaTokens = async ({ email, otp }) => {
  const confirmOtp = await redisGet(otpKey(email));
  if (!(await compareHash({ plainTxt: otp, cipherTxt: confirmOtp }))) {
    return unauthorizedException({ message: "Invalid OTP confirmation" });
  }
  const verifiedAccTokens = await redisGet(otp2FAVerification(email));
  return verifiedAccTokens;
};
export const reqForgetPasswordOTP = async ({ email }) => {
  const checkExistingOTP = await redisGetTtl(
    otpKey(email, { type: emailEnum.forgotPassword }),
  );

  if (checkExistingOTP > 0) {
    conflictException({
      message: "Can't request a new OTP while the older one is still valid",
    });
  }
  const userAccount = await findOne({
    model: UserModel,
    filter: {
      email,
      confirmEmail: { $exists: true },
      provider: providerEnum.system,
    },
  });
  if (!userAccount) {
    notFoundException({ message: "Make sure to enter an existing account" });
  }

  emailEmitter.emit(emailEnum.confirmEmail, async () => {
    await generateAndSendConfirmationOtp(email, {
      subject: emailEnum.forgotPassword,
      title: "Reset Password",
    });
  });
};
export const verifyForgetPasswordOTP = async ({ email, otp }) => {
  const hashedOTP = await redisGet(
    otpKey(email, { type: emailEnum.forgotPassword }),
  );
  if (!hashedOTP) {
    notFoundException({ message: "No OTP found for this account" });
  }
  if (!(await compareHash({ plainTxt: otp, cipherTxt: hashedOTP }))) {
    notFoundException({ message: "The OTP you entered is invalid" });
  }
};
export const changeForgottenPassword = async ({ email, otp, password }) => {
  await verifyForgetPasswordOTP({ email, otp });
  const userAccount = await UserModel.findOneAndUpdate(
    { email, confirmEmail: { $exists: true }, provider: providerEnum.system },
    {
      password: await generateHash({ plainTxt: password }),
      changedCredentialsTime: new Date(),
    },
  );
  if (!userAccount) {
    notFoundException({ message: "Account doesn't exist" });
  }
  const allOtpKeys = await redisKeys(
    otpKey(email, { type: emailEnum.forgotPassword }),
  );
  const tokenKeys = await redisKeys(redisBaseRevokeTokenKey(userAccount._id));
  await redisDelKeys([...allOtpKeys, ...tokenKeys]);
};
