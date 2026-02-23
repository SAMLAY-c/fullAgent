// 通用类型定义
export * from './chat'

export interface User {
  user_id: string
  username: string
  role: string
  email?: string
  avatar?: string
}

export interface ApiResponse<T = any> {
  data?: T
  error?: {
    code: string
    message: string
    numeric_code: number
  }
}
