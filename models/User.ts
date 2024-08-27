import mongoose, { Schema, Model } from "mongoose";
import { IUser } from "@/types/mongoose";

const userSchema: Schema = new Schema<IUser>(
  {
    address: {
      type: String,
      unique: true,
      required: true,
      unique: true,
    },
    username: {
      type: String,
      unique: true,
      required: true,
      trim: true,
      minlength: 3,
      unique: true,
    },
    profileImage: {
      type: String,
      default: "/user_images/profilePicture.png",
    },
    bannerImage: {
      type: String,
      default: "/Profilebg.png",
    },
    bio: {
      type: String,
      default: "",
    },
    website: {
      type: String,
      default: "",
    },
    twitter: {
      type: String,
      default: "",
    },
    facebook: {
      type: String,
      default: "",
    },
    instagram: {
      type: String,
      default: "",
    },
    followers: [
      {
        type: Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    following: [
      {
        type: Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    pinnedGroups: [
      {
        type: Schema.Types.ObjectId,
        ref: "Group",
      },
    ],
    points: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);
userSchema.index({ address: 1 }, { unique: true });
userSchema.index({ username: 1 }, { unique: true });

const UserModel: Model<IUser> =
  mongoose.models.User || mongoose.model<IUser>("User", userSchema);

export default UserModel;