<script setup lang="ts">
import { ref, watch, nextTick } from 'vue'
import MessageItem from './MessageItem.vue'
import type { Message } from '@/types'

interface Props {
  messages: Message[]
  loading?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  loading: false
})

const messagesContainer = ref<HTMLElement>()

// 自动滚动到底部
watch(() => props.messages, async () => {
  await nextTick()
  scrollToBottom()
}, { deep: true })

function scrollToBottom() {
  if (messagesContainer.value) {
    messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
  }
}
</script>

<template>
  <div class="message-list" ref="messagesContainer">
    <!-- 加载骨架屏 -->
    <div v-if="loading" class="skeleton-container">
      <div v-for="i in 2" :key="i" class="message-skeleton">
        <div class="message-avatar skeleton"></div>
        <div class="message-wrapper">
          <div class="message-content-skeleton">
            <div class="skeleton-line w1"></div>
            <div class="skeleton-line w2"></div>
            <div class="skeleton-line w3"></div>
          </div>
        </div>
      </div>
    </div>

    <!-- 消息列表 -->
    <template v-else>
      <MessageItem
        v-for="message in messages"
        :key="message.message_id"
        :message="message"
      />

      <!-- 空状态 -->
      <div v-if="messages.length === 0" class="empty-state">
        <div class="empty-icon">💬</div>
        <div class="empty-text">开始一段新的对话吧</div>
        <div class="empty-hint">试试说"你好"～</div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.message-list {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
  display: flex;
  flex-direction: column;
}

/* 自定义滚动条 */
.message-list::-webkit-scrollbar {
  width: 6px;
}

.message-list::-webkit-scrollbar-track {
  background: transparent;
}

.message-list::-webkit-scrollbar-thumb {
  background: #d1d5db;
  border-radius: 3px;
}

.message-list::-webkit-scrollbar-thumb:hover {
  background: #9ca3af;
}

/* 骨架屏 */
.skeleton-container {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 20px;
}

.message-skeleton {
  display: flex;
  gap: 12px;
}

.message-avatar.skeleton {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
}

@keyframes shimmer {
  0% {
    background-position: -200% 0;
  }
  100% {
    background-position: 200% 0;
  }
}

.message-content-skeleton {
  flex: 1;
  max-width: 70%;
  padding: 12px 16px;
  border-radius: 12px;
  background: white;
}

.skeleton-line {
  height: 12px;
  background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
  border-radius: 6px;
  margin-bottom: 8px;
}

.skeleton-line:last-child {
  margin-bottom: 0;
}

.skeleton-line.w1 {
  width: 60%;
}

.skeleton-line.w2 {
  width: 80%;
}

.skeleton-line.w3 {
  width: 40%;
}

/* 空状态 */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: #9ca3af;
  padding: 40px 20px;
}

.empty-icon {
  font-size: 64px;
  margin-bottom: 16px;
  opacity: 0.5;
  animation: float 3s ease-in-out infinite;
}

@keyframes float {
  0%, 100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-10px);
  }
}

.empty-text {
  font-size: 16px;
  font-weight: 500;
  margin-bottom: 8px;
}

.empty-hint {
  font-size: 14px;
  opacity: 0.7;
}
</style>
