/**
 * BotClient - Bot API 客户端
 * 处理 Bot 列表查询、Bot 详情获取
 */
class BotClient extends ApiClient {
  /**
   * 获取 Bot 列表
   * @param {Object} filters - 筛选条件
   * @param {string} filters.type - Bot 类型 (work|life|love|group|sop)
   * @param {string} filters.status - Bot 状态 (online|offline|suspended)
   * @param {string} filters.scene - Bot 场景
   * @param {number} filters.page - 页码
   * @param {number} filters.page_size - 每页数量
   */
  async getBots(filters = {}) {
    const params = new URLSearchParams();
    if (filters.type) params.append('type', filters.type);
    if (filters.status) params.append('status', filters.status);
    if (filters.scene) params.append('scene', filters.scene);
    if (filters.page) params.append('page', filters.page.toString());
    if (filters.page_size) params.append('page_size', filters.page_size.toString());

    const query = params.toString();
    return this.get(`/bots${query ? '?' + query : ''}`);
  }

  /**
   * 获取 Bot 详情
   */
  async getBot(botId) {
    return this.get(`/bots/${botId}`);
  }

  /**
   * 创建 Bot
   */
  async createBot(botData) {
    return this.post('/bots', botData);
  }

  /**
   * 更新 Bot
   */
  async updateBot(botId, botData) {
    return this.put(`/bots/${botId}`, botData);
  }

  /**
   * 删除 Bot
   */
  async deleteBot(botId) {
    return this.delete(`/bots/${botId}`);
  }

  /**
   * 更新 Bot 状态
   */
  async updateBotStatus(botId, status) {
    return this.put(`/bots/${botId}/status`, { status });
  }

  /**
   * 获取 Bot 对话历史
   */
  async getBotConversations(botId, limit = 50) {
    return this.get(`/bots/${botId}/conversations?limit=${limit}`);
  }

  /**
   * 按场景分组获取 Bots（用于前端场景卡片）
   * 返回格式：{ work: [...], life: [...], love: [...], group: [...], sop: [...] }
   */
  async getBotsByScene() {
    try {
      const response = await this.getBots();
      const bots = response.bots || [];

      // 按 scene 分组
      const grouped = {
        work: bots.filter(b => b.scene === 'work'),
        life: bots.filter(b => b.scene === 'life'),
        love: bots.filter(b => b.scene === 'love'),
        group: bots.filter(b => b.scene === 'group'),
        sop: bots.filter(b => b.scene === 'sop')
      };

      return grouped;
    } catch (error) {
      console.error('获取 Bots 失败:', error);
      throw error;
    }
  }
}

// 创建全局实例
const botClient = new BotClient();
window.botClient = botClient;
