//////////////////////////using multer as a middleware

// import multer from "multer";
// import { internalServerError } from "../common/utils/index.js";

// const upload = multer({
//   // dest: is the destination where the uploaded files get saved to
//   dest: "uploads/",
//   // fileFilter: function to control which files are accepted,
//   // limits: limits of the uploaded data
//   // preservePath: keep the full path of the files instead of the base name
// }).single("userProfilePic");

// export const multerMiddleWare = () => {
//   return async (req, res, next) => {
//     upload(req, res, function (err) {
//       if (err instanceof multer.MulterError) {
//         throw internalServerError({
//           message: "Failed to upload picture",
//           extra: err,
//         });
//       } else if (err) {
//         throw internalServerError({
//           message: "Something went wrong with uploading profile picture",
//           err,
//         });
//       }
//       next();
//     });
//   };
// };
