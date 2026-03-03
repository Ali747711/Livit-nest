import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { AuthService } from 'src/components/auth/auth.service';
import { Member } from 'src/libs/dto/member/member';
import * as url from 'url';
import { WebSocket, Server } from 'ws';
import { MessageService } from 'src/components/message/message.service';
import { NotificationService } from 'src/components/notification/notification.service';
import { NotificationType } from 'src/libs/enums/notification.enum';
import { shapeIntoMongoObjectId } from 'src/libs/config';

interface MessagePayload {
  event: string;
  text: string;
  memberData: Member;
}

interface InfoPayload {
  event: string;
  totalClients: number;
  memberData: Member;
  action: string;
}

interface CreateMessagePayload {
  receiverId: string;
  text: string;
}

@WebSocketGateway({
  cors: {
    origin: '*', // Configure this properly in production
    credentials: true,
  },
})
export class SocketGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  private summaryClient: number = 0;
  private clientAuthMap = new Map<WebSocket, Member>();
  private memberSocketMap = new Map<string, WebSocket>();
  private messageList: MessagePayload[] = [];

  constructor(
    private authService: AuthService,
    private messageService: MessageService,
    private notificationService: NotificationService,
  ) {}

  @WebSocketServer()
  server: Server;

  public async afterInit(server: Server) {
    console.log('✅ WebSocket server initialized');
  }

  public async retrieveAuth(req: any): Promise<Member | null> {
    try {
      const parseUrl = url.parse(req.url, true);
      const { token } = parseUrl.query;

      if (!token) {
        console.log('⚠️ No token provided in WebSocket connection');
        return null;
      }

      console.log('🔐 Authenticating WebSocket connection...');
      return await this.authService.verifyToken(token as string);
    } catch (error: any) {
      console.log('❌ WS module [retrieveAuth] ERROR: ', error.message);
      return null;
    }
  }

  public async handleConnection(client: WebSocket, req: any) {
    try {
      const authMember = await this.retrieveAuth(req);
      this.summaryClient++;
      this.clientAuthMap.set(client, authMember);

      if (authMember) {
        this.memberSocketMap.set(authMember._id.toString(), client);
      }

      const clientNick: string = authMember?.memberNick ?? 'Guest';
      console.log(`✅ Connection [${clientNick}] & total: [${this.summaryClient}]`);

      const infoMsg: InfoPayload = {
        event: 'info',
        totalClients: this.summaryClient,
        memberData: authMember,
        action: 'joined',
      };

      this.emitMessage(infoMsg);

      // Send message history to the newly connected client
      this.safeSend(client, { event: 'getMessages', list: this.messageList });
    } catch (error: any) {
      console.log('❌ Error in handleConnection:', error.message);
      client.close(1011, 'Internal server error');
    }
  }

  public async handleDisconnect(client: WebSocket) {
    try {
      const authMember = this.clientAuthMap.get(client);
      this.summaryClient--;
      this.clientAuthMap.delete(client);

      if (authMember) {
        this.memberSocketMap.delete(authMember._id.toString());
      }

      const clientNick: string = authMember?.memberNick ?? 'Guest';
      console.log(`🔌 Disconnection [${clientNick}] & total: [${this.summaryClient}]`);

      const infoMsg: InfoPayload = {
        event: 'info',
        totalClients: this.summaryClient,
        memberData: authMember,
        action: 'left',
      };

      this.broadcastMessage(client, infoMsg);
    } catch (error: any) {
      console.log('❌ Error in handleDisconnect:', error.message);
    }
  }

  @SubscribeMessage('message')
  public async handleMessage(client: WebSocket, payload: string): Promise<void> {
    try {
      const authMember = this.clientAuthMap.get(client);

      // Validate message
      if (!payload || typeof payload !== 'string') {
        this.safeSend(client, { event: 'error', message: 'Invalid message format' });
        return;
      }

      // Limit message length
      if (payload.length > 1000) {
        this.safeSend(client, { event: 'error', message: 'Message too long (max 1000 chars)' });
        return;
      }

      const newMessage: MessagePayload = {
        event: 'message',
        text: payload,
        memberData: authMember,
      };

      const clientNick: string = authMember?.memberNick ?? 'Guest';
      console.log(`💬 NEW MESSAGE [${clientNick}]: ${payload}`);

      // Store message (keep last 5)
      this.messageList.push(newMessage);
      if (this.messageList.length > 5) {
        this.messageList.splice(0, this.messageList.length - 5);
      }

      this.emitMessage(newMessage);
    } catch (error: any) {
      console.log('❌ Error in handleMessage:', error.message);
      this.safeSend(client, { event: 'error', message: 'Failed to send message' });
    }
  }

  /** Private direct message (new) */
  @SubscribeMessage('createMessage')
  public async handleCreateMessage(client: WebSocket, payload: string): Promise<void> {
    try {
      const authMember = this.clientAuthMap.get(client);

      if (!authMember) {
        this.safeSend(client, { event: 'error', message: 'Authentication required to send private messages' });
        return;
      }

      let parsed: CreateMessagePayload;
      try {
        parsed = typeof payload === 'string' ? JSON.parse(payload) : payload;
      } catch {
        this.safeSend(client, { event: 'error', message: 'Invalid payload. Expected JSON: { receiverId, text }' });
        return;
      }

      const { receiverId, text } = parsed;

      if (!receiverId || !text || typeof text !== 'string') {
        this.safeSend(client, { event: 'error', message: 'receiverId and text are required' });
        return;
      }

      if (text.length > 1000) {
        this.safeSend(client, { event: 'error', message: 'Message too long (max 1000 chars)' });
        return;
      }

      console.log(`📩 PRIVATE [${authMember.memberNick}] → [${receiverId}]: ${text}`);

      const savedMessage = await this.messageService.createMessage(authMember._id, {
        receiverId: shapeIntoMongoObjectId(receiverId),
        messageText: text,
      });

      const notification = await this.notificationService.createNotification({
        authorId: authMember._id,
        receiverId: shapeIntoMongoObjectId(receiverId),
        notificationType: NotificationType.MESSAGE,
        notificationDesc: text.length > 100 ? text.substring(0, 97) + '...' : text,
        notificationRefId: savedMessage._id,
      });

      const messagePayload = {
        event: 'createMessage',
        data: {
          _id: savedMessage._id,
          senderId: savedMessage.senderId,
          receiverId: savedMessage.receiverId,
          messageText: savedMessage.messageText,
          messageStatus: savedMessage.messageStatus,
          createdAt: savedMessage.createdAt,
          senderData: {
            _id: authMember._id,
            memberNick: authMember.memberNick,
            memberImage: authMember.memberImage,
            memberType: authMember.memberType,
          },
        },
      };

      this.safeSend(client, messagePayload);

      const receiverSocket = this.memberSocketMap.get(receiverId);
      if (receiverSocket) {
        this.safeSend(receiverSocket, messagePayload);

        if (notification) {
          this.safeSend(receiverSocket, {
            event: 'notification',
            data: {
              _id: notification._id,
              authorId: notification.authorId,
              receiverId: notification.receiverId,
              notificationType: notification.notificationType,
              notificationStatus: notification.notificationStatus,
              notificationDesc: notification.notificationDesc,
              notificationRefId: notification.notificationRefId,
              createdAt: notification.createdAt,
              authorData: {
                _id: authMember._id,
                memberNick: authMember.memberNick,
                memberImage: authMember.memberImage,
              },
            },
          });
        }
      }
    } catch (error: any) {
      console.log('❌ Error in handleCreateMessage:', error.message);
      this.safeSend(client, { event: 'error', message: 'Failed to send private message' });
    }
  }

  /**
   * Broadcast message to all clients except sender
   */
  private broadcastMessage(sender: WebSocket, message: InfoPayload | MessagePayload) {
    this.server.clients.forEach((client) => {
      if (client !== sender && client.readyState === WebSocket.OPEN) {
        this.safeSend(client, message);
      }
    });
  }

  /**
   * Emit message to all connected clients
   */
  private emitMessage(message: MessagePayload | InfoPayload) {
    this.server.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        this.safeSend(client, message);
      }
    });
  }

  /**
   * Safe send with error handling
   */
  private safeSend(client: WebSocket, message: any) {
    try {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(message));
      }
    } catch (error: any) {
      console.log('❌ Error sending message to client:', error.message);
    }
  }
}

//////////////////////////////////////////////////////////////////////////////////////////////////////////

// import { OnGatewayInit, SubscribeMessage, WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
// import { AuthService } from 'src/components/auth/auth.service';
// import { Member } from 'src/libs/dto/member/member';
// import * as url from 'url';
// import * as WebSocket from 'ws';

// interface MessagePaylaod {
//   event: string;
//   text: string;
//   memberData: Member;
// }

// interface InfoPayload {
//   event: string;
//   totalClients: number;
//   memberData: Member;
//   action: string;
// }
// @WebSocketGateway({ transport: ['websocket'], secure: true })
// export class SocketGateway implements OnGatewayInit {
//   private summeryClient: number = 0;
//   private clientAuthMap = new Map<WebSocket, Member>();
//   private messageList: MessagePaylaod[] = [];

//   constructor(private authService: AuthService) {}

//   @WebSocketServer()
//   server: WebSocket.Server;

//   public async afterInit(server: WebSocket.Server) {
//     console.log('WS server: ', server.address);
//   }

//   public async retrieveAuth(req: any): Promise<Member> {
//     try {
//       // console.log(req);
//       const parseUrl = url.parse(req.url, true);
//       const { token } = parseUrl.query;
//       console.log('Token: ', token);
//       return await this.authService.verifyToken(token as string);
//     } catch (error) {
//       console.log('WS module [retrieveAuth] ERROR: ', error);
//       return null;
//     }
//   }

//   public async handleConnection(client: WebSocket, req: any) {
//     const authMember = await this.retrieveAuth(req);
//     this.summeryClient++;
//     this.clientAuthMap.set(client, authMember);
//     const clientNick: string = authMember.memberNick ?? 'Guest';
//     console.log(`Connection [${clientNick}] & total: [${this.summeryClient}]`);

//     const infoMsg: InfoPayload = {
//       event: 'info',
//       totalClients: this.summeryClient,
//       memberData: authMember,
//       action: 'joined',
//     };

//     this.emitMessage(infoMsg);
//     client.send(JSON.stringify({ event: 'getMessage', list: this.messageList }));
//   }

//   public async handleDisConnection(client: WebSocket) {
//     const authMember = this.clientAuthMap.get(client);
//     this.summeryClient--;
//     this.clientAuthMap.delete(client);

//     const clientNick: string = authMember?.memberNick ?? 'Guest';
//     console.log(`Disconnection [${clientNick}] & total: [${this.summeryClient}]`);

//     const infoMsg: InfoPayload = {
//       event: 'info',
//       totalClients: this.summeryClient,
//       memberData: authMember,
//       action: 'left',
//     };

//     this.broadcastMessage(client, infoMsg);
//   }

//   @SubscribeMessage('message')
//   public async handleMessage(client: WebSocket, payload: string): Promise<void> {
//     const authMember = this.clientAuthMap.get(client);
//     const newMessage: MessagePaylaod = {
//       event: 'message',
//       text: payload,
//       memberData: authMember,
//     };

//     const clientNick: string = authMember.memberNick ?? 'Guest';
//     console.log(`NEW MESSAGE [${clientNick}]: ${payload}`);

//     this.messageList.push(newMessage);
//     if (this.messageList.length > 5) this.messageList.splice(0, this.messageList.length - 5);

//     this.emitMessage(newMessage);
//   }

//   public broadcastMessage(sender: WebSocket, message: InfoPayload | MessagePaylaod) {
//     this.server.clients.forEach((client) => {
//       if (client !== sender && client.readyState === WebSocket.OPEN) {
//         client.send(JSON.stringify(message));
//       }
//     });
//   }

//   private emitMessage(message: MessagePaylaod | InfoPayload) {
//     this.server.clients.forEach((client) => {
//       if (client.readyState === WebSocket.OPEN) {
//         client.send(JSON.stringify(message));
//       }
//     });
//   }
// }

// // @SubscribeMessage('message')
// // handleMessage(client: any, payload: any): string {
// //   return 'Hello world!';
// // }
