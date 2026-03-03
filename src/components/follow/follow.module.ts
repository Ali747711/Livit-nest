import { MemberModule } from './../member/member.module';
import { AuthModule } from './../auth/auth.module';
import { Module } from '@nestjs/common';
import { FollowService } from './follow.service';
import { FollowResolver } from './follow.resolver';
import { MongooseModule } from '@nestjs/mongoose';
import FollowSchema from 'src/schemas/follow.schema';

@Module({
  imports: [MongooseModule.forFeature([{ name: 'Follow', schema: FollowSchema }]), AuthModule, MemberModule],
  providers: [FollowResolver, FollowService],
  exports: [FollowService],
})
export class FollowModule {}
