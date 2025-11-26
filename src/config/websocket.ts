import { Server as HTTPServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import pool from './db';

interface AuthenticatedSocket extends Socket {
  userId?: string;
  username?: string;
}

let wsServerInstance: WebSocketServer | null = null;

export class WebSocketServer {
  private io: SocketIOServer;
  private connectedUsers: Map<string, AuthenticatedSocket> = new Map();

  constructor(httpServer: HTTPServer) {
    this.io = new SocketIOServer(httpServer, {
      cors: {
        origin: process.env.CLIENT_URL || '*',
        methods: ['GET', 'POST'],
        credentials: true,
      },
    });

    this.setupMiddleware();
    this.setupEventHandlers();
    
    wsServerInstance = this;
  }

  // Get singleton instance
  static getInstance(): WebSocketServer | null {
    return wsServerInstance;
  }

  // Set instance (for initialization)
  static setInstance(instance: WebSocketServer): void {
    wsServerInstance = instance;
  }

  private setupMiddleware() {
    // Authentication middleware for WebSocket
    this.io.use(async (socket: AuthenticatedSocket, next) => {
      try {
        const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1];

        if (!token) {
          return next(new Error('Authentication error: No token provided'));
        }

        const jwtSecret = process.env.JWT_SECRET;
        if (!jwtSecret) {
          return next(new Error('JWT secret not configured'));
        }

        const decoded = jwt.verify(token, jwtSecret) as {
          userId: string;
          email: string;
          username: string;
        };

        // Verify user exists
        const result = await pool.query('SELECT id FROM users WHERE id = $1', [decoded.userId]);
        if (result.rows.length === 0) {
          return next(new Error('User not found'));
        }

        socket.userId = decoded.userId;
        socket.username = decoded.username;
        next();
      } catch (error) {
        if (error instanceof jwt.JsonWebTokenError) {
          return next(new Error('Invalid or expired token'));
        }
        next(new Error('Authentication error'));
      }
    });
  }

  private setupEventHandlers() {
    this.io.on('connection', (socket: AuthenticatedSocket) => {
      if (!socket.userId) {
        socket.disconnect();
        return;
      }

      console.log(`User ${socket.userId} connected`);

      // Store connected user
      this.connectedUsers.set(socket.userId, socket);

      // Join user's personal room
      socket.join(`user:${socket.userId}`);

      // Emit online status to followers
      this.notifyFollowersOnline(socket.userId, true);

      // Handle follow event
      socket.on('follow', async (data: { userId: string }) => {
        try {
          // Verify follow relationship exists
          const result = await pool.query(
            'SELECT id FROM followers WHERE user_id = $1 AND follower_id = $2',
            [data.userId, socket.userId]
          );

          if (result.rows.length > 0) {
            // Notify the followed user
            this.io.to(`user:${data.userId}`).emit('new_follower', {
              followerId: socket.userId,
              followerUsername: socket.username,
              timestamp: new Date(),
            });

            // Notify the follower
            socket.emit('follow_success', {
              userId: data.userId,
              timestamp: new Date(),
            });
          }
        } catch (error) {
          socket.emit('error', { message: 'Failed to process follow event' });
        }
      });

      // Handle unfollow event
      socket.on('unfollow', async (data: { userId: string }) => {
        try {
          // Notify the unfollowed user
          this.io.to(`user:${data.userId}`).emit('user_unfollowed', {
            followerId: socket.userId,
            followerUsername: socket.username,
            timestamp: new Date(),
          });

          // Notify the unfollower
          socket.emit('unfollow_success', {
            userId: data.userId,
            timestamp: new Date(),
          });
        } catch (error) {
          socket.emit('error', { message: 'Failed to process unfollow event' });
        }
      });

      // Handle chat message
      socket.on('send_message', async (data: { receiver_id: string; message: string }) => {
        try {
          // Import ChatService here to avoid circular dependency
          const { ChatService } = await import('../services/chatService');
          
          // Send message via service (validates and saves to DB)
          const chatMessage = await ChatService.sendMessage(socket.userId!, {
            receiver_id: data.receiver_id,
            message: data.message,
          });

          // Emit to receiver
          this.io.to(`user:${data.receiver_id}`).emit('new_message', {
            ...chatMessage,
            timestamp: new Date(),
          });

          // Confirm to sender
          socket.emit('message_sent', {
            ...chatMessage,
            timestamp: new Date(),
          });
        } catch (error) {
          socket.emit('error', { 
            message: error instanceof Error ? error.message : 'Failed to send message' 
          });
        }
      });

      // Handle typing indicator
      socket.on('typing', (data: { receiver_id: string; isTyping: boolean }) => {
        this.io.to(`user:${data.receiver_id}`).emit('user_typing', {
          sender_id: socket.userId,
          sender_username: socket.username,
          isTyping: data.isTyping,
        });
      });

      // Handle disconnect
      socket.on('disconnect', () => {
        console.log(`User ${socket.userId} disconnected`);
        this.connectedUsers.delete(socket.userId!);
        this.notifyFollowersOnline(socket.userId!, false);
      });
    });
  }

  private async notifyFollowersOnline(userId: string, isOnline: boolean) {
    try {
      // Get all followers of this user
      const result = await pool.query(
        'SELECT follower_id FROM followers WHERE user_id = $1',
        [userId]
      );

      // Notify each follower about online status
      result.rows.forEach((row) => {
        const followerSocket = this.connectedUsers.get(row.follower_id);
        if (followerSocket) {
          followerSocket.emit('user_status', {
            userId,
            isOnline,
            timestamp: new Date(),
          });
        }
      });
    } catch (error) {
      console.error('Error notifying followers:', error);
    }
  }

  // Public method to emit events from other parts of the application
  public emitToUser(userId: string, event: string, data: any) {
    this.io.to(`user:${userId}`).emit(event, data);
  }

  // Get all connected users
  public getConnectedUsers(): string[] {
    return Array.from(this.connectedUsers.keys());
  }
}

