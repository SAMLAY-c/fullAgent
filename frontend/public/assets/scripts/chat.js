(function () {
  function redirectToLoginWithReturnTo() {
    const currentPath = `${window.location.pathname}${window.location.search}${window.location.hash}`;
    if (currentPath.includes('login.html')) {
      window.location.href = 'login.html';
      return;
    }
    window.location.href = `login.html?returnTo=${encodeURIComponent(currentPath)}`;
  }

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
    selectedGroupId: null,
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
    groupsList: document.getElementById('groupsList'),
    groupCards: Array.from(document.querySelectorAll('.group-card')),
    createGroupBtn: document.querySelector('.create-btn'),
    promptDisplay: document.getElementById('promptDisplay'),
    promptEditorContainer: document.getElementById('promptEditorContainer'),
    promptEditor: document.getElementById('promptEditor'),
    editPromptBtn: document.getElementById('editPromptBtn'),
    savePromptBtn: document.getElementById('savePromptBtn'),
    sopBtn: document.getElementById('sopBtn'),
    logBtn: document.getElementById('logBtn'),
    quickSettingsBtn: document.getElementById('quickSettingsBtn')
  };

  function escapeHtml(text) {
    return String(text || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function sceneLabel(scene) {
    return ({ work: '工作', life: '生活', love: '情感' }[scene] || scene);
  }

  function formatTime(isoOrDate) {
    const date = isoOrDate instanceof Date ? isoOrDate : new Date(isoOrDate || Date.now());
    if (Number.isNaN(date.getTime())) {
      return '--:--';
    }
    return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
  }

  function getCurrentBot() {
    const sceneBots = state.botsByScene[state.selectedScene] || [];
    return sceneBots.find((b) => b.bot_id === state.selectedBotId) || sceneBots[0] || null;
  }

  async function ensureAuth() {
    if (!authManager.isAuthenticated()) {
      redirectToLoginWithReturnTo();
      return false;
    }
    return true;
  }

  async function ensureDefaultBotsIfEmpty() {
    const grouped = await botClient.getBotsByScene();
    const total = (grouped.work || []).length + (grouped.life || []).length + (grouped.love || []).length;
    if (total > 0) return grouped;

    const defaults = [
      {
        name: '你的工作伙伴',
        avatar: '💼',
        type: 'work',
        scene: 'work',
        description: '帮你管理任务、计划和执行。',
        config: { system_prompt: '你是专业的工作助手，回答简洁且可执行。' }
      },
      {
        name: '生活小助手',
        avatar: '🌿',
        type: 'life',
        scene: 'life',
        description: '帮你规划健康、饮食和日常安排。',
        config: { system_prompt: '你是温暖的生活助手，给出实用建议。' }
      },
      {
        name: '心灵朋友',
        avatar: '💜',
        type: 'love',
        scene: 'love',
        description: '倾听并提供情绪支持与关系建议。',
        config: { system_prompt: '你有同理心，回复柔和且真诚。' }
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

    meta.textContent = `${sceneLabel(scene)}场景 · ${conversations.length} 个话题`;

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
              <div class="conversation-meta">${count} 条消息 · ${updated}</div>
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
        state.selectedGroupId = null;

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

  function renderSettingsPanel() {
    if (!ui.promptDisplay || !ui.promptEditor || !ui.promptEditorContainer) return;

    const bot = getCurrentBot();
    if (!bot) {
      ui.promptDisplay.textContent = '未选中机器人';
      return;
    }

    const systemPrompt = bot.config?.system_prompt || '你是一个 helpful 的 AI 助手。';
    ui.promptDisplay.textContent = systemPrompt;
    ui.promptEditor.value = systemPrompt;
  }

  async function refreshCurrentHeader() {
    const bot = getCurrentBot();
    if (!bot) return;

    state.selectedBotId = bot.bot_id;
    ui.chatAvatar.textContent = bot.avatar || sceneConfig[state.selectedScene].icon;
    ui.chatAvatar.className = `chat-avatar ${state.selectedScene}`;
    ui.chatName.textContent = bot.name || sceneConfig[state.selectedScene].defaultName;
    ui.chatStatus.textContent = bot.description || '已连接后端，支持中文输入与数据库持久化。';
    renderSettingsPanel();
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
    state.selectedGroupId = null;

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

    try {
      const result = await authManager.post(
        `/chat/conversations/${state.selectedConversationId}/messages`,
        { content }
      );

      if (result?.bot_message?.content) {
        appendMessage('bot', result.bot_message.content);
      }

      await refreshAllConversationLists();
    } catch (err) {
      appendMessage('bot', '发送失败，请检查后端服务和模型配置后重试。');
      throw err;
    }
  }

  function activateContentTab(tab) {
    ui.contentTabBtns.forEach((btn) => btn.classList.toggle('active', btn.dataset.tab === tab));
    ui.contentPanels.forEach((panel) => panel.classList.toggle('active', panel.id === `${tab}Panel`));
    if (tab === 'settings') renderSettingsPanel();
  }

  function wireTabs() {
    ui.contentTabBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        const tab = btn.dataset.tab;
        activateContentTab(tab);
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

  function wireGroupCards() {
    ui.groupCards.forEach((card) => {
      card.addEventListener('click', () => {
        ui.groupCards.forEach((x) => x.classList.remove('active'));
        card.classList.add('active');

        state.selectedGroupId = card.dataset.id || null;
        state.selectedConversationId = null;

        const title = card.querySelector('.card-name')?.textContent?.trim() || '群聊';
        const desc = card.querySelector('.card-desc')?.textContent?.trim() || '多人协作讨论';

        ui.chatAvatar.textContent = '👥';
        ui.chatAvatar.className = 'chat-avatar';
        ui.chatName.textContent = title;
        ui.chatStatus.textContent = `${desc} · 群聊模式`;

        ui.messages.innerHTML = `
          <div class="message bot">
            <div class="message-avatar">👥</div>
            <div class="message-wrapper">
              <div class="message-content">当前群聊为 UI 演示模式，后端群聊接口可在下一步接入。</div>
              <div class="message-time">${formatTime(new Date())}</div>
            </div>
          </div>
        `;
      });
    });

    if (ui.createGroupBtn) {
      ui.createGroupBtn.addEventListener('click', () => {
        alert('邀请入口已就绪，群聊创建流程可按你的后端接口继续接入。');
      });
    }
  }

  function wireSettingsActions() {
    if (ui.editPromptBtn) {
      ui.editPromptBtn.addEventListener('click', () => {
        if (!ui.promptEditorContainer || !ui.promptEditor || !ui.promptDisplay) return;

        ui.promptEditorContainer.style.display = 'block';
        ui.promptDisplay.style.display = 'none';
        ui.promptEditor.focus();
      });
    }

    if (ui.savePromptBtn) {
      ui.savePromptBtn.addEventListener('click', async () => {
        const bot = getCurrentBot();
        if (!bot || !ui.promptEditor || !ui.promptDisplay || !ui.promptEditorContainer) {
          alert('当前没有可编辑的机器人。');
          return;
        }

        const prompt = ui.promptEditor.value.trim();
        if (!prompt) {
          alert('提示词不能为空。');
          return;
        }

        try {
          const nextConfig = { ...(bot.config || {}), system_prompt: prompt };
          await botClient.updateBot(bot.bot_id, { config: nextConfig });
          bot.config = nextConfig;

          ui.promptDisplay.textContent = prompt;
          ui.promptDisplay.style.display = 'block';
          ui.promptEditorContainer.style.display = 'none';
        } catch (err) {
          alert(err.message || '保存提示词失败');
        }
      });
    }
  }

  function wireTopActions() {
    if (ui.sopBtn) {
      ui.sopBtn.addEventListener('click', () => {
        activateContentTab('settings');
        if (ui.promptEditorContainer && ui.promptDisplay) {
          ui.promptEditorContainer.style.display = 'block';
          ui.promptDisplay.style.display = 'none';
        }
        if (ui.promptEditor) ui.promptEditor.focus();
      });
    }

    if (ui.logBtn) {
      ui.logBtn.addEventListener('click', () => {
        activateContentTab('memory');
      });
    }

    if (ui.quickSettingsBtn) {
      ui.quickSettingsBtn.addEventListener('click', () => {
        activateContentTab('settings');
      });
    }
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
    wireGroupCards();
    wireSettingsActions();
    wireTopActions();

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
