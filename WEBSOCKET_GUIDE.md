# WebSocket Implementation Guide - NestJS Backend

> **Purpose:** Complete guide for implementing WebSocket client in frontend applications
> **Backend:** NestJS 11 with `@nestjs/websockets` and `ws` library
> **Protocol:** Raw WebSocket (not Socket.IO)

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Backend Architecture](#backend-architecture)
3. [Connection Flow](#connection-flow)
4. [Authentication](#authentication)
5. [Message Types](#message-types)
6. [Frontend Implementation](#frontend-implementation)
7. [API Reference](#api-reference)

---

## Overview

### What is Implemented

This NestJS backend uses **raw WebSocket** (via the `ws` library), NOT Socket.IO. The WebSocket server provides:

- ✅ Real-time messaging/chat
- ✅ JWT-based authentication via query parameters
- ✅ Connection/disconnection notifications
- ✅ Message history (last 5 messages)
- ✅ Client count tracking
- ✅ User presence tracking

### WebSocket URL

```
ws://localhost:3005?token=YOUR_JWT_TOKEN
```

**Important:**
- Use `ws://` for local development (HTTP)
- Use `wss://` for production (HTTPS)
- Token must be passed as query parameter

---

## Backend Architecture

### File Structure

```
src/
└── socket/
    ├── socket.module.ts        # Module registration
    └── socket.gateway.ts       # WebSocket gateway (main logic)
```

### Module Registration

The SocketModule is imported in `app.module.ts`:

```typescript
@Module({
  imports: [
    // ... other modules
    SocketModule,  // ← WebSocket module
  ],
})
export class AppModule {}
```

### Gateway Configuration

```typescript
@WebSocketGateway({ transport: ['websocket'], secure: true })
export class SocketGateway implements OnGatewayInit {
  @WebSocketServer()
  server: WebSocket.Server;

  private summeryClient: number = 0;
  private clientAuthMap = new Map<WebSocket, Member>();
  private messageList: MessagePayload[] = [];
}
```

**Key Components:**
- `clientAuthMap`: Maps WebSocket connections to authenticated members
- `messageList`: Stores last 5 messages in memory
- `summeryClient`: Tracks total connected clients

---

## Connection Flow

### 1. Client Initiates Connection

```javascript
// Frontend connects with JWT token
const ws = new WebSocket('ws://localhost:3005?token=YOUR_JWT_TOKEN');
```

### 2. Backend Authentication

```typescript
public async retrieveAuth(req: any): Promise<Member> {
  const parseUrl = url.parse(req.url, true);
  const { token } = parseUrl.query;
  return await this.authService.verifyToken(token as string);
}
```

**What Happens:**
1. Backend extracts token from query string
2. Verifies JWT using `authService.verifyToken()`
3. Returns `Member` object if valid, `null` if invalid

### 3. Connection Established

```typescript
public async handleConnection(client: WebSocket, req: any) {
  const authMember = await this.retrieveAuth(req);
  this.summeryClient++;
  this.clientAuthMap.set(client, authMember);

  // Broadcast join notification
  const infoMsg = {
    event: 'info',
    totalClients: this.summeryClient,
    memberData: authMember,
    action: 'joined',
  };
  this.emitMessage(infoMsg);

  // Send message history to new client
  client.send(JSON.stringify({
    event: 'getMessage',
    list: this.messageList
  }));
}
```

**Client receives:**
1. `info` event: Notification that someone joined
2. `getMessage` event: Last 5 messages

### 4. Client Disconnection

```typescript
public async handleDisConnection(client: WebSocket) {
  const authMember = this.clientAuthMap.get(client);
  this.summeryClient--;
  this.clientAuthMap.delete(client);

  const infoMsg = {
    event: 'info',
    totalClients: this.summeryClient,
    memberData: authMember,
    action: 'left',
  };
  this.broadcastMessage(client, infoMsg);
}
```

**All clients receive:**
- `info` event: Notification that someone left

---

## Authentication

### JWT Token Generation

Tokens are generated during login/signup via REST API or GraphQL:

```typescript
// Member logs in via GraphQL mutation
mutation Login {
  login(input: {
    memberNick: "john_doe"
    memberPassword: "password123"
  }) {
    accessToken  # ← Use this token for WebSocket
    memberNick
    _id
  }
}
```

### Token Format

**Payload:**
```json
{
  "_id": "507f1f77bcf86cd799439011",
  "memberNick": "john_doe",
  "memberType": "USER",
  "memberStatus": "ACTIVE",
  "iat": 1234567890,
  "exp": 1237159890
}
```

**Expiration:** 30 days

### Using Token in WebSocket

**Query Parameter Method (Current Implementation):**
```javascript
const token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...";
const ws = new WebSocket(`ws://localhost:3005?token=${token}`);
```

---

## Message Types

### 1. Client → Server

#### Send Message

```javascript
// Client sends message
ws.send('message', 'Hello everyone!');
```

**Backend Handler:**
```typescript
@SubscribeMessage('message')
public async handleMessage(client: WebSocket, payload: string) {
  const authMember = this.clientAuthMap.get(client);
  const newMessage = {
    event: 'message',
    text: payload,
    memberData: authMember,
  };

  this.messageList.push(newMessage);
  if (this.messageList.length > 5) {
    this.messageList.splice(0, this.messageList.length - 5);
  }

  this.emitMessage(newMessage);
}
```

### 2. Server → Client

All messages from server are JSON strings:

#### Message Event

```json
{
  "event": "message",
  "text": "Hello everyone!",
  "memberData": {
    "_id": "507f1f77bcf86cd799439011",
    "memberNick": "john_doe",
    "memberType": "USER",
    "memberImage": "https://example.com/avatar.jpg"
  }
}
```

#### Info Event (Join/Leave)

```json
{
  "event": "info",
  "totalClients": 5,
  "action": "joined",  // or "left"
  "memberData": {
    "_id": "507f1f77bcf86cd799439011",
    "memberNick": "john_doe",
    "memberType": "USER"
  }
}
```

#### Get Messages Event (History)

```json
{
  "event": "getMessages",
  "list": [
    {
      "event": "message",
      "text": "Previous message 1",
      "memberData": { ... }
    },
    {
      "event": "message",
      "text": "Previous message 2",
      "memberData": { ... }
    }
  ]
}
```

---

## Frontend Implementation

### React Example

```jsx
import { useEffect, useState, useRef } from 'react';

function ChatComponent() {
  const [messages, setMessages] = useState([]);
  const [onlineUsers, setOnlineUsers] = useState(0);
  const [inputMessage, setInputMessage] = useState('');
  const wsRef = useRef(null);

  useEffect(() => {
    // Get token from your auth context/localStorage
    const token = localStorage.getItem('accessToken');

    // Connect to WebSocket
    const ws = new WebSocket(`ws://localhost:3005?token=${token}`);
    wsRef.current = ws;

    // Connection opened
    ws.addEventListener('open', (event) => {
      console.log('✅ Connected to WebSocket');
    });

    // Listen for messages
    ws.addEventListener('message', (event) => {
      const data = JSON.parse(event.data);

      switch(data.event) {
        case 'message':
          // New message received
          setMessages(prev => [...prev, {
            text: data.text,
            user: data.memberData?.memberNick || 'Guest',
            userId: data.memberData?._id
          }]);
          break;

        case 'info':
          // User joined/left
          setOnlineUsers(data.totalClients);
          if (data.action === 'joined') {
            console.log(`${data.memberData?.memberNick} joined`);
          } else {
            console.log(`${data.memberData?.memberNick} left`);
          }
          break;

        case 'getMessages':
          // Message history
          const history = data.list.map(msg => ({
            text: msg.text,
            user: msg.memberData?.memberNick || 'Guest',
            userId: msg.memberData?._id
          }));
          setMessages(history);
          break;
      }
    });

    // Connection closed
    ws.addEventListener('close', (event) => {
      console.log('🔌 Disconnected from WebSocket');
    });

    // Connection error
    ws.addEventListener('error', (error) => {
      console.error('❌ WebSocket error:', error);
    });

    // Cleanup on unmount
    return () => {
      ws.close();
    };
  }, []);

  const sendMessage = () => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(inputMessage);
      setInputMessage('');
    }
  };

  return (
    <div>
      <div>Online Users: {onlineUsers}</div>

      <div className="messages">
        {messages.map((msg, idx) => (
          <div key={idx}>
            <strong>{msg.user}:</strong> {msg.text}
          </div>
        ))}
      </div>

      <input
        value={inputMessage}
        onChange={(e) => setInputMessage(e.target.value)}
        onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
      />
      <button onClick={sendMessage}>Send</button>
    </div>
  );
}
```

### Vanilla JavaScript Example

```javascript
// Get JWT token (from login response)
const token = localStorage.getItem('accessToken');

// Connect to WebSocket
const ws = new WebSocket(`ws://localhost:3005?token=${token}`);

// Connection opened
ws.onopen = () => {
  console.log('✅ Connected to WebSocket');
};

// Receive messages
ws.onmessage = (event) => {
  const data = JSON.parse(event.data);

  switch(data.event) {
    case 'message':
      console.log(`${data.memberData.memberNick}: ${data.text}`);
      // Update UI with new message
      break;

    case 'info':
      console.log(`Total users: ${data.totalClients}`);
      if (data.action === 'joined') {
        console.log(`${data.memberData.memberNick} joined`);
      } else {
        console.log(`${data.memberData.memberNick} left`);
      }
      break;

    case 'getMessages':
      console.log('Message history:', data.list);
      // Display message history
      break;
  }
};

// Send message
function sendMessage(text) {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(text);
  }
}

// Close connection
ws.onclose = () => {
  console.log('🔌 Disconnected');
};

// Error handling
ws.onerror = (error) => {
  console.error('❌ WebSocket error:', error);
};
```

### Next.js Example

```tsx
'use client';

import { useEffect, useState } from 'react';

export default function ChatPage() {
  const [ws, setWs] = useState<WebSocket | null>(null);
  const [messages, setMessages] = useState<any[]>([]);

  useEffect(() => {
    // Only run on client side
    if (typeof window === 'undefined') return;

    const token = localStorage.getItem('accessToken');
    const socket = new WebSocket(`ws://localhost:3005?token=${token}`);

    socket.onopen = () => console.log('Connected');

    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.event === 'message') {
        setMessages(prev => [...prev, data]);
      }
    };

    setWs(socket);

    return () => socket.close();
  }, []);

  const sendMessage = (text: string) => {
    ws?.send(text);
  };

  return (
    <div>
      {messages.map((msg, i) => (
        <div key={i}>{msg.memberData?.memberNick}: {msg.text}</div>
      ))}
      <input onKeyPress={(e) => {
        if (e.key === 'Enter') {
          sendMessage(e.currentTarget.value);
          e.currentTarget.value = '';
        }
      }} />
    </div>
  );
}
```

---

## API Reference

### WebSocket Server Events

| Event | Direction | Description | Data Format |
|-------|-----------|-------------|-------------|
| `message` | Client → Server | Send a chat message | Plain string |
| `message` | Server → Client | Broadcast chat message | `{ event: 'message', text: string, memberData: Member }` |
| `info` | Server → Client | Join/leave notification | `{ event: 'info', totalClients: number, memberData: Member, action: 'joined'\|'left' }` |
| `getMessages` | Server → Client | Message history on connect | `{ event: 'getMessages', list: MessagePayload[] }` |

### Member Data Structure

```typescript
interface Member {
  _id: string;
  memberNick: string;
  memberType: 'USER' | 'AGENT' | 'ADMIN';
  memberStatus: 'ACTIVE' | 'BLOCKED' | 'DELETE';
  memberImage?: string;
  memberFullName?: string;
}
```

### Message Payload Structure

```typescript
interface MessagePayload {
  event: 'message';
  text: string;
  memberData: Member;
}
```

### Info Payload Structure

```typescript
interface InfoPayload {
  event: 'info';
  totalClients: number;
  memberData: Member;
  action: 'joined' | 'left';
}
```

---

## Connection States

### WebSocket.readyState Values

| Value | Constant | Description |
|-------|----------|-------------|
| 0 | `CONNECTING` | Connection not yet established |
| 1 | `OPEN` | Connection is open and ready |
| 2 | `CLOSING` | Connection is closing |
| 3 | `CLOSED` | Connection is closed |

### Checking Connection State

```javascript
if (ws.readyState === WebSocket.OPEN) {
  ws.send('Hello');
}
```

---

## Error Handling

### Common Errors

**1. Connection Refused**
```
Error: WebSocket connection to 'ws://localhost:3005' failed
```
**Solution:** Ensure backend server is running

**2. Invalid Token**
```
Connection closes immediately after opening
```
**Solution:** Check token validity, ensure it's not expired

**3. CORS Issues** (for wss://)
```
Access to WebSocket at 'wss://...' blocked by CORS policy
```
**Solution:** Configure CORS in backend gateway

### Reconnection Strategy

```javascript
let ws;
let reconnectInterval;

function connect() {
  const token = localStorage.getItem('accessToken');
  ws = new WebSocket(`ws://localhost:3005?token=${token}`);

  ws.onopen = () => {
    console.log('Connected');
    clearInterval(reconnectInterval);
  };

  ws.onclose = () => {
    console.log('Disconnected. Reconnecting...');
    reconnectInterval = setInterval(connect, 3000);
  };

  ws.onerror = (error) => {
    console.error('WebSocket error:', error);
    ws.close();
  };
}

connect();
```

---

## Testing

### Testing with WebSocket Client Tools

**1. Using Browser Console:**
```javascript
const ws = new WebSocket('ws://localhost:3005?token=YOUR_TOKEN');
ws.onmessage = (e) => console.log(JSON.parse(e.data));
ws.onopen = () => ws.send('Test message');
```

**2. Using Postman:**
- Create new WebSocket Request
- URL: `ws://localhost:3005?token=YOUR_TOKEN`
- Connect and send messages

**3. Using wscat (CLI):**
```bash
npm install -g wscat
wscat -c "ws://localhost:3005?token=YOUR_TOKEN"
# Type messages and press Enter
```

---

## Production Considerations

### 1. Use WSS (Secure WebSocket)

```javascript
// Production
const ws = new WebSocket(`wss://api.yourapp.com?token=${token}`);

// Development
const ws = new WebSocket(`ws://localhost:3005?token=${token}`);
```

### 2. Environment Variables

```javascript
const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3005';
const ws = new WebSocket(`${WS_URL}?token=${token}`);
```

### 3. Handle Token Refresh

```javascript
// If token expires during connection
ws.onclose = (event) => {
  if (event.code === 1006) {
    // Refresh token and reconnect
    refreshToken().then(newToken => {
      connect(newToken);
    });
  }
};
```

### 4. Message Persistence

Current implementation stores only last 5 messages in memory. For production:
- Use MongoDB to persist all messages
- Query message history on connect
- Implement pagination for message loading

---

## Summary

**To connect from frontend:**

1. **Get JWT token** from login/signup
2. **Connect to WebSocket** with token as query param
3. **Listen for events:**
   - `message`: New chat messages
   - `info`: User join/leave notifications
   - `getMessages`: Message history on connect
4. **Send messages** using `ws.send(text)`
5. **Handle disconnections** with reconnection logic

**Example Quick Start:**

```javascript
const token = 'YOUR_JWT_TOKEN';
const ws = new WebSocket(`ws://localhost:3005?token=${token}`);

ws.onmessage = (e) => {
  const data = JSON.parse(e.data);
  console.log(data);
};

ws.onopen = () => ws.send('Hello!');
```

---

**Last Updated:** 2026-02-13
**Backend Version:** NestJS 11.0.1
**WebSocket Library:** ws 8.19.0
