/**
 * 聊天相关类型定义
 */

// Bot 场景类型
export type BotScene = 'work' | 'life' | 'love' | 'group' | 'sop'

// Bot 状态类型
export type BotStatus = 'active' | 'inactive' | 'archived'

// Bot 类型
export interface Bot {
  bot_id: string
  name: string
  scene: BotScene
  avatar?: string
  emoji?: string
  system_prompt?: string
  model?: string
  temperature?: number
  max_tokens?: number
  status: BotStatus
  description?: string
  created_at: string
  updated_at: string
}

// Folder 类型
export interface Folder {
  folder_id: string
  name: string
  scene: BotScene
  icon?: string
  order: number
  created_at: string
}

// 会话类型
export interface Conversation {
  conversation_id: string
  bot_id: string
  user_id: string
  title: string
  folder_id?: string
  archived: boolean
  created_at: string
  updated_at: string
  message_count?: number
  bot?: Bot
}

// 消息角色
export type MessageRole = 'user' | 'assistant' | 'system'

// 消息类型
export interface Message {
  message_id: string
  conversation_id: string
  role: MessageRole
  content: string
  created_at: string
  metadata?: Record<string, any>
}

// 记忆类型
export interface Memory {
  memory_id: string
  user_id: string
  title: string
  content: string
  type: 'key_point' | 'context' | 'insight'
  source_conversation_id?: string
  tags?: string[]
  created_at: string
  updated_at: string
}

// 群组类型
export interface Group {
  group_id: string
  name: string
  description?: string
  icon?: string
  member_ids: string[]
  created_at: string
  updated_at: string
}

// 请求参数类型
export interface SendMessageRequest {
  conversation_id: string
  content: string
  stream?: boolean
}

export interface CreateConversationRequest {
  bot_id: string
  title?: string
  extra_context?: string
  memory_ids?: string[]
}

export interface UpdateBotRequest {
  name?: string
  system_prompt?: string
  model?: string
  temperature?: number
  max_tokens?: number
  status?: BotStatus
}

// API 响应类型
export interface SendMessageResponse {
  message: Message
  conversation_id: string
}

export interface GetMessagesResponse {
  messages: Message[]
  total: number
  page: number
  page_size: number
}

export interface GetConversationsResponse {
  conversations: Conversation[]
  total: number
}

export interface GetBotsResponse {
  bots: Bot[]
  total: number
}

// 聊天状态
export interface ChatState {
  currentConversation: Conversation | null
  currentBot: Bot | null
  messages: Message[]
  loading: boolean
  sending: boolean
  error: string | null
}

// Bot 状态
export interface BotState {
  bots: Bot[]
  botsByScene: Record<BotScene, Bot[]>
  currentBot: Bot | null
  folders: Folder[]
  selectedFolderId: string | null
  loading: boolean
}
