# Bot Agent 平台技术栈迁移计划

## 📋 执行摘要

**项目现状**：功能完整的 AI Bot 管理平台，但存在明显技术债务
**迁移目标**：升级到现代技术栈，提升可维护性和开发效率
**预计周期**：3-6 个月（分阶段执行）
**风险等级**：中等（需要谨慎规划，保证业务连续性）

---

## 🎯 迁移策略总览

### 分阶段迁移路线图

```
┌─────────────────────────────────────────────────────────────────┐
│                        Phase 0: 准备阶段                         │
│                     1-2 周（2025年 2月）                          │
├─────────────────────────────────────────────────────────────────┤
│  ✓ 代码质量分析                                                  │
│  ✓ 依赖项升级                                                    │
│  ✓ 测试基础设施搭建                                              │
│  ✓ CI/CD 流程优化                                                │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                      Phase 1: 前端重构（核心）                     │
│                    6-8 周（2025年 3月-4月）                        │
├─────────────────────────────────────────────────────────────────┤
│  Week 1-2:  项目搭建 + 基础组件                                  │
│  Week 3-4:  聊天界面迁移                                          │
│  Week 5-6:  管理后台迁移                                          │
│  Week 7-8:  功能验证 + Bug 修复                                  │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                      Phase 2: 后端优化                            │
│                     4-6 周（2025年 5月）                           │
├─────────────────────────────────────────────────────────────────┤
│  Week 1-2:  错误处理统一 + 验证层                                │
│  Week 3-4:  WebSocket 实时通信                                   │
│  Week 5-6:  性能优化 + 监控                                      │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                      Phase 3: 高级特性                            │
│                     4-6 周（2025年 6月）                           │
├─────────────────────────────────────────────────────────────────┤
│  Week 1-2:  API 文档生成（Swagger）                              │
│  Week 3-4:  单元测试覆盖（80%+）                                  │
│  Week 5-6:  E2E 测试 + 性能测试                                   │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                      Phase 4: 上线准备                            │
│                     2-3 周（2025年 7月）                           │
├─────────────────────────────────────────────────────────────────┤
│  ✓ 数据迁移验证                                                  │
│  ✓ 灰度发布                                                      │
│  ✓ 监控告警配置                                                  │
│  ✓ 回滚方案准备                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📐 Phase 1: 前端重构（核心阶段）

### 1.1 技术选型

| 技术栈 | 选择 | 理由 |
|--------|------|------|
| **框架** | Vue 3 + Composition API | • 学习曲线平缓<br>• 渐进式迁移友好<br>• 优秀的 TS 支持<br>• 性能优于 React |
| **构建工具** | Vite 5 | • 开发体验极佳（HMR 秒级）<br>• 生产构建速度快<br>• 原生 ESM 支持 |
| **状态管理** | Pinia | • Vue 3 官方推荐<br>• TypeScript 友好<br>• 比 Vuex 更简洁 |
| **路由** | Vue Router 4 | • Vue 3 官方路由<br>• 嵌套路由支持 |
| **UI 组件库** | Naive UI | • 无需按需引入<br>• TypeScript 原生支持<br>• 主题定制灵活 |
| **HTTP 客户端** | Axios + ofetch | • 拦截器完善<br>• 请求取消支持 |
| **实时通信** | Socket.io-client | • 自动降级（WebSocket → Polling）<br>• 心跳机制 |
| **表单处理** | VeeValidate + Yup | • 基于 Composition API<br>• 强大的验证规则 |

### 1.2 项目结构设计

```
frontend/
├── src/
│   ├── assets/               # 静态资源
│   │   ├── styles/
│   │   │   ├── main.css      # 全局样式
│   │   │   └── variables.css # CSS 变量
│   │   └── images/
│   ├── components/           # 公共组件
│   │   ├── common/
│   │   │   ├── BaseButton.vue
│   │   │   ├── BaseModal.vue
│   │   │   ├── BaseInput.vue
│   │   │   └── Toast.vue
│   │   ├── chat/
│   │   │   ├── MessageList.vue
│   │   │   ├── MessageItem.vue
│   │   │   ├── MessageInput.vue
│   │   │   └── TypingIndicator.vue
│   │   └── admin/
│   │       ├── BotCard.vue
│   │       ├── StatsCard.vue
│   │       └── CronEditor.vue
│   ├── composables/          # 组合式函数
│   │   ├── useAuth.ts        # 认证逻辑
│   │   ├── useChat.ts        # 聊天逻辑
│   │   ├── useWebSocket.ts   # WebSocket 连接
│   │   └── usePagination.ts  # 分页逻辑
│   ├── stores/               # Pinia 状态管理
│   │   ├── auth.ts
│   │   ├── chat.ts
│   │   ├── admin.ts
│   │   └── bot.ts
│   ├── services/             # API 服务层
│   │   ├── api.ts            # Axios 实例配置
│   │   ├── auth.service.ts
│   │   ├── chat.service.ts
│   │   ├── bot.service.ts
│   │   └── websocket.service.ts
│   ├── types/                # TypeScript 类型定义
│   │   ├── api.d.ts
│   │   ├── bot.d.ts
│   │   ├── chat.d.ts
│   │   └── user.d.ts
│   ├── views/                # 页面组件
│   │   ├── Login/
│   │   │   └── index.vue
│   │   ├── Chat/
│   │   │   ├── index.vue
│   │   │   └── components/
│   │   └──   Admin/
│   │       ├── index.vue
│   │       └── components/
│   ├── router/               # 路由配置
│   │   └── index.ts
│   ├── utils/                # 工具函数
│   │   ├── format.ts
│   │   ├── validate.ts
│   │   └── storage.ts
│   ├── App.vue
│   └── main.ts
├── public/
├── index.html
├── vite.config.ts
├── tsconfig.json
└── package.json
```

### 1.3 迁移步骤（8周详细计划）

#### Week 1-2: 项目搭建 + 基础组件

**目标**：搭建基础框架，创建公共组件库

**任务清单**：
- [ ] Day 1-2: 初始化 Vite + Vue 3 项目
- [ ] Day 3-4: 配置 TypeScript、ESLint、Prettier
- [ ] Day 5-7: 创建布局组件（Layout、Header、Sidebar）
- [ ] Day 8-10: 实现公共组件（Modal、Toast、Button、Input）
- [ ] Day 11-12: 配置 Vue Router（路由守卫、懒加载）
- [ ] Day 13-14: 搭建 Pinia stores（auth、chat、bot）

**验收标准**：
```bash
✓ npm run dev 正常启动
✓ 路由跳转正常
✓ Pinia 状态持久化（localStorage）
✓ 组件在 Storybook 中展示
```

#### Week 3-4: 聊天界面迁移

**目标**：将 chat.js (87KB) 拆分为 Vue 组件

**任务分解**：

**Week 3: 核心功能**
- [ ] Day 1-2: MessageList + MessageItem 组件
- [ ] Day 3-4: MessageInput 组件（支持 Markdown）
- [ ] Day 5-6: 场景切换逻辑（work/life/love）
- [ ] Day 7: Bot 列表侧边栏

**Week 4: 高级功能**
- [ ] Day 1-2: 实时打字效果（TypingIndicator）
- [ ] Day 3-4: 消息搜索和过滤
- [ ] Day 5: 文件上传（拖拽上传）
- [ ] Day 6-7: 流式响应渲染（SSE）

**关键组件示例**：
```vue
<!-- MessageItem.vue -->
<script setup lang="ts">
import { computed } from 'vue';
import { useChatStore } from '@/stores/chat';
import { formatTime } from '@/utils/format';

interface Props {
  message: Message;
}

const props = defineProps<Props>();
const chatStore = useChatStore();

const isUser = computed(() => props.message.sender === 'user');
const avatarUrl = computed(() =>
  isUser.value ? chatStore.userAvatar : chatStore.botAvatar
);
</script>

<template>
  <div :class="['message-item', isUser ? 'user' : 'bot']">
    <img :src="avatarUrl" class="avatar" />
    <div class="content">
      <div class="text" v-html="renderMarkdown(message.content)"></div>
      <div class="timestamp">{{ formatTime(message.timestamp) }}</div>
    </div>
  </div>
</template>
```

#### Week 5-6: 管理后台迁移

**目标**：将 admin.js (55KB) 拆分为 Vue 组件

**任务分解**：

**Week 5: CRUD 功能**
- [ ] Day 1-2: Bot 管理（列表、创建、编辑、删除）
- [ ] Day 3-4: 工作流配置（Cron 编辑器）
- [ ] Day 5-6: 群组管理（成员添加、路由策略）

**Week 6: 数据展示**
- [ ] Day 1-2: 仪表盘（图表可视化）
- [ ] Day 3-4: 数据统计（使用 ECharts）
- [ ] Day 5: 日志导出功能
- [ ] Day 6-7: 知识库管理（文件上传、分块预览）

**关键组件 - Cron 编辑器**：
```vue
<!-- CronEditor.vue -->
<script setup lang="ts">
import { ref, computed } from 'vue';

const props = defineProps<{
  modelValue: string;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void;
}>();

const tabs = ['分钟', '小时', '日', '月', '周'];
const activeTab = ref(0);

const cronParts = computed(() => props.modelValue.split(' '));
</script>

<template>
  <div class="cron-editor">
    <div class="tabs">
      <button
        v-for="(tab, i) in tabs"
        :key="i"
        :class="{ active: activeTab === i }"
        @click="activeTab = i"
      >
        {{ tab }}
      </button>
    </div>
    <div class="editor-content">
      <!-- Cron 编辑器具体实现 -->
    </div>
  </div>
</template>
```

#### Week 7-8: 功能验证 + Bug 修复

**测试清单**：
- [ ] Day 1-2: 功能回归测试（所有原功能可用）
- [ ] Day 3-4: 性能测试（首屏加载 < 2s）
- [ ] Day 5: 兼容性测试（Chrome、Firefox、Safari）
- [ ] Day 6-7: Bug 修复 + 代码优化

### 1.4 数据迁移策略

**状态迁移**：
```typescript
// 旧代码（Vanilla JS）
const state = {
  botsByScene: { work: [], life: [], love: [] },
  selectedBotId: null
};

// 新代码（Pinia）
// stores/chat.ts
export const useChatStore = defineStore('chat', {
  state: () => ({
    botsByScene: {
      work: [] as Bot[],
      life: [] as Bot[],
      love: [] as Bot[]
    },
    selectedBotId: null as string | null
  }),

  actions: {
    migrateFromOldState(oldState: any) {
      this.botsByScene = oldState.botsByScene;
      this.selectedBotId = oldState.selectedBotId;
    }
  },

  persist: {
    key: 'chat-state',
    storage: localStorage
  }
});
```

**API 兼容性**：
```typescript
// 保持 API 接口不变，前端逐步迁移
// services/api.ts
import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8915/api',
  timeout: 30000
});

// 请求拦截器（兼容旧版 Token）
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// 响应拦截器（自动刷新 Token）
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Token 刷新逻辑
      const refreshToken = localStorage.getItem('refresh_token');
      const { data } = await axios.post('/auth/refresh', { token: refreshToken });
      localStorage.setItem('access_token', data.access_token);
      // 重试原请求
      return api.request(error.config);
    }
    return Promise.reject(error);
  }
);
```

---

## 🔧 Phase 2: 后端优化

### 2.1 技术选型

| 技术 | 选择 | 理由 |
|------|------|------|
| **API 文档** | Swagger/OpenAPI | • 自动生成文档<br>• 在线测试 API |
| **验证层** | Zod | • TypeScript 原生支持<br>• 运行时验证 |
| **实时通信** | Socket.io | • 自动降级<br>• 房间管理 |
| **日志** | Pino | • 结构化日志<br>• 高性能 |
| **监控** | Prometheus + Grafana | • 业界标准<br>• 丰富的指标 |

### 2.2 统一错误处理

**自定义错误类**：
```typescript
// utils/errors.ts
export class AppError extends Error {
  constructor(
    public code: string,
    public statusCode: number,
    message: string,
    public details?: any
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = '资源不存在') {
    super('NOT_FOUND', 404, message);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = '未授权') {
    super('UNAUTHORIZED', 401, message);
  }
}

export class ValidationError extends AppError {
  constructor(details: any) {
    super('VALIDATION_ERROR', 400, '验证失败', details);
  }
}
```

**错误处理中间件**：
```typescript
// middleware/errorHandler.ts
import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/errors';
import pino from 'pino';

const logger = pino();

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) {
  logger.error({
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    ip: req.ip
  });

  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      error: {
        code: err.code,
        message: err.message,
        details: err.details,
        timestamp: new Date().toISOString()
      }
    });
  }

  // 未知错误
  res.status(500).json({
    error: {
      code: 'INTERNAL_ERROR',
      message: process.env.NODE_ENV === 'production'
        ? '服务器内部错误'
        : err.message,
      timestamp: new Date().toISOString()
    }
  });
}
```

### 2.3 请求验证层

**Zod Schema 定义**：
```typescript
// schemas/bot.schema.ts
import { z } from 'zod';

export const createBotSchema = z.object({
  name: z.string().min(1).max(100),
  avatar: z.string().url().optional(),
  type: z.enum(['work', 'life', 'love', 'group', 'sop']),
  scene: z.string().optional(),
  description: z.string().max(500).optional(),
  config: z.object({
    model: z.string(),
    provider: z.enum(['openai', 'siliconflow']),
    temperature: z.number().min(0).max(2).optional(),
    maxTokens: z.number().positive().optional()
  })
});

export const updateBotSchema = createBotSchema.partial();

export type CreateBotInput = z.infer<typeof createBotSchema>;
export type UpdateBotInput = z.infer<typeof updateBotSchema>;
```

**验证中间件**：
```typescript
// middleware/validate.ts
import { Request, Response, NextFunction } from 'express';
import { AnyZodObject, ZodError } from 'zod';

export function validate(schema: AnyZodObject) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      await schema.parseAsync({
        body: req.body,
        query: req.query,
        params: req.params
      });
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: '请求参数验证失败',
            details: error.errors
          }
        });
      }
      next(error);
    }
  };
}
```

**路由中使用**：
```typescript
// routes/bots.ts
import { Router } from 'express';
import { validate } from '../middleware/validate';
import { createBotSchema, updateBotSchema } from '../schemas/bot.schema';

router.post(
  '/bots',
  validate({ body: createBotSchema }),
  async (req, res, next) => {
    // req.body 已经是类型安全的
    const botData: CreateBotInput = req.body;
    // 业务逻辑...
  }
);

router.put(
  '/bots/:id',
  validate({ body: updateBotSchema, params: z.object({ id: z.string() }) }),
  async (req, res, next) => {
    // ...
  }
);
```

### 2.4 WebSocket 实时通信

**Socket.io 服务端配置**：
```typescript
// services/websocket.service.ts
import { Server as SocketIOServer } from 'socket.io';
import { Server as HTTPServer } from 'http';
import { authenticateSocket } from '../middleware/socketAuth';

export class WebSocketService {
  private io: SocketIOServer;

  constructor(httpServer: HTTPServer) {
    this.io = new SocketIOServer(httpServer, {
      cors: {
        origin: process.env.FRONTEND_URL || 'http://localhost:5173',
        credentials: true
      },
      transports: ['websocket', 'polling']
    });

    this.setupMiddleware();
    this.setupEventHandlers();
  }

  private setupMiddleware() {
    // JWT 认证中间件
    this.io.use(authenticateSocket);
  }

  private setupEventHandlers() {
    this.io.on('connection', (socket) => {
      const userId = socket.data.userId;
      console.log(`User ${userId} connected`);

      // 加入对话房间
      socket.on('join-conversation', (conversationId: string) => {
        socket.join(`conversation:${conversationId}`);
        console.log(`User ${userId} joined conversation ${conversationId}`);
      });

      // 离开对话房间
      socket.on('leave-conversation', (conversationId: string) => {
        socket.leave(`conversation:${conversationId}`);
      });

      // 发送消息
      socket.on('send-message', async (data) => {
        const { conversationId, content } = data;
        // 处理消息并发送给房间内所有用户
        const message = await this.handleMessage(userId, conversationId, content);
        this.io.to(`conversation:${conversationId}`).emit('new-message', message);
      });

      // 正在输入状态
      socket.on('typing', (data) => {
        const { conversationId, isTyping } = data;
        socket.to(`conversation:${conversationId}`).emit('user-typing', {
          userId,
          isTyping
        });
      });

      socket.on('disconnect', () => {
        console.log(`User ${userId} disconnected`);
      });
    });
  }

  // 发送消息到特定对话
  public sendToConversation(conversationId: string, event: string, data: any) {
    this.io.to(`conversation:${conversationId}`).emit(event, data);
  }

  // 发送通知给特定用户
  public sendToUser(userId: string, event: string, data: any) {
    this.io.to(`user:${userId}`).emit(event, data);
  }
}
```

**Socket 认证中间件**：
```typescript
// middleware/socketAuth.ts
import { Socket } from 'socket.io';
import jwt from 'jsonwebtoken';

export function authenticateSocket(socket: Socket, next: any) {
  const token = socket.handshake.auth.token;

  if (!token) {
    return next(new Error('Authentication error: No token provided'));
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!);
    socket.data.userId = decoded.userId;
    socket.data.username = decoded.username;
    next();
  } catch (error) {
    next(new Error('Authentication error: Invalid token'));
  }
}
```

**在 app.ts 中集成**：
```typescript
// app.ts
import { createServer } from 'http';
import { WebSocketService } from './services/websocket.service';

const app = express();
const httpServer = createServer(app);

// 初始化 WebSocket
const wsService = new WebSocketService(httpServer);

// 将 wsService 传递给需要使用的服务
app.set('wsService', wsService);

httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
```

### 2.5 API 文档生成

**Swagger 配置**：
```typescript
// swagger.ts
import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Bot Agent API',
      version: '1.0.0',
      description: 'AI Bot 管理平台 API 文档'
    },
    servers: [
      {
        url: 'http://localhost:8915',
        description: '开发环境'
      },
      {
        url: 'https://api.botagent.com',
        description: '生产环境'
      }
    ],
    components: {
      securitySchemes: {
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        }
      },
      schemas: {
        Bot: {
          type: 'object',
          properties: {
            bot_id: { type: 'string' },
            name: { type: 'string' },
            type: { type: 'string', enum: ['work', 'life', 'love'] }
          }
        }
      }
    }
  },
  apis: ['./src/routes/*.ts'] // 扫描路由文件中的注释
};

export const swaggerSpec = swaggerJsdoc(options);
export const swaggerUiServe = swaggerUi.serve;
export const swaggerUiSetup = swaggerUi.setup;
```

**路由中使用 JSDoc 注释**：
```typescript
// routes/bots.ts
/**
 * @swagger
 * /api/bots:
 *   get:
 *     summary: 获取 Bot 列表
 *     tags: [Bots]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [work, life, love]
 *     responses:
 *       200:
 *         description: 成功返回 Bot 列表
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Bot'
 */
router.get('/bots', authMiddleware, async (req, res) => {
  // ...
});
```

---

## 🧪 Phase 3: 测试与文档

### 3.1 单元测试（覆盖率目标：80%+）

**后端测试**：
```typescript
// tests/services/chat.service.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ChatService } from '../../src/services/chat.service';

describe('ChatService', () => {
  let chatService: ChatService;

  beforeEach(() => {
    chatService = new ChatService(/* mock dependencies */);
  });

  describe('createConversation', () => {
    it('should create conversation successfully', async () => {
      const input = {
        userId: 'user-1',
        botId: 'bot-1',
        title: 'Test Conversation'
      };

      const result = await chatService.createConversation(input);

      expect(result).toBeDefined();
      expect(result.conversation_id).toBeDefined();
      expect(result.title).toBe(input.title);
    });

    it('should throw error if bot not found', async () => {
      const input = {
        userId: 'user-1',
        botId: 'non-existent-bot'
      };

      await expect(
        chatService.createConversation(input)
      ).rejects.toThrow('Bot not found');
    });
  });
});
```

**前端测试**：
```typescript
// tests/components/MessageItem.test.ts
import { describe, it, expect } from 'vitest';
import { mount } from '@vue/test-utils';
import MessageItem from '@/components/chat/MessageItem.vue';

describe('MessageItem', () => {
  it('renders user message correctly', () => {
    const wrapper = mount(MessageItem, {
      props: {
        message: {
          id: '1',
          content: 'Hello',
          sender: 'user',
          timestamp: new Date()
        }
      }
    });

    expect(wrapper.find('.message-item').classes()).toContain('user');
    expect(wrapper.text()).toContain('Hello');
  });

  it('formats timestamp correctly', () => {
    const timestamp = new Date('2025-01-01T12:00:00');
    const wrapper = mount(MessageItem, {
      props: {
        message: {
          id: '1',
          content: 'Test',
          sender: 'bot',
          timestamp
        }
      }
    });

    expect(wrapper.find('.timestamp').text()).toBe('12:00');
  });
});
```

### 3.2 E2E 测试

```typescript
// tests/e2e/chat.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Chat Flow', () => {
  test.beforeEach(async ({ page }) => {
    // 登录
    await page.goto('http://localhost:5173/login');
    await page.fill('input[name="username"]', 'admin');
    await page.fill('input[name="password"]', 'password');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/chat');
  });

  test('should send and receive message', async ({ page }) => {
    // 选择 Bot
    await page.click('[data-testid="bot-list-item-0"]');

    // 输入消息
    await page.fill('[data-testid="message-input"]', 'Hello, bot!');
    await page.click('[data-testid="send-button"]');

    // 等待响应
    await page.waitForSelector('[data-testid="message-item-bot"]');

    // 验证消息显示
    const userMessage = page.locator('[data-testid="message-item-user"]').last();
    await expect(userMessage).toContainText('Hello, bot!');

    const botMessage = page.locator('[data-testid="message-item-bot"]').last();
    await expect(botMessage).toBeVisible();
  });

  test('should switch scenes correctly', async ({ page }) => {
    await page.click('[data-testid="scene-life"]');
    await expect(page.locator('[data-testid="bot-list"]')).toContainText('生活助手');
  });
});
```

---

## 🚀 Phase 4: 部署与监控

### 4.1 环境配置

```yaml
# docker-compose.prod.yml
version: '3.8'

services:
  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile.prod
    ports:
      - "80:80"
    environment:
      - VITE_API_BASE_URL=https://api.botagent.com
    depends_on:
      - backend

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile.prod
    ports:
      - "8915:8915"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=${DATABASE_URL}
      - JWT_SECRET=${JWT_SECRET}
      - REDIS_URL=redis://redis:6379
    depends_on:
      - postgres
      - redis

  postgres:
    image: postgres:16-alpine
    volumes:
      - postgres_data:/var/lib/postgresql/data
    environment:
      - POSTGRES_USER=${DB_USER}
      - POSTGRES_PASSWORD=${DB_PASSWORD}
      - POSTGRES_DB=bot_agent

  redis:
    image: redis:7-alpine
    volumes:
      - redis_data:/data

  prometheus:
    image: prom/prometheus
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
    ports:
      - "9090:9090"

  grafana:
    image: grafana/grafana
    volumes:
      - grafana_data:/var/lib/grafana
    ports:
      - "3001:3000"

volumes:
  postgres_data:
  redis_data:
  grafana_data:
```

### 4.2 CI/CD 流程

```yaml
# .github/workflows/deploy.yml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '22'
      - run: npm ci
      - run: npm run test
      - run: npm run test:e2e

  build-and-deploy:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Build frontend
        run: |
          cd frontend
          npm ci
          npm run build
      - name: Build backend
        run: |
          cd backend
          npm ci
          npm run build
      - name: Deploy to server
        uses: appleboy/ssh-action@master
        with:
          host: ${{ secrets.HOST }}
          username: ${{ secrets.USERNAME }}
          key: ${{ secrets.SSH_KEY }}
          script: |
            cd /var/www/bot-agent
            git pull
            docker-compose down
            docker-compose -f docker-compose.prod.yml up -d --build
```

### 4.3 监控指标

**Prometheus 配置**：
```yaml
# prometheus.yml
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'bot-agent-backend'
    static_configs:
      - targets: ['backend:8915']
    metrics_path: '/metrics'

  - job_name: 'postgres'
    static_configs:
      - targets: ['postgres:9187']

  - job_name: 'redis'
    static_configs:
      - targets: ['redis:9121']
```

**自定义指标**：
```typescript
// utils/metrics.ts
import { Counter, Histogram, register } from 'prom-client';

// HTTP 请求计数器
export const httpRequestsTotal = new Counter({
  name: 'http_requests_total',
  help: 'Total HTTP requests',
  labelNames: ['method', 'route', 'status_code']
});

// HTTP 请求延迟直方图
export const httpRequestDuration = new Histogram({
  name: 'http_request_duration_seconds',
  help: 'HTTP request duration',
  labelNames: ['method', 'route'],
  buckets: [0.1, 0.5, 1, 2, 5]
});

// 消息发送计数器
export const messagesSent = new Counter({
  name: 'messages_sent_total',
  help: 'Total messages sent',
  labelNames: ['bot_id']
});

// WebSocket 连接数
export const websocketConnections = new Counter({
  name: 'websocket_connections_total',
  help: 'Total WebSocket connections'
});
```

---

## 📊 风险评估与应对

### 高风险项

| 风险 | 影响 | 概率 | 应对措施 |
|------|------|------|----------|
| **数据丢失** | 高 | 低 | • 迁移前完整备份<br>• 使用事务保证数据一致性<br>• 灰度发布 |
| **功能缺失** | 高 | 中 | • 详细的功能测试用例<br>• 对比新旧系统功能清单<br>• 保留旧系统回退方案 |
| **性能下降** | 中 | 低 | • 性能基准测试<br>• 生产环境监控<br>• 慢查询优化 |
| **用户不适应** | 中 | 中 | • 逐步迁移用户<br>• 提供使用指南<br>• 收集反馈快速迭代 |

### 回滚方案

```bash
# 紧急回滚脚本
#!/bin/bash
# rollback.sh

echo "开始回滚..."

# 1. 停止新服务
docker-compose -f docker-compose.prod.yml down

# 2. 恢复旧代码
git checkout main~1  # 前一个版本

# 3. 恢复数据库备份（如需要）
psql -h localhost -U postgres -d bot_agent < backup_$(date +%Y%m%d).sql

# 4. 启动旧服务
docker-compose up -d

# 5. 验证服务
curl -f http://localhost:8915/health || exit 1

echo "回滚完成"
```

---

## 📈 成功指标

### 技术指标

| 指标 | 当前值 | 目标值 |
|------|--------|--------|
| 首屏加载时间 | ~3s | < 2s |
| API 响应时间 | ~500ms | < 200ms |
| 代码覆盖率 | ~20% | > 80% |
| TypeScript 覆盖率 | 50% (后端) | 100% (全栈) |
| 打包体积 | N/A | < 500KB (gzip) |

### 开发效率指标

| 指标 | 改善 |
|------|------|
| 新功能开发时间 | -40% |
| Bug 修复时间 | -50% |
| 代码审查时间 | -30% |
| Onboarding 时间 | -60% |

---

## 📚 附录

### A. 参考文档

- [Vue 3 官方文档](https://vuejs.org/)
- [Vite 官方文档](https://vitejs.dev/)
- [Pinia 官方文档](https://pinia.vuejs.org/)
- [Socket.io 文档](https://socket.io/docs/)
- [Prisma 最佳实践](https://www.prisma.io/docs/guides)

### B. 工具链清单

**开发工具**：
- VSCode + Volar
- Vue DevTools
- Postman
- Prisma Studio

**命令行工具**：
- `npm run dev` - 前端开发服务器
- `npm run build` - 生产构建
- `npm run test` - 运行测试
- `npm run lint` - 代码检查

### C. 团队协作建议

1. **代码审查**：所有 PR 必须经过至少 1 人审查
2. **分支策略**：使用 Git Flow（feature/develop/hotfix）
3. **提交规范**：使用 Conventional Commits
4. **文档先行**：重大功能先写设计文档

---

## 🎯 下一步行动

**立即可以开始的任务**：

1. ✅ 创建 `frontend-vue` 目录，初始化 Vite + Vue 3 项目
2. ✅ 配置 TypeScript、ESLint、Prettier
3. ✅ 创建基础布局组件（Layout、Header、Sidebar）
4. ✅ 搭建 Pinia stores（auth、chat、bot）
5. ✅ 迁移登录页面（最简单的页面）

**本周目标**：
- 完成基础框架搭建
- 迁移登录页面
- 配置好开发环境

**需要讨论的问题**：
1. 是否需要保持新旧系统并行运行一段时间？
2. 是否有预算购买云服务（Vercel/阿里云）？
3. 团队是否有 Vue 开发经验，是否需要培训？

---

**文档版本**: v1.0
**创建日期**: 2025-02-22
**最后更新**: 2025-02-22
**维护者**: Bot Agent Team
