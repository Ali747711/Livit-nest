import { Field, InputType, Int } from '@nestjs/graphql';
import { IsNotEmpty, IsOptional, Length } from 'class-validator';
import { UserRole } from 'src/libs/enums/user.enum';

@InputType()
export class UserInput {
  @IsNotEmpty()
  @Length(3, 50)
  @Field(() => String)
  name: string;

  @IsNotEmpty()
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

// Login INPUT
@InputType()
export class LoginInput {
  @IsNotEmpty()
  @Field(() => String)
  email: string;

  @IsNotEmpty()
  @Length(3, 15)
  @Field(() => String)
  userPassword: string;
}
