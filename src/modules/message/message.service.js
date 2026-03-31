import {
  errorException,
  notFoundException,
  unauthorizedException,
} from "../../common/utils/index.js";
import {
  createOne,
  find,
  findOne,
  findOneAndDelete,
} from "../../DB/db.repository.js";
import { MessageModel, UserModel } from "../../DB/index.js";

export const sendMessage = async (
  receiverId,
  { content = undefined } = {},
  files,
  user = undefined,
) => {
  if (user && receiverId === user._id.toString()) {
    errorException({ message: "Messages can't be sent to your inbox" });
  }
  const receiverAccount = await findOne({
    model: UserModel,
    filter: { _id: receiverId, confirmEmail: { $exists: true } },
  });
  if (!receiverAccount) {
    notFoundException({ message: "Failed to find matching receiver account" });
  }

  const message = await createOne({
    model: MessageModel,
    data: {
      content,
      attachments: files.map((file) => file.finalPath),
      receiverId,
      senderId: user ? user._id : undefined,
    },
  });
  return message;
};

export const getMessage = async (messageId, user) => {
  const message = await findOne({
    model: MessageModel,
    filter: {
      _id: messageId,
      $or: [{ senderId: user._id }, { receiverId: user._id }],
    },
    fields: ["-senderId", "-receiverId"],
  });

  if (!message) {
    notFoundException({ message: "No messages found" });
  }
  return message;
};
export const getMessagesList = async ({ _id }) => {
  const messages = await find({
    model: MessageModel,
    filter: {
      $or: [{ senderId: _id }, { receiverId: _id }],
    },
    fields: ["-senderId", "-receiverId"],
  });
  if (!messages) {
    notFoundException({ message: "No messages found" });
  }
  return messages;
};
export const deleteMessage = async (messageId, { _id }) => {
  const deletedMessage = await findOneAndDelete({
    model: MessageModel,
    filter: {
      // the message's ID
      _id: messageId,
      receiverId: _id,
    },
    fields: ["-senderId", "-receiverId"],
  });
  if (!deletedMessage) {
    unauthorizedException({
      message: "No messages found",
    });
  }
  return deletedMessage;
};
