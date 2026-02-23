<script setup lang="ts">
import { computed } from 'vue'
import type { Message } from '@/types'
import { marked } from 'marked'

interface Props {
  message: Message
  showAvatar?: boolean
  showTime?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  showAvatar: true,
  showTime: true
})

const isBot = computed(() => props.message.role === 'assistant')

const avatarEmoji = computed(() => {
  return isBot.value ? '🤖' : '👤'
})

const formattedTime = computed(() => {
  const date = new Date(props.message.created_at)
  return date.toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit'
  })
})

const renderedContent = computed(() => {
  if (!props.message.content) return ''
  try {
    return marked.parse(props.message.content)
  } catch (error) {
    console.error('Markdown render error:', error)
    return props.message.content
  }
})

// 消息操作
function copyMessage() {
  navigator.clipboard.writeText(props.message.content)
}

function deleteMessage() {
  // TODO: 实现删除消息逻辑
  console.log('Delete message:', props.message.message_id)
}

function regenerateMessage() {
  // TODO: 实现重新生成消息逻辑
  console.log('Regenerate message:', props.message.message_id)
}
</script>

<template>
  <div :class="['message-item', isBot ? 'bot' : 'user']">
    <!-- 头像 -->
    <div v-if="showAvatar" class="message-avatar">
      {{ avatarEmoji }}
    </div>

    <!-- 消息内容 -->
    <div class="message-wrapper">
      <div class="message-content">
        <div
          class="markdown-body"
          v-html="renderedContent"
        ></div>
      </div>

      <!-- 时间戳 -->
      <div v-if="showTime" class="message-time">
        {{ formattedTime }}
      </div>

      <!-- 操作按钮（hover 显示） -->
      <div class="message-actions">
        <button
          class="action-btn"
          title="复制"
          @click="copyMessage"
        >
          📋
        </button>
        <button
          v-if="isBot"
          class="action-btn"
          title="重新生成"
          @click="regenerateMessage"
        >
          🔄
        </button>
        <button
          class="action-btn"
          title="删除"
          @click="deleteMessage"
        >
          🗑️
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.message-item {
  display: flex;
  gap: 12px;
  animation: messageSlideIn 0.3s ease-out;
  margin-bottom: 4px;
  group: message;
}

@keyframes messageSlideIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.message-item.user {
  flex-direction: row-reverse;
}

.message-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  flex-shrink: 0;
  background: linear-gradient(135deg, #f5f7fa 0%, #e8ecf1 100%);
}

.message-item.bot .message-avatar {
  background: linear-gradient(135deg, #ffeaa7 0%, #fdcb6e 100%);
}

.message-item.user .message-avatar {
  background: linear-gradient(135deg, #a8e6cf 0%, #55efc4 100%);
}

.message-wrapper {
  flex: 1;
  max-width: 70%;
  position: relative;
}

.message-item.user .message-wrapper {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
}

.message-content {
  padding: 12px 16px;
  border-radius: 12px;
  background: white;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  word-wrap: break-word;
  line-height: 1.6;
  position: relative;
}

.message-item.bot .message-content {
  background: white;
  border-top-left-radius: 4px;
}

.message-item.user .message-content {
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
  color: white;
  border-top-right-radius: 4px;
}

/* Markdown 样式 */
.message-content :deep(.markdown-body) {
  margin: 0;
}

.message-content :deep(p) {
  margin: 0 0 8px 0;
}

.message-content :deep(p:last-child) {
  margin-bottom: 0;
}

.message-content :deep(h1),
.message-content :deep(h2),
.message-content :deep(h3) {
  margin: 12px 0 8px 0;
  font-weight: 600;
}

.message-content :deep(h1) { font-size: 1.5em; }
.message-content :deep(h2) { font-size: 1.3em; }
.message-content :deep(h3) { font-size: 1.1em; }

.message-content :deep(ul),
.message-content :deep(ol) {
  margin: 8px 0;
  padding-left: 20px;
}

.message-content :deep(li) {
  margin: 4px 0;
}

.message-content :deep(code) {
  background: rgba(0, 0, 0, 0.05);
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 0.9em;
  font-family: 'Consolas', 'Monaco', monospace;
}

.message-item.user .message-content :deep(code) {
  background: rgba(255, 255, 255, 0.2);
}

.message-content :deep(pre) {
  background: rgba(0, 0, 0, 0.05);
  padding: 12px;
  border-radius: 8px;
  overflow-x: auto;
  margin: 8px 0;
}

.message-item.user .message-content :deep(pre) {
  background: rgba(255, 255, 255, 0.15);
}

.message-content :deep(pre code) {
  background: transparent;
  padding: 0;
}

.message-content :deep(blockquote) {
  border-left: 4px solid #ddd;
  padding-left: 12px;
  margin: 8px 0;
  color: #666;
  font-style: italic;
}

.message-content :deep(a) {
  color: inherit;
  text-decoration: underline;
}

.message-content :deep(img) {
  max-width: 100%;
  border-radius: 8px;
  margin: 8px 0;
}

.message-content :deep(table) {
  border-collapse: collapse;
  width: 100%;
  margin: 8px 0;
}

.message-content :deep(th),
.message-content :deep(td) {
  border: 1px solid rgba(0, 0, 0, 0.1);
  padding: 8px 12px;
  text-align: left;
}

.message-content :deep(th) {
  background: rgba(0, 0, 0, 0.05);
  font-weight: 600;
}

.message-time {
  font-size: 12px;
  color: #9ca3af;
  margin-top: 4px;
  opacity: 0;
  transition: opacity 0.2s;
}

.message-item:hover .message-time {
  opacity: 1;
}

.message-item.user .message-time {
  text-align: right;
}

/* 操作按钮 */
.message-actions {
  display: flex;
  gap: 4px;
  margin-top: 4px;
  opacity: 0;
  transition: opacity 0.2s;
}

.message-item:hover .message-actions {
  opacity: 1;
}

.action-btn {
  padding: 4px 8px;
  font-size: 12px;
  background: transparent;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;
  opacity: 0.6;
}

.action-btn:hover {
  opacity: 1;
  background: rgba(0, 0, 0, 0.05);
}

.message-item.user .message-actions {
  justify-content: flex-end;
}

@media (max-width: 640px) {
  .message-wrapper {
    max-width: 85%;
  }

  .message-avatar {
    width: 32px;
    height: 32px;
    font-size: 16px;
  }

  .message-content {
    padding: 10px 14px;
  }

  .message-actions {
    opacity: 1; /* 移动端始终显示 */
  }
}
</style>
