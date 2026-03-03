import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, ObjectId } from 'mongoose';
import { lookupFavorite } from 'src/libs/config';
import { Like, MeLiked } from 'src/libs/dto/like/like';
import { LikeInput } from 'src/libs/dto/like/like.input';
import { Properties } from 'src/libs/dto/property/property';
import { OrdinaryInquiry } from 'src/libs/dto/property/property.input';
import { Message } from 'src/libs/enums/comma.enum';
import { LikeGroup } from 'src/libs/enums/like.enum';
import { P } from 'src/libs/types/common';

@Injectable()
export class LikeService {
  constructor(@InjectModel('Like') private readonly likeModel: Model<Like>) {}

  public async toggleLike(input: LikeInput): Promise<number> {
    const search: P = { memberId: input.memberId, likeRefId: input.likeRefId, likeGroup: input.likeGroup };
    const exist = await this.likeModel.findOne(search).exec();

    let modifier = 1;

    if (exist) {
      await this.likeModel.findOneAndDelete(search).exec();
      modifier = -1;
    } else {
      try {
        await this.likeModel.create(input);
      } catch (error) {
        console.log('Error in LikeService [toggleLike] ', error);
        throw new BadRequestException(Message.CREATE_FAILED);
      }
    }

    console.log(`Like modifier: ${modifier}`);
    return modifier;
  }

  public async checkLikeExist(input: LikeInput): Promise<MeLiked[]> {
    const { memberId, likeRefId } = input;

    const result = await this.likeModel.findOne({ memberId, likeRefId }).exec();
    return result ? [{ memberId: memberId, likeRefId: likeRefId, myFavorite: true }] : [];
  }

  public async getFavoriteProperties(memberId: ObjectId, input: OrdinaryInquiry): Promise<Properties> {
    const { page, limit } = input;
    const match: P = { likeGroup: LikeGroup.PROPERTY, memberId };

    const data: P = await this.likeModel
      .aggregate([
        { $match: match },
        { $sort: { updatedAt: -1 } },
        {
          $lookup: {
            from: 'properties',
            localField: 'likeRefId',
            foreignField: '_id',
            as: 'favoriteProperty',
          },
        },
        { $unwind: '$favoriteProperty' },
        {
          $facet: {
            list: [
              { $skip: (page - 1) * limit },
              { $limit: limit },
              lookupFavorite,
              { $unwind: '$favoriteProperty.memberData' },
            ],
            metaCounter: [{ $count: 'total' }],
          },
        },
      ])
      .exec();

    const result: Properties = { list: [], metaCounter: data[0].metaCounter };
    result.list = data[0].list.map((ele) => ele.favoriteProperty);
    console.log('LikeService [getFavoriteProperties], result: ', result);

    return result;
  }
}
