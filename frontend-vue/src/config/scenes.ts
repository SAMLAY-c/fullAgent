/**
 * 场景配置
 */
import type { BotScene } from '@/types'

export interface SceneConfig {
  id: BotScene
  name: string
  description: string
  icon: string
  gradient: string
  defaultBotName: string
}

export const scenes: SceneConfig[] = [
  {
    id: 'work',
    name: '工作',
    description: '职场成长顾问',
    icon: '💼',
    gradient: 'linear-gradient(135deg, #E8E4FF 0%, #F0ECFF 100%)',
    defaultBotName: '工作伙伴'
  },
  {
    id: 'life',
    name: '生活',
    description: '日常生活顾问',
    icon: '🌿',
    gradient: 'linear-gradient(135deg, #E8FFE8 0%, #F0FFF0 100%)',
    defaultBotName: '生活助手'
  },
  {
    id: 'love',
    name: '情感',
    description: '关系沟通顾问',
    icon: '💜',
    gradient: 'linear-gradient(135deg, #FFE8EC 0%, #FFF0F3 100%)',
    defaultBotName: '心灵朋友'
  }
]

export function getSceneById(id: BotScene): SceneConfig | undefined {
  return scenes.find(scene => scene.id === id)
}

export function getSceneIcon(id: BotScene): string {
  return getSceneById(id)?.icon || '🤖'
}

export function getSceneGradient(id: BotScene): string {
  return getSceneById(id)?.gradient || 'linear-gradient(135deg, #f5f7fa 0%, #e8ecf1 100%)'
}
