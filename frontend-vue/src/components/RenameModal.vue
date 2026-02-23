<script setup lang="ts">
import { ref, watch } from 'vue'

interface Props {
  show: boolean
  title: string
  loading?: boolean
}

interface Emits {
  (e: 'update:show', value: boolean): void
  (e: 'confirm', newTitle: string): void
}

const props = withDefaults(defineProps<Props>(), {
  loading: false
})

const emit = defineEmits<Emits>()

const localTitle = ref(props.title)
const inputRef = ref<HTMLInputElement>()

// 监听 show 变化，自动聚焦
watch(() => props.show, (newVal) => {
  if (newVal) {
    localTitle.value = props.title
    // 延迟聚焦，等待 DOM 更新
    setTimeout(() => {
      inputRef.value?.focus()
      inputRef.value?.select()
    }, 100)
  }
})

function handleConfirm() {
  const trimmed = localTitle.value.trim()
  if (!trimmed) {
    return
  }
  emit('confirm', trimmed)
}

function handleCancel() {
  emit('update:show', false)
}

function handleKeyDown(e: KeyboardEvent) {
  if (e.key === 'Enter') {
    e.preventDefault()
    handleConfirm()
  } else if (e.key === 'Escape') {
    e.preventDefault()
    handleCancel()
  }
}
</script>

<template>
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="show" class="modal-mask" @click.self="handleCancel">
        <div class="modal-card" role="dialog" @click.stop>
          <div class="modal-header">
            <div class="modal-title">重命名话题</div>
            <button class="modal-close" @click="handleCancel" aria-label="关闭">✕</button>
          </div>

          <div class="modal-body">
            <div class="form-row">
              <label class="form-label" for="topic-title-input">话题名称</label>
              <input
                id="topic-title-input"
                ref="inputRef"
                v-model="localTitle"
                class="form-input"
                type="text"
                maxlength="50"
                placeholder="请输入话题名称"
                :disabled="loading"
                @keydown="handleKeyDown"
              />
              <div class="form-hint">最多 50 个字符</div>
            </div>
          </div>

          <div class="modal-footer">
            <button class="modal-btn secondary" :disabled="loading" @click="handleCancel">
              取消
            </button>
            <button class="modal-btn primary" :disabled="loading || !localTitle.trim()" @click="handleConfirm">
              {{ loading ? '保存中...' : '确定' }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.modal-mask {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
}

.modal-card {
  width: 100%;
  max-width: 440px;
  background: white;
  border-radius: 16px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  overflow: hidden;
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px;
  border-bottom: 1px solid #e5e7eb;
}

.modal-title {
  font-size: 18px;
  font-weight: 600;
  color: #1f2937;
}

.modal-close {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  color: #9ca3af;
  background: transparent;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
}

.modal-close:hover {
  background: #f3f4f6;
  color: #6b7280;
}

.modal-body {
  padding: 24px;
}

.form-row {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.form-label {
  font-size: 14px;
  font-weight: 500;
  color: #374151;
}

.form-input {
  padding: 10px 12px;
  font-size: 15px;
  color: #1f2937;
  background: white;
  border: 2px solid #e5e7eb;
  border-radius: 10px;
  outline: none;
  transition: all 0.2s;
}

.form-input:hover {
  border-color: #d1d5db;
}

.form-input:focus {
  border-color: #f093fb;
  box-shadow: 0 0 0 3px rgba(240, 147, 251, 0.1);
}

.form-input:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.form-hint {
  font-size: 12px;
  color: #9ca3af;
}

.modal-footer {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
  padding: 16px 24px;
  background: #f9fafb;
  border-top: 1px solid #e5e7eb;
}

.modal-btn {
  padding: 8px 20px;
  font-size: 14px;
  font-weight: 500;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s;
}

.modal-btn.secondary {
  color: #6b7280;
  background: white;
  border: 1px solid #e5e7eb;
}

.modal-btn.secondary:hover:not(:disabled) {
  background: #f9fafb;
  border-color: #d1d5db;
}

.modal-btn.primary {
  color: white;
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
  border: none;
}

.modal-btn.primary:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(245, 87, 108, 0.3);
}

.modal-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Modal 动画 */
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.3s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-active .modal-card,
.modal-leave-active .modal-card {
  transition: transform 0.3s ease;
}

.modal-enter-from .modal-card,
.modal-leave-to .modal-card {
  transform: scale(0.9);
}
</style>
