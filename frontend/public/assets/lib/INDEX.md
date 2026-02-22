# 前端公共库 (lib) 索引
**职责**: 存放前端各页面共享的通用工具和客户端库

| 文件名 | 角色 | 功能描述 | 依赖 |
| :--- | :--- | :--- | :--- |
| api-client.js | API Client | 封装 HTTP 请求，处理认证和错误 | fetch API, localStorage |
| auth-manager.js | Auth Manager | 管理用户认证状态和 token | localStorage |
| bot-client.js | Bot Client | 提供 Bot 相关的 API 调用方法 | api-client.js |
| utils.js | Utils | 提供通用工具函数（HTML 转义、时间格式化等） | 无 |
