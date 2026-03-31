import multer from "multer";
import { randomUUID } from "node:crypto";
import { existsSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { fileFilter } from "./validation.multer.js";
export const localFileUpload = ({
  customPath = "general",
  validation = [],
  maxSize = 5,
} = {}) => {
  const storage = multer.diskStorage({
    destination: function (req, file, cb) {
      const fullPath = resolve(`../uploads/${customPath}`);
      if (!existsSync(fullPath)) {
        mkdirSync(fullPath, { recursive: true });
      }
      cb(null, fullPath);
    },
    filename: function (req, file, cb) {
      const uniqueFileName = randomUUID() + "_" + file.originalname;
      // we assign a new key in the file object that contains the relative path of the image to store in the DB
      file.finalPath = `uploads/${customPath}/${uniqueFileName}`;
      cb(null, uniqueFileName);
    },
  });
  return multer({
    fileFilter: fileFilter(validation),
    storage,
    // setting a max size for the uploaded images or videos
    limits: { fileSize: maxSize * 1024 * 1024 },
  });
};
