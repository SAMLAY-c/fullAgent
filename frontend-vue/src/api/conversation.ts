/**
 * Conversation API
 */
import request from './request'
import type { Conversation, GetConversationsResponse, CreateConversationRequest } from '@/types'

/**
 * 获取会话列表
 */
export function getConversations(params?: {
  bot_id?: string
  folder_id?: string
  archived?: boolean
  page?: number
  page_size?: number
}) {
  const query = new URLSearchParams()
  if (params?.bot_id) query.append('bot_id', params.bot_id)
  if (params?.folder_id) query.append('folder_id', params.folder_id)
  if (params?.archived !== undefined) query.append('archived', String(params.archived))
  if (params?.page) query.append('page', String(params.page))
  if (params?.page_size) query.append('page_size', String(params.page_size))

  const queryString = query.toString()
  return request.get<{ data: GetConversationsResponse }>(`/conversations${queryString ? `?${queryString}` : ''}`)
}

/**
 * 获取单个会话
 */
export function getConversation(conversationId: string) {
  return request.get<{ data: { conversation: Conversation } }>(`/conversations/${conversationId}`)
}

/**
 * 创建会话
 */
export function createConversation(data: CreateConversationRequest) {
  return request.post<{ data: { conversation: Conversation } }>('/conversations', data)
}

/**
 * 删除会话
 */
export function deleteConversation(conversationId: string) {
  return request.delete(`/conversations/${conversationId}`)
}

/**
 * 更新会话
 */
export function updateConversation(conversationId: string, data: Partial<Conversation>) {
  return request.put<{ conversation: Conversation }>(`/conversations/${conversationId}`, data)
}

/**
 * 归档会话
 */
export function archiveConversation(conversationId: string) {
  return request.put(`/conversations/${conversationId}/archive`)
}

/**
 * 恢复已归档的会话
 */
export function unarchiveConversation(conversationId: string) {
  return request.put(`/conversations/${conversationId}/unarchive`)
}

/**
 * 重命名会话
 */
export function renameConversation(conversationId: string, title: string) {
  return request.put<{ data: { conversation: Conversation } }>(`/conversations/${conversationId}`, { title })
}

/**
 * 获取回收站（已删除/归档的会话）
 */
export function getTrashConversations() {
  return request.get<{ data: GetConversationsResponse }>('/conversations?archived=true')
}

/**
 * 彻底删除会话
 */
export function permanentDeleteConversation(conversationId: string) {
  return request.delete(`/conversations/${conversationId}/permanent`)
}

