const navItems = document.querySelectorAll('.nav-item');

function redirectToLoginWithReturnTo() {
  const currentPath = `${window.location.pathname}${window.location.search}${window.location.hash}`;
  if (currentPath.includes('login.html')) {
    window.location.href = 'login.html';
    return;
  }
  window.location.href = `login.html?returnTo=${encodeURIComponent(currentPath)}`;
}

const pages = {
  dashboard: document.getElementById('page-dashboard'),
  sop: document.getElementById('page-sop'),
  groups: document.getElementById('page-groups'),
  bots: document.getElementById('page-bots'),
  analytics: document.getElementById('page-analytics'),
  logs: document.getElementById('page-logs'),
  'ai-insights': document.getElementById('page-ai-insights'),
  templates: document.getElementById('page-templates'),
  knowledge: document.getElementById('page-knowledge'),
  api: document.getElementById('page-api'),
  settings: document.getElementById('page-settings')
};

navItems.forEach((item) => {
  item.addEventListener('click', async () => {
    const page = item.dataset.page;
    navItems.forEach((i) => i.classList.remove('active'));
    item.classList.add('active');

    Object.values(pages).forEach((p) => {
      if (p) p.style.display = 'none';
    });

    if (pages[page]) {
      pages[page].style.display = 'block';
    }

    await loadPageData(page);
  });
});

const Bots = (() => {
  /** @type {Array<{id:string,name:string,scene:string,type:string,status:string,description:string,lastUpdated:number,updatedAt:number}>} */
  let bots = [];
  let workflowStatsByBot = {};
  const scheduleApi = new ApiClient();

  const STATUS_LABEL = {
    online: '在线',
    offline: '离线',
    suspended: '暂停'
  };

  const SCENE_LABEL = {
    work: '工作',
    life: '生活',
    love: '情感',
    group: '群聊',
    sop: 'SOP'
  };

  const TYPE_LABEL = {
    work: '工作',
    life: '生活',
    love: '情感',
    group: '群聊',
    sop: 'SOP'
  };

  const el = (id) => document.getElementById(id);

  function now() {
    return Date.now();
  }

  function escapeHtml(str) {
    return String(str || '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }

  function toast(title, desc = '', ms = 2600) {
    const stack = el('toast-stack');
    if (!stack) return;

    const node = document.createElement('div');
    node.className = 'toast';
    node.innerHTML = `<div class="toast-title">${escapeHtml(title)}</div>${desc ? `<div class="toast-desc">${escapeHtml(desc)}</div>` : ''}`;
    stack.appendChild(node);

    setTimeout(() => {
      node.style.opacity = '0';
      node.style.transform = 'translateX(100%)';
      setTimeout(() => node.remove(), 300);
    }, ms);
  }

  function openModal({ title, bodyHtml, footerButtons }) {
    el('modal-title').textContent = title || '提示';
    el('modal-body').innerHTML = bodyHtml || '';

    const footer = el('modal-footer');
    footer.innerHTML = '';

    (footerButtons || []).forEach((btn) => {
      const b = document.createElement('button');
      b.className = btn.className || 'btn btn-secondary';
      b.textContent = btn.text;
      b.addEventListener('click', btn.onClick);
      footer.appendChild(b);
    });

    el('modal-mask').style.display = 'flex';
  }

  function closeModal() {
    el('modal-mask').style.display = 'none';
    el('modal-body').innerHTML = '';
    el('modal-footer').innerHTML = '';
  }

  function formatTime(ts) {
    if (!ts) return '-';
    const d = new Date(ts);
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  function humanAgo(ts) {
    if (!ts) return '-';
    const diff = Math.max(0, now() - ts);
    const m = Math.floor(diff / 60000);
    if (m < 1) return '刚刚';
    if (m < 60) return `${m} 分钟前`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h} 小时前`;
    const d = Math.floor(h / 24);
    return `${d} 天前`;
  }

  function mapApiBot(bot) {
    const updated = bot.updated_at ? new Date(bot.updated_at).getTime() : 0;
    const workflowStats = workflowStatsByBot[bot.bot_id] || { total: 0, enabled: 0 };
    return {
      id: bot.bot_id,
      name: bot.name || '',
      scene: bot.scene || '',
      type: bot.type || '',
      status: bot.status || 'offline',
      description: bot.description || '',
      lastUpdated: updated,
      updatedAt: updated,
      workflowTotal: workflowStats.total,
      workflowEnabled: workflowStats.enabled
    };
  }

  async function fetchWorkflowStats() {
    try {
      const result = await scheduleApi.get('/schedule/tasks');
      const tasks = Array.isArray(result?.tasks) ? result.tasks : [];
      const stats = {};

      for (const task of tasks) {
        const botId = task?.botId;
        if (!botId) continue;
        if (!stats[botId]) {
          stats[botId] = { total: 0, enabled: 0 };
        }
        stats[botId].total += 1;
        if (task.enabled) {
          stats[botId].enabled += 1;
        }
      }

      workflowStatsByBot = stats;
    } catch {
      workflowStatsByBot = {};
    }
  }

  function toCreatePayload(formData) {
    return {
      name: formData.name,
      scene: formData.scene,
      type: formData.type,
      description: formData.description,
      config: null
    };
  }

  function toUpdatePayload(formData) {
    return {
      name: formData.name,
      scene: formData.scene,
      type: formData.type,
      description: formData.description
    };
  }

  async function fetchBots() {
    const [response] = await Promise.all([
      botClient.getBots({ page: 1, page_size: 200 }),
      fetchWorkflowStats()
    ]);
    const list = Array.isArray(response.bots) ? response.bots : [];
    bots = list.map(mapApiBot);
    await updateNavBadges();
    render();
  }

  function getFilters() {
    const q = (el('bots-search')?.value || '').trim().toLowerCase();
    const status = el('bots-filter-status')?.value || '';
    const scene = el('bots-filter-channel')?.value || '';
    return { q, status, scene };
  }

  function filteredBots() {
    const { q, status, scene } = getFilters();
    return bots
      .filter((b) => {
        const hitQ = !q || [b.name, b.type, b.scene, b.description].filter(Boolean).join(' ').toLowerCase().includes(q);
        const hitStatus = !status || b.status === status;
        const hitScene = !scene || b.scene === scene;
        return hitQ && hitStatus && hitScene;
      })
      .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
  }

  function render() {
    const tbody = el('bots-tbody');
    const empty = el('bots-empty');
    const count = el('bots-count');
    if (!tbody) return;

    const list = filteredBots();
    if (count) count.textContent = `${list.length} 个机器人`;

    tbody.innerHTML = '';
    if (list.length === 0) {
      if (empty) empty.style.display = 'block';
      return;
    }

    if (empty) empty.style.display = 'none';

    for (const b of list) {
      const statusLabel = STATUS_LABEL[b.status] || b.status;
      const sceneLabel = SCENE_LABEL[b.scene] || b.scene || '-';
      const typeLabel = TYPE_LABEL[b.type] || b.type || '-';
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>
          <div style="font-weight: 700;">${escapeHtml(b.name)}</div>
          <div class="muted" style="font-size: 12px; margin-top: 4px;">${escapeHtml(b.description || '')}</div>
        </td>
        <td><span class="chip">${escapeHtml(sceneLabel)}</span></td>
        <td>
          <span class="chip">
            <span class="dot ${escapeHtml(b.status)}"></span>
            ${escapeHtml(statusLabel)}
          </span>
        </td>
        <td>
          <div style="font-weight: 700;">${escapeHtml(humanAgo(b.lastUpdated))}</div>
          <div class="muted" style="font-size: 12px; margin-top: 4px;">${escapeHtml(formatTime(b.lastUpdated))}</div>
        </td>
        <td>${escapeHtml(typeLabel)}</td>
        <td><span class="chip">${b.workflowEnabled}/${b.workflowTotal}</span></td>
        <td>
          <div style="display: flex; gap: 8px; flex-wrap: wrap;">
            <button class="btn btn-ghost btn-small" data-act="edit" data-id="${b.id}">编辑</button>
            <button class="btn btn-ghost btn-small" data-act="toggle" data-id="${b.id}">${b.status === 'online' ? '下线' : '上线'}</button>
            <button class="btn btn-danger btn-small" data-act="delete" data-id="${b.id}">删除</button>
          </div>
        </td>
      `;
      tbody.appendChild(tr);
    }

    tbody.querySelectorAll('button[data-act]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        const act = btn.getAttribute('data-act');
        if (act === 'edit') openEdit(id);
        if (act === 'toggle') toggleStatus(id);
        if (act === 'delete') confirmDelete(id);
      });
    });
  }

  function formHtml(bot = {}) {
    const status = bot.status || 'offline';
    const scene = bot.scene || 'work';
    const type = bot.type || 'work';

    return `
      <div class="form-grid">
        <div class="full">
          <div class="label">机器人名称</div>
          <input class="input" id="bot-form-name" value="${escapeHtml(bot.name || '')}" placeholder="例如：工作助手" />
        </div>

        <div>
          <div class="label">场景</div>
          <select class="select" id="bot-form-scene">
            <option value="work" ${scene === 'work' ? 'selected' : ''}>工作</option>
            <option value="life" ${scene === 'life' ? 'selected' : ''}>生活</option>
            <option value="love" ${scene === 'love' ? 'selected' : ''}>情感</option>
            <option value="group" ${scene === 'group' ? 'selected' : ''}>群聊</option>
            <option value="sop" ${scene === 'sop' ? 'selected' : ''}>SOP</option>
          </select>
        </div>

        <div>
          <div class="label">类型</div>
          <select class="select" id="bot-form-type">
            <option value="work" ${type === 'work' ? 'selected' : ''}>工作</option>
            <option value="life" ${type === 'life' ? 'selected' : ''}>生活</option>
            <option value="love" ${type === 'love' ? 'selected' : ''}>情感</option>
            <option value="group" ${type === 'group' ? 'selected' : ''}>群聊</option>
            <option value="sop" ${type === 'sop' ? 'selected' : ''}>SOP</option>
          </select>
        </div>

        <div>
          <div class="label">状态</div>
          <select class="select" id="bot-form-status">
            <option value="online" ${status === 'online' ? 'selected' : ''}>在线</option>
            <option value="offline" ${status === 'offline' ? 'selected' : ''}>离线</option>
            <option value="suspended" ${status === 'suspended' ? 'selected' : ''}>暂停</option>
          </select>
        </div>

        <div class="full">
          <div class="label">描述</div>
          <textarea class="textarea" id="bot-form-description" placeholder="简要描述该机器人的职责和目标">${escapeHtml(bot.description || '')}</textarea>
        </div>
      </div>
      <div class="muted" style="margin-top: 10px; font-size: 12px;">当前页面已改为真实 API 调用，数据将直接写入后端数据库。</div>
    `;
  }

  function readFormData() {
    return {
      name: (el('bot-form-name')?.value || '').trim(),
      scene: (el('bot-form-scene')?.value || '').trim(),
      type: (el('bot-form-type')?.value || '').trim(),
      status: (el('bot-form-status')?.value || '').trim(),
      description: (el('bot-form-description')?.value || '').trim()
    };
  }

  function openCreate() {
    openModal({
      title: '新建机器人',
      bodyHtml: formHtml(),
      footerButtons: [
        { text: '取消', className: 'btn btn-secondary', onClick: closeModal },
        { text: '创建', className: 'btn btn-primary', onClick: () => submitForm('create') }
      ]
    });
  }

  function openEdit(id) {
    const bot = bots.find((x) => x.id === id);
    if (!bot) return;

    openModal({
      title: '编辑机器人',
      bodyHtml: formHtml(bot),
      footerButtons: [
        { text: '取消', className: 'btn btn-secondary', onClick: closeModal },
        { text: '保存', className: 'btn btn-primary', onClick: () => submitForm('edit', id) }
      ]
    });
  }

  async function submitForm(mode, id) {
    const data = readFormData();
    if (!data.name) {
      toast('请填写机器人名称');
      return;
    }
    if (!data.scene || !data.type || !data.status) {
      toast('请完整填写场景、类型和状态');
      return;
    }

    try {
      if (mode === 'create') {
        const created = await botClient.createBot(toCreatePayload(data));
        if (created?.bot_id && data.status !== 'offline') {
          await botClient.updateBotStatus(created.bot_id, data.status);
        }
        toast('机器人已创建', data.name);
      }

      if (mode === 'edit' && id) {
        await botClient.updateBot(id, toUpdatePayload(data));
        await botClient.updateBotStatus(id, data.status);
        toast('机器人已更新', data.name);
      }

      closeModal();
      await fetchBots();
    } catch (error) {
      toast('操作失败', error?.message || '请稍后重试');
    }
  }

  async function toggleStatus(id) {
    const bot = bots.find((x) => x.id === id);
    if (!bot) return;

    const nextStatus = bot.status === 'online' ? 'offline' : 'online';

    try {
      await botClient.updateBotStatus(id, nextStatus);
      await fetchBots();
      toast('状态已更新', `${bot.name} -> ${STATUS_LABEL[nextStatus] || nextStatus}`);
    } catch (error) {
      toast('状态更新失败', error?.message || '请稍后重试');
    }
  }

  function confirmDelete(id) {
    const bot = bots.find((x) => x.id === id);
    if (!bot) return;

    openModal({
      title: '确认删除',
      bodyHtml: `
        <div style="font-weight: 700;">确认删除「${escapeHtml(bot.name)}」吗？</div>
        <div class="muted" style="margin-top: 8px;">删除后无法恢复。</div>
      `,
      footerButtons: [
        { text: '取消', className: 'btn btn-secondary', onClick: closeModal },
        {
          text: '删除',
          className: 'btn btn-danger',
          onClick: async () => {
            try {
              await botClient.deleteBot(id);
              closeModal();
              await fetchBots();
              toast('已删除', bot.name);
            } catch (error) {
              toast('删除失败', error?.message || '请稍后重试');
            }
          }
        }
      ]
    });
  }

  function exportJson() {
    const data = JSON.stringify(bots, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bots-export-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    toast('已导出当前机器人列表');
  }

  async function importJson(file) {
    const text = await file.text();
    const arr = JSON.parse(text);
    if (!Array.isArray(arr)) {
      throw new Error('导入文件必须是数组');
    }

    for (const item of arr) {
      const payload = {
        name: String(item?.name || '').trim(),
        scene: String(item?.scene || 'work').trim(),
        type: String(item?.type || 'work').trim(),
        description: String(item?.description || '').trim()
      };
      if (!payload.name) continue;

      const created = await botClient.createBot(payload);
      const status = String(item?.status || 'offline').trim();
      if (created?.bot_id && ['online', 'offline', 'suspended'].includes(status) && status !== 'offline') {
        await botClient.updateBotStatus(created.bot_id, status);
      }
    }
  }

  function bindEvents() {
    el('modal-close')?.addEventListener('click', closeModal);
    el('modal-mask')?.addEventListener('click', (e) => {
      if (e.target && e.target.id === 'modal-mask') closeModal();
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeModal();
    });

    el('btn-bot-create')?.addEventListener('click', openCreate);
    el('btn-bot-create-empty')?.addEventListener('click', openCreate);

    ['bots-search', 'bots-filter-status', 'bots-filter-channel'].forEach((id) => {
      el(id)?.addEventListener('input', render);
      el(id)?.addEventListener('change', render);
    });

    el('btn-bots-export')?.addEventListener('click', exportJson);
    el('bots-import-input')?.addEventListener('change', async (e) => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;
      try {
        await importJson(file);
        await fetchBots();
        toast('导入成功', '已写入后端数据库');
      } catch (error) {
        toast('导入失败', error?.message || '文件格式不正确');
      } finally {
        e.target.value = '';
      }
    });
  }

  async function init() {
    if (!window.authManager || !authManager.isAuthenticated()) {
      redirectToLoginWithReturnTo();
      return;
    }

    bindEvents();

    try {
      await fetchBots();
    } catch (error) {
      toast('加载失败', error?.message || '无法获取机器人列表');
    }
  }

  return { init, render };
})();

document.addEventListener('DOMContentLoaded', () => {
  if (!window.authManager || !authManager.isAuthenticated()) {
    redirectToLoginWithReturnTo();
    return;
  }
  updateNavBadges();
  loadPageData('dashboard');
});

// 仪表盘模块
const Dashboard = (() => {
  const el = (id) => document.getElementById(id);

  async function loadDashboardStats() {
    try {
      const data = await requestJson('http://localhost:3000/api/stats/dashboard');

      // 更新 Bot 统计
      if (el('stat-bot-count')) {
        el('stat-bot-count').textContent = data.bots.active;
      }
      if (el('stat-bot-trend')) {
        el('stat-bot-trend').textContent = formatTrend(data.bots.trend);
      }

      // 更新 Workflow 统计
      if (el('stat-workflow-count')) {
        el('stat-workflow-count').textContent = data.workflows.active;
      }
      if (el('stat-workflow-trend')) {
        el('stat-workflow-trend').textContent = formatTrend(data.workflows.trend);
      }

      // 更新 Group 统计
      if (el('stat-group-count')) {
        el('stat-group-count').textContent = data.groups.active;
      }
      if (el('stat-group-trend')) {
        el('stat-group-trend').textContent = formatTrend(data.groups.trend);
      }

      // 更新 Message 统计
      if (el('stat-message-count')) {
        el('stat-message-count').textContent = data.messages.today.toLocaleString();
      }
      if (el('stat-message-trend')) {
        el('stat-message-trend').textContent = formatTrend(data.messages.trend);
      }

      await updateNavBadges();

      // 加载最近活动
      await loadRecentActivities();
    } catch (error) {
      console.error('加载仪表盘数据失败:', error);
    }
  }

  async function loadRecentActivities() {
    try {
      const data = await requestJson('http://localhost:3000/api/stats/recent-activities');

      if (el('recent-activities') && data.activities && data.activities.length > 0) {
        el('recent-activities').innerHTML = data.activities.map(activity => {
          const iconStyle = {
            'workflow': 'background: rgba(144, 238, 144, 0.15); color: var(--color-secondary);',
            'message': 'background: rgba(155, 139, 245, 0.15); color: var(--color-primary);',
            'warning': 'background: rgba(255, 217, 102, 0.15); color: var(--color-warning);'
          }[activity.type] || '';

          return `
            <div class="log-item">
              <div class="log-icon" style="${iconStyle}">${activity.icon}</div>
              <div class="log-content">
                <div class="log-title">${activity.title}</div>
                <div class="log-description">${activity.description}</div>
              </div>
              <div class="log-time">${activity.time}</div>
            </div>
          `;
        }).join('');
      } else if (el('recent-activities')) {
        el('recent-activities').innerHTML = `
          <div style="text-align: center; padding: 2rem; color: var(--text-secondary);">
            暂无最近活动
          </div>
        `;
      }
    } catch (error) {
      console.error('加载活动记录失败:', error);
      if (el('recent-activities')) {
        el('recent-activities').innerHTML = `
          <div style="text-align: center; padding: 2rem; color: var(--text-secondary);">
            加载活动记录失败
          </div>
        `;
      }
    }
  }

  function init() {
    // 当切换到仪表盘页面时加载数据
    const dashboardNavItem = document.querySelector('[data-page="dashboard"]');
    if (dashboardNavItem) {
      dashboardNavItem.addEventListener('click', () => {
        loadDashboardStats();
      });
    }

    // 初始加载（如果当前在仪表盘页面）
    if (el('page-dashboard') && el('page-dashboard').style.display !== 'none') {
      loadDashboardStats();
    }
  }

  return { init };
})();

const lazyLoadedPages = new Set();
const adminApi = new ApiClient();
let logsSelectedConversationId = '';

function toApiEndpoint(url) {
  if (typeof url !== 'string') return url;
  return url
    .replace(/^https?:\/\/localhost:3000\/api/, '')
    .replace(/^\/api/, '');
}

async function requestJson(url, options = {}) {
  const endpoint = toApiEndpoint(url);
  return adminApi.request(endpoint, options);
}

function formatTrend(value) {
  const num = Number(value || 0);
  if (num > 0) return `↑ ${num}%`;
  if (num < 0) return `↓ ${Math.abs(num)}%`;
  return '→ 0%';
}

async function updateNavBadges() {
  try {
    const stats = await requestJson('http://localhost:3000/api/stats/dashboard');
    const botsBadge = document.getElementById('nav-bots-badge');
    const workflowsBadge = document.getElementById('nav-workflows-badge');
    const groupsBadge = document.getElementById('nav-groups-badge');
    if (botsBadge) botsBadge.textContent = String(stats?.bots?.total ?? 0);
    if (workflowsBadge) workflowsBadge.textContent = String(stats?.workflows?.total ?? 0);
    if (groupsBadge) groupsBadge.textContent = String(stats?.groups?.total ?? 0);
  } catch {
    // Keep existing badge values when stats API is unavailable.
  }
}

function formatRelativeTimeLabel(value) {
  if (!value) return '-';
  const now = Date.now();
  const ts = new Date(value).getTime();
  if (!ts) return '-';
  const diff = Math.max(0, now - ts);
  const m = Math.floor(diff / 60000);
  if (m < 1) return '刚刚';
  if (m < 60) return `${m} 分钟前`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} 小时前`;
  const d = Math.floor(h / 24);
  return `${d} 天前`;
}

function groupTypeLabel(type) {
  return ({ personal: '个人', team: '团队', public: '公开' }[type] || type || '-');
}

async function loadGroupsPage() {
  const container = document.getElementById('groups-container');
  if (!container) return;

  const data = await requestJson('http://localhost:3000/api/groups?page=1&page_size=50');
  const groups = Array.isArray(data?.items) ? data.items : [];

  if (groups.length === 0) {
    container.innerHTML = `
      <div class="empty" style="padding: 3rem; text-align: center;">
        <div class="empty-title">还没有群聊</div>
        <div class="empty-desc">当前没有可展示的群组数据</div>
      </div>
    `;
    return;
  }

  container.innerHTML = groups.map((group) => {
    const memberCount = group?._count?.members || 0;
    const messageCount = group?._count?.messages || 0;
    const statusClass = messageCount > 0 ? 'online' : 'offline';
    const statusLabel = messageCount > 0 ? '活跃中' : '待激活';
    const members = Array.isArray(group?.members) ? group.members.slice(0, 5) : [];
    const avatars = members
      .map((m) => `<div class="member-avatar-small" style="background: var(--work-bg);">${String(m?.bot?.avatar || '🤖')}</div>`)
      .join('');

    return `
      <div class="item-card">
        <div class="item-header">
          <div class="item-avatar group">👥</div>
          <div class="item-info">
            <h3 class="item-title">${String(group.name || '')}</h3>
            <p class="item-subtitle">${groupTypeLabel(group.type)} · ${String(group.routing_strategy || 'ai_judge')}</p>
            <span class="status-badge ${statusClass}">
              <span class="status-dot"></span>
              ${statusLabel}
            </span>
          </div>
        </div>
        <p class="item-description">${String(group.description || '暂无描述')}</p>
        <div class="group-members">
          ${avatars}
          <span class="member-count">${memberCount} 个成员</span>
        </div>
        <div class="item-stats">
          <div class="item-stat">
            <div class="item-stat-value">${messageCount}</div>
            <div class="item-stat-label">消息数</div>
          </div>
          <div class="item-stat">
            <div class="item-stat-value">${memberCount}</div>
            <div class="item-stat-label">成员数</div>
          </div>
          <div class="item-stat">
            <div class="item-stat-value">${formatRelativeTimeLabel(group.updated_at)}</div>
            <div class="item-stat-label">最近更新</div>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

async function loadAnalyticsPage() {
  const [overview, trends] = await Promise.all([
    requestJson('http://localhost:3000/api/analytics/overview'),
    requestJson('http://localhost:3000/api/analytics/trends')
  ]);
  const setText = (id, value) => {
    const node = document.getElementById(id);
    if (node) node.textContent = String(value ?? '-');
  };
  setText('analytics-bots-total', overview.bots?.total);
  setText('analytics-bots-online', overview.bots?.online);
  setText('analytics-conversations-total', overview.conversations?.total);
  setText('analytics-messages-total', overview.messages?.total);

  const trendsNode = document.getElementById('analytics-trends');
  if (trendsNode) {
    trendsNode.innerHTML = (trends.buckets || [])
      .map((x) => `<div class="log-item"><div class="log-content"><div class="log-title">${x.date}</div><div class="log-description">会话 ${x.conversations} · 消息 ${x.messages}</div></div></div>`)
      .join('');
  }
}

function currentLogsBotId() {
  const select = document.getElementById('logs-bot-filter');
  return (select?.value || '').trim();
}

function currentLogsFilters() {
  return {
    botId: (document.getElementById('logs-bot-filter')?.value || '').trim(),
    conversationId: logsSelectedConversationId,
    topic: (document.getElementById('logs-topic-filter')?.value || '').trim(),
    content: (document.getElementById('logs-content-filter')?.value || '').trim(),
    startDate: (document.getElementById('logs-start-date')?.value || '').trim(),
    endDate: (document.getElementById('logs-end-date')?.value || '').trim()
  };
}

async function ensureLogsBotFilterOptions() {
  const select = document.getElementById('logs-bot-filter');
  if (!select || lazyLoadedPages.has('logs-bot-filter-loaded')) return;
  const botsRes = await requestJson('http://localhost:3000/api/bots?page=1&page_size=200');
  const bots = Array.isArray(botsRes?.bots) ? botsRes.bots : [];
  const options = ['<option value="">全部 Bot</option>']
    .concat(bots.map((bot) => `<option value="${bot.bot_id}">${bot.name || bot.bot_id}</option>`));
  select.innerHTML = options.join('');
  lazyLoadedPages.add('logs-bot-filter-loaded');
}

function bindLogsActions() {
  if (lazyLoadedPages.has('logs-actions-bound')) return;
  lazyLoadedPages.add('logs-actions-bound');

  document.getElementById('logs-refresh-btn')?.addEventListener('click', async () => {
    await loadLogsPage();
  });

  document.getElementById('logs-bot-filter')?.addEventListener('change', async () => {
    logsSelectedConversationId = '';
    await loadLogsPage();
  });
  document.getElementById('logs-topic-filter')?.addEventListener('change', async () => {
    logsSelectedConversationId = '';
    await loadLogsPage();
  });
  document.getElementById('logs-content-filter')?.addEventListener('change', async () => {
    logsSelectedConversationId = '';
    await loadLogsPage();
  });
  document.getElementById('logs-start-date')?.addEventListener('change', async () => {
    logsSelectedConversationId = '';
    await loadLogsPage();
  });
  document.getElementById('logs-end-date')?.addEventListener('change', async () => {
    logsSelectedConversationId = '';
    await loadLogsPage();
  });

  document.getElementById('logs-export-csv-btn')?.addEventListener('click', async () => {
    try {
      const { botId, conversationId, topic, content, startDate, endDate } = currentLogsFilters();
      const q = new URLSearchParams();
      if (botId) q.set('bot_id', botId);
      if (conversationId) q.set('conversation_id', conversationId);
      if (topic) q.set('topic', topic);
      if (content) q.set('content', content);
      if (startDate) q.set('start_date', startDate);
      if (endDate) q.set('end_date', endDate);

      const token = localStorage.getItem('access_token');
      const response = await fetch(`http://localhost:3000/api/logs/export/messages.csv?${q.toString()}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      if (!response.ok) {
        throw new Error(`导出失败(${response.status})`);
      }
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `chat-export-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (error) {
      alert(`导出失败: ${error?.message || '请稍后重试'}`);
    }
  });
}

async function loadLogsPage() {
  await ensureLogsBotFilterOptions();
  bindLogsActions();

  const { botId, conversationId, topic, content, startDate, endDate } = currentLogsFilters();
  const q = new URLSearchParams();
  q.set('page', '1');
  q.set('page_size', '10');
  if (botId) q.set('bot_id', botId);
  if (conversationId) q.set('conversation_id', conversationId);
  if (topic) q.set('topic', topic);
  if (content) q.set('content', content);
  if (startDate) q.set('start_date', startDate);
  if (endDate) q.set('end_date', endDate);

  const [conversations, messages] = await Promise.all([
    requestJson(`http://localhost:3000/api/logs/conversations?${q.toString()}`),
    requestJson(`http://localhost:3000/api/logs/messages?${q.toString()}`)
  ]);
  const cBody = document.getElementById('logs-conversations-body');
  if (cBody) {
    cBody.innerHTML = (conversations.items || [])
      .map((item) => `<tr data-conversation-id="${item.conversation_id}" style="${logsSelectedConversationId === item.conversation_id ? 'background: #f3efe7;' : ''}"><td>${item.title || '未命名'}</td><td>${item.bot?.name || '-'}</td><td>${item.user?.username || '-'}</td><td>${item._count?.messages || 0}</td><td>${new Date(item.updated_at).toLocaleString('zh-CN')}</td></tr>`)
      .join('');
    cBody.querySelectorAll('tr[data-conversation-id]').forEach((tr) => {
      tr.addEventListener('click', async () => {
        logsSelectedConversationId = tr.getAttribute('data-conversation-id') || '';
        await loadLogsPage();
      });
    });
  }
  const mBody = document.getElementById('logs-messages-body');
  if (mBody) {
    mBody.innerHTML = (messages.items || [])
      .map((item) => `<tr><td>${item.sender_type || '-'}</td><td>${String(item.content || '').slice(0, 80)}</td><td>${item.conversation?.title || '-'}</td><td>${new Date(item.timestamp).toLocaleString('zh-CN')}</td></tr>`)
      .join('');
  }
}

async function ensureAiInsightsBotFilterOptions() {
  const select = document.getElementById('ai-bot-filter');
  if (!select || lazyLoadedPages.has('ai-bot-filter-loaded')) return;
  const botsRes = await requestJson('http://localhost:3000/api/bots?page=1&page_size=200');
  const bots = Array.isArray(botsRes?.bots) ? botsRes.bots : [];
  const options = ['<option value="">全部 Bot</option>']
    .concat(bots.map((bot) => `<option value="${bot.bot_id}">${bot.name || bot.bot_id}</option>`));
  select.innerHTML = options.join('');
  lazyLoadedPages.add('ai-bot-filter-loaded');
}

function collectKnowledgeTypes() {
  const types = [];
  if (document.getElementById('ai-knowledge-text')?.checked) types.push('text');
  if (document.getElementById('ai-knowledge-image')?.checked) types.push('image');
  if (document.getElementById('ai-knowledge-drawing')?.checked) types.push('drawing');
  if (document.getElementById('ai-knowledge-pdf')?.checked) types.push('pdf');
  return types;
}

function bindAiInsightsActions() {
  if (lazyLoadedPages.has('ai-insights-actions-bound')) return;
  lazyLoadedPages.add('ai-insights-actions-bound');

  document.getElementById('ai-export-csv-btn')?.addEventListener('click', async () => {
    try {
      const botId = (document.getElementById('ai-bot-filter')?.value || '').trim();
      const topic = (document.getElementById('ai-topic-filter')?.value || '').trim();
      const content = (document.getElementById('ai-content-filter')?.value || '').trim();
      const startDate = (document.getElementById('ai-start-date')?.value || '').trim();
      const endDate = (document.getElementById('ai-end-date')?.value || '').trim();

      const q = new URLSearchParams();
      if (botId) q.set('bot_id', botId);
      if (topic) q.set('topic', topic);
      if (content) q.set('content', content);
      if (startDate) q.set('start_date', startDate);
      if (endDate) q.set('end_date', endDate);

      const token = localStorage.getItem('access_token');
      const response = await fetch(`http://localhost:3000/api/logs/export/messages.csv?${q.toString()}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      if (!response.ok) {
        throw new Error(`导出失败(${response.status})`);
      }
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `chat-export-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (error) {
      alert(`导出失败: ${error?.message || '请稍后重试'}`);
    }
  });

  document.getElementById('ai-run-analysis-btn')?.addEventListener('click', async () => {
    const resultNode = document.getElementById('ai-analysis-result');
    const metaNode = document.getElementById('ai-analysis-meta');
    try {
      const payload = {
        bot_id: (document.getElementById('ai-bot-filter')?.value || '').trim() || undefined,
        topic: (document.getElementById('ai-topic-filter')?.value || '').trim() || undefined,
        content: (document.getElementById('ai-content-filter')?.value || '').trim() || undefined,
        start_date: (document.getElementById('ai-start-date')?.value || '').trim() || undefined,
        end_date: (document.getElementById('ai-end-date')?.value || '').trim() || undefined,
        model: (document.getElementById('ai-model-select')?.value || '').trim() || undefined,
        system_prompt: (document.getElementById('ai-system-prompt')?.value || '').trim() || undefined,
        analysis_prompt: (document.getElementById('ai-analysis-prompt')?.value || '').trim() || undefined,
        knowledge_types: collectKnowledgeTypes()
      };
      if (resultNode) resultNode.textContent = '分析中...';
      const result = await requestJson('http://localhost:3000/api/analytics/ai-analysis', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      if (metaNode) {
        metaNode.textContent = `模型: ${result.model} | 会话: ${result.stats?.conversations || 0} | 消息: ${result.stats?.messages || 0} | 知识文件: ${result.stats?.knowledge_files || 0}`;
      }
      if (resultNode) {
        resultNode.textContent = result.summary || '无分析结果';
      }
    } catch (error) {
      if (resultNode) resultNode.textContent = `分析失败: ${error?.message || '请稍后重试'}`;
    }
  });
}

async function loadAiInsightsPage() {
  await ensureAiInsightsBotFilterOptions();
  bindAiInsightsActions();
}

async function loadTemplatesPage() {
  const data = await requestJson('http://localhost:3000/api/templates');
  const body = document.getElementById('templates-body');
  if (!body) return;

  body.innerHTML = (data.items || [])
    .map((item) => `<tr><td>${item.name}</td><td>${item.scene}</td><td>${String(item.content || '').slice(0, 80)}</td><td>${new Date(item.updated_at).toLocaleString('zh-CN')}</td><td><button class="btn btn-danger btn-small" data-template-id="${item.template_id}">删除</button></td></tr>`)
    .join('');

  body.querySelectorAll('button[data-template-id]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      await requestJson(`http://localhost:3000/api/templates/${btn.getAttribute('data-template-id')}`, { method: 'DELETE' });
      await loadTemplatesPage();
    });
  });

  const createBtn = document.getElementById('template-create-btn');
  if (createBtn && !lazyLoadedPages.has('template-create-bind')) {
    lazyLoadedPages.add('template-create-bind');
    createBtn.addEventListener('click', async () => {
      const name = document.getElementById('template-name')?.value?.trim();
      const scene = document.getElementById('template-scene')?.value?.trim();
      const content = document.getElementById('template-content')?.value?.trim();
      if (!name || !scene || !content) {
        alert('请填写完整模板信息');
        return;
      }
      await requestJson('http://localhost:3000/api/templates', {
        method: 'POST',
        body: JSON.stringify({ name, scene, content })
      });
      document.getElementById('template-name').value = '';
      document.getElementById('template-content').value = '';
      await loadTemplatesPage();
    });
  }
}

async function loadKnowledgePage() {
  const data = await requestJson('http://localhost:3000/api/knowledge/files?page=1&page_size=20');
  const body = document.getElementById('knowledge-body');
  if (!body) return;
  body.innerHTML = (data.items || [])
    .map((item) => `<tr><td>${item.filename}</td><td>${item.file_size}</td><td>${item.status}</td><td>${item._count?.chunks || 0}</td><td>${new Date(item.created_at).toLocaleString('zh-CN')}</td><td><button class="btn btn-danger btn-small" data-file-id="${item.file_id}">删除</button></td></tr>`)
    .join('');
  body.querySelectorAll('button[data-file-id]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      await requestJson(`http://localhost:3000/api/knowledge/files/${btn.getAttribute('data-file-id')}`, { method: 'DELETE' });
      await loadKnowledgePage();
    });
  });
}

async function loadSettingsPage() {
  const data = await requestJson('http://localhost:3000/api/system/settings');
  const appName = document.getElementById('setting-app-name');
  const model = document.getElementById('setting-model');
  const retention = document.getElementById('setting-retention');
  const registration = document.getElementById('setting-registration');
  if (appName) appName.value = data.app_name || '';
  if (model) model.value = data.default_model || '';
  if (retention) retention.value = String(data.message_retention_days || 30);
  if (registration) registration.checked = Boolean(data.enable_registration);

  const saveBtn = document.getElementById('settings-save-btn');
  if (saveBtn && !lazyLoadedPages.has('settings-save-bind')) {
    lazyLoadedPages.add('settings-save-bind');
    saveBtn.addEventListener('click', async () => {
      await requestJson('http://localhost:3000/api/system/settings', {
        method: 'PUT',
        body: JSON.stringify({
          app_name: document.getElementById('setting-app-name')?.value?.trim() || '',
          default_model: document.getElementById('setting-model')?.value?.trim() || '',
          message_retention_days: Number(document.getElementById('setting-retention')?.value || 30),
          enable_registration: Boolean(document.getElementById('setting-registration')?.checked)
        })
      });
      alert('系统设置已保存');
    });
  }
}

async function loadPageData(page) {
  try {
    if (page === 'dashboard') {
      Dashboard.init();
      return;
    }
    if (page === 'sop') {
      await Schedule.init();
      return;
    }
    if (page === 'bots') {
      await Bots.init();
      return;
    }
    if (page === 'groups') return loadGroupsPage();
    if (page === 'analytics') return loadAnalyticsPage();
    if (page === 'logs') return loadLogsPage();
    if (page === 'ai-insights') return loadAiInsightsPage();
    if (page === 'templates') return loadTemplatesPage();
    if (page === 'knowledge') return loadKnowledgePage();
    if (page === 'settings') return loadSettingsPage();
  } catch (error) {
    console.error(`加载页面 ${page} 失败:`, error);
  }
}

const Schedule = (() => {
  let tasks = [];
  let bots = [];

  const api = new ApiClient();

  const CRON_LABELS = {
    '0 * * * *': '每小时整点',
    '0 9 * * *': '每天早上 9:00',
    '0 12 * * *': '每天中午 12:00',
    '0 18 * * *': '每天下午 18:00',
    '0 9 * * 1-5': '工作日早上 9:00',
    '0 10 * * 0,6': '周末早上 10:00',
    '*/30 * * * *': '每 30 分钟',
    '*/15 * * * *': '每 15 分钟'
  };

  function escapeHtml(str) {
    return String(str || '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }

  function getCronLabel(cron) {
    return CRON_LABELS[cron] || cron;
  }

  async function validateCronExpression(expression) {
    const cron = String(expression || '').trim();
    if (!cron) {
      return { valid: false, error: 'Cron 表达式不能为空' };
    }

    try {
      const result = await api.get(`/schedule/cron/validate?expression=${encodeURIComponent(cron)}`);
      if (result?.valid) {
        return { valid: true };
      }
      return { valid: false, error: result?.error || 'Cron 表达式不合法' };
    } catch (e) {
      return { valid: false, error: e?.message || 'Cron 表达式校验失败' };
    }
  }

  async function loadBots() {
    try {
      const res = await api.get('/bots');
      bots = res.bots || [];
    } catch (e) {
      bots = [];
    }
  }

  function getBotName(botId) {
    const bot = bots.find(b => b.bot_id === botId);
    return bot ? bot.name : botId;
  }

  async function loadTasks() {
    try {
      const res = await api.get('/schedule/tasks');
      tasks = res.tasks || [];
    } catch (e) {
      tasks = [];
    }
  }

  function renderTasks() {
    const container = document.getElementById('sop-tasks-container');
    if (!container) return;

    if (tasks.length === 0) {
      container.innerHTML = `
        <div class="empty" style="padding: 3rem; text-align: center;">
          <div class="empty-title">还没有定时任务</div>
          <div class="empty-desc">点击上方按钮创建一个定时发送消息的任务</div>
        </div>
      `;
      return;
    }

    container.innerHTML = tasks.map(task => `
      <div class="item-card" data-id="${escapeHtml(task.id)}">
        <div class="item-header">
          <div class="item-avatar sop">⏰</div>
          <div class="item-info">
            <h3 class="item-title">${escapeHtml(task.name || '定时任务')}</h3>
            <p class="item-subtitle">${escapeHtml(getBotName(task.botId))} · 定时触发</p>
            <span class="status-badge ${task.enabled ? 'active' : 'offline'}">
              <span class="status-dot"></span>
              ${task.enabled ? '运行中' : '已暂停'}
            </span>
          </div>
        </div>
        <div class="sop-schedule">
          <strong>⏰ 执行时间：</strong>${getCronLabel(task.cronExpression)} (${escapeHtml(task.cronExpression)})
        </div>
        <div class="sop-schedule">
          <strong>🤖 绑定 Bot：</strong>${escapeHtml(getBotName(task.botId))}
        </div>
        <div class="sop-steps">
          📋 消息内容：<br>
          ${escapeHtml(task.message?.substring(0, 100) || '无')}...
        </div>
        <div class="item-stats">
          <div class="item-stat">
            <div class="item-stat-value">${task.enabled ? '✓' : '✗'}</div>
            <div class="item-stat-label">状态</div>
          </div>
          <div class="item-stat">
            <div class="item-stat-value">${task.cronExpression.split(' ').length === 5 ? '✓' : '✗'}</div>
            <div class="item-stat-label">Cron</div>
          </div>
        </div>
        <div class="item-actions">
          <button class="btn btn-secondary btn-small" onclick="Schedule.toggleTask('${task.id}', ${!task.enabled})">
            ${task.enabled ? '暂停' : '启用'}
          </button>
          <button class="btn btn-secondary btn-small" onclick="Schedule.deleteTask('${task.id}')">删除</button>
        </div>
      </div>
    `).join('');
  }

  function openCreateModal() {
    const modalTitle = document.getElementById('modal-title');
    const modalBody = document.getElementById('modal-body');
    const modalFooter = document.getElementById('modal-footer');

    modalTitle.textContent = '创建定时任务';

    const botOptions = bots.map(b => `<option value="${b.bot_id}">${escapeHtml(b.name)}</option>`).join('');
    const cronOptions = Object.entries(CRON_LABELS).map(([cron, label]) => 
      `<option value="${cron}">${label} (${cron})</option>`
    ).join('');

    modalBody.innerHTML = `
      <div style="display: grid; gap: 16px;">
        <div>
          <label class="label">任务名称</label>
          <input class="input" id="schedule-task-name" placeholder="例如：每日早安提醒" />
        </div>
        <div>
          <label class="label">选择 Bot</label>
          <select class="select" id="schedule-task-bot" style="width: 100%;">
            <option value="">-- 选择 Bot --</option>
            ${botOptions}
          </select>
        </div>
        <div>
          <label class="label">发送时间</label>
          <select class="select" id="schedule-task-cron" style="width: 100%;">
            ${cronOptions}
          </select>
        </div>
        <div>
          <label class="label">自定义 Cron（可选）</label>
          <input class="input" id="schedule-task-cron-custom" placeholder="例如：0 9 * * *" />
          <small style="color: var(--text-secondary);">格式：分 时 日 月 周</small>
        </div>
        <div>
          <label class="label">消息内容</label>
          <textarea class="textarea" id="schedule-task-message" rows="4" placeholder="要发送的消息内容..."></textarea>
        </div>
      </div>
    `;

    modalFooter.innerHTML = `
      <button class="btn btn-secondary" onclick="document.getElementById('modal-mask').style.display='none'">取消</button>
      <button class="btn btn-primary" id="schedule-create-btn">创建</button>
    `;

    document.getElementById('modal-mask').style.display = 'flex';

    document.getElementById('schedule-create-btn').onclick = createTask;
  }

  async function createTask() {
    const name = document.getElementById('schedule-task-name')?.value?.trim();
    const botId = document.getElementById('schedule-task-bot')?.value;
    const cronSelect = document.getElementById('schedule-task-cron')?.value;
    const cronCustom = document.getElementById('schedule-task-cron-custom')?.value?.trim();
    const message = document.getElementById('schedule-task-message')?.value?.trim();

    let cronExpression = cronSelect;
    if (cronCustom) {
      const customCronValidation = await validateCronExpression(cronCustom);
      if (!customCronValidation.valid) {
        alert(`自定义 Cron 不合法: ${customCronValidation.error}`);
        return;
      }
      cronExpression = cronCustom;
    }

    if (!name || !botId || !cronExpression || !message) {
      alert('请填写所有必填字段');
      return;
    }

    const finalCronValidation = await validateCronExpression(cronExpression);
    if (!finalCronValidation.valid) {
      alert(`Cron 表达式不合法: ${finalCronValidation.error}`);
      return;
    }

    const userStr = localStorage.getItem('user');
    const user = userStr ? JSON.parse(userStr) : null;
    const userId = user?.user_id;

    console.log('Creating task:', { name, botId, userId, cronExpression, message });

    if (!userId) {
      alert('无法获取当前用户信息，请重新登录');
      return;
    }

    try {
      const postData = {
        name,
        bot_id: botId,
        user_id: userId,
        cron_expression: cronExpression,
        message
      };
      console.log('Post data:', postData);
      
      await api.post('/schedule/tasks', postData);

      document.getElementById('modal-mask').style.display = 'none';
      await loadTasks();
      renderTasks();
      await updateNavBadges();
      alert(`定时任务创建成功，已绑定到 Bot：${getBotName(botId)}`);
    } catch (e) {
      alert('创建失败: ' + e.message);
    }
  }

  async function toggleTask(id, enabled) {
    try {
      await api.patch(`/schedule/tasks/${id}/toggle`, { enabled });
      await loadTasks();
      renderTasks();
      await updateNavBadges();
    } catch (e) {
      alert('操作失败: ' + e.message);
    }
  }

  async function deleteTask(id) {
    if (!confirm('确定要删除这个定时任务吗？')) return;
    try {
      await api.delete(`/schedule/tasks/${id}`);
      await loadTasks();
      renderTasks();
      await updateNavBadges();
    } catch (e) {
      alert('删除失败: ' + e.message);
    }
  }

  async function init() {
    await loadBots();
    await loadTasks();
    renderTasks();

    const createBtn = document.querySelector('#page-sop .btn-primary');
    if (createBtn) {
      createBtn.onclick = openCreateModal;
    }
  }

  return { init, toggleTask, deleteTask };
})();



