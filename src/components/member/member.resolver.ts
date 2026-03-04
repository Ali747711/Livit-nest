import { Args, Mutation, Resolver, Query } from '@nestjs/graphql';
import { MemberService } from './member.service';
import { Member, Members } from 'src/libs/dto/member/member';
import { AgentsInquiry, LoginInput, MemberInput, MembersInquiry } from 'src/libs/dto/member/member.input';
import { BadRequestException, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/guards/auth.guard';
import { RoleGuard } from '../auth/guards/role.guard';
import { Roles } from '../auth/decorators/role.decorator';
import { AuthMember } from '../auth/decorators/authUser.decorator';
import { MemberStatus, MemberType } from 'src/libs/enums/member.enum';
import type { ObjectId } from 'mongoose';
import { MemberUpdate } from 'src/libs/dto/member/member.update';
import { WithoutGuard } from '../auth/guards/without.guard';
import { shapeIntoMongoObjectId, validMimeTypes } from 'src/libs/config';
import { GraphQLUpload, FileUpload } from 'graphql-upload-ts';
import { Message } from 'src/libs/enums/comma.enum';
import { uploadToCloudinary } from 'src/libs/cloudinary';

@Resolver()
export class MemberResolver {
  constructor(private readonly memberService: MemberService) {}

  @Mutation(() => Member)
  public async signup(@Args('input') input: MemberInput): Promise<Member> {
    console.log('Mutation: signup');
    return await this.memberService.signup(input);
  }

  @Mutation(() => Member)
  public async login(@Args('input') input: LoginInput): Promise<Member> {
    console.log('Mutation: login');
    return await this.memberService.login(input);
  }

  // ======= Auth Check===========
  @UseGuards(AuthGuard)
  @Query(() => String)
  public async checkAuth(@AuthMember('memberNick') memberNick: string): Promise<string> {
    console.log('Query: checkAuth');
    console.log('memberNick:', memberNick);
    return `Hi ${memberNick}`;
  }

  @Roles(MemberType.AGENT, MemberType.AGENT)
  @UseGuards(RoleGuard)
  @Query(() => String)
  public async checkRoleAuth(@AuthMember() authMember: Member): Promise<string> {
    console.log('Query: checkRoleAuth');
    return `Hi ${authMember.memberNick}, you came with ${authMember._id} as ${authMember.memberType}`;
  }

  // UPDATE: member =============
  @UseGuards(AuthGuard)
  @Mutation(() => Member)
  public async updateMember(
    @Args('input') input: MemberUpdate,
    @AuthMember('_id') memberId: ObjectId,
  ): Promise<Member> {
    console.log('Mutation: updateMember');

    // delete input._id;
    return await this.memberService.updateMember(memberId, input);
  }

  // GET: MEMBER =============
  @UseGuards(WithoutGuard)
  @Query(() => Member)
  public async getMember(@Args('memberId') input: string, @AuthMember('_id') memberId: ObjectId): Promise<Member> {
    console.log('Query: getMember');
    const targetId = shapeIntoMongoObjectId(input);
    // console.log(`Target member: ${input}\n Log member: ${memberId}`);
    return await this.memberService.getMember(targetId, memberId);
  }

  // GET: MEMBERS ============
  @UseGuards(WithoutGuard)
  @Query(() => [Member])
  public async getMembers(@Args('type', { nullable: true }) type?: string): Promise<Member[]> {
    console.log('Query: getMembers');
    return await this.memberService.getMembers(type);
  }

  // GET: AGENTS =======
  @UseGuards(WithoutGuard)
  @Query(() => Members)
  public async getAgents(@Args('input') input: AgentsInquiry, @AuthMember('_id') memberId: ObjectId): Promise<Members> {
    console.log('Query: getAgents');
    console.log('Query: getAgents incoming data: ', input);
    return await this.memberService.getAgents(input, memberId);
  }

  // POST: LIKE TARGET MEMBER
  @UseGuards(AuthGuard)
  @Mutation(() => Member)
  public async likeTargetMember(
    @Args('memberId') input: string,
    @AuthMember('_id') memberId: ObjectId,
  ): Promise<Member> {
    console.log('Mutation: likeTargetMember');
    const likeRefId = shapeIntoMongoObjectId(input);
    return await this.memberService.likeTargetMember(memberId, likeRefId);
  }

  //! ADMIN AUTHORIZATION !!
  // GET: ALL MEMBERS BY ADMIN
  @Roles(MemberType.ADMIN)
  @UseGuards(RoleGuard)
  @Query(() => Members)
  public async getAllMembersByAdmin(@Args('input') input: MembersInquiry): Promise<Members> {
    console.log('Query: getAllMembersByAdmin');
    return await this.memberService.getAllMembersByAdmin(input);
  }

  // POST: UPDATE MEMBER BY ADMIN
  @Roles(MemberType.ADMIN)
  @UseGuards(RoleGuard)
  @Mutation(() => Member)
  public async updateMemberByAdmin(@Args('input') input: MemberUpdate): Promise<Member> {
    console.log('Mutation: updateMemberByAdmin');
    return await this.memberService.updateMemberByAdmin(input);
  }

  //* =================== IMAGE UPLOADER =====================

  @UseGuards(AuthGuard)
  @Mutation((returns) => String)
  public async imageUploader(
    @Args({ name: 'file', type: () => GraphQLUpload }) { createReadStream, filename, mimetype }: FileUpload,
    @Args('target') target: string,
  ): Promise<string> {
    console.log('Mutation: imageUploader');

    if (!filename) throw new BadRequestException(Message.UPLOAD_FAILED);
    const validMime = validMimeTypes.includes(mimetype);
    if (!validMime) throw new BadRequestException(Message.PROVIDE_ALLOWED_FORMAT);

    console.log('Valid: ', validMime);
    try {
      const url = await uploadToCloudinary(createReadStream(), `uploads/${target}`);
      return url;
    } catch (err) {
      console.error('imageUploader error:', err);
      throw new BadRequestException(Message.UPLOAD_FAILED);
    }
  }

  // UPLOAD IMAGES ===============
  @UseGuards(AuthGuard)
  @Mutation((returns) => [String])
  public async imagesUploader(
    @Args('files', { type: () => [GraphQLUpload] }) files: Promise<FileUpload>[],
    @Args('target') target: string,
  ): Promise<string[]> {
    console.log('Mutation: imagesUploader');

    const uploadedImages: string[] = [];
    const promiseList = files.map(async (file: Promise<FileUpload>, index: number): Promise<void> => {
      try {
        const { mimetype, createReadStream } = await file;
        const validMime = validMimeTypes.includes(mimetype);
        if (!validMime) throw new Error(Message.PROVIDE_ALLOWED_FORMAT);

        const url = await uploadToCloudinary(createReadStream(), `uploads/${target}`);
        uploadedImages[index] = url;
      } catch (error) {
        console.log('Error: file upload failed!', error);
      }
    });

    await Promise.all(promiseList);
    return uploadedImages;
  }
}
