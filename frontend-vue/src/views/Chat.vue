<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useChatStore } from '@/stores/chat'
import { useBotStore } from '@/stores/bot'
import { useAuthStore } from '@/stores/auth'
import { useMessage } from 'naive-ui'
import type { BotScene } from '@/types'
import Sidebar from '@/components/Sidebar.vue'
import ChatHeader from '@/components/ChatHeader.vue'
import MessageList from '@/components/MessageList.vue'
import MessageInput from '@/components/MessageInput.vue'
import TypingIndicator from '@/components/TypingIndicator.vue'
import StreamingProgress from '@/components/StreamingProgress.vue'
import type { Conversation } from '@/types'
import * as conversationApi from '@/api/conversation'
import * as botApi from '@/api/bot'

const router = useRouter()
const chatStore = useChatStore()
const botStore = useBotStore()
const authStore = useAuthStore()
const message = useMessage()

const conversations = ref<Conversation[]>([])
const loading = ref(false)
const currentScene = ref<BotScene>('work')
const isInitialized = ref(false)

onMounted(async () => {
  await initializeChat()
})

async function initializeChat() {
  loading.value = true

  try {
    // 加载bot列表
    await botStore.fetchBotsByScene()

    // 设置默认bot和场景
    const workBots = botStore.botsByScene.work
    if (workBots.length > 0) {
      const bot = workBots[0] || null
      botStore.setCurrentBot(bot)
      chatStore.setCurrentBot(bot)
    }

    // 加载会话列表
    const response = await conversationApi.getConversations()
    const convList = response.data?.data?.conversations || []
    conversations.value = convList

    // 如果有会话，选中第一个
    const firstConv = convList[0]
    if (firstConv) {
      await selectConversation(firstConv)
    } else {
      // 如果没有会话，自动创建一个
      await handleCreateConversation()
    }

    isInitialized.value = true
  } catch (error: any) {
    message.error(error.message || '加载聊天失败')
    console.error('Initialize chat error:', error)
  } finally {
    loading.value = false
  }
}

async function selectConversation(conversation: Conversation) {
  try {
    chatStore.setCurrentConversation(conversation)

    // 获取bot信息
    if (conversation.bot_id) {
      const botResponse = await botApi.getBot(conversation.bot_id)
      const bot = botResponse.data?.data?.bot || null
      botStore.setCurrentBot(bot)
      chatStore.setCurrentBot(bot)
    }

    // 加载消息
    await chatStore.fetchMessages(conversation.conversation_id)
  } catch (error: any) {
    message.error(error.message || '加载会话失败')
    console.error('Select conversation error:', error)
  }
}

async function handleSendMessage(content: string) {
  // 确保有当前会话
  if (!chatStore.currentConversation) {
    // 如果没有会话，先创建一个
    if (!botStore.currentBot) {
      message.warning('请先选择一个Bot')
      return
    }
    await handleCreateConversation()

    // 等待会话创建完成后再发送
    if (!chatStore.currentConversation) {
      message.error('创建会话失败')
      return
    }
  }

  try {
    // 使用带回退的流式发送
    await chatStore.sendMessage(chatStore.currentConversation.conversation_id, content)

    // 更新会话列表（更新时间）
    const idx = conversations.value.findIndex(
      (c: Conversation) => c.conversation_id === chatStore.currentConversation?.conversation_id
    )
    if (idx !== -1) {
      conversations.value.splice(idx, 1)
      conversations.value.unshift(chatStore.currentConversation!)
    }
  } catch (error: any) {
    message.error(error.message || '发送消息失败')
    console.error('Send message error:', error)
  }
}

async function handleCreateConversation() {
  if (!botStore.currentBot) {
    message.warning('请先选择一个Bot')
    return
  }

  try {
    const response = await conversationApi.createConversation({
      bot_id: botStore.currentBot.bot_id,
      title: `新对话 ${new Date().toLocaleString()}`
    })

    const newConversation = response.data?.data?.conversation
    if (newConversation) {
      conversations.value.unshift(newConversation)
      await selectConversation(newConversation)
      // 只在手动创建时显示成功消息
      if (isInitialized.value) {
        message.success('创建会话成功')
      }
    }
  } catch (error: any) {
    message.error(error.message || '创建会话失败')
    console.error('Create conversation error:', error)
  }
}

async function handleSceneChange(scene: BotScene) {
  currentScene.value = scene

  // 切换场景时，选择该场景的第一个bot
  const sceneBots = botStore.botsByScene[scene]

  if (sceneBots.length > 0) {
    // 场景下有Bot，选中第一个
    const bot = sceneBots[0] || null
    if (!bot) {
      botStore.setCurrentBot(null)
      chatStore.setCurrentBot(null)
      chatStore.setCurrentConversation(null)
      chatStore.clearMessages()
      return
    }
    botStore.setCurrentBot(bot)
    chatStore.setCurrentBot(bot)

    // 查找该场景的会话（按该Bot）
    const sceneConv = conversations.value.filter(c => c.bot_id === bot.bot_id)
    const firstConv = sceneConv[0]

    if (firstConv) {
      await selectConversation(firstConv)
    } else {
      // 如果该场景没有会话，清空当前状态（准备创建新会话）
      chatStore.setCurrentConversation(null)
      chatStore.clearMessages()
    }
  } else {
    // 场景下没有Bot，清空状态
    botStore.setCurrentBot(null)
    chatStore.setCurrentBot(null)
    chatStore.setCurrentConversation(null)
    chatStore.clearMessages()
    message.info(`"${scene}"场景下暂无Bot，请先在后台添加`)
  }
}

// 重新加载会话列表
async function refreshConversations() {
  const response = await conversationApi.getConversations()
  const convList = response.data?.data?.conversations || []
  conversations.value = convList
}

function handleLogout() {
  authStore.logout()
  router.push('/login')
}

// 监听 currentConversation 变化，自动聚焦输入框
watch(() => chatStore.currentConversation, (newConv) => {
  if (newConv && !loading.value) {
    // 可以在这里添加自动聚焦逻辑
    console.log('Conversation changed:', newConv.title)
  }
})
</script>

<template>
  <div class="chat-page">
    <div class="chat-container">
      <!-- 左侧边栏 -->
      <Sidebar
        :conversations="conversations"
        :bots="botStore.bots"
        :folders="botStore.folders"
        :selected-conversation-id="chatStore.currentConversation?.conversation_id"
        :loading="loading"
        :current-scene="currentScene"
        @select-conversation="selectConversation"
        @create-conversation="handleCreateConversation"
        @scene-change="handleSceneChange"
        @conversation-updated="refreshConversations"
      />

      <!-- 聊天区域 -->
      <div class="chat-area">
        <!-- 空状态：没有选中Bot -->
        <div v-if="!chatStore.currentBot && isInitialized" class="empty-bot-state">
          <div class="empty-icon">🤖</div>
          <div class="empty-title">还没有选择Bot</div>
          <div class="empty-description">请在左侧选择一个场景，开始你的对话</div>
          <div class="empty-hint">试试切换到 工作或 生活场景～</div>
        </div>

        <!-- 正常聊天状态 -->
        <template v-else>
          <ChatHeader
            :bot="chatStore.currentBot"
            :conversation="chatStore.currentConversation"
            :status="chatStore.sending ? '正在输入...' : '在线'"
            @logout="handleLogout"
          />

          <div class="chat-content">
            <!-- 空状态：没有选中会话 -->
            <div v-if="!chatStore.currentConversation && isInitialized" class="empty-conversation-state">
              <div class="empty-icon">{{ chatStore.currentBot?.emoji || chatStore.currentBot?.avatar || '💬' }}</div>
              <div class="empty-title">开始一段新的对话吧</div>
              <div class="empty-description">试试说"你好"，我会认真倾听的 💜</div>
            </div>

            <!-- 消息列表 -->
            <template v-else>
              <MessageList
                :messages="chatStore.messages"
                :loading="chatStore.loading"
              />

              <!-- 流式响应进度 -->
              <StreamingProgress
                v-if="chatStore.isStreaming"
                :content="chatStore.streamingContent"
                :status="chatStore.streamingStatus"
              />

              <!-- 打字指示器 -->
              <TypingIndicator v-if="chatStore.showTypingIndicator" />
            </template>

            <!-- 输入框 - 只在有Bot时可用 -->
            <MessageInput
              v-if="isInitialized && chatStore.currentBot"
              :loading="chatStore.sending"
              :disabled="false"
              placeholder="今天想聊点什么呢？我随时都在 💜"
              @send="handleSendMessage"
            />

            <!-- 加载状态 -->
            <div v-else-if="!isInitialized" class="loading-state">
              <div class="loading-spinner"></div>
              <div class="loading-text">正在初始化...</div>
            </div>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>

<style scoped>
.chat-page {
  height: 100vh;
  overflow: hidden;
  background: #f9fafb;
}

.chat-container {
  display: flex;
  height: 100%;
}

.chat-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.chat-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: white;
}

.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px;
  gap: 16px;
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 3px solid #e5e7eb;
  border-top-color: #f5576c;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.loading-text {
  font-size: 14px;
  color: #9ca3af;
}

/* 空状态样式 */
.empty-bot-state,
.empty-conversation-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  padding: 40px;
  text-align: center;
}

.empty-icon {
  font-size: 64px;
  margin-bottom: 16px;
  opacity: 0.6;
}

.empty-title {
  font-size: 18px;
  font-weight: 600;
  color: #1f2937;
  margin-bottom: 8px;
}

.empty-description {
  font-size: 14px;
  color: #6b7280;
  margin-bottom: 4px;
}

.empty-hint {
  font-size: 13px;
  color: #9ca3af;
  margin-top: 8px;
}

@media (max-width: 768px) {
  .chat-container {
    flex-direction: column;
  }

  .chat-area {
    width: 100%;
  }
}
</style>
