import { Schema } from 'mongoose';
import { MessageStatus } from '../libs/enums/message.enum';

const MessageSchema = new Schema(
  {
    senderId: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: 'Member',
    },

    receiverId: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: 'Member',
    },

    messageText: {
      type: String,
      required: true,
    },

    messageStatus: {
      type: String,
      enum: MessageStatus,
      default: MessageStatus.UNREAD,
    },
  },
  { timestamps: true, collection: 'messages' },
);

export default MessageSchema;
