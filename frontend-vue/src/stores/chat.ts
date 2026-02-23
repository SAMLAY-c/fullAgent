/**
 * Chat Store
 */
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Message, Conversation, Bot } from '@/types'
import * as chatApi from '@/api/chat'

export const useChatStore = defineStore('chat', () => {
  // State
  const currentConversation = ref<Conversation | null>(null)
  const currentBot = ref<Bot | null>(null)
  const messages = ref<Message[]>([])
  const loading = ref(false)
  const sending = ref(false)
  const error = ref<string | null>(null)
  const streamingContent = ref('')
  const streamingStatus = ref('') // 工具调用等状态
  const usedStream = ref(true) // 是否使用了流式

  // Getters
  const hasMessages = computed(() => messages.value.length > 0)
  const lastMessage = computed(() => messages.value[messages.value.length - 1] || null)
  const userMessages = computed(() => messages.value.filter((m: Message) => m.role === 'user'))
  const botMessages = computed(() => messages.value.filter((m: Message) => m.role === 'assistant'))
  const isStreaming = computed(() => sending.value && streamingContent.value.length > 0)
  const showTypingIndicator = computed(() => sending.value && streamingContent.value.length === 0)

  // Actions
  async function fetchMessages(conversationId: string) {
    loading.value = true
    error.value = null

    try {
      const response = await chatApi.getMessages(conversationId)
      messages.value = response.data?.data?.messages || []
      return response
    } catch (err: any) {
      error.value = err.message || '获取消息失败'
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * 发送消息（带回退的流式发送）
   */
  async function sendMessage(conversationId: string, content: string) {
    sending.value = true
    error.value = null
    streamingContent.value = ''
    streamingStatus.value = ''
    usedStream.value = false

    try {
      // 添加用户消息到列表
      const userMessage: Message = {
        message_id: `temp-${Date.now()}`,
        conversation_id: conversationId,
        role: 'user',
        content,
        created_at: new Date().toISOString()
      }
      messages.value.push(userMessage)

      // 创建占位的助手消息
      const assistantMessage: Message = {
        message_id: `stream-${Date.now()}`,
        conversation_id: conversationId,
        role: 'assistant',
        content: '',
        created_at: new Date().toISOString()
      }
      messages.value.push(assistantMessage)

      // 使用带回退的流式发送
      const result = await chatApi.streamWithFallback(
        {
          conversation_id: conversationId,
          content
        },
        // onChunk
        (chunk, status) => {
          streamingContent.value = chunk
          if (status) {
            streamingStatus.value = status
          }
          // 实时更新消息内容
          assistantMessage.content = chunk
        },
        // onStatusChange
        (status) => {
          streamingStatus.value = status
        }
      )

      // 更新最终消息
      assistantMessage.message_id = result.message.message_id
      assistantMessage.created_at = result.message.created_at
      assistantMessage.content = result.message.content
      usedStream.value = result.usedStream

      return result
    } catch (err: any) {
      error.value = err.message || '发送消息失败'
      // 移除失败的消息
      const idx = messages.value.findIndex(m => m.message_id.startsWith('stream-'))
      if (idx !== -1) {
        messages.value.splice(idx, 1)
      }
      throw err
    } finally {
      sending.value = false
      streamingContent.value = ''
      streamingStatus.value = ''
    }
  }

  function setCurrentConversation(conversation: Conversation | null) {
    currentConversation.value = conversation
    if (conversation) {
      // 清空消息列表，准备加载新会话的消息
      messages.value = []
    }
  }

  function setCurrentBot(bot: Bot | null) {
    currentBot.value = bot
  }

  function addMessage(message: Message) {
    messages.value.push(message)
  }

  function clearMessages() {
    messages.value = []
  }

  function setError(err: string | null) {
    error.value = err
  }

  return {
    // State
    currentConversation,
    currentBot,
    messages,
    loading,
    sending,
    error,
    streamingContent,
    streamingStatus,
    usedStream,

    // Getters
    hasMessages,
    lastMessage,
    userMessages,
    botMessages,
    isStreaming,
    showTypingIndicator,

    // Actions
    fetchMessages,
    sendMessage,
    setCurrentConversation,
    setCurrentBot,
    addMessage,
    clearMessages,
    setError
  }
})
