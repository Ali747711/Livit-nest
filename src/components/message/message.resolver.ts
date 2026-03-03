import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { MessageService } from './message.service';
import { AuthGuard } from '../auth/guards/auth.guard';
import { AuthMember } from '../auth/decorators/authUser.decorator';
import { ObjectId } from 'mongoose';
import { Message, Messages } from '../../libs/dto/message/message';
import { MessagesInquiry } from '../../libs/dto/message/message.input';
import { shapeIntoMongoObjectId } from '../../libs/config';

@Resolver()
export class MessageResolver {
  constructor(private readonly messageService: MessageService) {}

  @UseGuards(AuthGuard)
  @Query(() => Messages)
  public async getMessages(
    @AuthMember('_id') authMember: ObjectId,
    @Args('input') input: MessagesInquiry,
  ): Promise<Messages> {
    console.log('Query: getMessages');
    return await this.messageService.getMessages(authMember, input);
  }

  @UseGuards(AuthGuard)
  @Mutation(() => Message)
  public async updateMessageStatus(
    @AuthMember('_id') authMember: ObjectId,
    @Args('messageId') messageId: string,
  ): Promise<Message> {
    console.log('Mutation: updateMessageStatus');
    return await this.messageService.updateMessageStatus(authMember, shapeIntoMongoObjectId(messageId));
  }
}
