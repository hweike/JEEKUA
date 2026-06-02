// lib/chat/db.ts
import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const dataDir = path.join(process.cwd(), 'data', 'chat');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const dbPath = path.join(dataDir, 'chat.db');
const db = new Database(dbPath);

// 初始化表结构
db.exec(`
  CREATE TABLE IF NOT EXISTS conversations (
    id TEXT PRIMARY KEY,
    contact TEXT NOT NULL,
    created_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS messages (
    id TEXT PRIMARY KEY,
    conversation_id TEXT NOT NULL,
    content TEXT NOT NULL,
    is_admin INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL,
    FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_conversations_contact ON conversations(contact);
  CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id);
`);

// 类型定义
export interface Conversation {
  id: string;
  contact: string;
  created_at: number;
}

export interface Message {
  id: string;
  conversation_id: string;
  content: string;
  is_admin: boolean;
  created_at: number;
}

// 根据联系方式获取会话
export function getConversationByContact(contact: string): Conversation | undefined {
  const stmt = db.prepare('SELECT * FROM conversations WHERE contact = ? ORDER BY created_at DESC LIMIT 1');
  return stmt.get(contact) as Conversation | undefined;
}

// 创建新会话
export function createConversation(contact: string, id?: string): Conversation {
  const convId = id || crypto.randomUUID();
  const now = Date.now();
  const stmt = db.prepare('INSERT INTO conversations (id, contact, created_at) VALUES (?, ?, ?)');
  stmt.run(convId, contact, now);
  return { id: convId, contact, created_at: now };
}

// 获取会话的所有消息
export function getMessages(conversationId: string): Message[] {
  const stmt = db.prepare('SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_at ASC');
  return stmt.all(conversationId) as Message[];
}

// 添加消息
export function addMessage(conversationId: string, content: string, isAdmin: boolean): Message {
  const id = crypto.randomUUID();
  const now = Date.now();
  const stmt = db.prepare('INSERT INTO messages (id, conversation_id, content, is_admin, created_at) VALUES (?, ?, ?, ?, ?)');
  stmt.run(id, conversationId, content, isAdmin ? 1 : 0, now);
  return { id, conversation_id: conversationId, content, is_admin: isAdmin, created_at: now };
}

// 获取所有会话（按最近消息时间排序，用于后台）
export function getAllConversations(): (Conversation & { last_message_at: number; last_message_preview: string })[] {
  const stmt = db.prepare(`
    SELECT 
      c.id, c.contact, c.created_at,
      MAX(m.created_at) as last_message_at,
      (SELECT content FROM messages WHERE conversation_id = c.id ORDER BY created_at DESC LIMIT 1) as last_message_preview
    FROM conversations c
    LEFT JOIN messages m ON c.id = m.conversation_id
    GROUP BY c.id
    ORDER BY last_message_at DESC
  `);
  return stmt.all() as any;
}