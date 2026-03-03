import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, ObjectId } from 'mongoose';
import { Properties, Property } from 'src/libs/dto/property/property';
import {
  AgentPropertiesInquiry,
  AllPropertiesInquiry,
  OrdinaryInquiry,
  PropertyiesInquiry,
  PropertyInput,
} from 'src/libs/dto/property/property.input';
import { Direction, Message } from 'src/libs/enums/comma.enum';
import { MemberService } from '../member/member.service';
import { P, StatisticModifier } from 'src/libs/types/common';
import { PropertyStatus } from 'src/libs/enums/property.enum';
import { ViewGroup } from 'src/libs/enums/view.enum';
import { ViewService } from '../view/view.service';
import { LikeGroup } from 'src/libs/enums/like.enum';
import { LikeService } from '../like/like.service';
import moment from 'moment';
import { PropertyUpdate } from 'src/libs/dto/property/property.update';
import { lookupAuthMemberLiked, lookupMember, shapeIntoMongoObjectId } from 'src/libs/config';
import { LikeInput } from 'src/libs/dto/like/like.input';

@Injectable()
export class PropertyService {
  constructor(
    @InjectModel('Property') private readonly propertyModel: Model<Property>,
    private memberService: MemberService,
    private viewService: ViewService,
    private likeService: LikeService,
  ) {}
  public async createProperty(input: PropertyInput): Promise<Property> {
    try {
      const result = await this.propertyModel.create(input);
      await this.memberService.memberStatsModifier({ _id: input.memberId, targetKey: 'memberProperties', modifier: 1 });
      return result;
    } catch (error) {
      console.log('PropertyService [createProperty] ERROR: ', error);
      throw new InternalServerErrorException(Message.CREATE_FAILED);
    }
  }

  // GET PROPERTY
  public async getProperty(memberId: ObjectId, propertyId: ObjectId): Promise<Property> {
    try {
      const search: P = {
        _id: propertyId,
        propertyStatus: PropertyStatus.ACTIVE,
      };
      console.log(search);
      const targetProperty: Property = await this.propertyModel.findOne(search).lean().exec();
      if (!targetProperty) throw new InternalServerErrorException(Message.NO_DATA_FOUND);

      if (memberId) {
        const viewInput = { memberId, viewRefId: propertyId, viewGroup: ViewGroup.PROPERTY };
        const newView = await this.viewService.recordView(viewInput);

        if (newView) {
          await this.propertyStatsEditor({ _id: propertyId, targetKey: 'propertyViews', modifier: 1 });

          targetProperty.propertyViews++;
        }

        const likeInput = { memberId, likeRefId: propertyId, likeGroup: LikeGroup.PROPERTY };
        targetProperty.meLiked = await this.likeService.checkLikeExist(likeInput);
      }
      targetProperty.memberData = await this.memberService.getMember(targetProperty.memberId, memberId);
      return targetProperty;
    } catch (error) {
      console.log('PropertyService [getProperty] ERROR: ', error);
      throw new InternalServerErrorException(Message.NO_DATA_FOUND);
    }
  }

  // PROPERTY STATS EDITOR
  public async propertyStatsEditor(input: StatisticModifier): Promise<Property> {
    const { _id, targetKey, modifier } = input;
    return await this.propertyModel.findByIdAndUpdate(_id, { $inc: { [targetKey]: modifier } }, { new: true }).exec();
  }

  // UPDATE PROPERTY
  public async updateProperty(memberId: ObjectId, input: PropertyUpdate): Promise<Property> {
    console.log('Incoming Pro Input: ', input);
    try {
      let { propertyStatus, soldAt, deletedAt } = input;
      const search: P = {
        _id: input._id,
        memberId: memberId,
      };

      if (propertyStatus === PropertyStatus.SOLD) soldAt = moment().toDate();
      else if (propertyStatus === PropertyStatus.DELETE) deletedAt = moment().toDate();

      const result = await this.propertyModel.findOneAndUpdate(search, input, { new: true }).exec();

      if (!result) throw new InternalServerErrorException(Message.UPDATE_FAILED);
      if (soldAt || deletedAt) {
        await this.memberService.memberStatsModifier({
          _id: memberId,
          targetKey: 'memberProperties',
          modifier: -1,
        });
      }

      return result;
    } catch (error) {
      console.log('PropertyService [updateProperty] ERROR: ', error);
      throw new InternalServerErrorException(Message.UPDATE_FAILED);
    }
  }

  // GET PROPERTIES
  public async getProperties(memberId: ObjectId, input: PropertyiesInquiry): Promise<Properties> {
    const match: P = { propertyStatus: PropertyStatus.ACTIVE };
    const sort: P = { [input.sort ?? 'createdAt']: input.direction ?? Direction.DESC };
    // console.log(input);
    this.shapeMatchQuery(match, input);
    // console.log('PropertyService [getProperties] match: ', match);
    // console.log(sort);
    const result = await this.propertyModel.aggregate([
      { $match: match },
      { $sort: sort },
      {
        $facet: {
          list: [
            { $skip: (input.page - 1) * input.limit },
            { $limit: input.limit },
            lookupAuthMemberLiked(memberId),
            lookupMember,
            { $unwind: '$memberData' },
          ],
          metaCounter: [{ $count: 'total' }],
        },
      },
    ]);

    if (!result.length) throw new InternalServerErrorException(Message.NO_DATA_FOUND);
    // console.log(result);
    return result[0];
  }

  // SHAPE MATCH QUERY
  private shapeMatchQuery(match: P, input: PropertyiesInquiry): void {
    const {
      memberId,
      locationList,
      roomsList,
      bedsList,
      typeList,
      periodsRange,
      pricesRange,
      squaresRange,
      options,
      text,
    } = input.search;

    if (memberId) match.memberId = shapeIntoMongoObjectId(memberId);
    if (locationList && locationList.length) match.propertyLocation = { $in: locationList };
    if (roomsList && roomsList.length) match.propertyRooms = { $in: roomsList };
    if (bedsList && bedsList.length) match.propertyBeds = { $in: bedsList };
    if (typeList && typeList.length) match.propertyType = { $in: typeList };

    if (pricesRange) match.propertyPrice = { $gte: pricesRange.start, $lte: pricesRange.end };
    if (periodsRange) match.createdAt = { $gte: periodsRange.start, $lte: periodsRange.end };
    if (squaresRange) match.propertySquare = { $gte: squaresRange.start, $lte: squaresRange.end };

    if (text) match.propertyTitle = { $regex: new RegExp(text, 'i') };

    if (options) {
      match['$or'] = options.map((ele) => {
        return { [ele]: true }; //{propertyRent:true}
      });
    }
  }

  // GET FAVORITES
  public async getFavorites(memberId: ObjectId, input: OrdinaryInquiry): Promise<Properties> {
    return await this.likeService.getFavoriteProperties(memberId, input);
  }

  // GET VISITED
  public async getVisited(memberId: ObjectId, input: OrdinaryInquiry): Promise<Properties> {
    return await this.viewService.getVisitedProperties(memberId, input);
  }

  // LIKE TARGET PROPERTY
  public async likeTargetProperty(memberId: ObjectId, likeRefId: ObjectId): Promise<Property> {
    const target: Property = await this.propertyModel
      .findOne({ _id: likeRefId, propertyStatus: PropertyStatus.ACTIVE })
      .exec();

    if (!target) throw new InternalServerErrorException(Message.NO_DATA_FOUND);

    const input: LikeInput = {
      memberId,
      likeRefId,
      likeGroup: LikeGroup.PROPERTY,
    };

    // like toggle
    const modifier: number = await this.likeService.toggleLike(input);
    console.log(modifier);
    const result = await this.propertyStatsEditor({ _id: likeRefId, targetKey: 'propertyLikes', modifier });
    if (!result) throw new InternalServerErrorException(Message.SOMETHING_WENT_WRONG);

    return result;
  }

  // GET ADMIN PROPERTIES
  public async getAgentProperties(memberId: ObjectId, input: AgentPropertiesInquiry): Promise<Properties> {
    const { propertyStatus } = input.search;

    const match: P = {
      memberId,
      propertyStatus: propertyStatus ?? { $ne: PropertyStatus.DELETE },
    };

    const sort: P = { [input.sort ?? 'createdAt']: input.direction ?? Direction.DESC };

    const result = await this.propertyModel
      .aggregate([
        { $match: match },
        { $sort: sort },
        {
          $facet: {
            list: [
              { $skip: (input.page - 1) * input.limit },
              { $limit: input.limit },
              {
                $lookup: {
                  from: 'members',
                  localField: 'memberId',
                  foreignField: '_id',
                  as: 'memberData',
                },
              },
              { $unwind: '$memberData' },
            ],
            metaCounter: [{ $count: 'total' }],
          },
        },
      ])
      .exec();

    if (!result.length) throw new InternalServerErrorException(Message.NO_DATA_FOUND);

    return result[0];
  }

  public async getAllPropertiesByAdmin(input: AllPropertiesInquiry): Promise<Properties> {
    const { propertyStatus, propertyLocationList } = input.search;

    console.log(input);
    const match: P = {};
    const sort: P = { [input.sort ?? 'createdAt']: input?.direction ?? Direction.DESC };

    if (propertyStatus) match.propertyStatus = propertyStatus;
    if (propertyLocationList) match.propertyLocation = { $in: propertyLocationList };

    console.log(match);

    const result = await this.propertyModel
      .aggregate([
        { $match: match },
        { $sort: sort },
        {
          $facet: {
            list: [
              { $skip: (input.page - 1) * input.limit },
              { $limit: input.limit },
              {
                $lookup: {
                  from: 'members',
                  localField: 'memberId',
                  foreignField: '_id',
                  as: 'memberData',
                },
              },
              { $unwind: '$memberData' },
            ],
            metaCounter: [{ $count: 'total' }],
          },
        },
      ])
      .exec();

    if (!result.length) throw new InternalServerErrorException(Message.NO_DATA_FOUND);

    console.log('getAllPropertiesByAdmin ==> result', result);

    return result[0];
  }

  // UPDATE PROPERTY BY ADMIN
  public async updatePropertyByAdmin(input: PropertyUpdate): Promise<Property> {
    let { propertyStatus, soldAt, deletedAt } = input;

    console.log(input);
    const search: P = {
      _id: input._id,
      // propertyStatus: input.propertyStatus,
    };

    if (propertyStatus === PropertyStatus.SOLD) soldAt = moment().toDate();
    else if (propertyStatus === PropertyStatus.DELETE) deletedAt = moment().toDate();

    // const property = await this.propertyModel.findOne(search);
    // console.log(property);

    const result = await this.propertyModel.findOneAndUpdate(search, input, { new: true }).exec();
    console.log(result);
    if (!result) throw new InternalServerErrorException(Message.UPDATE_FAILED);

    if (soldAt || deletedAt) {
      await this.memberService.memberStatsModifier({
        _id: result.memberId,
        targetKey: 'memberProperties',
        modifier: -1,
      });
    }
    return result;
  }

  // REMOVE PROPERTY BY ADMIN
  public async removePropertyByAdmin(propertyId: ObjectId): Promise<Property> {
    const search: P = { _id: propertyId, propertyStatus: PropertyStatus.DELETE }; // Admin cannot delete AGENT properties unless property is DELETE status

    const result = await this.propertyModel.findOneAndDelete(search).exec();
    if (!result) throw new InternalServerErrorException(Message.REMOVE_FAILED);

    return result;
  }
}
