import { Router } from "express";
import { tokenTypeEnum } from "../../common/enums/security.enum.js";
import {
  fileFieldValidation,
  localFileUpload,
} from "../../common/utils/index.js";
import { successResponse } from "../../common/utils/response/index.js";
import {
  authentication,
  authorization,
  validation,
} from "../../middleware/index.js";
import { endpoint } from "./user.authorization.js";
import {
  confirmPasswordReset,
  enable2FA,
  logout,
  profile,
  profileCoverImages,
  profileImage,
  rotateToken,
  sendResetPasswordVerification,
  TFAConfirmation,
} from "./user.service.js";
import * as validators from "../auth/auth.validation.js";
const router = Router();

router.get(
  "/user",
  authentication(),
  authorization(endpoint.profile),
  async (req, res, next) => {
    const userProfile = await profile(req.user);
    successResponse({ res, data: { userProfile } });
  },
);
router.post(
  "/refreshToken",
  authentication(tokenTypeEnum.refresh),
  async (req, res, next) => {
    const updatedTokens = await rotateToken(
      req.user,
      req.decodedToken,
      `${req.protocol}://${req.host}`,
    );
    successResponse({ res, status: 201, data: { ...updatedTokens } });
  },
);
router.patch(
  "/image",
  authentication(),
  localFileUpload({
    customPath: "users/profile",
    validation: fileFieldValidation.image,
  }).single("attachment"),
  validation(validators.profileImage),
  async (req, res, next) => {
    const account = await profileImage(req.file, req.user);
    return successResponse({
      res,
      message: "uploaded picture successfully",
      data: account,
    });
  },
);

// uploading multiple images
router.patch(
  "/profile-cover-image",
  authentication(),
  localFileUpload({
    customPath: "users/profile/cover",
    validation: fileFieldValidation.image,
  }).array("attachments", 5),
  validation(validators.profileCoverImageValues),
  async (req, res, next) => {
    const account = await profileCoverImages(req.files, req.user);

    return successResponse({
      res,
      message: "uploaded picture successfully",
      data: req.files,
    });
  },
);

router.post("/logout", authentication(), async (req, res, next) => {
  const statusCode = await logout(req.body, req.user, req.decodedToken);
  successResponse({ res, message: "logout success", status: statusCode });
});
router.patch("/activate2Fa", authentication(), async (req, res, next) => {
  await enable2FA(req.user);
  successResponse({
    res,
    message: "2FA confirmation code sent successfully",
  });
});
router.patch(
  "/confirm2Fa",
  authentication(),
  validation(validators.TFAOtp),
  async (req, res, next) => {
    await TFAConfirmation(req.user, req.body.otp);
    successResponse({
      res,
      message: "2FA Activated successfully",
    });
  },
);
/////////////////////////////using multer as a middleware
// router.post("/uploadProfilePic", multerMiddleWare(), async (req, res, next) => {
//   // in order to access the uploaded user pic we use req.file

//   // const uploadedPhoto = req.file;
//   // const userPhoto = await uploadUserProfilePicture(uploadedPhoto);
//   successResponse({
//     res,
//     message: "uploaded picture successfully",
//     data: req.file,
//   });
// });

router.get("/resetPassword", authentication(), async (req, res, next) => {
  await sendResetPasswordVerification(req.user);
  successResponse({
    res,
    message:
      "Enter the sent confirmation OTP to continue resetting your password",
  });
});
router.patch(
  "/resetPassword",
  authentication(),
  validation(validators.resetPassword),
  async (req, res, next) => {
    await confirmPasswordReset(req.user, req.body);
    successResponse({
      res,
      message: "Password was reset successfully",
      status: 201,
    });
  },
);
export default router;
