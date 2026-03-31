import { EventEmitter } from "node:events";
import { internalServerError } from "../response/index.js";
import { emailEnum } from "../../enums/email.enum.js";
export const emailEmitter = new EventEmitter();
emailEmitter.on(emailEnum.confirmEmail, async (emailFunction) => {
  try {
    await emailFunction();
  } catch (error) {
    internalServerError({
      message: "Failed to send verification mail to user",
      extra: error,
    });
  }
});
