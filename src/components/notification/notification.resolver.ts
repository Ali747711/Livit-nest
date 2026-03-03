import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { NotificationService } from './notification.service';
import { AuthGuard } from '../auth/guards/auth.guard';
import { AuthMember } from '../auth/decorators/authUser.decorator';
import { ObjectId } from 'mongoose';
import { Notification, Notifications } from '../../libs/dto/notification/notification';
import { NotificationsInquiry } from '../../libs/dto/notification/notification.input';
import { shapeIntoMongoObjectId } from '../../libs/config';

@Resolver()
export class NotificationResolver {
  constructor(private readonly notificationService: NotificationService) {}

  @UseGuards(AuthGuard)
  @Query(() => Notifications)
  public async getMyNotifications(
    @AuthMember('_id') authMember: ObjectId,
    @Args('input') input: NotificationsInquiry,
  ): Promise<Notifications> {
    console.log('Query: getMyNotifications');
    return await this.notificationService.getMyNotifications(authMember, input);
  }

  @UseGuards(AuthGuard)
  @Mutation(() => Notification)
  public async updateNotification(
    @AuthMember('_id') authMember: ObjectId,
    @Args('notificationId') notificationId: string,
  ): Promise<Notification> {
    console.log('Mutation: updateNotification');
    return await this.notificationService.updateNotification(authMember, shapeIntoMongoObjectId(notificationId));
  }
}
