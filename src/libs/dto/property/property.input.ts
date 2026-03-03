import { Field, InputType, Int } from '@nestjs/graphql';
import { IsIn, IsInt, IsNotEmpty, IsOptional, IsPort, Length, Min } from 'class-validator';
import { ObjectId } from 'mongoose';
import { PropertyLocation, PropertyStatus, PropertyType } from 'src/libs/enums/property.enum';
import { Member } from '../member/member';
import { MeLiked } from '../like/like';
import { availableProperties } from 'src/libs/config';
import { Direction } from 'src/libs/enums/comma.enum';

@InputType()
export class PropertyInput {
  @IsNotEmpty()
  @Field(() => PropertyType)
  propertyType: PropertyType;

  @IsNotEmpty()
  @Field(() => PropertyLocation)
  propertyLocation: PropertyLocation;

  @IsNotEmpty()
  @Field(() => String)
  propertyAddress: string;

  @IsNotEmpty()
  @Field(() => String)
  propertyTitle: string;

  @IsNotEmpty()
  @Field(() => Int)
  propertyPrice: number;

  @IsNotEmpty()
  @Field(() => Int)
  propertySquare: number;

  @IsNotEmpty()
  @IsInt()
  @Min(1)
  @Field(() => Int)
  propertyBeds: number;

  @IsNotEmpty()
  @IsInt()
  @Min(1)
  @Field(() => Int)
  propertyRooms: number;

  @IsNotEmpty()
  @Field(() => [String])
  propertyImages: string[];

  @IsOptional()
  @Length(5, 500)
  @Field(() => String, { nullable: true })
  propertyDesc?: string;

  @IsOptional()
  @Field(() => Boolean, { nullable: true })
  propertyBarter?: boolean;

  @IsOptional()
  @Field(() => Boolean, { nullable: true })
  propertyRent?: boolean;

  // @Field(() => String)
  memberId?: ObjectId;

  @IsOptional()
  @Field(() => Date, { nullable: true })
  constructedAt?: Date;
}

@InputType()
export class PricesRange {
  @Field(() => Int)
  start: number;

  @Field(() => Int)
  end: number;
}

@InputType()
export class SquaresRange {
  @Field(() => Int)
  start: number;

  @Field(() => Int)
  end: number;
}

@InputType()
export class PeriodsRange {
  @Field(() => Date)
  start: Date;

  @Field(() => Date)
  end: Date;
}

@InputType()
export class PISearch {
  @IsOptional()
  @Field(() => String, { nullable: true })
  memberId?: ObjectId;

  @IsOptional()
  @Field(() => [PropertyLocation], { nullable: true })
  locationList?: PropertyLocation[];

  @IsOptional()
  @Field(() => [PropertyType], { nullable: true })
  typeList?: PropertyType[];

  @IsOptional()
  @Field(() => [Int], { nullable: true })
  roomsList?: number[];

  @IsOptional()
  @Field(() => [Int], { nullable: true })
  bedsList?: number[];

  @IsOptional()
  @Field(() => [String], { nullable: true })
  options?: string[];

  @IsOptional()
  @Field(() => PricesRange, { nullable: true })
  pricesRange?: PricesRange;

  @IsOptional()
  @Field(() => PeriodsRange, { nullable: true })
  periodsRange?: PeriodsRange;

  @IsOptional()
  @Field(() => SquaresRange, { nullable: true })
  squaresRange?: SquaresRange;

  @IsOptional()
  @Field(() => String, { nullable: true })
  text?: string;
}

@InputType()
export class PropertyiesInquiry {
  @IsNotEmpty()
  @Min(1)
  @Field(() => Int)
  page: number;

  @IsNotEmpty()
  @Min(1)
  @Field(() => Int)
  limit: number;

  @IsOptional()
  @IsIn(availableProperties)
  @Field(() => String, { nullable: true })
  sort: string;

  @IsOptional()
  @Field(() => Direction, { nullable: true })
  direction?: Direction;

  @IsNotEmpty()
  @Field(() => PISearch)
  search: PISearch;
}

@InputType()
export class APISearch {
  @IsOptional()
  @Field(() => PropertyStatus, { nullable: true })
  propertyStatus?: PropertyStatus;
}

@InputType()
export class AgentPropertiesInquiry {
  @IsNotEmpty()
  @Min(1)
  @Field(() => Int)
  page: number;

  @IsNotEmpty()
  @Min(1)
  @Field(() => Int)
  limit: number;

  @IsOptional()
  @IsIn(availableProperties)
  @Field(() => String, { nullable: true })
  sort: string;

  @IsOptional()
  @Field(() => Direction, { nullable: true })
  direction?: Direction;

  @IsNotEmpty()
  @Field(() => APISearch)
  search: APISearch;
}

@InputType()
class ALPISearch {
  @IsOptional()
  @Field(() => PropertyStatus, { nullable: true })
  propertyStatus?: PropertyStatus;

  @IsOptional()
  @Field(() => [PropertyLocation], { nullable: true })
  propertyLocationList?: PropertyLocation[];
}

@InputType()
export class AllPropertiesInquiry {
  @IsNotEmpty()
  @Min(1)
  @Field(() => Int)
  page: number;

  @IsNotEmpty()
  @Min(1)
  @Field(() => Int)
  limit: number;

  @IsOptional()
  @IsIn(availableProperties)
  @Field(() => String, { nullable: true })
  sort: string;

  @IsOptional()
  @Field(() => Direction, { nullable: true })
  direction?: Direction;

  @IsNotEmpty()
  @Field(() => ALPISearch)
  search: ALPISearch;
}

@InputType()
export class OrdinaryInquiry {
  @IsNotEmpty()
  @Min(1)
  @Field(() => Int)
  page: number;

  @IsNotEmpty()
  @Min(1)
  @Field(() => Int)
  limit: number;
}
