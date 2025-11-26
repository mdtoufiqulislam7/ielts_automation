# WebSocket Setup Instructions

## Installation

You need to install `socket.io` and its types:

```bash
npm install socket.io
npm install --save-dev @types/socket.io
```

## Client-Side Connection

To connect to the WebSocket server from your frontend, use Socket.IO client:

```javascript
import { io } from 'socket.io-client';

// Connect to WebSocket server
const socket = io('http://localhost:5000', {
  auth: {
    token: 'YOUR_JWT_ACCESS_TOKEN' // Pass the JWT token for authentication
  },
  // Or pass token in headers
  extraHeaders: {
    Authorization: `Bearer YOUR_JWT_ACCESS_TOKEN`
  }
});

// Listen for events
socket.on('connect', () => {
  console.log('Connected to WebSocket server');
});

// Listen for new follower notifications
socket.on('new_follower', (data) => {
  console.log('New follower:', data);
  // data: { followerId, followerUsername, timestamp }
});

// Listen for unfollow notifications
socket.on('user_unfollowed', (data) => {
  console.log('User unfollowed:', data);
  // data: { followerId, followerUsername, timestamp }
});

// Listen for follow success
socket.on('follow_success', (data) => {
  console.log('Follow successful:', data);
  // data: { userId, timestamp }
});

// Listen for unfollow success
socket.on('unfollow_success', (data) => {
  console.log('Unfollow successful:', data);
  // data: { userId, timestamp }
});

// Listen for user online/offline status
socket.on('user_status', (data) => {
  console.log('User status changed:', data);
  // data: { userId, isOnline, timestamp }
});

// Emit follow event (optional - also handled via REST API)
socket.emit('follow', { userId: 'target-user-id' });

// Emit unfollow event (optional - also handled via REST API)
socket.emit('unfollow', { userId: 'target-user-id' });

// Handle errors
socket.on('error', (error) => {
  console.error('WebSocket error:', error);
});

// Handle disconnect
socket.on('disconnect', () => {
  console.log('Disconnected from WebSocket server');
});
```

## Environment Variables

Make sure to set the `CLIENT_URL` in your `.env` file for CORS configuration:

```
CLIENT_URL=http://localhost:3000
```

## Real-Time Features

The WebSocket server provides real-time updates for:

1. **Follow/Unfollow Events**: When a user follows or unfollows another user, both users receive real-time notifications
2. **Online Status**: Users can see when users they follow come online or go offline
3. **Follower Notifications**: Users are notified when someone follows them

## API Endpoints

The follow/unfollow functionality is also available via REST API:

- `POST /api/follow/:userId` - Follow a user
- `DELETE /api/follow/:userId` - Unfollow a user
- `GET /api/follow/:userId/followers` - Get followers of a user
- `GET /api/follow/:userId/following` - Get users that a user is following
- `GET /api/follow/:userId/check` - Check if following a user

Both REST API and WebSocket events work together - when you use the REST API to follow/unfollow, WebSocket events are automatically emitted.

