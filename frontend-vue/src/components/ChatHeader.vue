<script setup lang="ts">
import type { Bot, Conversation } from '@/types'

interface Props {
  bot?: Bot | null
  conversation?: Conversation | null
  status?: string
}

withDefaults(defineProps<Props>(), {
  bot: null,
  conversation: null,
  status: '在线'
})

const emit = defineEmits<{
  (e: 'logout'): void
}>()
</script>

<template>
  <div class="chat-header">
    <div class="chat-info">
      <div class="chat-avatar">{{ bot?.emoji || bot?.avatar || '🤖' }}</div>
      <div class="chat-details">
        <h2 class="chat-name">
          {{ conversation?.title || bot?.name || '加载中...' }}
        </h2>
        <p class="chat-status">{{ status }}</p>
      </div>
    </div>
    <div class="chat-actions">
      <button class="action-btn primary">⏰ 提醒</button>
      <button class="action-btn">📋</button>
      <button class="action-btn">⚙️</button>
    </div>
  </div>
</template>

<style scoped>
.chat-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  background: white;
  border-bottom: 1px solid #e5e7eb;
}

.chat-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.chat-avatar {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  background: linear-gradient(135deg, #ffeaa7 0%, #fdcb6e 100%);
  flex-shrink: 0;
}

.chat-details {
  flex: 1;
  min-width: 0;
}

.chat-name {
  font-size: 18px;
  font-weight: 600;
  color: #1f2937;
  margin: 0 0 4px 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.chat-status {
  font-size: 13px;
  color: #9ca3af;
  margin: 0;
}

.chat-actions {
  display: flex;
  gap: 8px;
}

.action-btn {
  height: 36px;
  padding: 0 12px;
  font-size: 14px;
  color: #6b7280;
  background: transparent;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
}

.action-btn:hover {
  background: #f9fafb;
  border-color: #d1d5db;
  color: #374151;
}

.action-btn.primary {
  color: #f5576c;
  border-color: #f9a8d4;
  background: linear-gradient(135deg, #fdf2f8 0%, #fce7f3 100%);
}

.action-btn.primary:hover {
  background: linear-gradient(135deg, #fce7f3 0%, #fbcfe8 100%);
}

@media (max-width: 640px) {
  .chat-header {
    padding: 12px 16px;
  }

  .chat-avatar {
    width: 40px;
    height: 40px;
    font-size: 20px;
  }

  .chat-name {
    font-size: 16px;
  }

  .chat-actions {
    gap: 4px;
  }

  .action-btn {
    padding: 0 8px;
    font-size: 13px;
  }
}
</style>
