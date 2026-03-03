import { BadRequestException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, ObjectId } from 'mongoose';
import { Message, Messages } from '../../libs/dto/message/message';
import { MessageInput, MessagesInquiry } from '../../libs/dto/message/message.input';
import { MessageStatus } from '../../libs/enums/message.enum';
import { shapeIntoMongoObjectId } from '../../libs/config';
import { Direction, Message as Msg } from '../../libs/enums/comma.enum';
import { P } from '../../libs/types/common';

@Injectable()
export class MessageService {
  constructor(@InjectModel('Message') private readonly messageModel: Model<Message>) {}

  public async createMessage(senderId: ObjectId, input: MessageInput): Promise<Message> {
    try {
      const result = await this.messageModel.create({
        senderId,
        receiverId: shapeIntoMongoObjectId(input.receiverId),
        messageText: input.messageText,
      });
      return result;
    } catch (err: any) {
      console.log('Error: MessageService.createMessage', err.message);
      throw new BadRequestException(Msg.CREATE_FAILED);
    }
  }

  public async getMessages(memberId: ObjectId, input: MessagesInquiry): Promise<Messages> {
    const partnerId = shapeIntoMongoObjectId(input.search.memberId);
    const sort: P = { createdAt: Direction.DESC };

    const result = await this.messageModel
      .aggregate([
        {
          $match: {
            $or: [
              { senderId: memberId, receiverId: partnerId },
              { senderId: partnerId, receiverId: memberId },
            ],
          },
        },
        { $sort: sort },
        {
          $facet: {
            list: [
              { $skip: (input.page - 1) * input.limit },
              { $limit: input.limit },
              {
                $lookup: {
                  from: 'members',
                  localField: 'senderId',
                  foreignField: '_id',
                  as: 'senderData',
                },
              },
              { $unwind: '$senderData' },
              {
                $lookup: {
                  from: 'members',
                  localField: 'receiverId',
                  foreignField: '_id',
                  as: 'receiverData',
                },
              },
              { $unwind: '$receiverData' },
            ],
            metaCounter: [{ $count: 'total' }],
          },
        },
      ])
      .exec();

    if (!result.length) throw new InternalServerErrorException(Msg.NO_DATA_FOUND);
    return result[0];
  }

  public async updateMessageStatus(memberId: ObjectId, messageId: ObjectId): Promise<Message> {
    const result = await this.messageModel
      .findOneAndUpdate(
        {
          _id: shapeIntoMongoObjectId(messageId),
          receiverId: memberId,
          messageStatus: MessageStatus.UNREAD,
        },
        { messageStatus: MessageStatus.READ },
        { new: true },
      )
      .exec();

    if (!result) throw new InternalServerErrorException(Msg.UPDATE_FAILED);
    return result;
  }
}
