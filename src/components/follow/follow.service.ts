import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, ObjectId } from 'mongoose';
import { Follower, Followers, Following, Followings } from 'src/libs/dto/follow/follow';
import { MemberService } from '../member/member.service';
import { Direction, Message } from 'src/libs/enums/comma.enum';
import { FollowInquiry } from 'src/libs/dto/follow/follow.input';
import { P } from 'src/libs/types/common';
import { lookupAuthMemberFollowed, lookupAuthMemberLiked } from 'src/libs/config';

@Injectable()
export class FollowService {
  constructor(
    @InjectModel('Follow') private readonly followModel: Model<Follower | Following>,
    private readonly memberService: MemberService,
  ) {}

  public async subscribe(followerId: ObjectId, followingId: ObjectId): Promise<Follower> {
    if (followingId.toString() === followerId.toString()) {
      throw new InternalServerErrorException(Message.SELF_SUBSCRIPTION_DENIED);
    }

    const targetMember = await this.memberService.getMember(followingId, null);
    if (!targetMember) throw new InternalServerErrorException(Message.NO_DATA_FOUND);

    const result = await this.registerSubscription(followerId, followingId);

    await this.memberService.memberStatsModifier({ _id: followerId, targetKey: 'memberFollowings', modifier: 1 });
    await this.memberService.memberStatsModifier({ _id: followingId, targetKey: 'memberFollowers', modifier: 1 });

    return result;
  }

  private async registerSubscription(followerId: ObjectId, followingId: ObjectId): Promise<Follower> {
    try {
      return await this.followModel.create({ followingId, followerId });
    } catch (error: any) {
      console.log('FollowService [registerSubscription] ERROR: ', error.message);
      throw new InternalServerErrorException(Message.CREATE_FAILED);
    }
  }

  public async unsubscribe(followerId: ObjectId, followingId: ObjectId): Promise<Follower> {
    const targetMember = await this.memberService.getMember(followingId, null);
    if (!targetMember) throw new InternalServerErrorException(Message.NO_DATA_FOUND);

    const result = await this.followModel.findOneAndDelete({ followingId, followerId }).exec();

    await this.memberService.memberStatsModifier({ _id: followerId, targetKey: 'memberFollowings', modifier: -1 });
    await this.memberService.memberStatsModifier({ _id: followingId, targetKey: 'memberFollowers', modifier: -1 });

    return result;
  }

  public async getMemberFollowings(memberId: ObjectId, input: FollowInquiry): Promise<Followings> {
    const { page, limit, search } = input;

    if (!search.followerId) throw new InternalServerErrorException(Message.BAD_REQUEST);

    const match: P = { followerId: search.followerId };

    // console.log(input);
    const follows = await this.followModel.find({ followerId: search.followerId });
    console.log(follows);
    const result = await this.followModel
      .aggregate([
        { $match: match },
        { $sort: { createdAt: Direction.DESC } },
        {
          $facet: {
            list: [
              { $skip: (page - 1) * limit },
              { $limit: limit },
              lookupAuthMemberLiked(memberId, '$followingId'),
              lookupAuthMemberFollowed({ followerId: memberId, followingId: '$followingId' }),
              {
                $lookup: {
                  from: 'members',
                  localField: 'followingId',
                  foreignField: '_id',
                  as: 'followingData',
                },
              },
              { $unwind: '$followingData' },
            ],
            metaCounter: [{ $count: 'total' }],
          },
        },
      ])
      .exec();

    if (!result.length) throw new InternalServerErrorException(Message.NO_DATA_FOUND);

    console.log(result[0]);
    return result[0];
  }

  public async getMemberFollowers(memberId: ObjectId, input: FollowInquiry): Promise<Followers> {
    const { page, limit, search } = input;
    if (!search.followingId) throw new InternalServerErrorException(Message.BAD_REQUEST);

    const match: P = { followingId: search.followingId };

    const result = await this.followModel
      .aggregate([
        { $match: match },
        { $sort: { createdAt: Direction.DESC } },
        {
          $facet: {
            list: [
              { $skip: (page - 1) * limit },
              { $limit: limit },
              lookupAuthMemberLiked(memberId, '$followerId'),
              lookupAuthMemberFollowed({ followerId: memberId, followingId: '$followerId' }),
              {
                $lookup: {
                  from: 'members',
                  localField: 'followerId',
                  foreignField: '_id',
                  as: 'followerData',
                },
              },
              { $unwind: '$followerData' },
            ],
            metaCounter: [{ $count: 'total' }],
          },
        },
      ])
      .exec();

    if (!result.length) throw new InternalServerErrorException(Message.NO_DATA_FOUND);
    return result[0];
  }
}
