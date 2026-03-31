import joi from "joi";
import {
  fileFieldValidation,
  generalValidationFields,
} from "../../common/utils/index.js";

export const profileImage = {
  file: generalValidationFields.file().required().messages({
    "any.required": "Make sure to upload a valid file",
  }),
};
export const profileCoverImageValues = {
  files: joi
    .array()
    .items(generalValidationFields.file().required())
    .min(1)
    .max(5)
    .required()
    .messages({
      "any.required": "Make sure to upload all your valid files",
    }),
};
export const profileAttachments = {
  files: joi
    .object()
    .keys({
      profileImage: joi
        .array()
        .items(generalValidationFields.file().required())
        .length(1)
        .required(),
      coverImage: joi
        .array()
        .items(generalValidationFields.file().required())
        .min(1)
        .max(5)
        .required(),
    })
    .required(),
};
