import { Args, Mutation, Query, Resolver, InputType } from '@nestjs/graphql';
import { PropertyService } from './property.service';
import { Roles } from '../auth/decorators/role.decorator';
import { MemberType } from 'src/libs/enums/member.enum';
import { UseGuards } from '@nestjs/common';
import { RoleGuard } from '../auth/guards/role.guard';
import { Properties, Property } from 'src/libs/dto/property/property';
import {
  AgentPropertiesInquiry,
  AllPropertiesInquiry,
  OrdinaryInquiry,
  PropertyiesInquiry,
  PropertyInput,
} from 'src/libs/dto/property/property.input';
import { AuthMember } from '../auth/decorators/authUser.decorator';
import { ObjectId } from 'mongoose';
import { WithoutGuard } from '../auth/guards/without.guard';
import { shapeIntoMongoObjectId } from 'src/libs/config';
import { PropertyUpdate } from 'src/libs/dto/property/property.update';
import { AuthGuard } from '../auth/guards/auth.guard';

@Resolver()
export class PropertyResolver {
  constructor(private readonly propertyService: PropertyService) {}

  @Roles(MemberType.AGENT, MemberType.ADMIN)
  @UseGuards(RoleGuard)
  @Mutation(() => Property)
  public async createProperty(@Args('input') input: PropertyInput, @AuthMember('_id') memberId: ObjectId) {
    console.log('Mutation: createProperty');
    input.memberId = memberId;
    return await this.propertyService.createProperty(input);
  }

  @UseGuards(WithoutGuard)
  @Query((returns) => Property)
  public async getProperty(@Args('id') id: string, @AuthMember('_id') memberId: ObjectId): Promise<Property> {
    console.log('Query: getProperty');
    const propertyId = shapeIntoMongoObjectId(id);
    const result = await this.propertyService.getProperty(memberId, propertyId);
    return result;
  }

  // POST: UPDATE PROPERTY
  @Roles(MemberType.AGENT)
  @UseGuards(RoleGuard)
  @Mutation((returns) => Property)
  public async updateProperty(
    @Args('input') input: PropertyUpdate,
    @AuthMember('_id') memberId: ObjectId,
  ): Promise<Property> {
    console.log('Mutation: updateProperty');
    input._id = shapeIntoMongoObjectId(input._id);
    return await this.propertyService.updateProperty(memberId, input);
  }

  // GET: GET PROPERTIES
  @UseGuards(WithoutGuard)
  @Query(() => Properties)
  public async getProperties(
    @Args('input') input: PropertyiesInquiry,
    @AuthMember('_id') memberId: ObjectId,
  ): Promise<Properties> {
    console.log('Query: getProperties');
    return await this.propertyService.getProperties(memberId, input);
  }

  // GET: GET FAVORITES
  @UseGuards(AuthGuard)
  @Query(() => Properties)
  public async getFavorites(
    @Args('input') input: OrdinaryInquiry,
    @AuthMember('_id') memberId: ObjectId,
  ): Promise<Properties> {
    console.log('Query: getFavorites');
    return await this.propertyService.getFavorites(memberId, input);
  }

  // GET: GET VISITED
  @UseGuards(AuthGuard)
  @Query(() => Properties)
  public async getVisited(
    @Args('input') input: OrdinaryInquiry,
    @AuthMember('_id') memberId: ObjectId,
  ): Promise<Properties> {
    console.log('Query: getVisited');
    return await this.propertyService.getVisited(memberId, input);
  }

  // POST: LIKE TARGET PROPERTY
  @UseGuards(AuthGuard)
  @Mutation(() => Property)
  public async likeTargetProperty(
    @Args('propertyId') propertyId: string,
    @AuthMember('_id') memberId: ObjectId,
  ): Promise<Property> {
    console.log('Mutation: likeTargetProperty');
    const likeRefId = shapeIntoMongoObjectId(propertyId);
    return await this.propertyService.likeTargetProperty(memberId, likeRefId);
  }

  // GET: GET AGENT PROPERTIES
  @Roles(MemberType.AGENT)
  @UseGuards(RoleGuard)
  @Query(() => Properties)
  public async getAgentProperties(
    @Args('input') input: AgentPropertiesInquiry,
    @AuthMember('_id') memberId: ObjectId,
  ): Promise<Properties> {
    console.log('Query: getAgentProperties');
    return await this.propertyService.getAgentProperties(memberId, input);
  }

  //* ADMIN APIs

  // GET: GET ALL PROPERTIES BY AMDIN
  @Roles(MemberType.ADMIN)
  @UseGuards(RoleGuard)
  @Query(() => Properties)
  public async getAllPropertiesByAdmin(@Args('input') input: AllPropertiesInquiry): Promise<Properties> {
    console.log('Query: getAllPropertiesByAdmin');
    return await this.propertyService.getAllPropertiesByAdmin(input);
  }

  // POST: UPDATE PROPERTY BY ADMIN
  @Roles(MemberType.ADMIN)
  @UseGuards(RoleGuard)
  @Mutation(() => Property)
  public async updatePropertyByAdmin(@Args('input') input: PropertyUpdate): Promise<Property> {
    console.log('Mutation: updatePropertyByAdmin');
    input._id = shapeIntoMongoObjectId(input._id);
    return await this.propertyService.updatePropertyByAdmin(input);
  }

  // POST: REMOVE PROPERTY BY ADMIN
  @Roles(MemberType.ADMIN)
  @UseGuards(RoleGuard)
  @Mutation(() => Property)
  public async removePropertyByAdmin(@Args('propertyId') input: string): Promise<Property> {
    console.log('Mutation: removePropertyByAdmin');
    const propertyId = shapeIntoMongoObjectId(input);
    return await this.propertyService.removePropertyByAdmin(propertyId);
  }
}
