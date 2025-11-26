import pool from '../config/db';
import { WebSocketServer } from '../config/websocket';

export interface ChatMessage {
  id: string;
  message: string;
  sent_at: Date;
  sender_id: string;
  receiver_id: string;
  sender_username?: string;
  sender_avatar?: string;
  receiver_username?: string;
  receiver_avatar?: string;
}

export interface Conversation {
  user_id: string;
  username: string;
  email: string;
  avatar_url: string | null;
  last_message: string | null;
  last_message_time: Date | null;
  unread_count: number;
}

export interface SendMessageData {
  receiver_id: string;
  message: string;
}

export class ChatService {
  // Send a message
  static async sendMessage(
    senderId: string,
    data: SendMessageData
  ): Promise<ChatMessage> {
    const { receiver_id, message } = data;

    // Validate message
    if (!message || message.trim().length === 0) {
      throw new Error('Message cannot be empty');
    }

    if (message.length > 5000) {
      throw new Error('Message is too long (max 5000 characters)');
    }

    // Check if receiver exists
    const receiverCheck = await pool.query(
      'SELECT id FROM users WHERE id = $1',
      [receiver_id]
    );

    if (receiverCheck.rows.length === 0) {
      throw new Error('Receiver not found');
    }

    // Check if trying to send to self
    if (senderId === receiver_id) {
      throw new Error('Cannot send message to yourself');
    }

    // Insert message
    const result = await pool.query(
      `INSERT INTO chats (sender_id, receiver_id, message)
       VALUES ($1, $2, $3)
       RETURNING id, message, sent_at, sender_id, receiver_id`,
      [senderId, receiver_id, message.trim()]
    );

    // Get sender and receiver details
    const senderResult = await pool.query(
      `SELECT u.username, p.avatar_url
       FROM users u
       LEFT JOIN profiles p ON u.id = p.user_id
       WHERE u.id = $1`,
      [senderId]
    );

    const receiverResult = await pool.query(
      `SELECT u.username, p.avatar_url
       FROM users u
       LEFT JOIN profiles p ON u.id = p.user_id
       WHERE u.id = $1`,
      [receiver_id]
    );

    const messageData = result.rows[0];
    messageData.sender_username = senderResult.rows[0]?.username;
    messageData.sender_avatar = senderResult.rows[0]?.avatar_url;
    messageData.receiver_username = receiverResult.rows[0]?.username;
    messageData.receiver_avatar = receiverResult.rows[0]?.avatar_url;

    // Emit WebSocket event for real-time message delivery
    const wsServer = WebSocketServer.getInstance();
    if (wsServer) {
      wsServer.emitToUser(receiver_id, 'new_message', {
        ...messageData,
        timestamp: new Date(),
      });
    }

    return messageData;
  }

  // Get messages between two users
  static async getMessages(
    userId: string,
    otherUserId: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<{ messages: ChatMessage[]; total: number }> {
    // Verify other user exists
    const userCheck = await pool.query(
      'SELECT id FROM users WHERE id = $1',
      [otherUserId]
    );

    if (userCheck.rows.length === 0) {
      throw new Error('User not found');
    }

    // Get messages between the two users
    const result = await pool.query(
      `SELECT 
        c.id,
        c.message,
        c.sent_at,
        c.sender_id,
        c.receiver_id,
        sender.username as sender_username,
        sender_profile.avatar_url as sender_avatar,
        receiver.username as receiver_username,
        receiver_profile.avatar_url as receiver_avatar
      FROM chats c
      INNER JOIN users sender ON c.sender_id = sender.id
      LEFT JOIN profiles sender_profile ON c.sender_id = sender_profile.user_id
      INNER JOIN users receiver ON c.receiver_id = receiver.id
      LEFT JOIN profiles receiver_profile ON c.receiver_id = receiver_profile.user_id
      WHERE (c.sender_id = $1 AND c.receiver_id = $2)
         OR (c.sender_id = $2 AND c.receiver_id = $1)
      ORDER BY c.sent_at DESC
      LIMIT $3 OFFSET $4`,
      [userId, otherUserId, limit, offset]
    );

    // Get total count
    const countResult = await pool.query(
      `SELECT COUNT(*) as total
       FROM chats
       WHERE (sender_id = $1 AND receiver_id = $2)
          OR (sender_id = $2 AND receiver_id = $1)`,
      [userId, otherUserId]
    );

    const total = parseInt(countResult.rows[0].total);

    // Reverse to show oldest first
    return {
      messages: result.rows.reverse(),
      total,
    };
  }

  // Get all conversations for a user
  static async getConversations(
    userId: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<{ conversations: Conversation[]; total: number }> {
    const result = await pool.query(
      `WITH latest_messages AS (
        SELECT DISTINCT ON (
          CASE 
            WHEN sender_id = $1 THEN receiver_id
            ELSE sender_id
          END
        )
        CASE 
          WHEN sender_id = $1 THEN receiver_id
          ELSE sender_id
        END as other_user_id,
        message,
        sent_at,
        sender_id
        FROM chats
        WHERE sender_id = $1 OR receiver_id = $1
        ORDER BY 
          CASE 
            WHEN sender_id = $1 THEN receiver_id
            ELSE sender_id
          END,
          sent_at DESC
      )
      SELECT 
        u.id as user_id,
        u.username,
        u.email,
        p.avatar_url,
        lm.message as last_message,
        lm.sent_at as last_message_time,
        COALESCE((
          SELECT COUNT(*) 
          FROM chats 
          WHERE receiver_id = $1 
            AND sender_id = u.id 
            AND sent_at > COALESCE(
              (SELECT last_read_at FROM user_chat_reads WHERE user_id = $1 AND other_user_id = u.id),
              '1970-01-01'::timestamp
            )
        ), 0) as unread_count
      FROM latest_messages lm
      INNER JOIN users u ON u.id = lm.other_user_id
      LEFT JOIN profiles p ON u.id = p.user_id
      ORDER BY lm.sent_at DESC
      LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    );

    // Get total count
    const countResult = await pool.query(
      `SELECT COUNT(DISTINCT 
        CASE 
          WHEN sender_id = $1 THEN receiver_id
          ELSE sender_id
        END
      ) as total
      FROM chats
      WHERE sender_id = $1 OR receiver_id = $1`,
      [userId]
    );

    const total = parseInt(countResult.rows[0].total);

    return {
      conversations: result.rows,
      total,
    };
  }

  // Mark messages as read
  static async markAsRead(
    userId: string,
    otherUserId: string
  ): Promise<void> {
    try {
      // Create or update read timestamp (table might not exist)
      await pool.query(
        `INSERT INTO user_chat_reads (user_id, other_user_id, last_read_at)
         VALUES ($1, $2, CURRENT_TIMESTAMP)
         ON CONFLICT (user_id, other_user_id)
         DO UPDATE SET last_read_at = CURRENT_TIMESTAMP`,
        [userId, otherUserId]
      );
    } catch (error: any) {
      // If table doesn't exist, silently fail (unread count will still work)
      if (!error.message.includes('does not exist')) {
        throw error;
      }
    }
  }

  // Get unread message count for a user
  static async getUnreadCount(userId: string): Promise<number> {
    const result = await pool.query(
      `SELECT COUNT(*) as total
       FROM chats c
       LEFT JOIN user_chat_reads ucr 
         ON c.sender_id = ucr.other_user_id 
         AND ucr.user_id = $1
       WHERE c.receiver_id = $1
         AND (ucr.last_read_at IS NULL OR c.sent_at > ucr.last_read_at)`,
      [userId]
    );

    return parseInt(result.rows[0].total);
  }

  // Check if user has any unread chats (notification check)
  static async hasUnreadChats(userId: string): Promise<boolean> {
    const result = await pool.query(
      `SELECT EXISTS(
        SELECT 1
        FROM chats c
        LEFT JOIN user_chat_reads ucr 
          ON c.sender_id = ucr.other_user_id 
          AND ucr.user_id = $1
        WHERE c.receiver_id = $1
          AND (ucr.last_read_at IS NULL OR c.sent_at > ucr.last_read_at)
        LIMIT 1
      ) as has_unread`,
      [userId]
    );

    return result.rows[0].has_unread === true;
  }
}

