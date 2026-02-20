const navItems = document.querySelectorAll('.nav-item');
const pages = {
  dashboard: document.getElementById('page-dashboard'),
  sop: document.getElementById('page-sop'),
  groups: document.getElementById('page-groups'),
  bots: document.getElementById('page-bots')
};

navItems.forEach((item) => {
  item.addEventListener('click', () => {
    const page = item.dataset.page;
    navItems.forEach((i) => i.classList.remove('active'));
    item.classList.add('active');

    Object.values(pages).forEach((p) => {
      if (p) p.style.display = 'none';
    });

    if (pages[page]) {
      pages[page].style.display = 'block';
    }
  });
});

const Bots = (() => {
  /** @type {Array<{id:string,name:string,scene:string,type:string,status:string,description:string,lastUpdated:number,updatedAt:number}>} */
  let bots = [];

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
    return {
      id: bot.bot_id,
      name: bot.name || '',
      scene: bot.scene || '',
      type: bot.type || '',
      status: bot.status || 'offline',
      description: bot.description || '',
      lastUpdated: updated,
      updatedAt: updated
    };
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
    const response = await botClient.getBots({ page: 1, page_size: 200 });
    const list = Array.isArray(response.bots) ? response.bots : [];
    bots = list.map(mapApiBot);
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
      window.location.href = 'login.html';
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
  Bots.init();
});
