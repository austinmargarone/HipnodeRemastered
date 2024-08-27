"use server";

import { cookies } from "next/headers";
import { createAuth } from "thirdweb/auth";
import { createThirdwebClient } from "thirdweb";
import { privateKeyToAccount } from "thirdweb/wallets";
import UserModel from "@/models/User";
import dbConnect from "@/utils/mongooseConnect";
import { v4 as uuidv4 } from 'uuid';
import { ProfileSchema } from "@/components/profile/EditProfile";
import { revalidatePath } from "next/cache";
import Group, { IGroup } from "@/models/group.model";
import { UserData } from "@/types/mongoose";

const privateKey = process.env.THIRDWEB_ADMIN_PRIVATE_KEY || "";
const clientId = process.env.NEXT_PUBLIC_THIRDWEB_CLIENT_ID || "";
const domain = process.env.NEXT_PUBLIC_THIRDWEB_AUTH_DOMAIN || "";

if (!privateKey || !clientId || !domain) {
  throw new Error("Missing environment variables");
}

const client = createThirdwebClient({ clientId });

const thirdwebAuth = createAuth({
  domain: domain,
  adminAccount: privateKeyToAccount({ client, privateKey }),
});

export async function getAllUsers() {
  try {
    await dbConnect();
    const users = await UserModel.find();
    return users as unknown as UserData[];
  } catch (err) {
    console.log(err);
    return [];
  }
}

export async function getUserProfile(
  profileId: string | null | undefined,
  populate?: string[]
) {
  try {
    await dbConnect();
    const query = UserModel.findById(profileId).lean();
    for (const field of populate ?? []) {
      query?.populate(field);
    }
    const user = await query;
    const currentUser = await getCurrentUser();
    const myProfile = currentUser?._id.toString() === profileId;

    revalidatePath("/profile");
    return { profileData: user, myProfile };
  } catch (error) {
    console.log(error);
    return null;
  }
}

export async function updateProfileDetails(id: string, data: ProfileSchema) {
  try {
    await dbConnect();
    const profileData = await UserModel.findByIdAndUpdate(id, {
      username: data.username,
      bio: data.bio,
      occupation: data.occupation,
      website: data.website,
      twitter: data.twitter,
      facebook: data.facebook,
      instagram: data.instagram,
      profileImage: data.profileImage,
      bannerImage: data.bannerImage,
    }, { new: true });

    if (!profileData) {
      console.log("No user found");
      return "no user found";
    }

    revalidatePath("/profile");
    return "success";
  } catch (error: any) {
    return error.codeName;
  }
}

export async function followAuthor({
  followedUserId,
  hasFollowed,
  isFollow,
}: {
  followedUserId: string;
  hasFollowed: boolean;
  isFollow: boolean;
}) {
  try {
    await dbConnect();
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      throw new Error("Current user not found");
    }

    const updateQuery = hasFollowed
      ? { $pull: { followers: currentUser._id } }
      : { $addToSet: { followers: currentUser._id } };

    const updateFollowingQuery = isFollow
      ? { $pull: { following: followedUserId } }
      : { $addToSet: { following: followedUserId } };

    await UserModel.findByIdAndUpdate(currentUser._id, updateFollowingQuery);

    const user = await UserModel.findByIdAndUpdate(followedUserId, updateQuery, { new: true });

    revalidatePath("/profile");
    if (!user) {
      throw new Error("User not found");
    }
    return { status: user.followers.includes(currentUser._id) };
  } catch (error) {
    console.log(error);
    throw error;
  }
}

export async function getCurrentUser(populate?: string[]) {
  try {
    await dbConnect();
    const jwt = cookies().get("jwt");
    if (!jwt?.value) {
      console.log("No JWT found");
      return null;
    }

    const authResult = await thirdwebAuth.verifyJWT({ jwt: jwt.value });
    if (!authResult.valid || !authResult.parsedJWT.sub) {
      console.log("Invalid JWT or missing subject");
      return null;
    }

    let user = await UserModel.findOne({ address: authResult.parsedJWT.sub });
    if (!user) {
      user = await createNewUser(authResult.parsedJWT.sub);
    }

    if (populate) {
      for (const field of populate) {
        await user.populate(field);
      }
    }

    return user;
  } catch (error) {
    console.error("Error in getCurrentUser:", error);
    return null;
  }
}

async function createNewUser(address: string) {
  const shortAddress = address.slice(0, 6);
  
  async function generateUniqueUsername() {
    const uniqueId = uuidv4().slice(0, 8);
    const username = `user_${shortAddress}_${uniqueId}`;
    const existingUser = await UserModel.findOne({ username });
    if (existingUser) {
      return generateUniqueUsername();
    }
    return username;
  }

  try {
    const username = await generateUniqueUsername();
    
    const user = await UserModel.findOneAndUpdate(
      { address },
      {
        $setOnInsert: {
          address,
          username,
          profileImage: '/user_images/profilePicture.png',
          bannerImage: '/Profilebg.png',
        }
      },
      { upsert: true, new: true, runValidators: true }
    );
    console.log("User created or found:", user);
    return user;
  } catch (error: any) {
    if (error.code === 11000) {
      console.log("Duplicate key error, retrying user creation");
      return createNewUser(address);
    }
    console.error("Error in createNewUser:", error);
    throw error;
  }
}

export async function pinAGroup({ groupId }: { groupId: string }) {
  try {
    await dbConnect();
    const user = await getCurrentUser();
    if (!user) {
      throw new Error("User not found");
    }

    const group = await Group.findById(groupId);
    if (!group) {
      throw new Error("Group not found");
    }

    if (!user.pinnedGroups.includes(group._id)) {
      user.pinnedGroups.push(group._id);
      await user.save();
    }
    revalidatePath(`/home`);
  } catch (error) {
    console.error("Error:", error);
    throw new Error("Failed to pin the group");
  }
}

export async function unpinAGroup({ groupId }: { groupId: string }) {
  try {
    await dbConnect();
    const user = await getCurrentUser();
    if (!user) {
      throw new Error("User not found");
    }
    const group = await Group.findById(groupId);
    if (!group) {
      throw new Error("Group not found");
    }
    const groupIndex = user.pinnedGroups.indexOf(group._id);
    if (groupIndex !== -1) {
      user.pinnedGroups.splice(groupIndex, 1);
      await user.save();
    }
    revalidatePath(`/home`);
  } catch (error) {
    console.error("Error:", error);
    throw new Error("Failed to unpin the group");
  }
}

export async function getAllPinnedGroups() {
  try {
    await dbConnect();
    const user = await getCurrentUser(["pinnedGroups"]);
    if (!user) {
      console.log("User not found when getting pinned groups");
      return [];
    }
    if (!user.pinnedGroups || user.pinnedGroups.length === 0) {
      console.log("User has no pinned groups");
      return [];
    }
    return user.pinnedGroups as IGroup[];
  } catch (error) {
    console.error("Error getting pinned groups:", error);
    return [];
  }
}

export async function getAllUserByQuery(searchQuery: string) {
  try {
    await dbConnect();
    if (!searchQuery.trim()) {
      return;
    }
    const allUsers = await UserModel.find({
      $or: [
        { username: { $regex: searchQuery, $options: "i" } },
      ],
    });
    return JSON.stringify(allUsers);
  } catch (error) {
    console.log(error);
    throw new Error("User not found");
  }
}