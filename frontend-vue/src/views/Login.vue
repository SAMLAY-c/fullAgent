<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { NForm, NFormItem, NInput, NButton, NCard, NGradientText, useMessage } from 'naive-ui'

const router = useRouter()
const authStore = useAuthStore()
const message = useMessage()

const form = ref({
  username: 'admin',
  password: 'admin123'
})
const loading = ref(false)

const handleLogin = async () => {
  if (!form.value.username || !form.value.password) {
    message.warning('请输入用户名和密码')
    return
  }

  loading.value = true
  try {
    await authStore.login(form.value)
    message.success('登录成功，欢迎回来！')
    router.push('/chat')
  } catch (error: any) {
    const errorMsg = error.response?.data?.error?.message || error.message || '登录失败'
    message.error(errorMsg)
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="login-container">
    <!-- 装饰性背景元素 -->
    <div class="decorative-circle circle-1"></div>
    <div class="decorative-circle circle-2"></div>
    <div class="decorative-circle circle-3"></div>

    <n-card class="login-card">
      <!-- Logo 和标题 -->
      <div class="header-section">
        <div class="logo-wrapper">
          <div class="logo">🤖</div>
        </div>
        <h1 class="title">
          <n-gradient-text type="primary">
            欢迎回来
          </n-gradient-text>
        </h1>
        <p class="subtitle">登录 Bot Agent，开启 AI 之旅</p>
      </div>

      <!-- 登录表单 -->
      <n-form class="login-form">
        <n-form-item :show-feedback="false">
          <template #label>
            <span class="form-label">👤 用户名</span>
          </template>
          <n-input
            v-model:value="form.username"
            placeholder="请输入用户名"
            size="large"
            @keyup.enter="handleLogin"
          />
        </n-form-item>

        <n-form-item :show-feedback="false">
          <template #label>
            <span class="form-label">🔒 密码</span>
          </template>
          <n-input
            v-model:value="form.password"
            type="password"
            placeholder="请输入密码"
            show-password-on="click"
            size="large"
            @keyup.enter="handleLogin"
          />
        </n-form-item>

        <n-button
          type="primary"
          size="large"
          block
          :loading="loading"
          class="login-button"
          @click="handleLogin"
        >
          <template #icon>
            <span v-if="!loading">✨</span>
          </template>
          {{ loading ? '登录中...' : '登 录' }}
        </n-button>
      </n-form>

      <!-- 友好提示 -->
      <div class="friendly-hint">
        <div class="hint-icon">💡</div>
        <div class="hint-text">
          <div class="hint-title">演示账号</div>
          <div class="hint-content">用户名: admin &nbsp;•&nbsp; 密码: admin123</div>
        </div>
      </div>

      <!-- 底部装饰 -->
      <div class="footer-decoration">
        <span class="wave">👋</span>
        <span class="footer-text">很高兴见到你</span>
      </div>
    </n-card>
  </div>
</template>

<style scoped>
.login-container {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #fef9f3 0%, #fdf2e9 50%, #fef5ee 100%);
  padding: 20px;
  position: relative;
  overflow: hidden;
}

/* 装饰性圆形背景 */
.decorative-circle {
  position: absolute;
  border-radius: 50%;
  opacity: 0.6;
  animation: float 20s ease-in-out infinite;
}

.circle-1 {
  width: 300px;
  height: 300px;
  background: linear-gradient(135deg, #ffeaa7 0%, #fdcb6e 100%);
  top: -100px;
  left: -100px;
  animation-delay: 0s;
}

.circle-2 {
  width: 200px;
  height: 200px;
  background: linear-gradient(135deg, #a8e6cf 0%, #55efc4 100%);
  bottom: -50px;
  right: -50px;
  animation-delay: 5s;
}

.circle-3 {
  width: 150px;
  height: 150px;
  background: linear-gradient(135deg, #fab1a0 0%, #e17055 100%);
  top: 50%;
  right: 10%;
  animation-delay: 10s;
}

@keyframes float {
  0%, 100% {
    transform: translate(0, 0) scale(1);
  }
  33% {
    transform: translate(30px, -30px) scale(1.1);
  }
  66% {
    transform: translate(-20px, 20px) scale(0.9);
  }
}

/* 登录卡片 */
.login-card {
  width: 100%;
  max-width: 440px;
  border-radius: 24px;
  box-shadow: 0 20px 60px rgba(253, 203, 110, 0.2),
              0 8px 24px rgba(0, 0, 0, 0.05);
  border: 2px solid rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(10px);
  background: rgba(255, 255, 255, 0.95);
  position: relative;
  z-index: 1;
  animation: slideUp 0.6s ease-out;
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* 头部区域 */
.header-section {
  text-align: center;
  margin-bottom: 32px;
}

.logo-wrapper {
  margin-bottom: 16px;
  animation: bounce 2s ease-in-out infinite;
}

@keyframes bounce {
  0%, 100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-10px);
  }
}

.logo {
  font-size: 64px;
  line-height: 1;
  display: inline-block;
  filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.1));
}

.title {
  font-size: 32px;
  font-weight: 700;
  margin: 0 0 12px 0;
}

.subtitle {
  font-size: 15px;
  color: #6b7280;
  margin: 0;
  font-weight: 400;
}

/* 表单样式 */
.login-form {
  margin-bottom: 24px;
}

.form-label {
  font-weight: 600;
  color: #374151;
  font-size: 14px;
}

:deep(.n-input) {
  border-radius: 12px;
  transition: all 0.3s ease;
}

:deep(.n-input:hover) {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(253, 203, 110, 0.3);
}

:deep(.n-input:focus-within) {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(253, 203, 110, 0.4);
}

/* 登录按钮 */
.login-button {
  height: 48px;
  border-radius: 14px;
  font-weight: 600;
  font-size: 16px;
  margin-top: 8px;
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
  border: none;
  transition: all 0.3s ease;
}

.login-button:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(245, 87, 108, 0.4);
}

.login-button:active {
  transform: translateY(0);
}

/* 友好提示 */
.friendly-hint {
  display: flex;
  gap: 12px;
  padding: 16px;
  background: linear-gradient(135deg, #fef9f3 0%, #fff8e7 100%);
  border-radius: 16px;
  border: 2px solid rgba(253, 203, 110, 0.3);
  margin-bottom: 20px;
}

.hint-icon {
  font-size: 24px;
  line-height: 1;
  flex-shrink: 0;
}

.hint-text {
  flex: 1;
}

.hint-title {
  font-weight: 600;
  color: #374151;
  font-size: 14px;
  margin-bottom: 4px;
}

.hint-content {
  color: #6b7280;
  font-size: 13px;
}

/* 底部装饰 */
.footer-decoration {
  text-align: center;
  padding-top: 16px;
  border-top: 2px dashed rgba(253, 203, 110, 0.3);
}

.wave {
  font-size: 28px;
  display: block;
  margin-bottom: 8px;
  animation: wave 2s ease-in-out infinite;
}

@keyframes wave {
  0%, 100% {
    transform: rotate(0deg);
  }
  25% {
    transform: rotate(20deg);
  }
  75% {
    transform: rotate(-20deg);
  }
}

.footer-text {
  font-size: 13px;
  color: #9ca3af;
  font-weight: 500;
}

/* 响应式设计 */
@media (max-width: 480px) {
  .login-card {
    border-radius: 20px;
  }

  .logo {
    font-size: 48px;
  }

  .title {
    font-size: 26px;
  }

  .decorative-circle {
    opacity: 0.4;
  }
}
</style>
