/**
 * 认证功能验证脚本
 *
 * 运行方式: node scripts/verify/auth-verify.js
 *
 * 验证项：
 * 1. 用户登录 - 正确凭证
 * 2. 用户登录 - 错误凭证
 * 3. 用户登录 - 缺少参数
 * 4. Token 刷新 - 正常流程
 * 5. Token 刷新 - 过期 token
 * 6. 获取当前用户 - 无认证
 * 7. 获取当前用户 - 有效 token
 * 8. 退出登录 - 撤销 refresh token
 */

const http = require('http');

const API_BASE = 'http://localhost:3000';
let testResults = [];
let accessToken = null;
let refreshToken = null;

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
  log('🔐 认证功能验证测试', 'blue');
  log('='.repeat(50) + '\n', 'blue');

  // 测试 1: 正确登录
  await test('测试 1: 用户登录 - 正确凭证', async () => {
    const res = await request('POST', '/api/auth/login', {
      username: 'admin',
      password: 'admin123'
    });

    const passed = assert(
      res.status === 200 && res.data.access_token && res.data.refresh_token,
      '登录成功，返回 access_token 和 refresh_token'
    );

    if (passed) {
      accessToken = res.data.access_token;
      refreshToken = res.data.refresh_token;
      assert(res.data.user.username === 'admin', '用户信息正确');
      assert(res.data.expires_in === 900, 'Token 过期时间为 15 分钟 (900秒)');
    }

    testResults.push({ name: '正确登录', passed });
  });

  // 测试 2: 错误密码
  await test('测试 2: 用户登录 - 错误密码', async () => {
    console.log(`  [DEBUG] 测试 2 开始，当前 refreshToken: ${refreshToken ? refreshToken.substring(0, 20) + '...' : 'null'}`);
    const res = await request('POST', '/api/auth/login', {
      username: 'admin',
      password: 'wrong_password'
    });

    const passed = assert(
      res.status === 401,
      '返回 401 未授权'
    ) && assert(
      res.data.error.code === 'UNAUTHORIZED',
      '错误码为 UNAUTHORIZED'
    );

    testResults.push({ name: '错误密码', passed });
  });

  // 测试 3: 不存在的用户
  await test('测试 3: 用户登录 - 不存在的用户', async () => {
    console.log(`  [DEBUG] 测试 3 开始，当前 refreshToken: ${refreshToken ? refreshToken.substring(0, 20) + '...' : 'null'}`);
    const res = await request('POST', '/api/auth/login', {
      username: 'nonexistent',
      password: 'password'
    });

    const passed = assert(
      res.status === 401,
      '返回 401 未授权（不泄露用户是否存在）'
    );

    testResults.push({ name: '用户不存在', passed });
    console.log(`  [DEBUG] 测试 3 结束，refreshToken: ${refreshToken ? refreshToken.substring(0, 20) + '...' : 'null'}`);
  });

  // 测试 4: 缺少参数
  await test('测试 4: 用户登录 - 缺少用户名', async () => {
    console.log(`  [DEBUG] 测试 4 开始，当前 refreshToken: ${refreshToken ? refreshToken.substring(0, 20) + '...' : 'null'}`);
    const res = await request('POST', '/api/auth/login', {
      password: 'admin123'
    });

    const passed = assert(
      res.status === 400,
      '返回 400 错误请求'
    ) && assert(
      res.data.error.code === 'BAD_REQUEST',
      '错误码为 BAD_REQUEST'
    );

    testResults.push({ name: '缺少参数', passed });
    console.log(`  [DEBUG] 测试 4 结束，refreshToken: ${refreshToken ? refreshToken.substring(0, 20) + '...' : 'null'}`);
  });

  // 测试 5: 无认证访问受保护路由
  await test('测试 5: 获取当前用户 - 无认证', async () => {
    console.log(`  [DEBUG] 测试 5 开始，当前 refreshToken: ${refreshToken ? refreshToken.substring(0, 20) + '...' : 'null'}`);
    const res = await request('GET', '/api/auth/me');

    const passed = assert(
      res.status === 401,
      '返回 401 未授权'
    );

    testResults.push({ name: '无认证访问', passed });
  });

  // 测试 6: 有效 token 访问
  await test('测试 6: 获取当前用户 - 有效 token', async () => {
    console.log(`  [DEBUG] 测试 6 开始，当前 refreshToken: ${refreshToken ? refreshToken.substring(0, 20) + '...' : 'null'}`);
    const res = await request('GET', '/api/auth/me', null, {
      'Authorization': `Bearer ${accessToken}`
    });

    const passed = assert(
      res.status === 200,
      '返回 200 成功'
    ) && assert(
      res.data.username === 'admin',
      '返回正确的用户信息'
    );

    testResults.push({ name: '有效 token', passed });
  });

  // 测试 7: 无效 token
  await test('测试 7: 获取当前用户 - 无效 token', async () => {
    console.log(`  [DEBUG] 测试 7 开始，当前 refreshToken: ${refreshToken ? refreshToken.substring(0, 20) + '...' : 'null'}`);
    const res = await request('GET', '/api/auth/me', null, {
      'Authorization': 'Bearer invalid_token_12345'
    });

    const passed = assert(
      res.status === 401,
      '返回 401 未授权'
    );

    testResults.push({ name: '无效 token', passed });
  });

  // 测试 8: 刷新 token
  await test('测试 8: Token 刷新 - 正常流程', async () => {
    const oldRefreshToken = refreshToken;
    console.log(`  [DEBUG] 测试 8 开始，当前 refreshToken: ${oldRefreshToken ? oldRefreshToken.substring(0, 20) + '...' : 'null'}`);

    const res = await request('POST', '/api/auth/refresh', {
      refresh_token: refreshToken
    });

    console.log(`  [DEBUG] 响应状态: ${res.status}`);
    console.log(`  [DEBUG] 响应数据:`, JSON.stringify(res.data, null, 2).substring(0, 200));

    const passed = assert(
      res.status === 200,
      '返回 200 成功'
    ) && assert(
      res.data.access_token && res.data.refresh_token,
      '返回新的 access_token 和 refresh_token'
    );

    if (passed) {
      // 更新 tokens
      accessToken = res.data.access_token;
      refreshToken = res.data.refresh_token;
      assert(
        res.data.refresh_token !== oldRefreshToken,
        '新的 refresh_token 与旧的不同'
      );
    }

    testResults.push({ name: 'Token 刷新', passed });
  });

  // 测试 9: 重复使用旧 refresh token
  await test('测试 9: Token 刷新 - 重复使用旧 token', async () => {
    const oldRefreshToken = refreshToken;
    // 先刷新一次
    await request('POST', '/api/auth/refresh', { refresh_token: refreshToken });
    // 再用旧 token 刷新
    const res = await request('POST', '/api/auth/refresh', {
      refresh_token: oldRefreshToken
    });

    const passed = assert(
      res.status === 401,
      '返回 401（旧 token 已被撤销）'
    );

    testResults.push({ name: '重复使用旧 token', passed });
  });

  // 测试 10: 退出登录
  await test('测试 10: 退出登录 - 撤销 refresh token', async () => {
    const res = await request('POST', '/api/auth/logout', {
      refresh_token: refreshToken
    });

    const passed = assert(
      res.status === 200,
      '返回 200 成功'
    );

    // 验证 refresh token 已撤销
    const refreshRes = await request('POST', '/api/auth/refresh', {
      refresh_token: refreshToken
    });

    assert(
      refreshRes.status === 401,
      '撤销后的 refresh_token 无法再使用'
    );

    testResults.push({ name: '退出登录', passed });
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
    log('\n🎉 所有测试通过！认证功能工作正常。', 'green');
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
