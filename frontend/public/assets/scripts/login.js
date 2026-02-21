(function () {
  const loginForm = document.getElementById('loginForm');
  const loginBtn = document.getElementById('loginBtn');
  const errorMessage = document.getElementById('errorMessage');
  const usernameInput = document.getElementById('username');
  const passwordInput = document.getElementById('password');

  function getSafeReturnTo() {
    const params = new URLSearchParams(window.location.search);
    const raw = params.get('returnTo');
    const stored = sessionStorage.getItem('auth_return_to');
    const fallback = stored || 'bot-chat-ui-v2.html';
    if (!raw) return fallback;

    try {
      const decoded = decodeURIComponent(raw);
      if (!decoded || decoded.startsWith('http://') || decoded.startsWith('https://') || decoded.startsWith('//')) {
        return fallback;
      }
      return decoded;
    } catch {
      return fallback;
    }
  }

  function showError(message) {
    errorMessage.textContent = message;
    errorMessage.classList.add('show');
  }

  function setLoading(loading) {
    if (loading) {
      loginBtn.disabled = true;
      loginBtn.innerHTML = '<span class="spinner"></span>登录中...';
      errorMessage.classList.remove('show');
      return;
    }
    loginBtn.disabled = false;
    loginBtn.innerHTML = '登录';
  }

  async function submitLogin(e) {
    e.preventDefault();

    const username = usernameInput.value.trim();
    const password = passwordInput.value;

    if (!username || !password) {
      showError('请输入用户名和密码');
      return;
    }

    setLoading(true);
    try {
      await authManager.login(username, password);
      const target = getSafeReturnTo();
      sessionStorage.removeItem('auth_return_to');
      window.location.href = target;
    } catch (error) {
      showError(error?.message || '登录失败，请重试');
      setLoading(false);
    }
  }

  if (authManager.isAuthenticated()) {
    window.location.href = getSafeReturnTo();
    return;
  }

  loginForm.addEventListener('submit', submitLogin);
})();
