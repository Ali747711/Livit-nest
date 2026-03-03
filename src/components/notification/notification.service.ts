import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, ObjectId } from 'mongoose';
import { Notification, Notifications } from '../../libs/dto/notification/notification';
import { NotificationsInquiry } from '../../libs/dto/notification/notification.input';
import { NotificationStatus, NotificationType } from '../../libs/enums/notification.enum';
import { shapeIntoMongoObjectId } from '../../libs/config';
import { Direction, Message } from '../../libs/enums/comma.enum';
import { P } from '../../libs/types/common';

interface CreateNotificationInput {
  authorId: ObjectId;
  receiverId: ObjectId;
  notificationType: NotificationType;
  notificationDesc: string;
  notificationRefId?: ObjectId;
}

@Injectable()
export class NotificationService {
  constructor(
    @InjectModel('Notification') private readonly notificationModel: Model<Notification>,
  ) {}

  public async createNotification(input: CreateNotificationInput): Promise<Notification> {
    try {
      return await this.notificationModel.create(input);
    } catch (err: any) {
      console.log('Error: NotificationService.createNotification', err.message);
    }
  }

  public async getMyNotifications(memberId: ObjectId, input: NotificationsInquiry): Promise<Notifications> {
    const sort: P = { createdAt: Direction.DESC };

    const result = await this.notificationModel
      .aggregate([
        { $match: { receiverId: memberId } },
        { $sort: sort },
        {
          $facet: {
            list: [
              { $skip: (input.page - 1) * input.limit },
              { $limit: input.limit },
              {
                $lookup: {
                  from: 'members',
                  localField: 'authorId',
                  foreignField: '_id',
                  as: 'authorData',
                },
              },
              { $unwind: '$authorData' },
            ],
            metaCounter: [{ $count: 'total' }],
          },
        },
      ])
      .exec();

    if (!result.length) throw new InternalServerErrorException(Message.NO_DATA_FOUND);
    return result[0];
  }

  public async updateNotification(memberId: ObjectId, notificationId: ObjectId): Promise<Notification> {
    const result = await this.notificationModel
      .findOneAndUpdate(
        {
          _id: shapeIntoMongoObjectId(notificationId),
          receiverId: memberId,
          notificationStatus: NotificationStatus.UNREAD,
        },
        { notificationStatus: NotificationStatus.READ },
        { new: true },
      )
      .exec();

    if (!result) throw new InternalServerErrorException(Message.UPDATE_FAILED);
    return result;
  }
}
