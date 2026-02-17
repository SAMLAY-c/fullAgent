/**
 * Bot API wrapper.
 */
class BotClient extends ApiClient {
  async getBots(filters = {}) {
    const params = new URLSearchParams();
    if (filters.type) params.append('type', filters.type);
    if (filters.status) params.append('status', filters.status);
    if (filters.scene) params.append('scene', filters.scene);
    if (filters.page) params.append('page', String(filters.page));
    if (filters.page_size) params.append('page_size', String(filters.page_size));

    const query = params.toString();
    return this.get(`/bots${query ? `?${query}` : ''}`);
  }

  async getBot(botId) {
    return this.get(`/bots/${botId}`);
  }

  async createBot(botData) {
    return this.post('/bots', botData);
  }

  async updateBot(botId, botData) {
    return this.put(`/bots/${botId}`, botData);
  }

  async deleteBot(botId) {
    return this.delete(`/bots/${botId}`);
  }

  async updateBotStatus(botId, status) {
    return this.put(`/bots/${botId}/status`, { status });
  }

  async getBotConversations(botId, limit = 50) {
    return this.get(`/bots/${botId}/conversations?limit=${limit}`);
  }

  async getBotsByScene() {
    try {
      const response = await this.getBots();
      const bots = response.bots || [];
      return {
        work: bots.filter((b) => b.scene === 'work'),
        life: bots.filter((b) => b.scene === 'life'),
        love: bots.filter((b) => b.scene === 'love'),
        group: bots.filter((b) => b.scene === 'group'),
        sop: bots.filter((b) => b.scene === 'sop')
      };
    } catch (error) {
      console.error('获取 Bots 失败:', error);
      throw error;
    }
  }
}

const botClient = new BotClient();
window.botClient = botClient;
