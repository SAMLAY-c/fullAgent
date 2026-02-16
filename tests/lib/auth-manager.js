/**
 * AuthManager - 认证管理器
 * 处理用户登录、登出、当前用户信息获取
 */
class AuthManager extends ApiClient {
  /**
   * 用户登录
   */
  async login(username, password) {
    try {
      const data = await this.post('/auth/login', { username, password });
      this.setTokens(data.access_token, data.refresh_token);
      localStorage.setItem('user', JSON.stringify(data.user));
      return data;
    } catch (error) {
      console.error('登录失败:', error);
      throw error;
    }
  }

  /**
   * 用户登出
   */
  async logout() {
    try {
      if (this.refreshToken) {
        await this.post('/auth/logout', {
          refresh_token: this.refreshToken
        });
      }
    } catch (error) {
      console.error('登出错误:', error);
    } finally {
      this.clearTokens();
      window.location.href = 'login.html';
    }
  }

  /**
   * 获取当前用户信息
   */
  getCurrentUser() {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  }

  /**
   * 获取当前用户ID
   */
  getCurrentUserId() {
    const user = this.getCurrentUser();
    return user ? user.user_id : null;
  }

  /**
   * 检查是否已登录
   */
  isAuthenticated() {
    return !!this.accessToken && !!this.refreshToken;
  }

  /**
   * 从服务器刷新当前用户信息
   */
  async fetchCurrentUser() {
    try {
      const user = await this.get('/auth/me');
      localStorage.setItem('user', JSON.stringify(user));
      return user;
    } catch (error) {
      console.error('获取用户信息失败:', error);
      throw error;
    }
  }
}

// 创建全局实例
const authManager = new AuthManager();
window.authManager = authManager;
