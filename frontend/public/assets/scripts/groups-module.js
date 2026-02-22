
// Groups Management
const Groups = (() => {
  const api = new ApiClient();
  const el = (id) => document.getElementById(id);

  async function openEditGroup(groupId) {
    try {
      const group = await api.get(`/groups/${groupId}`);
      const membersHtml = Array.isArray(group?.members)
        ? group.members.map(m => `
            <div style="display: flex; align-items: center; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #f0f0f0;">
              <div>
                <strong>${escapeHtml(m.bot?.name || 'Unknown')}</strong>
                <div style="font-size: 12px; color: #888;">触发词: ${Array.isArray(m.trigger_keywords) && m.trigger_keywords.length > 0 ? m.trigger_keywords.join(', ') : '无'}</div>
              </div>
              <button class="btn btn-ghost btn-small" data-member-id="${m.id}" onclick="Groups.editMember('${groupId}', '${m.id}')">编辑</button>
            </div>
          `).join('')
        : '<p style="color: #888;">暂无成员</p>';

      const bodyHtml = `
        <div class="form-grid">
          <div class="full">
            <div class="label">群组名称</div>
            <input class="input" id="group-edit-name" value="${escapeHtml(group.name || '')}" />
          </div>
          <div class="full">
            <div class="label">描述</div>
            <textarea class="textarea" id="group-edit-description">${escapeHtml(group.description || '')}</textarea>
          </div>
          <div>
            <div class="label">路由策略</div>
            <select class="select" id="group-edit-routing">
              <option value="keyword_match" ${group.routing_strategy === 'keyword_match' ? 'selected' : ''}>关键词匹配</option>
              <option value="ai_judge" ${group.routing_strategy === 'ai_judge' ? 'selected' : ''}>AI 判断</option>
              <option value="round_robin" ${group.routing_strategy === 'round_robin' ? 'selected' : ''}>轮询</option>
              <option value="broadcast" ${group.routing_strategy === 'broadcast' ? 'selected' : ''}>广播</option>
            </select>
          </div>
          <div>
            <div class="label">对话模式</div>
            <select class="select" id="group-edit-mode">
              <option value="single_turn" ${group.conversation_mode === 'single_turn' ? 'selected' : ''}>单轮</option>
              <option value="multi_turn" ${group.conversation_mode === 'multi_turn' ? 'selected' : ''}>多轮</option>
            </select>
          </div>
        </div>
        <div style="margin-top: 16px;">
          <h4 style="margin-bottom: 8px;">成员列表</h4>
          <div id="group-members-list">${membersHtml}</div>
          <button class="btn btn-secondary btn-small" style="margin-top: 8px;" onclick="Groups.addMember('${groupId}')">添加成员</button>
        </div>
      `;

      el('modal-title').textContent = '编辑群组';
      el('modal-body').innerHTML = bodyHtml;
      el('modal-footer').innerHTML = `
        <button class="btn btn-secondary" onclick="document.getElementById('modal-mask').style.display='none'">取消</button>
        <button class="btn btn-primary" onclick="Groups.saveGroup('${groupId}')">保存</button>
      `;
      el('modal-mask').style.display = 'flex';
    } catch (error) {
      alert('加载群组详情失败: ' + error.message);
    }
  }

  async function saveGroup(groupId) {
    try {
      const data = {
        name: el('group-edit-name')?.value?.trim() || '',
        description: el('group-edit-description')?.value?.trim() || '',
        routing_strategy: el('group-edit-routing')?.value || 'ai_judge',
        conversation_mode: el('group-edit-mode')?.value || 'multi_turn'
      };

      await api.put(`/groups/${groupId}`, data);
      el('modal-mask').style.display = 'none';
      loadGroupsPage();
      alert('群组已更新');
    } catch (error) {
      alert('保存失败: ' + error.message);
    }
  }

  async function confirmDeleteGroup(groupId, groupName) {
    if (!confirm(`确定要删除群组 "${groupName}" 吗？`)) return;
    try {
      await api.delete(`/groups/${groupId}`);
      loadGroupsPage();
      alert('群组已删除');
    } catch (error) {
      alert('删除失败: ' + error.message);
    }
  }

  async function addMember(groupId) {
    try {
      const botsData = await botClient.getBots({ page: 1, page_size: 100 });
      const bots = botsData?.bots || [];

      const botsOptions = bots.map(b =>
        `<option value="${b.bot_id}">${escapeHtml(b.name)} (${b.scene})</option>`
      ).join('');

      const bodyHtml = `
        <div class="form-grid">
          <div class="full">
            <div class="label">选择 Bot</div>
            <select class="select" id="member-add-bot">${botsOptions}</select>
          </div>
          <div class="full">
            <div class="label">角色</div>
            <input class="input" id="member-add-role" placeholder="例如：效率专家" />
          </div>
          <div class="full">
            <div class="label">触发词（逗号分隔）</div>
            <input class="input" id="member-add-keywords" placeholder="例如：任务,工作,计划" />
          </div>
          <div>
            <div class="label">优先级</div>
            <input class="input" id="member-add-priority" type="number" value="0" />
          </div>
        </div>
      `;

      el('modal-title').textContent = '添加成员';
      el('modal-body').innerHTML = bodyHtml;
      el('modal-footer').innerHTML = `
        <button class="btn btn-secondary" onclick="Groups.refreshEditGroup('${groupId}')">取消</button>
        <button class="btn btn-primary" onclick="Groups.submitAddMember('${groupId}')">添加</button>
      `;
    } catch (error) {
      alert('加载Bot列表失败: ' + error.message);
    }
  }

  async function submitAddMember(groupId) {
    try {
      const bot_id = el('member-add-bot')?.value || '';
      const role = el('member-add-role')?.value?.trim() || null;
      const keywordsStr = el('member-add-keywords')?.value?.trim() || '';
      const priority = parseInt(el('member-add-priority')?.value || '0');

      if (!bot_id) {
        alert('请选择Bot');
        return;
      }

      const trigger_keywords = keywordsStr ? keywordsStr.split(',').map(k => k.trim()).filter(k => k) : [];

      await api.post(`/groups/${groupId}/members`, {
        bot_id,
        role,
        trigger_keywords,
        priority
      });

      refreshEditGroup(groupId);
      alert('成员已添加');
    } catch (error) {
      alert('添加失败: ' + error.message);
    }
  }

  async function editMember(groupId, memberId) {
    try {
      const membersData = await api.get(`/groups/${groupId}/members`);
      const member = membersData?.members?.find(m => m.id === memberId);
      if (!member) {
        alert('成员不存在');
        return;
      }

      const keywordsStr = Array.isArray(member.trigger_keywords) ? member.trigger_keywords.join(', ') : '';

      const bodyHtml = `
        <div class="form-grid">
          <div class="full">
            <div class="label">Bot</div>
            <input class="input" value="${escapeHtml(member.bot?.name || '')}" disabled />
          </div>
          <div class="full">
            <div class="label">角色</div>
            <input class="input" id="member-edit-role" value="${escapeHtml(member.role || '')}" />
          </div>
          <div class="full">
            <div class="label">触发词（逗号分隔）</div>
            <input class="input" id="member-edit-keywords" value="${escapeHtml(keywordsStr)}" />
          </div>
          <div>
            <div class="label">优先级</div>
            <input class="input" id="member-edit-priority" type="number" value="${member.priority || 0}" />
          </div>
        </div>
      `;

      el('modal-title').textContent = '编辑成员';
      el('modal-body').innerHTML = bodyHtml;
      el('modal-footer').innerHTML = `
        <button class="btn btn-secondary" onclick="Groups.refreshEditGroup('${groupId}')">取消</button>
        <button class="btn btn-primary" onclick="Groups.submitEditMember('${groupId}', '${memberId}')">保存</button>
        <button class="btn btn-danger" onclick="Groups.removeMember('${groupId}', '${memberId}')">删除</button>
      `;
    } catch (error) {
      alert('加载成员详情失败: ' + error.message);
    }
  }

  async function submitEditMember(groupId, memberId) {
    try {
      const role = el('member-edit-role')?.value?.trim() || null;
      const keywordsStr = el('member-edit-keywords')?.value?.trim() || '';
      const priority = parseInt(el('member-edit-priority')?.value || '0');

      const trigger_keywords = keywordsStr ? keywordsStr.split(',').map(k => k.trim()).filter(k => k) : [];

      await api.put(`/groups/${groupId}/members/${memberId}`, {
        role,
        trigger_keywords,
        priority
      });

      refreshEditGroup(groupId);
      alert('成员已更新');
    } catch (error) {
      alert('更新失败: ' + error.message);
    }
  }

  async function removeMember(groupId, memberId) {
    if (!confirm('确定要删除这个成员吗？')) return;
    try {
      await api.delete(`/groups/${groupId}/members/${memberId}`);
      refreshEditGroup(groupId);
      alert('成员已删除');
    } catch (error) {
      alert('删除失败: ' + error.message);
    }
  }

  async function refreshEditGroup(groupId) {
    await openEditGroup(groupId);
  }

  function escapeHtml(str) {
    return String(str || '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;');
  }

  return {
    openEditGroup,
    openEditMembers: openEditGroup,
    saveGroup,
    confirmDeleteGroup,
    addMember,
    submitAddMember,
    editMember,
    submitEditMember,
    removeMember,
    refreshEditGroup
  };
})();

window.Groups = Groups;
