import { Schema } from 'mongoose';
import { NotificationStatus, NotificationType } from '../libs/enums/notification.enum';

const NotificationSchema = new Schema(
  {
    authorId: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: 'Member',
    },

    receiverId: {
      type: Schema.Types.ObjectId,
      required: true,
      ref: 'Member',
    },

    notificationType: {
      type: String,
      enum: NotificationType,
      required: true,
    },

    notificationStatus: {
      type: String,
      enum: NotificationStatus,
      default: NotificationStatus.UNREAD,
    },

    notificationDesc: {
      type: String,
      required: true,
    },

    notificationRefId: {
      type: Schema.Types.ObjectId,
    },
  },
  { timestamps: true, collection: 'notifications' },
);

export default NotificationSchema;
