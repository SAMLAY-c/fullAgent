import { expect, test } from '@playwright/test';

test.describe('Bot 创建功能', () => {
  test.beforeEach(async ({ page, baseURL }) => {
    await page.goto(`${baseURL}/login.html`);
    await page.fill('#username', 'admin');
    await page.fill('#password', 'admin123');
    await page.click('#loginBtn');
    await page.waitForURL('**/bot-chat-ui-v2.html');
    await page.goto(`${baseURL}/bot-admin-ui-v2.html`);
  });

  test('成功创建 Bot', async ({ page }) => {
    const botName = `测试Bot-${Date.now()}`;
    await page.click('.nav-item[data-page="bots"]');
    await expect(page.locator('#page-bots')).toBeVisible();

    await page.click('#btn-bot-create');
    await page.fill('#bot-form-name', botName);
    await page.selectOption('#bot-form-type', 'work');
    await page.selectOption('#bot-form-scene', 'work');
    await page.selectOption('#bot-form-status', 'online');
    await page.fill('#bot-form-description', 'Playwright E2E 创建');

    await page.click('#modal-footer .btn.btn-primary');
    await expect(page.locator('#bots-tbody tr', { hasText: botName })).toBeVisible();
  });

  test('缺少必填字段时显示错误', async ({ page }) => {
    await page.click('.nav-item[data-page="bots"]');
    await page.click('#btn-bot-create');
    await page.click('#modal-footer .btn.btn-primary');
    await expect(page.locator('.toast .toast-title', { hasText: '请填写机器人名称' })).toBeVisible();
  });
});
