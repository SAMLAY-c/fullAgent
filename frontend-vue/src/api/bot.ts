/**
 * Bot API
 */
import request from './request'
import type { Bot, GetBotsResponse, BotScene } from '@/types'

export interface GetBotsParams {
  type?: string
  status?: string
  scene?: BotScene
  page?: number
  page_size?: number
}

/**
 * 获取 Bot 列表
 */
export function getBots(params?: GetBotsParams) {
  const query = new URLSearchParams()
  if (params?.type) query.append('type', params.type)
  if (params?.status) query.append('status', params.status)
  if (params?.scene) query.append('scene', params.scene)
  if (params?.page) query.append('page', String(params.page))
  if (params?.page_size) query.append('page_size', String(params.page_size))

  const queryString = query.toString()
  return request.get<{ data: GetBotsResponse }>(`/bots${queryString ? `?${queryString}` : ''}`)
}

/**
 * 获取单个 Bot
 */
export function getBot(botId: string) {
  return request.get<{ data: { bot: Bot } }>(`/bots/${botId}`)
}

/**
 * 创建 Bot
 */
export function createBot(botData: Partial<Bot>) {
  return request.post<{ data: { bot: Bot } }>('/bots', botData)
}

/**
 * 更新 Bot
 */
export function updateBot(botId: string, botData: Partial<Bot>) {
  return request.put<{ data: { bot: Bot } }>(`/bots/${botId}`, botData)
}

/**
 * 删除 Bot
 */
export function deleteBot(botId: string) {
  return request.delete(`/bots/${botId}`)
}

/**
 * 更新 Bot 状态
 */
export function updateBotStatus(botId: string, status: string) {
  return request.put<{ data: { bot: Bot } }>(`/bots/${botId}/status`, { status })
}

/**
 * 获取 Bot 的会话列表
 */
export function getBotConversations(botId: string, limit = 50) {
  return request.get(`/bots/${botId}/conversations?limit=${limit}`)
}

/**
 * 按场景获取 Bots
 */
export async function getBotsByScene() {
  const response = await getBots()
  const bots = response.data?.data?.bots || []

  return {
    work: bots.filter((b: Bot) => b.scene === 'work') || [],
    life: bots.filter((b: Bot) => b.scene === 'life') || [],
    love: bots.filter((b: Bot) => b.scene === 'love') || [],
    group: bots.filter((b: Bot) => b.scene === 'group') || [],
    sop: bots.filter((b: Bot) => b.scene === 'sop') || []
  }
}
