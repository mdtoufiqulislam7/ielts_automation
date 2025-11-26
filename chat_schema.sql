-- Chat System Database Schema
-- Run this SQL to set up chat functionality

-- Ensure chats table exists (should already exist from main schema)
CREATE TABLE IF NOT EXISTS chats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message TEXT NOT NULL,
  sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_chats_sender_id ON chats(sender_id);
CREATE INDEX IF NOT EXISTS idx_chats_receiver_id ON chats(receiver_id);
CREATE INDEX IF NOT EXISTS idx_chats_sent_at ON chats(sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_chats_conversation ON chats(sender_id, receiver_id, sent_at DESC);

-- Optional: Table for tracking read messages (for unread count feature)
CREATE TABLE IF NOT EXISTS user_chat_reads (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  other_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  last_read_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, other_user_id)
);

-- Create index for read tracking
CREATE INDEX IF NOT EXISTS idx_user_chat_reads_user ON user_chat_reads(user_id, other_user_id);

