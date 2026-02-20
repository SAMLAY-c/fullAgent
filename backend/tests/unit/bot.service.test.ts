import { describe, expect, it } from 'vitest';
import { generateBotId } from '../../src/services/bot.service';

describe('generateBotId', () => {
  it('在同一毫秒内生成的 bot_id 仍然唯一', () => {
    const fixedTimestamp = 1700000000000;
    const first = generateBotId('work', fixedTimestamp);
    const second = generateBotId('work', fixedTimestamp);

    expect(first).not.toBe(second);
    expect(first.startsWith('bot_work_1700000000000_')).toBe(true);
    expect(second.startsWith('bot_work_1700000000000_')).toBe(true);
  });
});
