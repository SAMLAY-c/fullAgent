import aiService, { type ChatMessage } from './ai.service';
import { readJsonFile, writeJsonFile } from '../utils/json-store';

const ARCHIVE_FILE = 'bot-memory-archive.json';
const MAX_ITEMS_PER_BOT = 2000;

export interface ArchivedMemoryRecord {
  id: string;
  bot_id: string;
  conversation_id: string;
  user_id: string;
  user_message: string;
  bot_message: string;
  timestamp: string;
}

interface ArchiveStore {
  version: number;
  updated_at: string;
  by_bot: Record<string, ArchivedMemoryRecord[]>;
}

interface AnalyzeResult {
  bot_id: string;
  total_records: number;
  last_updated_at: string | null;
  top_keywords: Array<{ keyword: string; count: number }>;
  summary: string;
}

class BotMemoryArchiveService {
  private async readStore(): Promise<ArchiveStore> {
    return readJsonFile<ArchiveStore>(ARCHIVE_FILE, {
      version: 1,
      updated_at: new Date().toISOString(),
      by_bot: {}
    });
  }

  private async writeStore(store: ArchiveStore): Promise<void> {
    store.updated_at = new Date().toISOString();
    await writeJsonFile(ARCHIVE_FILE, store);
  }

  async appendRecord(record: Omit<ArchivedMemoryRecord, 'id' | 'timestamp'>): Promise<ArchivedMemoryRecord> {
    const store = await this.readStore();
    const list = store.by_bot[record.bot_id] || [];
    const next: ArchivedMemoryRecord = {
      id: `mem_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`,
      timestamp: new Date().toISOString(),
      ...record
    };
    list.push(next);
    if (list.length > MAX_ITEMS_PER_BOT) {
      store.by_bot[record.bot_id] = list.slice(list.length - MAX_ITEMS_PER_BOT);
    } else {
      store.by_bot[record.bot_id] = list;
    }
    await this.writeStore(store);
    return next;
  }

  async listByBot(botId: string, limit = 200): Promise<ArchivedMemoryRecord[]> {
    const store = await this.readStore();
    const list = store.by_bot[botId] || [];
    const safeLimit = Math.max(1, Math.min(5000, Math.floor(limit)));
    return list.slice(Math.max(0, list.length - safeLimit));
  }

  async exportByBot(botId: string): Promise<{ bot_id: string; exported_at: string; records: ArchivedMemoryRecord[] }> {
    const records = await this.listByBot(botId, 5000);
    return {
      bot_id: botId,
      exported_at: new Date().toISOString(),
      records
    };
  }

  async analyzeByBot(botId: string): Promise<AnalyzeResult> {
    const records = await this.listByBot(botId, 500);
    const topKeywords = this.buildTopKeywords(records);
    const defaultSummary = this.buildFallbackSummary(records, topKeywords);
    const lastUpdatedAt = records.length > 0 ? records[records.length - 1].timestamp : null;

    if (records.length === 0) {
      return {
        bot_id: botId,
        total_records: 0,
        last_updated_at: null,
        top_keywords: [],
        summary: '暂无记忆对话数据'
      };
    }

    if (!aiService.isConfigured()) {
      return {
        bot_id: botId,
        total_records: records.length,
        last_updated_at: lastUpdatedAt,
        top_keywords: topKeywords,
        summary: defaultSummary
      };
    }

    const sampleLines = records
      .slice(-50)
      .map((item) => `用户:${item.user_message}\nBot:${item.bot_message}`)
      .join('\n\n');

    const messages: ChatMessage[] = [
      {
        role: 'system',
        content: '你是后台运营分析助手。输出中文，3-5条结论，包含主题、风险、改进建议。'
      },
      {
        role: 'user',
        content: `请分析以下 Bot 对话记忆数据并总结：\n${sampleLines}`
      }
    ];

    const aiSummary = await aiService.generateSimpleResponse(messages, {
      temperature: 0.3,
      max_tokens: 800
    });

    return {
      bot_id: botId,
      total_records: records.length,
      last_updated_at: lastUpdatedAt,
      top_keywords: topKeywords,
      summary: aiSummary || defaultSummary
    };
  }

  private buildTopKeywords(records: ArchivedMemoryRecord[]): Array<{ keyword: string; count: number }> {
    const counter = new Map<string, number>();
    const stopwords = new Set(['然后', '这个', '那个', '我们', '你们', '他们', '就是', '一个', '可以', '需要', '一下']);
    const text = records
      .flatMap((r) => [r.user_message, r.bot_message])
      .join(' ')
      .toLowerCase();

    const tokens = text.match(/[a-zA-Z0-9_]{3,}|[\u4e00-\u9fa5]{2,}/g) || [];
    for (const token of tokens) {
      const word = token.trim();
      if (!word || stopwords.has(word)) continue;
      counter.set(word, (counter.get(word) || 0) + 1);
    }

    return Array.from(counter.entries())
      .map(([keyword, count]) => ({ keyword, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }

  private buildFallbackSummary(
    records: ArchivedMemoryRecord[],
    topKeywords: Array<{ keyword: string; count: number }>
  ): string {
    const recent = records.slice(-5);
    const keywordLine = topKeywords.slice(0, 5).map((x) => `${x.keyword}(${x.count})`).join('、');
    return [
      `共归档 ${records.length} 条对话记忆。`,
      `近期高频主题：${keywordLine || '暂无'}`,
      `最近 5 条会话覆盖：${recent.map((x) => x.conversation_id).join('、') || '暂无'}`,
      '建议：将高频主题整理为模板，并对重复问题增加标准回复。'
    ].join('\n');
  }
}

export default new BotMemoryArchiveService();
