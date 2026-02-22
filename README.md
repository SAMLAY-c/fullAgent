# Bot Agent Platform - 快速启动指南

## 🎯 一键访问

### 访问地址
- **登录页**：http://localhost:8915/login.html
- **管理后台**：http://localhost:8915/bot-admin-ui-v2.html
- **聊天界面**：http://localhost:8915/bot-chat-ui-v2.html

### 默认账号
- **用户名**：`admin`
- **密码**：`admin123`

---

## 🚀 服务管理

### 查看服务状态
```bash
# 查看后端服务
pm2 status

# 查看数据库容器
docker ps
```

### 重启服务
```bash
# 重启后端
pm2 restart bot-agent-platform

# 重启数据库
docker-compose restart
```

### 查看日志
```bash
# 后端日志
pm2 logs bot-agent-platform

# 数据库日志
docker logs bot_agent_db
docker logs bot_agent_redis
```

---

## ⚙️ 开机自启

### Windows 自动启动配置

**步骤 1：设置 Docker Desktop 开机自启**
1. 打开 Docker Desktop
2. 点击右上角 ⚙️ Settings
3. 勾选 ✅ "Start Docker Desktop when you sign in to Windows"
4. 点击 "Apply & Restart"

**步骤 2：添加启动脚本**

按 `Win + R`，输入 `shell:startup` 回车，将 `startup.bat` 的快捷方式复制到此文件夹。

### 手动启动所有服务
```bash
# 双击运行 startup.bat
# 或在命令行执行
F:\samlay-c\agent-group\startup.bat
```

---

## 📊 功能对比

| 功能 | 状态 | 说明 |
|------|------|------|
| 用户认证 | ✅ | 完整的 JWT 认证系统 |
| 聊天记录 | ✅ | 永久保存到数据库 |
| Bot 管理 | ✅ | 创建/修改/删除 Bot |
| 群组协作 | ✅ | 多 Bot 协作 |
| 工作流自动化 | ✅ | 定时任务/Cron 表达式 |
| 记忆系统 | ✅ | 长期记忆存储 |
| 知识库 | ✅ | 文件上传和检索 |

---

## 🔧 故障排查

### 问题：无法连接数据库
```bash
# 检查 Docker Desktop 是否运行
docker ps

# 启动数据库
docker-compose up -d
```

### 问题：后端服务未启动
```bash
# 检查 PM2 状态
pm2 status

# 重启后端
cd F:\samlay-c\agent-group\backend
npm run pm2:start
```

### 问题：端口被占用
```bash
# 检查端口占用
netstat -ano | findstr :8915

# 修改端口（编辑 .env 文件）
PORT=8915
```

---

## 📝 技术栈

- **后端**：Node.js + TypeScript + Express
- **数据库**：PostgreSQL 16
- **缓存**：Redis 7
- **ORM**：Prisma
- **进程管理**：PM2
- **容器化**：Docker + Docker Compose

---

## 📞 获取帮助

查看详细文档：
- 开机自启配置说明.md
- CLAUDE.md（项目规范）

---

**祝使用愉快！** 🎉
