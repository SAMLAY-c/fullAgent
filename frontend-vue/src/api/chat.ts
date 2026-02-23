/**
 * Chat API
 */
import request from './request'
import type { Message, SendMessageRequest, GetMessagesResponse } from '@/types'

/**
 * 获取会话消息列表
 */
export function getMessages(conversationId: string, params?: {
  page?: number
  page_size?: number
}) {
  const query = new URLSearchParams()
  if (params?.page) query.append('page', String(params.page))
  if (params?.page_size) query.append('page_size', String(params.page_size))

  const queryString = query.toString()
  return request.get<{ data: GetMessagesResponse }>(`/conversations/${conversationId}/messages${queryString ? `?${queryString}` : ''}`)
}

/**
 * 发送消息（非流式）
 */
export function sendMessage(data: SendMessageRequest) {
  return request.post<{
    data: {
      message: Message
      conversation_id: string
    }
  }>('/chat/messages', data)
}

/**
 * 流式发送消息（使用 Server-Sent Events）
 * 优先使用 /messages/stream 端点
 */
export function streamSendMessage(
  data: SendMessageRequest,
  onMessage: (content: string, status?: string) => void,
  onComplete: (message: Message) => void,
  onError?: (error: Error) => void,
  onStatusChange?: (status: string) => void
) {
  const token = localStorage.getItem('token')
  const baseUrl = '/api/chat/messages/stream'

  // 构建 URL 参数
  const params = new URLSearchParams({
    conversation_id: data.conversation_id,
    content: data.content,
    token: token || ''
  })

  const url = `${baseUrl}?${params.toString()}`

  // 创建 EventSource
  const eventSource = new EventSource(url)

  let fullContent = ''
  let currentStatus = ''

  eventSource.onmessage = (event) => {
    try {
      const responseData = JSON.parse(event.data)

      // 处理不同类型的消息
      switch (responseData.type) {
        case 'content':
          // 内容块
          fullContent += responseData.content || ''
          onMessage(fullContent, currentStatus)
          break

        case 'status':
          // 状态更新（如"工具调用中"）
          currentStatus = responseData.status || ''
          if (onStatusChange) {
            onStatusChange(currentStatus)
          }
          onMessage(fullContent, currentStatus)
          break

        case 'tool_start':
          // 工具调用开始
          currentStatus = `工具调用中: ${responseData.tool_name || ''}`
          if (onStatusChange) {
            onStatusChange(currentStatus)
          }
          break

        case 'tool_end':
          // 工具调用结束
          currentStatus = ''
          if (onStatusChange) {
            onStatusChange('')
          }
          break

        case 'end':
          // 流式结束
          eventSource.close()
          const finalMessage: Message = {
            message_id: responseData.message_id || `msg-${Date.now()}`,
            conversation_id: data.conversation_id,
            role: responseData.role || 'assistant',
            content: fullContent,
            created_at: responseData.created_at || new Date().toISOString()
          }
          onComplete(finalMessage)
          break

        case 'error':
          // 错误
          eventSource.close()
          onError?.(new Error(responseData.error || 'Stream error'))
          break
      }
    } catch (error) {
      console.error('Failed to parse SSE data:', error)
      eventSource.close()
      onError?.(new Error('Failed to parse stream data'))
    }
  }

  eventSource.onerror = () => {
    eventSource.close()
    onError?.(new Error('Stream connection error'))
  }

  return eventSource
}

/**
 * 带回退的流式发送
 * 优先使用流式，失败时自动回退到普通发送
 */
export async function streamWithFallback(
  data: SendMessageRequest,
  onChunk?: (content: string, status?: string) => void,
  onStatusChange?: (status: string) => void
): Promise<{ message: Message; usedStream: boolean }> {
  return new Promise((resolve, reject) => {
    let eventSource: EventSource | null = null

    // 尝试流式发送
    try {
      eventSource = streamSendMessage(
        data,
        // onMessage
        (content, status) => {
          if (onChunk) {
            onChunk(content, status)
          }
        },
        // onComplete
        (message) => {
          resolve({ message, usedStream: true })
        },
        // onError
        (error) => {
          console.warn('Stream failed, falling back to normal send:', error)
          // 流式失败，回退到普通发送
          fallbackToNormalSend()
        },
        // onStatusChange
        (status) => {
          if (onStatusChange) {
            onStatusChange(status)
          }
        }
      )
    } catch (error) {
      console.warn('Stream init failed, falling back:', error)
      fallbackToNormalSend()
    }

    // 回退到普通发送
    async function fallbackToNormalSend() {
      try {
        const response = await sendMessage(data)
        const message = response.data?.data?.message
        if (message) {
          resolve({ message, usedStream: false })
        } else {
          reject(new Error('No message in response'))
        }
      } catch (error) {
        reject(error)
      }
    }

    // 超时保护（5秒后回退）
    setTimeout(() => {
      if (eventSource) {
        eventSource.close()
        console.warn('Stream timeout, falling back')
        fallbackToNormalSend()
      }
    }, 5000)
  })
}
