<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'

interface Props {
  show: boolean
  x: number
  y: number
}

interface Emits {
  (e: 'update:show', value: boolean): void
  (e: 'rename'): void
  (e: 'delete'): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const menuRef = ref<HTMLElement>()

function handleRename() {
  emit('rename')
  emit('update:show', false)
}

function handleDelete() {
  emit('delete')
  emit('update:show', false)
}

function closeMenu() {
  emit('update:show', false)
}

// 点击外部关闭
function handleClickOutside(e: MouseEvent) {
  if (menuRef.value && !menuRef.value.contains(e.target as Node)) {
    closeMenu()
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})
</script>

<template>
  <Teleport to="body">
    <div
      v-if="show"
      ref="menuRef"
      class="context-menu"
      :style="{ left: `${x}px`, top: `${y}px` }"
    >
      <div class="context-menu-item" @click="handleRename">
        <span class="menu-icon">✏️</span>
        <span>重命名</span>
      </div>
      <div class="context-menu-item danger" @click="handleDelete">
        <span class="menu-icon">🗑️</span>
        <span>删除</span>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.context-menu {
  position: fixed;
  min-width: 140px;
  background: white;
  border-radius: 10px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  border: 1px solid #e5e7eb;
  z-index: 1001;
  overflow: hidden;
  animation: fadeIn 0.15s ease-out;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: scale(0.95);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

.context-menu-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  font-size: 14px;
  color: #374151;
  cursor: pointer;
  transition: all 0.15s;
}

.context-menu-item:hover {
  background: #f3f4f6;
}

.context-menu-item.danger {
  color: #ef4444;
}

.context-menu-item.danger:hover {
  background: #fef2f2;
}

.menu-icon {
  font-size: 16px;
  width: 20px;
  text-align: center;
}
</style>
