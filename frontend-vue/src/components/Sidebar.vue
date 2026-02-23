<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useDialog, useMessage } from 'naive-ui'
import type { Conversation, Bot, Folder } from '@/types'
import type { BotScene } from '@/types'
import { scenes, getSceneIcon } from '@/config/scenes'
import ContextMenu from './ContextMenu.vue'
import RenameModal from './RenameModal.vue'
import * as conversationApi from '@/api/conversation'

interface Props {
  conversations?: Conversation[]
  bots?: Bot[]
  folders?: Folder[]
  selectedConversationId?: string | null
  loading?: boolean
  currentScene?: BotScene
}

const props = withDefaults(defineProps<Props>(), {
  conversations: () => [],
  bots: () => [],
  folders: () => [],
  selectedConversationId: null,
  loading: false,
  currentScene: 'work'
})

const emit = defineEmits<{
  (e: 'selectConversation', conversation: Conversation): void
  (e: 'createConversation'): void
  (e: 'sceneChange', scene: BotScene): void
  (e: 'conversationUpdated'): void
}>()

const router = useRouter()
const authStore = useAuthStore()
const dialog = useDialog()
const message = useMessage()

const currentTab = ref<'single' | 'group'>('single')
const selectedFolderId = ref<string>('all')
const localCurrentScene = ref<BotScene>(props.currentScene)

// 右键菜单状态
const contextMenu = ref<{
  show: boolean
  x: number
  y: number
  conversation: Conversation | null
}>({
  show: false,
  x: 0,
  y: 0,
  conversation: null
})

// 重命名模态框状态
const renameModal = ref<{
  show: boolean
  conversation: Conversation | null
  loading: boolean
}>({
  show: false,
  conversation: null,
  loading: false
})

// 根据场景过滤 Bot
const sceneBots = computed(() => {
  return props.bots.filter(bot => bot.scene === localCurrentScene.value)
})

// 根据场景和 folder 过滤会话
const filteredConversations = computed(() => {
  let filtered = props.conversations

  // 按场景过滤
  const sceneBotIds = new Set(sceneBots.value.map(b => b.bot_id))
  filtered = filtered.filter(c => sceneBotIds.has(c.bot_id))

  // 按 folder 过滤
  if (selectedFolderId.value !== 'all') {
    filtered = filtered.filter(c => c.folder_id === selectedFolderId.value)
  }

  return filtered
})

const folderChips = computed(() => {
  const sceneConv = props.conversations.filter(c => {
    const sceneBotIds = new Set(sceneBots.value.map(b => b.bot_id))
    return sceneBotIds.has(c.bot_id)
  })

  const chips = [
    { id: 'all', name: '全部', count: sceneConv.length }
  ]

  props.folders.forEach(folder => {
    const count = sceneConv.filter(c => c.folder_id === folder.folder_id).length
    chips.push({
      id: folder.folder_id,
      name: folder.name,
      count
    })
  })

  return chips
})

function handleTabChange(tab: 'single' | 'group') {
  currentTab.value = tab
}

function handleSceneChange(scene: BotScene) {
  localCurrentScene.value = scene
  selectedFolderId.value = 'all'
  emit('sceneChange', scene)
}

function handleFolderChange(folderId: string) {
  selectedFolderId.value = folderId
}

function handleSelectConversation(conversation: Conversation) {
  emit('selectConversation', conversation)
}

function handleCreateConversation() {
  emit('createConversation')
}

function handleLogout() {
  authStore.logout()
  router.push('/login')
}

// 话题管理功能
function handleContextMenu(event: MouseEvent, conversation: Conversation) {
  event.preventDefault()
  contextMenu.value = {
    show: true,
    x: event.clientX,
    y: event.clientY,
    conversation
  }
}

function handleDoubleClickRename(conversation: Conversation) {
  renameModal.value = {
    show: true,
    conversation,
    loading: false
  }
}

async function handleConfirmRename(newTitle: string) {
  if (!renameModal.value.conversation) {
    renameModal.value.show = false
    return
  }

  renameModal.value.loading = true

  try {
    await conversationApi.renameConversation(
      renameModal.value.conversation.conversation_id,
      newTitle
    )

    message.success('重命名成功')
    emit('conversationUpdated')
    renameModal.value.show = false
  } catch (error: any) {
    message.error(error.message || '重命名失败')
  } finally {
    renameModal.value.loading = false
  }
}

function handleContextMenuRename() {
  const conv = contextMenu.value.conversation
  if (conv) {
    contextMenu.value.show = false
    handleDoubleClickRename(conv)
  }
}

function handleContextMenuDelete() {
  const conv = contextMenu.value.conversation
  if (!conv) return

  contextMenu.value.show = false

  dialog.warning({
    title: '删除话题',
    content: `确定要删除话题「${conv.title}」吗？删除后可从回收站恢复。`,
    positiveText: '删除',
    negativeText: '取消',
    onPositiveClick: async () => {
      try {
        await conversationApi.archiveConversation(conv.conversation_id)
        message.success('话题已删除')
        emit('conversationUpdated')
      } catch (error: any) {
        message.error(error.message || '删除失败')
      }
    }
  })
}
</script>

<template>
  <div class="sidebar">
    <!-- 头部 -->
    <div class="sidebar-header">
      <div class="logo">Bot Agent</div>
      <div class="subtitle">你的AI伙伴，随时陪聊</div>
      <button class="logout-btn" title="登出" @click="handleLogout">➔</button>
    </div>

    <!-- 场景切换器 -->
    <div class="scene-switcher">
      <button
        v-for="scene in scenes"
        :key="scene.id"
        :class="['scene-btn', { active: localCurrentScene === scene.id }]"
        :style="{ '--scene-gradient': scene.gradient }"
        @click="handleSceneChange(scene.id)"
      >
        <span class="scene-icon">{{ scene.icon }}</span>
        <span class="scene-info">
          <span class="scene-name">{{ scene.name }}</span>
          <span class="scene-desc">{{ scene.description }}</span>
        </span>
      </button>
    </div>

    <!-- Tab切换 -->
    <div class="tab-switcher">
      <button
        :class="['tab-btn', { active: currentTab === 'single' }]"
        @click="handleTabChange('single')"
      >
        单Bot
      </button>
      <button
        :class="['tab-btn', { active: currentTab === 'group' }]"
        @click="handleTabChange('group')"
      >
        群聊
      </button>
    </div>

    <!-- 单Bot列表 -->
    <div v-if="currentTab === 'single'" class="list-container">
      <!-- 场景信息 -->
      <div class="scene-info-bar">
        <span class="scene-info-icon">{{ getSceneIcon(localCurrentScene) }}</span>
        <span class="scene-info-text">
          {{ scenes.find(s => s.id === localCurrentScene)?.name }}场景
        </span>
        <span class="scene-info-count">{{ sceneBots.length }} 个Bot</span>
      </div>

      <!-- Folder分类 -->
      <div class="folder-chip-section">
        <div class="folder-chip-divider"></div>
        <div class="folder-chip-row">
          <button
            v-for="chip in folderChips"
            :key="chip.id"
            :class="['folder-chip', { active: selectedFolderId === chip.id }]"
            @click="handleFolderChange(chip.id)"
          >
            {{ chip.name }} {{ chip.count }}
          </button>
          <button class="folder-chip add">+</button>
        </div>
      </div>

      <!-- 话题列表 -->
      <div class="topic-list-section">
        <div class="topic-list-header">
          <div class="topic-list-title">对话列表</div>
        </div>
        <div class="topic-list-divider"></div>

        <!-- 加载状态 -->
        <div v-if="loading" class="topic-skeleton-list">
          <div v-for="i in 3" :key="i" class="topic-skeleton-row">
            <div class="topic-skeleton-dot skeleton"></div>
            <div class="topic-skeleton-line title skeleton"></div>
          </div>
        </div>

        <!-- 话题列表 -->
        <div v-else class="conversation-list">
          <div
            v-for="conversation in filteredConversations"
            :key="conversation.conversation_id"
            :class="['conversation-item', { active: conversation.conversation_id === selectedConversationId }]"
            @click="handleSelectConversation(conversation)"
            @dblclick="handleDoubleClickRename(conversation)"
            @contextmenu.prevent="handleContextMenu($event, conversation)"
          >
            <div class="conversation-avatar">
              {{ conversation.bot?.emoji || conversation.bot?.avatar || getSceneIcon(localCurrentScene) }}
            </div>
            <div class="conversation-info">
              <div class="conversation-title" title="双击重命名">
                {{ conversation.title }}
              </div>
              <div class="conversation-meta">
                {{ conversation.message_count || 0 }} 条消息
              </div>
            </div>
          </div>

          <!-- 空状态 -->
          <div v-if="filteredConversations.length === 0" class="empty-conversations">
            <div class="empty-icon">💬</div>
            <div class="empty-text">暂无对话</div>
          </div>
        </div>
      </div>
    </div>

    <!-- 群聊列表（占位） -->
    <div v-else class="list-container">
      <div class="empty-groups">
        <div class="empty-icon">👥</div>
        <div class="empty-text">群聊功能开发中</div>
      </div>
    </div>

    <!-- 底部操作 -->
    <div class="sidebar-footer">
      <div class="sidebar-footer-divider"></div>
      <div class="sidebar-footer-actions">
        <button class="sidebar-footer-primary" @click="handleCreateConversation">
          + 新建话题
        </button>
        <button class="sidebar-footer-icon" title="回收站">🗑️</button>
      </div>
    </div>

    <!-- 右键菜单 -->
    <ContextMenu
      v-model:show="contextMenu.show"
      :x="contextMenu.x"
      :y="contextMenu.y"
      @rename="handleContextMenuRename"
      @delete="handleContextMenuDelete"
    />

    <!-- 重命名模态框 -->
    <RenameModal
      v-model:show="renameModal.show"
      :title="renameModal.conversation?.title || ''"
      :loading="renameModal.loading"
      @confirm="handleConfirmRename"
    />
  </div>
</template>

<style scoped>
.sidebar {
  width: 280px;
  background: white;
  border-right: 1px solid #e5e7eb;
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
}

.sidebar-header {
  padding: 20px;
  text-align: center;
  position: relative;
}

.logo {
  font-size: 20px;
  font-weight: 700;
  color: #1f2937;
  margin-bottom: 4px;
}

.subtitle {
  font-size: 12px;
  color: #9ca3af;
}

.logout-btn {
  position: absolute;
  top: 16px;
  right: 16px;
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  color: #9ca3af;
  background: transparent;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
}

.logout-btn:hover {
  background: #f3f4f6;
  color: #6b7280;
}

/* 场景切换器 */
.scene-switcher {
  padding: 12px 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  border-bottom: 1px solid #e5e7eb;
}

.scene-btn {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  background: transparent;
  border: 2px solid transparent;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s;
  text-align: left;
}

.scene-btn:hover {
  background: var(--scene-gradient);
  border-color: rgba(0, 0, 0, 0.1);
  transform: translateY(-1px);
}

.scene-btn.active {
  background: var(--scene-gradient);
  border-color: rgba(0, 0, 0, 0.15);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.scene-icon {
  font-size: 24px;
  line-height: 1;
  flex-shrink: 0;
}

.scene-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.scene-name {
  font-size: 14px;
  font-weight: 600;
  color: #1f2937;
}

.scene-desc {
  font-size: 11px;
  color: #6b7280;
}

.scene-info-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px;
  background: linear-gradient(135deg, #f9fafb 0%, #f3f4f6 100%);
  border-radius: 10px;
  margin-bottom: 12px;
}

.scene-info-icon {
  font-size: 18px;
}

.scene-info-text {
  flex: 1;
  font-size: 13px;
  font-weight: 500;
  color: #374151;
}

.scene-info-count {
  font-size: 12px;
  color: #9ca3af;
}

.tab-switcher {
  display: flex;
  padding: 0 16px;
  margin-bottom: 16px;
  gap: 8px;
}

.tab-btn {
  flex: 1;
  height: 32px;
  font-size: 13px;
  font-weight: 500;
  color: #6b7280;
  background: transparent;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
}

.tab-btn.active {
  color: #f5576c;
  background: linear-gradient(135deg, #fdf2f8 0%, #fce7f3 100%);
  border-color: #f9a8d4;
}

.tab-btn:hover:not(.active) {
  background: #f9fafb;
}

.list-container {
  flex: 1;
  overflow-y: auto;
  padding: 0 16px;
}

.folder-chip-section {
  margin-bottom: 16px;
}

.folder-chip-divider {
  height: 1px;
  background: #e5e7eb;
  margin-bottom: 12px;
}

.folder-chip-row {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.folder-chip {
  height: 28px;
  padding: 0 10px;
  font-size: 12px;
  font-weight: 500;
  color: #6b7280;
  background: transparent;
  border: 1px solid #e5e7eb;
  border-radius: 14px;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
}

.folder-chip:hover {
  background: #f9fafb;
  border-color: #d1d5db;
}

.folder-chip.active {
  color: #f5576c;
  background: linear-gradient(135deg, #fdf2f8 0%, #fce7f3 100%);
  border-color: #f9a8d4;
}

.folder-chip.add {
  width: 28px;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.topic-list-section {
  margin-bottom: 16px;
}

.topic-list-header {
  padding: 8px 0;
}

.topic-list-title {
  font-size: 12px;
  font-weight: 600;
  color: #9ca3af;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.topic-list-divider {
  height: 1px;
  background: #e5e7eb;
  margin-bottom: 8px;
}

.topic-skeleton-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 8px 0;
}

.topic-skeleton-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.topic-skeleton-dot {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  flex-shrink: 0;
}

.topic-skeleton-line {
  height: 12px;
  border-radius: 6px;
}

.topic-skeleton-line.title {
  width: 70%;
}

.skeleton {
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

.conversation-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.conversation-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s;
}

.conversation-item:hover {
  background: #f9fafb;
}

.conversation-item.active {
  background: linear-gradient(135deg, #fdf2f8 0%, #fce7f3 100%);
}

.conversation-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  background: linear-gradient(135deg, #ffeaa7 0%, #fdcb6e 100%);
  flex-shrink: 0;
}

.conversation-info {
  flex: 1;
  min-width: 0;
}

.conversation-title {
  font-size: 14px;
  font-weight: 500;
  color: #1f2937;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.conversation-meta {
  font-size: 12px;
  color: #9ca3af;
  margin-top: 2px;
}

.empty-conversations,
.empty-groups {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  color: #9ca3af;
}

.empty-icon {
  font-size: 48px;
  margin-bottom: 12px;
  opacity: 0.5;
}

.empty-text {
  font-size: 14px;
}

.sidebar-footer {
  padding: 16px;
  border-top: 1px solid #e5e7eb;
}

.sidebar-footer-divider {
  height: 1px;
  background: #e5e7eb;
  margin-bottom: 12px;
}

.sidebar-footer-actions {
  display: flex;
  gap: 8px;
  align-items: center;
}

.sidebar-footer-primary {
  flex: 1;
  height: 36px;
  font-size: 14px;
  font-weight: 500;
  color: white;
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
  border: none;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s;
}

.sidebar-footer-primary:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(245, 87, 108, 0.3);
}

.sidebar-footer-icon {
  width: 36px;
  height: 36px;
  font-size: 16px;
  color: #6b7280;
  background: transparent;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s;
}

.sidebar-footer-icon:hover {
  background: #f9fafb;
  border-color: #d1d5db;
}

@media (max-width: 768px) {
  .sidebar {
    width: 240px;
  }

  .scene-switcher {
    padding: 8px 12px;
  }

  .scene-btn {
    padding: 8px 10px;
  }

  .scene-icon {
    font-size: 20px;
  }

  .scene-name {
    font-size: 13px;
  }

  .scene-desc {
    font-size: 10px;
  }
}
</style>
