(function () {
  const sceneConfig = {
    work: { groupId: 'workBotGroup', defaultName: '工作伙伴', icon: '💼' },
    life: { groupId: 'lifeBotGroup', defaultName: '生活助手', icon: '🌿' },
    love: { groupId: 'loveBotGroup', defaultName: '心灵朋友', icon: '💜' }
  };

  const state = {
    botsByScene: { work: [], life: [], love: [] },
    selectedScene: 'work',
    selectedBotId: null,
    selectedConversationId: null,
    isComposing: false
  };

  const ui = {
    messages: document.getElementById('messages'),
    chatAvatar: document.getElementById('chatAvatar'),
    chatName: document.getElementById('chatName'),
    chatStatus: document.getElementById('chatStatus'),
    input: document.getElementById('input'),
    sendBtn: document.getElementById('sendBtn'),
    logoutBtn: document.getElementById('logoutBtn'),
    contentTabBtns: Array.from(document.querySelectorAll('.content-tab-btn')),
    contentPanels: Array.from(document.querySelectorAll('.content-panel')),
    tabBtns: Array.from(document.querySelectorAll('.tab-btn')),
    scenesList: document.getElementById('scenesList'),
    groupsList: document.getElementById('groupsList')
  };

  function escapeHtml(text) {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function formatTime(isoOrDate) {
    const date = typeof isoOrDate === 'string' ? new Date(isoOrDate) : isoOrDate;
    return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
  }

  async function ensureAuth() {
    if (!authManager.isAuthenticated()) {
      window.location.href = 'login.html';
      return false;
    }
    return true;
  }

  async function ensureDefaultBotsIfEmpty() {
    const grouped = await botClient.getBotsByScene();
    const total =
      (grouped.work || []).length +
      (grouped.life || []).length +
      (grouped.love || []).length;

    if (total > 0) return grouped;

    const defaults = [
      {
        name: '你的工作伙伴',
        avatar: '💼',
        type: 'work',
        scene: 'work',
        description: '帮助你管理任务、计划和执行。',
        config: { system_prompt: '你是专业的工作助手。' }
      },
      {
        name: '生活小助手',
        avatar: '🌿',
        type: 'life',
        scene: 'life',
        description: '帮助你规划健康、饮食和日常。',
        config: { system_prompt: '你是温暖的生活助手。' }
      },
      {
        name: '心灵朋友',
        avatar: '💜',
        type: 'love',
        scene: 'love',
        description: '倾听并给出情绪支持和关系建议。',
        config: { system_prompt: '你是有共情能力的陪伴型助手。' }
      }
    ];

    for (const bot of defaults) {
      await botClient.createBot(bot);
    }

    return botClient.getBotsByScene();
  }

  function renderConversations(scene, conversations) {
    const group = document.getElementById(sceneConfig[scene].groupId);
    if (!group) return;

    const list = group.querySelector('.conversation-list');
    const meta = group.querySelector('.bot-group-meta');
    if (!list || !meta) return;

    meta.textContent = `${scene} 场景 · ${conversations.length} 个话题`;

    list.innerHTML = conversations
      .map((c) => {
        const active = c.conversation_id === state.selectedConversationId ? ' active' : '';
        const title = escapeHtml(c.title || '未命名话题');
        const count = c._count?.messages || 0;
        const updated = formatTime(c.updated_at);
        return `
          <div class="conversation-item${active}" data-scene="${scene}" data-conversation-id="${c.conversation_id}" data-bot-id="${c.bot_id}">
            <span class="conversation-icon">💬</span>
            <div class="conversation-info">
              <div class="conversation-title">${title}</div>
              <div class="conversation-meta">${count}条消息 · ${updated}</div>
            </div>
          </div>
        `;
      })
      .join('');

    Array.from(list.querySelectorAll('.conversation-item')).forEach((item) => {
      item.addEventListener('click', async () => {
        state.selectedScene = item.dataset.scene;
        state.selectedBotId = item.dataset.botId;
        state.selectedConversationId = item.dataset.conversationId;
        await refreshCurrentHeader();
        await loadMessages(state.selectedConversationId);
        await refreshAllConversationLists();
      });
    });
  }

  async function getConversationsByScene(scene) {
    const bots = state.botsByScene[scene] || [];
    const merged = [];
    for (const bot of bots) {
      const res = await authManager.get(`/chat/conversations?bot_id=${encodeURIComponent(bot.bot_id)}`);
      const conversations = res.conversations || [];
      merged.push(...conversations);
    }
    merged.sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));
    return merged;
  }

  async function refreshAllConversationLists() {
    for (const scene of Object.keys(sceneConfig)) {
      const conversations = await getConversationsByScene(scene);
      renderConversations(scene, conversations);
    }
  }

  async function refreshCurrentHeader() {
    const scene = state.selectedScene;
    const bot = (state.botsByScene[scene] || []).find((b) => b.bot_id === state.selectedBotId) || state.botsByScene[scene]?.[0];
    if (!bot) return;

    state.selectedBotId = bot.bot_id;
    ui.chatAvatar.textContent = bot.avatar || sceneConfig[scene].icon;
    ui.chatAvatar.className = `chat-avatar ${scene}`;
    ui.chatName.textContent = bot.name || sceneConfig[scene].defaultName;
    ui.chatStatus.textContent = bot.description || '已连接后端，支持中文输入与数据持久化';
  }

  async function loadMessages(conversationId) {
    const res = await authManager.get(`/chat/conversations/${conversationId}/messages`);
    const messages = res.messages || [];

    ui.messages.innerHTML = messages
      .map((m) => {
        const klass = m.sender_type === 'user' ? 'user' : 'bot';
        const avatar = m.sender_type === 'user' ? '👤' : (ui.chatAvatar.textContent || '🤖');
        return `
          <div class="message ${klass}">
            <div class="message-avatar">${avatar}</div>
            <div class="message-wrapper">
              <div class="message-content">${escapeHtml(m.content)}</div>
              <div class="message-time">${formatTime(m.timestamp)}</div>
            </div>
          </div>
        `;
      })
      .join('');

    ui.messages.scrollTop = ui.messages.scrollHeight;
  }

  async function createConversation(scene) {
    const bot = state.botsByScene[scene]?.[0];
    if (!bot) {
      alert('该场景暂无 Bot，请先在后台创建。');
      return;
    }

    const title = prompt('请输入新话题名称');
    if (!title || !title.trim()) return;

    const conversation = await authManager.post('/chat/conversations', {
      bot_id: bot.bot_id,
      title: title.trim()
    });

    state.selectedScene = scene;
    state.selectedBotId = bot.bot_id;
    state.selectedConversationId = conversation.conversation_id;
    await refreshCurrentHeader();
    await refreshAllConversationLists();
    await loadMessages(state.selectedConversationId);
  }

  function appendMessage(senderType, content) {
    const klass = senderType === 'user' ? 'user' : 'bot';
    const avatar = senderType === 'user' ? '👤' : (ui.chatAvatar.textContent || '🤖');
    ui.messages.insertAdjacentHTML(
      'beforeend',
      `
      <div class="message ${klass}">
        <div class="message-avatar">${avatar}</div>
        <div class="message-wrapper">
          <div class="message-content">${escapeHtml(content)}</div>
          <div class="message-time">${formatTime(new Date())}</div>
        </div>
      </div>
      `
    );
    ui.messages.scrollTop = ui.messages.scrollHeight;
  }

  async function sendMessage() {
    const content = ui.input.value.trim();
    if (!content) return;
    if (!state.selectedConversationId) {
      alert('请先选择或创建一个话题。');
      return;
    }

    ui.input.value = '';
    ui.input.style.height = 'auto';
    appendMessage('user', content);

    const result = await authManager.post(
      `/chat/conversations/${state.selectedConversationId}/messages`,
      { content }
    );
    if (result?.bot_message?.content) {
      appendMessage('bot', result.bot_message.content);
    }

    await refreshAllConversationLists();
  }

  function wireTabs() {
    ui.contentTabBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        const tab = btn.dataset.tab;
        ui.contentTabBtns.forEach((x) => x.classList.remove('active'));
        btn.classList.add('active');
        ui.contentPanels.forEach((panel) => {
          panel.classList.toggle('active', panel.id === `${tab}Panel`);
        });
      });
    });

    ui.tabBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        ui.tabBtns.forEach((x) => x.classList.remove('active'));
        btn.classList.add('active');
        const tab = btn.dataset.tab;
        ui.scenesList.style.display = tab === 'scenes' ? 'flex' : 'none';
        ui.groupsList.style.display = tab === 'groups' ? 'flex' : 'none';
      });
    });
  }

  function wireInput() {
    ui.input.addEventListener('compositionstart', () => {
      state.isComposing = true;
    });
    ui.input.addEventListener('compositionend', () => {
      state.isComposing = false;
    });
    ui.input.addEventListener('input', function () {
      this.style.height = 'auto';
      this.style.height = `${Math.min(this.scrollHeight, 140)}px`;
    });
    ui.input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey && !state.isComposing) {
        e.preventDefault();
        sendMessage().catch((err) => alert(err.message || '发送失败'));
      }
    });
    ui.sendBtn.addEventListener('click', () => {
      sendMessage().catch((err) => alert(err.message || '发送失败'));
    });
  }

  function wireLogout() {
    if (!ui.logoutBtn) return;
    ui.logoutBtn.addEventListener('click', async () => {
      if (confirm('确定要登出吗？')) {
        await authManager.logout();
      }
    });
  }

  window.toggleBotGroup = function toggleBotGroup(groupId) {
    const group = document.getElementById(groupId);
    if (group) group.classList.toggle('collapsed');
  };

  window.addNewTopic = function addNewTopic(scene) {
    createConversation(scene).catch((err) => alert(err.message || '创建话题失败'));
  };

  async function bootstrap() {
    const authed = await ensureAuth();
    if (!authed) return;

    const grouped = await ensureDefaultBotsIfEmpty();
    state.botsByScene.work = grouped.work || [];
    state.botsByScene.life = grouped.life || [];
    state.botsByScene.love = grouped.love || [];

    wireTabs();
    wireInput();
    wireLogout();

    for (const scene of Object.keys(sceneConfig)) {
      const firstBot = state.botsByScene[scene]?.[0];
      if (firstBot) {
        state.selectedScene = scene;
        state.selectedBotId = firstBot.bot_id;
        break;
      }
    }

    await refreshCurrentHeader();
    await refreshAllConversationLists();

    const initialConversations = await getConversationsByScene(state.selectedScene);
    if (initialConversations.length > 0) {
      state.selectedConversationId = initialConversations[0].conversation_id;
      state.selectedBotId = initialConversations[0].bot_id;
      await refreshCurrentHeader();
      await loadMessages(state.selectedConversationId);
      await refreshAllConversationLists();
    } else {
      ui.messages.innerHTML = `
        <div class="message bot">
          <div class="message-avatar">${ui.chatAvatar.textContent || '🤖'}</div>
          <div class="message-wrapper">
            <div class="message-content">已连接后端数据库。点击“新建话题”开始真实会话写入。</div>
            <div class="message-time">${formatTime(new Date())}</div>
          </div>
        </div>
      `;
    }
  }

  bootstrap().catch((err) => {
    console.error(err);
    alert(err.message || '初始化失败，请稍后重试。');
  });
})();
