import { Module } from '@nestjs/common';
import { MemberService } from './member.service';
import { MemberResolver } from './member.resolver';
import { MongooseModule } from '@nestjs/mongoose';
import MemberSchema from 'src/schemas/member.schema';
import { AuthModule } from '../auth/auth.module';
import { ViewModule } from '../view/view.module';
import { LikeModule } from '../like/like.module';
import FollowSchema from 'src/schemas/follow.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'Member', schema: MemberSchema },
      { name: 'Follow', schema: FollowSchema },
    ]),
    AuthModule,
    ViewModule,
    LikeModule,
  ],
  providers: [MemberResolver, MemberService],
  exports: [MemberService],
})
export class MemberModule {}
