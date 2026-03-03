import { Field, ObjectType } from '@nestjs/graphql';
import type { ObjectId } from 'mongoose';
import { LikeGroup } from 'src/libs/enums/like.enum';

@ObjectType()
export class MeLiked {
  @Field(() => String)
  memberId: ObjectId;

  @Field(() => String)
  likeRefId: ObjectId;

  @Field(() => Boolean)
  myFavorite: boolean;
}

@ObjectType()
export class Like {
  @Field(() => String)
  _id: ObjectId;

  @Field(() => LikeGroup)
  likeGroup: LikeGroup;

  @Field(() => String)
  likeRefId: ObjectId;

  @Field(() => String)
  memberId: ObjectId;

  @Field(() => Date)
  createdAt: Date;

  @Field(() => Date)
  updatedAt: Date;
}
