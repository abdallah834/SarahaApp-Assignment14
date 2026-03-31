import { errorException } from "../common/utils/index.js";

export const validation = (schema) => {
  return async (req, res, next) => {
    const errors = [];
    for (const key of Object.keys(schema) || []) {
      const validationResult = await schema[key].validate(req[key], {
        abortEarly: false,
      });
      if (validationResult.error) {
        errors.push({
          key,
          details: validationResult.error.details.map((err) => {
            return { path: err.path, message: err.message };
          }),
        });
      }
    }
    if (errors.length) {
      throw errorException({ message: "Validation Error", extra: errors });
    }
    next();
  };
};
