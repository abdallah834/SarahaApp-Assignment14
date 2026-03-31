export const fileFieldValidation = {
  image: ["image/jpeg", "image/jpg", "image/png"],
  video: ["video/mp4"],
};

export const fileFilter = (validation = []) => {
  return function (req, file, cb) {
    // if the uploaded image extension | type doesn't match the value in the validation array.
    // the second argument for the cb method is to either save the uploaded image or not (bool)
    if (!validation.includes(file.mimetype)) {
      return cb(
        new Error("Invalid file format", { cause: { statusCode: 400 } }),
        false,
      );
    }
    return cb(null, true);
  };
};
