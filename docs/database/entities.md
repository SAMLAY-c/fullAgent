# 数据实体定义文档

本文档定义 Bot Agent 系统中的所有数据实体及其字段结构。

## 目录

- [User（用户）](#user用户)
- [Bot（机器人）](#bot机器人)
- [Topic（话题/场景）](#topic话题场景)
- [Message（消息）](#message消息)
- [GroupChat（群聊）](#groupchat群聊)
- [GroupMember（群成员）](#groupmember群成员)
- [GroupMessage（群消息）](#groupmessage群消息)
- [Workflow（工作流）](#workflow工作流)
- [WorkflowRun（执行记录）](#workflowrun执行记录)
- [Memory（记忆）](#memory记忆)
- [KnowledgeFile（知识文件）](#knowledgefile知识文件)
- [KnowledgeChunk（知识分片）](#knowledgechunk知识分片)

---

## User（用户）

用户实体，表示系统中的用户账号。

| 字段名 | 类型 | 必填 | 说明 | 示例 |
|--------|------|------|------|------|
| user_id | string | 是 | 用户唯一标识 | "user_001" |
| username | string | 是 | 用户名 | "管理员" |
| email | string | 否 | 邮箱地址 | "admin@bot.com" |
| avatar | string | 否 | 头像（URL或emoji） | "👤" |
| role | string | 是 | 角色：admin/user | "admin" |
| created_at | datetime | 是 | 创建时间 | 2024-01-15T08:00:00Z |
| updated_at | datetime | 是 | 更新时间 | 2024-01-15T08:00:00Z |

---

## Bot（机器人）

Bot实体，表示一个AI助手实例。

| 字段名 | 类型 | 必填 | 说明 | 示例 |
|--------|------|------|------|------|
| bot_id | string | 是 | Bot唯一标识 | "work_bot_001" |
| name | string | 是 | Bot名称 | "工作伙伴" |
| avatar | string | 否 | 头像（emoji或URL） | "💼" |
| type | string | 是 | Bot类型：work/life/love/group/sop | "work" |
| scene | string | 是 | 场景类型：work/life/love/group/sop | "work" |
| status | string | 是 | 状态：online/offline/suspended | "online" |
| description | string | 否 | Bot描述 | "专业的办公助手" |
| config | object | 否 | Bot配置（模型、参数等） | 见下方 |
| stats | object | 否 | 统计数据 | 见下方 |
| created_at | datetime | 是 | 创建时间 | 2024-01-15T08:00:00Z |
| updated_at | datetime | 是 | 更新时间 | 2024-01-15T08:00:00Z |

### config 子字段

| 字段名 | 类型 | 说明 | 示例 |
|--------|------|------|------|
| model | string | AI模型名称 | "gpt-4" |
| temperature | float (0-2) | 温度参数 | 0.7 |
| max_tokens | integer | 最大token数 | 2000 |
| system_prompt | string | 系统提示词 | "你是一个专业的..." |

### stats 子字段

| 字段名 | 类型 | 说明 | 示例 |
|--------|------|------|------|
| conversation_count | integer | 对话次数 | 156 |
| response_rate | string | 响应率 | "98%" |
| avg_response_time | string | 平均响应时间 | "2.3s" |

---

## Topic（话题/场景）

话题/场景实体，用于UI主题配置。

| 字段名 | 类型 | 必填 | 说明 | 示例 |
|--------|------|------|------|------|
| topic_id | string | 是 | 话题唯一标识 | "topic_work" |
| name | string | 是 | 话题名称 | "工作场景" |
| type | string | 是 | 类型：work/life/love/group/sop | "work" |
| theme_config | object | 否 | 主题配色配置 | 见下方 |
| is_active | boolean | 否 | 是否激活 | true |

### theme_config 子字段

| 字段名 | 类型 | 说明 | 示例 |
|--------|------|------|------|
| primary | string | 主色调（十六进制） | "#9B8BF5" |
| background | string | 背景渐变CSS | "linear-gradient(135deg, #E8E4FF 0%, #F0ECFF 100%)" |

---

## Message（消息）

消息实体，表示单条对话消息。

| 字段名 | 类型 | 必填 | 说明 | 示例 |
|--------|------|------|------|------|
| message_id | string | 是 | 消息唯一标识 | "msg_001" |
| conversation_id | string | 是 | 对话ID（群聊时为group_id） | "conv_001" |
| sender_type | string | 是 | 发送者类型：user/bot/system | "user" |
| sender_id | string | 是 | 发送者ID（user_id或bot_id） | "user_001" |
| content | string | 是 | 消息内容 | "你好" |
| metadata | object | 否 | 消息元数据 | 见下方 |
| timestamp | datetime | 是 | 发送时间 | 2024-01-15T08:00:00Z |

### metadata 子字段

| 字段名 | 类型 | 说明 | 示例 |
|--------|------|------|------|
| model | string | 使用的AI模型 | "gpt-4" |
| tokens | integer | Token数量 | 150 |
| response_time | integer | 响应时间（毫秒） | 1200 |

---

## GroupChat（群聊）

群聊实体，表示多个Bot协作的群组。

| 字段名 | 类型 | 必填 | 说明 | 示例 |
|--------|------|------|------|------|
| group_id | string | 是 | 群聊唯一标识 | "group_001" |
| name | string | 是 | 群聊名称 | "创业顾问团" |
| type | string | 是 | 类型：personal/team/public | "team" |
| description | string | 否 | 群聊描述 | "CEO、CTO、CMO三位专家Bot协同" |
| routing_strategy | string | 是 | 路由策略：keyword_match/ai_judge/round_robin/broadcast | "keyword_match" |
| conversation_mode | string | 是 | 对话模式：single_turn/multi_turn | "multi_turn" |
| status | string | 否 | 状态：active/inactive/archived | "active" |
| created_by | string | 否 | 创建者user_id | "user_001" |
| members | array | 否 | 群成员列表 | 见 [GroupMember](#groupmember群成员) |
| stats | object | 否 | 群聊统计 | 见下方 |
| created_at | datetime | 是 | 创建时间 | 2024-01-15T08:00:00Z |
| updated_at | datetime | 是 | 更新时间 | 2024-01-15T08:00:00Z |

### stats 子字段

| 字段名 | 类型 | 说明 | 示例 |
|--------|------|------|------|
| conversation_count | integer | 对话次数 | 234 |
| response_rate | string | 响应率 | "97%" |
| response_speed | string | 响应速度 | "2.8s" |

---

## GroupMember（群成员）

群成员实体，表示Bot在群聊中的成员信息。

| 字段名 | 类型 | 必填 | 说明 | 示例 |
|--------|------|------|------|------|
| id | integer | 是 | 成员记录ID（自增主键） | 1 |
| group_id | string | 是 | 群聊ID | "group_001" |
| bot_id | string | 是 | Bot ID | "ceo_bot_001" |
| role | string | 是 | 角色名称 | "CEO" |
| permissions | array | 否 | 权限列表：read/write/mention/admin | ["read", "write", "mention"] |
| trigger_keywords | array | 否 | 触发关键词列表 | ["战略", "决策", "资源"] |
| priority | integer | 否 | 优先级（数字越小优先级越高） | 1 |

---

## GroupMessage（群消息）

群消息实体，表示群聊中的消息。

| 字段名 | 类型 | 必填 | 说明 | 示例 |
|--------|------|------|------|------|
| message_id | string | 是 | 消息唯一标识 | "gmsg_001" |
| group_id | string | 是 | 群聊ID | "group_001" |
| sender_type | string | 是 | 发送者类型：user/bot/system | "user" |
| sender_id | string | 是 | 发送者ID | "user_001" |
| content | string | 是 | 消息内容 | "帮我分析市场策略" |
| mentioned_bots | array | 否 | @提及的Bot ID列表 | ["cmo_bot_001"] |
| status | string | 否 | 状态：sending/sent/failed | "sent" |
| timestamp | datetime | 是 | 发送时间 | 2024-01-15T08:00:00Z |

---

## Workflow（工作流）

SOP工作流实体，表示自动化任务流程。

| 字段名 | 类型 | 必填 | 说明 | 示例 |
|--------|------|------|------|------|
| sop_id | string | 是 | 工作流唯一标识 | "sop_001" |
| bot_id | string | 是 | 关联的Bot ID | "work_bot_001" |
| name | string | 是 | 工作流名称 | "每日工作启动流程" |
| description | string | 否 | 工作流描述 | "每天8点自动发送工作计划" |
| triggers | array | 是 | 触发条件列表 | 见下方 |
| workflow_steps | array | 是 | 工作流步骤 | 见下方 |
| enabled | boolean | 是 | 是否启用 | true |
| stats | object | 否 | 执行统计 | 见下方 |
| created_at | datetime | 是 | 创建时间 | 2024-01-15T08:00:00Z |
| updated_at | datetime | 是 | 更新时间 | 2024-01-15T08:00:00Z |

### triggers 数组元素

| 字段名 | 类型 | 必填 | 说明 | 示例 |
|--------|------|------|------|------|
| type | string | 是 | 触发类型：cron/event/condition/chain | "cron" |
| expression | string | 否 | cron表达式或条件表达式 | "0 8 * * *" |
| timezone | string | 否 | 时区（用于cron触发） | "Asia/Shanghai" |
| event_type | string | 否 | 事件类型（用于事件触发） | "message_received" |

### workflow_steps 数组元素

| 字段名 | 类型 | 必填 | 说明 | 示例 |
|--------|------|------|------|------|
| step | integer | 是 | 步骤序号 | 1 |
| action | string | 是 | 动作类型：send_message/fetch_calendar/generate_summary/call_api/wait/condition | "send_message" |
| content | string | 否 | 动作内容 | "早上好！今天是{date}" |
| ai_generate | boolean | 否 | 是否使用AI生成内容 | true |
| source | string | 否 | 数据源 | "google_calendar" |
| prompt | string | 否 | AI提示词 | "基于日历生成今日待办" |

### stats 子字段

| 字段名 | 类型 | 说明 | 示例 |
|--------|------|------|------|
| execution_count | integer | 执行次数 | 127 |
| success_rate | string | 成功率 | "98%" |
| avg_duration | string | 平均执行时长 | "2.3s" |

---

## WorkflowRun（执行记录）

工作流执行记录实体，记录每次工作流执行的详细信息。

| 字段名 | 类型 | 必填 | 说明 | 示例 |
|--------|------|------|------|------|
| execution_id | string | 是 | 执行记录唯一标识 | "exec_001" |
| sop_id | string | 是 | 工作流ID | "sop_001" |
| trigger_time | datetime | 是 | 计划触发时间 | 2024-01-15T08:00:00Z |
| status | string | 是 | 状态：pending/running/completed/failed/cancelled | "completed" |
| result | object | 否 | 执行结果（成功时） | 见下方 |
| error_message | string | 否 | 错误信息（失败时） | "Calendar API超时" |
| started_at | datetime | 否 | 实际开始时间 | 2024-01-15T08:00:01Z |
| completed_at | datetime | 否 | 完成时间 | 2024-01-15T08:00:03Z |
| duration | string | 否 | 执行时长 | "2.3s" |
| steps | array | 否 | 步骤执行详情 | 见下方 |

### result 子字段

| 字段名 | 类型 | 说明 | 示例 |
|--------|------|------|------|
| message_sent | boolean | 消息是否发送成功 | true |
| calendar_fetched | boolean | 日历是否获取成功 | true |
| generated_content | string | AI生成的内容 | "今日待办：1. 完成项目报告..." |

### steps 数组元素

| 字段名 | 类型 | 说明 | 示例 |
|--------|------|------|------|
| step | integer | 步骤序号 | 1 |
| action | string | 动作类型 | "send_message" |
| status | string | 步骤状态 | "completed" |
| result | object | 步骤结果 | {} |
| error | string | 错误信息 | null |

---

## Memory（记忆）

记忆实体，存储Bot的上下文记忆。

| 字段名 | 类型 | 必填 | 说明 | 示例 |
|--------|------|------|------|------|
| memory_id | string | 是 | 记忆唯一标识 | "mem_001" |
| bot_id | string | 是 | Bot ID | "work_bot_001" |
| user_id | string | 否 | 关联的用户ID | "user_001" |
| type | string | 是 | 类型：conversation/preference/fact/instruction | "preference" |
| content | string | 是 | 记忆内容 | "用户喜欢在早上处理重要工作" |
| importance | float (0-1) | 否 | 重要性评分 | 0.8 |
| created_at | datetime | 是 | 创建时间 | 2024-01-15T08:00:00Z |
| updated_at | datetime | 是 | 更新时间 | 2024-01-15T08:00:00Z |

---

## KnowledgeFile（知识文件）

知识文件实体，表示上传到知识库的原始文档。

| 字段名 | 类型 | 必填 | 说明 | 示例 |
|--------|------|------|------|------|
| file_id | string | 是 | 文件唯一标识 | "file_001" |
| bot_id | string | 是 | 关联Bot ID | "work_bot_001" |
| uploaded_by | string | 是 | 上传者user_id | "user_001" |
| filename | string | 是 | 文件名 | "项目计划书.pdf" |
| mime_type | string | 否 | 文件MIME类型 | "application/pdf" |
| size_bytes | integer | 否 | 文件大小（字节） | 283742 |
| status | string | 是 | 状态：uploading/processing/ready/failed | "ready" |
| chunk_count | integer | 否 | 分片数量 | 32 |
| created_at | datetime | 是 | 创建时间 | 2024-01-15T08:00:00Z |
| updated_at | datetime | 是 | 更新时间 | 2024-01-15T08:00:00Z |

---

## KnowledgeChunk（知识分片）

知识分片实体，表示文档切片后的最小检索单元。

| 字段名 | 类型 | 必填 | 说明 | 示例 |
|--------|------|------|------|------|
| chunk_id | string | 是 | 分片唯一标识 | "chunk_001" |
| file_id | string | 是 | 所属文件ID | "file_001" |
| chunk_index | integer | 是 | 分片序号 | 0 |
| content | string | 是 | 分片文本内容 | "本项目目标是..." |
| token_count | integer | 否 | token数量 | 182 |
| vector_ref | string | 否 | 向量库引用ID | "vec_abc123" |
| metadata | object | 否 | 额外元数据 | {"page": 1} |
| created_at | datetime | 是 | 创建时间 | 2024-01-15T08:00:00Z |

---

## 状态枚举汇总

### Bot 状态（status）

| 值 | 说明 |
|----|------|
| online | 在线/活跃 |
| offline | 离线/暂停 |
| suspended | 暂停（系统级） |

### 工作流执行状态（status）

| 值 | 说明 |
|----|------|
| pending | 等待执行 |
| running | 执行中 |
| completed | 已完成 |
| failed | 执行失败 |
| cancelled | 已取消 |

### 群聊状态（status）

| 值 | 说明 |
|----|------|
| active | 活跃中 |
| inactive | 未激活 |
| archived | 已归档 |

### 消息状态（status）

| 值 | 说明 |
|----|------|
| sending | 发送中 |
| sent | 已发送 |
| failed | 发送失败 |

### 记忆类型（type）

| 值 | 说明 |
|----|------|
| conversation | 对话记录 |
| preference | 用户偏好 |
| fact | 事实信息 |
| instruction | 指令 |

---

## 关系图

```
User (用户)
  │
  ├─ 1:N ─> Bot (机器人)
  │             │
  │             ├─ 1:N ─> Workflow (工作流)
  │             │                │
  │             │                └─ 1:N ─> WorkflowRun (执行记录)
  │             │
  │             └─ 1:N ─> Memory (记忆)
  │             │
  │             └─ 1:N ─> KnowledgeFile (知识文件)
  │                                │
  │                                └─ 1:N ─> KnowledgeChunk (知识分片)
  │
  └─ 1:N ─> GroupChat (群聊)
                  │
                  ├─ 1:N ─> GroupMember (群成员) ──> N:1 ─> Bot
                  │
                  └─ 1:N ─> GroupMessage (群消息)
```
