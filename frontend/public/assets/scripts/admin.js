// 导航菜单
const navItems = document.querySelectorAll('.nav-item');
const pages = {
    'dashboard': document.getElementById('page-dashboard'),
    'sop': document.getElementById('page-sop'),
    'groups': document.getElementById('page-groups'),
    'bots': document.getElementById('page-bots')
};

navItems.forEach(item => {
    item.addEventListener('click', () => {
        const page = item.dataset.page;

        // 更新导航
        navItems.forEach(i => i.classList.remove('active'));
        item.classList.add('active');

        // 切换页面
        Object.values(pages).forEach(p => {
            if (p) p.style.display = 'none';
        });

        if (pages[page]) {
            pages[page].style.display = 'block';
        }
    });
});

// =====================
// BOTS - CRUD Management
// =====================
const Bots = (() => {
    const LS_KEY = "bot_admin_bots_v1";

    /**
     * @type {Array<{id:string,name:string,channel:string,status:string,lastHeartbeat:number,owner:string,notes?:string,createdAt:number,updatedAt:number}>}
     */
    let bots = [];

    const el = (id) => document.getElementById(id);

    function now() { return Date.now(); }
    function uid() { return "bot_" + Math.random().toString(16).slice(2) + "_" + Date.now().toString(16); }

    // =====================
    // Data Layer
    // =====================
    function load() {
        try {
            const raw = localStorage.getItem(LS_KEY);
            bots = raw ? JSON.parse(raw) : seed();
        } catch {
            bots = seed();
        }
        save();
    }

    function save() {
        localStorage.setItem(LS_KEY, JSON.stringify(bots));
    }

    function seed() {
        const t = now();
        return [
            {
                id: uid(),
                name: "飞书-工单助手",
                channel: "feishu",
                status: "running",
                lastHeartbeat: t - 60_000,
                owner: "默认",
                notes: "SOP：提醒/回访",
                createdAt: t - 86400000,
                updatedAt: t - 60000
            },
            {
                id: uid(),
                name: "WhatsApp-线索助手",
                channel: "whatsapp",
                status: "paused",
                lastHeartbeat: t - 3_600_000,
                owner: "默认",
                notes: "用于海外线索",
                createdAt: t - 86400000 * 2,
                updatedAt: t - 3600000
            }
        ];
    }

    // =====================
    // Utilities
    // =====================
    function formatTime(ts) {
        if (!ts) return "-";
        const d = new Date(ts);
        const pad = (n) => String(n).padStart(2, "0");
        return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
    }

    function humanAgo(ts) {
        if (!ts) return "-";
        const diff = Math.max(0, now() - ts);
        const m = Math.floor(diff / 60000);
        if (m < 1) return "刚刚";
        if (m < 60) return `${m} 分钟前`;
        const h = Math.floor(m / 60);
        if (h < 24) return `${h} 小时前`;
        const d = Math.floor(h / 24);
        return `${d} 天前`;
    }

    function channelName(c) {
        return c === "feishu" ? "飞书" : c === "whatsapp" ? "WhatsApp" : c === "webhook" ? "Webhook" : c;
    }

    function statusName(s) {
        return s === "running" ? "运行中" : s === "paused" ? "已暂停" : s === "error" ? "异常" : s;
    }

    function escapeHtml(str) {
        return String(str)
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll('"', "&quot;")
            .replaceAll("'", "&#039;");
    }

    // =====================
    // Components
    // =====================
    function toast(title, desc = "", ms = 2600) {
        const stack = el("toast-stack");
        if (!stack) return;
        const node = document.createElement("div");
        node.className = "toast";
        node.innerHTML = `<div class="toast-title">${escapeHtml(title)}</div>${desc ? `<div class="toast-desc">${escapeHtml(desc)}</div>` : ""}`;
        stack.appendChild(node);
        setTimeout(() => {
            node.style.opacity = "0";
            node.style.transform = "translateX(100%)";
            setTimeout(() => node.remove(), 300);
        }, ms);
    }

    function openModal({ title, bodyHtml, footerButtons }) {
        el("modal-title").textContent = title || "提示";
        el("modal-body").innerHTML = bodyHtml || "";
        const footer = el("modal-footer");
        footer.innerHTML = "";
        (footerButtons || []).forEach(btn => {
            const b = document.createElement("button");
            b.className = btn.className || "btn btn-secondary";
            b.textContent = btn.text;
            b.addEventListener("click", btn.onClick);
            footer.appendChild(b);
        });
        el("modal-mask").style.display = "flex";
    }

    function closeModal() {
        el("modal-mask").style.display = "none";
        el("modal-body").innerHTML = "";
        el("modal-footer").innerHTML = "";
    }

    // =====================
    // Filters & Data
    // =====================
    function getFilters() {
        const q = (el("bots-search")?.value || "").trim().toLowerCase();
        const status = el("bots-filter-status")?.value || "";
        const channel = el("bots-filter-channel")?.value || "";
        return { q, status, channel };
    }

    function filteredBots() {
        const { q, status, channel } = getFilters();
        return bots.filter(b => {
            const hitQ = !q || [b.name, b.owner, b.notes].filter(Boolean).join(" ").toLowerCase().includes(q);
            const hitS = !status || b.status === status;
            const hitC = !channel || b.channel === channel;
            return hitQ && hitS && hitC;
        }).sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
    }

    // =====================
    // Rendering
    // =====================
    function render() {
        const tbody = el("bots-tbody");
        const empty = el("bots-empty");
        const count = el("bots-count");
        if (!tbody) return;

        const list = filteredBots();
        if (count) count.textContent = `${list.length} 个机器人`;

        tbody.innerHTML = "";
        if (list.length === 0) {
            if (empty) empty.style.display = "block";
            return;
        } else {
            if (empty) empty.style.display = "none";
        }

        for (const b of list) {
            const tr = document.createElement("tr");
            tr.innerHTML = `
                <td>
                    <div style="font-weight: 700;">${escapeHtml(b.name)}</div>
                    <div class="muted" style="font-size: 12px; margin-top: 4px;">${escapeHtml(b.notes || "")}</div>
                </td>
                <td><span class="chip">${escapeHtml(channelName(b.channel))}</span></td>
                <td>
                    <span class="chip">
                        <span class="dot ${escapeHtml(b.status)}"></span>
                        ${escapeHtml(statusName(b.status))}
                    </span>
                </td>
                <td>
                    <div style="font-weight: 700;">${escapeHtml(humanAgo(b.lastHeartbeat))}</div>
                    <div class="muted" style="font-size: 12px; margin-top: 4px;">${escapeHtml(formatTime(b.lastHeartbeat))}</div>
                </td>
                <td>${escapeHtml(b.owner || "-")}</td>
                <td>
                    <div style="display: flex; gap: 8px; flex-wrap: wrap;">
                        <button class="btn btn-ghost btn-small" data-act="edit" data-id="${b.id}">编辑</button>
                        <button class="btn btn-ghost btn-small" data-act="toggle" data-id="${b.id}">${b.status === "running" ? "暂停" : "启用"}</button>
                        <button class="btn btn-danger btn-small" data-act="delete" data-id="${b.id}">删除</button>
                    </div>
                </td>
            `;
            tbody.appendChild(tr);
        }

        tbody.querySelectorAll("button[data-act]").forEach(btn => {
            btn.addEventListener("click", () => {
                const id = btn.getAttribute("data-id");
                const act = btn.getAttribute("data-act");
                if (act === "edit") openEdit(id);
                if (act === "toggle") toggleStatus(id);
                if (act === "delete") confirmDelete(id);
            });
        });
    }

    // =====================
    // Forms & CRUD
    // =====================
    function openCreate() {
        openModal({
            title: "新建机器人",
            bodyHtml: formHtml({}),
            footerButtons: [
                { text: "取消", className: "btn btn-secondary", onClick: closeModal },
                { text: "创建", className: "btn btn-primary", onClick: () => submitForm("create") }
            ]
        });
    }

    function openEdit(id) {
        const b = bots.find(x => x.id === id);
        if (!b) return;
        openModal({
            title: "编辑机器人",
            bodyHtml: formHtml(b),
            footerButtons: [
                { text: "取消", className: "btn btn-secondary", onClick: closeModal },
                { text: "保存", className: "btn btn-primary", onClick: () => submitForm("edit", id) }
            ]
        });
    }

    function formHtml(b) {
        return `
            <div class="form-grid">
                <div class="full">
                    <div class="label">机器人名称</div>
                    <input class="input" id="bot-form-name" value="${escapeHtml(b.name || "")}" placeholder="例如：飞书-工单助手" />
                </div>

                <div>
                    <div class="label">渠道</div>
                    <select class="select" id="bot-form-channel">
                        <option value="feishu" ${b.channel === "feishu" ? "selected" : ""}>飞书</option>
                        <option value="whatsapp" ${b.channel === "whatsapp" ? "selected" : ""}>WhatsApp</option>
                        <option value="webhook" ${b.channel === "webhook" ? "selected" : ""}>Webhook</option>
                    </select>
                </div>

                <div>
                    <div class="label">状态</div>
                    <select class="select" id="bot-form-status">
                        <option value="running" ${b.status === "running" ? "selected" : ""}>运行中</option>
                        <option value="paused" ${b.status === "paused" ? "selected" : ""}>已暂停</option>
                        <option value="error" ${b.status === "error" ? "selected" : ""}>异常</option>
                    </select>
                </div>

                <div>
                    <div class="label">负责人</div>
                    <input class="input" id="bot-form-owner" value="${escapeHtml(b.owner || "")}" placeholder="例如：张三" />
                </div>

                <div>
                    <div class="label">最近心跳（可不填）</div>
                    <input class="input" id="bot-form-heartbeat" value="${b.lastHeartbeat ? escapeHtml(formatTime(b.lastHeartbeat)) : ""}" placeholder="例如：2026-02-16 13:20" />
                </div>

                <div class="full">
                    <div class="label">备注</div>
                    <textarea class="textarea" id="bot-form-notes" placeholder="写清楚这个机器人做什么、面向谁、关键 SOP">${escapeHtml(b.notes || "")}</textarea>
                </div>
            </div>
            <div class="muted" style="margin-top: 10px; font-size: 12px;">
                提示：MVP 阶段先用本地存储模拟，后续把创建/编辑/删除替换为 API 调用即可。
            </div>
        `;
    }

    function parseHeartbeat(str) {
        const s = (str || "").trim();
        if (!s) return 0;
        const m = s.match(/^(\d{4})-(\d{2})-(\d{2})\s+(\d{2}):(\d{2})$/);
        if (!m) return 0;
        const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), Number(m[4]), Number(m[5]));
        const ts = d.getTime();
        return Number.isFinite(ts) ? ts : 0;
    }

    function submitForm(mode, id) {
        const name = el("bot-form-name")?.value.trim();
        const channel = el("bot-form-channel")?.value;
        const status = el("bot-form-status")?.value;
        const owner = el("bot-form-owner")?.value.trim();
        const heartbeat = parseHeartbeat(el("bot-form-heartbeat")?.value || "");
        const notes = el("bot-form-notes")?.value || "";

        if (!name) return toast("请填写机器人名称");
        if (!channel) return toast("请选择渠道");

        if (mode === "create") {
            const t = now();
            bots.push({
                id: uid(),
                name,
                channel,
                status: status || "paused",
                owner: owner || "未指定",
                notes,
                lastHeartbeat: heartbeat || 0,
                createdAt: t,
                updatedAt: t
            });
            save();
            closeModal();
            render();
            toast("已创建机器人", name);
        }

        if (mode === "edit") {
            const b = bots.find(x => x.id === id);
            if (!b) return;
            b.name = name;
            b.channel = channel;
            b.status = status || b.status;
            b.owner = owner || b.owner;
            b.notes = notes;
            b.lastHeartbeat = heartbeat || b.lastHeartbeat || 0;
            b.updatedAt = now();
            save();
            closeModal();
            render();
            toast("已保存", name);
        }
    }

    function toggleStatus(id) {
        const b = bots.find(x => x.id === id);
        if (!b) return;
        b.status = b.status === "running" ? "paused" : "running";
        b.updatedAt = now();
        save();
        render();
        toast("状态已更新", `${b.name} → ${statusName(b.status)}`);
    }

    function confirmDelete(id) {
        const b = bots.find(x => x.id === id);
        if (!b) return;

        openModal({
            title: "确认删除",
            bodyHtml: `
                <div style="font-weight: 700;">你确定要删除「${escapeHtml(b.name)}」吗？</div>
                <div class="muted" style="margin-top: 8px;">此操作不可撤销（MVP 本地存储）。</div>
            `,
            footerButtons: [
                { text: "取消", className: "btn btn-secondary", onClick: closeModal },
                {
                    text: "删除",
                    className: "btn btn-danger",
                    onClick: () => {
                        bots = bots.filter(x => x.id !== id);
                        save();
                        closeModal();
                        render();
                        toast("已删除", b.name);
                    }
                }
            ]
        });
    }

    // =====================
    // Import/Export
    // =====================
    function exportJson() {
        const data = JSON.stringify(bots, null, 2);
        const blob = new Blob([data], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `bots-export-${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
        toast("已导出机器人配置");
    }

    function importJson(file) {
        const reader = new FileReader();
        reader.onload = () => {
            try {
                const arr = JSON.parse(String(reader.result || "[]"));
                if (!Array.isArray(arr)) throw new Error("not array");
                const map = new Map(bots.map(b => [b.id, b]));
                for (const item of arr) {
                    if (item && item.id) map.set(item.id, item);
                }
                bots = Array.from(map.values());
                save();
                render();
                toast("导入成功", `共 ${bots.length} 个机器人`);
            } catch {
                toast("导入失败", "文件格式不正确");
            }
        };
        reader.readAsText(file);
    }

    // =====================
    // Event Bindings
    // =====================
    function bindEvents() {
        // Modal controls
        el("modal-close")?.addEventListener("click", closeModal);
        el("modal-mask")?.addEventListener("click", (e) => {
            if (e.target && e.target.id === "modal-mask") closeModal();
        });
        document.addEventListener("keydown", (e) => {
            if (e.key === "Escape") closeModal();
        });

        // Create buttons
        el("btn-bot-create")?.addEventListener("click", openCreate);
        el("btn-bot-create-empty")?.addEventListener("click", openCreate);

        // Filters
        ["bots-search", "bots-filter-status", "bots-filter-channel"].forEach(id => {
            el(id)?.addEventListener("input", render);
            el(id)?.addEventListener("change", render);
        });

        // Import/Export
        el("btn-bots-export")?.addEventListener("click", exportJson);
        el("bots-import-input")?.addEventListener("change", (e) => {
            const f = e.target.files && e.target.files[0];
            if (f) importJson(f);
            e.target.value = "";
        });
    }

    // =====================
    // Initialize
    // =====================
    function init() {
        load();
        bindEvents();
        render();
    }

    return { init, render };
})();

// =====================
// Bootstrap
// =====================
document.addEventListener("DOMContentLoaded", () => {
    Bots.init();
});
