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
    folders: [],
    selectedFolderId: null,
    selectedFolderChipId: 'all',
    selectedScene: 'work',
    selectedBotId: null,
    selectedConversationId: null,
    selectedGroupId: null,
    groups: [],
    isComposing: false,
    conversationsByScene: { work: [], life: [], love: [] },
    archivedConversationIds: new Set(),
    archivesByConversationId: {},
    injectedMemoryIds: new Set()
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
    quickSettingsBtn: document.getElementById('quickSettingsBtn'),
    modelSelect: document.getElementById('modelSelect'),
    temperatureInput: document.getElementById('temperatureInput'),
    maxTokensInput: document.getElementById('maxTokensInput'),
    saveConfigBtn: document.getElementById('saveConfigBtn'),
    folderChipRow: document.getElementById('folderChipRow'),
    folderChipAddBtn: document.getElementById('folderChipAddBtn'),
    topicListTitle: document.getElementById('topicListTitle'),
    topicConversationList: document.getElementById('topicConversationList'),
    topicCreateBtn: document.getElementById('topicCreateBtn'),
    themeCreateModal: document.getElementById('themeCreateModal'),
    themeCreateNameInput: document.getElementById('themeCreateNameInput'),
    themeCreatePromptInput: document.getElementById('themeCreatePromptInput'),
    themeCreateModelSelect: document.getElementById('themeCreateModelSelect'),
    themeCreateSceneSubtitle: document.getElementById('themeCreateModalSceneSubtitle'),
    themeCreateCloseBtn: document.getElementById('themeCreateCloseBtn'),
    themeCreateCancelBtn: document.getElementById('themeCreateCancelBtn'),
    themeCreateConfirmBtn: document.getElementById('themeCreateConfirmBtn'),
    topicModal: document.getElementById('topicFolderModal'),
    topicNameInput: document.getElementById('topicFolderNameInput'),
    topicExtraContextInput: document.getElementById('topicExtraContextInput'),
    topicCreateConfirmBtn: document.getElementById('topicFolderCreateBtn'),
    topicCloseBtn: document.getElementById('topicFolderCloseBtn'),
    topicCancelBtn: document.getElementById('topicFolderCancelBtn'),
    topicSystemPromptPreview: document.getElementById('topicSystemPromptPreview'),
    topicModalSceneSubtitle: document.getElementById('topicFolderModalSceneSubtitle'),
    topicMemoryPresetList: document.getElementById('topicMemoryPresetList'),
    trashToggleBtn: document.getElementById('trashToggleBtn'),
    trashModal: document.getElementById('trashModal'),
    trashList: document.getElementById('trashList'),
    trashCloseBtn: document.getElementById('trashCloseBtn'),
    trashRefreshBtn: document.getElementById('trashRefreshBtn'),
    rightSidePanel: document.getElementById('rightSidePanel'),
    rightPanelTitle: document.getElementById('rightPanelTitle'),
    rightPanelCloseBtn: document.getElementById('rightPanelCloseBtn'),
    archivePreviewPanel: document.getElementById('archivePreviewPanel'),
    memoryPickerPanel: document.getElementById('memoryPickerPanel'),
    archiveConversationBtn: document.getElementById('archiveConversationBtn'),
    injectMemoryBtn: document.getElementById('injectMemoryBtn'),
    uploadToolBtn: document.getElementById('uploadToolBtn'),
    recordToolBtn: document.getElementById('recordToolBtn'),
    composerMoreBtn: document.getElementById('composerMoreBtn'),
    chatUploadInput: document.getElementById('chatUploadInput'),
    archiveTopicTitleInput: document.getElementById('archiveTopicTitleInput'),
    archiveSummaryInput: document.getElementById('archiveSummaryInput'),
    archiveInsightInput: document.getElementById('archiveInsightInput'),
    archiveMetaText: document.getElementById('archiveMetaText'),
    archiveTagList: document.getElementById('archiveTagList'),
    archiveCancelBtn: document.getElementById('archiveCancelBtn'),
    archiveConfirmBtn: document.getElementById('archiveConfirmBtn'),
    memoryPickerList: document.getElementById('memoryPickerList'),
    memoryPickedCount: document.getElementById('memoryPickedCount'),
    memoryInjectConfirmBtn: document.getElementById('memoryInjectConfirmBtn')
  };

  const topicDraft = {};

  const sceneDisplay = {
    work: { label: '工作场景', desc: '职场成长顾问', avatar: '💼' },
    life: { label: '生活场景', desc: '日常生活顾问', avatar: '🌿' },
    love: { label: '情感场景', desc: '关系沟通顾问', avatar: '💜' }
  };

  const demoMemoryEntries = [
    { id: 'm1', title: '薪资谈判·第1次', date: '2026/1/10', quote: '用贡献-市场-期望三段式...' },
    { id: 'm2', title: '薪资谈判·第2次', date: '2026/2/1', quote: '实战后复盘，老板反应...' },
    { id: 'm3', title: '跨部门协作·复盘', date: '2026/1/20', quote: '推动协作需要提前...' }
  ];

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

  function formatDateTime(isoOrDate) {
    const date = isoOrDate instanceof Date ? isoOrDate : new Date(isoOrDate || Date.now());
    if (Number.isNaN(date.getTime())) return '--';
    return date.toLocaleString('zh-CN');
  }

  function getCurrentBot() {
    const sceneBots = state.botsByScene[state.selectedScene] || [];
    return sceneBots.find((b) => b.bot_id === state.selectedBotId) || sceneBots[0] || null;
  }

  function renderChatPlaceholder(text) {
    ui.messages.innerHTML = `
      <div class="message bot">
        <div class="message-avatar">${ui.chatAvatar.textContent || '\uD83E\uDD16'}</div>
        <div class="message-wrapper">
          <div class="message-content">${escapeHtml(text)}</div>
          <div class="message-time">${formatTime(new Date())}</div>
        </div>
      </div>
    `;
  }

  function escapeAttr(text) {
    return String(text || '').replace(/"/g, '&quot;');
  }

  function ensureTrashUI() {
    if (ui.topicModal) ui.topicModal.setAttribute('aria-hidden', ui.topicModal.classList.contains('open') ? 'false' : 'true');
    if (ui.themeCreateModal) ui.themeCreateModal.setAttribute('aria-hidden', ui.themeCreateModal.classList.contains('open') ? 'false' : 'true');
    if (ui.trashModal) ui.trashModal.setAttribute('aria-hidden', ui.trashModal.classList.contains('open') ? 'false' : 'true');
  }

  function getSelectedFolder() {
    return state.folders.find((f) => f.folder_id === state.selectedFolderId) || null;
  }

  function getFolderChipLabel(folder) {
    const name = String(folder?.name || '未命名');
    return name.length > 7 ? `${name.slice(0, 7)}…` : name;
  }

  function conversationBucketKey(conversation) {
    return conversation?.bot_id || 'all';
  }

  function getAllConversationsFlat() {
    return ['work', 'life', 'love'].flatMap((scene) => state.conversationsByScene[scene] || []);
  }

  function findConversationById(conversationId) {
    return getAllConversationsFlat().find((c) => c.conversation_id === conversationId) || null;
  }

  function patchConversationInState(conversationId, patch) {
    if (!conversationId) return;
    Object.keys(state.conversationsByScene).forEach((scene) => {
      const list = state.conversationsByScene[scene] || [];
      const target = list.find((c) => c.conversation_id === conversationId);
      if (target) Object.assign(target, patch);
    });
  }

  function getConversationsForSelectedFolder() {
    const all = getAllConversationsFlat();
    if (!state.selectedFolderId || state.selectedFolderChipId === 'all') return all;
    return all.filter((c) => conversationBucketKey(c) === state.selectedFolderId);
  }

  function renderFolderList() {
    if (!ui.folderChipRow) return;

    const allConversations = getAllConversationsFlat();
    const allCount = allConversations.length;

    const chips = [
      `<button class="folder-chip${state.selectedFolderChipId === 'all' ? ' active' : ''}" data-chip-id="all" type="button">全部${allCount}</button>`
    ];

    state.folders.forEach((folder) => {
      const count = allConversations.filter((c) => conversationBucketKey(c) === folder.folder_id).length;
      const active = state.selectedFolderChipId === folder.folder_id ? ' active' : '';
      chips.push(
        `<button class="folder-chip${active}" data-chip-id="${folder.folder_id}" data-bot-id="${folder.bot_id || folder.folder_id}" data-scene="${escapeHtml(folder.scene || '')}" type="button" title="${escapeHtml(folder.name || '未命名主题')}">${escapeHtml(getFolderChipLabel(folder))}${count}</button>`
      );
    });

    chips.push('<button class="folder-chip add" id="folderChipAddBtn" data-chip-id="__add__" type="button">+</button>');
    ui.folderChipRow.innerHTML = chips.join('');

    Array.from(ui.folderChipRow.querySelectorAll('.folder-chip')).forEach((chip) => {
      chip.addEventListener('click', () => {
        const chipId = chip.dataset.chipId || '';
        if (chipId === '__add__') {
          openThemeCreateModal();
          return;
        }
        state.selectedFolderChipId = chipId;
        state.selectedFolderId = chipId === 'all' ? null : chipId;
        if (chipId !== 'all') {
          const botId = chip.dataset.botId || chipId;
          const scene = chip.dataset.scene || state.selectedScene;
          state.selectedBotId = botId;
          state.selectedScene = scene;
          state.selectedConversationId = null;
        }
        renderFolderList();
        renderSingleBotTopicList();
        refreshCurrentHeader().catch(() => {});
      });
    });

    updateTopicListTitle();
  }

  function updateTopicListTitle() {
    if (!ui.topicListTitle) return;
    const folder = getSelectedFolder();
    ui.topicListTitle.textContent = `${folder?.name || '全部'} 的话题`;
  }

  async function refreshFolderList() {
    const allThemeBots = ['work', 'life', 'love']
      .flatMap((scene) => (state.botsByScene[scene] || []).map((bot) => ({
        folder_id: bot.bot_id,
        bot_id: bot.bot_id,
        name: bot.name,
        scene: bot.scene,
        description: bot.description
      })));

    state.folders = allThemeBots;
    if (state.selectedFolderId && !state.folders.some((f) => f.folder_id === state.selectedFolderId)) {
      state.selectedFolderId = null;
      state.selectedFolderChipId = 'all';
    }

    if (!state.selectedFolderId && state.selectedBotId && state.folders.some((f) => f.folder_id === state.selectedBotId)) {
      state.selectedFolderId = state.selectedBotId;
      state.selectedFolderChipId = state.selectedBotId;
    }

    if (!state.selectedFolderId && state.folders[0]) {
      state.selectedFolderId = state.folders[0].folder_id;
      state.selectedFolderChipId = state.folders[0].folder_id;
      state.selectedBotId = state.folders[0].bot_id;
      state.selectedScene = state.folders[0].scene || state.selectedScene;
    }

    renderFolderList();
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

    const shouldSeedDemoBots =
      new URLSearchParams(window.location.search).get('seed_demo') === '1' ||
      localStorage.getItem('seed_demo_bots') === '1';

    if (!shouldSeedDemoBots) {
      console.info('[chat] No bots found. Skip auto-seeding demo bots. Set ?seed_demo=1 or localStorage.seed_demo_bots=1 to enable.');
      return grouped;
    }

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

  async function loadDeletedConversations() {
    const result = await authManager.get('/chat/conversations/deleted');
    return result.conversations || [];
  }

  async function refreshGroupsList() {
    if (!ui.groupsList) return;

    try {
      const result = await authManager.get('/groups?page=1&page_size=50');
      state.groups = Array.isArray(result?.items) ? result.items : [];
    } catch (err) {
      state.groups = [];
      ui.groupsList.innerHTML = `
        <div class="folder-topic-empty" style="margin: 12px;">${escapeHtml(err.message || '群聊列表加载失败')}</div>
        <button class="create-btn" type="button">
          <span>✨</span>
          <span>邀请更多朋友一起聊聊</span>
        </button>
      `;
      return;
    }

    if (!state.groups.length) {
      ui.groupsList.innerHTML = `
        <div class="folder-topic-empty" style="margin: 12px;">暂无群聊，去管理后台创建后这里会同步显示</div>
        <button class="create-btn" type="button">
          <span>✨</span>
          <span>邀请更多朋友一起聊聊</span>
        </button>
      `;
      return;
    }

    const cards = state.groups.map((group) => {
      const members = Array.isArray(group.members) ? group.members.slice(0, 4) : [];
      const memberCount = group?._count?.members ?? members.length ?? 0;
      const memberAvatars = members.map((m) => {
        const avatar = escapeHtml(m?.bot?.avatar || '🤖');
        return `<div class="member-avatar" style="background: linear-gradient(135deg, #E8E4FF 0%, #F0ECFF 100%);">${avatar}</div>`;
      }).join('');
      const desc = escapeHtml(group.description || `${group.routing_strategy || 'ai_judge'} · ${group.conversation_mode || 'multi_turn'}`);
      const title = escapeHtml(group.name || '未命名群聊');
      const groupId = escapeAttr(group.group_id || '');

      return `
        <div class="group-card" data-type="group" data-id="${groupId}">
          <div class="card-header">
            <span class="card-icon">👥</span>
            <div class="card-info">
              <div class="card-name">${title}</div>
              <div class="card-desc">${desc}</div>
            </div>
          </div>
          <div class="group-members">
            ${memberAvatars}
            <span class="member-count">${memberCount}个成员</span>
          </div>
        </div>
      `;
    }).join('');

    ui.groupsList.innerHTML = `
      ${cards}
      <button class="create-btn" type="button">
        <span>✨</span>
        <span>邀请更多朋友一起聊聊</span>
      </button>
    `;
  }

  function renderTrashList(conversations) {
    if (!ui.trashList) return;

    if (!conversations.length) {
      ui.trashList.innerHTML = '<div class="trash-empty">回收站为空</div>';
      return;
    }

    ui.trashList.innerHTML = conversations.map((c) => {
      const title = escapeHtml(c.title || '未命名话题');
      const botName = escapeHtml(c.bot?.name || c.bot_id || '-');
      const msgCount = c._count?.messages || 0;
      const deletedAt = formatDateTime(c.deleted_at);
      return `
        <div class="trash-item">
          <div class="trash-item-main">
            <div class="trash-item-title">${title}</div>
            <div class="trash-item-meta">${botName} · ${msgCount} 条消息 · 删除于 ${deletedAt}</div>
          </div>
          <div class="trash-item-actions">
            <button type="button" class="trash-item-btn restore" data-trash-action="restore" data-conversation-id="${c.conversation_id}">恢复</button>
            <button type="button" class="trash-item-btn danger" data-trash-action="purge" data-conversation-id="${c.conversation_id}">彻底删除</button>
          </div>
        </div>
      `;
    }).join('');

    Array.from(ui.trashList.querySelectorAll('[data-trash-action]')).forEach((btn) => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const action = btn.dataset.trashAction;
        const conversationId = btn.dataset.conversationId || '';
        if (!conversationId) return;

        try {
          if (action === 'restore') {
            await authManager.post(`/chat/conversations/${conversationId}/restore`, {});
            await refreshAllConversationLists();
            await refreshSelectionAfterListChange();
            await openTrashModal();
            return;
          }

          if (action === 'purge') {
            if (!confirm('永久删除后无法恢复，确定继续？')) return;
            await authManager.delete(`/chat/conversations/${conversationId}/permanent`);
            await openTrashModal();
          }
        } catch (err) {
          alert(err.message || '操作失败');
        }
      });
    });
  }

  async function openTrashModal() {
    ensureTrashUI();
    if (!ui.trashModal || !ui.trashList) return;
    ui.trashModal.classList.add('open');
    ui.trashModal.setAttribute('aria-hidden', 'false');
    ui.trashList.innerHTML = '<div class="trash-empty">加载中...</div>';
    try {
      renderTrashList(await loadDeletedConversations());
    } catch (err) {
      ui.trashList.innerHTML = `<div class="trash-empty">${escapeHtml(err.message || '加载失败')}</div>`;
    }
  }

  function closeTrashModal() {
    ui.trashModal?.classList.remove('open');
    ui.trashModal?.setAttribute('aria-hidden', 'true');
  }

  function showLightToast(message, type = 'info') {
    const hostId = 'chatToastHost';
    let host = document.getElementById(hostId);
    if (!host) {
      host = document.createElement('div');
      host.id = hostId;
      host.className = 'chat-toast-host';
      document.body.appendChild(host);
    }

    const node = document.createElement('div');
    node.className = `chat-toast ${type}`;
    node.textContent = message;
    host.appendChild(node);

    setTimeout(() => {
      node.classList.add('leave');
      setTimeout(() => node.remove(), 180);
    }, 2200);
  }

  function openThemeCreateModal() {
    if (!ui.themeCreateModal) return;
    const scene = state.selectedScene || 'work';
    const sceneMeta = sceneDisplay[scene] || sceneDisplay.work;
    if (ui.themeCreateNameInput) ui.themeCreateNameInput.value = '';
    if (ui.themeCreatePromptInput) ui.themeCreatePromptInput.value = '';
    if (ui.themeCreateModelSelect) ui.themeCreateModelSelect.value = 'deepseek-ai/DeepSeek-V3.2';
    if (ui.themeCreateSceneSubtitle) {
      ui.themeCreateSceneSubtitle.textContent = `将在「${sceneMeta.label}」创建主题（Bot）`;
    }
    ui.themeCreateModal.classList.add('open');
    ui.themeCreateModal.setAttribute('aria-hidden', 'false');
    setTimeout(() => ui.themeCreateNameInput?.focus(), 0);
  }

  function closeThemeCreateModal() {
    if (!ui.themeCreateModal) return;
    ui.themeCreateModal.classList.remove('open');
    ui.themeCreateModal.setAttribute('aria-hidden', 'true');
  }

  async function createThemeFromModal() {
    if (!ui.themeCreateConfirmBtn) return;
    const name = (ui.themeCreateNameInput?.value || '').trim();
    const systemPrompt = (ui.themeCreatePromptInput?.value || '').trim();
    const model = (ui.themeCreateModelSelect?.value || 'deepseek-ai/DeepSeek-V3.2').trim();
    const scene = (state.selectedScene || 'work');

    if (!name) {
      alert('请填写主题名称');
      ui.themeCreateNameInput?.focus();
      return;
    }
    if (!systemPrompt) {
      alert('请填写系统提示词');
      ui.themeCreatePromptInput?.focus();
      return;
    }

    ui.themeCreateConfirmBtn.disabled = true;
    ui.themeCreateConfirmBtn.textContent = '创建中...';
    try {
      const created = await botClient.createBot({
        name,
        type: scene,
        scene,
        status: 'online',
        description: `${sceneLabel(scene)}主题`,
        config: {
          model,
          temperature: 0.7,
          max_tokens: 2000,
          system_prompt: systemPrompt
        }
      });

      const grouped = await botClient.getBotsByScene();
      state.botsByScene.work = grouped.work || [];
      state.botsByScene.life = grouped.life || [];
      state.botsByScene.love = grouped.love || [];

      state.selectedScene = created.scene || scene;
      state.selectedBotId = created.bot_id;
      state.selectedFolderId = created.bot_id;
      state.selectedFolderChipId = created.bot_id;
      state.selectedConversationId = null;
      state.selectedGroupId = null;

      await refreshFolderList();
      closeThemeCreateModal();
      showLightToast('主题已创建，正在为你打开默认对话...', 'success');

      await createConversation(state.selectedScene || scene, {
        bot_id: created.bot_id,
        title: `${name} · 初次对话`
      });

      showLightToast('已自动创建默认对话，直接开始聊吧', 'info');
    } finally {
      ui.themeCreateConfirmBtn.disabled = false;
      ui.themeCreateConfirmBtn.textContent = '创建主题';
    }
  }

  function openTopicCreateModal() {
    if (!ui.topicModal) return;
    const bot = getCurrentBot();
    const folder = getSelectedFolder();
    if (ui.topicNameInput) ui.topicNameInput.value = '';
    if (ui.topicExtraContextInput) ui.topicExtraContextInput.value = '';
    if (ui.topicSystemPromptPreview) {
      ui.topicSystemPromptPreview.value = bot?.config?.system_prompt || '你是一个专业、可靠、可执行的 AI 助手。';
    }
    if (ui.topicModalSceneSubtitle) {
      ui.topicModalSceneSubtitle.textContent = `在「${folder?.name || (bot?.name || '当前场景')}」场景下创建`;
    }
    if (ui.topicMemoryPresetList) {
      Array.from(ui.topicMemoryPresetList.querySelectorAll('input[type="checkbox"]')).forEach((checkbox, index) => {
        checkbox.checked = index === 0;
      });
    }
    ui.topicModal.classList.add('open');
    ui.topicModal.setAttribute('aria-hidden', 'false');
    setTimeout(() => ui.topicNameInput?.focus(), 0);
  }

  function closeTopicCreateModal() {
    if (!ui.topicModal) return;
    ui.topicModal.classList.remove('open');
    ui.topicModal.setAttribute('aria-hidden', 'true');
  }

  async function refreshSelectionAfterListChange() {
    if (state.selectedGroupId) return;
    const conversations = await getConversationsByScene(state.selectedScene);
    if (!conversations.length) {
      state.selectedConversationId = null;
      renderChatPlaceholder('当前场景暂无话题，点击“新建话题”开始。');
      return;
    }

    if (state.selectedConversationId && conversations.some((c) => c.conversation_id === state.selectedConversationId)) {
      return;
    }

    state.selectedConversationId = conversations[0].conversation_id;
    state.selectedBotId = conversations[0].bot_id;
    await refreshCurrentHeader();
    await loadMessages(state.selectedConversationId);
    await refreshAllConversationLists();
  }

  async function deleteConversation(conversationId, title) {
    if (!conversationId) return;
    if (!confirm(`确认删除话题“${title || '未命名话题'}”？\n删除后可在回收站恢复。`)) return;

    await authManager.delete(`/chat/conversations/${conversationId}`, {
      body: JSON.stringify({ reason: 'user_deleted' })
    });

    if (state.selectedConversationId === conversationId) {
      state.selectedConversationId = null;
    }

    await refreshAllConversationLists();
    await refreshSelectionAfterListChange();
  }

  async function renameConversation(conversationId) {
    if (!conversationId) return;
    const conversation = findConversationById(conversationId);
    const currentTitle = String(conversation?.title || '').trim();
    const nextTitle = prompt('请输入新的对话名称（留空将恢复为未命名）', currentTitle);
    if (nextTitle === null) return;

    const normalizedTitle = String(nextTitle || '').trim();
    await authManager.patch(`/conversations/${encodeURIComponent(conversationId)}`, {
      title: normalizedTitle
    });

    patchConversationInState(conversationId, { title: normalizedTitle || null, updated_at: new Date().toISOString() });
    renderConversations(state.selectedScene, state.conversationsByScene[state.selectedScene] || []);
    renderFolderList();
    renderSingleBotTopicList();
    await refreshCurrentHeader();
    showLightToast('对话名称已更新', 'success');
  }

  function wireConversationRenameGesture(item, titleSelector) {
    if (!(item instanceof HTMLElement)) return;
    const titleNode = item.querySelector(titleSelector);
    const conversationId = item.dataset.conversationId || '';
    if (!conversationId || !(titleNode instanceof HTMLElement)) return;

    titleNode.addEventListener('dblclick', (e) => {
      e.stopPropagation();
      renameConversation(conversationId).catch((err) => alert(err.message || '改名失败'));
    });

    item.addEventListener('contextmenu', (e) => {
      if (!(e.target instanceof HTMLElement)) return;
      if (e.target.closest('[data-action="delete-conversation"]')) return;
      e.preventDefault();
      renameConversation(conversationId).catch((err) => alert(err.message || '改名失败'));
    });
  }

  function formatRelativeTopicTime(isoOrDate) {
    const date = new Date(isoOrDate || Date.now());
    if (Number.isNaN(date.getTime())) return '--';
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfTarget = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const dayDiff = Math.round((startOfToday - startOfTarget) / (24 * 60 * 60 * 1000));
    if (dayDiff <= 0) {
      const minutes = Math.abs((now - date) / (60 * 1000));
      if (minutes < 60) return '刚才';
      return formatTime(date);
    }
    if (dayDiff === 1) return '昨天';
    if (dayDiff < 7) {
      return ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][date.getDay()];
    }
    return `${date.getMonth() + 1}/${date.getDate()}`;
  }

  function seedArchivedConversations() {
    const list = getAllConversationsFlat();
    list.slice(0, 2).forEach((c, idx) => {
      if (!c?.conversation_id) return;
      if (!state.archivesByConversationId[c.conversation_id]) {
        state.archivesByConversationId[c.conversation_id] = {
          count: idx + 1,
          title: c.title || '未命名话题',
          summary: '这里是 AI 自动生成的会话摘要预览，可编辑后确认存入记忆。',
          insights: '关键洞察会提炼对方关注点、你的策略与下一步动作建议。',
          tags: idx === 0 ? ['薪资谈判', '职场策略'] : ['沟通复盘']
        };
      }
      if (idx === 0) state.archivedConversationIds.add(c.conversation_id);
    });
  }

  function renderSingleBotTopicList() {
    if (!ui.topicConversationList) return;
    updateTopicListTitle();

    const conversations = getConversationsForSelectedFolder();
    if (!conversations.length) {
      ui.topicConversationList.innerHTML = '<div class="folder-topic-empty">当前 Folder 下暂无话题，点击底部“新建话题”开始。</div>';
      return;
    }

    ui.topicConversationList.innerHTML = conversations
      .map((c) => {
        const active = c.conversation_id === state.selectedConversationId ? ' active' : '';
        const title = escapeHtml(c.title || '未命名话题');
        const timeText = formatRelativeTopicTime(c.updated_at);
        const archived = state.archivedConversationIds.has(c.conversation_id);
        return `
          <div class="topic-row${active}" data-scene="${escapeHtml(c.__scene || '')}" data-conversation-id="${c.conversation_id}" data-bot-id="${c.bot_id}">
            <div class="topic-row-main">
              <div class="topic-row-title-line">
                ${archived ? '<span class="topic-row-archived" title="已归档">🗃️</span>' : ''}
                <span class="topic-row-title" title="双击或右键可改名">${title}</span>
              </div>
              <div class="topic-row-meta">${timeText}</div>
            </div>
            <button
              type="button"
              class="conversation-delete-btn topic-row-delete"
              data-action="delete-conversation"
              data-conversation-id="${c.conversation_id}"
              data-conversation-title="${title}"
              title="删除话题"
            >✕</button>
          </div>
        `;
      })
      .join('');

    Array.from(ui.topicConversationList.querySelectorAll('.topic-row')).forEach((item) => {
      const deleteBtn = item.querySelector('[data-action="delete-conversation"]');
      if (deleteBtn) {
        deleteBtn.addEventListener('click', async (e) => {
          e.stopPropagation();
          await deleteConversation(
            deleteBtn.dataset.conversationId || '',
            deleteBtn.dataset.conversationTitle || '未命名话题'
          );
        });
      }

      item.addEventListener('click', async () => {
        state.selectedScene = item.dataset.scene || state.selectedScene;
        state.selectedBotId = item.dataset.botId || state.selectedBotId;
        state.selectedConversationId = item.dataset.conversationId || state.selectedConversationId;
        state.selectedGroupId = null;
        await refreshCurrentHeader();
        await loadMessages(state.selectedConversationId);
        renderSingleBotTopicList();
      });

      wireConversationRenameGesture(item, '.topic-row-title');
    });
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
              <div class="conversation-title" title="双击或右键可改名">${title}</div>
              <div class="conversation-meta">${count} 条消息 · ${updated}</div>
            </div>
            <div class="conversation-actions">
              <button
                type="button"
                class="conversation-delete-btn"
                data-action="delete-conversation"
                data-conversation-id="${c.conversation_id}"
                data-conversation-title="${title}"
                title="删除话题"
              >✕</button>
            </div>
          </div>
        `;
      })
      .join('');

    Array.from(list.querySelectorAll('.conversation-item')).forEach((item) => {
      const deleteBtn = item.querySelector('[data-action="delete-conversation"]');
      if (deleteBtn) {
        deleteBtn.addEventListener('click', async (e) => {
          e.stopPropagation();
          await deleteConversation(
            deleteBtn.dataset.conversationId || '',
            deleteBtn.dataset.conversationTitle || '未命名话题'
          );
        });
      }

      item.addEventListener('click', async () => {
        state.selectedScene = item.dataset.scene;
        state.selectedBotId = item.dataset.botId;
        state.selectedConversationId = item.dataset.conversationId;
        state.selectedGroupId = null;

        await refreshCurrentHeader();
        await loadMessages(state.selectedConversationId);
        await refreshAllConversationLists();
      });

      wireConversationRenameGesture(item, '.conversation-title');
    });
  }

  async function getConversationsByScene(scene) {
    const bots = state.botsByScene[scene] || [];
    const merged = [];

    for (const bot of bots) {
      const res = await authManager.get(`/chat/conversations?bot_id=${encodeURIComponent(bot.bot_id)}`);
      const conversations = res.conversations || [];
      merged.push(...conversations.map((c) => ({ ...c, __scene: scene })));
    }

    merged.sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));
    return merged;
  }

  async function refreshAllConversationLists() {
    for (const scene of Object.keys(sceneConfig)) {
      const conversations = await getConversationsByScene(scene);
      state.conversationsByScene[scene] = conversations;
      renderConversations(scene, conversations);
    }
    seedArchivedConversations();
    renderFolderList();
    renderSingleBotTopicList();
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

    // 娓叉煋妯″瀷閰嶇疆
    const config = bot.config || {};
    if (ui.modelSelect) ui.modelSelect.value = config.model || 'deepseek-ai/DeepSeek-V3.2';
    if (ui.temperatureInput) ui.temperatureInput.value = config.temperature ?? 0.7;
    if (ui.maxTokensInput) ui.maxTokensInput.value = config.max_tokens ?? 2000;
  }

  async function refreshCurrentHeader() {
    const bot = getCurrentBot();
    if (!bot) return;

    state.selectedBotId = bot.bot_id;
    const folder = getSelectedFolder();
    const sceneMeta = sceneDisplay[state.selectedScene] || sceneDisplay.work;
    ui.chatAvatar.textContent = bot.avatar || sceneMeta.avatar || sceneConfig[state.selectedScene].icon;
    ui.chatAvatar.className = `chat-avatar ${state.selectedScene}`;
    ui.chatName.textContent = folder?.name || bot.name || sceneConfig[state.selectedScene].defaultName;
    ui.chatStatus.textContent = folder
      ? `${sceneMeta.label}·${sceneMeta.desc}`
      : (bot.description || '已连接后端，支持中文输入与数据库持久化。');
    renderSettingsPanel();
  }

  async function loadMessages(conversationId) {
    const res = await authManager.get(`/chat/conversations/${conversationId}/messages`);
    const messages = res.messages || [];

    ui.messages.innerHTML = messages
      .map((m) => {
        const klass = m.sender_type === 'user' ? 'user' : 'bot';
        const avatar = m.sender_type === 'user' ? '\uD83D\uDC64' : (ui.chatAvatar.textContent || '\uD83E\uDD16');

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

  async function createConversation(scene, opts = {}) {
    const sceneBots = state.botsByScene[scene] || [];
    const preferredBotId = typeof opts.bot_id === 'string' ? opts.bot_id : state.selectedBotId;
    const bot = sceneBots.find((x) => x.bot_id === preferredBotId) || sceneBots[0];
    if (!bot) {
      alert('该场景暂时没有 Bot，请先在后台创建。');
      return;
    }

    const providedTitle = typeof opts.title === 'string' ? opts.title.trim() : '';
    const providedExtraContext = typeof opts.extra_context === 'string' ? opts.extra_context.trim() : '';
    const title = providedTitle || `新话题 ${new Date().toLocaleString('zh-CN')}`;

    const conversation = await authManager.post('/chat/conversations', {
      bot_id: bot.bot_id,
      title,
      extra_context: providedExtraContext || undefined
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
    const avatar = senderType === 'user' ? '\uD83D\uDC64' : (ui.chatAvatar.textContent || '\uD83E\uDD16');

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
      const memoryIds = Array.from(state.injectedMemoryIds || []);
      const result = await authManager.post(
        `/chat/conversations/${state.selectedConversationId}/messages`,
        { content, memory_ids: memoryIds }
      );

      if (result?.bot_message?.content) {
        appendMessage('bot', result.bot_message.content);
      }

      if (memoryIds.length > 0) {
        showLightToast(`本次消息已携带 ${memoryIds.length} 条记忆`, 'info');
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
    if (tab === 'memory') renderMemoryArchivePanel();
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
        const sidebarFooter = document.getElementById('sidebarFooter');
        if (sidebarFooter) sidebarFooter.style.display = tab === 'scenes' ? 'block' : 'none';
        if (tab === 'groups') {
          closeRightPanel();
          refreshGroupsList().catch(() => {});
        }
      });
    });
  }

  function wireGroupCards() {
    ui.groupsList?.addEventListener('click', (e) => {
      const target = e.target;
      if (!(target instanceof HTMLElement)) return;

      const createBtn = target.closest('.create-btn');
      if (createBtn) {
        alert('邀请入口已就绪，群聊创建流程可按你的后端接口继续接入。');
        return;
      }

      const card = target.closest('.group-card');
      if (!(card instanceof HTMLElement)) return;

      ui.groupsList.querySelectorAll('.group-card').forEach((x) => x.classList.remove('active'));
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
            <div class="message-content">当前群聊已读取真实群组列表；群聊消息收发接口仍待接入。</div>
            <div class="message-time">${formatTime(new Date())}</div>
          </div>
        </div>
      `;
    });
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

    // 淇濆瓨妯″瀷閰嶇疆
    if (ui.saveConfigBtn) {
      ui.saveConfigBtn.addEventListener('click', async () => {
        const bot = getCurrentBot();
        if (!bot) {
          alert('当前没有选中的机器人。');
          return;
        }

        const model = ui.modelSelect?.value || 'deepseek-ai/DeepSeek-V3.2';
        const temperature = parseFloat(ui.temperatureInput?.value || '0.7');
        const maxTokens = parseInt(ui.maxTokensInput?.value || '2000');

        if (isNaN(temperature) || temperature < 0 || temperature > 2) {
          alert('温度值必须在 0-2 之间。');
          return;
        }

        if (isNaN(maxTokens) || maxTokens < 100 || maxTokens > 8000) {
          alert('最大 Token 数必须在 100-8000 之间。');
          return;
        }

        try {
          const nextConfig = {
            ...(bot.config || {}),
            model,
            temperature,
            max_tokens: maxTokens
          };

          await botClient.updateBot(bot.bot_id, { config: nextConfig });
          bot.config = nextConfig;

          alert('模型配置已保存');
        } catch (err) {
          alert(err.message || '淇濆瓨閰嶇疆澶辫触');
        }
      });
    }
  }

  function closeRightPanel() {
    if (!ui.rightSidePanel) return;
    ui.rightSidePanel.classList.remove('open');
    ui.rightSidePanel.setAttribute('aria-hidden', 'true');
    if (ui.archivePreviewPanel) ui.archivePreviewPanel.classList.remove('active');
    if (ui.memoryPickerPanel) ui.memoryPickerPanel.classList.remove('active');
  }

  function getCurrentConversation() {
    return getAllConversationsFlat().find((c) => c.conversation_id === state.selectedConversationId) || null;
  }

  function getMemoryFolderIdForPicker() {
    const currentConversation = getCurrentConversation();
    if (currentConversation?.folder_id) return currentConversation.folder_id;
    return null;
  }

  async function loadMemoryPickerOptions() {
    if (!ui.memoryPickerList) return;

    const folderId = getMemoryFolderIdForPicker();
    if (!folderId) {
      ui.memoryPickerList.innerHTML = '<div class="folder-topic-empty">请先选择一个具体主题（Folder）后再注入记忆</div>';
      updateMemoryPickedCount();
      return;
    }

    const res = await authManager.get(`/memories?folder_id=${encodeURIComponent(folderId)}`);
    const memories = Array.isArray(res?.memories) ? res.memories : [];

    if (!memories.length) {
      ui.memoryPickerList.innerHTML = '<div class="folder-topic-empty">当前主题下暂无可注入记忆</div>';
      updateMemoryPickedCount();
      return;
    }

    ui.memoryPickerList.innerHTML = memories.map((m) => {
      const checked = state.injectedMemoryIds.has(String(m.id)) ? 'checked' : '';
      const title = escapeHtml(m.title || '未命名记忆');
      const dateText = escapeHtml(formatDateTime(m.archived_at));
      const quote = escapeHtml(m.summaryPreview || m.summary || m.insight || '暂无摘要');
      const memoryId = escapeHtml(m.id);
      const archiveIndex = m.archiveIndex ? ` · 第${escapeHtml(String(m.archiveIndex))}次` : '';
      return `
        <label class="memory-picker-item">
          <input type="checkbox" value="${memoryId}" ${checked} />
          <div class="memory-picker-content">
            <div class="memory-picker-title">${title}${archiveIndex} <span>${dateText}</span></div>
            <div class="memory-picker-quote">${quote}</div>
          </div>
        </label>
      `;
    }).join('');

    updateMemoryPickedCount();
  }

  function openRightPanel(mode) {
    if (!ui.rightSidePanel) return;
    const conversation = getCurrentConversation();
    if (mode === 'archive') {
      const archive = state.archivesByConversationId[state.selectedConversationId] || {
        count: 1,
        title: conversation?.title || '未命名话题',
        summary: '请补充本次对话的摘要与关键信息。',
        insights: '请补充关键洞察。',
        tags: ['待整理']
      };
      if (ui.rightPanelTitle) ui.rightPanelTitle.textContent = '归档预览';
      if (ui.archiveTopicTitleInput) ui.archiveTopicTitleInput.value = archive.title || '';
      if (ui.archiveSummaryInput) ui.archiveSummaryInput.value = archive.summary || '';
      if (ui.archiveInsightInput) ui.archiveInsightInput.value = archive.insights || '';
      if (ui.archiveMetaText) {
        const today = new Date().toLocaleDateString('zh-CN');
        ui.archiveMetaText.textContent = `第${archive.count}次 · ${today}`;
      }
      if (ui.archiveTagList) {
        ui.archiveTagList.querySelectorAll('.tag-chip').forEach((el) => {
          el.classList.toggle('active', archive.tags?.includes(el.textContent?.trim() || ''));
        });
      }
      ui.archivePreviewPanel?.classList.add('active');
      ui.memoryPickerPanel?.classList.remove('active');
    }

    if (mode === 'memory') {
      if (ui.rightPanelTitle) ui.rightPanelTitle.textContent = '选择注入记忆';
      ui.archivePreviewPanel?.classList.remove('active');
      ui.memoryPickerPanel?.classList.add('active');
      loadMemoryPickerOptions().catch((err) => {
        if (ui.memoryPickerList) {
          ui.memoryPickerList.innerHTML = `<div class="folder-topic-empty">${escapeHtml(err.message || '加载记忆失败')}</div>`;
        }
        updateMemoryPickedCount();
      });
    }

    ui.rightSidePanel.classList.add('open');
    ui.rightSidePanel.setAttribute('aria-hidden', 'false');
  }

  function updateMemoryPickedCount() {
    if (!ui.memoryPickedCount || !ui.memoryPickerList) return;
    const checked = Array.from(ui.memoryPickerList.querySelectorAll('input[type="checkbox"]')).filter((x) => x.checked);
    ui.memoryPickedCount.textContent = `已选${checked.length}条`;
  }

  function renderMemoryArchivePanel() {
    const archives = Object.entries(state.archivesByConversationId)
      .map(([conversationId, item]) => ({ conversationId, ...item }))
      .sort((a, b) => (b.count || 0) - (a.count || 0));

    if (!archives.length) {
      if (document.getElementById('keyPointsList')) {
        document.getElementById('keyPointsList').innerHTML = '<div style="text-align:center;padding:2rem;color:var(--text-secondary);">暂无归档记录</div>';
      }
      if (document.getElementById('contextMemoryList')) {
        document.getElementById('contextMemoryList').innerHTML = '<div style="text-align:center;padding:2rem;color:var(--text-secondary);">暂无可注入记忆</div>';
      }
      return;
    }

    const keyPointsList = document.getElementById('keyPointsList');
    const contextMemoryList = document.getElementById('contextMemoryList');
    if (keyPointsList) {
      keyPointsList.innerHTML = archives.slice(0, 3).map((item) => `
        <div class="key-point-item">
          <div class="key-point-icon">🗂️</div>
          <div class="key-point-content">${escapeHtml(item.insights || item.summary || '已归档')}</div>
        </div>
      `).join('');
    }
    if (contextMemoryList) {
      contextMemoryList.innerHTML = archives.map((item) => `
        <div class="context-memory-item archive-memory-select-item">
          <div class="context-memory-icon">🧠</div>
          <div class="context-memory-content">
            <div class="context-memory-title">${escapeHtml(item.title || '未命名话题')} · 第${item.count || 1}次归档</div>
            <div class="context-memory-text">${escapeHtml(item.summary || '暂无摘要')}</div>
          </div>
        </div>
      `).join('');
    }
  }

  function wireComposerToolbar() {
    ui.uploadToolBtn?.addEventListener('click', () => ui.chatUploadInput?.click());
    ui.chatUploadInput?.addEventListener('change', () => {
      const file = ui.chatUploadInput?.files?.[0];
      if (file) showLightToast(`已选择文件：${file.name}`, 'info');
    });
    ui.recordToolBtn?.addEventListener('click', () => showLightToast('录音功能已预留，待接入语音服务', 'info'));
    ui.composerMoreBtn?.addEventListener('click', () => showLightToast('更多操作入口已预留', 'info'));
    ui.injectMemoryBtn?.addEventListener('click', () => openRightPanel('memory'));
    ui.archiveConversationBtn?.addEventListener('click', () => {
      if (!state.selectedConversationId) {
        alert('请先选择一个话题。');
        return;
      }
      openRightPanel('archive');
    });
    ui.rightPanelCloseBtn?.addEventListener('click', closeRightPanel);
    ui.archiveCancelBtn?.addEventListener('click', closeRightPanel);
    ui.memoryPickerList?.addEventListener('change', updateMemoryPickedCount);
    ui.memoryInjectConfirmBtn?.addEventListener('click', () => {
      const ids = Array.from(ui.memoryPickerList?.querySelectorAll('input[type="checkbox"]') || [])
        .filter((el) => el.checked)
        .map((el) => el.value);
      state.injectedMemoryIds = new Set(ids);
      showLightToast(`已注入 ${ids.length} 条记忆到本次对话`, 'success');
      closeRightPanel();
    });
    ui.archiveTagList?.addEventListener('click', (e) => {
      const target = e.target;
      if (!(target instanceof HTMLElement)) return;
      const chip = target.closest('.tag-chip');
      if (!(chip instanceof HTMLElement)) return;
      chip.classList.toggle('active');
    });
    ui.archiveConfirmBtn?.addEventListener('click', () => {
      if (!state.selectedConversationId) return;
      const existing = state.archivesByConversationId[state.selectedConversationId];
      const nextCount = (existing?.count || 0) + 1;
      const tags = Array.from(ui.archiveTagList?.querySelectorAll('.tag-chip.active') || []).map((x) => x.textContent?.trim()).filter(Boolean);
      state.archivesByConversationId[state.selectedConversationId] = {
        count: nextCount,
        title: ui.archiveTopicTitleInput?.value?.trim() || existing?.title || '未命名话题',
        summary: ui.archiveSummaryInput?.value?.trim() || '',
        insights: ui.archiveInsightInput?.value?.trim() || '',
        tags
      };
      state.archivedConversationIds.add(state.selectedConversationId);
      renderSingleBotTopicList();
      renderMemoryArchivePanel();
      showLightToast('已确认存入记忆', 'success');
      closeRightPanel();
    });
    ui.rightSidePanel?.addEventListener('click', (e) => {
      if (e.target === ui.rightSidePanel) closeRightPanel();
    });
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

    if (ui.trashToggleBtn) {
      ui.trashToggleBtn.addEventListener('click', () => {
        openTrashModal().catch((err) => alert(err.message || '打开回收站失败'));
      });
    }

    if (ui.trashCloseBtn) {
      ui.trashCloseBtn.addEventListener('click', closeTrashModal);
    }

    if (ui.trashRefreshBtn) {
      ui.trashRefreshBtn.addEventListener('click', () => {
        openTrashModal().catch((err) => alert(err.message || '刷新回收站失败'));
      });
    }

    if (ui.trashModal) {
      ui.trashModal.addEventListener('click', (e) => {
        if (e.target === ui.trashModal) {
          closeTrashModal();
        }
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

  function wireTopicFolderActions() {
    if (ui.topicCreateBtn) {
      ui.topicCreateBtn.addEventListener('click', openTopicCreateModal);
    }
    if (ui.folderChipAddBtn) {
      ui.folderChipAddBtn.addEventListener('click', () => {
        openThemeCreateModal();
      });
    }
    if (ui.themeCreateCloseBtn) {
      ui.themeCreateCloseBtn.addEventListener('click', closeThemeCreateModal);
    }
    if (ui.themeCreateCancelBtn) {
      ui.themeCreateCancelBtn.addEventListener('click', closeThemeCreateModal);
    }
    if (ui.themeCreateConfirmBtn) {
      ui.themeCreateConfirmBtn.addEventListener('click', () => {
        createThemeFromModal().catch((err) => alert(err.message || '创建主题失败'));
      });
    }
    if (ui.themeCreateNameInput) {
      ui.themeCreateNameInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          ui.themeCreatePromptInput?.focus();
        }
        if (e.key === 'Escape') closeThemeCreateModal();
      });
    }
    if (ui.themeCreatePromptInput) {
      ui.themeCreatePromptInput.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
          e.preventDefault();
          createThemeFromModal().catch((err) => alert(err.message || '创建主题失败'));
        }
        if (e.key === 'Escape') closeThemeCreateModal();
      });
    }
    if (ui.topicCloseBtn) {
      ui.topicCloseBtn.addEventListener('click', closeTopicCreateModal);
    }
    if (ui.topicCancelBtn) {
      ui.topicCancelBtn.addEventListener('click', closeTopicCreateModal);
    }
    if (ui.topicNameInput) {
      ui.topicNameInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          createConversationFromModal().catch((err) => alert(err.message || '创建话题失败'));
        }
        if (e.key === 'Escape') {
          closeTopicCreateModal();
        }
      });
    }
    if (ui.topicCreateConfirmBtn) {
      ui.topicCreateConfirmBtn.addEventListener('click', () => {
        createConversationFromModal().catch((err) => alert(err.message || '创建话题失败'));
      });
    }
    if (ui.topicModal) {
      ui.topicModal.addEventListener('click', (e) => {
        if (e.target === ui.topicModal) closeTopicCreateModal();
      });
    }
    if (ui.themeCreateModal) {
      ui.themeCreateModal.addEventListener('click', (e) => {
        if (e.target === ui.themeCreateModal) closeThemeCreateModal();
      });
    }
  }

  async function createConversationFromModal() {
    if (!ui.topicCreateConfirmBtn) return;
    const title = (ui.topicNameInput?.value || '').trim();
    const extraContext = (ui.topicExtraContextInput?.value || '').trim();
    ui.topicCreateConfirmBtn.disabled = true;
    ui.topicCreateConfirmBtn.textContent = '创建中...';
    try {
      await createConversation(state.selectedScene || 'work', {
        title,
        extra_context: extraContext,
        bot_id: state.selectedBotId || undefined
      });
      closeTopicCreateModal();
      showLightToast('话题已创建', 'success');
    } finally {
      ui.topicCreateConfirmBtn.disabled = false;
      ui.topicCreateConfirmBtn.textContent = '开始对话 →';
    }
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

    ensureTrashUI();
    await refreshFolderList();
    await refreshGroupsList();
    wireTabs();
    wireInput();
    wireLogout();
    wireTopicFolderActions();
    wireGroupCards();
    wireSettingsActions();
    wireTopActions();
    wireComposerToolbar();

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
    renderMemoryArchivePanel();

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
    alert(err.message || '初始化失败，请稍后重试');
  });
})();

