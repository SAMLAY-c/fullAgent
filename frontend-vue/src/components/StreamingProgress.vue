<script setup lang="ts">
/**
 * 流式响应进度组件
 * 显示正在流式传输的消息内容和状态
 */
import { computed } from 'vue'

interface Props {
  content: string
  status?: string // 工具调用状态，如"工具调用中: search"
  show?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  show: true,
  status: ''
})

const hasStatus = computed(() => Boolean(props.status))
const displayStatus = computed(() => props.status || '正在输入...')
</script>

<template>
  <transition name="fade">
    <div v-if="show && content" class="streaming-progress">
      <div class="streaming-avatar">🤖</div>
      <div class="streaming-content">
        <div class="streaming-text">
          <div v-if="hasStatus" class="status-badge">
            <span class="status-icon">⚙️</span>
            <span class="status-text">{{ status }}</span>
          </div>
          <div class="content-text">{{ content }}</div>
          <span class="cursor">|</span>
        </div>
        <div class="streaming-meta">
          <span class="streaming-status">{{ displayStatus }}</span>
          <span class="streaming-length">{{ content.length }} 字符</span>
        </div>
      </div>
    </div>
  </transition>
</template>

<style scoped>
.streaming-progress {
  display: flex;
  gap: 12px;
  padding: 12px 20px;
  animation: slideIn 0.3s ease-out;
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.streaming-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  background: linear-gradient(135deg, #ffeaa7 0%, #fdcb6e 100%);
  flex-shrink: 0;
  animation: pulse 2s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.05);
  }
}

.streaming-content {
  flex: 1;
  max-width: 70%;
}

.streaming-text {
  padding: 12px 16px;
  background: linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%);
  border: 2px solid #fcd34d;
  border-radius: 12px;
  border-top-left-radius: 4px;
  word-wrap: break-word;
  white-space: pre-wrap;
  line-height: 1.6;
  position: relative;
}

.status-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  background: linear-gradient(135deg, #e0e7ff 0%, #c7d2fe 100%);
  border-radius: 12px;
  margin-bottom: 8px;
  font-size: 12px;
  font-weight: 500;
  color: #4338ca;
  animation: statusPulse 1.5s ease-in-out infinite;
}

@keyframes statusPulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.8;
  }
}

.status-icon {
  font-size: 14px;
  animation: spin 2s linear infinite;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.content-text {
  display: inline;
}

.cursor {
  display: inline-block;
  animation: blink 1s step-end infinite;
  color: #f59e0b;
  font-weight: bold;
  margin-left: 2px;
}

@keyframes blink {
  0%, 50% {
    opacity: 1;
  }
  51%, 100% {
    opacity: 0;
  }
}

.streaming-meta {
  display: flex;
  gap: 12px;
  margin-top: 8px;
  font-size: 12px;
  color: #9ca3af;
}

.streaming-status {
  display: flex;
  align-items: center;
  gap: 4px;
}

.streaming-status::before {
  content: '';
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #10b981;
  animation: statusPulse 1.5s ease-in-out infinite;
}

@keyframes statusPulse {
  0%, 100% {
    opacity: 1;
    transform: scale(1);
  }
  50% {
    opacity: 0.5;
    transform: scale(1.2);
  }
}

.streaming-length {
  opacity: 0.7;
}

/* 淡入淡出动画 */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease, transform 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: translateY(10px);
}
</style>
