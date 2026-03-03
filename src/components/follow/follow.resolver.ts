import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { FollowService } from './follow.service';
import { UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/guards/auth.guard';
import { Follower, Followers, Followings } from 'src/libs/dto/follow/follow';
import { AuthMember } from '../auth/decorators/authUser.decorator';
import { ObjectId } from 'mongoose';
import { shapeIntoMongoObjectId } from 'src/libs/config';
import { WithoutGuard } from '../auth/guards/without.guard';
import { FollowInquiry } from 'src/libs/dto/follow/follow.input';

@Resolver()
export class FollowResolver {
  constructor(private readonly followService: FollowService) {}

  // POST FOLLOWING
  @UseGuards(AuthGuard)
  @Mutation(() => Follower)
  public async subscribe(@Args('input') input: string, @AuthMember('_id') memberId: ObjectId): Promise<Follower> {
    console.log('Mutation: subscribe');
    const followingId = shapeIntoMongoObjectId(input);
    return await this.followService.subscribe(memberId, followingId);
  }

  // POST: UNFOLLOWING
  @UseGuards(AuthGuard)
  @Mutation(() => Follower)
  public async unsubscribe(@Args('input') input: string, @AuthMember('_id') memberId: ObjectId): Promise<Follower> {
    console.log('Mutation: unsubscribe');
    const followingId = shapeIntoMongoObjectId(input);
    return await this.followService.unsubscribe(memberId, followingId);
  }

  // GET: GET MEMBER FOLLOWINGS
  @UseGuards(WithoutGuard)
  @Query(() => Followings)
  public async getMemberFollowings(
    @Args('input') input: FollowInquiry,
    @AuthMember('_id') memberId: ObjectId,
  ): Promise<Followings> {
    console.log('Query: getMemberFollowings');
    input.search.followerId = shapeIntoMongoObjectId(input.search.followerId);

    return await this.followService.getMemberFollowings(memberId, input);
  }

  // GET: GET MEMBER FOLLOWERS
  @UseGuards(WithoutGuard)
  @Query(() => Followers)
  public async getMemberFollowers(
    @Args('input') input: FollowInquiry,
    @AuthMember('_id') memberId: ObjectId,
  ): Promise<Followers> {
    console.log('Query: getMemberFollowers');
    input.search.followingId = shapeIntoMongoObjectId(input.search.followingId);

    return await this.followService.getMemberFollowers(memberId, input);
  }
}
