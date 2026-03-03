import { Module } from '@nestjs/common';
import { SocketGateway } from './socket.gateway';
import { AuthModule } from 'src/components/auth/auth.module';
import { MessageModule } from 'src/components/message/message.module';
import { NotificationModule } from 'src/components/notification/notification.module';

@Module({
  imports: [AuthModule, MessageModule, NotificationModule],
  providers: [SocketGateway],
})
export class SocketModule {}
