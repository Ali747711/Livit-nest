import { BadRequestException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Comment, Comments } from '../../libs/dto/comment/comment';
import { Model, ObjectId } from 'mongoose';
import { CommentInput, CommentsInquiry } from '../../libs/dto/comment/comment.input';
import { MemberService } from '../member/member.service';
import { CommentGroup, CommentStatus } from '../../libs/enums/comment.enum';
import { PropertyService } from '../property/property.service';
import { BoardArticleService } from '../board-article/board-article.service';
import { shapeIntoMongoObjectId } from '../../libs/config';
import { CommentUpdate } from '../../libs/dto/comment/comment.update';
import { P } from '../../libs/types/common';
import { Direction, Message } from 'src/libs/enums/comma.enum';

@Injectable()
export class CommentService {
  constructor(
    @InjectModel('Comment') private readonly commentModel: Model<Comment>,
    private readonly memberService: MemberService,
    private readonly propertyService: PropertyService,
    private readonly boardArticleService: BoardArticleService,
  ) {}

  public async createComment(memberId: ObjectId, input: CommentInput): Promise<Comment> {
    input.memberId = memberId;

    let result = null;
    try {
      result = await this.commentModel.create(input);
    } catch (err: any) {
      console.log('CommentService=>createComment Error:', err.message);
      throw new BadRequestException(Message.CREATE_FAILED);
    }

    switch (input.commentGroup) {
      case CommentGroup.PROPERTY:
        await this.propertyService.propertyStatsEditor({
          _id: input.commentRefId,
          targetKey: 'propertyComments',
          modifier: 1,
        });
        break;
      case CommentGroup.ARTICLE:
        await this.boardArticleService.boardArticleStatsEditor({
          _id: input.commentRefId,
          targetKey: 'articleComments',
          modifier: 1,
        });
        break;
      case CommentGroup.MEMBER:
        await this.memberService.memberStatsModifier({
          _id: input.commentRefId,
          targetKey: 'memberComments',
          modifier: 1,
        });
        break;
    }

    console.log('cooment result:', result);
    if (!result) throw new InternalServerErrorException(Message.CREATE_FAILED);

    //! Qaysi member comment hosil qilgan bolsa, osha memberning ozini yozgan commentlar bolimini 1taga oshirish kere
    // await this.memberService.memberStatsEditor({ _id: input.memberId, targetKey: 'memberCommentToOthers', modifier: 1 });

    return result;
  }

  public async updateComment(memberId: ObjectId, input: CommentUpdate): Promise<Comment> {
    const { _id, commentStatus } = input;

    const result = await this.commentModel
      .findOneAndUpdate(
        {
          _id: _id,
          memberId: memberId,
          commentStatus: CommentStatus.ACTIVE,
        },
        input,
        { new: true },
      )
      .exec();

    if (!result) throw new InternalServerErrorException(Message.UPDATE_FAILED);

    //! Ushbu mantiq qoshilishi kere
    // if (commentStatus === CommentStatus.DELETE) {
    // 	switch (input.commentGroup) {
    // 		case CommentGroup.PROPERTY:
    // 			await this.propertyService.propertyStatsEditor({
    // 				_id: _id,
    // 				targetKey: 'propertyComments',
    // 				modifier: -1,
    // 			});
    // 			break;
    // 		case CommentGroup.ARTICLE:
    // 			await this.boardArticleService.boardArticleStatsEditor({
    // 				_id: _id,
    // 				targetKey: 'articleComments',
    // 				modifier: -1,
    // 			});
    // 			break;
    // 		case CommentGroup.MEMBER:
    // 			await this.memberService.memberStatsEditor({
    // 				_id: _id,
    // 				targetKey: 'memberComments',
    // 				modifier: -1,
    // 			});
    // 			break;
    // 	}
    // }

    return result;
  }

  public async getComments(memberId: ObjectId, input: CommentsInquiry): Promise<Comments> {
    const { commentRefId } = input.search;

    const match: P = { commentRefId: commentRefId, commentStatus: CommentStatus.ACTIVE };

    const sort: P = { [input.sort ?? 'createdAt']: input.direction ?? Direction.DESC };

    const result: Comments[] = await this.commentModel
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
    console.log('getComments result', result[0]);
    return result[0];
  }

  public async removeCommentByAdmin(input: ObjectId): Promise<Comment> {
    const result = await this.commentModel.findByIdAndDelete(input);
    if (!result) throw new InternalServerErrorException(Message.REMOVE_FAILED);
    return result;
  }
}
