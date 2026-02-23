<script setup lang="ts">
import { ref, computed } from 'vue'

interface Props {
  loading?: boolean
  disabled?: boolean
  placeholder?: string
}

interface Emits {
  (e: 'send', content: string): void
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
  disabled: false,
  placeholder: '今天想聊点什么呢？我随时都在 💜'
})

const emit = defineEmits<Emits>()

const input = ref('')
const textareaRef = ref<HTMLTextAreaElement>()

const canSend = computed(() => {
  return input.value.trim().length > 0 && !props.loading && !props.disabled
})

function handleSend() {
  if (!canSend.value) return

  emit('send', input.value.trim())
  input.value = ''

  // 重置高度
  if (textareaRef.value) {
    textareaRef.value.style.height = 'auto'
  }
}

function handleKeyDown(e: KeyboardEvent) {
  // Enter 发送，Shift+Enter 换行
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    handleSend()
  }
}

function handleInput(e: Event) {
  const target = e.target as HTMLTextAreaElement

  // 自动调整高度
  target.style.height = 'auto'
  const newHeight = Math.min(target.scrollHeight, 200)
  target.style.height = `${newHeight}px`
}

function focus() {
  textareaRef.value?.focus()
}

defineExpose({
  focus
})
</script>

<template>
  <div class="message-input">
    <!-- 工具栏 -->
    <div class="input-toolbar">
      <button class="tool-btn" type="button" title="上传文件">
        📎 上传
      </button>
      <button class="tool-btn" type="button" title="录音">
        🎙️ 录音
      </button>
      <button class="tool-btn" type="button" title="注入记忆">
        🧠 注入记忆
      </button>
      <button class="tool-btn" type="button" title="更多">
        ···
      </button>
    </div>

    <!-- 输入区域 -->
    <div class="input-wrapper">
      <textarea
        ref="textareaRef"
        v-model="input"
        class="input-textarea"
        :placeholder="placeholder"
        :disabled="disabled || loading"
        rows="1"
        @keydown="handleKeyDown"
        @input="handleInput"
      ></textarea>
      <button
        class="send-btn"
        :disabled="!canSend"
        @click="handleSend"
      >
        {{ loading ? '发送中...' : '发送 ✨' }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.message-input {
  border-top: 1px solid #e5e7eb;
  padding: 16px;
  background: white;
}

.input-toolbar {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
  flex-wrap: wrap;
}

.tool-btn {
  padding: 6px 12px;
  font-size: 13px;
  color: #6b7280;
  background: transparent;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
}

.tool-btn:hover {
  background: #f9fafb;
  border-color: #d1d5db;
  color: #374151;
}

.input-wrapper {
  display: flex;
  gap: 12px;
  align-items: flex-end;
}

.input-textarea {
  flex: 1;
  min-height: 44px;
  max-height: 200px;
  padding: 12px 16px;
  font-size: 15px;
  line-height: 1.5;
  color: #1f2937;
  background: #f9fafb;
  border: 2px solid transparent;
  border-radius: 12px;
  resize: none;
  outline: none;
  transition: all 0.2s;
  font-family: inherit;
}

.input-textarea:hover {
  background: #f3f4f6;
}

.input-textarea:focus {
  background: white;
  border-color: #f093fb;
  box-shadow: 0 0 0 3px rgba(240, 147, 251, 0.1);
}

.input-textarea::placeholder {
  color: #9ca3af;
}

.input-textarea:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.send-btn {
  height: 44px;
  padding: 0 24px;
  font-size: 15px;
  font-weight: 600;
  color: white;
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
  border: none;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
}

.send-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(245, 87, 108, 0.3);
}

.send-btn:active:not(:disabled) {
  transform: translateY(0);
}

.send-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
