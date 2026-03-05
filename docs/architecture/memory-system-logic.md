# 记忆系统功能与主流程梳理（前后端）

## 文档位置说明

本文件放在 `docs/architecture/`，原因：

- 你需要的是“功能能力 + 大逻辑 + 全链路流程”梳理
- 不只是接口清单（`docs/api/`），也不只是表结构（`docs/database/`）
- `docs/architecture/` 当前为空，适合作为系统级流程说明入口

## 目标范围

本文件梳理当前项目中与“保存记忆内容”相关的全部逻辑，包括：

- 记忆提炼（从消息中提取结构化记忆项）
- 记忆保存（提交提炼结果到数据库）
- 对话归档预览（AI 生成摘要/洞察/tags 草稿）
- 归档保存（追加式保存对话归档）
- 记忆注入（在发送消息时选取历史记忆作为上下文）
- 前端状态同步与 UI 行为

不包含：

- 向量检索 / Embedding（当前未见实现）
- 跨用户共享记忆权限（当前按用户隔离）

## 一、当前“保存记忆内容”有哪些功能

### 1. 记忆提炼（推荐主路径）

用户在当前会话中打开“记忆提炼”面板后，可以：

- 选择本次对话中的消息（默认全选）
- 选择历史归档记忆作为参考（避免重复提取）
- 输入“补充重点”（focus note）
- 调用 AI 生成结构化提炼项（`category + text`）
- 在前端逐条编辑、勾选/取消、删除、新增
- 将勾选项批量保存到数据库（多条 `ConversationArchiveMemory`）

特点：

- 面向“长期记住的事实/偏好/目标/约束”
- 支持人机协同（AI 先提炼，用户再修订）
- 保存时会记录来源消息 ID、来源记忆 ID、focus note（存入 `tags` JSON）

### 2. 对话归档预览（摘要草稿）

用户可对整个会话生成归档草稿（AI 总结）：

- 生成 `title / summary / insight / tags`
- 用于“归档前预览”
- 适合做会话总结卡片、知识沉淀入口

特点：

- 输入是整段会话 transcript
- 输出是单条归档草稿（不是逐条记忆）

### 3. 归档保存（追加式）

支持直接将归档内容写入数据库（`POST /api/memories`）：

- 以单条归档记录方式保存（标题、摘要、洞察、标签）
- 更新 `Conversation.archived_count`

这条路径更偏“对话归档”，不是“结构化长期记忆提炼”。

### 4. 记忆注入（发送消息时作为上下文）

用户可在当前主题下选择历史记忆进行注入：

- 打开“选择注入记忆”面板
- 从当前 `folder` 下的归档记忆中勾选多条
- 点击确认后写入前端状态 `state.injectedMemoryIds`
- 发送消息时作为 `memory_ids` 一并传给聊天接口

聊天服务会：

- 查询对应 `ConversationArchiveMemory`
- 拼接进 system prompt/context
- 提升回答的上下文连续性

## 二、数据模型（与记忆相关）

### 1. 主要表：`ConversationArchiveMemory`（映射表名 `memories`）

Prisma 模型：`ConversationArchiveMemory`

核心字段用途：

- `memory_id`：记忆记录 ID
- `folder_id`：主题/分组归属（前端按此做记忆选择）
- `conversation_id`：来源会话
- `title`：标题（在提炼 commit 路径里当前存 `category`）
- `summary`：摘要（在提炼 commit 路径里当前存 `text`）
- `insight`：洞察（提炼 commit 路径里通常为空）
- `tags`：JSON，可存来源信息（source message ids 等）
- `archive_index`：该会话第几次归档/提炼批次
- `created_at`：归档时间

### 2. 相关表：`Conversation`

与记忆流程关联字段：

- `folder_id`：当前会话所属主题（Folder）
- `archived_count`：已归档次数
- `last_memory_archived_at`：最近一次记忆归档时间
- `is_deleted`：软删除（记忆相关接口通常会校验会话未删除）

### 3. 相关表：`Message`

提炼素材来源表：

- `message_id`
- `conversation_id`
- `sender_type`
- `content`
- `timestamp`

注意：

- `memories` 路由里部分查询当前未过滤 `Message.is_deleted`（编辑版本功能上线后可补）

## 三、前端功能入口与用户路径（现状）

前端主文件：`frontend/public/assets/scripts/chat.js`

### A. 入口按钮

- `archiveConversationBtn`：打开“记忆提炼”面板（右侧）
- `injectMemoryBtn`：打开“选择注入记忆”面板（右侧）
- `logBtn`：也会打开“记忆提炼”面板（快捷入口）

### B. 记忆提炼主流程（UI）

1. 用户点击“记忆提炼”
2. 前端调用 `openMemoryExtractPanel(conversationId)`
3. 请求 `GET /api/memories/extract/context`
4. 加载：
   - 当前会话消息列表（可勾选）
   - 同主题下历史归档记忆（可勾选）
5. 用户填写 `focus note`
6. 点击“预览提炼” -> `POST /api/memories/extract/preview`
7. 返回提炼条目后，前端支持：
   - 勾选是否保存
   - 修改文本
   - 新增/删除条目
8. 点击“保存记忆” -> `POST /api/memories/extract/commit`
9. 成功后更新本地状态并关闭右侧面板

### C. 记忆注入流程（UI）

1. 用户点击“选择注入记忆”
2. 前端根据当前会话找 `folder_id`
3. 请求 `GET /api/memories?folder_id=...`
4. 勾选若干条历史记忆
5. 点击确认后保存到 `state.injectedMemoryIds`
6. 用户发送消息时将 `memory_ids` 带给聊天接口

### D. 编辑消息对记忆注入的影响（你刚加的行为）

当用户编辑历史消息并保存时，前端会：

- 刷新当前会话消息列表
- 清空 `state.injectedMemoryIds`
- 清空记忆面板勾选项

原因：

- 编辑消息会改变对话分支/上下文
- 防止旧记忆选择继续作用在新分支上，造成上下文污染

## 四、后端接口与职责分工（记忆相关）

后端文件：`backend/src/routes/memories.ts`

### 1. `GET /api/memories/extract/context`

作用：

- 为“记忆提炼”面板加载上下文

返回内容：

- 当前会话消息（过滤 `system`）
- 同 scope 下历史归档记忆（按时间倒序）
- 元数据（`conversation_id/folder_id/bot_id`）

关键校验：

- 已登录
- `conversation_id` 必填
- 会话归属当前用户

### 2. `POST /api/memories/extract/preview`

作用：

- 让 AI 基于“选中消息 + 已选历史记忆 + focus note”生成结构化提炼项

输入重点：

- `selected_message_ids`
- `selected_archive_memory_ids`
- `focus_note`

输出重点：

- `items: [{ text, category }]`
- `meta`（模型、解析状态、计数）

特点：

- 内置 JSON 提取与容错解析
- AI 输出不规范时有 fallback

### 3. `POST /api/memories/extract/commit`

作用：

- 批量保存提炼结果（主保存路径）

行为摘要：

- 校验会话、folder、消息/历史记忆 ID 归属
- 自动处理“会话尚未绑定真实 folder”的情况（可自动建默认主题）
- 按当前归档批次写入多条 `ConversationArchiveMemory`
- 更新会话：
  - `folder_id`（必要时）
  - `archived_count`
  - `last_memory_archived_at`

存储约定（当前实现）：

- `title = category`
- `summary = text`
- `tags` 里写来源信息与 `focus_note`

### 4. `POST /api/memories/preview`

作用：

- 对整段对话生成归档草稿（摘要/洞察/tags）

适用场景：

- 在保存归档前先看 AI 总结结果

### 5. `POST /api/memories`

作用：

- 直接保存单条归档记录（追加式）

适用场景：

- 用户已确认标题/摘要/洞察/tags，直接写入

### 6. `GET /api/memories?folder_id=...`

作用：

- 列出当前主题下所有可注入记忆（用于右侧“选择注入记忆”面板）

返回：

- 记忆列表 + `summaryPreview`

## 五、AI 逻辑（提炼与归档）

### 1. 提炼 AI（`generateExtractItemsDraft`）

目标：

- 从用户选中消息中提取“长期有价值信息”

提示词规则（当前实现要点）：

- 严格输出 JSON
- 输出 schema：`{"items":[{"text":"...","category":"..."}]}`
- 优先提取：
  - 用户信息
  - 目标
  - 偏好
  - 约束
  - 状态变化
- 参考历史归档记忆避免重复
- `focus_note` 优先

容错逻辑：

- 尝试提取 fenced JSON / 对象 / 数组
- 失败时从文本按 bullet/fallback 提炼

### 2. 归档 AI（`generateArchiveDraft`）

目标：

- 把整段会话整理成检索友好的归档草稿

输出 schema：

- `title`
- `summary`
- `insight`
- `tags[]`

容错逻辑：

- 无法解析 JSON 时退回 transcript 截断摘要

## 六、前端状态流（核心状态）

前端主状态对象：`state`

### 与记忆直接相关

- `injectedMemoryIds: Set<string>`
  - 当前会话下一次发送要注入的记忆 ID 集合

- `memoryExtractDraft`
  - `messages`：候选消息
  - `historyMemories`：候选历史归档记忆
  - `selectedMessageIds`
  - `selectedMemoryIds`
  - `focusNote`
  - `items`：提炼结果（可编辑）
  - `loadingContext/loadingPreview/saving`
  - `meta`

- `archivesByConversationId`
  - 前端归档摘要展示缓存（UI 用）
  - 非数据库唯一真源

- `archivedConversationIds`
  - 用于话题列表显示“已归档”标记

## 七、完整主流程（从“保存记忆”视角）

### 路径 A：提炼并保存（推荐）

1. 选择会话
2. 打开记忆提炼面板
3. 拉取提炼上下文（消息 + 历史记忆）
4. 用户选择消息/历史记忆，填写 focus note
5. AI 提炼预览
6. 用户编辑和勾选结果
7. 提交保存
8. 后端写入多条 `memories`
9. 更新 `conversation.archived_count / last_memory_archived_at`
10. 前端更新归档标识与本地缓存

### 路径 B：查看并注入历史记忆

1. 打开记忆选择面板
2. 按当前会话 `folder_id` 列出记忆
3. 用户勾选记忆
4. 保存到 `state.injectedMemoryIds`
5. 发送消息时作为 `memory_ids` 进入聊天接口
6. 聊天后端拼接记忆内容到 AI 上下文

## 八、关键业务规则（当前实现）

### 1. 记忆作用域（scope）

历史归档记忆选择范围主要按：

- 同用户
- 同 bot
- 同 folder（如果会话已绑定 folder）
- 会话未删除

这使得“同主题下的记忆”更容易复用，避免跨主题串味。

### 2. 自动创建主题（folder）

当会话尚未绑定真实 `folder` 时，`extract/commit` 路径允许：

- 自动创建默认主题
- 再将记忆写入该主题

这保证“先聊天、后整理记忆”的路径不会卡死。

### 3. 归档批次编号 `archive_index`

每次对同一会话执行一次归档/提炼保存，都会递增：

- 可用于展示“第 N 次归档”
- 可用于后续做版本对比/时间线

## 九、当前限制与风险（建议后续处理）

### 1. `memories` 路由未统一过滤消息软删除版本

随着消息编辑/版本化上线，提炼上下文如果不加 `is_deleted: false`，可能把旧版本消息也拿进来。

建议：

- 在 `memories.ts` 中所有 `prisma.message.findMany/count` 查询补 `is_deleted: false`

### 2. “提炼保存”与“归档保存”语义混合

当前 `ConversationArchiveMemory` 同时承载：

- 结构化记忆项（提炼 commit）
- 会话归档摘要（archive）

建议：

- 后续在 `tags` 增加 `record_type`（`extract_item` / `archive_summary`）
- 或拆分为两类实体

### 3. 前端归档展示部分是本地缓存驱动

`archivesByConversationId` 是 UI 缓存，不完全等于数据库真实状态。

建议：

- 在会话切换/刷新时从后端补拉归档摘要聚合数据

### 4. 注入记忆是“手动勾选”

当前没有自动检索/召回排序。

建议：

- Phase 后续可加入基于关键词或 embedding 的自动推荐记忆

## 十、建议的文档联动（后续）

为了让文档结构更完整，建议后续补三份文档：

- `docs/api/memory-extract.md`
  - 专门写提炼与归档接口示例
- `docs/database/memories-table.md`
  - `ConversationArchiveMemory` 字段语义与使用约定
- `docs/architecture/chat-memory-context.md`
  - 聊天发送时如何注入记忆到 AI 上下文

## 十一、代码入口索引（便于继续开发）

后端：

- `backend/src/routes/memories.ts`
- `backend/src/services/chat.service.ts`（发送消息时注入 `memory_ids`）

前端：

- `frontend/public/assets/scripts/chat.js`
  - `openMemoryExtractPanel`
  - `previewMemoryExtract`
  - `commitMemoryExtract`
  - `loadMemoryPickerOptions`
  - `wireComposerToolbar`

---

如果后续要继续做“记忆引用到消息版本分支”的能力，建议下一步先统一 `memories.ts` 中的消息查询为 `is_deleted = false`，再增加 `source_message_versions` 记录。
