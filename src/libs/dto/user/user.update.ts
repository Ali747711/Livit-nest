import { Field, InputType, Int } from '@nestjs/graphql';
import { IsNotEmpty, IsOptional, Length } from 'class-validator';
import type { ObjectId } from 'mongoose';
import { UserRole } from 'src/libs/enums/user.enum';

@InputType()
export class UserUpdate {
  @IsNotEmpty()
  @Field(() => String)
  _id: ObjectId;

  @IsOptional()
  @Length(3, 50)
  @Field(() => String)
  name: string;

  @IsOptional()
  @Field(() => String)
  email: string;
  @IsNotEmpty()
  @Length(5, 15)
  @Field(() => String)
  userPassword: string;

  @IsOptional()
  @Field(() => Int, { nullable: true })
  phone?: number;

  @IsNotEmpty()
  @Field(() => UserRole)
  role: UserRole;
}
