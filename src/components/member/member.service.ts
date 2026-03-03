import { registerEnumType } from '@nestjs/graphql';
import { BadRequestException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, ObjectId } from 'mongoose';
import { Member, Members } from 'src/libs/dto/member/member';
import { AuthService } from '../auth/auth.service';
import { AgentsInquiry, LoginInput, MemberInput, MembersInquiry } from 'src/libs/dto/member/member.input';
import { MemberStatus, MemberType } from 'src/libs/enums/member.enum';
import { Direction, Message } from 'src/libs/enums/comma.enum';
import { MemberUpdate } from 'src/libs/dto/member/member.update';
import { P, StatisticModifier } from 'src/libs/types/common';
import { ViewGroup } from 'src/libs/enums/view.enum';
import { ViewService } from '../view/view.service';
import { Follower, Following, MeFollowed } from 'src/libs/dto/follow/follow';
import { LikeGroup } from 'src/libs/enums/like.enum';
import { LikeService } from '../like/like.service';
import { lookupAuthMemberLiked, shapeIntoMongoObjectId } from '../../libs/config';
import { LikeInput } from 'src/libs/dto/like/like.input';

@Injectable()
export class MemberService {
  constructor(
    @InjectModel('Member') private readonly memberModel: Model<Member>,
    @InjectModel('Follow') private readonly followModel: Model<Follower | Following>,
    private authService: AuthService,
    private viewService: ViewService,
    private likeService: LikeService,
  ) {}

  public async signup(input: MemberInput): Promise<Member> {
    const isExist = await this.memberModel.findOne({ memberNick: input.memberNick });
    if (isExist) throw new InternalServerErrorException(Message.USED_MEMBER_NICK_OR_PHONE);
    input.memberPassword = await this.authService.hashPassword(input.memberPassword);
    try {
      const result: Member = await this.memberModel.create(input);
      result.accessToken = await this.authService.createToken(result);
      return result;
    } catch (error: any) {
      console.log('Error, service.model: ', error.message);
      throw new InternalServerErrorException(Message.USED_MEMBER_NICK_OR_PHONE);
    }
  }

  public async login(input: LoginInput): Promise<Member> {
    const { memberNick, memberPassword } = input;
    const response = await this.memberModel.findOne({ memberNick }).select('+memberPassword').exec();
    console.log(response.memberStatus);
    if (!response || response.memberStatus === MemberStatus.DELETE) {
      throw new InternalServerErrorException(Message.NO_MEMBER_NICK);
    } else if (response.memberStatus === MemberStatus.BLOCKED) {
      throw new InternalServerErrorException(Message.BLOCKED_USER);
    }

    const isMatch = await this.authService.comparePassword(memberPassword, response?.memberPassword);
    if (!isMatch) throw new InternalServerErrorException(Message.WRONG_PASSWORD);

    response.accessToken = await this.authService.createToken(response);
    return response;
  }

  public async updateMember(memberId: ObjectId, input: MemberUpdate): Promise<Member> {
    console.log('ID: ', memberId);
    console.log('INPUT: ', input);
    const result = await this.memberModel
      .findOneAndUpdate({ _id: memberId, memberStatus: MemberStatus.ACTIVE }, input, { new: true })
      .exec();

    if (!result) throw new InternalServerErrorException(Message.UPDATE_FAILED);
    result.accessToken = await this.authService.createToken(result);
    return result;
  }

  // GET Member ========
  public async getMember(targetId: ObjectId, memberId: ObjectId): Promise<Member> {
    targetId = shapeIntoMongoObjectId(targetId);
    memberId = shapeIntoMongoObjectId(memberId);
    console.log(`Target member: ${typeof targetId}\nLog member: ${typeof memberId}`);
    const search: P = {
      _id: targetId,
      memberStatus: {
        $in: [MemberStatus.ACTIVE, MemberStatus.BLOCKED],
      },
    };

    const targetMember = await this.memberModel.findOne(search).exec();
    if (!targetMember) throw new InternalServerErrorException(Message.NO_DATA_FOUND);

    if (memberId) {
      const viewInput = { memberId, viewRefId: targetId, viewGroup: ViewGroup.MEMBER };
      const newView = await this.viewService.recordView(viewInput);

      if (newView) {
        await this.memberModel.findOneAndUpdate(search, { $inc: { memberViews: 1 } }, { new: true }).exec();
        targetMember.memberViews++;
      }

      const likeInput = { memberId, likeRefId: targetId, likeGroup: LikeGroup.MEMBER };
      targetMember.meLiked = await this.likeService.checkLikeExist(likeInput);

      const meFollowed = await this.checkSubscription(memberId, targetId);
      if (meFollowed) {
        targetMember.meFollowed = meFollowed;
      }
    }
    return targetMember;
  }

  public async checkSubscription(followerId: ObjectId, followingId: ObjectId): Promise<MeFollowed[]> {
    const result = await this.followModel.findOne({ followerId, followingId }).exec();
    return result ? [{ followerId, followingId, myFollowing: true }] : [];
  }

  // GET MEMBERS ===========
  public async getMembers(type?: string): Promise<Member[]> {
    const match: P = { memberStatus: { $in: [MemberStatus.ACTIVE, MemberStatus.BLOCKED] } };
    if (type) match.memberType = type;
    if (type) console.log('MemberService [getMembers] match: ', match);
    try {
      const result = await this.memberModel.find(match);
      return result;
    } catch (error) {
      console.log('MemberService [getMembers], Error: ', error);
      throw new BadRequestException(Message.NO_DATA_FOUND);
    }
  }

  // GET AGENTS ===========
  public async getAgents(input: AgentsInquiry, memberId: ObjectId): Promise<Members> {
    const { text } = input.search;
    const match: P = { memberType: MemberType.AGENT, memberStatus: MemberStatus.ACTIVE };
    const sort: P = { [input.sort ?? 'createdAt']: input.direction ?? Direction.DESC };

    if (text) match.memberNick = { $regex: new RegExp(text, 'i') };
    console.log('MemberService [getAgents] data: ', match);

    const result = await this.memberModel
      .aggregate([
        { $match: match },
        {
          $facet: {
            list: [
              { $sort: sort },
              { $skip: (input.page - 1) * input.limit },
              { $limit: input.limit },
              lookupAuthMemberLiked(memberId),
            ],
            metaCounter: [{ $count: 'total' }],
          },
        },
      ])
      .exec();

    console.log(result[0]);
    if (!result.length) throw new InternalServerErrorException(Message.NO_DATA_FOUND);
    return result[0];
  }

  // POST LIKE TARGET MEMBER
  public async likeTargetMember(memberId: ObjectId, likeRefId: ObjectId): Promise<Member> {
    const target: Member = await this.memberModel.findOne({ _id: likeRefId, memberStatus: MemberStatus.ACTIVE });
    if (!target) throw new InternalServerErrorException(Message.NO_DATA_FOUND);

    const input: LikeInput = {
      memberId,
      likeRefId,
      likeGroup: LikeGroup.MEMBER,
    };

    // LIKE TOGGLE
    const modifier: number = await this.likeService.toggleLike(input);
    const result = await this.memberStatsModifier({ _id: likeRefId, targetKey: 'memberLikes', modifier });
    if (!result) throw new InternalServerErrorException(Message.SOMETHING_WENT_WRONG);

    return result;
  }

  // MEMBER STATISTICS MODIFIER
  public async memberStatsModifier(input: StatisticModifier): Promise<Member> {
    console.log('Memberservice [memberStatsModifier]');
    const { _id, targetKey, modifier } = input;

    return await this.memberModel.findByIdAndUpdate(_id, { $inc: { [targetKey]: modifier } }, { new: true }).exec();
  }

  //! ADMIN AUTHORIZATION !!
  // GET ALL MEMBERS BY ADMIN
  public async getAllMembersByAdmin(input: MembersInquiry): Promise<Members> {
    const { memberStatus, memberType, text } = input.search;
    const match: P = {};

    const sort: P = { [input.sort ?? 'createdAt']: input.direction ?? Direction.DESC };

    if (memberStatus) match.memberStatus = memberStatus;
    if (memberType) match.memberType = memberType;
    if (text) match.memberNick = { $regex: new RegExp(text, 'i') };
    console.log('MemberService [getAllMembersByAdmin] match: ', match);

    const result = await this.memberModel
      .aggregate([
        { $match: match },
        { $sort: sort },
        {
          $facet: {
            list: [{ $skip: (input.page - 1) * input.limit }, { $limit: input.limit }],
            metaCounter: [{ $count: 'total' }],
          },
        },
      ])
      .exec();

    if (!result.length) throw new InternalServerErrorException(Message.NO_DATA_FOUND);
    return result[0];
  }

  // UPDATE MEMBER BY ADMIN
  public async updateMemberByAdmin(input: MemberUpdate): Promise<Member> {
    try {
      const result = await this.memberModel.findOneAndUpdate({ _id: input._id }, input, { new: true }).exec();
      return result;
    } catch (error) {
      console.log('MemberService [updateMemberByAdmin] ERROR: ', error);
      throw new InternalServerErrorException(Message.UPDATE_FAILED);
    }
  }
}
