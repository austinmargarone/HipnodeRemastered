"use server";
import { getServerSession } from "next-auth";
import { cookies } from "next/headers";
import { createAuth } from "thirdweb/auth";
import { createThirdwebClient } from "thirdweb";
import { privateKeyToAccount } from "thirdweb/wallets";
import UserModel from "@/models/User";
import dbConnect from "@/utils/mongooseConnect";
import { v4 as uuidv4 } from 'uuid'; 

const privateKey = process.env.THIRDWEB_ADMIN_PRIVATE_KEY || "";
const clientId = process.env.NEXT_PUBLIC_THIRDWEB_CLIENT_ID || "";
const domain = process.env.NEXT_PUBLIC_THIRDWEB_AUTH_DOMAIN || "";

if (!privateKey) {
  throw new Error("Missing THIRDWEB_ADMIN_PRIVATE_KEY in .env file.");
}

if (!clientId) {
  throw new Error("Missing NEXT_PUBLIC_THIRDWEB_CLIENT_ID in .env file.");
}

if (!domain) {
  throw new Error("Missing NEXT_PUBLIC_THIRDWEB_AUTH_DOMAIN in .env file.");
}

const client = createThirdwebClient({ clientId });

const thirdwebAuth = createAuth({
  domain: domain,
  adminAccount: privateKeyToAccount({ client, privateKey }),
});

import { ProfileSchema } from "@/components/profile/EditProfile";
import { revalidatePath } from "next/cache";
import Group, { IGroup } from "@/models/group.model";
import { UserData } from "@/types/mongoose";

export async function getAlLUsers() {
  try {
    await dbConnect();

    const users = await UserModel.find();

    return users as unknown as UserData[];
  } catch (err) {
    console.log(err);
    return [];
  }
}

export async function newUser(user: FormData) {
  try {
    await dbConnect();

    // check if user already exists
    const existingUser = await UserModel.findOne({
      $or: [{ email: user.get("email") }, { username: user.get("username") }],
    });

    // create user if it doesn't exist
    if (!existingUser) {
      await UserModel.create({
        email: user.get("email"),
        password: user.get("password"),
        username: user.get("username"),
        businessStage: user.get("stage"),
        codingLevel: user.get("codingLevel"),
        businessType: user.get("interests"),
      });

      return { status: "success" };
    }

    return { status: "already exists" };
  } catch (error) {
    return { status: "error" };
  }
}

// user action to fetch logged in user profile details
export async function getUserProfile(
  profileId: string | null | undefined,
  populate?: string[]
) {
  try {
    await dbConnect();

    // get the current user
    const currentUser: any = await getServerSession();

    const { email } = currentUser?.user;

    // populate profile with followers
    const query = UserModel.findById(profileId).lean();
    for (const field of populate ?? []) {
      query?.populate(field);
    }

    const User = await query;

    // check if the user is viewing their own profile.
    let myProfile;
    if (email === User?.email) {
      myProfile = true;
    } else {
      myProfile = false;
    }

    revalidatePath("/profile");
    return { profileData: User, myProfile };
  } catch (error) {
    console.log(error);
    return null;
  }
}

// user action to update logged in user profile details
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
    });

    if (!profileData) {
      console.log(profileData);
      return "no user found";
    }

    revalidatePath("/profile");
    return "success";
  } catch (error: any) {
    return error.codeName;
  }
}

// function to update current User's following & followers
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
    dbConnect();
    const currentUser: any = await getServerSession();
    const { email } = currentUser?.user;
    const User = await UserModel.findOne({ email });
    const currentUserId = User?._id;
    if (!currentUserId) {
      throw new Error("Current user ID is undefined");
    }

    // checks if logged in user has already followed other user
    let updateQuery = {};
    if (hasFollowed) {
      updateQuery = { $pull: { followers: currentUserId } };
    } else {
      updateQuery = { $addToSet: { followers: currentUserId } };
    }

    // check if other user is already in logged in user's following
    let updateFollowingQuery = {};
    if (isFollow) {
      updateFollowingQuery = { $pull: { following: followedUserId } };
    } else {
      updateFollowingQuery = { $addToSet: { following: followedUserId } };
    }

    await UserModel.findByIdAndUpdate(currentUserId, updateFollowingQuery, {
      new: true,
    });

    const user = await UserModel.findByIdAndUpdate(
      followedUserId,
      updateQuery,
      {
        new: true,
      }
    );

    revalidatePath("/profile");
    const followedStatus = user?.followers.includes(currentUserId);
    if (!user) {
      throw new Error("User not found");
    }
    return { status: followedStatus };
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
      console.log("User not found in database");
      return null;
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
  const uniqueId = uuidv4().slice(0, 8);
  const username = `user_${shortAddress}_${uniqueId}`;
  const email = `${shortAddress}_${uniqueId}@example.com`;

  try {
    const user = await UserModel.create({
      walletAddress: address,
      username,
      email,
    });
    console.log("New user created:", user);
    return user;
  } catch (error: any) {
    if (error.code === 11000) {
      console.log("Duplicate key error, retrying with a new UUID");
      return createNewUser(address);
    }
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
    const objGroupId = group._id;

    if (!user.pinnedGroups.includes(objGroupId)) {
      user.pinnedGroups.push(objGroupId);
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
    const objGroupId = group._id;
    const groupIndex = user.pinnedGroups.indexOf(objGroupId);
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
        { fullName: { $regex: searchQuery, $options: "i" } },
        { username: { $regex: searchQuery, $options: "i" } },
      ],
    });
    return JSON.stringify(allUsers);
  } catch (error) {
    console.log(error);
    throw new Error("User not found");
  }
}
