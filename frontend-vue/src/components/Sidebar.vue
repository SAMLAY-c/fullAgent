<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useDialog, useMessage } from 'naive-ui'
import type { Bot, BotScene, Conversation, Folder } from '@/types'
import { scenes } from '@/config/scenes'
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

type FolderGroup = {
  id: string
  name: string
  folder: Folder | null
  conversations: Conversation[]
  count: number
  isVirtual?: boolean
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
  (e: 'createConversation', payload?: { folderId?: string }): void
  (e: 'sceneChange', scene: BotScene): void
  (e: 'conversationUpdated'): void
}>()

const router = useRouter()
const authStore = useAuthStore()
const dialog = useDialog()
const message = useMessage()

const currentTab = ref<'single' | 'group'>('single')
const localCurrentScene = ref<BotScene>(props.currentScene)
const searchKeyword = ref('')
const expandedFolderMap = ref<Record<string, boolean>>({})

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

const renameModal = ref<{
  show: boolean
  conversation: Conversation | null
  loading: boolean
}>({
  show: false,
  conversation: null,
  loading: false
})

const sceneSelectOptions = computed(() =>
  scenes.map((scene) => ({
    value: scene.id,
    label: scene.name
  }))
)

const sceneBots = computed(() => props.bots.filter((bot) => bot.scene === localCurrentScene.value))

const sceneBotIds = computed(() => new Set(sceneBots.value.map((bot) => bot.bot_id)))

const sceneConversations = computed(() => {
  let result = props.conversations.filter((c) => sceneBotIds.value.has(c.bot_id))
  const keyword = searchKeyword.value.trim().toLowerCase()
  if (keyword) {
    result = result.filter((c) => String(c.title || '').toLowerCase().includes(keyword))
  }
  return [...result].sort((a, b) => {
    const aTime = new Date(a.updated_at || a.created_at || 0).getTime()
    const bTime = new Date(b.updated_at || b.created_at || 0).getTime()
    return bTime - aTime
  })
})

const visibleFolders = computed(() => {
  return props.folders.filter((folder) => {
    const folderScene = (folder as any).scene as BotScene | undefined
    return !folderScene || folderScene === localCurrentScene.value
  })
})

const folderGroups = computed<FolderGroup[]>(() => {
  const byFolderId = new Map<string, Conversation[]>()
  const ungrouped: Conversation[] = []

  for (const conv of sceneConversations.value) {
    if (conv.folder_id) {
      const list = byFolderId.get(conv.folder_id) || []
      list.push(conv)
      byFolderId.set(conv.folder_id, list)
    } else {
      ungrouped.push(conv)
    }
  }

  const groups: FolderGroup[] = visibleFolders.value.map((folder) => {
    const list = byFolderId.get(folder.folder_id) || []
    return {
      id: folder.folder_id,
      name: folder.name,
      folder,
      conversations: list,
      count: list.length
    }
  })

  if (ungrouped.length > 0) {
    groups.unshift({
      id: '__ungrouped__',
      name: '未分类',
      folder: null,
      conversations: ungrouped,
      count: ungrouped.length,
      isVirtual: true
    })
  }

  return groups
})

const totalSceneConversationCount = computed(() => sceneConversations.value.length)

function isFolderExpanded(folderId: string) {
  return expandedFolderMap.value[folderId] ?? true
}

function toggleFolder(folderId: string) {
  expandedFolderMap.value[folderId] = !isFolderExpanded(folderId)
}

function getFolderBadgeLetter(folder: Folder | null) {
  if (!folder) return '•'
  const iconConfig = (folder as any).icon_config || (folder as any).icon_data
  if (iconConfig?.letter) return String(iconConfig.letter).slice(0, 1)
  return String(folder.name || 'F').slice(0, 1)
}

function getFolderBadgeStyle(folder: Folder | null) {
  const iconConfig = folder ? ((folder as any).icon_config || (folder as any).icon_data) : null
  const bg = iconConfig?.bg || (folder as any)?.color || '#ede9fe'
  const text = iconConfig?.text || '#4c1d95'
  return {
    background: bg,
    color: text
  }
}

function formatConversationMeta(conversation: Conversation, index: number) {
  if (index === 0) return '最近更新'
  const updatedAt = conversation.updated_at || conversation.created_at
  if (!updatedAt) return `${conversation.message_count || 0} 条消息`

  const diffMs = Date.now() - new Date(updatedAt).getTime()
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffDays = Math.floor(diffHours / 24)

  if (Number.isNaN(diffMs)) return `${conversation.message_count || 0} 条消息`
  if (diffHours < 1) return '刚刚'
  if (diffHours < 24) return `${diffHours} 小时前`
  if (diffDays < 7) return `${diffDays} 天前`
  return `${conversation.message_count || 0} 条消息`
}

function handleTabChange(tab: 'single' | 'group') {
  currentTab.value = tab
}

function handleSceneChange(scene: BotScene) {
  localCurrentScene.value = scene
  searchKeyword.value = ''
  emit('sceneChange', scene)
}

function handleSceneSelectChange(event: Event) {
  const value = (event.target as HTMLSelectElement).value as BotScene
  handleSceneChange(value)
}

function handleSelectConversation(conversation: Conversation) {
  emit('selectConversation', conversation)
}

function handleCreateConversation(folderId?: string) {
  emit('createConversation', folderId ? { folderId } : undefined)
}

function handleCreateFolder() {
  message.info('“新建主题文件夹”按钮样式已就位，下一步接入 /api/folders 即可使用。')
}

function handleLogout() {
  authStore.logout()
  router.push('/login')
}

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
    await conversationApi.renameConversation(renameModal.value.conversation.conversation_id, newTitle)
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
  if (!conv) return
  contextMenu.value.show = false
  handleDoubleClickRename(conv)
}

function handleContextMenuDelete() {
  const conv = contextMenu.value.conversation
  if (!conv) return

  contextMenu.value.show = false

  dialog.warning({
    title: '删除对话',
    content: `确认删除“${conv.title}”吗？删除后可在回收站恢复。`,
    positiveText: '删除',
    negativeText: '取消',
    onPositiveClick: async () => {
      try {
        await conversationApi.archiveConversation(conv.conversation_id)
        message.success('对话已删除')
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
    <div class="sidebar-header">
      <div class="logo">Bot Agent →</div>
      <div class="subtitle">你的AI伙伴，随时陪聊</div>
      <button class="logout-btn" title="退出登录" @click="handleLogout">↗</button>
    </div>

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

    <div v-if="currentTab === 'single'" class="list-container">
      <div class="category-toolbar">
        <label class="category-select-wrap">
          <select
            class="category-select"
            :value="localCurrentScene"
            @change="handleSceneSelectChange"
          >
            <option
              v-for="option in sceneSelectOptions"
              :key="option.value"
              :value="option.value"
            >
              {{ option.label }}
            </option>
          </select>
          <span class="category-arrow">⌄</span>
        </label>

        <label class="search-box">
          <input v-model="searchKeyword" type="text" placeholder="搜索" />
          <span class="search-icon">🔍</span>
        </label>
      </div>

      <div v-if="loading" class="topic-skeleton-list">
        <div v-for="i in 3" :key="i" class="topic-skeleton-row">
          <div class="topic-skeleton-dot skeleton"></div>
          <div class="topic-skeleton-line title skeleton"></div>
        </div>
      </div>

      <div v-else class="folder-tree">
        <div v-if="folderGroups.length === 0" class="empty-conversations">
          <div class="empty-icon">💬</div>
          <div class="empty-text">当前分类下暂无会话</div>
        </div>

        <section
          v-for="group in folderGroups"
          :key="group.id"
          :class="['folder-card', { expanded: isFolderExpanded(group.id), virtual: group.isVirtual }]"
        >
          <button class="folder-card-header" @click="toggleFolder(group.id)">
            <div class="folder-card-main">
              <div class="folder-badge" :style="getFolderBadgeStyle(group.folder)">
                {{ getFolderBadgeLetter(group.folder) }}
              </div>
              <div class="folder-card-text">
                <div class="folder-card-title">{{ group.name }}</div>
                <div class="folder-card-meta">{{ group.count }} 个会话</div>
              </div>
            </div>
            <span class="folder-expand" :class="{ open: isFolderExpanded(group.id) }">⌄</span>
          </button>

          <div v-if="isFolderExpanded(group.id)" class="folder-card-body">
            <div class="folder-thread-line" aria-hidden="true"></div>

            <div class="folder-conversation-list">
              <button
                v-for="(conversation, index) in group.conversations"
                :key="conversation.conversation_id"
                :class="['folder-conversation-item', { active: conversation.conversation_id === selectedConversationId }]"
                @click="handleSelectConversation(conversation)"
                @dblclick="handleDoubleClickRename(conversation)"
                @contextmenu.prevent="handleContextMenu($event, conversation)"
              >
                <div class="folder-conversation-title">{{ conversation.title || '未命名对话' }}</div>
                <div class="folder-conversation-meta">{{ formatConversationMeta(conversation, index) }}</div>
                <span
                  v-if="conversation.conversation_id === selectedConversationId"
                  class="folder-conversation-tag"
                >
                  进行中
                </span>
              </button>

              <div v-if="group.conversations.length === 0" class="folder-empty">此文件夹暂无会话</div>
            </div>

            <button
              class="folder-action folder-action-dashed"
              :disabled="group.isVirtual"
              @click="handleCreateConversation(group.folder?.folder_id)"
            >
              + 在此文件夹新建会话
            </button>
          </div>
        </section>

        <button class="folder-action folder-action-root" @click="handleCreateFolder">
          + 新建主题文件夹
        </button>
      </div>
    </div>

    <div v-else class="list-container">
      <div class="empty-groups">
        <div class="empty-icon">👥</div>
        <div class="empty-text">群聊功能开发中</div>
      </div>
    </div>

    <div class="sidebar-footer">
      <button class="sidebar-footer-icon" title="回收站">🗑️</button>
      <div class="sidebar-footer-stat">{{ totalSceneConversationCount }} 条会话</div>
    </div>

    <ContextMenu
      v-model:show="contextMenu.show"
      :x="contextMenu.x"
      :y="contextMenu.y"
      @rename="handleContextMenuRename"
      @delete="handleContextMenuDelete"
    />

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
  --panel-bg: #efedf7;
  --card-bg: rgba(255, 255, 255, 0.82);
  --card-border: rgba(128, 110, 185, 0.12);
  --accent: #6d35ea;
  --accent-2: #8a5cf6;
  --text-main: #2f2252;
  --text-subtle: #8a84a2;

  width: 332px;
  background: radial-gradient(circle at 18% -8%, #faf7ff 0%, #f1eef9 48%, #ebe8f6 100%);
  border-right: 1px solid #e3def2;
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  color: var(--text-main);
}

.sidebar-header {
  margin: 18px 18px 12px;
  padding: 14px 18px;
  border-radius: 16px;
  background: linear-gradient(135deg, #7f4df2 0%, #6f34ea 62%, #6730df 100%);
  color: #fff;
  position: relative;
  box-shadow: 0 14px 24px rgba(109, 53, 234, 0.24);
}

.logo {
  font-size: 20px;
  font-weight: 800;
  letter-spacing: -0.02em;
}

.subtitle {
  margin-top: 2px;
  font-size: 12px;
  opacity: 0.84;
}

.logout-btn {
  position: absolute;
  top: 10px;
  right: 10px;
  width: 28px;
  height: 28px;
  border-radius: 10px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  background: rgba(255, 255, 255, 0.12);
  color: #fff;
  cursor: pointer;
}

.logout-btn:hover {
  background: rgba(255, 255, 255, 0.2);
}

.tab-switcher {
  margin: 0 18px 12px;
  padding: 4px;
  display: flex;
  gap: 6px;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.35);
  border: 1px solid rgba(122, 102, 176, 0.1);
}

.tab-btn {
  flex: 1;
  height: 34px;
  border: none;
  border-radius: 14px;
  background: transparent;
  color: #6f6790;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.18s ease;
}

.tab-btn.active {
  color: #fff;
  background: linear-gradient(135deg, var(--accent-2), var(--accent));
  box-shadow: 0 8px 14px rgba(109, 53, 234, 0.28);
}

.list-container {
  flex: 1;
  overflow-y: auto;
  padding: 0 18px 16px;
}

.category-toolbar {
  display: grid;
  grid-template-columns: 1fr 92px;
  gap: 8px;
  margin-bottom: 10px;
}

.category-select-wrap {
  position: relative;
  display: flex;
  align-items: center;
  height: 36px;
  border-radius: 12px;
  border: 1px solid rgba(122, 102, 176, 0.18);
  background: rgba(255, 255, 255, 0.72);
  overflow: hidden;
}

.category-select {
  width: 100%;
  height: 100%;
  border: none;
  outline: none;
  appearance: none;
  background: transparent;
  color: var(--text-main);
  padding: 0 34px 0 12px;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
}

.category-arrow {
  position: absolute;
  right: 10px;
  color: #8f88ab;
  font-size: 16px;
  line-height: 1;
  pointer-events: none;
}

.search-box {
  height: 36px;
  border-radius: 12px;
  border: 1px solid rgba(122, 102, 176, 0.18);
  background: rgba(255, 255, 255, 0.72);
  display: flex;
  align-items: center;
  padding: 0 8px 0 10px;
  gap: 6px;
}

.search-box input {
  width: 100%;
  border: none;
  outline: none;
  background: transparent;
  font-size: 13px;
  color: var(--text-main);
}

.search-box input::placeholder {
  color: #aaa4bd;
}

.search-icon {
  font-size: 14px;
  opacity: 0.75;
}

.folder-tree {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.folder-card {
  border-radius: 14px;
  background: var(--card-bg);
  border: 1px solid var(--card-border);
  box-shadow: 0 5px 14px rgba(84, 73, 133, 0.06);
  overflow: hidden;
}

.folder-card.expanded {
  background: rgba(255, 255, 255, 0.9);
}

.folder-card.virtual {
  border-style: dashed;
}

.folder-card-header {
  width: 100%;
  background: transparent;
  border: none;
  padding: 12px 12px 11px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  cursor: pointer;
}

.folder-card-main {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.folder-badge {
  width: 26px;
  height: 26px;
  border-radius: 8px;
  display: grid;
  place-items: center;
  font-size: 13px;
  font-weight: 700;
  flex-shrink: 0;
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.28);
}

.folder-card-text {
  min-width: 0;
  text-align: left;
}

.folder-card-title {
  font-size: 14px;
  font-weight: 700;
  color: var(--text-main);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.folder-card-meta {
  margin-top: 1px;
  font-size: 12px;
  color: var(--text-subtle);
}

.folder-expand {
  color: #968fb1;
  transition: transform 0.18s ease;
  flex-shrink: 0;
}

.folder-expand.open {
  transform: rotate(180deg);
}

.folder-card-body {
  position: relative;
  padding: 0 12px 12px 12px;
}

.folder-thread-line {
  position: absolute;
  left: 25px;
  top: 0;
  bottom: 54px;
  border-left: 2px dashed rgba(143, 136, 171, 0.2);
}

.folder-conversation-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin: 2px 0 10px 26px;
}

.folder-conversation-item {
  position: relative;
  width: 100%;
  border: 1px solid rgba(122, 102, 176, 0.08);
  background: rgba(248, 246, 255, 0.76);
  border-radius: 12px;
  padding: 10px 12px;
  text-align: left;
  cursor: pointer;
  transition: all 0.18s ease;
}

.folder-conversation-item::before {
  content: '';
  position: absolute;
  left: -14px;
  top: 16px;
  width: 10px;
  border-top: 2px solid rgba(143, 136, 171, 0.24);
}

.folder-conversation-item:hover {
  background: rgba(245, 241, 255, 0.95);
  border-color: rgba(109, 53, 234, 0.18);
}

.folder-conversation-item.active {
  background: linear-gradient(135deg, rgba(117, 79, 244, 0.12), rgba(109, 53, 234, 0.06));
  border-color: rgba(109, 53, 234, 0.24);
  box-shadow: 0 8px 16px rgba(109, 53, 234, 0.08);
}

.folder-conversation-title {
  font-size: 13px;
  font-weight: 600;
  color: #3f3366;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  padding-right: 58px;
}

.folder-conversation-meta {
  margin-top: 3px;
  font-size: 12px;
  color: #968fb1;
}

.folder-conversation-tag {
  position: absolute;
  top: 10px;
  right: 10px;
  height: 20px;
  display: inline-flex;
  align-items: center;
  padding: 0 8px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 700;
  color: #fff;
  background: linear-gradient(135deg, #7c4ef1, #652fe3);
}

.folder-empty {
  margin: 2px 0 0 2px;
  color: #aaa4bd;
  font-size: 12px;
}

.folder-action {
  width: 100%;
  height: 40px;
  border-radius: 12px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
}

.folder-action-dashed {
  background: rgba(255, 255, 255, 0.55);
  border: 1px dashed rgba(149, 140, 179, 0.32);
  color: #82789f;
}

.folder-action-dashed:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.9);
  border-color: rgba(109, 53, 234, 0.22);
  color: #602dde;
}

.folder-action-dashed:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.folder-action-root {
  background: rgba(255, 255, 255, 0.6);
  border: 1px dashed rgba(149, 140, 179, 0.32);
  color: #7e759a;
}

.folder-action-root:hover {
  background: rgba(255, 255, 255, 0.92);
  border-color: rgba(109, 53, 234, 0.26);
  color: #5725cf;
}

.topic-skeleton-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 10px 0;
}

.topic-skeleton-row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.topic-skeleton-dot {
  width: 30px;
  height: 30px;
  border-radius: 8px;
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
  background: linear-gradient(90deg, #f1eef8 25%, #e4dff2 50%, #f1eef8 75%);
  background-size: 200% 100%;
  animation: shimmer 1.3s infinite;
}

@keyframes shimmer {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}

.empty-conversations,
.empty-groups {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px 16px;
  color: #9b93b4;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.55);
  border: 1px dashed rgba(149, 140, 179, 0.26);
}

.empty-icon {
  font-size: 28px;
  margin-bottom: 8px;
}

.empty-text {
  font-size: 13px;
}

.sidebar-footer {
  padding: 10px 18px 14px;
  border-top: 1px solid rgba(160, 152, 186, 0.18);
  display: flex;
  align-items: center;
  gap: 8px;
}

.sidebar-footer-icon {
  width: 36px;
  height: 36px;
  border-radius: 12px;
  border: 1px solid rgba(122, 102, 176, 0.16);
  background: rgba(255, 255, 255, 0.62);
  cursor: pointer;
}

.sidebar-footer-icon:hover {
  background: rgba(255, 255, 255, 0.9);
}

.sidebar-footer-stat {
  flex: 1;
  font-size: 12px;
  color: #8f88ab;
  text-align: right;
}

@media (max-width: 768px) {
  .sidebar {
    width: 286px;
  }

  .category-toolbar {
    grid-template-columns: 1fr 84px;
  }
}
</style>
