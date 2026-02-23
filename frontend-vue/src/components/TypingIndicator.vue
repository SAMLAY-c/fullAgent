<script setup lang="ts">
/**
 * 打字动画指示器组件
 * 用于显示 Bot 正在输入/回复的状态
 */
import { ref } from 'vue'

const dots = ref([
  { id: 1, delay: '0s' },
  { id: 2, delay: '0.2s' },
  { id: 3, delay: '0.4s' }
])
</script>

<template>
  <div class="typing-indicator">
    <div class="typing-avatar">🤖</div>
    <div class="typing-bubble">
      <div class="typing-dots">
        <span
          v-for="dot in dots"
          :key="dot.id"
          class="typing-dot"
          :style="{ animationDelay: dot.delay }"
        ></span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.typing-indicator {
  display: flex;
  gap: 12px;
  padding: 12px 20px;
  animation: fadeIn 0.3s ease-out;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.typing-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  background: linear-gradient(135deg, #ffeaa7 0%, #fdcb6e 100%);
  flex-shrink: 0;
  animation: bounce 1s ease-in-out infinite;
}

@keyframes bounce {
  0%, 100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-3px);
  }
}

.typing-bubble {
  max-width: 70%;
  padding: 12px 16px;
  background: white;
  border-radius: 12px;
  border-top-left-radius: 4px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.typing-dots {
  display: flex;
  gap: 6px;
  align-items: center;
}

.typing-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #d1d5db;
  animation: typing 1.4s ease-in-out infinite;
}

@keyframes typing {
  0%, 60%, 100% {
    transform: translateY(0);
    opacity: 0.4;
  }
  30% {
    transform: translateY(-8px);
    opacity: 1;
  }
}
</style>
