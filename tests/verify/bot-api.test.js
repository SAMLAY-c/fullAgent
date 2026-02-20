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
  log('\n=== Bot API 自动化测试（无框架）===', 'cyan');
  log(`API_BASE=${API_BASE}, USERNAME=${USERNAME}\n`, 'cyan');

  let accessToken = '';
  let botId = '';

  // 1) 登录
  const login = await request('POST', '/api/auth/login', {
    username: USERNAME,
    password: PASSWORD
  });

  if (expectStatus('登录', login.status, 200)) {
    if (login.data?.access_token) {
      accessToken = login.data.access_token;
      pass('登录返回 access_token');
    } else {
      fail('登录返回 access_token', 'response missing access_token');
    }
  }

  // 2) 无 token 访问 bots（异常用例）
  const noTokenBots = await request('GET', '/api/bots');
  expectStatus('无 token 访问 /api/bots', noTokenBots.status, 401);

  // 3) 创建 Bot
  const createPayload = {
    name: `API Test Bot ${Date.now()}`,
    type: 'work',
    scene: 'work',
    description: 'created by bot-api.test.js',
    config: { model: 'mock', temperature: 0.2 }
  };

  const created = await request('POST', '/api/bots', createPayload, accessToken);
  if (expectStatus('创建 Bot', created.status, 201)) {
    if (created.data?.bot_id) {
      botId = created.data.bot_id;
      pass(`创建后拿到 bot_id=${botId}`);
    } else {
      fail('创建后拿到 bot_id', 'response missing bot_id');
    }
  }

  // 4) 获取 Bot 列表并验证包含新建 Bot
  const list = await request('GET', '/api/bots', null, accessToken);
  if (expectStatus('获取 Bot 列表', list.status, 200)) {
    const bots = Array.isArray(list.data?.bots) ? list.data.bots : [];
    const exists = bots.some((b) => b.bot_id === botId);
    if (exists) {
      pass('Bot 列表包含新创建 Bot');
    } else {
      fail('Bot 列表包含新创建 Bot', `bot_id ${botId} not found`);
    }
  }

  // 5) 更新 Bot
  const updatedName = `API Test Bot Updated ${Date.now()}`;
  const updated = await request(
    'PUT',
    `/api/bots/${encodeURIComponent(botId)}`,
    { name: updatedName, description: 'updated by bot-api.test.js' },
    accessToken
  );

  if (expectStatus('更新 Bot', updated.status, 200)) {
    if (updated.data?.name === updatedName) {
      pass('更新后名称生效');
    } else {
      fail('更新后名称生效', `actual name=${updated.data?.name}`);
    }
  }

  // 6) 切换状态
  const statusResp = await request(
    'PUT',
    `/api/bots/${encodeURIComponent(botId)}/status`,
    { status: 'online' },
    accessToken
  );

  if (expectStatus('切换 Bot 状态', statusResp.status, 200)) {
    if (statusResp.data?.status === 'online') {
      pass('状态切换为 online');
    } else {
      fail('状态切换为 online', `actual status=${statusResp.data?.status}`);
    }
  }

  // 7) 删除 Bot
  const deleted = await request('DELETE', `/api/bots/${encodeURIComponent(botId)}`, null, accessToken);
  if (expectStatus('删除 Bot', deleted.status, 200)) {
    if (deleted.data?.success === true) {
      pass('删除返回 success=true');
    } else {
      fail('删除返回 success=true', `actual response=${JSON.stringify(deleted.data)}`);
    }
  }

  // 8) 验证删除后不可查询
  const getAfterDelete = await request('GET', `/api/bots/${encodeURIComponent(botId)}`, null, accessToken);
  expectStatus('删除后查询 Bot', getAfterDelete.status, 404);

  // 9) 删除不存在 Bot（异常用例）
  const deleteMissing = await request('DELETE', '/api/bots/not_exists_bot_id', null, accessToken);
  expectStatus('删除不存在 Bot', deleteMissing.status, 404);

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
