# Bot Agent Frontend (Vue 3)

全新的 Vue 3 + Vite + TypeScript 前端项目。

## 快速开始

### 1. 安装依赖
```bash
npm install
```

### 2. 启动开发服务器
```bash
npm run dev
```
访问 http://localhost:5173

### 3. 构建生产版本
```bash
npm run build
```

### 4. 预览生产构建
```bash
npm run preview
```

## 技术栈

- **Vue 3** - 渐进式 JavaScript 框架
- **Vite** - 下一代前端构建工具
- **TypeScript** - 类型安全的 JavaScript
- **Vue Router** - 官方路由管理器
- **Pinia** - Vue 3 状态管理
- **Naive UI** - Vue 3 组件库
- **Axios** - HTTP 客户端

## 项目结构

```
src/
├── api/          # API 请求封装
├── assets/       # 静态资源
├── router/       # 路由配置
├── stores/       # Pinia 状态管理
├── types/        # TypeScript 类型定义
├── views/        # 页面组件
├── App.vue       # 根组件
└── main.ts       # 入口文件
```

## API 代理配置

开发环境下，所有 `/api` 请求会自动代理到 `http://localhost:8915`（后端服务）。

可以在 `vite.config.ts` 中修改代理配置：

```typescript
server: {
  port: 5173,
  proxy: {
    '/api': 'http://localhost:8915'
  }
}
```

## 功能特性

- ✅ 用户认证（登录/登出）
- ✅ 路由守卫（未登录自动跳转）
- ✅ 响应式设计
- 🚧 聊天界面（开发中）
- 🚧 Bot 管理界面（开发中）

## 演示账号

- 用户名: `admin`
- 密码: `admin123`

## 开发说明

- 使用 `<script setup>` 语法糖
- 组件自动导入（unplugin-vue-components）
- API 自动导入（unplugin-auto-import）
- Naive UI 组件自动按需导入

## 与旧前端并行运行

- **新前端**: http://localhost:5173
- **旧前端**: http://localhost:8915

两个系统可以同时运行，方便对比测试。

