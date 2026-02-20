const API_BASE = process.env.API_BASE || 'http://localhost:3000';
const USERNAME = process.env.TEST_USERNAME || 'admin';
const PASSWORD = process.env.TEST_PASSWORD || 'admin123';

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m'
};

let total = 0;
let passed = 0;

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function pass(msg) {
  total += 1;
  passed += 1;
  log(`PASS ${msg}`, 'green');
}

function fail(msg, detail) {
  total += 1;
  log(`FAIL ${msg}`, 'red');
  if (detail) {
    log(`  -> ${detail}`, 'yellow');
  }
}

async function request(method, path, body, token) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;

  const response = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined
  });

  const text = await response.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  return { status: response.status, data };
}

function expectStatus(name, actual, expected) {
  if (actual === expected) {
    pass(`${name} -> HTTP ${expected}`);
    return true;
  }
  fail(`${name} -> expected HTTP ${expected}`, `actual HTTP ${actual}`);
  return false;
}

async function run() {
  log('\n=== Chat API 自动化测试（无框架）===', 'cyan');
  log(`API_BASE=${API_BASE}, USERNAME=${USERNAME}\n`, 'cyan');

  let accessToken = '';
  let botId = '';
  let conversationId = '';

  const login = await request('POST', '/api/auth/login', {
    username: USERNAME,
    password: PASSWORD
  });
  if (expectStatus('登录', login.status, 200)) {
    accessToken = login.data?.access_token || '';
    if (accessToken) {
      pass('登录返回 access_token');
    } else {
      fail('登录返回 access_token', 'response missing access_token');
    }
  }

  const noToken = await request('GET', '/api/chat/conversations');
  expectStatus('无 token 访问 /api/chat/conversations', noToken.status, 401);

  const createBot = await request('POST', '/api/bots', {
    name: `Chat Test Bot ${Date.now()}`,
    type: 'work',
    scene: 'work',
    description: 'created by chat-api.test.js'
  }, accessToken);

  if (expectStatus('创建测试 Bot', createBot.status, 201)) {
    botId = createBot.data?.bot_id || '';
    if (botId) {
      pass(`创建测试 Bot 成功 bot_id=${botId}`);
    } else {
      fail('创建测试 Bot 成功 bot_id', 'response missing bot_id');
    }
  }

  const createConversation = await request('POST', '/api/chat/conversations', {
    bot_id: botId,
    title: `Chat API Test Topic ${Date.now()}`
  }, accessToken);

  if (expectStatus('创建会话', createConversation.status, 201)) {
    conversationId = createConversation.data?.conversation_id || '';
    if (conversationId) {
      pass(`创建会话成功 conversation_id=${conversationId}`);
    } else {
      fail('创建会话成功 conversation_id', 'response missing conversation_id');
    }
  }

  const listConversations = await request('GET', `/api/chat/conversations?bot_id=${encodeURIComponent(botId)}`, null, accessToken);
  if (expectStatus('查询会话列表', listConversations.status, 200)) {
    const conversations = Array.isArray(listConversations.data?.conversations) ? listConversations.data.conversations : [];
    const exists = conversations.some((c) => c.conversation_id === conversationId);
    if (exists) {
      pass('会话列表包含新建会话');
    } else {
      fail('会话列表包含新建会话', 'conversation not found in list');
    }
  }

  const sendMessage = await request('POST', `/api/chat/conversations/${encodeURIComponent(conversationId)}/messages`, {
    content: 'hello chat api test'
  }, accessToken);

  if (expectStatus('发送消息', sendMessage.status, 201)) {
    if (sendMessage.data?.user_message?.content === 'hello chat api test') {
      pass('用户消息内容正确写入');
    } else {
      fail('用户消息内容正确写入', `actual=${sendMessage.data?.user_message?.content}`);
    }

    if (sendMessage.data?.bot_message?.content) {
      pass('机器人回复已返回');
    } else {
      fail('机器人回复已返回', 'missing bot_message.content');
    }
  }

  const listMessages = await request('GET', `/api/chat/conversations/${encodeURIComponent(conversationId)}/messages`, null, accessToken);
  if (expectStatus('查询消息列表', listMessages.status, 200)) {
    const messages = Array.isArray(listMessages.data?.messages) ? listMessages.data.messages : [];
    if (messages.length >= 2) {
      pass('消息列表至少包含 2 条消息');
    } else {
      fail('消息列表至少包含 2 条消息', `actual count=${messages.length}`);
    }
  }

  const emptyMessage = await request('POST', `/api/chat/conversations/${encodeURIComponent(conversationId)}/messages`, {
    content: '   '
  }, accessToken);
  expectStatus('空消息校验', emptyMessage.status, 400);

  const wrongConversation = await request('GET', '/api/chat/conversations/conv_not_exist/messages', null, accessToken);
  expectStatus('查询不存在会话', wrongConversation.status, 404);

  if (botId) {
    const cleanup = await request('DELETE', `/api/bots/${encodeURIComponent(botId)}`, null, accessToken);
    if (cleanup.status === 200) {
      pass('清理测试 Bot 成功');
    } else {
      fail('清理测试 Bot 成功', `actual HTTP ${cleanup.status}`);
    }
  }

  log('\n=== 测试汇总 ===', 'cyan');
  log(`结果: ${passed}/${total} 通过`, passed === total ? 'green' : 'yellow');

  if (passed !== total) {
    process.exit(1);
  }
}

run().catch((err) => {
  log(`未捕获异常: ${err?.message || err}`, 'red');
  process.exit(1);
});
