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

@WebSocketGateway({
  cors: {
    origin: '*', // Configure this properly in production
    credentials: true,
  },
})
export class SocketGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  private summaryClient: number = 0;
  private clientAuthMap = new Map<WebSocket, Member>();
  private messageList: MessagePayload[] = [];

  constructor(private authService: AuthService) {}

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
