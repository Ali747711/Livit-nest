import { Module } from '@nestjs/common';
import { PropertyService } from './property.service';
import { PropertyResolver } from './property.resolver';
import { MongooseModule } from '@nestjs/mongoose';
import PropertySchema from 'src/schemas/property.schema';
import { MemberModule } from '../member/member.module';
import { AuthModule } from '../auth/auth.module';
import { ViewModule } from '../view/view.module';
import { LikeModule } from '../like/like.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: 'Property', schema: PropertySchema }]),
    MemberModule,
    AuthModule,
    ViewModule,
    LikeModule,
  ],
  providers: [PropertyResolver, PropertyService],
  exports: [PropertyService],
})
export class PropertyModule {}
