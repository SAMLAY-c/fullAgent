import { defineStore } from 'pinia'
import axios from 'axios'

interface User {
  user_id: string
  username: string
  role: string
  email?: string
  avatar?: string
}

interface LoginCredentials {
  username: string
  password: string
}

interface AuthResponse {
  access_token: string
  refresh_token: string
  token_type?: string
  expires_in?: number
  user: User
}

export const useAuthStore = defineStore('auth', {
  state: () => ({
    token: localStorage.getItem('token') || '',
    refreshToken: localStorage.getItem('refresh_token') || '',
    user: null as User | null
  }),

  getters: {
    isAuthenticated: (state) => !!state.token
  },

  actions: {
    async login(credentials: LoginCredentials) {
      const { data } = await axios.post<AuthResponse>('/api/auth/login', credentials)
      this.token = data.access_token
      this.refreshToken = data.refresh_token
      this.user = data.user

      localStorage.setItem('token', data.access_token)
      localStorage.setItem('refresh_token', data.refresh_token)

      axios.defaults.headers.common['Authorization'] = `Bearer ${data.access_token}`
    },

    logout() {
      this.token = ''
      this.refreshToken = ''
      this.user = null

      localStorage.removeItem('token')
      localStorage.removeItem('refresh_token')

      delete axios.defaults.headers.common['Authorization']
    },

    initializeAuth() {
      const token = localStorage.getItem('token')
      if (token) {
        this.token = token
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`
      }
    }
  }
})
