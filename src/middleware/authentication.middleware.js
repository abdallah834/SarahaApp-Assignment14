import { tokenTypeEnum } from "../common/enums/security.enum.js";
import {
  decodeToken,
  errorException,
  unauthorizedException,
} from "../common/utils/index.js";

export const authentication = (tokenType = tokenTypeEnum.access) => {
  return async (req, res, next) => {
    if (!req.headers?.authorization) {
      throw errorException({ message: "Missing authorization key" });
    }
    // using bearer token
    const { authorization } = req.headers;
    const [flag, token] = authorization.split(" ");

    if (!flag || !token) {
      throw errorException({ message: "missing authorization parts" });
    }
    switch (flag) {
      case "basic":
        const data = Buffer.from(token, "base64").toString();
        const [username, password] = data.split(":");
        break;

      default:
        // "Bearer"
        const { userAccount, decodedToken } = await decodeToken({
          token,
          tokenType,
        });
        req.user = userAccount;
        req.decodedToken = decodedToken;
        break;
    }
    next();
  };
};
export const authorization = (accessRoles = []) => {
  return async (req, res, next) => {
    if (!accessRoles.includes(req.user?.role)) {
      throw unauthorizedException({
        message: "Access denied",
      });
    }
    next();
  };
};
