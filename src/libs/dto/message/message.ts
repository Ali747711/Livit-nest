import { Field, Int, ObjectType } from '@nestjs/graphql';
import { ObjectId } from 'mongoose';
import { Member, TotalCounter } from '../member/member';
import { MessageStatus } from 'src/libs/enums/message.enum';

@ObjectType()
export class Message {
  @Field(() => String)
  _id: ObjectId;

  @Field(() => String)
  senderId: ObjectId;

  @Field(() => String)
  receiverId: ObjectId;

  @Field(() => String)
  messageText: string;

  @Field(() => MessageStatus)
  messageStatus: MessageStatus;

  @Field(() => Date)
  createdAt: Date;

  @Field(() => Date)
  updatedAt: Date;

  /** from aggregation **/

  @Field(() => Member, { nullable: true })
  senderData?: Member;

  @Field(() => Member, { nullable: true })
  receiverData?: Member;
}

@ObjectType()
export class Messages {
  @Field(() => [Message])
  list: Message[];

  @Field(() => [TotalCounter], { nullable: true })
  metaCounter: TotalCounter[];
}
