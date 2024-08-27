export interface userToken {
  address: string;  // Changed from userId to address
  iat: number;
}

export interface userProfileData {
  _id: string;
  address: string;  // Added address field
  username: string;
  profileImage: string;
  bannerImage: string;
  occupation: string;
  followers: string[];  // Changed to array of strings (user IDs)
  following: string[];  // Changed to array of strings (user IDs)
  points: number;
  bio: string;
  website: string;
  twitter: string;
  facebook: string;
  instagram: string;
  createdAt: Date;
}

// ActionBarLink and commentDataType remain unchanged

export interface interviewData {
  _id: string;
  title: string;
  desc: string;
  userId: {
    username: string;
    _id: string;
    profileImage: string;
    address: string;  // Added address field
  };
  createdAt: Date;
  image: string;
  revenue: number;
  updates: number;
  website: string;
  tags: string[];
}