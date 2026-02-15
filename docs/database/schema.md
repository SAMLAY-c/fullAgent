# 数据库Schema文档

本文档定义 Bot Agent 系统的数据库表结构。

## 目录

- [表结构概览](#表结构概览)
- [用户相关表](#用户相关表)
- [Bot相关表](#bot相关表)
- [工作流相关表](#工作流相关表)
- [群聊相关表](#群聊相关表)
- [消息相关表](#消息相关表)
- [记忆相关表](#记忆相关表)
- [知识库相关表](#知识库相关表)
- [索引定义](#索引定义)

---

## 表结构概览

| 表名 | 说明 | 主要字段 |
|------|------|----------|
| users | 用户表 | user_id, username, email, role |
| bots | Bot表 | bot_id, name, type, status, config |
| topics | 话题/场景表 | topic_id, name, type, theme_config |
| conversations | 对话表 | conversation_id, user_id, bot_id |
| messages | 消息表 | message_id, conversation_id, sender_type, content |
| sop_workflows | SOP工作流表 | sop_id, bot_id, triggers, workflow_steps |
| sop_executions | 工作流执行记录表 | execution_id, sop_id, status, result |
| groups | 群聊表 | group_id, name, type, routing_strategy |
| group_members | 群成员表 | id, group_id, bot_id, role, permissions |
| group_messages | 群消息表 | message_id, group_id, sender_type, content |
| memories | 记忆表 | memory_id, bot_id, type, content |
| refresh_tokens | 刷新令牌表 | token_id, user_id, refresh_token, expires_at |
| knowledge_files | 知识文件表 | file_id, bot_id, filename, status |
| knowledge_chunks | 知识分片表 | chunk_id, file_id, chunk_index, content |

---

## 用户相关表

### users（用户表）

存储系统用户信息。

| 字段名 | 类型 | 必填 | 说明 | 索引 |
|--------|------|------|------|------|
| user_id | VARCHAR(50) | 是 | 用户唯一标识（主键） | PK |
| username | VARCHAR(100) | 是 | 用户名 | INDEX |
| email | VARCHAR(255) | 否 | 邮箱地址 | UNIQUE INDEX |
| avatar | VARCHAR(255) | 否 | 头像URL或emoji | - |
| role | VARCHAR(20) | 是 | 角色：admin/user | INDEX |
| created_at | TIMESTAMP | 是 | 创建时间 | INDEX |
| updated_at | TIMESTAMP | 是 | 更新时间 | - |

#### SQL定义

```sql
CREATE TABLE users (
    user_id VARCHAR(50) PRIMARY KEY,
    username VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE,
    avatar VARCHAR(255),
    role VARCHAR(20) NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'user')),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_created_at ON users(created_at);
```

### refresh_tokens（刷新令牌表）

存储登录后的刷新令牌，用于访问令牌续期。

| 字段名 | 类型 | 必填 | 说明 | 索引 |
|--------|------|------|------|------|
| token_id | VARCHAR(50) | 是 | 令牌记录ID（主键） | PK |
| user_id | VARCHAR(50) | 是 | 用户ID | FK, INDEX |
| refresh_token | TEXT | 是 | 刷新令牌（建议加密存储） | UNIQUE INDEX |
| expires_at | TIMESTAMP | 是 | 过期时间 | INDEX |
| revoked_at | TIMESTAMP | 否 | 吊销时间 | INDEX |
| created_at | TIMESTAMP | 是 | 创建时间 | INDEX |

#### 外键

- `user_id` → `users(user_id)`

#### SQL定义

```sql
CREATE TABLE refresh_tokens (
    token_id VARCHAR(50) PRIMARY KEY,
    user_id VARCHAR(50) NOT NULL,
    refresh_token TEXT NOT NULL UNIQUE,
    expires_at TIMESTAMP NOT NULL,
    revoked_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

CREATE INDEX idx_refresh_tokens_user_id ON refresh_tokens(user_id);
CREATE INDEX idx_refresh_tokens_expires_at ON refresh_tokens(expires_at);
CREATE INDEX idx_refresh_tokens_revoked_at ON refresh_tokens(revoked_at);
CREATE INDEX idx_refresh_tokens_created_at ON refresh_tokens(created_at);
```

---

## Bot相关表

### bots（Bot表）

存储AI助手实例信息。

| 字段名 | 类型 | 必填 | 说明 | 索引 |
|--------|------|------|------|------|
| bot_id | VARCHAR(50) | 是 | Bot唯一标识（主键） | PK |
| user_id | VARCHAR(50) | 是 | 所属用户ID | FK, INDEX |
| name | VARCHAR(100) | 是 | Bot名称 | INDEX |
| avatar | VARCHAR(255) | 否 | 头像（emoji或URL） | - |
| type | VARCHAR(20) | 是 | 类型：work/life/love/group/sop | INDEX |
| scene | VARCHAR(20) | 是 | 场景类型 | INDEX |
| status | VARCHAR(20) | 是 | 状态：online/offline/suspended | INDEX |
| description | TEXT | 否 | Bot描述 | - |
| config | JSONB | 否 | Bot配置（模型、参数等） | - |
| created_at | TIMESTAMP | 是 | 创建时间 | INDEX |
| updated_at | TIMESTAMP | 是 | 更新时间 | - |

#### 外键

- `user_id` → `users(user_id)`

#### SQL定义

```sql
CREATE TABLE bots (
    bot_id VARCHAR(50) PRIMARY KEY,
    user_id VARCHAR(50) NOT NULL,
    name VARCHAR(100) NOT NULL,
    avatar VARCHAR(255),
    type VARCHAR(20) NOT NULL CHECK (type IN ('work', 'life', 'love', 'group', 'sop')),
    scene VARCHAR(20) NOT NULL CHECK (scene IN ('work', 'life', 'love', 'group', 'sop')),
    status VARCHAR(20) NOT NULL DEFAULT 'online' CHECK (status IN ('online', 'offline', 'suspended')),
    description TEXT,
    config JSONB,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

CREATE INDEX idx_bots_user_id ON bots(user_id);
CREATE INDEX idx_bots_name ON bots(name);
CREATE INDEX idx_bots_type ON bots(type);
CREATE INDEX idx_bots_status ON bots(status);
CREATE INDEX idx_bots_scene ON bots(scene);
CREATE INDEX idx_bots_created_at ON bots(created_at);
```

### topics（话题/场景表）

存储话题/场景配置，用于UI主题。

| 字段名 | 类型 | 必填 | 说明 | 索引 |
|--------|------|------|------|------|
| topic_id | VARCHAR(50) | 是 | 话题唯一标识（主键） | PK |
| name | VARCHAR(100) | 是 | 话题名称 | - |
| type | VARCHAR(20) | 是 | 类型：work/life/love/group/sop | INDEX |
| theme_config | JSONB | 否 | 主题配色配置 | - |
| is_active | BOOLEAN | 是 | 是否激活 | INDEX |

#### SQL定义

```sql
CREATE TABLE topics (
    topic_id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    type VARCHAR(20) NOT NULL CHECK (type IN ('work', 'life', 'love', 'group', 'sop')),
    theme_config JSONB,
    is_active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE INDEX idx_topics_type ON topics(type);
CREATE INDEX idx_topics_is_active ON topics(is_active);
```

---

## 工作流相关表

### sop_workflows（SOP工作流表）

存储自动化工作流定义。

| 字段名 | 类型 | 必填 | 说明 | 索引 |
|--------|------|------|------|------|
| sop_id | VARCHAR(50) | 是 | 工作流唯一标识（主键） | PK |
| bot_id | VARCHAR(50) | 是 | 关联的Bot ID | FK, INDEX |
| name | VARCHAR(200) | 是 | 工作流名称 | - |
| description | TEXT | 否 | 工作流描述 | - |
| triggers | JSONB | 是 | 触发条件列表 | - |
| workflow_steps | JSONB | 是 | 工作流步骤 | - |
| enabled | BOOLEAN | 是 | 是否启用 | INDEX |
| created_at | TIMESTAMP | 是 | 创建时间 | INDEX |
| updated_at | TIMESTAMP | 是 | 更新时间 | - |

#### 外键

- `bot_id` → `bots(bot_id)`

#### SQL定义

```sql
CREATE TABLE sop_workflows (
    sop_id VARCHAR(50) PRIMARY KEY,
    bot_id VARCHAR(50) NOT NULL,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    triggers JSONB NOT NULL,
    workflow_steps JSONB NOT NULL,
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (bot_id) REFERENCES bots(bot_id) ON DELETE CASCADE
);

CREATE INDEX idx_sop_workflows_bot_id ON sop_workflows(bot_id);
CREATE INDEX idx_sop_workflows_enabled ON sop_workflows(enabled);
CREATE INDEX idx_sop_workflows_created_at ON sop_workflows(created_at);
```

### sop_executions（工作流执行记录表）

存储工作流执行历史。

| 字段名 | 类型 | 必填 | 说明 | 索引 |
|--------|------|------|------|------|
| execution_id | VARCHAR(50) | 是 | 执行记录唯一标识（主键） | PK |
| sop_id | VARCHAR(50) | 是 | 工作流ID | FK, INDEX |
| trigger_time | TIMESTAMP | 是 | 计划触发时间 | INDEX |
| status | VARCHAR(20) | 是 | 状态：pending/running/completed/failed/cancelled | INDEX |
| result | JSONB | 否 | 执行结果 | - |
| error_message | TEXT | 否 | 错误信息 | - |
| started_at | TIMESTAMP | 否 | 实际开始时间 | - |
| completed_at | TIMESTAMP | 否 | 完成时间 | - |
| duration | VARCHAR(20) | 否 | 执行时长 | - |
| steps | JSONB | 否 | 步骤执行详情 | - |

#### 外键

- `sop_id` → `sop_workflows(sop_id)`

#### SQL定义

```sql
CREATE TABLE sop_executions (
    execution_id VARCHAR(50) PRIMARY KEY,
    sop_id VARCHAR(50) NOT NULL,
    trigger_time TIMESTAMP NOT NULL,
    status VARCHAR(20) NOT NULL CHECK (status IN ('pending', 'running', 'completed', 'failed', 'cancelled')),
    result JSONB,
    error_message TEXT,
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    duration VARCHAR(20),
    steps JSONB,
    FOREIGN KEY (sop_id) REFERENCES sop_workflows(sop_id) ON DELETE CASCADE
);

CREATE INDEX idx_sop_executions_sop_id ON sop_executions(sop_id);
CREATE INDEX idx_sop_executions_status ON sop_executions(status);
CREATE INDEX idx_sop_executions_trigger_time ON sop_executions(trigger_time);
```

---

## 群聊相关表

### groups（群聊表）

存储多Bot协作群组信息。

| 字段名 | 类型 | 必填 | 说明 | 索引 |
|--------|------|------|------|------|
| group_id | VARCHAR(50) | 是 | 群聊唯一标识（主键） | PK |
| created_by | VARCHAR(50) | 是 | 创建者用户ID | FK, INDEX |
| name | VARCHAR(100) | 是 | 群聊名称 | INDEX |
| type | VARCHAR(20) | 是 | 类型：personal/team/public | INDEX |
| description | TEXT | 否 | 群聊描述 | - |
| routing_strategy | VARCHAR(30) | 是 | 路由策略 | - |
| conversation_mode | VARCHAR(20) | 是 | 对话模式：single_turn/multi_turn | - |
| status | VARCHAR(20) | 是 | 状态：active/inactive/archived | INDEX |
| created_at | TIMESTAMP | 是 | 创建时间 | INDEX |
| updated_at | TIMESTAMP | 是 | 更新时间 | - |

#### 外键

- `created_by` → `users(user_id)`

#### SQL定义

```sql
CREATE TABLE groups (
    group_id VARCHAR(50) PRIMARY KEY,
    created_by VARCHAR(50) NOT NULL,
    name VARCHAR(100) NOT NULL,
    type VARCHAR(20) NOT NULL CHECK (type IN ('personal', 'team', 'public')),
    description TEXT,
    routing_strategy VARCHAR(30) NOT NULL CHECK (routing_strategy IN ('keyword_match', 'ai_judge', 'round_robin', 'broadcast')),
    conversation_mode VARCHAR(20) NOT NULL CHECK (conversation_mode IN ('single_turn', 'multi_turn')),
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'archived')),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(user_id) ON DELETE CASCADE
);

CREATE INDEX idx_groups_created_by ON groups(created_by);
CREATE INDEX idx_groups_name ON groups(name);
CREATE INDEX idx_groups_type ON groups(type);
CREATE INDEX idx_groups_status ON groups(status);
CREATE INDEX idx_groups_created_at ON groups(created_at);
```

### group_members（群成员表）

存储群聊成员（Bot）信息。

| 字段名 | 类型 | 必填 | 说明 | 索引 |
|--------|------|------|------|------|
| id | SERIAL | 是 | 成员记录ID（主键） | PK |
| group_id | VARCHAR(50) | 是 | 群聊ID | FK, INDEX |
| bot_id | VARCHAR(50) | 是 | Bot ID | FK, INDEX |
| role | VARCHAR(100) | 是 | 角色名称 | - |
| permissions | JSONB | 是 | 权限列表 | - |
| trigger_keywords | TEXT[] | 否 | 触发关键词数组 | - |
| priority | INTEGER | 是 | 优先级（数字越小优先级越高） | INDEX |

#### 外键

- `group_id` → `groups(group_id)`
- `bot_id` → `bots(bot_id)`

#### 唯一约束

- `(group_id, bot_id)` - 同一个Bot在同一群聊中只能有一条记录

#### SQL定义

```sql
CREATE TABLE group_members (
    id SERIAL PRIMARY KEY,
    group_id VARCHAR(50) NOT NULL,
    bot_id VARCHAR(50) NOT NULL,
    role VARCHAR(100) NOT NULL,
    permissions JSONB NOT NULL,
    trigger_keywords TEXT[],
    priority INTEGER NOT NULL DEFAULT 10,
    FOREIGN KEY (group_id) REFERENCES groups(group_id) ON DELETE CASCADE,
    FOREIGN KEY (bot_id) REFERENCES bots(bot_id) ON DELETE CASCADE,
    UNIQUE (group_id, bot_id)
);

CREATE INDEX idx_group_members_group_id ON group_members(group_id);
CREATE INDEX idx_group_members_bot_id ON group_members(bot_id);
CREATE INDEX idx_group_members_priority ON group_members(priority);
```

---

## 消息相关表

### conversations（对话表）

存储对话会话信息。

| 字段名 | 类型 | 必填 | 说明 | 索引 |
|--------|------|------|------|------|
| conversation_id | VARCHAR(50) | 是 | 对话唯一标识（主键） | PK |
| user_id | VARCHAR(50) | 是 | 用户ID | FK, INDEX |
| bot_id | VARCHAR(50) | 是 | Bot ID | FK, INDEX |
| topic_id | VARCHAR(50) | 否 | 话题ID | FK, INDEX |
| created_at | TIMESTAMP | 是 | 创建时间 | INDEX |
| updated_at | TIMESTAMP | 是 | 更新时间 | - |

#### 外键

- `user_id` → `users(user_id)`
- `bot_id` → `bots(bot_id)`
- `topic_id` → `topics(topic_id)`

#### SQL定义

```sql
CREATE TABLE conversations (
    conversation_id VARCHAR(50) PRIMARY KEY,
    user_id VARCHAR(50) NOT NULL,
    bot_id VARCHAR(50) NOT NULL,
    topic_id VARCHAR(50),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (bot_id) REFERENCES bots(bot_id) ON DELETE CASCADE,
    FOREIGN KEY (topic_id) REFERENCES topics(topic_id) ON DELETE SET NULL
);

CREATE INDEX idx_conversations_user_id ON conversations(user_id);
CREATE INDEX idx_conversations_bot_id ON conversations(bot_id);
CREATE INDEX idx_conversations_topic_id ON conversations(topic_id);
CREATE INDEX idx_conversations_created_at ON conversations(created_at);
```

### messages（消息表）

存储单条对话消息。

| 字段名 | 类型 | 必填 | 说明 | 索引 |
|--------|------|------|------|------|
| message_id | VARCHAR(50) | 是 | 消息唯一标识（主键） | PK |
| conversation_id | VARCHAR(50) | 是 | 对话ID | FK, INDEX |
| sender_type | VARCHAR(20) | 是 | 发送者类型：user/bot/system | INDEX |
| sender_id | VARCHAR(50) | 是 | 发送者ID | INDEX |
| content | TEXT | 是 | 消息内容 | - |
| metadata | JSONB | 否 | 消息元数据 | - |
| timestamp | TIMESTAMP | 是 | 发送时间 | INDEX |

#### 外键

- `conversation_id` → `conversations(conversation_id)`

#### SQL定义

```sql
CREATE TABLE messages (
    message_id VARCHAR(50) PRIMARY KEY,
    conversation_id VARCHAR(50) NOT NULL,
    sender_type VARCHAR(20) NOT NULL CHECK (sender_type IN ('user', 'bot', 'system')),
    sender_id VARCHAR(50) NOT NULL,
    content TEXT NOT NULL,
    metadata JSONB,
    timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (conversation_id) REFERENCES conversations(conversation_id) ON DELETE CASCADE
);

CREATE INDEX idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX idx_messages_sender_type ON messages(sender_type);
CREATE INDEX idx_messages_sender_id ON messages(sender_id);
CREATE INDEX idx_messages_timestamp ON messages(timestamp);
```

### group_messages（群消息表）

存储群聊消息。

| 字段名 | 类型 | 必填 | 说明 | 索引 |
|--------|------|------|------|------|
| message_id | VARCHAR(50) | 是 | 消息唯一标识（主键） | PK |
| group_id | VARCHAR(50) | 是 | 群聊ID | FK, INDEX |
| sender_type | VARCHAR(20) | 是 | 发送者类型：user/bot/system | INDEX |
| sender_id | VARCHAR(50) | 是 | 发送者ID | INDEX |
| content | TEXT | 是 | 消息内容 | - |
| mentioned_bots | VARCHAR(50)[] | 否 | @提及的Bot ID数组 | - |
| status | VARCHAR(20) | 是 | 状态：sending/sent/failed | INDEX |
| timestamp | TIMESTAMP | 是 | 发送时间 | INDEX |

#### 外键

- `group_id` → `groups(group_id)`

#### SQL定义

```sql
CREATE TABLE group_messages (
    message_id VARCHAR(50) PRIMARY KEY,
    group_id VARCHAR(50) NOT NULL,
    sender_type VARCHAR(20) NOT NULL CHECK (sender_type IN ('user', 'bot', 'system')),
    sender_id VARCHAR(50) NOT NULL,
    content TEXT NOT NULL,
    mentioned_bots VARCHAR(50)[],
    status VARCHAR(20) NOT NULL DEFAULT 'sent' CHECK (status IN ('sending', 'sent', 'failed')),
    timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (group_id) REFERENCES groups(group_id) ON DELETE CASCADE
);

CREATE INDEX idx_group_messages_group_id ON group_messages(group_id);
CREATE INDEX idx_group_messages_sender_type ON group_messages(sender_type);
CREATE INDEX idx_group_messages_sender_id ON group_messages(sender_id);
CREATE INDEX idx_group_messages_status ON group_messages(status);
CREATE INDEX idx_group_messages_timestamp ON group_messages(timestamp);
```

---

## 记忆相关表

### memories（记忆表）

存储Bot的上下文记忆。

| 字段名 | 类型 | 必填 | 说明 | 索引 |
|--------|------|------|------|------|
| memory_id | VARCHAR(50) | 是 | 记忆唯一标识（主键） | PK |
| bot_id | VARCHAR(50) | 是 | Bot ID | FK, INDEX |
| user_id | VARCHAR(50) | 否 | 关联的用户ID | FK, INDEX |
| type | VARCHAR(20) | 是 | 类型：conversation/preference/fact/instruction | INDEX |
| content | TEXT | 是 | 记忆内容 | - |
| importance | DECIMAL(3,2) | 是 | 重要性评分（0-1） | INDEX |
| created_at | TIMESTAMP | 是 | 创建时间 | INDEX |
| updated_at | TIMESTAMP | 是 | 更新时间 | - |

#### 外键

- `bot_id` → `bots(bot_id)`
- `user_id` → `users(user_id)`

#### SQL定义

```sql
CREATE TABLE memories (
    memory_id VARCHAR(50) PRIMARY KEY,
    bot_id VARCHAR(50) NOT NULL,
    user_id VARCHAR(50),
    type VARCHAR(20) NOT NULL CHECK (type IN ('conversation', 'preference', 'fact', 'instruction')),
    content TEXT NOT NULL,
    importance DECIMAL(3,2) NOT NULL DEFAULT 0.5 CHECK (importance BETWEEN 0 AND 1),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (bot_id) REFERENCES bots(bot_id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

CREATE INDEX idx_memories_bot_id ON memories(bot_id);
CREATE INDEX idx_memories_user_id ON memories(user_id);
CREATE INDEX idx_memories_type ON memories(type);
CREATE INDEX idx_memories_importance ON memories(importance);
CREATE INDEX idx_memories_created_at ON memories(created_at);
```

---

## 知识库相关表

### knowledge_files（知识文件表）

存储上传到知识库的原始文件及处理状态。

| 字段名 | 类型 | 必填 | 说明 | 索引 |
|--------|------|------|------|------|
| file_id | VARCHAR(50) | 是 | 文件唯一标识（主键） | PK |
| bot_id | VARCHAR(50) | 是 | 关联Bot ID | FK, INDEX |
| uploaded_by | VARCHAR(50) | 是 | 上传者用户ID | FK, INDEX |
| filename | VARCHAR(255) | 是 | 文件名 | INDEX |
| mime_type | VARCHAR(100) | 否 | MIME类型 | - |
| size_bytes | BIGINT | 否 | 文件大小（字节） | - |
| storage_url | TEXT | 否 | 对象存储地址 | - |
| status | VARCHAR(20) | 是 | 状态：uploading/processing/ready/failed | INDEX |
| error_message | TEXT | 否 | 处理失败原因 | - |
| chunk_count | INTEGER | 否 | 分片数量 | - |
| created_at | TIMESTAMP | 是 | 创建时间 | INDEX |
| updated_at | TIMESTAMP | 是 | 更新时间 | - |

#### 外键

- `bot_id` → `bots(bot_id)`
- `uploaded_by` → `users(user_id)`

#### SQL定义

```sql
CREATE TABLE knowledge_files (
    file_id VARCHAR(50) PRIMARY KEY,
    bot_id VARCHAR(50) NOT NULL,
    uploaded_by VARCHAR(50) NOT NULL,
    filename VARCHAR(255) NOT NULL,
    mime_type VARCHAR(100),
    size_bytes BIGINT,
    storage_url TEXT,
    status VARCHAR(20) NOT NULL CHECK (status IN ('uploading', 'processing', 'ready', 'failed')),
    error_message TEXT,
    chunk_count INTEGER,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (bot_id) REFERENCES bots(bot_id) ON DELETE CASCADE,
    FOREIGN KEY (uploaded_by) REFERENCES users(user_id) ON DELETE CASCADE
);

CREATE INDEX idx_knowledge_files_bot_id ON knowledge_files(bot_id);
CREATE INDEX idx_knowledge_files_uploaded_by ON knowledge_files(uploaded_by);
CREATE INDEX idx_knowledge_files_filename ON knowledge_files(filename);
CREATE INDEX idx_knowledge_files_status ON knowledge_files(status);
CREATE INDEX idx_knowledge_files_created_at ON knowledge_files(created_at);
```

### knowledge_chunks（知识分片表）

存储文件切片后的文本内容与向量检索元数据。

| 字段名 | 类型 | 必填 | 说明 | 索引 |
|--------|------|------|------|------|
| chunk_id | VARCHAR(50) | 是 | 分片唯一标识（主键） | PK |
| file_id | VARCHAR(50) | 是 | 所属文件ID | FK, INDEX |
| chunk_index | INTEGER | 是 | 分片序号 | INDEX |
| content | TEXT | 是 | 分片文本内容 | - |
| token_count | INTEGER | 否 | 分片token数 | - |
| vector_ref | VARCHAR(255) | 否 | 向量库引用ID | INDEX |
| metadata | JSONB | 否 | 额外元数据 | - |
| created_at | TIMESTAMP | 是 | 创建时间 | INDEX |

#### 外键

- `file_id` → `knowledge_files(file_id)`

#### 唯一约束

- `(file_id, chunk_index)` - 同一文件下分片序号唯一

#### SQL定义

```sql
CREATE TABLE knowledge_chunks (
    chunk_id VARCHAR(50) PRIMARY KEY,
    file_id VARCHAR(50) NOT NULL,
    chunk_index INTEGER NOT NULL,
    content TEXT NOT NULL,
    token_count INTEGER,
    vector_ref VARCHAR(255),
    metadata JSONB,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (file_id) REFERENCES knowledge_files(file_id) ON DELETE CASCADE,
    UNIQUE (file_id, chunk_index)
);

CREATE INDEX idx_knowledge_chunks_file_id ON knowledge_chunks(file_id);
CREATE INDEX idx_knowledge_chunks_chunk_index ON knowledge_chunks(chunk_index);
CREATE INDEX idx_knowledge_chunks_vector_ref ON knowledge_chunks(vector_ref);
CREATE INDEX idx_knowledge_chunks_created_at ON knowledge_chunks(created_at);
```

---

## 索引定义

### 复合索引

以下复合索引可用于常见查询场景优化：

```sql
-- Bot查询：按用户和状态筛选
CREATE INDEX idx_bots_user_status ON bots(user_id, status);

-- 工作流查询：按Bot和启用状态筛选
CREATE INDEX idx_sop_workflows_bot_enabled ON sop_workflows(bot_id, enabled);

-- 消息查询：按对话和时间倒序
CREATE INDEX idx_messages_conv_time ON messages(conversation_id, timestamp DESC);

-- 群消息查询：按群聊和时间倒序
CREATE INDEX idx_group_messages_group_time ON group_messages(group_id, timestamp DESC);

-- 工作流执行查询：按工作流和状态
CREATE INDEX idx_sop_executions_sop_status ON sop_executions(sop_id, status);

-- 记忆查询：按Bot和类型
CREATE INDEX idx_memories_bot_type ON memories(bot_id, type);
```

### 全文搜索索引

如果需要支持消息内容搜索，可以添加全文索引（PostgreSQL）：

```sql
-- 消息内容全文搜索
CREATE INDEX idx_messages_content_fts ON messages USING gin(to_tsvector('english', content));

-- 群消息内容全文搜索
CREATE INDEX idx_group_messages_content_fts ON group_messages USING gin(to_tsvector('english', content));

-- 记忆内容全文搜索
CREATE INDEX idx_memories_content_fts ON memories USING gin(to_tsvector('english', content));
```

---

## ER图

```
┌─────────────┐
│    users    │
└──────┬──────┘
       │
       ├─────────────┬─────────────┬─────────────┐
       ▼             ▼             ▼             ▼
┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐
│    bots     │ │  groups     │ │conversations│ │  memories   │
└──────┬──────┘ └──────┬──────┘ └──────┬──────┘ └─────────────┘
       │               │                │
       ▼               ▼                │
┌─────────────┐ ┌─────────────┐        │
│sop_workflows│ │group_members│        │
└──────┬──────┘ └─────────────┘        │
       │                                │
       ▼                                ▼
┌─────────────┐              ┌─────────────┐
│sop_executions│              │  messages   │
└─────────────┘              └─────────────┘
                                    ▲
┌─────────────┐                    │
│group_messages│────────────────────┘
└─────────────┘
```
