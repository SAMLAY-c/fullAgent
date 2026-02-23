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

  const tagCategoryConfig = [
    { id: 'all', label: '全部', emoji: '📚' },
    { id: 'general', label: '通用', emoji: '🧩' },
    { id: 'work', label: '工作', emoji: '💼' },
    { id: 'study', label: '学习', emoji: '📖' },
    { id: 'life', label: '生活', emoji: '🌿' }
  ];

  const state = {
    botsByScene: { work: [], life: [], love: [] },
    folders: [],
    selectedFolderId: null,
    selectedFolderChipId: 'all',
    selectedTagCategoryId: 'all',
    topicSearchKeyword: '',
    collapsedThemeIds: new Set(),
    selectedScene: 'work',
    selectedBotId: null,
    selectedConversationId: null,
    selectedGroupId: null,
    groups: [],
    isComposing: false,
    conversationsByScene: { work: [], life: [], love: [] },
    archivedConversationIds: new Set(),
    archivesByConversationId: {},
    injectedMemoryIds: new Set(),
    memoryExtractDraft: {
      messages: [],
      historyMemories: [],
      selectedMessageIds: new Set(),
      selectedMemoryIds: new Set(),
      focusNote: '',
      items: [],
      loadingContext: false,
      loadingPreview: false,
      saving: false,
      meta: null
    }
  };

  const ui = {
    messages: document.getElementById('messages'),
    chatAvatar: document.getElementById('chatAvatar'),
    chatName: document.getElementById('chatName'),
    chatStatus: document.getElementById('chatStatus'),
    input: document.getElementById('input'),
    sendBtn: document.getElementById('sendBtn'),
    logoutBtn: document.getElementById('logoutBtn'),
    chatHeader: document.querySelector('.chat-header'),
    chatActions: document.querySelector('.chat-header .chat-actions'),
    contentTabs: document.querySelector('.content-tabs'),
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
    extractMessageList: document.getElementById('extractMessageList'),
    extractMemoryList: document.getElementById('extractMemoryList'),
    extractFocusNote: document.getElementById('extractFocusNote'),
    extractResultSection: document.getElementById('extractResultSection'),
    extractResultList: document.getElementById('extractResultList'),
    extractAddResultBtn: document.getElementById('extractAddResultBtn'),
    extractPreviewBtn: document.getElementById('extractPreviewBtn'),
    extractCommitBtn: document.getElementById('extractCommitBtn'),
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

  // 注意: escapeHtml 函数已移至 utils.js，通过全局对象使用

  if (window.marked && typeof window.marked.parse === 'function') {
    window.marked.setOptions({ gfm: true, breaks: true });
  }

  function renderBotMarkdownHtml(text) {
    const source = String(text || '');
    if (window.marked && typeof window.marked.parse === 'function') {
      return `<div class="markdown-body">${window.marked.parse(source)}</div>`;
    }
    return escapeHtml(source).replace(/\n/g, '<br>');
  }

  function renderMarkdownInMessages(root = ui.messages) {
    if (!root) return;
    root.querySelectorAll('.message.bot .message-content:not([data-md-rendered])').forEach((el) => {
      if (!(el instanceof HTMLElement)) return;
      const source = el.textContent || '';
      el.innerHTML = renderBotMarkdownHtml(source);
      el.dataset.mdRendered = '1';
    });
  }

  function compactChatHeaderTools() {
    if (!ui.chatHeader || !ui.chatActions || !ui.contentTabs) return;
    if (!ui.chatActions.contains(ui.contentTabs)) {
      ui.chatActions.appendChild(ui.contentTabs);
    }

    if (ui.logBtn) {
      ui.logBtn.dataset.label = '会话归档';
      ui.logBtn.title = '会话归档';
      ui.logBtn.setAttribute('aria-label', '会话归档');
    }

    if (ui.quickSettingsBtn) {
      ui.quickSettingsBtn.style.display = 'none';
    }

    if (ui.sopBtn) {
      ui.sopBtn.dataset.label = '定时提醒';
      ui.sopBtn.title = '定时提醒';
      ui.sopBtn.setAttribute('aria-label', '定时提醒');
    }

    ui.contentTabBtns.forEach((btn) => {
      const tab = btn.dataset.tab || '';
      const labels = {
        chat: '聊天对话',
        memory: '长期记忆',
        knowledge: '知识管理',
        settings: '系统设置'
      };
      const title = labels[tab] || tab;
      btn.title = title;
      btn.setAttribute('aria-label', title);
      const labelEl = btn.querySelector('.content-tab-label');
      if (labelEl) labelEl.textContent = title;
    });
  }

  function sceneLabel(scene) {
    return ({ work: '工作', life: '生活', love: '情感' }[scene] || scene);
  }

  // 时间格式化函数（chat 专用，返回 HH:MM 格式）
  function formatTime(isoOrDate) {
    const date = isoOrDate instanceof Date ? isoOrDate : new Date(isoOrDate || Date.now());
    if (Number.isNaN(date.getTime())) {
      return '--:--';
    }
    return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
  }

  // 日期时间格式化函数（chat 专用）
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
    renderMarkdownInMessages(ui.messages);
  }

  function renderTopicListSkeleton(count = 5) {
    if (!ui.topicConversationList) return;
    const rows = Array.from({ length: count }, (_, idx) => {
      const width = [62, 54, 70, 58, 66][idx % 5];
      return `
        <div class="topic-skeleton-row" aria-hidden="true">
          <div class="topic-skeleton-main">
            <div class="topic-skeleton-dot skeleton-shimmer"></div>
            <div class="topic-skeleton-line title skeleton-shimmer" style="width:${width}%;"></div>
          </div>
          <div class="topic-skeleton-line meta skeleton-shimmer"></div>
        </div>
      `;
    }).join('');
    ui.topicConversationList.innerHTML = `<div class="topic-skeleton-list" aria-hidden="true">${rows}</div>`;
  }

  function renderMessagesSkeleton(count = 3) {
    if (!ui.messages) return;
    const cards = Array.from({ length: count }, (_, idx) => {
      const sets = [
        [92, 86, 68],
        [88, 82, 56],
        [90, 74, 62]
      ];
      const widths = sets[idx % sets.length];
      return `
        <div class="message bot" aria-hidden="true">
          <div class="message-avatar skeleton-shimmer"></div>
          <div class="message-wrapper">
            <div class="message-skeleton-card">
              <div class="message-skeleton-lines">
                <div class="message-skeleton-line skeleton-shimmer" style="width:${widths[0]}%;"></div>
                <div class="message-skeleton-line skeleton-shimmer" style="width:${widths[1]}%;"></div>
                <div class="message-skeleton-line skeleton-shimmer" style="width:${widths[2]}%;"></div>
              </div>
            </div>
          </div>
        </div>
      `;
    }).join('');
    ui.messages.innerHTML = cards;
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

  function isVirtualThemeFolder(folder) {
    if (!folder) return false;
    return folder.is_virtual === true || (!!folder.bot_id && folder.folder_id === folder.bot_id);
  }

  function isPseudoFolderIdForMemoryCommit(folderId, conversation, draftMeta) {
    if (!folderId) return false;
    if (conversation?.folder_id) return false;

    const selectedFolder = getSelectedFolder();
    if (selectedFolder && selectedFolder.folder_id === folderId && isVirtualThemeFolder(selectedFolder)) {
      return true;
    }

    const botId = conversation?.bot_id || draftMeta?.bot_id || state.selectedBotId || null;
    return !!botId && folderId === botId;
  }

  function getFolderChipLabel(folder) {
    const name = String(folder?.name || '未命名');
    return name.length > 7 ? `${name.slice(0, 7)}…` : name;
  }

  function normalizeThemeCategoryId(value) {
    const v = String(value || '').trim().toLowerCase();
    return tagCategoryConfig.some((x) => x.id === v) ? v : 'general';
  }

  function inferThemeCategoryId(folder) {
    if (!folder) return 'general';
    const explicit = normalizeThemeCategoryId(folder.category || folder.tag_category);
    if (explicit !== 'general' || folder.category || folder.tag_category) return explicit;

    const name = String(folder.name || '').toLowerCase();
    if (/学习|备考|笔记|问答|课程|读书/.test(name)) return 'study';
    if (/工作|写作|会议|分析|邮件|汇报|周报|产品/.test(name)) return 'work';
    if (/生活|旅行|饮食|健康|聊天|日常/.test(name)) return 'life';

    const scene = String(folder.scene || '').toLowerCase();
    if (scene === 'work') return 'work';
    if (scene === 'life') return 'life';
    if (scene === 'love') return 'life';
    return 'general';
  }

  function getThemesForSelectedCategory() {
    const categoryId = state.selectedTagCategoryId || 'all';
    if (categoryId === 'all') return state.folders.slice();
    return state.folders.filter((folder) => inferThemeCategoryId(folder) === categoryId);
  }

  function getConversationsForTheme(folderId) {
    return getAllConversationsFlat().filter((c) => conversationBucketKey(c) === folderId);
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
    const optionsHtml = tagCategoryConfig.map((category) => {
      const count = category.id === 'all'
        ? allConversations.length
        : allConversations.filter((c) => {
            const theme = state.folders.find((f) => f.folder_id === conversationBucketKey(c));
            return inferThemeCategoryId(theme) === category.id;
          }).length;
      const selected = (state.selectedTagCategoryId || 'all') === category.id ? ' selected' : '';
      return `
        <option value="${category.id}"${selected}>${escapeHtml(category.label)} (${count})</option>
      `;
    }).join('');

    const searchActive = state.topicSearchKeyword ? ' active' : '';
    ui.folderChipRow.innerHTML = `
      <div class="folder-chip-toolbar">
        <label class="folder-chip-select-wrap" for="folderCategorySelect">
          <select id="folderCategorySelect" class="folder-chip-select" aria-label="选择分类">
            ${optionsHtml}
          </select>
          <span class="folder-chip-select-arrow">∨</span>
        </label>
        <button class="folder-chip-search-btn${searchActive}" id="folderSearchBtn" type="button" title="${state.topicSearchKeyword ? `当前搜索：${escapeHtml(state.topicSearchKeyword)}` : '搜索会话'}">
          搜索 🔍
        </button>
        <button class="folder-chip-icon-btn" id="folderChipAddBtn" type="button" title="新增主题">+</button>
      </div>
    `;

    const categorySelect = ui.folderChipRow.querySelector('#folderCategorySelect');
    if (categorySelect) {
      categorySelect.addEventListener('change', () => {
        const chipId = categorySelect.value || 'all';
        state.selectedFolderChipId = chipId;
        state.selectedTagCategoryId = chipId;
        state.selectedFolderId = null;
        state.selectedConversationId = null;
        renderFolderList();
        renderSingleBotTopicList();
        refreshCurrentHeader().catch(() => {});
      });
    }

    const addBtn = ui.folderChipRow.querySelector('#folderChipAddBtn');
    if (addBtn) {
      addBtn.addEventListener('click', () => openThemeCreateModal());
    }

    const searchBtn = ui.folderChipRow.querySelector('#folderSearchBtn');
    if (searchBtn) {
      searchBtn.addEventListener('click', () => {
        const input = window.prompt('搜索会话标题（留空可清除搜索）', state.topicSearchKeyword || '');
        if (input === null) return;
        state.topicSearchKeyword = String(input || '').trim();
        state.selectedConversationId = null;
        renderFolderList();
        renderSingleBotTopicList();
      });
    }

    updateTopicListTitle();
  }

  function updateTopicListTitle() {
    if (!ui.topicListTitle) return;
    const category = tagCategoryConfig.find((x) => x.id === (state.selectedTagCategoryId || 'all'));
    const keywordSuffix = state.topicSearchKeyword ? ` · 搜索: ${state.topicSearchKeyword}` : '';
    ui.topicListTitle.textContent = `${category?.label || '全部'} · 主题与会话${keywordSuffix}`;
  }

  async function refreshFolderList() {
    const allThemeBots = ['work', 'life', 'love']
      .flatMap((scene) => (state.botsByScene[scene] || []).map((bot) => ({
        folder_id: bot.bot_id,
        bot_id: bot.bot_id,
        is_virtual: true,
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

    const themes = getThemesForSelectedCategory()
      .map((theme) => ({
        ...theme,
        __conversations: getConversationsForTheme(theme.folder_id).sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at))
      }))
      .map((theme) => {
        const keyword = String(state.topicSearchKeyword || '').trim().toLowerCase();
        if (!keyword) return theme;
        return {
          ...theme,
          __conversations: theme.__conversations.filter((c) =>
            String(c.title || '').toLowerCase().includes(keyword)
          )
        };
      })
      .filter((theme) => theme.__conversations.length > 0 || !String(state.topicSearchKeyword || '').trim())
      .sort((a, b) => {
        const aCount = a.__conversations.length;
        const bCount = b.__conversations.length;
        if (bCount !== aCount) return bCount - aCount;
        return String(a.name || '').localeCompare(String(b.name || ''), 'zh-CN');
      });

    if (!themes.length) {
      ui.topicConversationList.innerHTML = '<div class="folder-topic-empty">当前分类下暂无主题，点击底部“新建话题”开始。</div>';
      return;
    }

    ui.topicConversationList.innerHTML = themes.map((theme) => {
      const themeId = theme.folder_id;
      const themeName = escapeHtml(theme.name || '未命名主题');
      const themeCategoryId = inferThemeCategoryId(theme);
      const themeCategory = tagCategoryConfig.find((x) => x.id === themeCategoryId);
      const themeIcon = escapeHtml(themeCategory?.emoji || '🧩');
      const convCount = theme.__conversations.length;
      const isCollapsed = state.collapsedThemeIds.has(themeId);

      const conversationHtml = convCount
        ? theme.__conversations.map((c) => {
            const active = c.conversation_id === state.selectedConversationId ? ' active' : '';
            const title = escapeHtml(c.title || '未命名话题');
            const timeText = formatRelativeTopicTime(c.updated_at);
            const archived = state.archivedConversationIds.has(c.conversation_id);
            return `
              <div class="topic-row topic-row-nested${active}" data-theme-id="${escapeAttr(themeId)}" data-scene="${escapeHtml(c.__scene || '')}" data-conversation-id="${c.conversation_id}" data-bot-id="${c.bot_id}">
                <div class="topic-row-tree-line" aria-hidden="true"></div>
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
                  title="删除会话"
                >✕</button>
              </div>
            `;
          }).join('')
        : '<div class="theme-empty-row">该主题下暂无会话</div>';

      return `
        <section class="topic-theme-group ${themeId === state.selectedFolderId ? 'active' : ''}${isCollapsed ? ' collapsed' : ''}" data-theme-id="${escapeAttr(themeId)}" data-bot-id="${escapeAttr(theme.bot_id || themeId)}" data-scene="${escapeAttr(theme.scene || '')}">
          <button type="button" class="topic-theme-header">
            <div class="topic-theme-header-main">
              <span class="topic-theme-icon">${themeIcon}</span>
              <span class="topic-theme-name">${themeName}</span>
            </div>
            <div class="topic-theme-header-right">
              <span class="topic-theme-count">${convCount}</span>
              <span class="topic-theme-arrow" aria-hidden="true">⌄</span>
            </div>
          </button>
          <div class="topic-theme-conversation-list">
            ${conversationHtml}
          </div>
        </section>
      `;
    }).join('');

    Array.from(ui.topicConversationList.querySelectorAll('.topic-theme-header')).forEach((header) => {
      header.addEventListener('click', async () => {
        const group = header.closest('.topic-theme-group');
        if (!(group instanceof HTMLElement)) return;
        const themeId = group.dataset.themeId || '';
        const botId = group.dataset.botId || themeId;
        const scene = group.dataset.scene || state.selectedScene;
        const isCollapsed = state.collapsedThemeIds.has(themeId);
        if (isCollapsed) {
          state.collapsedThemeIds.delete(themeId);
        } else {
          state.collapsedThemeIds.add(themeId);
        }
        state.selectedFolderId = themeId;
        state.selectedFolderChipId = state.selectedTagCategoryId || 'all';
        state.selectedBotId = botId;
        state.selectedScene = scene;
        const firstConversation = Array.from(group.querySelectorAll('.topic-row')).find((el) => el instanceof HTMLElement);
        if (isCollapsed && firstConversation instanceof HTMLElement && !state.selectedConversationId) {
          state.selectedConversationId = firstConversation.dataset.conversationId || null;
          if (state.selectedConversationId) {
            await refreshCurrentHeader();
            await loadMessages(state.selectedConversationId);
          }
        } else {
          await refreshCurrentHeader();
        }
        renderSingleBotTopicList();
      });
    });

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
        state.selectedFolderId = item.dataset.themeId || state.selectedFolderId;
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
    renderMessagesSkeleton(3);
    const res = await authManager.get(`/chat/conversations/${conversationId}/messages`);
    const messages = res.messages || [];

    ui.messages.innerHTML = messages
      .map((m) => {
        const klass = m.sender_type === 'user' ? 'user' : 'bot';
        const avatar = m.sender_type === 'user' ? '\uD83D\uDC64' : (ui.chatAvatar.textContent || '\uD83E\uDD16');
        const editCount = Math.max(0, Number(m.version || 1) - 1);
        const versionBadge = editCount > 0 ? `
          <span class="message-version-badge" title="消息版本 v${escapeAttr(String(m.version || 1))}">
            已编辑第 ${editCount} 次
          </span>
        ` : '';
        const editBtn = m.sender_type === 'user' && m.message_id ? `
          <div class="message-actions">
            <button
              class="edit-btn"
              data-message-id="${escapeAttr(m.message_id)}"
              data-message-content="${escapeAttr(m.content || '')}"
              onclick="editUserMessage(this)"
            >
              <span class="edit-icon">✏️</span>
              <span class="edit-text">编辑</span>
            </button>
          </div>
        ` : '';
        const copyBtn = m.sender_type === 'bot' ? `
          <div class="message-actions">
            <button class="copy-btn" data-copy-content="${escapeAttr(m.content)}" onclick="copyMessageContent(this)">
              <span class="copy-icon">📋</span>
              <span class="copy-text">复制</span>
            </button>
          </div>
        ` : '';

        return `
          <div class="message ${klass}" ${m.message_id ? `data-message-id="${escapeAttr(m.message_id)}"` : ''}>
            <div class="message-avatar">${avatar}</div>
            <div class="message-wrapper">
              <div class="message-content">${escapeHtml(m.content)}</div>
              <div class="message-meta">
                <div class="message-time">${formatTime(m.timestamp)}</div>
                ${versionBadge}
              </div>
              ${editBtn}
              ${copyBtn}
            </div>
          </div>
        `;
      })
      .join('');

    renderMarkdownInMessages(ui.messages);
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
    const selectedFolder = getSelectedFolder();
    const realFolderId =
      selectedFolder && !isVirtualThemeFolder(selectedFolder) ? selectedFolder.folder_id : null;

    const conversation = await authManager.post('/chat/conversations', {
      bot_id: bot.bot_id,
      title,
      ...(realFolderId ? { folder_id: realFolderId } : {}),
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

  function appendMessage(senderType, content, opts = {}) {
    const klass = senderType === 'user' ? 'user' : 'bot';
    const avatar = senderType === 'user' ? '\uD83D\uDC64' : (ui.chatAvatar.textContent || '\uD83E\uDD16');
    const messageDomId = opts.id || `local_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const serverMessageId = typeof opts.messageId === 'string' ? opts.messageId : '';
    const isStreaming = !!opts.isStreaming;
    const initialContent = isStreaming
      ? `${escapeHtml(content || '思考中...')}<span class="streaming-cursor"></span>`
      : escapeHtml(content);
    const editBtn = klass === 'user' && serverMessageId ? `
      <div class="message-actions">
        <button
          class="edit-btn"
          data-message-id="${escapeAttr(serverMessageId)}"
          data-message-content="${escapeAttr(content || '')}"
          onclick="editUserMessage(this)"
        >
          <span class="edit-icon">✏️</span>
          <span class="edit-text">编辑</span>
        </button>
      </div>
    ` : '';
    const copyBtn = klass === 'bot' && !isStreaming ? `
      <div class="message-actions">
        <button class="copy-btn" data-copy-content="${escapeAttr(content || '')}" onclick="copyMessageContent(this)">
          <span class="copy-icon">📋</span>
          <span class="copy-text">复制</span>
        </button>
      </div>
    ` : '';

    ui.messages.insertAdjacentHTML(
      'beforeend',
      `
      <div class="message ${klass}" data-local-message-id="${escapeAttr(messageDomId)}" ${serverMessageId ? `data-message-id="${escapeAttr(serverMessageId)}"` : ''}>
        <div class="message-avatar">${avatar}</div>
        <div class="message-wrapper">
          <div class="message-content">${initialContent}</div>
          <div class="message-meta">
            <div class="message-time">${formatTime(new Date())}</div>
          </div>
          ${editBtn}
          ${copyBtn}
        </div>
      </div>
      `
    );

    if (klass === 'bot' && !isStreaming) {
      renderMarkdownInMessages(ui.messages);
    }
    ui.messages.scrollTop = ui.messages.scrollHeight;
    return messageDomId;
  }

  function findLocalMessageElement(messageDomId) {
    return ui.messages?.querySelector(`[data-local-message-id="${CSS.escape(String(messageDomId))}"]`) || null;
  }

  function updateStreamingMessageText(messageDomId, text) {
    const msgEl = findLocalMessageElement(messageDomId);
    if (!(msgEl instanceof HTMLElement)) return;
    const contentEl = msgEl.querySelector('.message-content');
    if (!(contentEl instanceof HTMLElement)) return;
    contentEl.innerHTML = `${escapeHtml(text)}<span class="streaming-cursor"></span>`;
    ui.messages.scrollTop = ui.messages.scrollHeight;
  }

  function updateStreamingMessageStatus(messageDomId, status) {
    const msgEl = findLocalMessageElement(messageDomId);
    if (!(msgEl instanceof HTMLElement)) return;
    const contentEl = msgEl.querySelector('.message-content');
    if (!(contentEl instanceof HTMLElement)) return;
    contentEl.innerHTML = `<span class="status-text">${escapeHtml(status)}</span><span class="streaming-cursor"></span>`;
    ui.messages.scrollTop = ui.messages.scrollHeight;
  }

  function finalizeStreamingMessage(messageDomId, finalText) {
    const msgEl = findLocalMessageElement(messageDomId);
    if (!(msgEl instanceof HTMLElement)) return;
    const contentEl = msgEl.querySelector('.message-content');
    if (!(contentEl instanceof HTMLElement)) return;
    contentEl.innerHTML = renderBotMarkdownHtml(finalText || '');
    contentEl.dataset.mdRendered = '1';
    
    // Add copy button for bot messages
    const wrapperEl = msgEl.querySelector('.message-wrapper');
    if (wrapperEl && !msgEl.classList.contains('user')) {
      const existingActions = wrapperEl.querySelector('.message-actions');
      if (!existingActions) {
        wrapperEl.insertAdjacentHTML('beforeend', `
          <div class="message-actions">
            <button class="copy-btn" data-copy-content="${escapeAttr(finalText || '')}" onclick="copyMessageContent(this)">
              <span class="copy-icon">📋</span>
              <span class="copy-text">复制</span>
            </button>
          </div>
        `);
      }
    }
    
    ui.messages.scrollTop = ui.messages.scrollHeight;
  }

  function removeLocalMessage(messageDomId) {
    const msgEl = findLocalMessageElement(messageDomId);
    if (msgEl && msgEl.parentNode) {
      msgEl.parentNode.removeChild(msgEl);
    }
  }

  function getAuthFetchHeaders() {
    const headers = { 'Content-Type': 'application/json' };
    if (authManager?.accessToken) {
      headers.Authorization = `Bearer ${authManager.accessToken}`;
    }
    return headers;
  }

  function getApiBaseURL() {
    return authManager?.baseURL || '/api';
  }

  function parseSseEventBlocks(buffer) {
    const blocks = buffer.split('\n\n');
    return {
      blocks: blocks.slice(0, -1),
      rest: blocks[blocks.length - 1] || ''
    };
  }

  function parseSseEventBlock(block) {
    const lines = block.split(/\r?\n/);
    let event = 'message';
    const dataLines = [];
    for (const rawLine of lines) {
      const line = rawLine.trimEnd();
      if (line.startsWith('event:')) {
        event = line.slice(6).trim();
      } else if (line.startsWith('data:')) {
        dataLines.push(line.slice(5).trim());
      }
    }
    const dataText = dataLines.join('\n').trim();
    return { event, dataText };
  }

  async function sendMessageStream(conversationId, content, memoryIds, botMessageDomId) {
    const response = await fetch(`${getApiBaseURL()}/chat/conversations/${encodeURIComponent(conversationId)}/messages/stream`, {
      method: 'POST',
      headers: getAuthFetchHeaders(),
      body: JSON.stringify({ content, memory_ids: memoryIds })
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      throw new Error(errorText || `HTTP ${response.status}`);
    }
    if (!response.body) {
      throw new Error('No response body');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let fullText = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      const { blocks, rest } = parseSseEventBlocks(buffer);
      buffer = rest;

      for (const block of blocks) {
        const { event, dataText } = parseSseEventBlock(block);
        if (!dataText) continue;

        let data;
        try {
          data = JSON.parse(dataText);
        } catch {
          continue;
        }

        if (event === 'start') {
          continue;
        }
        if (event === 'delta') {
          const chunk = typeof data?.text === 'string' ? data.text : '';
          if (!chunk) continue;
          fullText += chunk;
          updateStreamingMessageText(botMessageDomId, fullText);
          continue;
        }
        if (event === 'tool_start') {
          updateStreamingMessageStatus(botMessageDomId, `正在使用工具：${data?.tool || '处理中'}...`);
          continue;
        }
        if (event === 'tool_done') {
          updateStreamingMessageStatus(botMessageDomId, '继续生成中...');
          continue;
        }
        if (event === 'done') {
          const finalText = typeof data?.full_text === 'string' ? data.full_text : fullText;
          finalizeStreamingMessage(botMessageDomId, finalText);
          return finalText;
        }
        if (event === 'error') {
          throw new Error(data?.error || 'Stream error');
        }
      }
    }

    finalizeStreamingMessage(botMessageDomId, fullText);
    return fullText;
  }

  async function sendMessageNormal(conversationId, content, memoryIds) {
    const result = await authManager.post(
      `/chat/conversations/${conversationId}/messages`,
      { content, memory_ids: memoryIds }
    );
    if (result?.bot_message?.content) {
      appendMessage('bot', result.bot_message.content);
    }
    return result;
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

    const memoryIds = Array.from(state.injectedMemoryIds || []);
    const botPlaceholderId = appendMessage('bot', '思考中...', { isStreaming: true });

    try {
      await sendMessageStream(state.selectedConversationId, content, memoryIds, botPlaceholderId);

      if (memoryIds.length > 0) {
        showLightToast(`本次消息已携带 ${memoryIds.length} 条记忆`, 'info');
      }

      await refreshAllConversationLists();
    } catch (err) {
      console.warn('Stream send failed, fallback to normal API:', err);
      removeLocalMessage(botPlaceholderId);
      try {
        await sendMessageNormal(state.selectedConversationId, content, memoryIds);
        if (memoryIds.length > 0) {
          showLightToast(`本次消息已携带 ${memoryIds.length} 条记忆`, 'info');
        }
        await refreshAllConversationLists();
      } catch (fallbackErr) {
        appendMessage('bot', '发送失败，请检查后端服务和模型配置后重试。');
        throw fallbackErr;
      }
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
      renderMarkdownInMessages(ui.messages);
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

  function resetMemoryExtractDraft() {
    state.memoryExtractDraft = {
      messages: [],
      historyMemories: [],
      selectedMessageIds: new Set(),
      selectedMemoryIds: new Set(),
      focusNote: '',
      items: [],
      loadingContext: false,
      loadingPreview: false,
      saving: false,
      meta: null
    };
  }

  function setExtractFocusNoteFromInput() {
    if (!ui.extractFocusNote) return;
    state.memoryExtractDraft.focusNote = ui.extractFocusNote.value || '';
  }

  function toggleMessageSelect(id, checked) {
    const selected = state.memoryExtractDraft.selectedMessageIds;
    if (checked) selected.add(String(id));
    else selected.delete(String(id));
    renderExtractPanel();
  }

  function toggleMemorySelect(id, checked) {
    const selected = state.memoryExtractDraft.selectedMemoryIds;
    if (checked) selected.add(String(id));
    else selected.delete(String(id));
    renderExtractPanel();
  }

  function updateResultItem(index, field, value) {
    const item = state.memoryExtractDraft.items[index];
    if (!item) return;
    if (field === 'category') item.category = String(value || '').trim().slice(0, 50);
    if (field === 'text') item.text = String(value || '').trim().slice(0, 500);
  }

  function toggleResultItem(index, checked) {
    const item = state.memoryExtractDraft.items[index];
    if (!item) return;
    item._selected = !!checked;
    renderExtractPanel();
  }

  function removeResultItem(index) {
    state.memoryExtractDraft.items.splice(index, 1);
    renderExtractPanel();
  }

  function addResultItem() {
    state.memoryExtractDraft.items.push({
      category: 'other',
      text: '',
      _selected: true,
      _time: new Date().toLocaleString('zh-CN')
    });
    renderExtractPanel();
  }

  function normalizePreviewItemsClient(items) {
    if (!Array.isArray(items)) return [];
    return items
      .map((item) => ({
        category: String(item?.category || 'other').trim() || 'other',
        text: String(item?.text || '').trim()
      }))
      .filter((item) => item.text)
      .filter((item) => !/^[\[\]\{\}",:]+$/.test(item.text))
      .map((item) => ({
        ...item,
        _selected: true,
        _time: new Date().toLocaleString('zh-CN')
      }));
  }

  function renderExtractPanel() {
    const draft = state.memoryExtractDraft;
    if (ui.extractFocusNote && ui.extractFocusNote.value !== (draft.focusNote || '')) {
      ui.extractFocusNote.value = draft.focusNote || '';
    }

    if (ui.extractMessageList) {
      if (draft.loadingContext) {
        ui.extractMessageList.innerHTML = '<div class="folder-topic-empty">正在加载消息...</div>';
      } else if (!draft.messages.length) {
        ui.extractMessageList.innerHTML = '<div class="folder-topic-empty">暂无可选消息</div>';
      } else {
        ui.extractMessageList.innerHTML = draft.messages.map((m) => {
          const id = String(m.id);
          const checked = draft.selectedMessageIds.has(id);
          const roleText = m.role === 'user' ? '用户' : 'AI';
          const content = String(m.content || '').trim();
          const preview = content.length > 80 ? `${content.slice(0, 80)}...` : content;
          return `
            <label class="extract-item ${checked ? 'selected' : ''}">
              <input class="extract-message-checkbox" type="checkbox" data-message-id="${escapeAttr(id)}" ${checked ? 'checked' : ''} />
              <span class="item-role">${escapeHtml(roleText)}</span>
              <span class="item-content">${escapeHtml(preview || '（空消息）')}</span>
            </label>
          `;
        }).join('');
      }
    }

    if (ui.extractMemoryList) {
      if (draft.loadingContext) {
        ui.extractMemoryList.innerHTML = '<div class="folder-topic-empty">正在加载归档记忆...</div>';
      } else if (!draft.historyMemories.length) {
        ui.extractMemoryList.innerHTML = '<div class="folder-topic-empty">暂无可选归档记忆</div>';
      } else {
        ui.extractMemoryList.innerHTML = draft.historyMemories.map((m) => {
          const id = String(m.id);
          const checked = draft.selectedMemoryIds.has(id);
          const title = m.title || '未命名记忆';
          const summary = m.summary || m.insight || '暂无摘要';
          return `
            <label class="extract-item ${checked ? 'selected' : ''}">
              <input class="extract-memory-checkbox" type="checkbox" data-memory-id="${escapeAttr(id)}" ${checked ? 'checked' : ''} />
              <span class="item-title">${escapeHtml(title)}</span>
              <span class="item-summary">${escapeHtml(summary)}</span>
            </label>
          `;
        }).join('');
      }
    }

    if (ui.extractResultSection && ui.extractResultList && ui.extractCommitBtn) {
      const hasResults = Array.isArray(draft.items) && draft.items.length > 0;
      const selectedResultCount = (draft.items || []).filter((item) => item && item._selected !== false).length;
      ui.extractResultSection.style.display = hasResults ? 'block' : 'none';
      ui.extractCommitBtn.style.display = hasResults ? 'inline-block' : 'none';

      if (hasResults) {
        ui.extractResultList.innerHTML = draft.items.map((item, i) => `
          <div class="result-item">
            <input
              class="result-item-checkbox"
              type="checkbox"
              data-result-index="${i}"
              ${item._selected === false ? '' : 'checked'}
              aria-label="选择是否保存该条目"
            />
            <div class="result-item-main">
              <span class="result-item-index">${i + 1}.</span>
              <div
                class="result-text-inline"
                contenteditable="true"
                data-result-index="${i}"
                role="textbox"
                aria-label="编辑提炼条目"
              >${escapeHtml(item.text || '')}</div>
              <span class="result-category-pill">${escapeHtml(item.category || 'other')}</span>
            </div>
          </div>
        `).join('');
      } else {
        ui.extractResultList.innerHTML = '';
      }
    }

    if (ui.extractPreviewBtn) {
      ui.extractPreviewBtn.disabled = !!draft.loadingContext || !!draft.loadingPreview || !!draft.saving;
      ui.extractPreviewBtn.textContent = draft.loadingPreview ? '提炼中...' : '预览提炼';
    }
    if (ui.extractCommitBtn) {
      const selectedResultCount = (draft.items || []).filter((item) => item && item._selected !== false).length;
      ui.extractCommitBtn.disabled = !!draft.loadingPreview || !!draft.saving || selectedResultCount === 0;
      if (draft.saving) ui.extractCommitBtn.textContent = '保存中...';
      else ui.extractCommitBtn.textContent = selectedResultCount > 0 ? `保存记忆（${selectedResultCount}）` : '保存记忆';
    }
  }

  async function openMemoryExtractPanel(conversationId) {
    if (!conversationId) throw new Error('conversation_id is required');

    if (ui.rightPanelTitle) ui.rightPanelTitle.textContent = '记忆提炼';
    ui.archivePreviewPanel?.classList.add('active');
    ui.memoryPickerPanel?.classList.remove('active');
    ui.rightSidePanel?.classList.add('open');
    ui.rightSidePanel?.setAttribute('aria-hidden', 'false');

    resetMemoryExtractDraft();
    const draft = state.memoryExtractDraft;
    draft.loadingContext = true;
    renderExtractPanel();

    const res = await authManager.get(`/memories/extract/context?conversation_id=${encodeURIComponent(conversationId)}`);
    const messages = Array.isArray(res?.messages) ? res.messages : [];
    const archiveMemories = Array.isArray(res?.archive_memories) ? res.archive_memories : [];

    draft.messages = messages;
    draft.historyMemories = archiveMemories;
    draft.selectedMessageIds = new Set(messages.map((m) => String(m.id)));
    draft.selectedMemoryIds = new Set();
    draft.items = [];
    draft.focusNote = '';
    draft.meta = res?.meta || null;
    draft.loadingContext = false;

    renderExtractPanel();
  }

  async function previewMemoryExtract() {
    const draft = state.memoryExtractDraft;
    if (draft.loadingPreview || draft.saving) return;
    setExtractFocusNoteFromInput();

    if (draft.selectedMessageIds.size === 0) {
      alert('请至少选择一条消息');
      return;
    }
    if (!state.selectedConversationId) {
      alert('请先选择一个话题。');
      return;
    }

    draft.loadingPreview = true;
    renderExtractPanel();

    try {
      const data = await authManager.post('/memories/extract/preview', {
        conversation_id: state.selectedConversationId,
        selected_message_ids: Array.from(draft.selectedMessageIds),
        selected_archive_memory_ids: Array.from(draft.selectedMemoryIds),
        focus_note: draft.focusNote
      });
      draft.items = normalizePreviewItemsClient(data?.items);
      renderExtractPanel();
    } catch (err) {
      alert(err.message || '提炼预览失败');
    } finally {
      draft.loadingPreview = false;
      renderExtractPanel();
    }
  }

  async function commitMemoryExtract() {
    const draft = state.memoryExtractDraft;
    if (draft.saving) return;
    setExtractFocusNoteFromInput();

    if (!state.selectedConversationId) {
      alert('请先选择一个话题。');
      return;
    }
    if (!draft.items.length) {
      alert('请先生成提炼结果');
      return;
    }
    const selectedItems = draft.items
      .filter((item) => item && item._selected !== false)
      .map((item) => ({ category: item.category, text: item.text }));
    if (selectedItems.length === 0) {
      alert('请至少勾选一条要保存的提炼结果');
      return;
    }

    const conversation = getCurrentConversation();
    const fallbackFolderId = conversation?.folder_id || state.selectedFolderId || draft.meta?.folder_id || null;
    if (!fallbackFolderId && !(conversation?.bot_id || draft.meta?.bot_id)) {
      alert('请先选择一个主题后再保存记忆');
      return;
    }

    const isPseudoFolderId = isPseudoFolderIdForMemoryCommit(fallbackFolderId, conversation, draft.meta);
    const commitFolderId = isPseudoFolderId ? null : fallbackFolderId;
    if (isPseudoFolderId) {
      showLightToast('当前话题未绑定真实主题，将自动创建默认主题后保存记忆', 'info');
    }

    draft.saving = true;
    renderExtractPanel();

    try {
      const commitRes = await authManager.post('/memories/extract/commit', {
        conversation_id: state.selectedConversationId,
        ...(commitFolderId ? { folder_id: commitFolderId } : {}),
        items: selectedItems,
        focus_note: draft.focusNote,
        selected_message_ids: Array.from(draft.selectedMessageIds),
        selected_archive_memory_ids: Array.from(draft.selectedMemoryIds)
      });

      const resolvedFolderId = commitRes?.folder_id || conversation?.folder_id || commitFolderId || fallbackFolderId || null;

      state.archivedConversationIds.add(state.selectedConversationId);
      const existing = state.archivesByConversationId[state.selectedConversationId];
      state.archivesByConversationId[state.selectedConversationId] = {
        count: (existing?.count || 0) + 1,
        title: conversation?.title || existing?.title || '未命名话题',
        summary: draft.items[0]?.text || existing?.summary || '',
        insights: draft.items.map((x) => x.text).slice(0, 2).join('；')
      };
      patchConversationInState(state.selectedConversationId, {
        archived_count: (conversation?.archived_count || 0) + 1,
        folder_id: resolvedFolderId
      });
      renderSingleBotTopicList();
      renderMemoryArchivePanel();
      showLightToast(`已保存 ${selectedItems.length} 条记忆`, 'success');
      closeRightPanel();
    } catch (err) {
      alert(err.message || '保存记忆失败');
    } finally {
      draft.saving = false;
      renderExtractPanel();
    }
  }

  function openRightPanel(mode) {
    if (!ui.rightSidePanel) return;
    if (mode === 'archive') {
      if (ui.rightPanelTitle) ui.rightPanelTitle.textContent = '记忆提炼';
      ui.archivePreviewPanel?.classList.add('active');
      ui.memoryPickerPanel?.classList.remove('active');
      renderExtractPanel();
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
      // 对关键要点进行去重，避免显示重复的洞察内容
      const uniqueKeyPoints = [];
      const seenInsights = new Set();
      for (const item of archives) {
        const insightText = item.insights || item.summary || '已归档';
        // 使用内容作为去重键
        const dedupeKey = insightText.trim().slice(0, 100); // 取前100字符作为比较键
        if (!seenInsights.has(dedupeKey)) {
          seenInsights.add(dedupeKey);
          uniqueKeyPoints.push({ ...item, displayText: insightText });
          if (uniqueKeyPoints.length >= 3) break; // 最多显示3条
        }
      }
      keyPointsList.innerHTML = uniqueKeyPoints.map((item) => `
        <div class="key-point-item">
          <div class="key-point-icon">🗂️</div>
          <div class="key-point-content">${escapeHtml(item.displayText)}</div>
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
    ui.archiveConversationBtn?.addEventListener('click', async () => {
      if (!state.selectedConversationId) {
        alert('请先选择一个话题。');
        return;
      }
      try {
        await openMemoryExtractPanel(state.selectedConversationId);
      } catch (err) {
        alert(err.message || '加载提炼面板失败');
      }
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
    ui.extractFocusNote?.addEventListener('input', setExtractFocusNoteFromInput);
    ui.extractMessageList?.addEventListener('change', (e) => {
      const target = e.target;
      if (!(target instanceof HTMLInputElement)) return;
      if (!target.classList.contains('extract-message-checkbox')) return;
      toggleMessageSelect(target.dataset.messageId || '', target.checked);
    });
    ui.extractMemoryList?.addEventListener('change', (e) => {
      const target = e.target;
      if (!(target instanceof HTMLInputElement)) return;
      if (!target.classList.contains('extract-memory-checkbox')) return;
      toggleMemorySelect(target.dataset.memoryId || '', target.checked);
    });
    ui.extractResultList?.addEventListener('change', (e) => {
      const target = e.target;
      if (!(target instanceof HTMLElement)) return;
      const indexAttr = target.getAttribute('data-result-index');
      const index = Number(indexAttr);
      if (!Number.isInteger(index) || index < 0) return;

      if (target.classList.contains('result-item-checkbox') && target instanceof HTMLInputElement) {
        toggleResultItem(index, target.checked);
        return;
      }
      if (target.classList.contains('result-category-input') && target instanceof HTMLInputElement) {
        updateResultItem(index, 'category', target.value);
        return;
      }
      if (target.classList.contains('result-text-input') && target instanceof HTMLTextAreaElement) {
        updateResultItem(index, 'text', target.value);
      }
    });
    ui.extractResultList?.addEventListener('blur', (e) => {
      const target = e.target;
      if (!(target instanceof HTMLElement)) return;
      if (!target.classList.contains('result-text-inline')) return;
      const index = Number(target.getAttribute('data-result-index'));
      if (!Number.isInteger(index) || index < 0) return;
      updateResultItem(index, 'text', target.innerText.trim());
      renderExtractPanel();
    }, true);
    ui.extractAddResultBtn?.addEventListener('click', addResultItem);
    ui.extractPreviewBtn?.addEventListener('click', () => {
      previewMemoryExtract().catch((err) => alert(err.message || '提炼预览失败'));
    });
    ui.extractCommitBtn?.addEventListener('click', () => {
      commitMemoryExtract().catch((err) => alert(err.message || '保存记忆失败'));
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
        if (!state.selectedConversationId) {
          alert('请先选择一个话题。');
          return;
        }
        openMemoryExtractPanel(state.selectedConversationId).catch((err) => {
          alert(err.message || '加载提炼面板失败');
        });
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
      this.style.height = `${Math.min(this.scrollHeight, 96)}px`;
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

  window.copyMessageContent = async function copyMessageContent(btn) {
    const content = btn.dataset.copyContent || '';
    try {
      await navigator.clipboard.writeText(content);
      btn.classList.add('copied');
      const originalText = btn.querySelector('.copy-text').textContent;
      btn.querySelector('.copy-text').textContent = '已复制';
      btn.querySelector('.copy-icon').textContent = '✓';
      
      setTimeout(() => {
        btn.classList.remove('copied');
        btn.querySelector('.copy-text').textContent = originalText;
        btn.querySelector('.copy-icon').textContent = '📋';
      }, 2000);
    } catch (err) {
      console.error('复制失败:', err);
      showLightToast('复制失败，请手动复制', 'error');
    }
  };

  window.editUserMessage = async function editUserMessage(btn) {
    const messageId = btn?.dataset?.messageId || '';
    if (!messageId) {
      showLightToast('该消息尚未同步，刷新后再编辑', 'info');
      return;
    }

    const msgEl = btn.closest('.message.user');
    if (!(msgEl instanceof HTMLElement)) return;
    if (msgEl.classList.contains('is-inline-editing')) return;

    const activeEditor = ui.messages?.querySelector('.message.is-inline-editing');
    if (activeEditor instanceof HTMLElement && activeEditor !== msgEl) {
      const cancelBtn = activeEditor.querySelector('.inline-cancel-btn');
      if (cancelBtn instanceof HTMLButtonElement) {
        cancelBtn.click();
      }
    }

    const wrapperEl = msgEl.querySelector('.message-wrapper');
    const contentEl = msgEl.querySelector('.message-content');
    const actionsEl = msgEl.querySelector('.message-actions');
    if (!(wrapperEl instanceof HTMLElement) || !(contentEl instanceof HTMLElement)) {
      return;
    }

    const currentContent = (btn.dataset.messageContent || contentEl.textContent || '').trim();
    msgEl.classList.add('is-inline-editing');
    contentEl.style.display = 'none';
    if (actionsEl instanceof HTMLElement) actionsEl.style.display = 'none';

    const editorHost = document.createElement('div');
    editorHost.className = 'message-inline-editor';
    editorHost.innerHTML = `
      <textarea class="message-inline-editor-textarea" rows="3">${escapeHtml(currentContent)}</textarea>
      <div class="message-inline-editor-toolbar">
        <label class="message-inline-editor-check">
          <input type="checkbox" class="inline-regenerate-checkbox" />
          <span>重新生成后续回复</span>
        </label>
        <div class="message-inline-editor-actions">
          <button type="button" class="inline-cancel-btn">取消</button>
          <button type="button" class="inline-save-btn">保存</button>
        </div>
      </div>
    `;
    contentEl.insertAdjacentElement('afterend', editorHost);

    const textarea = editorHost.querySelector('.message-inline-editor-textarea');
    const saveBtn = editorHost.querySelector('.inline-save-btn');
    const cancelBtn = editorHost.querySelector('.inline-cancel-btn');
    const regenerateCheckbox = editorHost.querySelector('.inline-regenerate-checkbox');

    const teardown = () => {
      editorHost.remove();
      contentEl.style.display = '';
      if (actionsEl instanceof HTMLElement) actionsEl.style.display = '';
      msgEl.classList.remove('is-inline-editing');
    };

    const handleCancel = () => {
      teardown();
    };

    const handleSave = async () => {
      const trimmed = String(textarea?.value || '').trim();
      if (!trimmed) {
        showLightToast('消息内容不能为空', 'error');
        textarea?.focus();
        return;
      }
      if (trimmed === currentContent) {
        teardown();
        return;
      }

      const regenerate = !!regenerateCheckbox?.checked;
      const originalSaveText = saveBtn instanceof HTMLButtonElement ? saveBtn.textContent : '保存';
      if (saveBtn instanceof HTMLButtonElement) saveBtn.disabled = true;
      if (cancelBtn instanceof HTMLButtonElement) cancelBtn.disabled = true;
      if (textarea instanceof HTMLTextAreaElement) textarea.disabled = true;
      if (regenerateCheckbox instanceof HTMLInputElement) regenerateCheckbox.disabled = true;
      if (saveBtn instanceof HTMLButtonElement) {
        saveBtn.textContent = regenerate ? '保存并生成中...' : '保存中...';
      }
      if (regenerate) {
        showLightToast('正在保存并重新生成回复，请稍候...', 'info');
      }

      try {
        const editRes = await authManager.patch(`/chat/messages/${encodeURIComponent(messageId)}`, {
          content: trimmed,
          regenerate: false
        });

        if (regenerate) {
          const latestMessageId = editRes?.new_message?.message_id || messageId;
          await authManager.post(`/chat/messages/${encodeURIComponent(latestMessageId)}/regenerate`, {});
        }

        // Editing changes the branch/history context; clear injected memory selections to avoid stale context.
        state.injectedMemoryIds = new Set();
        if (ui.memoryPickerList) {
          ui.memoryPickerList.querySelectorAll('input[type="checkbox"]').forEach((x) => {
            x.checked = false;
          });
        }
        updateMemoryPickedCount();

        showLightToast(
          regenerate ? '消息已更新，已重新生成后续回复并刷新记忆选择' : '消息已更新',
          'success'
        );
        teardown();
        if (state.selectedConversationId) {
          await loadMessages(state.selectedConversationId);
        }
        await refreshAllConversationLists();
      } catch (err) {
        console.error('编辑消息失败:', err);
        showLightToast(err?.message || '编辑失败', 'error');
        if (saveBtn instanceof HTMLButtonElement) saveBtn.disabled = false;
        if (cancelBtn instanceof HTMLButtonElement) cancelBtn.disabled = false;
        if (textarea instanceof HTMLTextAreaElement) textarea.disabled = false;
        if (regenerateCheckbox instanceof HTMLInputElement) regenerateCheckbox.disabled = false;
        if (saveBtn instanceof HTMLButtonElement) saveBtn.textContent = originalSaveText || '保存';
      }
    };

    if (cancelBtn instanceof HTMLButtonElement) {
      cancelBtn.addEventListener('click', handleCancel);
    }
    if (saveBtn instanceof HTMLButtonElement) {
      saveBtn.addEventListener('click', () => { handleSave().catch(() => {}); });
    }
    if (textarea instanceof HTMLTextAreaElement) {
      textarea.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
          e.preventDefault();
          handleCancel();
          return;
        }
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
          e.preventDefault();
          handleSave().catch(() => {});
        }
      });
      textarea.focus();
      textarea.setSelectionRange(textarea.value.length, textarea.value.length);
    }
  };

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

    renderTopicListSkeleton(5);
    renderMessagesSkeleton(2);

    const grouped = await ensureDefaultBotsIfEmpty();
    state.botsByScene.work = grouped.work || [];
    state.botsByScene.life = grouped.life || [];
    state.botsByScene.love = grouped.love || [];

    ensureTrashUI();
    compactChatHeaderTools();
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
      renderMarkdownInMessages(ui.messages);
    }
  }

  bootstrap().catch((err) => {
    console.error(err);
    alert(err.message || '初始化失败，请稍后重试');
  });
})();

