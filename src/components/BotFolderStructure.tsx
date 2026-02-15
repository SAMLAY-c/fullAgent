import React, { useState } from 'react';
import {
  Folder,
  FolderOpen,
  MessageSquare,
  Plus,
  ChevronRight,
  ChevronDown,
  Settings,
  Lightbulb,
  BookOpen,
  Trash2,
  Upload,
  X
} from 'lucide-react';

// ==================== 类型定义 ====================
interface KnowledgeFile {
  id: string;
  name: string;
  size: string;
  uploadedAt: string;
}

interface MemoryPoint {
  id: string;
  content: string;
  timestamp: string;
  type: 'key' | 'context';
}

interface TopicBranch {
  id: string;
  title: string;
  expanded: boolean;
  memories: MemoryPoint[];
  knowledge: KnowledgeFile[];
  systemPrompt: string;
}

interface BotAgent {
  id: string;
  name: string;
  icon: string;
  color: string;
  systemPrompt: string;
  expanded: boolean;
  topics: TopicBranch[];
}

interface GroupChat {
  id: string;
  name: string;
  icon: string;
  color: string;
  members: string[];
  systemPrompt: string;
  topics: TopicBranch[];
}

// ==================== 主题 ====================
const theme = {
  colors: {
    bg: '#FAF9F6',
    surface: '#FFFFFF',
    surfaceSoft: '#F8F6F2',
    primary: '#9B8BF5',
    primaryLight: '#B8A5E8',
    primaryDark: '#7C6FCC',
    secondary: '#90EE90',
    accent: '#FFB6C1',
    warning: '#FFD966',
    textPrimary: '#2D3748',
    textSecondary: '#718096',
    textMuted: '#A0AEC0',
    border: 'rgba(0, 0, 0, 0.06)',
  },
  shadows: {
    sm: '0 2px 8px rgba(148, 163, 184, 0.1)',
    md: '0 4px 16px rgba(148, 163, 184, 0.12)',
    soft: '8px 8px 16px rgba(163, 177, 198, 0.1), -8px -8px 16px rgba(255, 255, 255, 0.8)',
  },
  borderRadius: {
    sm: '8px',
    md: '12px',
    lg: '16px',
    xl: '20px',
  }
};

// ==================== 知识库面板 ====================
const KnowledgePanel: React.FC<{
  files: KnowledgeFile[];
  onUpload: (file: File) => void;
  onDelete: (id: string) => void;
}> = ({ files, onUpload, onDelete }) => {
  const [dragOver, setDragOver] = useState(false);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) onUpload(file);
  };

  return (
    <div className="knowledge-panel">
      <div
        className={`upload-zone ${dragOver ? 'drag-over' : ''}`}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => document.getElementById('file-input')?.click()}
      >
        <Upload size={24} />
        <p>拖拽文件到这里或点击上传</p>
        <input
          id="file-input"
          type="file"
          hidden
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) onUpload(file);
          }}
        />
      </div>

      <div className="file-list">
        {files.map(file => (
          <div key={file.id} className="file-item">
            <BookOpen size={16} />
            <div className="file-info">
              <span className="file-name">{file.name}</span>
              <span className="file-meta">{file.size} · {file.uploadedAt}</span>
            </div>
            <button
              className="icon-btn danger"
              onClick={() => onDelete(file.id)}
            >
              <Trash2 size={14} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

// ==================== 记忆面板 ====================
const MemoryPanel: React.FC<{
  memories: MemoryPoint[];
}> = ({ memories }) => {
  return (
    <div className="memory-panel">
      <div className="memory-section">
        <h4>💡 关键要点</h4>
        <div className="memory-list">
          {memories.filter(m => m.type === 'key').map(memory => (
            <div key={memory.id} className="memory-item key">
              <Lightbulb size={14} />
              <span>{memory.content}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="memory-section">
        <h4>🧠 上下文记忆</h4>
        <div className="memory-list">
          {memories.filter(m => m.type === 'context').map(memory => (
            <div key={memory.id} className="memory-item context">
              <MessageSquare size={14} />
              <span>{memory.content}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// ==================== 设置面板 ====================
const SettingsPanel: React.FC<{
  systemPrompt: string;
  onSave: (prompt: string) => void;
}> = ({ systemPrompt, onSave }) => {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(systemPrompt);

  return (
    <div className="settings-panel">
      <h4>⚙️ 系统提示词</h4>
      {!editing ? (
        <div className="prompt-display">
          <p>{systemPrompt || '暂无系统提示词'}</p>
          <button
            className="btn-secondary"
            onClick={() => {
              setValue(systemPrompt);
              setEditing(true);
            }}
          >
            编辑
          </button>
        </div>
      ) : (
        <div className="prompt-edit">
          <textarea
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="输入系统提示词..."
            rows={6}
          />
          <div className="edit-actions">
            <button
              className="btn-primary"
              onClick={() => {
                onSave(value);
                setEditing(false);
              }}
            >
              保存
            </button>
            <button
              className="btn-secondary"
              onClick={() => setEditing(false)}
            >
              取消
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// ==================== 话题分支组件 ====================
const TopicBranch: React.FC<{
  topic: TopicBranch;
  onUpdate: (updates: Partial<TopicBranch>) => void;
  onDelete: () => void;
  level: number;
}> = ({ topic, onUpdate, onDelete, level }) => {
  const [activeTab, setActiveTab] = useState<'chat' | 'memory' | 'knowledge' | 'settings'>('chat');
  const [files, setFiles] = useState<KnowledgeFile[]>(topic.knowledge);

  const handleFileUpload = (file: File) => {
    const newFile: KnowledgeFile = {
      id: Date.now().toString(),
      name: file.name,
      size: `${(file.size / 1024).toFixed(1)} KB`,
      uploadedAt: new Date().toLocaleDateString()
    };
    setFiles([...files, newFile]);
    onUpdate({ knowledge: [...files, newFile] });
  };

  const handleFileDelete = (id: string) => {
    const updated = files.filter(f => f.id !== id);
    setFiles(updated);
    onUpdate({ knowledge: updated });
  };

  return (
    <div
      className="topic-branch"
      style={{ marginLeft: `${level * 20}px` }}
    >
      <div className="topic-header">
        <MessageSquare size={16} className="topic-icon" />
        <span className="topic-title">{topic.title}</span>
        <button
          className="icon-btn danger"
          onClick={onDelete}
          title="删除话题"
        >
          <X size={14} />
        </button>
      </div>

      <div className="topic-tabs">
        <button
          className={`tab-btn ${activeTab === 'chat' ? 'active' : ''}`}
          onClick={() => setActiveTab('chat')}
        >
          💬
        </button>
        <button
          className={`tab-btn ${activeTab === 'memory' ? 'active' : ''}`}
          onClick={() => setActiveTab('memory')}
        >
          🧠
        </button>
        <button
          className={`tab-btn ${activeTab === 'knowledge' ? 'active' : ''}`}
          onClick={() => setActiveTab('knowledge')}
        >
          📚
        </button>
        <button
          className={`tab-btn ${activeTab === 'settings' ? 'active' : ''}`}
          onClick={() => setActiveTab('settings')}
        >
          ⚙️
        </button>
      </div>

      <div className="topic-content">
        {activeTab === 'chat' && (
          <div className="chat-preview">
            <p className="chat-hint">开始对话...</p>
          </div>
        )}
        {activeTab === 'memory' && <MemoryPanel memories={topic.memories} />}
        {activeTab === 'knowledge' && (
          <KnowledgePanel
            files={files}
            onUpload={handleFileUpload}
            onDelete={handleFileDelete}
          />
        )}
        {activeTab === 'settings' && (
          <SettingsPanel
            systemPrompt={topic.systemPrompt}
            onSave={(prompt) => onUpdate({ systemPrompt: prompt })}
          />
        )}
      </div>
    </div>
  );
};

// ==================== Bot Agent 卡片 ====================
const BotAgentCard: React.FC<{
  bot: BotAgent;
  onUpdate: (updates: Partial<BotAgent>) => void;
  onAddTopic: () => void;
}> = ({ bot, onUpdate, onAddTopic }) => {
  return (
    <div className="bot-card">
      <div
        className="bot-header"
        style={{ borderBottomColor: bot.color }}
      >
        <button
          className="expand-btn"
          onClick={() => onUpdate({ expanded: !bot.expanded })}
        >
          {bot.expanded ? <FolderOpen size={20} /> : <Folder size={20} />}
        </button>
        <div className="bot-avatar" style={{ background: bot.color }}>
          <span>{bot.icon}</span>
        </div>
        <div className="bot-info">
          <h3 className="bot-name">{bot.name}</h3>
          <p className="bot-meta">{bot.topics.length} 个话题</p>
        </div>
        <button
          className="add-topic-btn"
          onClick={onAddTopic}
          title="新建话题"
        >
          <Plus size={18} />
          <span>新建话题</span>
        </button>
      </div>

      {bot.expanded && (
        <div className="bot-topics">
          {/* Bot 级别的系统提示词入口 */}
          <div className="bot-system-prompt-hint">
            <Settings size={14} />
            <span>所有话题共享系统提示词</span>
            <button className="text-btn">查看</button>
          </div>

          {bot.topics.map(topic => (
            <TopicBranch
              key={topic.id}
              topic={topic}
              level={1}
              onUpdate={(updates) => {
                const updatedTopics = bot.topics.map(t =>
                  t.id === topic.id ? { ...t, ...updates } : t
                );
                onUpdate({ topics: updatedTopics });
              }}
              onDelete={() => {
                onUpdate({ topics: bot.topics.filter(t => t.id !== topic.id) });
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
};

// ==================== 主组件 ====================
const BotFolderStructure: React.FC = () => {
  // 示例数据
  const [bots, setBots] = useState<BotAgent[]>([
    {
      id: '1',
      name: '工作伙伴',
      icon: '💼',
      color: 'linear-gradient(135deg, #E8E4FF 0%, #F0ECFF 100%)',
      systemPrompt: '你是一个专业的工作助手，专注于提高用户的工作效率和任务管理能力。',
      expanded: true,
      topics: [
        {
          id: '1-1',
          title: '项目规划讨论',
          expanded: true,
          memories: [
            { id: 'm1', content: '用户正在筹备一个新的产品发布项目', timestamp: '2024-01-15', type: 'key' },
            { id: 'm2', content: '偏好使用敏捷开发方法', timestamp: '2024-01-15', type: 'context' }
          ],
          knowledge: [
            { id: 'k1', name: '项目需求文档.pdf', size: '2.4 MB', uploadedAt: '2024-01-10' }
          ],
          systemPrompt: ''
        }
      ]
    },
    {
      id: '2',
      name: '生活小助手',
      icon: '🌿',
      color: 'linear-gradient(135deg, #E8FFE8 0%, #F0FFF0 100%)',
      systemPrompt: '你是一个贴心的生活助手，专注于健康饮食、运动建议和生活小技巧。',
      expanded: false,
      topics: []
    },
    {
      id: '3',
      name: '心灵朋友',
      icon: '💜',
      color: 'linear-gradient(135deg, #FFE8EC 0%, #FFF0F3 100%)',
      systemPrompt: '你是一个温暖的心灵朋友，专注于提供情感支持和关系建议。',
      expanded: false,
      topics: []
    }
  ]);

  const [groupChats, setGroupChats] = useState<GroupChat[]>([
    {
      id: 'g1',
      name: '创业顾问团',
      icon: '🎯',
      color: 'linear-gradient(135deg, #E8E4FF 0%, #F0ECFF 100%)',
      members: ['💼', '💻', '📈'],
      systemPrompt: '三位专家Bot协同工作，从战略、技术、市场多角度提供建议。',
      topics: []
    }
  ]);

  const addNewTopic = (botId: string) => {
    setBots(bots.map(bot => {
      if (bot.id === botId) {
        const newTopic: TopicBranch = {
          id: `t-${Date.now()}`,
          title: '新话题',
          expanded: true,
          memories: [],
          knowledge: [],
          systemPrompt: bot.systemPrompt
        };
        return { ...bot, topics: [...bot.topics, newTopic], expanded: true };
      }
      return bot;
    }));
  };

  const addNewGroupChat = () => {
    const newGroup: GroupChat = {
      id: `g-${Date.now()}`,
      name: '新群聊',
      icon: '👥',
      color: 'linear-gradient(135deg, #E8E4FF 0%, #F0ECFF 100%)',
      members: [],
      systemPrompt: '',
      topics: []
    };
    setGroupChats([...groupChats, newGroup]);
  };

  return (
    <div className="bot-folder-structure">
      <style>{`
        .bot-folder-structure {
          font-family: 'Nunito Sans', -apple-system, sans-serif;
          background: ${theme.colors.bg};
          padding: 24px;
          border-radius: ${theme.borderRadius.xl};
        }

        /* 添加按钮区 */
        .add-buttons {
          display: flex;
          gap: 12px;
          margin-bottom: 24px;
        }

        .add-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 12px 20px;
          border-radius: ${theme.borderRadius.md};
          border: 2px dashed ${theme.colors.primary};
          background: transparent;
          color: ${theme.colors.primary};
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .add-btn:hover {
          background: ${theme.colors.primary}15;
          transform: translateY(-2px);
          box-shadow: ${theme.shadows.md};
        }

        /* Bot 卡片 */
        .bot-card {
          background: linear-gradient(145deg, #ffffff, #f5f3ff);
          box-shadow: ${theme.shadows.soft};
          border-radius: ${theme.borderRadius.lg};
          margin-bottom: 16px;
          overflow: hidden;
          transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .bot-card:hover {
          box-shadow: 12px 12px 24px rgba(163, 177, 198, 0.15),
                      -12px -12px 24px rgba(255, 255, 255, 0.9);
        }

        .bot-header {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 16px;
          border-bottom: 2px solid transparent;
          transition: border-color 0.3s;
        }

        .expand-btn {
          width: 36px;
          height: 36px;
          border-radius: ${theme.borderRadius.sm};
          border: none;
          background: ${theme.colors.surfaceSoft};
          color: ${theme.colors.textSecondary};
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s;
        }

        .expand-btn:hover {
          background: ${theme.colors.primary}20;
          color: ${theme.colors.primary};
        }

        .bot-avatar {
          width: 48px;
          height: 48px;
          border-radius: ${theme.borderRadius.md};
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 24px;
          box-shadow: ${theme.shadows.sm};
        }

        .bot-info {
          flex: 1;
        }

        .bot-name {
          font-size: 16px;
          font-weight: 600;
          color: ${theme.colors.textPrimary};
          margin: 0 0 4px 0;
        }

        .bot-meta {
          font-size: 13px;
          color: ${theme.colors.textSecondary};
          margin: 0;
        }

        .add-topic-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 8px 14px;
          border-radius: ${theme.borderRadius.sm};
          border: 1px solid ${theme.colors.border};
          background: ${theme.colors.surface};
          color: ${theme.colors.textSecondary};
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }

        .add-topic-btn:hover {
          background: ${theme.colors.primary}10;
          border-color: ${theme.colors.primary};
          color: ${theme.colors.primary};
        }

        .bot-topics {
          padding: 12px 16px 16px;
          background: ${theme.colors.surfaceSoft}40;
        }

        .bot-system-prompt-hint {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 14px;
          border-radius: ${theme.borderRadius.sm};
          background: ${theme.colors.surface};
          border: 1px solid ${theme.colors.border};
          margin-bottom: 12px;
          font-size: 13px;
          color: ${theme.colors.textSecondary};
        }

        .text-btn {
          margin-left: auto;
          padding: 4px 10px;
          border: none;
          background: transparent;
          color: ${theme.colors.primary};
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          border-radius: 4px;
        }

        .text-btn:hover {
          background: ${theme.colors.primary}15;
        }

        /* 话题分支 */
        .topic-branch {
          background: ${theme.colors.surface};
          border-radius: ${theme.borderRadius.md};
          padding: 12px;
          margin-top: 8px;
          border: 1px solid ${theme.colors.border};
          transition: all 0.2s;
        }

        .topic-branch:hover {
          box-shadow: ${theme.shadows.sm};
        }

        .topic-header {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 12px;
        }

        .topic-icon {
          color: ${theme.colors.primary};
        }

        .topic-title {
          flex: 1;
          font-size: 14px;
          font-weight: 500;
          color: ${theme.colors.textPrimary};
        }

        .icon-btn {
          width: 28px;
          height: 28px;
          border-radius: 6px;
          border: none;
          background: transparent;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s;
        }

        .icon-btn:hover {
          background: ${theme.colors.surfaceSoft};
        }

        .icon-btn.danger:hover {
          background: #fee;
          color: #e53e3e;
        }

        .topic-tabs {
          display: flex;
          gap: 6px;
          margin-bottom: 12px;
          background: ${theme.colors.surfaceSoft};
          padding: 4px;
          border-radius: ${theme.borderRadius.sm};
        }

        .tab-btn {
          flex: 1;
          padding: 8px;
          border: none;
          background: transparent;
          border-radius: 6px;
          font-size: 14px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .tab-btn.active {
          background: ${theme.colors.surface};
          box-shadow: ${theme.shadows.sm};
        }

        .topic-content {
          min-height: 80px;
        }

        .chat-preview {
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 80px;
          background: ${theme.colors.surfaceSoft};
          border-radius: ${theme.borderRadius.sm};
        }

        .chat-hint {
          font-size: 13px;
          color: ${theme.colors.textMuted};
        }

        /* 知识库面板 */
        .knowledge-panel {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .upload-zone {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
          padding: 20px;
          border: 2px dashed ${theme.colors.border};
          border-radius: ${theme.borderRadius.sm};
          background: ${theme.colors.surfaceSoft};
          cursor: pointer;
          transition: all 0.2s;
        }

        .upload-zone:hover,
        .upload-zone.drag-over {
          border-color: ${theme.colors.primary};
          background: ${theme.colors.primary}10;
        }

        .upload-zone p {
          font-size: 13px;
          color: ${theme.colors.textSecondary};
          margin: 0;
        }

        .file-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .file-item {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 10px;
          border-radius: ${theme.borderRadius.sm};
          background: ${theme.colors.surface};
          border: 1px solid ${theme.colors.border};
        }

        .file-info {
          flex: 1;
          display: flex;
          flex-direction: column;
        }

        .file-name {
          font-size: 13px;
          font-weight: 500;
          color: ${theme.colors.textPrimary};
        }

        .file-meta {
          font-size: 11px;
          color: ${theme.colors.textMuted};
        }

        /* 记忆面板 */
        .memory-panel {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .memory-section h4 {
          font-size: 13px;
          font-weight: 600;
          color: ${theme.colors.textSecondary};
          margin: 0 0 8px 0;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .memory-list {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .memory-item {
          display: flex;
          align-items: flex-start;
          gap: 8px;
          padding: 8px 10px;
          border-radius: ${theme.borderRadius.sm};
          font-size: 13px;
          line-height: 1.5;
        }

        .memory-item.key {
          background: #FFF9E6;
          color: #D4A017;
        }

        .memory-item.context {
          background: ${theme.colors.surfaceSoft};
          color: ${theme.colors.textSecondary};
        }

        /* 设置面板 */
        .settings-panel {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .settings-panel h4 {
          font-size: 13px;
          font-weight: 600;
          color: ${theme.colors.textSecondary};
          margin: 0;
        }

        .prompt-display {
          padding: 12px;
          border-radius: ${theme.borderRadius.sm};
          background: ${theme.colors.surfaceSoft};
          border: 1px solid ${theme.colors.border};
        }

        .prompt-display p {
          font-size: 13px;
          line-height: 1.6;
          margin: 0 0 10px 0;
        }

        .prompt-edit textarea {
          width: 100%;
          padding: 10px;
          border-radius: ${theme.borderRadius.sm};
          border: 1px solid ${theme.colors.border};
          font-family: inherit;
          font-size: 13px;
          line-height: 1.5;
          resize: vertical;
        }

        .edit-actions {
          display: flex;
          gap: 8px;
          margin-top: 8px;
        }

        .btn-primary,
        .btn-secondary {
          padding: 8px 14px;
          border-radius: 6px;
          border: none;
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn-primary {
          background: ${theme.colors.primary};
          color: white;
        }

        .btn-primary:hover {
          background: ${theme.colors.primaryDark};
        }

        .btn-secondary {
          background: ${theme.colors.surface};
          border: 1px solid ${theme.colors.border};
          color: ${theme.colors.textSecondary};
        }

        .btn-secondary:hover {
          background: ${theme.colors.surfaceSoft};
        }

        /* 滚动条 */
        ::-webkit-scrollbar {
          width: 6px;
        }

        ::-webkit-scrollbar-track {
          background: transparent;
        }

        ::-webkit-scrollbar-thumb {
          background: rgba(155, 139, 245, 0.2);
          border-radius: 10px;
        }

        ::-webkit-scrollbar-thumb:hover {
          background: rgba(155, 139, 245, 0.3);
        }
      `}</style>

      {/* 添加按钮 */}
      <div className="add-buttons">
        <button className="add-btn" onClick={() => {
          const newBot: BotAgent = {
            id: `b-${Date.now()}`,
            name: '新Bot',
            icon: '🤖',
            color: 'linear-gradient(135deg, #E8E4FF 0%, #F0ECFF 100%)',
            systemPrompt: '',
            expanded: true,
            topics: []
          };
          setBots([...bots, newBot]);
        }}>
          <Plus size={18} />
          <span>添加单Bot</span>
        </button>
        <button className="add-btn" onClick={addNewGroupChat}>
          <Plus size={18} />
          <span>添加群聊</span>
        </button>
      </div>

      {/* Bot 列表 */}
      {bots.map(bot => (
        <BotAgentCard
          key={bot.id}
          bot={bot}
          onUpdate={(updates) => {
            setBots(bots.map(b => b.id === bot.id ? { ...b, ...updates } : b));
          }}
          onAddTopic={() => addNewTopic(bot.id)}
        />
      ))}

      {/* 群聊列表 */}
      {groupChats.map(group => (
        <div key={group.id} className="bot-card">
          <div className="bot-header" style={{ borderBottomColor: group.color }}>
            <Folder size={20} className="expand-btn" style={{ color: theme.colors.textSecondary }} />
            <div className="bot-avatar" style={{ background: group.color }}>
              <span>{group.icon}</span>
            </div>
            <div className="bot-info">
              <h3 className="bot-name">{group.name}</h3>
              <p className="bot-meta">{group.members.length} 个成员</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default BotFolderStructure;
