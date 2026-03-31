import { Router } from "express";
import {
  decodeToken,
  errorException,
  fileFieldValidation,
  localFileUpload,
  successResponse,
} from "../../common/utils/index.js";
import {
  deleteMessage,
  getMessage,
  getMessagesList,
  sendMessage,
} from "./message.service.js";
import { validation } from "../../middleware/validation.middleware.js";
import * as validators from "./message.validation.js";
import { tokenTypeEnum } from "../../common/enums/security.enum.js";
import { authentication } from "../../middleware/authentication.middleware.js";
const router = Router();
router.post(
  "/:receiverId",
  // checking if there is a sent token to further include the sender ID
  async (req, res, next) => {
    if (req.headers.authorization) {
      const { userAccount, decodedToken } = await decodeToken({
        token: req.headers.authorization.split(" ")[1],
        tokenType: tokenTypeEnum.access,
      });
      req.user = userAccount;
      req.decodedToken = decodedToken;
    }
    next();
  },
  // applying file attachments
  localFileUpload({
    validation: fileFieldValidation.image,
    customPath: "Messages",
    maxSize: 1,
  }).array("attachments", 2),
  // validating message inputs
  validation(validators.sendMessage),
  async (req, res, next) => {
    if (!req.body?.content && !req.files?.length) {
      errorException({
        message: "Validation error",
        extra: { key: "body", path: ["content"], message: "Missing content" },
      });
    }
    const sentMessage = await sendMessage(
      req.params.receiverId,
      req.body,
      req.files,
      req.user,
    );
    return successResponse({
      res,
      message: "message route",
      data: sentMessage,
    });
  },
);

router.get(
  "/:messageId",
  authentication(),
  validation(validators.getMessage),
  async (req, res, next) => {
    const message = await getMessage(req.params.messageId, req.user);
    successResponse({ res, message: "Success", data: message });
  },
);
router.get("/messages/list", authentication(), async (req, res, next) => {
  const messages = await getMessagesList(req.user);
  successResponse({ res, message: "Success", data: messages });
});
router.delete(
  "/:messageId/delete",
  authentication(),
  async (req, res, next) => {
    const message = await deleteMessage(req.params.messageId, req.user);
    successResponse({ res, message: "Success", data: message });
  },
);
export default router;
