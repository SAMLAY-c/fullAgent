/**
 * Bot Store
 */
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Bot, Folder, BotScene } from '@/types'
import * as botApi from '@/api/bot'

export const useBotStore = defineStore('bot', () => {
  // State
  const bots = ref<Bot[]>([])
  const folders = ref<Folder[]>([])
  const currentBot = ref<Bot | null>(null)
  const selectedFolderId = ref<string | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)

  // Getters
  const botsByScene = computed(() => {
    const result: Record<BotScene, Bot[]> = {
      work: [],
      life: [],
      love: [],
      group: [],
      sop: []
    }

    bots.value.forEach((bot: Bot) => {
      const scene = bot.scene
      if (scene && result[scene]) {
        result[scene].push(bot)
      }
    })

    return result
  })

  const currentSceneBots = computed(() => {
    if (!currentBot.value) return []
    return botsByScene.value[currentBot.value.scene] || []
  })

  // Actions
  async function fetchBots(params?: { scene?: BotScene }) {
    loading.value = true
    error.value = null

    try {
      const response = await botApi.getBots(params)
      bots.value = response.data?.data?.bots || []
      return response
    } catch (err: any) {
      error.value = err.message || '获取Bot列表失败'
      throw err
    } finally {
      loading.value = false
    }
  }

  async function fetchBotsByScene() {
    loading.value = true
    error.value = null

    try {
      const result = await botApi.getBotsByScene()
      bots.value = [
        ...result.work,
        ...result.life,
        ...result.love,
        ...result.group,
        ...result.sop
      ]
      return result
    } catch (err: any) {
      error.value = err.message || '获取Bot列表失败'
      throw err
    } finally {
      loading.value = false
    }
  }

  async function fetchBot(botId: string) {
    loading.value = true
    error.value = null

    try {
      const response = await botApi.getBot(botId)
      currentBot.value = response.data?.data?.bot || null
      return response.data?.data?.bot
    } catch (err: any) {
      error.value = err.message || '获取Bot详情失败'
      throw err
    } finally {
      loading.value = false
    }
  }

  function setCurrentBot(bot: Bot | null) {
    currentBot.value = bot
  }

  function setSelectedFolderId(folderId: string | null) {
    selectedFolderId.value = folderId
  }

  return {
    // State
    bots,
    folders,
    currentBot,
    selectedFolderId,
    loading,
    error,

    // Getters
    botsByScene,
    currentSceneBots,

    // Actions
    fetchBots,
    fetchBotsByScene,
    fetchBot,
    setCurrentBot,
    setSelectedFolderId
  }
})
