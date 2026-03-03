import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, ObjectId } from 'mongoose';
import { lookupVisit } from 'src/libs/config';
import { Properties } from 'src/libs/dto/property/property';
import { OrdinaryInquiry } from 'src/libs/dto/property/property.input';
import { View } from 'src/libs/dto/view/view';
import { ViewInput } from 'src/libs/dto/view/view.input';
import { ViewGroup } from 'src/libs/enums/view.enum';
import { P } from 'src/libs/types/common';

@Injectable()
export class ViewService {
  constructor(@InjectModel('View') private readonly viewModel: Model<View>) {}
  public async recordView(input: ViewInput): Promise<View | null> {
    const viewExist = await this.checkViewExist(input);
    if (!viewExist) {
      console.log('==== Insert New View ====');
      return await this.viewModel.create(input);
    } else return null;
  }

  public async checkViewExist(input: ViewInput): Promise<View | null> {
    const { memberId, viewRefId } = input;
    const search: P = { memberId, viewRefId };

    return (await this.viewModel.findOne(search).exec()) ?? null;
  }

  public async getVisitedProperties(memberId: ObjectId, input: OrdinaryInquiry): Promise<Properties> {
    const { page, limit } = input;
    const match: P = { viewGroup: ViewGroup.PROPERTY, memberId };

    const data: P = await this.viewModel
      .aggregate([
        { $match: match },
        { $sort: { updatedAt: -1 } },
        {
          $lookup: {
            from: 'properties',
            localField: 'viewRefId',
            foreignField: '_id',
            as: 'visitedProperty',
          },
        },
        { $unwind: '$visitedProperty' },
        {
          $facet: {
            list: [
              { $skip: (page - 1) * limit },
              { $limit: limit },
              lookupVisit,
              { $unwind: '$visitedProperty.memberData' },
            ],
            metaCounter: [{ $count: 'total' }],
          },
        },
      ])
      .exec();

    const result: Properties = { list: [], metaCounter: data[0].metaCounter };
    result.list = data[0].list.map((ele) => ele.visitedProperty);

    return result;
  }
}
