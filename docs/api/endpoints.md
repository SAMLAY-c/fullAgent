# API接口清单文档

本文档列出 Bot Agent 系统的所有 API 接口。

## 目录

- [认证说明](#认证说明)
- [认证模块](#认证模块)
- [仪表盘模块](#仪表盘模块)
- [Bot管理模块](#bot管理模块)
- [工作流模块](#工作流模块)
- [群聊模块](#群聊模块)
- [记忆模块](#记忆模块)
- [知识库模块](#知识库模块)
- [数据分析模块](#数据分析模块)

---

## 认证说明

所有API请求需要在请求头中携带认证Token：

```http
Authorization: Bearer {your_token}
```

---

## 认证模块

### 1. 用户登录

```http
POST /api/auth/login
```

**请求Body**：

```json
{
  "username": "admin",
  "password": "your_password"
}
```

**响应示例**：

```json
{
  "access_token": "eyJ...",
  "refresh_token": "eyJ...",
  "token_type": "Bearer",
  "expires_in": 7200,
  "user": {
    "user_id": "user_001",
    "username": "admin",
    "role": "admin"
  }
}
```

---

### 2. 刷新令牌

```http
POST /api/auth/refresh
```

**请求Body**：

```json
{
  "refresh_token": "eyJ..."
}
```

---

### 3. 获取当前用户

```http
GET /api/auth/me
```

---

### 4. 退出登录

```http
POST /api/auth/logout
```

**响应**：204 No Content

---

## 仪表盘模块

### 1. 获取仪表盘统计数据

获取系统关键指标，包括活跃Bot数、运行中的工作流、活跃群聊数、今日对话次数。

```http
GET /api/dashboard/stats
```

**请求参数**：无

**响应示例**：

```json
{
  "active_bots": 8,
  "running_workflows": 12,
  "active_groups": 5,
  "today_conversations": 156
}
```

---

### 2. 获取最近活动记录

获取系统最近的活动日志，包括工作流执行、新消息、警告等。

```http
GET /api/dashboard/activities
```

**请求参数**：

| 参数名 | 类型 | 必填 | 说明 | 默认值 |
|--------|------|------|------|--------|
| limit | integer | 否 | 返回记录数量（1-100） | 20 |

**响应示例**：

```json
{
  "activities": [
    {
      "execution_id": "exec_001",
      "title": "工作流执行成功",
      "description": "每日工作启动流程 已完成",
      "type": "success",
      "icon": "✓",
      "time": "8:00 AM",
      "timestamp": "2024-01-15T08:00:00Z"
    }
  ]
}
```

---

## Bot管理模块

### 1. 获取Bot列表

获取当前用户的所有Bot，支持按类型和状态筛选。

```http
GET /api/bots
```

**请求参数**：

| 参数名 | 类型 | 必填 | 说明 | 默认值 |
|--------|------|------|------|--------|
| type | string | 否 | 按类型筛选：work/life/love/group/sop | - |
| status | string | 否 | 按状态筛选：online/offline/suspended | - |
| page | integer | 否 | 页码 | 1 |
| page_size | integer | 否 | 每页数量（1-100） | 20 |

**响应示例**：

```json
{
  "bots": [
    {
      "bot_id": "work_bot_001",
      "name": "工作伙伴",
      "avatar": "💼",
      "type": "work",
      "scene": "work",
      "status": "online",
      "description": "专业的办公助手",
      "created_at": "2024-01-15T08:00:00Z",
      "updated_at": "2024-01-15T08:00:00Z"
    }
  ],
  "total": 8,
  "page": 1,
  "page_size": 20
}
```

---

### 2. 创建新Bot

创建一个新的Bot实例。

```http
POST /api/bots
```

**请求Body**：

```json
{
  "name": "写作助手",
  "avatar": "✍️",
  "type": "work",
  "scene": "work",
  "description": "专业的写作辅助AI助手",
  "config": {
    "model": "gpt-4",
    "temperature": 0.7,
    "max_tokens": 2000
  }
}
```

**响应示例**：

```json
{
  "bot_id": "work_bot_002",
  "name": "写作助手",
  "avatar": "✍️",
  "type": "work",
  "scene": "work",
  "status": "online",
  "description": "专业的写作辅助AI助手",
  "config": {
    "model": "gpt-4",
    "temperature": 0.7,
    "max_tokens": 2000
  },
  "created_at": "2024-01-15T08:00:00Z",
  "updated_at": "2024-01-15T08:00:00Z"
}
```

---

### 3. 获取Bot详情

```http
GET /api/bots/{bot_id}
```

**路径参数**：

| 参数名 | 类型 | 说明 |
|--------|------|------|
| bot_id | string | Bot ID |

**响应示例**：同创建Bot响应

---

### 4. 更新Bot信息

```http
PUT /api/bots/{bot_id}
```

**请求Body**：

```json
{
  "name": "工作伙伴Pro",
  "description": "升级版办公助手",
  "config": {
    "temperature": 0.8
  }
}
```

---

### 5. 删除Bot

```http
DELETE /api/bots/{bot_id}
```

**响应**：204 No Content

---

### 6. 更新Bot状态

启用/禁用/暂停Bot。

```http
PUT /api/bots/{bot_id}/status
```

**请求Body**：

```json
{
  "status": "online"
}
```

**状态值**：`online`（在线）| `offline`（离线）| `suspended`（暂停）

---

### 7. 获取Bot对话历史

```http
GET /api/bots/{bot_id}/conversations
```

**请求参数**：

| 参数名 | 类型 | 必填 | 说明 | 默认值 |
|--------|------|------|------|--------|
| limit | integer | 否 | 返回数量 | 50 |
| before | string | 否 | 获取此时间戳之前的消息（ISO 8601） | - |

**响应示例**：

```json
{
  "conversations": [
    {
      "message_id": "msg_001",
      "conversation_id": "conv_001",
      "sender_type": "user",
      "sender_id": "user_001",
      "content": "你好",
      "timestamp": "2024-01-15T08:00:00Z"
    },
    {
      "message_id": "msg_002",
      "conversation_id": "conv_001",
      "sender_type": "bot",
      "sender_id": "work_bot_001",
      "content": "你好！有什么可以帮助你的吗？",
      "timestamp": "2024-01-15T08:00:01Z"
    }
  ],
  "has_more": true
}
```

---

## 工作流模块

### 1. 获取工作流列表

```http
GET /api/workflows
```

**请求参数**：

| 参数名 | 类型 | 必填 | 说明 | 默认值 |
|--------|------|------|------|--------|
| bot_id | string | 否 | 筛选指定Bot的工作流 | - |
| enabled | boolean | 否 | 筛选启用状态 | - |
| page | integer | 否 | 页码 | 1 |

**响应示例**：

```json
{
  "workflows": [
    {
      "sop_id": "sop_001",
      "bot_id": "work_bot_001",
      "name": "每日工作启动流程",
      "description": "每天8点自动发送工作计划",
      "enabled": true,
      "created_at": "2024-01-15T08:00:00Z",
      "updated_at": "2024-01-15T08:00:00Z"
    }
  ],
  "total": 12
}
```

---

### 2. 创建工作流

```http
POST /api/workflows
```

**请求Body**：

```json
{
  "bot_id": "work_bot_001",
  "name": "每日工作启动流程",
  "description": "每天8点自动发送工作计划",
  "triggers": [
    {
      "type": "cron",
      "expression": "0 8 * * *",
      "timezone": "Asia/Shanghai"
    }
  ],
  "workflow_steps": [
    {
      "step": 1,
      "action": "send_message",
      "content": "早上好！今天是{date}",
      "ai_generate": true
    },
    {
      "step": 2,
      "action": "fetch_calendar",
      "source": "google_calendar"
    }
  ],
  "enabled": true
}
```

**响应示例**：

```json
{
  "sop_id": "sop_001",
  "bot_id": "work_bot_001",
  "name": "每日工作启动流程",
  "description": "每天8点自动发送工作计划",
  "triggers": [...],
  "workflow_steps": [...],
  "enabled": true,
  "created_at": "2024-01-15T08:00:00Z",
  "updated_at": "2024-01-15T08:00:00Z"
}
```

---

### 3. 获取工作流详情

```http
GET /api/workflows/{workflow_id}
```

**响应示例**：同创建工作流响应

---

### 4. 更新工作流

```http
PUT /api/workflows/{workflow_id}
```

**请求Body**：同创建工作流（所有字段可选）

---

### 5. 删除工作流

```http
DELETE /api/workflows/{workflow_id}
```

**响应**：204 No Content

---

### 6. 启用/禁用工作流

```http
PUT /api/workflows/{workflow_id}/enable
```

**请求Body**：

```json
{
  "enabled": true
}
```

---

### 7. 手动执行工作流

```http
POST /api/workflows/{workflow_id}/execute
```

**请求Body**：

```json
{
  "params": {
    "date": "2024-01-15"
  }
}
```

**响应示例**：

```json
{
  "execution_id": "exec_001",
  "sop_id": "sop_001",
  "status": "running",
  "started_at": "2024-01-15T08:00:00Z"
}
```

---

### 8. 获取工作流执行历史

```http
GET /api/workflows/{workflow_id}/executions
```

**请求参数**：

| 参数名 | 类型 | 必填 | 说明 | 默认值 |
|--------|------|------|------|--------|
| status | string | 否 | 筛选状态：pending/running/completed/failed/cancelled | - |
| limit | integer | 否 | 返回数量 | 20 |

**响应示例**：

```json
{
  "executions": [
    {
      "execution_id": "exec_001",
      "sop_id": "sop_001",
      "trigger_time": "2024-01-15T08:00:00Z",
      "status": "completed",
      "started_at": "2024-01-15T08:00:01Z",
      "completed_at": "2024-01-15T08:00:03Z",
      "duration": "2.3s"
    }
  ],
  "total": 127
}
```

---

### 9. 获取执行详情

```http
GET /api/workflows/{workflow_id}/executions/{execution_id}
```

**响应示例**：

```json
{
  "execution_id": "exec_001",
  "sop_id": "sop_001",
  "trigger_time": "2024-01-15T08:00:00Z",
  "status": "completed",
  "result": {
    "message_sent": true,
    "generated_content": "今日待办：1. 完成项目报告..."
  },
  "started_at": "2024-01-15T08:00:01Z",
  "completed_at": "2024-01-15T08:00:03Z",
  "duration": "2.3s",
  "steps": [
    {
      "step": 1,
      "action": "send_message",
      "status": "completed",
      "result": {}
    }
  ]
}
```

---

## 群聊模块

### 1. 获取群聊列表

```http
GET /api/groups
```

**请求参数**：

| 参数名 | 类型 | 必填 | 说明 | 默认值 |
|--------|------|------|------|--------|
| type | string | 否 | 筛选类型：personal/team/public | - |
| status | string | 否 | 筛选状态：active/inactive/archived | - |

**响应示例**：

```json
{
  "groups": [
    {
      "group_id": "group_001",
      "name": "创业顾问团",
      "type": "team",
      "description": "CEO、CTO、CMO三位专家Bot协同",
      "routing_strategy": "keyword_match",
      "conversation_mode": "multi_turn",
      "status": "active",
      "created_at": "2024-01-15T08:00:00Z",
      "updated_at": "2024-01-15T08:00:00Z"
    }
  ]
}
```

---

### 2. 创建群聊

```http
POST /api/groups
```

**请求Body**：

```json
{
  "name": "创业顾问团",
  "type": "team",
  "description": "CEO、CTO、CMO三位专家Bot协同",
  "routing_strategy": "keyword_match",
  "conversation_mode": "multi_turn"
}
```

**路由策略**：
- `keyword_match` - 关键词匹配
- `ai_judge` - AI判断
- `round_robin` - 轮询
- `broadcast` - 全员响应

**对话模式**：
- `single_turn` - 单轮对话
- `multi_turn` - 多轮对话

---

### 3. 获取群聊详情

```http
GET /api/groups/{group_id}
```

**响应示例**：

```json
{
  "group_id": "group_001",
  "name": "创业顾问团",
  "type": "team",
  "description": "CEO、CTO、CMO三位专家Bot协同",
  "routing_strategy": "keyword_match",
  "conversation_mode": "multi_turn",
  "status": "active",
  "created_by": "user_001",
  "members": [
    {
      "id": 1,
      "group_id": "group_001",
      "bot_id": "ceo_bot_001",
      "role": "CEO",
      "permissions": ["read", "write", "mention"],
      "trigger_keywords": ["战略", "决策", "资源"],
      "priority": 1
    }
  ],
  "stats": {
    "conversation_count": 234,
    "response_rate": "97%",
    "response_speed": "2.8s"
  },
  "created_at": "2024-01-15T08:00:00Z",
  "updated_at": "2024-01-15T08:00:00Z"
}
```

---

### 4. 更新群聊信息

```http
PUT /api/groups/{group_id}
```

**请求Body**：

```json
{
  "name": "创业顾问团Pro",
  "description": "升级版创业顾问团队",
  "status": "active"
}
```

---

### 5. 删除群聊

```http
DELETE /api/groups/{group_id}
```

**响应**：204 No Content

---

### 6. 添加Bot到群聊

```http
POST /api/groups/{group_id}/members
```

**请求Body**：

```json
{
  "bot_id": "ceo_bot_001",
  "role": "CEO",
  "permissions": ["read", "write", "mention"],
  "trigger_keywords": ["战略", "决策", "资源"],
  "priority": 1
}
```

**权限类型**：
- `read` - 读取消息
- `write` - 发送消息
- `mention` - 被@提及
- `admin` - 管理员权限

---

### 7. 从群聊移除Bot

```http
DELETE /api/groups/{group_id}/members/{member_id}
```

**响应**：204 No Content

---

### 8. 更新群聊路由策略

```http
PUT /api/groups/{group_id}/routing
```

**请求Body**：

```json
{
  "routing_strategy": "ai_judge",
  "conversation_mode": "multi_turn"
}
```

---

### 9. 获取群聊消息历史

```http
GET /api/groups/{group_id}/messages
```

**请求参数**：

| 参数名 | 类型 | 必填 | 说明 | 默认值 |
|--------|------|------|------|--------|
| limit | integer | 否 | 返回数量 | 50 |
| before | string | 否 | 获取此时间戳之前的消息 | - |

**响应示例**：

```json
{
  "messages": [
    {
      "message_id": "gmsg_001",
      "group_id": "group_001",
      "sender_type": "user",
      "sender_id": "user_001",
      "content": "帮我分析一下市场策略",
      "mentioned_bots": ["cmo_bot_001"],
      "status": "sent",
      "timestamp": "2024-01-15T08:00:00Z"
    }
  ],
  "has_more": true
}
```

---

### 10. 发送消息到群聊

```http
POST /api/groups/{group_id}/messages
```

**请求Body**：

```json
{
  "content": "帮我分析一下市场策略",
  "mentioned_bots": ["cmo_bot_001"]
}
```

**响应示例**：

```json
{
  "message_id": "gmsg_001",
  "group_id": "group_001",
  "sender_type": "user",
  "sender_id": "user_001",
  "content": "帮我分析一下市场策略",
  "mentioned_bots": ["cmo_bot_001"],
  "status": "sent",
  "timestamp": "2024-01-15T08:00:00Z"
}
```

---

## 记忆模块

### 1. 获取记忆列表

```http
GET /api/memories
```

**请求参数**：

| 参数名 | 类型 | 必填 | 说明 | 默认值 |
|--------|------|------|------|--------|
| bot_id | string | 否 | 筛选指定Bot的记忆 | - |
| type | string | 否 | 筛选类型：conversation/preference/fact/instruction | - |
| limit | integer | 否 | 返回数量 | 50 |

**响应示例**：

```json
{
  "memories": [
    {
      "memory_id": "mem_001",
      "bot_id": "work_bot_001",
      "user_id": "user_001",
      "type": "preference",
      "content": "用户喜欢在早上处理重要工作",
      "importance": 0.8,
      "created_at": "2024-01-15T08:00:00Z",
      "updated_at": "2024-01-15T08:00:00Z"
    }
  ]
}
```

---

### 2. 创建记忆

```http
POST /api/memories
```

**请求Body**：

```json
{
  "bot_id": "work_bot_001",
  "user_id": "user_001",
  "type": "preference",
  "content": "用户喜欢在早上处理重要工作",
  "importance": 0.8
}
```

**记忆类型**：
- `conversation` - 对话记录
- `preference` - 用户偏好
- `fact` - 事实信息
- `instruction` - 指令

---

### 3. 更新记忆

```http
PUT /api/memories/{memory_id}
```

**请求Body**：

```json
{
  "content": "用户喜欢在早上8-10点处理重要工作",
  "importance": 0.9
}
```

---

### 4. 删除记忆

```http
DELETE /api/memories/{memory_id}
```

**响应**：204 No Content

---

## 知识库模块

### 1. 获取知识文件列表

```http
GET /api/knowledge/files
```

**请求参数**：

| 参数名 | 类型 | 必填 | 说明 | 默认值 |
|--------|------|------|------|--------|
| bot_id | string | 否 | 按Bot筛选 | - |
| status | string | 否 | 文件状态：uploading/processing/ready/failed | - |

---

### 2. 上传知识文件

```http
POST /api/knowledge/files
```

**请求类型**：`multipart/form-data`

**表单字段**：

| 字段名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| bot_id | string | 是 | Bot ID |
| file | binary | 是 | 待上传文件 |

---

### 3. 删除知识文件

```http
DELETE /api/knowledge/files/{file_id}
```

**响应**：204 No Content

---

### 4. 知识检索

```http
POST /api/knowledge/search
```

**请求Body**：

```json
{
  "bot_id": "work_bot_001",
  "query": "请总结这个项目的关键里程碑",
  "top_k": 5
}
```

---

## 数据分析模块

### 1. 获取对话分析数据

```http
GET /api/analytics/conversations
```

**请求参数**：

| 参数名 | 类型 | 必填 | 说明 | 默认值 |
|--------|------|------|------|--------|
| start_date | string | 否 | 开始日期（YYYY-MM-DD） | 7天前 |
| end_date | string | 否 | 结束日期（YYYY-MM-DD） | 今天 |
| bot_id | string | 否 | 筛选指定Bot | - |

**响应示例**：

```json
{
  "period": {
    "start_date": "2024-01-08",
    "end_date": "2024-01-15"
  },
  "total_conversations": 1245,
  "total_messages": 8632,
  "avg_conversation_length": 6.93,
  "daily_stats": [
    {
      "date": "2024-01-15",
      "conversation_count": 178,
      "message_count": 1245
    }
  ],
  "bot_breakdown": [
    {
      "bot_id": "work_bot_001",
      "bot_name": "工作伙伴",
      "conversation_count": 456,
      "message_count": 3187
    }
  ]
}
```

---

### 2. 获取Bot性能分析

```http
GET /api/analytics/bots
```

**请求参数**：

| 参数名 | 类型 | 必填 | 说明 | 默认值 |
|--------|------|------|------|--------|
| start_date | string | 否 | 开始日期 | 7天前 |
| end_date | string | 否 | 结束日期 | 今天 |

**响应示例**：

```json
{
  "bot_stats": [
    {
      "bot_id": "work_bot_001",
      "bot_name": "工作伙伴",
      "total_conversations": 456,
      "avg_response_time": 2.3,
      "success_rate": 0.98
    }
  ]
}
```

---

### 3. 获取工作流执行分析

```http
GET /api/analytics/workflows
```

**请求参数**：

| 参数名 | 类型 | 必填 | 说明 | 默认值 |
|--------|------|------|------|--------|
| start_date | string | 否 | 开始日期 | 7天前 |
| end_date | string | 否 | 结束日期 | 今天 |

**响应示例**：

```json
{
  "workflow_stats": [
    {
      "sop_id": "sop_001",
      "sop_name": "每日工作启动流程",
      "total_executions": 127,
      "success_count": 124,
      "failed_count": 3,
      "avg_duration": 2.3
    }
  ]
}
```

---

## HTTP状态码

| 状态码 | 说明 |
|--------|------|
| 200 | 成功 |
| 201 | 创建成功 |
| 204 | 成功（无返回内容） |
| 400 | 请求参数错误 |
| 401 | 未授权 |
| 403 | 权限不足 |
| 404 | 资源不存在 |
| 500 | 服务器内部错误 |

---

## 错误响应格式

所有错误响应遵循以下格式：

```json
{
  "error": {
    "code": "ERROR_CODE_NAME",
    "numeric_code": 1001,
    "message": "错误描述信息",
    "details": {
      "field": "name",
      "reason": "详细错误原因"
    }
  }
}
```

详见 [错误码定义文档](error-codes.md)
