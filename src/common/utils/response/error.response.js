import multer from "multer";
import { NODE_ENV } from "../../../../config/config.js";

export const globalErrorHandling = (error, req, res, next) => {
  let status = error.cause?.statusCode ?? 500;
  const mood = NODE_ENV == "production";
  const defaultErrMsg = "Something went wrong";
  const displayErrMsg = error.message || defaultErrMsg;
  if (error instanceof multer.MulterError) {
    status = 400;
  }
  res.status(status).json({
    status,
    // error:
    //   status == 500 && NODE_ENV == "production"
    //     ? "Internal Server Error"
    //     : ({
    //         message: error.errors ? error?.errors[0]?.message : error.message,
    //       } ?? "Something Went Wrong"),
    // stack: NODE_ENV == "development" ? error.stack : undefined,
    errorMessage:
      mood && status == 500 ? (defaultErrMsg = displayErrMsg) : displayErrMsg,
    stack: mood ? undefined : error.stack,
    extra: error?.cause?.extra,
  });
};
export const errorException = ({
  message = "Something went wrong",
  statusCode = 400,
  extra = undefined,
} = {}) => {
  throw new Error(message, { cause: { statusCode, extra } });
};
export const conflictException = ({
  message = "Conflict",
  extra = undefined,
} = {}) => {
  return errorException({ message, extra, statusCode: 409 });
};
export const notFoundException = ({
  message = "Not found",
  extra = undefined,
} = {}) => {
  return errorException({ message, extra, statusCode: 404 });
};
export const unauthorizedException = ({
  message = "unauthorized",
  extra = undefined,
} = {}) => {
  return errorException({ message, extra, statusCode: 401 });
};

export const internalServerError = ({
  message = "Internal Server Error",
  extra = undefined,
} = {}) => {
  return errorException({ message, extra, statusCode: 500 });
};
