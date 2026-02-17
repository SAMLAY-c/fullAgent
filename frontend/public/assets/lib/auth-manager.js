/**
 * Auth layer built on top of ApiClient.
 */
class AuthManager extends ApiClient {
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

  async logout() {
    try {
      if (this.refreshToken) {
        await this.post('/auth/logout', { refresh_token: this.refreshToken });
      }
    } catch (error) {
      console.error('登出失败:', error);
    } finally {
      this.clearTokens();
      window.location.href = 'login.html';
    }
  }

  getCurrentUser() {
    const raw = localStorage.getItem('user');
    return raw ? JSON.parse(raw) : null;
  }

  getCurrentUserId() {
    const user = this.getCurrentUser();
    return user ? user.user_id : null;
  }

  isAuthenticated() {
    return Boolean(this.accessToken && this.refreshToken);
  }

  async fetchCurrentUser() {
    try {
      const user = await this.get('/auth/me');
      localStorage.setItem('user', JSON.stringify(user));
      return user;
    } catch (error) {
      console.error('获取当前用户失败:', error);
      throw error;
    }
  }
}

const authManager = new AuthManager();
window.authManager = authManager;
