# 错误码定义文档

本文档定义 Bot Agent 系统的所有错误码及其含义。

## 目录

- [HTTP状态码](#http状态码)
- [业务错误码](#业务错误码)
- [错误响应格式](#错误响应格式)

---

## HTTP状态码

### 2xx 成功

| 状态码 | 说明 | 使用场景 |
|--------|------|----------|
| 200 OK | 成功 | GET、PUT、PATCH 请求成功 |
| 201 Created | 创建成功 | POST 请求创建资源成功 |
| 204 No Content | 成功（无内容） | DELETE 请求成功 |

### 4xx 客户端错误

| 状态码 | 说明 | 使用场景 |
|--------|------|----------|
| 400 Bad Request | 请求参数错误 | 请求参数格式错误、缺失必填参数、参数值无效 |
| 401 Unauthorized | 未授权 | 缺少认证Token、Token过期、Token无效 |
| 403 Forbidden | 权限不足 | 无权限访问该资源 |
| 404 Not Found | 资源不存在 | 请求的资源不存在 |
| 409 Conflict | 资源冲突 | 资源已存在、状态冲突 |
| 422 Unprocessable Entity | 无法处理 | 参数格式正确但业务逻辑无法处理 |
| 429 Too Many Requests | 请求过多 | 超过速率限制 |

### 5xx 服务器错误

| 状态码 | 说明 | 使用场景 |
|--------|------|----------|
| 500 Internal Server Error | 服务器内部错误 | 未预期的服务器错误 |
| 502 Bad Gateway | 网关错误 | 上游服务错误 |
| 503 Service Unavailable | 服务不可用 | 服务维护中、过载 |
| 504 Gateway Timeout | 网关超时 | 上游服务超时 |

---

## 业务错误码

### 格式说明

对外错误响应的 `error.code` 使用字符串错误码（例如：`BOT_NOT_FOUND`）。
文档中的4位数字编号用于内部归类和排查（例如：`1001`）。

- 数字编号格式：`XXYY`
- `XX`：模块标识（10=Bot, 20=工作流, 30=群聊, 40=消息, 50=记忆, 60=知识库, 90=系统）
- `YY`：具体错误编号

---

### 10xx Bot相关错误

| 错误码 | 错误名称 | HTTP状态码 | 说明 | 解决方案 |
|--------|----------|------------|------|----------|
| 1001 | BOT_NOT_FOUND | 404 | Bot不存在 | 检查bot_id是否正确 |
| 1002 | BOT_DISABLED | 400 | Bot已禁用 | 先启用Bot再进行操作 |
| 1003 | BOT_SUSPENDED | 400 | Bot已暂停 | 联系管理员解除暂停 |
| 1004 | BOT_NAME_EXISTS | 409 | Bot名称已存在 | 使用不同的名称 |
| 1005 | BOT_LIMIT_EXCEEDED | 400 | 超过Bot数量限制 | 升级套餐或删除不用的Bot |
| 1006 | BOT_CONFIG_INVALID | 400 | Bot配置无效 | 检查配置参数 |
| 1007 | BOT_MODEL_NOT_AVAILABLE | 400 | AI模型不可用 | 选择其他模型或联系管理员 |
| 1008 | BOT_CREATION_FAILED | 500 | Bot创建失败 | 稍后重试或联系管理员 |
| 1009 | BOT_UPDATE_FAILED | 500 | Bot更新失败 | 稍后重试或联系管理员 |
| 1010 | BOT_DELETE_FAILED | 500 | Bot删除失败 | 稍后重试或联系管理员 |

---

### 20xx 工作流相关错误

| 错误码 | 错误名称 | HTTP状态码 | 说明 | 解决方案 |
|--------|----------|------------|------|----------|
| 2001 | WORKFLOW_NOT_FOUND | 404 | 工作流不存在 | 检查workflow_id是否正确 |
| 2002 | WORKFLOW_EXECUTION_FAILED | 500 | 工作流执行失败 | 查看错误详情，调整工作流配置 |
| 2003 | WORKFLOW_INVALID_CRON | 400 | Cron表达式无效 | 检查cron表达式格式 |
| 2004 | WORKFLOW_STEP_INVALID | 400 | 工作流步骤配置无效 | 检查步骤配置 |
| 2005 | WORKFLOW_NO_TRIGGER | 400 | 工作流缺少触发条件 | 添加至少一个触发条件 |
| 2006 | WORKFLOW_ALREADY_RUNNING | 409 | 工作流正在执行中 | 等待当前执行完成 |
| 2007 | WORKFLOW_DISABLED | 400 | 工作流已禁用 | 先启用工作流 |
| 2008 | WORKFLOW_EXECUTION_NOT_FOUND | 404 | 执行记录不存在 | 检查execution_id是否正确 |
| 2009 | WORKFLOW_TIMEOUT | 408 | 工作流执行超时 | 检查网络或优化工作流步骤 |
| 2010 | WORKFLOW_STEP_FAILED | 500 | 工作流步骤执行失败 | 查看具体步骤错误信息 |
| 2011 | WORKFLOW_SOURCE_UNAVAILABLE | 500 | 数据源不可用 | 检查外部服务是否可用 |
| 2012 | WORKFLOW_API_CALL_FAILED | 500 | API调用失败 | 检查API配置和权限 |

---

### 30xx 群聊相关错误

| 错误码 | 错误名称 | HTTP状态码 | 说明 | 解决方案 |
|--------|----------|------------|------|----------|
| 3001 | GROUP_NOT_FOUND | 404 | 群聊不存在 | 检查group_id是否正确 |
| 3002 | BOT_ALREADY_IN_GROUP | 409 | Bot已在群聊中 | 无需重复添加 |
| 3003 | BOT_NOT_IN_GROUP | 400 | Bot不在群聊中 | 先添加Bot到群聊 |
| 3004 | GROUP_MEMBER_LIMIT_EXCEEDED | 400 | 超过群成员数量限制 | 移除部分成员或升级套餐 |
| 3005 | GROUP_NAME_EXISTS | 409 | 群聊名称已存在 | 使用不同的名称 |
| 3006 | GROUP_ROUTING_INVALID | 400 | 路由策略无效 | 检查routing_strategy参数 |
| 3007 | GROUP_ARCHIVED | 400 | 群聊已归档 | 先恢复群聊再操作 |
| 3008 | GROUP_DELETE_FAILED | 500 | 群聊删除失败 | 稍后重试或联系管理员 |
| 3009 | GROUP_MEMBER_NOT_FOUND | 404 | 群成员不存在 | 检查member_id是否正确 |
| 3010 | GROUP_INVALID_KEYWORDS | 400 | 触发关键词无效 | 检查关键词配置 |
| 3011 | GROUP_NO_ACTIVE_BOT | 400 | 群聊没有活跃的Bot | 添加或启用Bot |
| 3012 | GROUP_ROUTING_FAILED | 500 | 消息路由失败 | 检查路由配置或联系管理员 |

---

### 40xx 消息相关错误

| 错误码 | 错误名称 | HTTP状态码 | 说明 | 解决方案 |
|--------|----------|------------|------|----------|
| 4001 | MESSAGE_SEND_FAILED | 500 | 消息发送失败 | 稍后重试或联系管理员 |
| 4002 | MESSAGE_NOT_FOUND | 404 | 消息不存在 | 检查message_id是否正确 |
| 4003 | MESSAGE_EMPTY | 400 | 消息内容为空 | 输入消息内容 |
| 4004 | MESSAGE_TOO_LONG | 400 | 消息过长 | 缩短消息内容 |
| 4005 | MESSAGE_CONTAINS_BANNED_CONTENT | 400 | 消息包含违规内容 | 修改消息内容 |
| 4006 | CONVERSATION_NOT_FOUND | 404 | 对话不存在 | 检查conversation_id是否正确 |
| 4007 | MESSAGE_RATE_LIMIT_EXCEEDED | 429 | 超过消息发送频率限制 | 稍后再试 |
| 4008 | BOT_NOT_RESPONDING | 503 | Bot无响应 | 检查Bot状态或稍后重试 |
| 4009 | MESSAGE_ALREADY_PROCESSED | 409 | 消息已处理 | 无需重复处理 |

---

### 50xx 记忆相关错误

| 错误码 | 错误名称 | HTTP状态码 | 说明 | 解决方案 |
|--------|----------|------------|------|----------|
| 5001 | MEMORY_NOT_FOUND | 404 | 记忆不存在 | 检查memory_id是否正确 |
| 5002 | MEMORY_LIMIT_EXCEEDED | 400 | 超过记忆数量限制 | 删除旧的记忆或升级套餐 |
| 5003 | MEMORY_IMPORTANCE_INVALID | 400 | 重要性评分无效 | 使用0-1之间的数值 |
| 5004 | MEMORY_TYPE_INVALID | 400 | 记忆类型无效 | 使用有效的类型值 |
| 5005 | MEMORY_CONTENT_TOO_LONG | 400 | 记忆内容过长 | 缩短内容 |
| 5006 | MEMORY_STORE_FAILED | 500 | 记忆存储失败 | 稍后重试或联系管理员 |

---

### 60xx 知识库相关错误

| 错误码 | 错误名称 | HTTP状态码 | 说明 | 解决方案 |
|--------|----------|------------|------|----------|
| 6001 | KNOWLEDGE_FILE_NOT_FOUND | 404 | 知识文件不存在 | 检查file_id是否正确 |
| 6002 | KNOWLEDGE_FILE_UPLOAD_FAILED | 500 | 文件上传失败 | 检查文件格式或稍后重试 |
| 6003 | KNOWLEDGE_FILE_TOO_LARGE | 400 | 文件过大 | 压缩文件或分片上传 |
| 6004 | KNOWLEDGE_FILE_TYPE_INVALID | 400 | 文件类型不支持 | 使用支持的文件格式 |
| 6005 | KNOWLEDGE_CHUNK_FAILED | 500 | 文档分块失败 | 检查文档内容或联系管理员 |
| 6006 | KNOWLEDGE_SEARCH_FAILED | 500 | 知识检索失败 | 稍后重试或联系管理员 |
| 6007 | KNOWLEDGE_DELETE_FAILED | 500 | 知识删除失败 | 稍后重试或联系管理员 |

---

### 90xx 系统相关错误

| 错误码 | 错误名称 | HTTP状态码 | 说明 | 解决方案 |
|--------|----------|------------|------|----------|
| 9001 | AUTHENTICATION_FAILED | 401 | 认证失败 | 检查Token是否有效 |
| 9002 | TOKEN_EXPIRED | 401 | Token已过期 | 重新登录获取新Token |
| 9003 | TOKEN_INVALID | 401 | Token无效 | 重新登录获取新Token |
| 9004 | PERMISSION_DENIED | 403 | 权限不足 | 联系管理员授权 |
| 9005 | RATE_LIMIT_EXCEEDED | 429 | 超过请求频率限制 | 稍后再试 |
| 9006 | SERVICE_UNAVAILABLE | 503 | 服务暂时不可用 | 稍后重试 |
| 9007 | MAINTENANCE_MODE | 503 | 系统维护中 | 等待维护完成 |
| 9008 | DATABASE_ERROR | 500 | 数据库错误 | 联系管理员 |
| 9009 | EXTERNAL_SERVICE_ERROR | 502 | 外部服务错误 | 稍后重试 |
| 9010 | CONFIGURATION_ERROR | 500 | 配置错误 | 联系管理员 |
| 9011 | QUOTA_EXCEEDED | 402 | 超过配额限制 | 升级套餐 |
| 9012 | INVALID_REQUEST_FORMAT | 400 | 请求格式无效 | 检查请求格式 |

---

## 错误响应格式

### 标准错误响应

```json
{
  "error": {
    "code": "BOT_NOT_FOUND",
    "numeric_code": 1001,
    "message": "Bot不存在",
    "details": {
      "bot_id": "work_bot_001",
      "reason": "未找到指定的Bot"
    }
  }
}
```

### 带字段验证错误的响应

```json
{
  "error": {
    "code": "INVALID_REQUEST_FORMAT",
    "numeric_code": 9012,
    "message": "请求参数无效",
    "details": {
      "fields": [
        {
          "field": "name",
          "message": "名称长度不能超过50个字符"
        },
        {
          "field": "temperature",
          "message": "温度值必须在0-2之间"
        }
      ]
    }
  }
}
```

### 带重试信息的响应

```json
{
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "numeric_code": 9005,
    "message": "超过请求频率限制",
    "details": {
      "retry_after": 60,
      "limit": 100,
      "window": "1m"
    }
  }
}
```

### 工作流执行错误响应

```json
{
  "error": {
    "code": "WORKFLOW_STEP_FAILED",
    "numeric_code": 2010,
    "message": "工作流步骤执行失败",
    "details": {
      "execution_id": "exec_001",
      "step": 2,
      "action": "fetch_calendar",
      "error": "Calendar API连接超时",
      "retry_able": true
    }
  }
}
```

---

## 状态流转说明

### Bot状态流转

```
       ┌─────────────┐
       │   offline   │  (初始状态)
       └──────┬──────┘
              │
              ▼
       ┌─────────────┐
    ┌──▶│   online   │◀──┐
    │   └─────────────┘   │
    │         │           │
    │         ▼           │
    │   ┌─────────────┐   │
    └───│  suspended  │───┘
        └─────────────┘
```

### 工作流执行状态流转

```
       ┌─────────────┐
       │   pending   │  (等待执行)
       └──────┬──────┘
              │
              ▼
       ┌─────────────┐
    ┌──▶│   running   │◀──┐
    │   └──────┬──────┘   │
    │          │          │
    │          ▼          │
    │   ┌─────────────┐   │
    │   │  completed  │───┘
    │   └─────────────┘
    │
    │   ┌─────────────┐
    └──▶│    failed   │
        └─────────────┘

    (任何状态 ──cancelled──▶ cancelled)
```

### 消息状态流转

```
       ┌─────────────┐
       │  sending    │  (发送中)
       └──────┬──────┘
              │
        ┌─────┴─────┐
        ▼           ▼
   ┌─────────┐ ┌─────────┐
   │  sent   │ │ failed  │
   └─────────┘ └─────────┘
```

### 群聊状态流转

```
       ┌─────────────┐
       │   active    │  (活跃中)
       └──────┬──────┘
              │
        ┌─────┴─────┐
        ▼           ▼
   ┌─────────┐ ┌─────────┐
   │inactive │ │ archived│
   └────┬────┘ └─────────┘
        │           ▲
        └───────────┘
```
