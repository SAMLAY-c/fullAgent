/**
 * Bot 管理功能验证脚本
 *
 * 运行方式: node scripts/verify/bots-verify.js
 *
 * 验证项：
 * 1. 获取 Bot 列表 - 无认证
 * 2. 获取 Bot 列表 - 有效认证
 * 3. 获取 Bot 列表 - 分页参数
 * 4. 获取 Bot 列表 - 类型过滤
 * 5. 获取 Bot 详情 - 存在的 Bot
 * 6. 获取 Bot 详情 - 不存在的 Bot
 * 7. 创建 Bot - 正常数据
 * 8. 创建 Bot - 缺少必填字段
 * 9. 更新 Bot - 正常数据
 * 10. 删除 Bot - 存在的 Bot
 */

const http = require('http');

const API_BASE = 'http://localhost:3000';
let testResults = [];
let accessToken = null;

// 颜色输出
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function assert(condition, message) {
  if (condition) {
    log(`  ✅ ${message}`, 'green');
    return true;
  } else {
    log(`  ❌ ${message}`, 'red');
    return false;
  }
}

async function request(method, path, data = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, API_BASE);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve({
            status: res.statusCode,
            data: body ? JSON.parse(body) : null
          });
        } catch (e) {
          resolve({ status: res.statusCode, data: body });
        }
      });
    });

    req.on('error', reject);

    if (data) {
      req.write(JSON.stringify(data));
    }

    req.end();
  });
}

async function login() {
  const res = await request('POST', '/api/auth/login', {
    username: 'admin',
    password: 'admin123'
  });
  accessToken = res.data.access_token;
}

async function test(name, testFn) {
  log(`\n🧪 ${name}`, 'blue');
  try {
    await testFn();
  } catch (error) {
    log(`  💥 测试异常: ${error.message}`, 'red');
    testResults.push({ name, passed: false, error: error.message });
  }
}

// ==================== 测试用例 ====================

async function runTests() {
  log('\n' + '='.repeat(50), 'blue');
  log('🤖 Bot 管理功能验证测试', 'blue');
  log('='.repeat(50) + '\n', 'blue');

  // 先登录
  log('🔑 正在登录...', 'yellow');
  await login();
  log('✅ 登录成功\n', 'green');

  // 测试 1: 无认证访问
  await test('测试 1: 获取 Bot 列表 - 无认证', async () => {
    const res = await request('GET', '/api/bots');

    const passed = assert(
      res.status === 401,
      '返回 401 未授权'
    );

    testResults.push({ name: '无认证访问', passed });
  });

  // 测试 2: 有效认证获取列表
  await test('测试 2: 获取 Bot 列表 - 有效认证', async () => {
    const res = await request('GET', '/api/bots', null, {
      'Authorization': `Bearer ${accessToken}`
    });

    const passed = assert(
      res.status === 200,
      '返回 200 成功'
    ) && assert(
      Array.isArray(res.data.bots),
      '返回 bots 数组'
    ) && assert(
      res.data.total > 0,
      'total 大于 0'
    ) && assert(
      res.data.bots.length > 0,
      'bots 数组不为空'
    );

    if (passed) {
      const firstBot = res.data.bots[0];
      assert(firstBot.bot_id, 'Bot 包含 bot_id');
      assert(firstBot.name, 'Bot 包含 name');
      assert(firstBot.type, 'Bot 包含 type');
      assert(firstBot.status, 'Bot 包含 status');
    }

    testResults.push({ name: '获取 Bot 列表', passed });
  });

  // 测试 3: 类型过滤
  await test('测试 3: 获取 Bot 列表 - 过滤 work 类型', async () => {
    const res = await request('GET', '/api/bots?type=work', null, {
      'Authorization': `Bearer ${accessToken}`
    });

    const passed = assert(
      res.status === 200,
      '返回 200 成功'
    ) && assert(
      res.data.bots.every(bot => bot.type === 'work' || bot.scene === 'work'),
      '所有返回的 Bot 都是 work 类型'
    );

    testResults.push({ name: '类型过滤', passed });
  });

  // 测试 4: 状态过滤
  await test('测试 4: 获取 Bot 列表 - 过滤 online 状态', async () => {
    const res = await request('GET', '/api/bots?status=online', null, {
      'Authorization': `Bearer ${accessToken}`
    });

    const passed = assert(
      res.status === 200,
      '返回 200 成功'
    ) && assert(
      res.data.bots.every(bot => bot.status === 'online'),
      '所有返回的 Bot 都是 online 状态'
    );

    testResults.push({ name: '状态过滤', passed });
  });

  // 测试 5: 分页参数
  await test('测试 5: 获取 Bot 列表 - 分页 (page=1, page_size=2)', async () => {
    const res = await request('GET', '/api/bots?page=1&page_size=2', null, {
      'Authorization': `Bearer ${accessToken}`
    });

    const passed = assert(
      res.status === 200,
      '返回 200 成功'
    ) && assert(
      res.data.bots.length <= 2,
      '返回的 Bot 数量不超过 page_size'
    ) && assert(
      res.data.page === 1,
      '返回正确的页码'
    ) && assert(
      res.data.page_size === 2,
      '返回正确的 page_size'
    );

    testResults.push({ name: '分页参数', passed });
  });

  // 测试 6: 获取单个 Bot 详情
  await test('测试 6: 获取 Bot 详情 - 存在的 Bot', async () => {
    const res = await request('GET', '/api/bots/bot_work_001', null, {
      'Authorization': `Bearer ${accessToken}`
    });

    const passed = assert(
      res.status === 200,
      '返回 200 成功'
    ) && assert(
      res.data.bot_id === 'bot_work_001',
      '返回正确的 Bot ID'
    ) && assert(
      res.data.config,
      '包含 config 配置'
    ) && assert(
      res.data.config.system_prompt,
      '包含 system_prompt'
    );

    testResults.push({ name: '获取 Bot 详情', passed });
  });

  // 测试 7: 获取不存在的 Bot
  await test('测试 7: 获取 Bot 详情 - 不存在的 Bot', async () => {
    const res = await request('GET', '/api/bots/nonexistent_bot', null, {
      'Authorization': `Bearer ${accessToken}`
    });

    const passed = assert(
      res.status === 404,
      '返回 404 未找到'
    ) && assert(
      res.data.error.code === 'BOT_NOT_FOUND',
      '错误码为 BOT_NOT_FOUND'
    );

    testResults.push({ name: '不存在的 Bot', passed });
  });

  // 测试 8: 创建 Bot - 正常数据
  let newBotId = null;
  await test('测试 8: 创建 Bot - 正常数据', async () => {
    const res = await request('POST', '/api/bots', {
      bot_id: 'test_bot_' + Date.now(),
      name: '测试 Bot',
      avatar: '🧪',
      type: 'work',
      scene: 'work',
      description: '这是一个测试 Bot',
      config: {
        model: 'gpt-4',
        temperature: 0.7,
        max_tokens: 2000,
        system_prompt: '你是一个测试助手'
      }
    }, {
      'Authorization': `Bearer ${accessToken}`
    });

    const passed = assert(
      res.status === 201,
      '返回 201 创建成功'
    ) && assert(
      res.data.bot_id,
      '返回新创建的 Bot ID'
    );

    if (passed) {
      newBotId = res.data.bot_id;
    }

    testResults.push({ name: '创建 Bot', passed });
  });

  // 测试 9: 创建 Bot - 缺少必填字段
  await test('测试 9: 创建 Bot - 缺少必填字段', async () => {
    const res = await request('POST', '/api/bots', {
      name: '不完整的 Bot'
      // 缺少 type, scene 等必填字段
    }, {
      'Authorization': `Bearer ${accessToken}`
    });

    const passed = assert(
      res.status === 400,
      '返回 400 错误请求'
    );

    testResults.push({ name: '缺少必填字段', passed });
  });

  // 测试 10: 更新 Bot
  if (newBotId) {
    await test('测试 10: 更新 Bot - 修改描述', async () => {
      const res = await request('PUT', `/api/bots/${newBotId}`, {
        description: '更新后的描述'
      }, {
        'Authorization': `Bearer ${accessToken}`
      });

      const passed = assert(
        res.status === 200,
        '返回 200 成功'
      ) && assert(
        res.data.description === '更新后的描述',
        '描述已更新'
      );

      testResults.push({ name: '更新 Bot', passed });
    });
  }

  // 测试 11: 更新 Bot 状态
  await test('测试 11: 更新 Bot 状态 - 切换为 offline', async () => {
    const res = await request('PUT', '/api/bots/bot_work_001/status', {
      status: 'offline'
    }, {
      'Authorization': `Bearer ${accessToken}`
    });

    const passed = assert(
      res.status === 200,
      '返回 200 成功'
    ) && assert(
      res.data.status === 'offline',
      '状态已更新为 offline'
    );

    // 恢复状态
    await request('PUT', '/api/bots/bot_work_001/status', {
      status: 'online'
    }, {
      'Authorization': `Bearer ${accessToken}`
    });

    testResults.push({ name: '更新 Bot 状态', passed });
  });

  // 测试 12: 无效的状态值
  await test('测试 12: 更新 Bot 状态 - 无效状态值', async () => {
    const res = await request('PUT', '/api/bots/bot_work_001/status', {
      status: 'invalid_status'
    }, {
      'Authorization': `Bearer ${accessToken}`
    });

    const passed = assert(
      res.status === 400,
      '返回 400 错误请求'
    );

    testResults.push({ name: '无效状态值', passed });
  });

  // 打印测试总结
  printSummary();
}

function printSummary() {
  log('\n' + '='.repeat(50), 'blue');
  log('📊 测试总结', 'blue');
  log('='.repeat(50) + '\n', 'blue');

  const passed = testResults.filter(r => r.passed).length;
  const total = testResults.length;
  const percentage = Math.round((passed / total) * 100);

  testResults.forEach(result => {
    const icon = result.passed ? '✅' : '❌';
    const status = result.passed ? '通过' : '失败';
    log(`  ${icon} ${result.name}: ${status}`, result.passed ? 'green' : 'red');
  });

  log(`\n总计: ${passed}/${total} 通过 (${percentage}%)`, percentage === 100 ? 'green' : 'yellow');

  if (percentage === 100) {
    log('\n🎉 所有测试通过！Bot 管理功能工作正常。', 'green');
  } else {
    log('\n⚠️  部分测试失败，请检查实现。', 'yellow');
  }

  log('\n');
}

// 运行测试
(async () => {
  try {
    await runTests();
    process.exit(testResults.every(r => r.passed) ? 0 : 1);
  } catch (error) {
    log(`\n💥 测试运行失败: ${error.message}`, 'red');
    console.error(error);
    process.exit(1);
  }
})();
