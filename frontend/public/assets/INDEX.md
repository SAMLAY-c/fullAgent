# 前端资源 (assets) 索引
**职责**: 存放前端的所有 JavaScript、CSS 和库文件

| 子目录 | 角色 | 功能描述 |
| :--- | :--- | :--- |
| lib/ | Libraries | 存放共享的客户端库和工具函数 |
| scripts/ | Scripts | 存放各页面的业务逻辑脚本 |
| styles/ | Styles | 存放 CSS 样式文件 |

## lib/ 目录
详见 [lib/INDEX.md](../lib/INDEX.md)

## scripts/ 目录
| 文件名 | 角色 | 功能描述 | 依赖 |
| :--- | :--- | :--- | :--- |
| admin.js | Admin UI | 管理界面的主要逻辑 | api-client.js, bot-client.js, utils.js |
| chat.js | Chat UI | 聊天界面的主要逻辑 | api-client.js, bot-client.js, utils.js, marked.js |
| folders-demo.js | Folder Demo | 文件夹功能的演示页面 | utils.js |
| groups-module.js | Groups Module | 群组管理模块 | utils.js |
| login.js | Login UI | 登录界面的逻辑 | api-client.js, auth-manager.js |

## styles/ 目录
| 文件名 | 角色 | 功能描述 |
| :--- | :--- | :--- |
| admin.css | Admin Styles | 管理界面样式 |
| chat.css | Chat Styles | 聊天界面样式 |
| folders-demo.css | Folder Demo Styles | 文件夹演示页面样式 |
| login.css | Login Styles | 登录界面样式 |
