# Chat System Implementation

## Overview
Complete real-time chat system with WebSocket support for instant messaging between users.

## Files Created

### Services
- `src/services/chatService.ts` - Chat business logic

### Controllers
- `src/controllers/chatController.ts` - Chat HTTP endpoints

### Routes
- `src/routes/chatRoutes.ts` - Chat API routes

### Database
- `chat_schema.sql` - Database schema for chat tables

## API Endpoints

### Send Message
- **POST** `/api/chat/message`
  - Body: `{ receiver_id: string, message: string }`
  - Returns: Sent message with sender/receiver details

### Get Messages
- **GET** `/api/chat/messages/:userId`
  - Query params: `limit` (default: 50), `offset` (default: 0)
  - Returns: Messages between current user and specified user

### Get Conversations
- **GET** `/api/chat/conversations`
  - Query params: `limit` (default: 50), `offset` (default: 0)
  - Returns: List of all conversations with last message and unread count

### Mark as Read
- **POST** `/api/chat/read/:userId`
  - Marks all messages from specified user as read

### Get Unread Count
- **GET** `/api/chat/unread`
  - Returns: Total unread message count for current user

## WebSocket Events

### Client → Server

#### Send Message
```javascript
socket.emit('send_message', {
  receiver_id: 'user-uuid',
  message: 'Hello!'
});
```

#### Typing Indicator
```javascript
socket.emit('typing', {
  receiver_id: 'user-uuid',
  isTyping: true  // or false
});
```

### Server → Client

#### New Message
```javascript
socket.on('new_message', (data) => {
  // data: { id, message, sent_at, sender_id, receiver_id, sender_username, sender_avatar, ... }
});
```

#### Message Sent Confirmation
```javascript
socket.on('message_sent', (data) => {
  // Confirmation that your message was sent
});
```

#### User Typing
```javascript
socket.on('user_typing', (data) => {
  // data: { sender_id, sender_username, isTyping }
});
```

## Database Schema

### chats Table
- `id` (UUID, Primary Key)
- `message` (TEXT, Not Null)
- `sent_at` (TIMESTAMP, Default: CURRENT_TIMESTAMP)
- `sender_id` (UUID, Foreign Key → users.id)
- `receiver_id` (UUID, Foreign Key → users.id)

### user_chat_reads Table (Optional)
- `user_id` (UUID, Foreign Key → users.id)
- `other_user_id` (UUID, Foreign Key → users.id)
- `last_read_at` (TIMESTAMP)
- Primary Key: (user_id, other_user_id)

## Features

1. **Real-Time Messaging**: Messages are delivered instantly via WebSocket
2. **Message History**: Retrieve past messages between users
3. **Conversation List**: View all conversations with last message preview
4. **Unread Counts**: Track unread messages per conversation
5. **Typing Indicators**: Show when users are typing
6. **Read Receipts**: Mark messages as read (optional feature)

## Setup

1. **Run Database Schema**:
   ```bash
   psql -U your_user -d your_database -f chat_schema.sql
   ```

2. **The chat routes are already integrated** in `app.ts`

3. **WebSocket is already configured** in `websocket.ts`

## Usage Example

### Send Message via REST API
```bash
POST /api/chat/message
Authorization: Bearer <token>
{
  "receiver_id": "user-uuid",
  "message": "Hello, how are you?"
}
```

### Send Message via WebSocket
```javascript
socket.emit('send_message', {
  receiver_id: 'user-uuid',
  message: 'Hello, how are you?'
});
```

### Get Messages
```bash
GET /api/chat/messages/:userId?limit=50&offset=0
Authorization: Bearer <token>
```

### Get Conversations
```bash
GET /api/chat/conversations?limit=50&offset=0
Authorization: Bearer <token>
```

## Message Validation

- Message cannot be empty
- Maximum length: 5000 characters
- Cannot send message to yourself
- Receiver must exist

## Notes

- All chat endpoints require authentication
- Messages are stored in the database for history
- WebSocket provides real-time delivery
- Unread counts work with or without `user_chat_reads` table
- Typing indicators are real-time only (not persisted)

