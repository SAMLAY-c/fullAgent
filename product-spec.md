# Bot Agent 产品功能规格书

## 核心功能架构

### 1. Bot管理系统（已有）
- 多场景Bot实例
- 独立配置和上下文
- 统一后台管理

### 2. SOP工作流模块（新增）
- 定时任务配置
- 工作流编排
- 条件触发

### 3. 群聊协作模块（新增）
- 多Bot协同
- 群内角色分工
- 智能路由

## 功能详细设计

### 【SOP工作流】

#### 使用场景
- 早上8点：工作Bot提醒今日日程
- 中午12点：生活Bot推荐午餐
- 晚上9点：恋爱Bot提醒给对象发消息
- 每周五下午：总结本周工作

#### 数据结构
```json
{
  "sop_id": "sop_001",
  "bot_id": "work_bot_001",
  "name": "每日工作启动流程",
  "triggers": [
    {
      "type": "cron",
      "expression": "0 8 * * *",
      "timezone": "Asia/Shanghai"
    }
  ],
  "workflow": [
    {
      "step": 1,
      "action": "send_message",
      "content": "早上好！今天是{date}，让我为你准备今日计划...",
      "ai_generate": true
    },
    {
      "step": 2,
      "action": "fetch_calendar",
      "source": "google_calendar"
    },
    {
      "step": 3,
      "action": "generate_summary",
      "prompt": "基于日历生成今日待办事项"
    }
  ],
  "enabled": true
}
```

#### 触发类型
1. **定时触发** (cron表达式)
2. **事件触发** (用户消息包含关键词)
3. **条件触发** (数据达到阈值)
4. **链式触发** (完成某个任务后触发下一个)

### 【群聊协作】

#### 核心概念
一个"群聊"是多个Bot的协作空间，每个Bot有不同职责

#### 使用场景
**场景1：创业团队群**
- CEO Bot：战略决策、资源分配
- CTO Bot：技术方案、架构建议
- CMO Bot：市场策略、用户增长

**场景2：个人成长群**
- 工作Bot：任务管理
- 学习Bot：知识总结
- 健康Bot：运动提醒

#### 群聊数据结构
```json
{
  "group_id": "group_001",
  "name": "我的成长小组",
  "type": "personal",
  "members": [
    {
      "bot_id": "work_bot_001",
      "role": "效率专家",
      "permissions": ["read", "write", "mention"],
      "trigger_keywords": ["任务", "工作", "deadline"]
    },
    {
      "bot_id": "life_bot_001", 
      "role": "生活助手",
      "permissions": ["read", "write"],
      "trigger_keywords": ["健康", "饮食", "运动"]
    }
  ],
  "routing_strategy": "keyword_match", // 或 "round_robin", "ai_judge"
  "conversation_mode": "multi_turn" // 允许Bot之间对话
}
```

#### 智能路由策略
1. **关键词匹配**：消息包含特定词汇时唤醒对应Bot
2. **AI判断**：用主Bot分析消息内容，决定转发给谁
3. **全员响应**：所有Bot都收到消息，自主决定是否回复
4. **轮询模式**：按顺序让每个Bot回复

#### Bot协作模式
```
用户: "我想健身但工作太忙了"

→ 路由层分析: 包含"健身"和"工作"
→ 同时通知: 健康Bot + 工作Bot

健康Bot: "建议每天早晨30分钟HIIT..."
工作Bot: "我帮你优化时间表，早上7:00-7:30可以空出来"

→ 两个Bot协同给出方案
```

## 完整功能列表

### 核心功能
✅ Bot实例管理
✅ 多场景切换
✅ 对话历史记录
🆕 SOP工作流配置
🆕 定时任务调度
🆕 群聊创建和管理
🆕 多Bot协作
🆕 智能消息路由

### 辅助功能
- 知识库管理（给Bot添加专属知识）
- 数据统计分析
- API接口调用
- 导出/导入配置
- 权限和分享

## 数据库Schema更新

### 新增表

#### sop_workflows 表
```sql
CREATE TABLE sop_workflows (
    sop_id VARCHAR PRIMARY KEY,
    bot_id VARCHAR,
    name VARCHAR,
    description TEXT,
    triggers JSONB,  -- 触发条件
    workflow JSONB,  -- 工作流步骤
    enabled BOOLEAN,
    created_at TIMESTAMP,
    updated_at TIMESTAMP,
    FOREIGN KEY (bot_id) REFERENCES bots(bot_id)
);
```

#### sop_executions 表（执行记录）
```sql
CREATE TABLE sop_executions (
    execution_id VARCHAR PRIMARY KEY,
    sop_id VARCHAR,
    trigger_time TIMESTAMP,
    status VARCHAR,  -- pending, running, completed, failed
    result JSONB,
    error_message TEXT,
    FOREIGN KEY (sop_id) REFERENCES sop_workflows(sop_id)
);
```

#### groups 表
```sql
CREATE TABLE groups (
    group_id VARCHAR PRIMARY KEY,
    name VARCHAR,
    type VARCHAR,  -- personal, team, public
    routing_strategy VARCHAR,
    conversation_mode VARCHAR,
    created_by VARCHAR,
    created_at TIMESTAMP
);
```

#### group_members 表
```sql
CREATE TABLE group_members (
    id SERIAL PRIMARY KEY,
    group_id VARCHAR,
    bot_id VARCHAR,
    role VARCHAR,
    permissions JSONB,
    trigger_keywords TEXT[],
    priority INTEGER,
    FOREIGN KEY (group_id) REFERENCES groups(group_id),
    FOREIGN KEY (bot_id) REFERENCES bots(bot_id)
);
```

#### group_messages 表
```sql
CREATE TABLE group_messages (
    message_id VARCHAR PRIMARY KEY,
    group_id VARCHAR,
    sender_type VARCHAR,  -- user, bot
    sender_id VARCHAR,
    content TEXT,
    mentioned_bots VARCHAR[],  -- @提及的Bot
    timestamp TIMESTAMP,
    FOREIGN KEY (group_id) REFERENCES groups(group_id)
);
```

## API接口设计

### SOP工作流相关

```
POST /api/sop/create
创建SOP工作流

GET /api/sop/list?bot_id={bot_id}
获取某个Bot的所有SOP

PUT /api/sop/{sop_id}/enable
启用SOP

DELETE /api/sop/{sop_id}
删除SOP

GET /api/sop/{sop_id}/executions
查看执行历史
```

### 群聊相关

```
POST /api/groups/create
创建群聊

POST /api/groups/{group_id}/add-bot
添加Bot到群聊

POST /api/groups/{group_id}/message
发送消息到群聊

GET /api/groups/{group_id}/messages
获取群聊历史

PUT /api/groups/{group_id}/routing
配置路由策略
```

## 前后端交互流程

### SOP定时任务流程
```
后端定时器 → 检查待执行SOP → 执行工作流 → 调用Bot → 发送消息/通知
                                              ↓
                                        记录执行日志
                                              ↓
                                        更新前端状态
```

### 群聊消息流程
```
用户发送消息 → 群聊路由层
                    ↓
            [关键词匹配/AI判断]
                    ↓
    ┌───────────┬───────────┬───────────┐
    ↓           ↓           ↓           ↓
  Bot A       Bot B       Bot C      (全部/部分)
    ↓           ↓           ↓
  生成回复    生成回复     不回复
    ↓           ↓
    └───────────┴──────→ 按优先级排序
                              ↓
                         展示给用户
```

