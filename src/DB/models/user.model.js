import mongoose from "mongoose";
import {
  genderEnum,
  providerEnum,
  roleEnum,
} from "../../common/enums/index.js";

const userSchema = new mongoose.Schema(
  {
    firstName: {
      type: String,
      required: true,
      minLength: [2, "first name can't be less than 2 characters"],
      maxLength: [25, "first name can't be more than 25 characters"],
      trim: true,
    },
    lastName: {
      type: String,
      required: true,
      minLength: 2,
      maxLength: 25,
      trim: true,
    },
    gender: {
      type: Number,
      enum: Object.values(genderEnum),
      default: genderEnum.male,
    },
    provider: {
      type: Number,
      enum: Object.values(providerEnum),
      default: providerEnum.system,
    },
    role: {
      type: Number,
      enum: Object.values(roleEnum),
      default: roleEnum.user,
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    password: {
      type: String,
      required: function () {
        return this.provider == providerEnum.system;
      },
    },
    phone: String,
    profilePicture: String,
    coverProfilePictures: [String],
    confirmEmail: Date,
    changedCredentialsTime: Date,
    TFAEnabled: Boolean,
  },
  {
    collection: "Users",
    timestamps: true,
    strict: true,
    strictQuery: true,
    optimisticConcurrency: true,
    autoIndex: true,
    // toJSON enables the visibility of the virtual fields
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

userSchema
  .virtual("userName")
  .set(function (value) {
    const [firstName, lastName] = value.split(" ") || [];
    this.set({ firstName, lastName });
  })
  .get(function () {
    return this.firstName + " " + this.lastName;
  });
export const UserModel =
  mongoose.models.User || mongoose.model("User", userSchema);
