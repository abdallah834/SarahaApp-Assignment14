import joi from "joi";
import { generalValidationFields } from "../../common/utils/index.js";

export const loginSchema = {
  body: joi
    .object()
    .keys({
      email: generalValidationFields.email.required(),
      password: generalValidationFields.password.required(),
    })
    .required(),
};
export const signupSchema = {
  body: loginSchema.body
    .append()
    .keys({
      userName: generalValidationFields.userName.required(),

      // age: joi.number().integer().min(18).max(95),
      // confirm: joi.boolean().truthy(1, "done").falsy(0, "fail").sensitive(),
      // DOB: joi.date().greater("01/01/2026"),

      confirmPassword: generalValidationFields.confirmPassword().required(),
      phone: generalValidationFields.phone.required(),
    })
    .required(),
};
export const confirmEmail = {
  body: joi
    .object()
    .keys({
      email: generalValidationFields.email.required(),
      otp: generalValidationFields.otp.required(),
    })
    .required(),
};
export const confirmationEmail = {
  body: joi
    .object()
    .keys({
      email: generalValidationFields.email.required(),
    })
    .required(),
};
export const TFAOtp = {
  body: joi
    .object()
    .keys({
      otp: generalValidationFields.otp.required(),
    })
    .required(),
};
export const resetPassword = {
  body: joi
    .object()
    .keys({
      otp: generalValidationFields.otp.required(),
      password: generalValidationFields.password.required(),
    })
    .required(),
};
export const resetForgottenPassword = {
  body: resetPassword.body
    .append({
      email: generalValidationFields.email.required(),
      confirmPassword: generalValidationFields
        .confirmPassword("password")
        .required(),
    })

    .required(),
};
