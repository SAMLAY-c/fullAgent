(function () {
  const loginForm = document.getElementById('loginForm');
  const loginBtn = document.getElementById('loginBtn');
  const errorMessage = document.getElementById('errorMessage');
  const usernameInput = document.getElementById('username');
  const passwordInput = document.getElementById('password');

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
      window.location.href = 'bot-chat-ui-v2.html';
    } catch (error) {
      showError(error?.message || '登录失败，请重试');
      setLoading(false);
    }
  }

  if (authManager.isAuthenticated()) {
    window.location.href = 'bot-chat-ui-v2.html';
    return;
  }

  loginForm.addEventListener('submit', submitLogin);
})();
