import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { GamesModule } from './components/games/games.module';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from './database/database.module';
import { UsersModule } from './components/users/users.module';
import { AuthModule } from './components/auth/auth.module';
import { MemberModule } from './components/member/member.module';
import { ViewModule } from './components/view/view.module';
import { LikeModule } from './components/like/like.module';
import { P } from './libs/types/common';
import { PropertyModule } from './components/property/property.module';
import { FollowModule } from './components/follow/follow.module';
import { CommentModule } from './components/comment/comment.module';
import { SocketModule } from './socket/socket.module';
import { MessageModule } from './components/message/message.module';
import { NotificationModule } from './components/notification/notification.module';

@Module({
  imports: [
    ConfigModule.forRoot(),
    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      playground: true,
      autoSchemaFile: true,
      csrfPrevention: false,
      // formatError: (error: P) => {
      //   const graphQLFormattedError = {
      //     code: error?.extensions.code,
      //     message:
      //       error?.extensions?.exception?.response?.message || error?.extensions?.response?.message || error?.message,
      //   };
      //   console.log(' GRAPHQL GLOBAL ERROR: ', graphQLFormattedError);
      //   return graphQLFormattedError;
      // },
    }),
    DatabaseModule,
    UsersModule,
    GamesModule,
    AuthModule,
    MemberModule,
    ViewModule,
    LikeModule,
    PropertyModule,
    FollowModule,
    CommentModule,
    MessageModule,
    NotificationModule,
    SocketModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
