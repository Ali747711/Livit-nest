import { Args, Mutation, Resolver, Query } from '@nestjs/graphql';
import { BoardArticleService } from './board-article.service';
import { UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/guards/auth.guard';
import { BoardArticle, BoardArticles } from 'src/libs/dto/board-article/board-article';
import { AuthMember } from '../auth/decorators/authUser.decorator';
import { ObjectId } from 'mongoose';
import {
  AllBoardArticlesInquiry,
  BoardArticleInput,
  BoardArticlesInquiry,
} from 'src/libs/dto/board-article/board-article.input';
import { shapeIntoMongoObjectId } from 'src/libs/config';
import { WithoutGuard } from '../auth/guards/without.guard';
import { BoardArticleUpdate } from 'src/libs/dto/board-article/board-article.update';
import { MemberType } from 'src/libs/enums/member.enum';
import { Roles } from '../auth/decorators/role.decorator';
import { RoleGuard } from '../auth/guards/role.guard';

@Resolver()
export class BoardArticleResolver {
  constructor(private readonly boardArticleService: BoardArticleService) {}

  @UseGuards(AuthGuard)
  @Mutation((returns) => BoardArticle)
  public async createBoardArticle(
    @Args('input') input: BoardArticleInput,
    @AuthMember('_id') memberId: ObjectId,
  ): Promise<BoardArticle> {
    console.log('Mutation: createBoardArticle');

    return await this.boardArticleService.createBoardArticle(memberId, input);
  }

  @UseGuards(WithoutGuard)
  @Query((returns) => BoardArticle)
  public async getBoardArticle(
    @Args('articleId') input: string,
    @AuthMember('_id') memberId: ObjectId,
  ): Promise<BoardArticle> {
    console.log('Query: getBoardArticle');
    const articleId = shapeIntoMongoObjectId(input);
    return await this.boardArticleService.getBoardArticle(memberId, articleId);
  }

  // POST: UPDARE ARTICLE
  @UseGuards(AuthGuard)
  @Mutation(() => BoardArticle)
  public async updateBoardArticle(
    @Args('input') input: BoardArticleUpdate,
    @AuthMember('_id') memberId: ObjectId,
  ): Promise<BoardArticle> {
    console.log('Mutation: updateBoardArticle');
    input._id = shapeIntoMongoObjectId(input._id);
    return await this.boardArticleService.updateBoardArticle(memberId, input);
  }

  // GET: GET ARTICLES
  @UseGuards(WithoutGuard)
  @Query((returns) => BoardArticles)
  public async getBoardArticles(
    @Args('input') input: BoardArticlesInquiry,
    @AuthMember('_id') memberId: ObjectId,
  ): Promise<BoardArticles> {
    console.log('Query: getBoardArticles');
    return await this.boardArticleService.getBoardArticles(memberId, input);
  }

  @UseGuards(AuthGuard)
  @Mutation(() => BoardArticle)
  public async likeTargetBoardArticle(
    @Args('articleId') input: string,
    @AuthMember('_id') memberId: ObjectId,
  ): Promise<BoardArticle> {
    console.log('Mutation: likeTargetArticle');
    const likeRefId = shapeIntoMongoObjectId(input);
    return await this.boardArticleService.likeTargetBoardArticle(memberId, likeRefId);
  }

  //& ADMIN
  @Roles(MemberType.ADMIN)
  @UseGuards(RoleGuard)
  @Query((returns) => BoardArticles)
  public async getAllBoardArticlesByAdmin(
    @Args('input') input: AllBoardArticlesInquiry,
    @AuthMember('_id') memberId: ObjectId,
  ): Promise<BoardArticles> {
    console.log('Query: getAllBoardArticlesByAdmin');
    return await this.boardArticleService.getAllBoardArticlesByAdmin(input);
  }

  @Roles(MemberType.ADMIN)
  @UseGuards(RoleGuard)
  @Mutation(() => BoardArticle)
  public async updateBoardArticleByAdmin(
    @Args('input') input: BoardArticleUpdate,
    // @AuthMember('_id') memberId: ObjectId,
  ): Promise<BoardArticle> {
    console.log('Mutation: updateBoardArticleByAdmin');
    input._id = shapeIntoMongoObjectId(input._id);
    return await this.boardArticleService.updateBoardArticleByAdmin(input);
  }

  @Roles(MemberType.ADMIN)
  @UseGuards(RoleGuard)
  @Mutation(() => BoardArticle)
  public async removeBoardArticleByAdmin(
    @Args('articleId') input: string,
    // @AuthMember('_id') memberId: ObjectId,
  ): Promise<BoardArticle> {
    console.log('Mutation: removeBoardArticleByAdmin');
    const articleId = shapeIntoMongoObjectId(input);
    return await this.boardArticleService.removeBoardArticleByAdmin(articleId);
  }
}
