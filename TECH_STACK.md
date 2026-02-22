# Bot Agent Platform - 技术栈文档

## 📋 目录

- [项目概述](#项目概述)
- [技术架构图](#技术架构图)
- [后端技术栈](#后端技术栈)
- [前端技术栈](#前端技术栈)
- [数据库设计](#数据库设计)
- [核心功能模块](#核心功能模块)
- [开发工具链](#开发工具链)
- [部署方案](#部署方案)
- [性能优化](#性能优化)
- [安全机制](#安全机制)

---

## 项目概述

**Bot Agent Platform** 是一个智能对话机器人管理平台，支持多场景 Bot、群组协作、工作流自动化等功能。

### 核心特性
- 🤖 **多 Bot 管理** - 工作/生活/恋爱等多场景独立 Bot
- 👥 **群组协作** - 多 Bot 智能路由、协同工作
- ⏰ **工作流自动化** - Cron 定时任务、事件触发
- 🧠 **记忆系统** - 长期记忆存储、上下文理解
- 📚 **知识库** - 文件上传、向量化检索
- 📊 **数据分析** - 使用统计、趋势分析

### 代码规模
- **后端代码**: ~3,800 行 TypeScript
- **前端代码**: ~2,300 行 JavaScript + CSS
- **数据库表**: 11 张核心表

---

## 技术架构图

```
┌─────────────────────────────────────────────────────────────┐
│                         用户层                               │
├─────────────────────────────────────────────────────────────┤
│  浏览器 (Chrome/Edge/Firefox)                                │
└──────────────────────┬──────────────────────────────────────┘
                       │ HTTP/REST API
                       │
┌──────────────────────▼──────────────────────────────────────┐
│                      前端层 (静态托管)                        │
├─────────────────────────────────────────────────────────────┤
│  HTML5 + CSS3 + Vanilla JavaScript                          │
│  ├─ login.html         (登录页)                             │
│  ├─ bot-chat-ui-v2.html (聊天界面)                          │
│  └─ bot-admin-ui-v2.html (管理后台)                         │
└──────────────────────┬──────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────┐
│                    后端层 (Node.js + Express)                │
├─────────────────────────────────────────────────────────────┤
│  API Gateway (Express.js)                                   │
│  ├─ Middleware Layer (CORS, Auth, Encoding)                 │
│  ├─ Routes (auth, bots, chat, groups, workflows...)        │
│  └─ Services (AI, Chat, Scheduler, Memory...)              │
└──────────┬─────────────────────────────┬───────────────────┘
           │                             │
┌──────────▼──────────┐      ┌──────────▼──────────┐
│  PostgreSQL 16     │      │   Redis 7           │
│  (主数据库)         │      │   (缓存/队列)        │
└─────────────────────┘      └─────────────────────┘
```

---

## 后端技术栈

### 运行时环境

| 技术 | 版本 | 用途 |
|------|------|------|
| **Node.js** | 22.x | JavaScript 运行时 |
| **TypeScript** | 5.7.2 | 类型安全的开发语言 |
| **Express.js** | 4.21.2 | Web 应用框架 |

### 核心框架与库

#### Web 框架
```json
{
  "express": "^4.21.2",           // HTTP 服务器
  "cors": "^2.8.5",               // 跨域资源共享
  "dotenv": "^16.4.7"             // 环境变量管理
}
```

#### 数据库 ORM
```json
{
  "@prisma/client": "^5.22.0",    // Prisma 客户端
  "prisma": "^5.22.0"             // Prisma CLI
}
```

#### 认证与安全
```json
{
  "jsonwebtoken": "^9.0.2",       // JWT Token 生成
  "bcrypt": "^5.1.1"              // 密码加密
}
```

#### 任务调度
```json
{
  "node-schedule": "^2.1.1",      // 定时任务调度
  "cron-parser": "^5.5.0"         // Cron 表达式解析
}
```

#### 工具库
```json
{
  "iconv-lite": "^0.7.0"          // 字符编码转换
}
```

### 开发工具

| 工具 | 版本 | 用途 |
|------|------|------|
| **ts-node** | 10.9.2 | 直接运行 TypeScript |
| **tsc** | 5.7.2 | TypeScript 编译器 |
| **PM2** | Latest | 生产环境进程管理 |
| **Vitest** | 4.0.18 | 单元测试框架 |
| **Playwright** | 1.58.2 | E2E 测试框架 |

### 后端项目结构

```
backend/
├── src/
│   ├── app.ts                    # 应用入口
│   ├── middleware/               # 中间件
│   │   └── auth.ts              # JWT 认证中间件
│   ├── routes/                   # API 路由
│   │   ├── auth.ts              # 认证相关 (/api/auth/*)
│   │   ├── bots.ts              # Bot 管理 (/api/bots/*)
│   │   ├── chat.ts              # 聊天接口 (/api/chat/*)
│   │   ├── groups.ts            # 群组管理 (/api/groups/*)
│   │   ├── schedule.ts          # 工作流调度 (/api/schedule/*)
│   │   ├── knowledge.ts         # 知识库 (/api/knowledge/*)
│   │   ├── templates.ts         # 模板管理 (/api/templates/*)
│   │   ├── analytics.ts         # 数据分析 (/api/analytics/*)
│   │   ├── logs.ts              # 日志导出 (/api/logs/*)
│   │   ├── stats.ts             # 统计数据 (/api/stats/*)
│   │   └── system.ts            # 系统设置 (/api/system/*)
│   ├── services/                 # 业务逻辑层
│   │   ├── auth.service.ts      # 认证服务（含测试模式）
│   │   ├── bot.service.ts       # Bot 业务逻辑
│   │   ├── chat.service.ts      # 聊天处理逻辑
│   │   ├── ai.service.ts        # AI 模型调用
│   │   ├── tools.service.ts     # 工具调用
│   │   ├── scheduler.service.ts # 定时任务调度器
│   │   └── bot-memory-archive.service.ts  # 记忆归档
│   └── utils/                    # 工具函数
│       ├── encoding.ts          # UTF-8 编码处理
│       └── json-store.ts        # JSON 存储
├── prisma/
│   ├── schema.prisma            # 数据库模型定义
│   └── seed.ts                  # 数据库种子文件
├── dist/                        # 编译输出目录
├── logs/                        # PM2 日志目录
├── .env                         # 环境变量配置
├── package.json
└── tsconfig.json
```

### API 设计风格

**RESTful API + JWT 认证**

```
认证流程:
POST /api/auth/login      → 获取 access_token + refresh_token
POST /api/auth/refresh    → 刷新 access_token
POST /api/auth/logout     → 撤销 refresh_token

资源管理:
GET    /api/bots          → 获取 Bot 列表
POST   /api/bots          → 创建 Bot
PUT    /api/bots/:id      → 更新 Bot
DELETE /api/bots/:id      → 删除 Bot

业务操作:
POST /api/chat/send       → 发送消息
GET  /api/chat/history    → 获取历史记录
```

---

## 前端技术栈

### 核心技术

**Vanilla JavaScript (无框架)**

采用原生 JavaScript 实现，具有以下优势：
- ✅ 轻量级，无构建工具依赖
- ✅ 加载速度快，无运行时开销
- ✅ 易于维护和调试
- ✅ 可以直接在浏览器中运行

### HTML5 页面

| 页面 | 文件 | 功能 |
|------|------|------|
| **登录页** | `login.html` | 用户登录、JWT Token 管理 |
| **聊天界面** | `bot-chat-ui-v2.html` | 单 Bot 聊天、群组协作 |
| **管理后台** | `bot-admin-ui-v2.html` | Bot 管理、工作流配置、数据统计 |

### CSS3 样式

| 样式文件 | 功能 |
|---------|------|
| `login.css` | 登录页样式（渐变背景、表单动效） |
| `chat.css` | 聊天界面（消息气泡、侧边栏） |
| `admin.css` | 管理后台（表格、图表、表单） |

**设计特点**：
- 🎨 现代化 UI 设计（渐变色、圆角、阴影）
- 📱 响应式布局（适配桌面和移动端）
- ✨ 流畅的动画效果
- 🌙 支持深色模式（可扩展）

### JavaScript 模块

#### 核心库 (`assets/lib/`)

**api-client.js** - HTTP 请求封装
```javascript
class ApiClient {
  constructor(baseURL)
  async request(endpoint, options)
  async get/post/put/patch/delete(endpoint, data)
  async refreshAccessToken()
  setTokens(accessToken, refreshToken)
  clearTokens()
}
```

**auth-manager.js** - 认证管理
```javascript
class AuthManager extends ApiClient {
  async login(username, password)
  async logout()
  async getCurrentUser()
  isAuthenticated()
}
```

**bot-client.js** - Bot 交互
```javascript
class BotClient extends ApiClient {
  async sendMessage(conversationId, content)
  async getHistory(conversationId)
  async getBotsList()
  async createConversation(botId)
}
```

#### 页面脚本 (`assets/scripts/`)

**login.js** (55 行)
- 表单验证
- 登录请求
- Token 存储
- 错误提示

**chat.js** (800+ 行)
- 场景切换（工作/生活/恋爱）
- Bot 列表管理
- 消息发送/接收
- 实时打字效果
- 群组路由逻辑

**admin.js** (1100+ 行)
- Bot CRUD 操作
- 工作流配置（Cron 编辑器）
- 群组管理
- 数据可视化
- 日志导出
- 知识库上传

### 前端状态管理

**简单对象模式**（无 Redux/Vuex）

```javascript
const state = {
  botsByScene: { work: [], life: [], love: [] },
  selectedScene: 'work',
  selectedBotId: null,
  selectedConversationId: null,
  isComposing: false
};
```

**优点**：简单直接，适合中小型应用

---

## 数据库设计

### 数据库选型

**PostgreSQL 16** - 主数据库
- ACID 事务支持
- JSONB 类型（存储灵活配置）
- 全文搜索能力
- 强大的关联查询

**Redis 7** - 缓存/队列
- Session 存储
- 消息队列
- 实时在线状态

### 数据模型

#### 核心表（11 张）

```sql
-- 1. 用户表
User {
  user_id: PK
  username: UNIQUE
  email: UNIQUE
  password_hash: VARCHAR
  avatar: VARCHAR?
  role: VARCHAR (admin|user)
  created_at: TIMESTAMP
  updated_at: TIMESTAMP
}

-- 2. Bot 表
Bot {
  bot_id: PK
  name: VARCHAR
  avatar: VARCHAR?
  type: VARCHAR (work|life|love|group|sop)
  scene: VARCHAR
  status: VARCHAR (online|offline|suspended)
  description: TEXT?
  config: JSONB          -- AI 模型配置
  created_at: TIMESTAMP
  updated_at: TIMESTAMP
}

-- 3. 对话表
Conversation {
  conversation_id: PK
  bot_id: FK -> Bot
  user_id: FK -> User
  title: VARCHAR?
  created_at: TIMESTAMP
  updated_at: TIMESTAMP
}

-- 4. 消息表
Message {
  message_id: PK
  conversation_id: FK -> Conversation
  sender_type: VARCHAR (user|bot|system)
  sender_id: VARCHAR
  content: TEXT
  metadata: JSONB         -- { model, usage, mentioned_bots }
  timestamp: TIMESTAMP
}

-- 5. 群组表
Group {
  group_id: PK
  name: VARCHAR
  type: VARCHAR (personal|team|public)
  description: TEXT?
  routing_strategy: VARCHAR (keyword_match|ai_judge|round_robin)
  conversation_mode: VARCHAR (single_turn|multi_turn)
  created_by: VARCHAR
  created_at: TIMESTAMP
}

-- 6. 群组成员表
GroupMember {
  id: PK (AUTO)
  group_id: FK -> Group
  bot_id: FK -> Bot
  role: VARCHAR?          -- e.g., "效率专家", "生活助手"
  permissions: JSONB      -- ["read", "write", "mention", "admin"]
  trigger_keywords: TEXT[] -- ["任务", "工作"]
  priority: INTEGER
  UNIQUE(group_id, bot_id)
}

-- 7. 群组消息表
GroupMessage {
  message_id: PK
  group_id: FK -> Group
  sender_type: VARCHAR (user|bot)
  sender_id: VARCHAR
  content: TEXT
  mentioned_bots: TEXT[]   -- [bot_id1, bot_id2]
  timestamp: TIMESTAMP
}

-- 8. 工作流表
Workflow {
  workflow_id: PK
  bot_id: FK -> Bot
  name: VARCHAR
  description: TEXT?
  triggers: JSONB          -- [{ type, expression, timezone }]
  workflow_steps: JSONB    -- [{ step, action, content }]
  enabled: BOOLEAN
  created_at: TIMESTAMP
  updated_at: TIMESTAMP
}

-- 9. 工作流执行记录表
WorkflowExecution {
  execution_id: PK
  workflow_id: FK -> Workflow
  status: VARCHAR (pending|running|completed|failed|cancelled)
  trigger_time: TIMESTAMP
  started_at: TIMESTAMP?
  completed_at: TIMESTAMP?
  result: JSONB?
  error_message: TEXT?
}

-- 10. 记忆表
Memory {
  memory_id: PK
  bot_id: FK -> Bot
  user_id: FK -> User
  type: VARCHAR (conversation|preference|fact|instruction)
  content: TEXT
  importance: FLOAT (0-1)
  created_at: TIMESTAMP
  updated_at: TIMESTAMP
}

-- 11. 知识库文件表
KnowledgeFile {
  file_id: PK
  bot_id: FK -> Bot?
  filename: VARCHAR
  file_size: INTEGER
  status: VARCHAR (uploading|processing|ready|failed)
  error_message: TEXT?
  created_at: TIMESTAMP
  updated_at: TIMESTAMP
}

-- 12. 知识库分块表
KnowledgeChunk {
  chunk_id: PK
  file_id: FK -> KnowledgeFile
  chunk_index: INTEGER
  content: TEXT
  created_at: TIMESTAMP
}

-- 13. Refresh Token 表
RefreshToken {
  id: PK (AUTO UUID)
  token: UNIQUE VARCHAR
  user_id: FK -> User
  expires_at: TIMESTAMP
  created_at: TIMESTAMP
  revoked_at: TIMESTAMP?
}
```

### ORM 配置

**Prisma Schema**

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// 模型定义...
```

**优势**：
- 类型安全的数据库访问
- 自动生成 TypeScript 类型
- 迁移管理
- 查询构建器

---

## 核心功能模块

### 1. 认证授权模块

**JWT 双 Token 机制**

```
┌─────────────┐
│  用户登录   │
└──────┬──────┘
       │
       ▼
┌─────────────────────────────────┐
│  验证用户名密码                 │
│  ├─ 数据库模式：Prisma 查询     │
│  └─ 测试模式：硬编码 admin      │
└──────┬──────────────────────────┘
       │
       ▼
┌─────────────────────────────────┐
│  生成 Token                     │
│  ├─ access_token (15分钟)       │
│  └─ refresh_token (7天)         │
└──────┬──────────────────────────┘
       │
       ▼
┌─────────────────────────────────┐
│  存储到数据库/内存              │
└─────────────────────────────────┘
```

**中间件保护**

```typescript
// middleware/auth.ts
export const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.sendStatus(401);

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
};
```

### 2. AI 对话模块

**支持的 AI 模型**

- ✅ OpenAI GPT 系列
- ✅ SiliconFlow DeepSeek 系列
- 🔮 可扩展其他模型

**对话流程**

```
用户发送消息
    │
    ▼
加载对话历史
    │
    ▼
构建 Prompt（系统提示词 + 历史）
    │
    ▼
调用 AI API (streaming)
    │
    ▼
保存消息到数据库
    │
    ▼
更新记忆系统
    │
    ▼
返回给用户
```

**Streaming 响应**

```typescript
async sendMessage(userMessage: string) {
  const response = await fetch(aiApiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages: history,
      stream: true
    })
  });

  // 处理流式响应
  const reader = response.body.getReader();
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    // 解析 SSE 数据
    const chunk = decoder.decode(value);
    // 发送给前端
  }
}
```

### 3. 工作流调度模块

**Cron 表达式支持**

```typescript
import schedule from 'node-schedule';

// 每天早上 8 点
'0 8 * * *'

// 每周五下午 5 点
'0 17 * * 5'

// 每小时
'0 * * * *'
```

**调度器架构**

```
┌─────────────────────────────────┐
│  SchedulerService               │
│  ├─ loadTasks()                 │
│  ├─ scheduleTask()              │
│  └─ executeTask()               │
└──────────┬──────────────────────┘
           │
           ▼
┌─────────────────────────────────┐
│  node-schedule                 │
│  ├─ Job 1: 早安问候             │
│  ├─ Job 2: 工作总结             │
│  └─ Job 3: 健康提醒             │
└─────────────────────────────────┘
```

### 4. 群组协作模块

**路由策略**

1. **关键词匹配** (keyword_match)
   ```javascript
   if (message.includes("工作")) {
     return workBot;
   }
   ```

2. **AI 判断** (ai_judge)
   ```javascript
   const analysis = await ai.analyze(message);
   return analysis.recommendedBot;
   ```

3. **轮询** (round_robin)
   ```javascript
   const bot = bots[currentIndex % bots.length];
   currentIndex++;
   return bot;
   ```

4. **全员广播** (broadcast)
   ```javascript
   return bots.filter(bot => bot.canRespond(message));
   ```

### 5. 记忆系统

**记忆类型**

- `conversation` - 对话历史摘要
- `preference` - 用户偏好设置
- `fact` - 重要事实（生日、爱好）
- `instruction` - 用户指令

**记忆检索**

```typescript
async getRelevantMemories(botId: string, query: string) {
  // 1. 向量化查询
  const queryVector = await embed(query);

  // 2. 相似度搜索
  const memories = await prisma.memory.findMany({
    where: {
      bot_id: botId,
      importance: { gte: 0.5 }
    },
    orderBy: {
      // 使用向量相似度排序
    }
  });

  return memories;
}
```

---

## 开发工具链

### 本地开发

```bash
# 后端开发
cd backend
npm run dev          # ts-node 热重载

# 前端开发（静态文件）
# 直接在浏览器打开 frontend/public/*.html

# 数据库
docker-compose up -d

# Prisma 操作
npx prisma studio    # 可视化数据库
npx prisma db push   # 同步 Schema
npx prisma db seed   # 填充种子数据
```

### 代码质量

| 工具 | 用途 |
|------|------|
| **ESLint** | 代码规范检查 |
| **Prettier** | 代码格式化 |
| **EditorConfig** | 编辑器配置统一 |

### 测试框架

```bash
# 单元测试
npm run test          # Vitest

# E2E 测试
npm run test:e2e      # Playwright
```

---

## 部署方案

### 生产环境架构

```
┌─────────────────────────────────────────────┐
│              Nginx (反向代理)                │
│              HTTPS (Let's Encrypt)          │
└─────────────────┬───────────────────────────┘
                  │
    ┌─────────────┴─────────────┐
    │                           │
┌───▼──────┐              ┌─────▼──────┐
│  PM2     │              │  静态文件   │
│  后端    │              │  前端托管   │
│  (Cluster)│              └────────────┘
└───┬──────┘
    │
    ├──────────┬──────────┐
    │          │          │
┌───▼───┐  ┌──▼───┐  ┌───▼────┐
│ PG 16 │  │ Redis│  │ Docker  │
└───────┘  └──────┘  └─────────┘
```

### PM2 配置

```javascript
// ecosystem.config.js
module.exports = {
  apps: [{
    name: 'bot-agent-platform',
    script: './dist/app.js',
    instances: 'max',      // Cluster 模式
    exec_mode: 'cluster',
    autorestart: true,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 8915
    }
  }]
};
```

### Docker Compose

```yaml
services:
  postgres:
    image: postgres:16-alpine
    restart: always
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    restart: always
    volumes:
      - redis_data:/data
```

### 环境变量

```env
# .env
DATABASE_URL="postgresql://user:pass@localhost:5432/bot_agent"
JWT_SECRET="your-secret-key"
PORT=8915
FRONTEND_URL="https://yourdomain.com"
SILICONFLOW_API_KEY="sk-..."
OPENAI_API_KEY="sk-..."
```

---

## 性能优化

### 后端优化

1. **连接池** - Prisma 默认连接池管理
2. **查询优化** - 使用 `select` 字段过滤
3. **缓存策略** - Redis 缓存热点数据
4. **异步处理** - 非阻塞 I/O

### 前端优化

1. **代码分割** - 按需加载 JS 文件
2. **CSS 压缩** - 生产环境压缩
3. **静态资源 CDN** - 可扩展到 CDN
4. **防抖/节流** - 搜索输入优化

### 数据库优化

1. **索引优化**
   ```sql
   CREATE INDEX idx_message_timestamp ON Message(timestamp DESC);
   CREATE INDEX idx_bot_status ON Bot(status);
   ```

2. **查询优化**
   ```typescript
   // 只查询需要的字段
   const messages = await prisma.message.findMany({
     select: {
       message_id: true,
       content: true,
       timestamp: true
     },
     take: 50,
     orderBy: { timestamp: 'desc' }
   });
   ```

---

## 安全机制

### 认证安全

- ✅ **密码加密** - bcrypt 哈希（salt rounds: 10）
- ✅ **JWT Token** - 短期 access_token + 长期 refresh_token
- ✅ **Token 撤销** - refresh_token 存储在数据库
- ✅ **测试模式降级** - 数据库不可用时使用测试账号

### API 安全

- ✅ **CORS 配置** - 白名单域名
- ✅ **Rate Limiting** - 可扩展（需添加）
- ✅ **输入验证** - Prisma Schema 验证
- ✅ **SQL 注入防护** - Prisma ORM 自动防护

### 数据安全

- ✅ **HTTPS** - 生产环境强制 HTTPS
- ✅ **环境变量** - 敏感信息不提交到 Git
- ✅ **日志脱敏** - 日志中隐藏敏感信息

---

## 扩展性设计

### 水平扩展

- **后端** - PM2 Cluster 模式（多进程）
- **数据库** - PostgreSQL 主从复制
- **缓存** - Redis 哨兵模式

### 垂直扩展

- **服务器升级** - 增加 CPU/内存
- **数据库优化** - 索引、分区、归档

### 功能扩展

- **插件系统** - 工具调用机制
- **Webhook** - 事件通知
- **API 开放** - 第三方集成

---

## 技术债务与改进计划

### 当前技术债务

1. **前端无框架** - 维护成本高，建议迁移到 Vue 3 / React
2. **测试覆盖不足** - 需要补充单元测试和 E2E 测试
3. **错误处理不完善** - 需要统一错误处理中间件
4. **日志系统** - 需要结构化日志（Winston / Pino）

### 改进计划

#### 短期（1-3 个月）
- [ ] 添加 API 文档（Swagger / OpenAPI）
- [ ] 完善错误处理和日志
- [ ] 添加单元测试（覆盖率 > 80%）
- [ ] 性能监控（APM 工具）

#### 中期（3-6 个月）
- [ ] 前端框架迁移（Vue 3 + Vite）
- [ ] 实时通信（WebSocket / Server-Sent Events）
- [ ] 消息队列（RabbitMQ / Bull）
- [ ] 分布式缓存（Redis Cluster）

#### 长期（6-12 个月）
- [ ] 微服务架构拆分
- [ ] GraphQL API
- [ ] 多语言支持（i18n）
- [ ] 移动端应用（React Native / Flutter）

---

## 总结

### 技术栈优势

| 优势 | 说明 |
|------|------|
| **轻量级** | 前端无框架，后端简洁架构 |
| **易部署** - 一键启动（Docker + PM2） | |
| **可维护** - TypeScript 类型安全 | |
| **可扩展** - 模块化设计，易于添加功能 | |
| **成本低** - 开源技术栈，无商业依赖 | |

### 适用场景

- ✅ 个人 Bot 管理平台
- ✅ 小团队协作工具
- ✅ AI 应用原型开发
- ✅ 学习 Node.js 全栈开发

### 不适用场景

- ❌ 大规模高并发（需要重构）
- ❌ 复杂前端交互（需要框架）
- ❌ 实时性要求极高（需要 WebSocket）

---

## 相关文档

- [README.md](./README.md) - 快速开始指南
- [开机自启配置说明.md](./开机自启配置说明.md) - 部署文档
- [CLAUDE.md](./CLAUDE.md) - 项目开发规范
- [product-spec.md](./product-spec.md) - 产品功能规格

---

**文档版本**: v1.0
**最后更新**: 2026-02-22
**维护者**: Bot Agent Team
