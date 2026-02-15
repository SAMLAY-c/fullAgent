import React, { useState } from 'react';
import {
  Folder,
  FolderOpen,
  MessageSquare,
  Plus,
  ChevronRight,
  Settings,
  Lightbulb,
  BookOpen,
  Trash2,
  Upload,
  X,
  Download,
  Search,
  Filter,
  Tag,
  Clock,
  FileText,
  Image,
  Film,
  Music,
  Archive,
  Eye,
  Edit3,
  Share2,
  Star,
  Lock,
  Unlock,
  Zap
} from 'lucide-react';

// ==================== 类型定义 ====================
interface KnowledgeFile {
  id: string;
  name: string;
  size: string;
  uploadedAt: string;
  type: 'pdf' | 'doc' | 'image' | 'video' | 'audio' | 'other';
  tags: string[];
  preview?: string;
}

interface MemoryPoint {
  id: string;
  content: string;
  timestamp: string;
  type: 'key' | 'context';
  importance: 'low' | 'medium' | 'high';
}

interface TopicBranch {
  id: string;
  title: string;
  expanded: boolean;
  starred: boolean;
  locked: boolean;
  memories: MemoryPoint[];
  knowledge: KnowledgeFile[];
  systemPrompt: string;
  createdAt: string;
  lastActivity: string;
}

interface BotAgent {
  id: string;
  name: string;
  icon: string;
  color: string;
  systemPrompt: string;
  expanded: boolean;
  topics: TopicBranch[];
  statistics: {
    totalConversations: number;
    totalMemories: number;
    lastActivity: string;
  };
}

interface GroupChat {
  id: string;
  name: string;
  icon: string;
  color: string;
  members: string[];
  systemPrompt: string;
  topics: TopicBranch[];
  statistics: {
    totalMessages: number;
    lastActivity: string;
  };
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
    danger: '#FF9999',
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
  },
};

// ==================== 文件类型图标 ====================
const getFileIcon = (type: KnowledgeFile['type']) => {
  const iconProps = { size: 16 };
  switch (type) {
    case 'pdf':
    case 'doc':
      return <FileText {...iconProps} />;
    case 'image':
      return <Image {...iconProps} />;
    case 'video':
      return <Film {...iconProps} />;
    case 'audio':
      return <Music {...iconProps} />;
    default:
      return <Archive {...iconProps} />;
  }
};

// ==================== 搜索和过滤组件 ====================
const SearchBar: React.FC<{
  query: string;
  onQueryChange: (query: string) => void;
  filters: { type?: string; tags?: string[] };
  onFilterChange: (filters: any) => void;
}> = ({ query, onQueryChange, filters, onFilterChange }) => {
  return (
    <div className="search-bar">
      <div className="search-input-wrapper">
        <Search size={18} className="search-icon" />
        <input
          type="text"
          placeholder="搜索文件、记忆..."
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
        />
      </div>
      <button
        className={`filter-btn ${filters.type ? 'active' : ''}`}
        onClick={() => onFilterChange({ ...filters, type: filters.type ? undefined : 'all' })}
      >
        <Filter size={16} />
        过滤
      </button>
    </div>
  );
};

// ==================== 增强版知识库面板 ====================
const KnowledgePanelEnhanced: React.FC<{
  files: KnowledgeFile[];
  onUpload: (file: File) => void;
  onDelete: (id: string) => void;
  onDownload: (id: string) => void;
  onPreview: (id: string) => void;
  onUpdateTags: (id: string, tags: string[]) => void;
}> = ({ files, onUpload, onDelete, onDownload, onPreview, onUpdateTags }) => {
  const [dragOver, setDragOver] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());

  const filteredFiles = files.filter(f =>
    f.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    f.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) onUpload(file);
  };

  const getFileType = (fileName: string): KnowledgeFile['type'] => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    if (['pdf', 'doc', 'docx', 'txt'].includes(ext || '')) return 'doc';
    if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext || '')) return 'image';
    if (['mp4', 'mov', 'avi'].includes(ext || '')) return 'video';
    if (['mp3', 'wav', 'ogg'].includes(ext || '')) return 'audio';
    if (ext === 'pdf') return 'pdf';
    return 'other';
  };

  return (
    <div className="knowledge-panel-enhanced">
      <SearchBar
        query={searchQuery}
        onQueryChange={setSearchQuery}
        filters={{}}
        onFilterChange={() => {}}
      />

      <div
        className={`upload-zone ${dragOver ? 'drag-over' : ''}`}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => document.getElementById('file-input')?.click()}
      >
        <Upload size={24} />
        <p>拖拽文件到这里或点击上传</p>
        <span className="upload-hint">支持 PDF、图片、视频、音频等格式</span>
        <input
          id="file-input"
          type="file"
          hidden
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) {
              onUpload({
                ...file,
                type: getFileType(file.name)
              } as any);
            }
          }}
        />
      </div>

      {selectedFiles.size > 0 && (
        <div className="bulk-actions">
          <span className="selected-count">{selectedFiles.size} 个文件已选中</span>
          <button className="btn-small danger">批量删除</button>
          <button className="btn-small">批量下载</button>
        </div>
      )}

      <div className="file-list-enhanced">
        {filteredFiles.map(file => (
          <div
            key={file.id}
            className={`file-item-enhanced ${selectedFiles.has(file.id) ? 'selected' : ''}`}
          >
            <input
              type="checkbox"
              checked={selectedFiles.has(file.id)}
              onChange={() => {
                const newSelected = new Set(selectedFiles);
                if (newSelected.has(file.id)) {
                  newSelected.delete(file.id);
                } else {
                  newSelected.add(file.id);
                }
                setSelectedFiles(newSelected);
              }}
            />
            <div className="file-icon-wrapper">
              {getFileIcon(file.type)}
            </div>
            <div className="file-info-enhanced">
              <span className="file-name">{file.name}</span>
              <div className="file-meta">
                <span>{file.size} · {file.uploadedAt}</span>
                {file.tags.length > 0 && (
                  <div className="file-tags">
                    {file.tags.map(tag => (
                      <span key={tag} className="tag">
                        <Tag size={10} />
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className="file-actions">
              <button
                className="icon-btn"
                onClick={() => onPreview(file.id)}
                title="预览"
              >
                <Eye size={14} />
              </button>
              <button
                className="icon-btn"
                onClick={() => onDownload(file.id)}
                title="下载"
              >
                <Download size={14} />
              </button>
              <button
                className="icon-btn danger"
                onClick={() => onDelete(file.id)}
                title="删除"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ==================== 增强版记忆面板 ====================
const MemoryPanelEnhanced: React.FC<{
  memories: MemoryPoint[];
  onAdd: (memory: Omit<MemoryPoint, 'id' | 'timestamp'>) => void;
  onEdit: (id: string, content: string) => void;
  onDelete: (id: string) => void;
  onToggleImportance: (id: string) => void;
}> = ({ memories, onAdd, onEdit, onDelete, onToggleImportance }) => {
  const [filter, setFilter] = useState<'all' | 'key' | 'context'>('all');
  const [sortBy, setSortBy] = useState<'date' | 'importance'>('date');

  const filteredMemories = memories
    .filter(m => filter === 'all' || m.type === filter)
    .sort((a, b) => {
      if (sortBy === 'importance') {
        const importanceOrder = { high: 0, medium: 1, low: 2 };
        return importanceOrder[a.importance] - importanceOrder[b.importance];
      }
      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    });

  return (
    <div className="memory-panel-enhanced">
      <div className="memory-filters">
        <button
          className={`filter-chip ${filter === 'all' ? 'active' : ''}`}
          onClick={() => setFilter('all')}
        >
          全部
        </button>
        <button
          className={`filter-chip ${filter === 'key' ? 'active' : ''}`}
          onClick={() => setFilter('key')}
        >
          💡 关键要点
        </button>
        <button
          className={`filter-chip ${filter === 'context' ? 'active' : ''}`}
          onClick={() => setFilter('context')}
        >
          💬 上下文
        </button>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as any)}
          className="sort-select"
        >
          <option value="date">按时间</option>
          <option value="importance">按重要性</option>
        </select>
      </div>

      <div className="memory-list-enhanced">
        {filteredMemories.map(memory => (
          <div
            key={memory.id}
            className={`memory-item-enhanced ${memory.importance} ${memory.type}`}
          >
            <div className="memory-icon">
              {memory.type === 'key' ? <Lightbulb size={14} /> : <MessageSquare size={14} />}
            </div>
            <div className="memory-content-wrapper">
              <p className="memory-content-enhanced">{memory.content}</p>
              <div className="memory-meta-enhanced">
                <span className="memory-time">
                  <Clock size={12} />
                  {memory.timestamp}
                </span>
                <button
                  className="importance-btn"
                  onClick={() => onToggleImportance(memory.id)}
                  title={memory.importance}
                >
                  <Star
                    size={12}
                    fill={memory.importance === 'high' ? 'currentColor' : 'none'}
                  />
                </button>
              </div>
            </div>
            <div className="memory-actions">
              <button
                className="icon-btn"
                onClick={() => onEdit(memory.id, memory.content)}
                title="编辑"
              >
                <Edit3 size={14} />
              </button>
              <button
                className="icon-btn danger"
                onClick={() => onDelete(memory.id)}
                title="删除"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>

      <button className="add-memory-btn">
        <Plus size={16} />
        添加记忆
      </button>
    </div>
  );
};

// ==================== 增强版设置面板 ====================
const SettingsPanelEnhanced: React.FC<{
  systemPrompt: string;
  onSave: (prompt: string) => void;
  onExport: () => void;
  onShare: () => void;
  isLocked: boolean;
  onToggleLock: () => void;
}> = ({ systemPrompt, onSave, onExport, onShare, isLocked, onToggleLock }) => {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(systemPrompt);
  const [activeTab, setActiveTab] = useState<'prompt' | 'advanced' | 'backup'>('prompt');

  return (
    <div className="settings-panel-enhanced">
      <div className="settings-tabs">
        <button
          className={`tab ${activeTab === 'prompt' ? 'active' : ''}`}
          onClick={() => setActiveTab('prompt')}
        >
          <MessageSquare size={14} />
          提示词
        </button>
        <button
          className={`tab ${activeTab === 'advanced' ? 'active' : ''}`}
          onClick={() => setActiveTab('advanced')}
        >
          <Zap size={14} />
          高级
        </button>
        <button
          className={`tab ${activeTab === 'backup' ? 'active' : ''}`}
          onClick={() => setActiveTab('backup')}
        >
          <Archive size={14} />
          备份
        </button>
      </div>

      {activeTab === 'prompt' && (
        <>
          <div className="panel-header">
            <h4>⚙️ 系统提示词</h4>
            <button
              className={`lock-btn ${isLocked ? 'locked' : ''}`}
              onClick={onToggleLock}
              title={isLocked ? '解锁' : '锁定'}
            >
              {isLocked ? <Lock size={14} /> : <Unlock size={14} />}
            </button>
          </div>
          {!editing ? (
            <div className="prompt-display">
              <p>{systemPrompt || '暂无系统提示词'}</p>
              <div className="prompt-actions">
                <button
                  className="btn-secondary"
                  onClick={() => {
                    setValue(systemPrompt);
                    setEditing(true);
                  }}
                  disabled={isLocked}
                >
                  编辑
                </button>
                <button className="btn-secondary" onClick={onShare}>
                  <Share2 size={14} />
                  分享
                </button>
              </div>
            </div>
          ) : (
            <div className="prompt-edit">
              <textarea
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder="输入系统提示词..."
                rows={8}
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
        </>
      )}

      {activeTab === 'advanced' && (
        <div className="advanced-settings">
          <h4>🔧 高级设置</h4>
          <div className="setting-item">
            <label>温度值</label>
            <input type="range" min="0" max="100" defaultValue={70} />
            <span>0.7</span>
          </div>
          <div className="setting-item">
            <label>最大令牌</label>
            <input type="number" defaultValue={2000} />
          </div>
        </div>
      )}

      {activeTab === 'backup' && (
        <div className="backup-settings">
          <h4>💾 备份与恢复</h4>
          <button className="btn-primary" onClick={onExport}>
            <Download size={14} />
            导出数据
          </button>
          <button className="btn-secondary">
            <Upload size={14} />
            导入备份
          </button>
        </div>
      )}
    </div>
  );
};

// ==================== 话题分支组件（增强版）====================
const TopicBranchEnhanced: React.FC<{
  topic: TopicBranch;
  onUpdate: (updates: Partial<TopicBranch>) => void;
  onDelete: () => void;
  level: number;
}> = ({ topic, onUpdate, onDelete, level }) => {
  const [activeTab, setActiveTab] = useState<'chat' | 'memory' | 'knowledge' | 'settings'>('chat');
  const [files, setFiles] = useState<KnowledgeFile[]>(topic.knowledge);
  const [memories, setMemories] = useState<MemoryPoint[]>(topic.memories);
  const [isLocked, setIsLocked] = useState(topic.locked);

  const handleFileUpload = (file: File) => {
    const newFile: KnowledgeFile = {
      id: Date.now().toString(),
      name: file.name,
      size: `${(file.size / 1024).toFixed(1)} KB`,
      uploadedAt: new Date().toLocaleDateString(),
      type: file.name.endsWith('.pdf') ? 'pdf' : 'doc',
      tags: []
    };
    setFiles([...files, newFile]);
    onUpdate({ knowledge: [...files, newFile], lastActivity: new Date().toISOString() });
  };

  const handleFileDelete = (id: string) => {
    const updated = files.filter(f => f.id !== id);
    setFiles(updated);
    onUpdate({ knowledge: updated });
  };

  const handleMemoryAdd = (memory: Omit<MemoryPoint, 'id' | 'timestamp'>) => {
    const newMemory: MemoryPoint = {
      id: Date.now().toString(),
      timestamp: new Date().toLocaleString(),
      ...memory
    };
    setMemories([...memories, newMemory]);
    onUpdate({ memories: [...memories, newMemory], lastActivity: new Date().toISOString() });
  };

  const handleMemoryDelete = (id: string) => {
    const updated = memories.filter(m => m.id !== id);
    setMemories(updated);
    onUpdate({ memories: updated });
  };

  return (
    <div
      className={`topic-branch-enhanced ${isLocked ? 'locked' : ''}`}
      style={{ marginLeft: `${level * 20}px` }}
    >
      <div className="topic-header-enhanced">
        <button
          className="expand-btn"
          onClick={() => onUpdate({ expanded: !topic.expanded })}
        >
          <ChevronRight size={16} style={{ transform: topic.expanded ? 'rotate(90deg)' : 'none' }} />
        </button>
        <div className="topic-icon-wrapper">
          <MessageSquare size={16} className="topic-icon" />
        </div>
        <span className="topic-title">{topic.title}</span>
        {topic.starred && <Star size={14} className="starred" fill="currentColor" />}
        <div className="topic-meta">
          <span className="topic-date">{topic.lastActivity}</span>
        </div>
        <div className="topic-actions">
          <button
            className={`icon-btn ${topic.starred ? 'starred' : ''}`}
            onClick={() => onUpdate({ starred: !topic.starred })}
            title="收藏"
          >
            <Star size={14} fill={topic.starred ? 'currentColor' : 'none'} />
          </button>
          <button
            className={`icon-btn ${isLocked ? 'locked' : ''}`}
            onClick={() => {
              setIsLocked(!isLocked);
              onUpdate({ locked: !isLocked });
            }}
            title={isLocked ? '解锁' : '锁定'}
          >
            {isLocked ? <Lock size={14} /> : <Unlock size={14} />}
          </button>
          <button
            className="icon-btn danger"
            onClick={onDelete}
            title="删除话题"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {topic.expanded && (
        <>
          <div className="topic-tabs-enhanced">
            <button
              className={`tab ${activeTab === 'chat' ? 'active' : ''}`}
              onClick={() => setActiveTab('chat')}
            >
              💬 对话
            </button>
            <button
              className={`tab ${activeTab === 'memory' ? 'active' : ''}`}
              onClick={() => setActiveTab('memory')}
            >
              🧠 记忆 ({memories.length})
            </button>
            <button
              className={`tab ${activeTab === 'knowledge' ? 'active' : ''}`}
              onClick={() => setActiveTab('knowledge')}
            >
              📚 知识库 ({files.length})
            </button>
            <button
              className={`tab ${activeTab === 'settings' ? 'active' : ''}`}
              onClick={() => setActiveTab('settings')}
            >
              ⚙️ 设置
            </button>
          </div>

          <div className="topic-content-enhanced">
            {activeTab === 'chat' && (
              <div className="chat-preview-enhanced">
                <p className="chat-hint">开始对话...</p>
                <div className="chat-stats">
                  <span>💬 {topic.memories.length} 条记忆</span>
                  <span>📚 {topic.knowledge.length} 个文件</span>
                  <span>🕒 最后活动: {topic.lastActivity}</span>
                </div>
              </div>
            )}
            {activeTab === 'memory' && (
              <MemoryPanelEnhanced
                memories={memories}
                onAdd={handleMemoryAdd}
                onEdit={(id, content) => {
                  const updated = memories.map(m => m.id === id ? { ...m, content } : m);
                  setMemories(updated);
                  onUpdate({ memories: updated });
                }}
                onDelete={handleMemoryDelete}
                onToggleImportance={(id) => {
                  const updated = memories.map(m =>
                    m.id === id
                      ? { ...m, importance: m.importance === 'high' ? 'medium' : 'high' }
                      : m
                  );
                  setMemories(updated);
                  onUpdate({ memories: updated });
                }}
              />
            )}
            {activeTab === 'knowledge' && (
              <KnowledgePanelEnhanced
                files={files}
                onUpload={handleFileUpload}
                onDelete={handleFileDelete}
                onDownload={() => {}}
                onPreview={() => {}}
                onUpdateTags={(id, tags) => {
                  const updated = files.map(f => f.id === id ? { ...f, tags } : f);
                  setFiles(updated);
                  onUpdate({ knowledge: updated });
                }}
              />
            )}
            {activeTab === 'settings' && (
              <SettingsPanelEnhanced
                systemPrompt={topic.systemPrompt}
                onSave={(prompt) => onUpdate({ systemPrompt: prompt })}
                onExport={() => {}}
                onShare={() => {}}
                isLocked={isLocked}
                onToggleLock={() => {
                  setIsLocked(!isLocked);
                  onUpdate({ locked: !isLocked });
                }}
              />
            )}
          </div>
        </>
      )}
    </div>
  );
};

// ==================== Bot Agent 卡片（增强版）====================
const BotAgentCardEnhanced: React.FC<{
  bot: BotAgent;
  onUpdate: (updates: Partial<BotAgent>) => void;
  onAddTopic: () => void;
}> = ({ bot, onUpdate, onAddTopic }) => {
  return (
    <div className="bot-card-enhanced">
      <div
        className="bot-header-enhanced"
        style={{ borderBottomColor: bot.color }}
      >
        <button
          className="expand-btn"
          onClick={() => onUpdate({ expanded: !bot.expanded })}
        >
          {bot.expanded ? <FolderOpen size={20} /> : <Folder size={20} />}
        </button>
        <div className="bot-avatar-enhanced" style={{ background: bot.color }}>
          <span>{bot.icon}</span>
        </div>
        <div className="bot-info-enhanced">
          <h3 className="bot-name">{bot.name}</h3>
          <p className="bot-meta">
            {bot.topics.length} 个话题 · {bot.statistics.totalConversations} 次对话
          </p>
        </div>
        <button
          className="add-topic-btn"
          onClick={onAddTopic}
          title="新建话题"
        >
          <Plus size={18} />
          <span>新建</span>
        </button>
      </div>

      {bot.expanded && (
        <div className="bot-topics-enhanced">
          <div className="bot-system-prompt-hint">
            <Settings size={14} />
            <span>所有话题共享系统提示词</span>
            <button className="text-btn">查看</button>
          </div>

          {bot.topics.map(topic => (
            <TopicBranchEnhanced
              key={topic.id}
              topic={topic}
              level={1}
              onUpdate={(updates) => {
                const updatedTopics = bot.topics.map(t =>
                  t.id === topic.id ? { ...t, ...updates } : t
                );
                onUpdate({ topics: updatedTopics, statistics: {
                  ...bot.statistics,
                  lastActivity: new Date().toISOString()
                }});
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

// ==================== 主组件（增强版）====================
const BotFolderStructureExtended: React.FC = () => {
  // 示例数据
  const [bots, setBots] = useState<BotAgent[]>([
    {
      id: '1',
      name: '工作伙伴',
      icon: '💼',
      color: 'linear-gradient(135deg, #E8E4FF 0%, #F0ECFF 100%)',
      systemPrompt: '你是一个专业的工作助手，专注于提高用户的工作效率和任务管理能力。',
      expanded: true,
      statistics: {
        totalConversations: 127,
        totalMemories: 45,
        lastActivity: '2024-01-15 14:30'
      },
      topics: [
        {
          id: '1-1',
          title: '项目规划讨论',
          expanded: true,
          starred: true,
          locked: false,
          memories: [
            { id: 'm1', content: '用户正在筹备一个新的产品发布项目', timestamp: '2024-01-15 09:30', type: 'key', importance: 'high' },
            { id: 'm2', content: '偏好使用敏捷开发方法', timestamp: '2024-01-15 10:15', type: 'context', importance: 'medium' }
          ],
          knowledge: [
            { id: 'k1', name: '项目需求文档.pdf', size: '2.4 MB', uploadedAt: '2024-01-10', type: 'pdf', tags: ['需求', '项目'] }
          ],
          systemPrompt: '',
          createdAt: '2024-01-10',
          lastActivity: '2024-01-15 14:30'
        }
      ]
    }
  ]);

  const addNewTopic = (botId: string) => {
    setBots(bots.map(bot => {
      if (bot.id === botId) {
        const newTopic: TopicBranch = {
          id: `t-${Date.now()}`,
          title: '新话题',
          expanded: true,
          starred: false,
          locked: false,
          memories: [],
          knowledge: [],
          systemPrompt: bot.systemPrompt,
          createdAt: new Date().toISOString(),
          lastActivity: new Date().toISOString()
        };
        return { ...bot, topics: [...bot.topics, newTopic], expanded: true };
      }
      return bot;
    }));
  };

  return (
    <div className="bot-folder-structure-extended">
      <style>{`
        .bot-folder-structure-extended {
          font-family: 'Nunito Sans', -apple-system, sans-serif;
          background: ${theme.colors.bg};
          padding: 24px;
          border-radius: ${theme.borderRadius.xl};
          min-height: 100vh;
        }

        .bot-card-enhanced {
          background: linear-gradient(145deg, #ffffff, #f5f3ff);
          box-shadow: ${theme.shadows.soft};
          border-radius: ${theme.borderRadius.lg};
          margin-bottom: 16px;
          overflow: hidden;
          transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .bot-card-enhanced:hover {
          box-shadow: 12px 12px 24px rgba(163, 177, 198, 0.15),
                      -12px -12px 24px rgba(255, 255, 255, 0.9);
        }

        .bot-header-enhanced {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 16px;
          border-bottom: 2px solid transparent;
          transition: border-color 0.3s;
        }

        .bot-avatar-enhanced {
          width: 48px;
          height: 48px;
          border-radius: ${theme.borderRadius.md};
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 24px;
          box-shadow: ${theme.shadows.sm};
        }

        .bot-info-enhanced {
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

        .bot-topics-enhanced {
          padding: 12px 16px 16px;
          background: ${theme.colors.surfaceSoft}40;
        }

        .topic-branch-enhanced {
          background: ${theme.colors.surface};
          border-radius: ${theme.borderRadius.md};
          padding: 12px;
          margin-top: 8px;
          border: 1px solid ${theme.colors.border};
          transition: all 0.2s;
        }

        .topic-branch-enhanced:hover {
          box-shadow: ${theme.shadows.sm};
        }

        .topic-branch-enhanced.locked {
          opacity: 0.7;
          background: ${theme.colors.surfaceSoft};
        }

        .topic-header-enhanced {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 12px;
        }

        .topic-icon-wrapper {
          width: 32px;
          height: 32px;
          border-radius: 8px;
          background: ${theme.colors.surfaceSoft};
          display: flex;
          align-items: center;
          justify-content: center;
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

        .topic-meta {
          display: flex;
          gap: 8px;
        }

        .topic-date {
          font-size: 12px;
          color: ${theme.colors.textMuted};
        }

        .topic-actions {
          display: flex;
          gap: 4px;
        }

        .starred {
          color: ${theme.colors.warning} !important;
        }

        .topic-tabs-enhanced {
          display: flex;
          gap: 6px;
          margin-bottom: 12px;
          background: ${theme.colors.surfaceSoft};
          padding: 4px;
          border-radius: ${theme.borderRadius.sm};
        }

        .tab {
          flex: 1;
          padding: 8px;
          border: none;
          background: transparent;
          border-radius: 6px;
          font-size: 13px;
          cursor: pointer;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
        }

        .tab.active {
          background: ${theme.colors.surface};
          box-shadow: ${theme.shadows.sm};
        }

        .knowledge-panel-enhanced,
        .memory-panel-enhanced,
        .settings-panel-enhanced {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .search-bar {
          display: flex;
          gap: 8px;
          margin-bottom: 12px;
        }

        .search-input-wrapper {
          flex: 1;
          position: relative;
        }

        .search-icon {
          position: absolute;
          left: 12px;
          top: 50%;
          transform: translateY(-50%);
          color: ${theme.colors.textMuted};
        }

        .search-input-wrapper input {
          width: 100%;
          padding: 8px 12px 8px 36px;
          border-radius: ${theme.borderRadius.sm};
          border: 1px solid ${theme.colors.border};
          font-size: 13px;
        }

        .filter-btn {
          padding: 8px 12px;
          border-radius: ${theme.borderRadius.sm};
          border: 1px solid ${theme.colors.border};
          background: ${theme.colors.surface};
          color: ${theme.colors.textSecondary};
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 12px;
        }

        .filter-btn.active {
          background: ${theme.colors.primary}15;
          border-color: ${theme.colors.primary};
          color: ${theme.colors.primary};
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

        .upload-hint {
          font-size: 11px;
          color: ${theme.colors.textMuted};
        }

        .file-list-enhanced {
          display: flex;
          flex-direction: column;
          gap: 8px;
          max-height: 300px;
          overflow-y: auto;
        }

        .file-item-enhanced {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px;
          border-radius: ${theme.borderRadius.sm};
          background: ${theme.colors.surface};
          border: 1px solid ${theme.colors.border};
          transition: all 0.2s;
        }

        .file-item-enhanced.selected {
          background: ${theme.colors.primary}10;
          border-color: ${theme.colors.primary};
        }

        .file-icon-wrapper {
          width: 32px;
          height: 32px;
          border-radius: 6px;
          background: ${theme.colors.surfaceSoft};
          display: flex;
          align-items: center;
          justify-content: center;
          color: ${theme.colors.textSecondary};
        }

        .file-info-enhanced {
          flex: 1;
        }

        .file-name {
          font-size: 13px;
          font-weight: 500;
          color: ${theme.colors.textPrimary};
        }

        .file-meta {
          display: flex;
          flex-direction: column;
          gap: 2px;
          font-size: 11px;
          color: ${theme.colors.textMuted};
        }

        .file-tags {
          display: flex;
          gap: 4px;
          flex-wrap: wrap;
        }

        .tag {
          display: flex;
          align-items: center;
          gap: 2px;
          padding: 2px 6px;
          border-radius: 4px;
          background: ${theme.colors.surfaceSoft};
          font-size: 10px;
          color: ${theme.colors.textSecondary};
        }

        .file-actions {
          display: flex;
          gap: 4px;
        }

        .memory-list-enhanced {
          display: flex;
          flex-direction: column;
          gap: 8px;
          max-height: 300px;
          overflow-y: auto;
        }

        .memory-item-enhanced {
          display: flex;
          align-items: flex-start;
          gap: 8px;
          padding: 10px;
          border-radius: ${theme.borderRadius.sm};
          font-size: 13px;
          line-height: 1.5;
          background: ${theme.colors.surface};
        }

        .memory-item-enhanced.high {
          background: #FFF9E6;
          border-left: 3px solid ${theme.colors.warning};
        }

        .memory-item-enhanced.medium {
          background: ${theme.colors.surface};
        }

        .memory-item-enhanced.low {
          background: ${theme.colors.surfaceSoft};
        }

        .memory-content-wrapper {
          flex: 1;
        }

        .memory-content-enhanced {
          margin: 0 0 6px 0;
        }

        .memory-meta-enhanced {
          display: flex;
          gap: 8px;
          align-items: center;
        }

        .memory-time {
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 11px;
          color: ${theme.colors.textMuted};
        }

        .importance-btn {
          padding: 2px;
          border: none;
          background: transparent;
          cursor: pointer;
          color: ${theme.colors.textMuted};
        }

        .importance-btn:hover {
          color: ${theme.colors.warning};
        }

        .settings-tabs {
          display: flex;
          gap: 6px;
          margin-bottom: 12px;
          border-bottom: 1px solid ${theme.colors.border};
        }

        .settings-tabs .tab {
          padding-bottom: 8px;
          border-bottom: 2px solid transparent;
        }

        .settings-tabs .tab.active {
          border-bottom-color: ${theme.colors.primary};
        }

        .panel-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 12px;
        }

        .panel-header h4 {
          font-size: 14px;
          font-weight: 600;
          color: ${theme.colors.textSecondary};
          margin: 0;
        }

        .lock-btn {
          padding: 6px;
          border-radius: 6px;
          border: none;
          background: transparent;
          cursor: pointer;
          transition: all 0.2s;
        }

        .lock-btn.locked {
          color: ${theme.colors.warning};
        }

        .prompt-display,
        .prompt-edit {
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

        .prompt-actions {
          display: flex;
          gap: 8px;
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

        .btn-small.danger {
          padding: 6px 10px;
          background: ${theme.colors.danger}20;
          color: ${theme.colors.danger};
          border: 1px solid ${theme.colors.danger}40;
        }

        .bulk-actions {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 12px;
          border-radius: ${theme.borderRadius.sm};
          background: ${theme.colors.primary}10;
        }

        .selected-count {
          font-size: 12px;
          color: ${theme.colors.primary};
        }

        .memory-filters {
          display: flex;
          gap: 6px;
          margin-bottom: 12px;
          flex-wrap: wrap;
        }

        .filter-chip {
          padding: 6px 12px;
          border-radius: ${theme.borderRadius.sm};
          border: 1px solid ${theme.colors.border};
          background: ${theme.colors.surface};
          font-size: 12px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .filter-chip.active {
          background: ${theme.colors.primary};
          color: white;
          border-color: ${theme.colors.primary};
        }

        .sort-select {
          padding: 6px 10px;
          border-radius: ${theme.borderRadius.sm};
          border: 1px solid ${theme.colors.border};
          background: ${theme.colors.surface};
          font-size: 12px;
          margin-left: auto;
        }

        .add-memory-btn {
          width: 100%;
          padding: 10px;
          border-radius: ${theme.borderRadius.sm};
          border: 1px dashed ${theme.colors.border};
          background: transparent;
          color: ${theme.colors.textSecondary};
          font-size: 13px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          transition: all 0.2s;
        }

        .add-memory-btn:hover {
          border-color: ${theme.colors.primary};
          color: ${theme.colors.primary};
        }

        /* Scrollbar */
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

      <div className="bots-list">
        {bots.map(bot => (
          <BotAgentCardEnhanced
            key={bot.id}
            bot={bot}
            onUpdate={(updates) => {
              setBots(bots.map(b => b.id === bot.id ? { ...b, ...updates } : b));
            }}
            onAddTopic={() => addNewTopic(bot.id)}
          />
        ))}
      </div>
    </div>
  );
};

export default BotFolderStructureExtended;
