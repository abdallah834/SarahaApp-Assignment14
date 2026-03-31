import { compare, genSalt, hash } from "bcrypt";
import { SALT_ROUND } from "../../../../config/config.js";
import * as argon2 from "argon2";
import { hashingApproachEnum } from "../../enums/security.enum.js";
import pLimit from "p-limit";
// max 5 concurrent hashes best for security and prevents memory exhaustion
const hashLimit = pLimit(5);
export const generateHash = async ({
  plainTxt = undefined,
  salt = SALT_ROUND,
  minor = "b",
  approach = hashingApproachEnum.argon2,
} = {}) => {
  let hashValue;
  switch (approach) {
    case hashingApproachEnum.argon2:
      // best argon hashing options for AWS 2 core CPU and 1GB of RAM
      hashValue = await hashLimit(() =>
        argon2.hash(plainTxt, {
          type: argon2.argon2id,
          timeCost: 8,
          parallelism: 1,
        }),
      );
      break;

    default:
      const generatedSalt = await genSalt(salt, minor);
      hashValue = await hash(plainTxt, generatedSalt);
      break;
  }
  return hashValue;
};
export const compareHash = async ({
  plainTxt = "",
  cipherTxt = "",
  approach = hashingApproachEnum.argon2,
} = {}) => {
  let match = false;
  switch (approach) {
    case hashingApproachEnum.argon2:
      match = await argon2.verify(cipherTxt, plainTxt);
      break;

    default:
      match = await compare(plainTxt, cipherTxt);
      break;
  }
  return match;
};
