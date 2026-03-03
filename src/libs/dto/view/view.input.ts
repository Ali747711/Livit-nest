import { Field, InputType } from '@nestjs/graphql';
import { IsNotEmpty } from 'class-validator';
import type { ObjectId } from 'mongoose';
import { ViewGroup } from 'src/libs/enums/view.enum';

@InputType()
export class ViewInput {
  @IsNotEmpty()
  @Field(() => String)
  memberId: ObjectId;

  @IsNotEmpty()
  @Field(() => String)
  viewRefId: ObjectId;

  @IsNotEmpty()
  @Field(() => String)
  viewGroup: ViewGroup;
}
