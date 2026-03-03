import { Field, Int, ObjectType } from '@nestjs/graphql';
import type { ObjectId } from 'mongoose';
import { UserRole } from 'src/libs/enums/user.enum';

@ObjectType()
export class User {
  @Field(() => String)
  _id: ObjectId;

  @Field(() => String)
  name: string;

  @Field(() => String)
  email: string;

  @Field(() => String)
  userPassword: string;

  @Field(() => Int, { nullable: true })
  phone?: number;

  @Field(() => UserRole)
  role: UserRole;

  @Field(() => String, { nullable: true })
  accessToken?: string;

  @Field(() => Date)
  createdAt: Date;

  @Field(() => Date)
  updatedAt: Date;
}
