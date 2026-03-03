import { BadRequestException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { BoardArticle, BoardArticles } from '../../libs/dto/board-article/board-article';
import { Model, ObjectId } from 'mongoose';
import {
  AllBoardArticlesInquiry,
  BoardArticleInput,
  BoardArticlesInquiry,
} from '../../libs/dto/board-article/board-article.input';
import { MemberService } from '../member/member.service';
import { StatisticModifier, P } from '../../libs/types/common';
import { BoardArticleStatus } from '../../libs/enums/board-article.enum';
import { ViewGroup } from '../../libs/enums/view.enum';
import { ViewService } from '../view/view.service';
import { BoardArticleUpdate } from '../../libs/dto/board-article/board-article.update';
import { lookupAuthMemberLiked, shapeIntoMongoObjectId } from '../../libs/config';
import { LikeService } from '../like/like.service';
import { LikeInput } from '../../libs/dto/like/like.input';
import { LikeGroup } from '../../libs/enums/like.enum';
import { Direction, Message } from 'src/libs/enums/comma.enum';

@Injectable()
export class BoardArticleService {
  constructor(
    @InjectModel('BoardArticle') private readonly boardArticeModel: Model<BoardArticle>,
    private memberService: MemberService,
    private viewService: ViewService,
    private likeService: LikeService,
  ) {}

  public async createBoardArticle(memberId: ObjectId, input: BoardArticleInput): Promise<BoardArticle> {
    input.memberId = memberId;
    try {
      const result = await this.boardArticeModel.create(input);

      await this.memberService.memberStatsModifier({ _id: memberId, targetKey: 'memberArticles', modifier: 1 });

      return result;
    } catch (err: any) {
      console.log('Error: createBoardArticle service', err.message);
      throw new BadRequestException(Message.CREATE_FAILED);
    }
  }

  public async getBoardArticle(memberId: ObjectId, articleId: ObjectId): Promise<BoardArticle> {
    console.log('Service getBoardArticle');
    const search: P = {
      _id: articleId,
      articleStatus: BoardArticleStatus.ACTIVE,
    };

    console.log(search);
    // const article: BoardArticle = await this.boardArticeModel.findOne({ _id: articleId });
    // console.log('Article: ', article);
    const targetBoardArticle: BoardArticle = await this.boardArticeModel.findOne({ _id: articleId }).lean().exec();
    // console.log(targetBoardArticle);
    if (!targetBoardArticle) throw new InternalServerErrorException(Message.BAD_REQUEST);

    if (memberId) {
      const viewInput = { memberId: memberId, viewRefId: articleId, viewGroup: ViewGroup.ARTICLE };
      const newView = await this.viewService.recordView(viewInput);

      if (newView) {
        await this.boardArticleStatsEditor({ _id: articleId, targetKey: 'articleViews', modifier: 1 });
        targetBoardArticle.articleViews++;
      }
      //meLiked

      const likeInput = { memberId: memberId, likeRefId: articleId, likeGroup: LikeGroup.MEMBER };

      targetBoardArticle.meLiked = await this.likeService.checkLikeExist(likeInput);
    }
    targetBoardArticle.memberData = await this.memberService.getMember(targetBoardArticle.memberId, null);

    return targetBoardArticle;
  }

  public async updateBoardArticle(memberId: ObjectId, input: BoardArticleUpdate): Promise<BoardArticle> {
    console.log('Service: updateBoardArticle');
    const { _id, articleStatus } = input;

    const result = await this.boardArticeModel
      .findOneAndUpdate(
        {
          _id: _id,
          memberId: memberId,
          articleStatus: BoardArticleStatus.ACTIVE,
        },
        input,
        { new: true },
      )
      .exec();

    if (!result) throw new InternalServerErrorException(Message.UPDATE_FAILED);

    if (articleStatus === BoardArticleStatus.DELETE) {
      await this.memberService.memberStatsModifier({ _id: memberId, targetKey: 'memberArticles', modifier: -1 });
    }

    return result;
  }

  public async getBoardArticles(memberId: ObjectId, input: BoardArticlesInquiry): Promise<BoardArticles> {
    const { articleCategory, text } = input.search;

    const match: P = { articleStatus: BoardArticleStatus.ACTIVE };
    const sort: P = { [input.sort ?? 'createdAt']: input.direction ?? Direction.DESC };

    if (articleCategory) match.articleCategory = articleCategory;
    if (text) match.text = { $regex: new RegExp(text, 'i') };
    if (input.search?.memberId) {
      match.memberId = shapeIntoMongoObjectId(input.search?.memberId);
    }
    console.log('match', match);

    const result = await this.boardArticeModel
      .aggregate([
        { $match: match },
        { $sort: sort },
        {
          $facet: {
            list: [
              { $skip: (input.page - 1) * input.limit },
              { $limit: input.limit },
              lookupAuthMemberLiked(memberId),
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

  public async likeTargetBoardArticle(memberId: ObjectId, likeRefId: ObjectId): Promise<BoardArticle> {
    console.log('Service: likeTargetBoardArticle');

    const target: BoardArticle = await this.boardArticeModel
      .findOne({ _id: likeRefId, articleStatus: BoardArticleStatus.ACTIVE })
      .exec();
    if (!target) throw new InternalServerErrorException(Message.NO_DATA_FOUND);

    const input: LikeInput = {
      memberId: memberId,
      likeRefId: likeRefId,
      likeGroup: LikeGroup.PROPERTY,
    };

    // Like Toggle
    const modifier: number = await this.likeService.toggleLike(input);

    const result = await this.boardArticleStatsEditor({
      _id: likeRefId,
      targetKey: 'articleLikes',
      modifier: modifier,
    });

    if (!result) throw new InternalServerErrorException(Message.SOMETHING_WENT_WRONG);
    return result;
  }
  public async getAllBoardArticlesByAdmin(input: AllBoardArticlesInquiry): Promise<BoardArticles> {
    const { articleCategory, articleStatus } = input.search;
    const match: P = {};
    const sort: P = { [input?.sort ?? 'createdAt']: input?.direction ?? Direction.DESC };

    if (articleCategory) match.articleCategory = articleCategory;
    if (articleStatus) match.articleStatus = articleStatus;

    const result = await this.boardArticeModel
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

  public async updateBoardArticleByAdmin(input: BoardArticleUpdate): Promise<BoardArticle> {
    const { _id, articleStatus } = input;

    const result = await this.boardArticeModel.findOneAndUpdate({ _id: _id }, input, { new: true }).exec();

    if (!result) throw new InternalServerErrorException(Message.UPDATE_FAILED);

    if (articleStatus === BoardArticleStatus.DELETE) {
      await this.memberService.memberStatsModifier({ _id: result.memberId, targetKey: 'memberArticles', modifier: -1 });
    }

    return result;
  }

  public async removeBoardArticleByAdmin(articleId: ObjectId): Promise<BoardArticle> {
    const search: P = { _id: articleId };
    const result = await this.boardArticeModel.findOneAndDelete(search).exec();
    console.log(result);
    if (!result) throw new InternalServerErrorException(Message.REMOVE_FAILED);

    return result;
  }

  public async boardArticleStatsEditor(input: StatisticModifier): Promise<BoardArticle> {
    console.log('Service: boardArticleStatsEditor');
    const { _id, targetKey, modifier } = input;

    return await this.boardArticeModel
      .findByIdAndUpdate(_id, { $inc: { [targetKey]: modifier } }, { new: true })
      .exec();
  }
}
