(function () {
  function token() {
    return localStorage.getItem('access_token') || '';
  }

  function authHeaders(extra) {
    const t = token();
    const headers = Object.assign({}, extra || {});
    if (t) headers.Authorization = `Bearer ${t}`;
    return headers;
  }

  function escapeHtml(value) {
    return String(value || '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }

  function formatTime(ts) {
    if (!ts) return '-';
    try { return new Date(ts).toLocaleString(); } catch { return String(ts); }
  }

  async function requestJson(url, options) {
    const res = await fetch(url, options);
    const data = await res.json().catch(() => ({}));
    if (res.status === 401) {
      const currentPath = `${location.pathname}${location.search}${location.hash}`;
      location.href = `/login.html?returnTo=${encodeURIComponent(currentPath)}`;
      throw new Error('UNAUTHORIZED');
    }
    if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
    return data;
  }

  class UI {
    static statusEl = document.getElementById('statusBox');
    static toastHost = document.getElementById('toastHost');

    static setStatus(message, isError) {
      if (!this.statusEl) return;
      this.statusEl.textContent = message || '';
      this.statusEl.style.color = isError ? '#dc2626' : '#4b5563';
    }

    static toast(message, type) {
      if (!this.toastHost) return;
      const el = document.createElement('div');
      el.className = `toast ${type || 'info'}`;
      el.textContent = message;
      this.toastHost.appendChild(el);
      setTimeout(() => {
        el.style.animation = 'slide-out 0.18s ease-out forwards';
        setTimeout(() => el.remove(), 180);
      }, 2400);
    }
  }

  class FolderManager {
    constructor() {
      this.listEl = document.getElementById('foldersList');
      this.reloadBtn = document.getElementById('reloadBtn');
      this.trashBtn = document.getElementById('btn-trash');
      this.folders = [];
      this.selectedFolderId = null;
    }

    init() {
      this.reloadBtn?.addEventListener('click', () => this.loadFolders());
      this.trashBtn?.addEventListener('click', () => UI.toast('Trash UI will be added in Phase 2', 'info'));

      this.listEl?.addEventListener('click', (event) => {
        const target = event.target;
        if (!(target instanceof HTMLElement)) return;
        const actionEl = target.closest('[data-action]');
        if (actionEl instanceof HTMLElement) {
          const action = actionEl.dataset.action;
          const id = actionEl.dataset.id;
          if (!id) return;
          if (action === 'delete') this.deleteFolder(id);
          return;
        }

        const item = target.closest('.folder-item');
        if (item instanceof HTMLElement && item.dataset.folderId) {
          this.selectFolder(item.dataset.folderId);
        }
      });

      this.loadFolders();
    }

    renderIcon(folder) {
      if (folder.icon_type === 'upload' && folder.icon_url) {
        return `<div class="folder-icon"><img src="${folder.icon_url}" alt="" /></div>`;
      }
      const cfg = folder.icon_config || { bg: '#6366f1', text: '#ffffff', letter: 'F' };
      const bg = typeof cfg.bg === 'string' ? cfg.bg : '#6366f1';
      const text = typeof cfg.text === 'string' ? cfg.text : '#ffffff';
      const letter = typeof cfg.letter === 'string' ? cfg.letter : 'F';
      return `<div class="folder-icon generated" style="background:${escapeHtml(bg)};color:${escapeHtml(text)}">${escapeHtml(letter).slice(0, 1)}</div>`;
    }

    rowHtml(folder) {
      const active = folder.folder_id === this.selectedFolderId ? ' active' : '';
      return `
        <div class="folder-item${active}" data-folder-id="${folder.folder_id}">
          ${this.renderIcon(folder)}
          <div class="folder-main">
            <div class="folder-name">${escapeHtml(folder.name)}</div>
            <div class="folder-meta">${escapeHtml(folder.icon_type)} | ${escapeHtml(formatTime(folder.created_at))}</div>
          </div>
          <div class="folder-actions">
            <button class="btn danger" data-action="delete" data-id="${folder.folder_id}" type="button">Delete</button>
          </div>
        </div>
      `;
    }

    renderList() {
      if (!this.listEl) return;
      if (!this.folders.length) {
        this.listEl.innerHTML = '<div class="empty">No topics yet. Use the button below to create one.</div>';
        return;
      }
      this.listEl.innerHTML = this.folders.map((f) => this.rowHtml(f)).join('');
    }

    async loadFolders() {
      UI.setStatus('Loading...');
      try {
        const data = await requestJson('/api/folders', { headers: authHeaders() });
        this.folders = Array.isArray(data.folders) ? data.folders : [];
        if (this.selectedFolderId && !this.folders.find((f) => f.folder_id === this.selectedFolderId)) {
          this.selectedFolderId = null;
        }
        if (!this.selectedFolderId && this.folders[0]) this.selectedFolderId = this.folders[0].folder_id;
        this.renderList();
        UI.setStatus(`Loaded ${this.folders.length} topic(s)`);
      } catch (error) {
        if (String(error && error.message) !== 'UNAUTHORIZED') {
          UI.setStatus(`Load failed: ${error.message || error}`, true);
          UI.toast(`Load failed: ${error.message || error}`, 'error');
        }
      }
    }

    async createFolder(name) {
      const created = await requestJson('/api/folders', {
        method: 'POST',
        headers: authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ name })
      });

      const folderId = created?.folder?.folder_id;
      await this.loadFolders();
      if (folderId) this.selectFolder(folderId);
      return folderId;
    }

    selectFolder(folderId) {
      this.selectedFolderId = folderId;
      this.renderList();
      const row = this.listEl?.querySelector(`[data-folder-id="${folderId}"]`);
      if (row instanceof HTMLElement) {
        row.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    }

    async randomizeFolder(folderId) {
      UI.setStatus('Updating icon...');
      try {
        await requestJson(`/api/folders/${folderId}/icon/random`, { method: 'POST', headers: authHeaders() });
        await this.loadFolders();
        this.selectFolder(folderId);
        UI.toast('Icon updated', 'success');
      } catch (error) {
        UI.setStatus(`Update failed: ${error.message || error}`, true);
        UI.toast(`Update failed: ${error.message || error}`, 'error');
      }
    }

    async deleteFolder(folderId) {
      const folder = this.folders.find((f) => f.folder_id === folderId);
      if (!window.confirm(`Delete topic "${folder?.name || folderId}"?`)) return;
      UI.setStatus('Deleting...');
      try {
        await requestJson(`/api/folders/${folderId}`, { method: 'DELETE', headers: authHeaders() });
        if (this.selectedFolderId === folderId) this.selectedFolderId = null;
        await this.loadFolders();
        UI.toast('Deleted (soft delete)', 'success');
      } catch (error) {
        UI.setStatus(`Delete failed: ${error.message || error}`, true);
        UI.toast(`Delete failed: ${error.message || error}`, 'error');
      }
    }
  }

  class TopicManager {
    constructor(folderManager) {
      this.folderManager = folderManager;
      this.modal = document.getElementById('modalCreateTopic');
      this.nameInput = document.getElementById('topicNameInput');
      this.iconPreview = document.getElementById('topicIconPreview');
      this.createBtn = document.getElementById('btnCreateTopicConfirm');
      this.newBtn = document.getElementById('btn-new-topic');
      this.randomBtn = document.getElementById('btnRandomIcon');
      this.closeBtn = document.getElementById('btnCloseModal');
      this.cancelBtn = document.getElementById('btnCancelCreate');
      this.previewSeed = '';
      this.currentIconConfig = null;
    }

    init() {
      this.newBtn?.addEventListener('click', () => this.openModal());
      this.closeBtn?.addEventListener('click', () => this.closeModal());
      this.cancelBtn?.addEventListener('click', () => this.closeModal());
      this.randomBtn?.addEventListener('click', () => this.randomizeTopicIcon());
      this.createBtn?.addEventListener('click', () => this.createTopic());
      this.nameInput?.addEventListener('input', () => this.updateIconPreview(this.nameInput.value || ''));
      this.nameInput?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') this.createTopic();
        if (e.key === 'Escape') this.closeModal();
      });
      this.modal?.addEventListener('click', (e) => {
        if (e.target === this.modal) this.closeModal();
      });
      this.updateIconPreview('');
    }

    palette() {
      return [
        { bg: '#EF4444', text: '#FFFFFF' },
        { bg: '#F59E0B', text: '#FFFFFF' },
        { bg: '#10B981', text: '#FFFFFF' },
        { bg: '#3B82F6', text: '#FFFFFF' },
        { bg: '#6366F1', text: '#FFFFFF' },
        { bg: '#8B5CF6', text: '#FFFFFF' },
        { bg: '#EC4899', text: '#FFFFFF' },
        { bg: '#14B8A6', text: '#FFFFFF' }
      ];
    }

    openModal() {
      if (!this.modal) return;
      this.modal.classList.remove('hidden');
      this.modal.setAttribute('aria-hidden', 'false');
      if (this.nameInput) this.nameInput.value = '';
      this.previewSeed = String(Date.now());
      this.updateIconPreview('');
      setTimeout(() => this.nameInput?.focus(), 0);
    }

    closeModal() {
      if (!this.modal) return;
      this.modal.classList.add('hidden');
      this.modal.setAttribute('aria-hidden', 'true');
    }

    iconConfigForName(name) {
      const src = String(name || 'Topic') + this.previewSeed;
      const colors = this.palette();
      const hash = src.split('').reduce((a, b) => a + b.charCodeAt(0), 0);
      const color = colors[Math.abs(hash) % colors.length];
      const letter = (String(name || 'A').trim().charAt(0) || 'A').toUpperCase();
      return { ...color, letter };
    }

    updateIconPreview(name) {
      if (!this.iconPreview) return;
      const cfg = this.iconConfigForName(name);
      this.currentIconConfig = cfg;
      this.iconPreview.innerHTML = `<div class="generated-icon" style="background:${cfg.bg};color:${cfg.text}">${escapeHtml(cfg.letter)}</div>`;
    }

    randomizeTopicIcon() {
      this.previewSeed = Math.random().toString(36).slice(2, 8);
      this.updateIconPreview(this.nameInput?.value || '');
    }

    async createTopic() {
      const name = (this.nameInput?.value || '').trim();
      if (!name) {
        this.nameInput?.focus();
        return;
      }
      if (!this.createBtn) return;

      this.createBtn.disabled = true;
      this.createBtn.textContent = 'Creating...';
      try {
        const folderId = await this.folderManager.createFolder(name);
        this.closeModal();
        if (folderId) this.folderManager.selectFolder(folderId);
        UI.toast('Topic created', 'success');
      } catch (error) {
        UI.toast(`Create failed: ${error.message || error}`, 'error');
      } finally {
        this.createBtn.disabled = false;
        this.createBtn.textContent = 'Create Topic';
      }
    }
  }

  const folderManager = new FolderManager();
  folderManager.init();

  const topicManager = new TopicManager(folderManager);
  topicManager.init();

  window.folderManager = folderManager;
  window.topicManager = topicManager;
})();
