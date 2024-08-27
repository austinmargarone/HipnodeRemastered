import { Server } from "socket.io";
import { createAuth } from "thirdweb/auth";
import { createThirdwebClient } from "thirdweb";
import { privateKeyToAccount } from "thirdweb/wallets";
import Notification from "@/models/notification.model";
import { getAllNotification } from "@/utils/actions/notification.action";
import Message from "@/models/message.model";
import UserModel from "@/models/User";
import { v4 as uuidv4 } from 'uuid';

const privateKey = process.env.THIRDWEB_ADMIN_PRIVATE_KEY || "";
const clientId = process.env.NEXT_PUBLIC_THIRDWEB_CLIENT_ID || "";
const domain = process.env.NEXT_PUBLIC_THIRDWEB_AUTH_DOMAIN || "";

const client = createThirdwebClient({ clientId });

const thirdwebAuth = createAuth({
  domain: domain,
  adminAccount: privateKeyToAccount({ client, privateKey }),
});

export default function SocketHandler(req, res) {
  if (res.socket.server.io) {
    console.log("Socket is already running");
  } else {
    console.log("Socket is initializing");
    const io = new Server(res.socket.server, { addTrailingSlash: false });
    res.socket.server.io = io;

    const userMap = new Map();

    io.on("connection", async (socket) => {
      const jwt = socket.handshake.headers.cookie?.split(';').find(c => c.trim().startsWith('jwt='))?.split('=')[1];
      if (!jwt) {
        console.log("No JWT found in socket connection");
        socket.disconnect(true);
        return;
      }

      try {
        const authResult = await thirdwebAuth.verifyJWT({ jwt });
        if (!authResult.valid || !authResult.parsedJWT.sub) {
          console.log("Invalid JWT or missing subject in socket connection");
          socket.disconnect(true);
          return;
        }
        let user = await UserModel.findOne({ address: authResult.parsedJWT.sub });
        if (!user) {
          console.log("User not found for address:", authResult.parsedJWT.sub);
          // Instead of disconnecting, you might want to create a new user here
          // user = await createNewUser(authResult.parsedJWT.sub);
          // if (!user) {
          //   console.log("Failed to create new user");
          //   socket.disconnect(true);
          //   return;
          // }
          socket.disconnect(true);
          return;
        }

        const userId = user._id.toString();
        console.log("User connected:", userId);

        // Rest of your socket logic...

      } catch (error) {
        console.error("Error in socket connection:", error);
        socket.disconnect(true);
      }
    });
  }
  res.end();
}

// You might want to add this function if you decide to create users in the socket connection
async function createNewUser(address: string) {
  const shortAddress = address.slice(0, 6);
  const uniqueId = uuidv4().slice(0, 8);
  const username = `user_${shortAddress}_${uniqueId}`;

  try {
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
      { upsert: true, new: true }
    );
    console.log("User created or found:", user);
    return user;
  } catch (error) {
    console.error("Error in createNewUser:", error);
    return null;
  }
}


        const userId = user._id.toString();
        const allNotif = await getAllNotification({ userId, type: "all" });
        socket.emit("set-notifications", allNotif);

        const query = {
          $or: [{ userIdFrom: user._id }, { userIdTo: user._id }],
        };

        const messages = await Message.find(query)
          .populate("userIdFrom")
          .populate("userIdTo")
          .sort({ createdAt: 1 })
          .lean();

        socket.emit("set-messages", messages);

        // Active Users
        userMap.set(userId, [...userMap.keys()]);

        // Emit initial active users list
        socket.emit("set-active-users", [...userMap.keys()]);

        const intervalId = setInterval(() => {
          const currentList = [...userMap.keys()];
          const lastList = userMap.get(userId) || [];
          if (
            currentList.length !== lastList.length ||
            currentList.some((userId) => !lastList.includes(userId))
          ) {
            socket.emit("set-active-users", currentList);
            userMap.set(userId, currentList);
          }
        }, 1000);

        // Handle disconnect event
        socket.on("disconnect", () => {
          userMap.delete(userId);
          clearInterval(intervalId);
        });

        // Create a chat list
        const chatMap = new Map();
        messages.forEach((msg) => {
          // Get the other user that is not the current user
          const otherUser = msg.userIdFrom._id.equals(userId)
            ? msg.userIdTo
            : msg.userIdFrom;

          // Check if chat exists
          let chat = chatMap.get(otherUser._id);

          if (!chat) {
            // If not, create it
            chat = {
              user: otherUser,
              lastCreatedAt: msg.createdAt,
              lastMessage: msg.text,
              isRead: msg.read,
              userIdFrom: msg.userIdFrom._id,
            };
            // Add to map
            chatMap.set(otherUser._id.toString(), chat);
          } else {
            // If chat exists, just update last message
            chat.lastCreatedAt = msg.createdAt;
            chat.lastMessage = msg.text;
            chat.isRead = msg.read;
            chat.userIdFrom = msg.userIdFrom._id;
          }
        });

        // Get chats from map values
        const chatList = [...chatMap.values()];
        socket.emit("set-chatList", chatList);

        const subscriber = Notification.watch([
          {
            $match: {
              operationType: "insert",
              "fullDocument.userTo": userId,
            },
          },
        ]);

        subscriber.on("change", (change) => {
          socket.emit("notification", change.fullDocument);
        });

        const chatSubscriber = Message.watch([
          {
            $match: {
              operationType: "insert",
              $or: [
                { "fullDocument.userIdFrom": user._id },
                { "fullDocument.userIdTo": user._id },
              ],
            },
          },
        ]);

        chatSubscriber.on("change", async (change) => {
          // get the full chat:
          const fullChat = await Message.findOne({
            _id: change.fullDocument._id,
          })
            .populate("userIdFrom")
            .populate("userIdTo")
            .lean();
          socket.emit("message", fullChat);
        });
      } catch (error) {
        console.error("Error in socket connection:", error);
        socket.disconnect(true);
      }
    });
  }
  res.end();
}
