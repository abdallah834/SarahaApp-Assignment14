import jwt from "jsonwebtoken";
import { randomUUID } from "node:crypto";
import {
  ACCESS_TOKEN_EXPIRATION_TIME,
  REFRESH_TOKEN_EXPIRATION_TIME,
  SYS_REFRESH_TOKEN_SECRET_KEY,
  SYSTEM_TOKEN_SECRET_KEY,
  USER_REFRESH_TOKEN_SECRET_KEY,
  USER_TOKEN_SECRET_KEY,
} from "../../../../config/config.js";
import { findOne, UserModel } from "../../../DB/index.js";
import { audienceEnum, tokenTypeEnum } from "../../enums/security.enum.js";
import { roleEnum } from "../../enums/user.enum.js";
import { redisCheckKey, redisRevokeTokenKey } from "../../services/index.js";
import {
  errorException,
  unauthorizedException,
} from "../response/error.response.js";

export const generateToken = async ({
  payload = {},
  secretKey = USER_TOKEN_SECRET_KEY,
  options = {},
} = {}) => {
  return jwt.sign(payload, secretKey, options);
};
export const verifyToken = async ({
  token = null,
  secretKey = USER_TOKEN_SECRET_KEY,
} = {}) => {
  return jwt.verify(token, secretKey);
};

export const getTokenSignature = async (role) => {
  let accessSignature = undefined;
  let refreshSignature = undefined;
  let audience = audienceEnum.user;
  switch (role) {
    case roleEnum.admin:
      accessSignature = SYSTEM_TOKEN_SECRET_KEY;
      refreshSignature = SYS_REFRESH_TOKEN_SECRET_KEY;
      audience = audienceEnum.system;
      break;
    default:
      accessSignature = USER_TOKEN_SECRET_KEY;
      refreshSignature = USER_REFRESH_TOKEN_SECRET_KEY;
      audience = audienceEnum.user;
      break;
  }
  return { accessSignature, refreshSignature, audience };
};
export const getSignatureLevel = async (audienceType) => {
  let signatureLevel = audienceEnum.user;
  switch (audienceType) {
    case audienceEnum.system:
      signatureLevel = roleEnum.admin;
      break;
    default:
      signatureLevel = roleEnum.user;
      break;
  }
  return signatureLevel;
};

export const createLoginTokens = async (user, issuer) => {
  const { accessSignature, refreshSignature, audience } =
    await getTokenSignature(user.role);
  const jtId = randomUUID();
  const accessToken = await generateToken({
    payload: { sub: user._id },
    secretKey: accessSignature,
    options: {
      issuer,
      audience: [tokenTypeEnum.access, audience],
      expiresIn: ACCESS_TOKEN_EXPIRATION_TIME,
      jwtid: jtId,
    },
  });
  const refreshToken = await generateToken({
    payload: { sub: user._id },
    secretKey: refreshSignature,
    options: {
      issuer,
      audience: [tokenTypeEnum.refresh, audience],
      expiresIn: REFRESH_TOKEN_EXPIRATION_TIME,
      jwtid: jtId,
    },
  });
  return { accessToken, refreshToken };
};

export const decodeToken = async ({
  token,
  tokenType = tokenTypeEnum.access,
} = {}) => {
  const decodedToken = jwt.decode(token);

  if (!decodedToken?.aud?.length) {
    throw errorException({ message: "Failed to decode token" });
  }

  if (
    decodedToken.jti &&
    (await redisCheckKey(
      redisRevokeTokenKey({ userId: decodedToken.sub, jti: decodedToken.jti }),
    ))
  ) {
    throw unauthorizedException({ message: "Invalid login session" });
  }
  const [decodedTokenType, audienceType] = decodedToken.aud;
  if (decodedTokenType !== tokenType) {
    throw errorException({ message: "Invalid token type" });
  }
  const signatureLevel = await getSignatureLevel(audienceType);
  const { accessSignature, refreshSignature } =
    await getTokenSignature(signatureLevel);
  const verifiedData = await verifyToken({
    token,
    secretKey:
      tokenType === tokenTypeEnum.refresh ? refreshSignature : accessSignature,
  });
  const userAccount = await findOne({
    model: UserModel,
    filter: { _id: verifiedData.sub },
    options: { lean: true },
  });
  if (!userAccount) {
    throw unauthorizedException({ message: "Not registered account" });
  }

  if (
    userAccount.changedCredentialsTime &&
    userAccount.changedCredentialsTime?.getTime() >= decodedToken.iat * 1000
  ) {
    throw unauthorizedException({ message: "Invalid login session" });
  }

  return { userAccount, decodedToken };
};
