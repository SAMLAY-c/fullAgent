import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import botsRouter from '../../src/routes/bots';
import authService from '../../src/services/auth.service';
import botService from '../../src/services/bot.service';

vi.mock('../../src/services/bot.service', () => ({
  BOT_NAME_DUPLICATE_ERROR: 'Bot name already exists',
  default: {
    getBots: vi.fn(),
    getBotById: vi.fn(),
    createBot: vi.fn(),
    updateBot: vi.fn(),
    deleteBot: vi.fn(),
    updateBotStatus: vi.fn(),
    getBotConversations: vi.fn()
  }
}));

const app = express();
app.use(express.json());
app.use('/api/bots', botsRouter);

describe('POST /api/bots', () => {
  beforeEach(() => {
    vi.spyOn(authService, 'verifyAccessToken').mockReturnValue({
      user_id: 'user_admin_001',
      username: 'admin',
      role: 'admin'
    });
    vi.mocked(botService.createBot).mockResolvedValue({
      bot_id: 'bot_work_1700000000000_demo',
      name: '单元测试Bot',
      avatar: null,
      type: 'work',
      scene: 'work',
      status: 'offline',
      description: null,
      config: null,
      created_at: new Date(),
      updated_at: new Date()
    });
  });

  it('成功创建 Bot 返回 201', async () => {
    const res = await request(app)
      .post('/api/bots')
      .set('Authorization', 'Bearer test-token')
      .send({
        name: '单元测试Bot',
        type: 'work',
        scene: 'work',
        status: 'online'
      });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('bot_id');
    expect(res.body.name).toBe('单元测试Bot');
    expect(botService.createBot).toHaveBeenCalledOnce();
  });

  it('缺少 name 字段返回 400', async () => {
    const res = await request(app)
      .post('/api/bots')
      .set('Authorization', 'Bearer test-token')
      .send({ type: 'work', scene: 'work' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('BAD_REQUEST');
    expect(botService.createBot).not.toHaveBeenCalled();
  });

  it('缺少 Authorization token 返回 401', async () => {
    const res = await request(app)
      .post('/api/bots')
      .send({
        name: '无令牌Bot',
        type: 'work',
        scene: 'work'
      });

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  it('type 字段非法时返回 400', async () => {
    const res = await request(app)
      .post('/api/bots')
      .set('Authorization', 'Bearer test-token')
      .send({
        name: '非法类型Bot',
        type: 'hacker',
        scene: 'work'
      });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('BAD_REQUEST');
    expect(botService.createBot).not.toHaveBeenCalled();
  });

  it('超长 name 字段返回 400', async () => {
    const res = await request(app)
      .post('/api/bots')
      .set('Authorization', 'Bearer test-token')
      .send({
        name: 'a'.repeat(500),
        type: 'work',
        scene: 'work'
      });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('BAD_REQUEST');
    expect(botService.createBot).not.toHaveBeenCalled();
  });

  it('重复名称返回 409', async () => {
    vi.mocked(botService.createBot).mockRejectedValueOnce(new Error('Bot name already exists'));

    const res = await request(app)
      .post('/api/bots')
      .set('Authorization', 'Bearer test-token')
      .send({
        name: '重复名称Bot',
        type: 'work',
        scene: 'work'
      });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('CONFLICT');
    expect(res.body.error.message).toBe('Bot name already exists');
  });
});
