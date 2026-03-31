import joi from "joi";
import { Types } from "mongoose";
export const generalValidationFields = {
  id: joi.string().custom((value, helper) => {
    return Types.ObjectId.isValid(value) ? true : helper.message("Invalid ID");
  }),
  otp: joi
    .string()
    .pattern(new RegExp(/^\d{6}$/))
    .messages({
      "any.required": "Make sure to enter the OTP you received",
      "string.pattern.base": "Make sure to enter 6 digits that match the OTP",
      "string.empty": "OTP value can't be empty",
    }),
  email: joi
    .string()
    .email({
      maxDomainSegments: 3,
      minDomainSegments: 2,
      tlds: { allow: ["com", "net", "edu"] },
    })
    .messages({
      "any.required": "Email is a mandatory field",
      "string.email": "Make sure to enter a valid email",
    }),
  password: joi
    .string()
    .trim()
    .pattern(new RegExp(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*\W).{8,16}$/))
    .messages({
      "string.pattern.base": "Please make sure to use a valid password pattern",
    }),
  userName: joi
    .string()
    .min(2)
    .max(20)
    .pattern(new RegExp(/^[A-z]{1}[a-z]{1,24}\s[A-z]{1}[a-z]{1,24}$/))
    .messages({
      "any.required": "Make sure to provide a valid user name",
      "string.min": "User name must be at least 2 characters",
      "string.max": "User name must not exceed 20 characters",
      "string.pattern.base":
        "Please make sure to use a valid user name pattern",
    }),
  // age: joi.number().integer().min(18).max(95),
  // confirm: joi.boolean().truthy(1, "done").falsy(0, "fail").sensitive(),
  // DOB: joi.date().greater("01/01/2026"),
  confirmPassword: function (path = "password") {
    return joi.string().valid(joi.ref(path)).trim().messages({
      "any.only":
        "Make sure the confirmed password matches the password you entered",
    });
  },
  phone: joi
    .string()
    .pattern(new RegExp(/^(00201|\+201|01)(0|1|2|5)\d{8}$/))
    .messages({
      "any.required": "Make sure to include a valid phone number",
      "string.pattern.base": "Please make sure to enter a valid phone number",
    }),
  file: function (validation = []) {
    return joi.object().keys({
      fieldname: joi.string().required(),
      originalname: joi.string().required(),
      encoding: joi.string().required(),
      mimetype: joi
        .string()
        .valid(...Object.values(validation))
        .required(),
      finalPath: joi.string().required(),
      destination: joi.string().required(),
      filename: joi.string().required(),
      path: joi.string().required(),
      size: joi.number().required(),
    });
  },
};
