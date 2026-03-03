import { Field, InputType, Int } from '@nestjs/graphql';
import { IsNotEmpty, Length, Min } from 'class-validator';
import { ObjectId } from 'mongoose';

@InputType()
export class MessageInput {
  @IsNotEmpty()
  @Field(() => String)
  receiverId: ObjectId;

  @IsNotEmpty()
  @Length(1, 1000)
  @Field(() => String)
  messageText: string;
}

@InputType()
class MessageSearch {
  @IsNotEmpty()
  @Field(() => String)
  memberId: ObjectId;
}

@InputType()
export class MessagesInquiry {
  @IsNotEmpty()
  @Min(1)
  @Field(() => Int)
  page: number;

  @IsNotEmpty()
  @Min(1)
  @Field(() => Int)
  limit: number;

  @IsNotEmpty()
  @Field(() => MessageSearch)
  search: MessageSearch;
}
