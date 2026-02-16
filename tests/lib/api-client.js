/**
 * API Client - 基础 API 客户端类
 * 提供统一的 HTTP 请求接口，支持 Token 自动刷新
 */
class ApiClient {
  constructor(baseURL = 'http://localhost:3000/api') {
    this.baseURL = baseURL;
    this.accessToken = localStorage.getItem('access_token');
    this.refreshToken = localStorage.getItem('refresh_token');
  }

  /**
   * 设置认证 Token
   */
  setTokens(accessToken, refreshToken) {
    this.accessToken = accessToken;
    this.refreshToken = refreshToken;
    localStorage.setItem('access_token', accessToken);
    localStorage.setItem('refresh_token', refreshToken);
  }

  /**
   * 清除认证 Token
   */
  clearTokens() {
    this.accessToken = null;
    this.refreshToken = null;
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
  }

  /**
   * 发起 HTTP 请求
   */
  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers
    };

    // 添加认证头
    if (this.accessToken) {
      headers['Authorization'] = `Bearer ${this.accessToken}`;
    }

    try {
      let response = await fetch(url, {
        ...options,
        headers
      });

      // Token 过期，尝试刷新
      if (response.status === 401 && this.refreshToken) {
        const refreshed = await this.refreshAccessToken();
        if (refreshed) {
          headers['Authorization'] = `Bearer ${this.accessToken}`;
          response = await fetch(url, {
            ...options,
            headers
          });
        } else {
          // 刷新失败，跳转到登录页
          this.clearTokens();
          window.location.href = 'login.html';
          throw new Error('登录已过期，请重新登录');
        }
      }

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || error.message || '请求失败');
      }

      return await response.json();
    } catch (error) {
      console.error('API 请求错误:', error);
      throw error;
    }
  }

  /**
   * 刷新 Access Token
   */
  async refreshAccessToken() {
    try {
      const response = await fetch(`${this.baseURL}/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          refresh_token: this.refreshToken
        })
      });

      if (!response.ok) {
        this.clearTokens();
        window.location.href = 'login.html';
        return false;
      }

      const data = await response.json();
      this.setTokens(data.access_token, data.refresh_token);

      // 更新用户信息
      if (data.user) {
        localStorage.setItem('user', JSON.stringify(data.user));
      }

      return true;
    } catch (error) {
      console.error('刷新 Token 失败:', error);
      this.clearTokens();
      window.location.href = 'login.html';
      return false;
    }
  }

  /**
   * GET 请求
   */
  async get(endpoint, options = {}) {
    return this.request(endpoint, {
      ...options,
      method: 'GET'
    });
  }

  /**
   * POST 请求
   */
  async post(endpoint, data, options = {}) {
    return this.request(endpoint, {
      ...options,
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  /**
   * PUT 请求
   */
  async put(endpoint, data, options = {}) {
    return this.request(endpoint, {
      ...options,
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }

  /**
   * DELETE 请求
   */
  async delete(endpoint, options = {}) {
    return this.request(endpoint, {
      ...options,
      method: 'DELETE'
    });
  }
}

// 导出
window.ApiClient = ApiClient;
