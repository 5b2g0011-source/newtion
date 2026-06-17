import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import type { ClickLogItem } from '../types';
import { 
  Library, Search, Trash2, Clock, 
  ArrowRight, X, FileText, Brain, HelpCircle 
} from 'lucide-react';

export const MediaWorkspace: React.FC = () => {
  const { 
    clickHistory, 
    clearClickHistory, 
    removeClickHistoryItem, 
    navigateToView, 
    notes,
    currentUser 
  } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'note' | 'mindmap' | 'quiz' | 'profile'>('all');

  const currentUserId = currentUser ? currentUser.id : 'guest';

  // Filter history for current user only, match search query and active tab
  const userHistory = clickHistory.filter(item => item.userId === currentUserId);

  const filteredHistory = userHistory.filter(item => {
    const matchesSearch = item.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTab = activeTab === 'all' || item.type === activeTab;
    return matchesSearch && matchesTab;
  });

  // Calculate statistics
  const totalCount = userHistory.length;
  const noteCount = userHistory.filter(item => item.type === 'note').length;
  const mindmapCount = userHistory.filter(item => item.type === 'mindmap').length;
  const quizCount = userHistory.filter(item => item.type === 'quiz').length;
  const profileCount = userHistory.filter(item => item.type === 'profile').length;

  const handleNavigate = (item: ClickLogItem) => {
    if (item.type === 'profile') {
      navigateToView('profile', item.itemId);
    } else {
      // Find note in notes
      const note = notes.find(n => n.id === item.itemId);
      if (note) {
        const isOwner = currentUser ? note.userId === currentUser.id : note.userId === 'guest';
        if (isOwner) {
          navigateToView('editor', note.id);
        } else {
          navigateToView('reader', note.id);
        }
      } else {
        alert('此頁面可能已被移至垃圾桶或已被永久刪除。');
      }
    }
  };

  const formatTime = (isoString: string) => {
    try {
      const date = new Date(isoString);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      
      if (diffMins < 1) return '剛剛';
      if (diffMins < 60) return `${diffMins} 分鐘前`;
      
      const diffHours = Math.floor(diffMins / 60);
      if (diffHours < 24) return `${diffHours} 小時前`;
      
      return date.toLocaleDateString('zh-TW', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch {
      return '未知時間';
    }
  };

  const getTypeBadge = (type: ClickLogItem['type']) => {
    switch (type) {
      case 'note':
        return { label: '筆記', color: 'rgba(99, 102, 241, 0.15)', textColor: '#818cf8', icon: <FileText size={12} /> };
      case 'mindmap':
        return { label: '心智圖', color: 'rgba(236, 72, 153, 0.15)', textColor: '#f472b6', icon: <Brain size={12} /> };
      case 'quiz':
        return { label: '測驗', color: 'rgba(234, 179, 8, 0.15)', textColor: '#facc15', icon: <HelpCircle size={12} /> };
      case 'profile':
        return { label: '個人檔案', color: 'rgba(16, 185, 129, 0.15)', textColor: '#34d399', icon: '👤' };
    }
  };

  return (
    <div style={{
      flex: 1,
      height: '100vh',
      overflowY: 'auto',
      background: 'var(--bg-editor)',
      padding: '2.5rem 2rem'
    }}>
      <div style={{ maxWidth: '850px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        
        {/* Header Title */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <h1 style={{
              fontFamily: 'var(--font-display)',
              fontWeight: 800,
              fontSize: '2.25rem',
              color: 'var(--text-primary)',
              letterSpacing: '-0.5px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px'
            }}>
              <Library size={32} style={{ color: 'var(--brand-primary)' }} />
              媒體櫃 (歷程追蹤)
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '15px' }}>
              此處可以追蹤您點擊與瀏覽過的筆記、心智圖、測驗以及個人檔案等歷程資料。
            </p>
          </div>

          {userHistory.length > 0 && (
            <button
              onClick={() => {
                if (confirm('確定要清空所有點擊歷程紀錄嗎？')) {
                  clearClickHistory();
                }
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 14px',
                borderRadius: 'var(--radius-sm)',
                background: 'rgba(220, 38, 38, 0.1)',
                border: '1px solid rgba(220, 38, 38, 0.2)',
                color: '#f87171',
                fontSize: '13px',
                fontWeight: 500,
                cursor: 'pointer',
                transition: 'background var(--transition-fast)'
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(220, 38, 38, 0.18)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(220, 38, 38, 0.1)'}
            >
              <Trash2 size={14} />
              清空歷程
            </button>
          )}
        </div>

        {/* Stats Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
          gap: '12px',
          borderBottom: '1px solid var(--border-color)',
          paddingBottom: '1.5rem'
        }}>
          {[
            { label: '總點擊次數', value: totalCount, icon: '📊', color: 'var(--text-primary)' },
            { label: '筆記頁面', value: noteCount, icon: '📄', color: '#818cf8' },
            { label: '心智圖', value: mindmapCount, icon: '🧠', color: '#f472b6' },
            { label: '線上測驗', value: quizCount, icon: '❓', color: '#facc15' },
            { label: '個人檔案', value: profileCount, icon: '👤', color: '#34d399' }
          ].map((stat, i) => (
            <div 
              key={i} 
              className="glass-panel"
              style={{
                padding: '12px 16px',
                borderRadius: 'var(--radius-md)',
                display: 'flex',
                flexDirection: 'column',
                gap: '4px',
                background: 'rgba(255, 255, 255, 0.01)'
              }}
            >
              <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
                {stat.label}
              </span>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginTop: '2px' }}>
                <span style={{ fontSize: '20px', fontWeight: 700, color: stat.color }}>{stat.value}</span>
                <span style={{ fontSize: '14px', marginLeft: 'auto' }}>{stat.icon}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Filter Toolbar */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center', justifyContent: 'space-between' }}>
          {/* Tabs */}
          <div style={{ display: 'flex', gap: '6px', background: 'var(--bg-input)', padding: '3px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
            {[
              { id: 'all', label: '全部' },
              { id: 'note', label: '筆記' },
              { id: 'mindmap', label: '心智圖' },
              { id: 'quiz', label: '測驗' },
              { id: 'profile', label: '檔案' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                style={{
                  padding: '6px 12px',
                  borderRadius: 'var(--radius-sm)',
                  background: activeTab === tab.id ? 'var(--bg-card)' : 'transparent',
                  color: activeTab === tab.id ? 'var(--text-primary)' : 'var(--text-secondary)',
                  border: 'none',
                  fontSize: '13px',
                  fontWeight: activeTab === tab.id ? 600 : 400,
                  cursor: 'pointer',
                  transition: 'background var(--transition-fast)'
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Search bar */}
          <div style={{ 
            position: 'relative', 
            flex: '1', 
            maxWidth: '300px', 
            minWidth: '200px'
          }}>
            <Search 
              size={14} 
              style={{ 
                position: 'absolute', 
                left: '10px', 
                top: '50%', 
                transform: 'translateY(-50%)', 
                color: 'var(--text-muted)' 
              }} 
            />
            <input
              type="text"
              placeholder="搜尋點擊歷程標題..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '6px 10px 6px 30px',
                borderRadius: 'var(--radius-sm)',
                background: 'var(--bg-input)',
                border: '1px solid var(--border-color)',
                fontSize: '13px',
                color: 'var(--text-primary)',
                outline: 'none'
              }}
            />
          </div>
        </div>

        {/* Click History List */}
        <div>
          {filteredHistory.length === 0 ? (
            <div style={{
              padding: '64px 32px',
              textAlign: 'center',
              background: 'rgba(255,255,255,0.005)',
              border: '1px dashed var(--border-color)',
              borderRadius: 'var(--radius-lg)',
              color: 'var(--text-muted)'
            }}>
              {userHistory.length === 0 ? '目前沒有任何點擊歷程。在系統中點選任意頁面或個人檔案後，紀錄將會出現在此處！' : '找不到符合搜尋條件的歷程紀錄。'}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {filteredHistory.map(item => {
                const badge = getTypeBadge(item.type);
                return (
                  <div
                    key={item.id}
                    className="glass-panel"
                    style={{
                      borderRadius: 'var(--radius-md)',
                      padding: '12px 16px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '16px',
                      boxShadow: 'var(--shadow-sm)',
                      background: 'rgba(255,255,255,0.015)'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0, flex: 1 }}>
                      <span style={{ fontSize: '20px', display: 'flex', alignItems: 'center' }}>
                        {item.icon || '📄'}
                      </span>
                      
                      <div style={{ minWidth: 0, flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{
                            fontWeight: 600,
                            fontSize: '14.5px',
                            color: 'var(--text-primary)',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis'
                          }}>
                            {item.title}
                          </span>
                          
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '2px 6px',
                            borderRadius: '2px',
                            fontSize: '10.5px',
                            fontWeight: 600,
                            background: badge.color,
                            color: badge.textColor
                          }}>
                            {typeof badge.icon === 'string' ? badge.icon : badge.icon}
                            {badge.label}
                          </span>
                        </div>
                        
                        <div style={{
                          fontSize: '12px',
                          color: 'var(--text-muted)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}>
                          <Clock size={12} />
                          <span>點擊時間：{formatTime(item.timestamp)}</span>
                          <span style={{ color: 'rgba(255,255,255,0.1)' }}>|</span>
                          <span>完整時間：{new Date(item.timestamp).toLocaleString('zh-TW')}</span>
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <button
                        onClick={() => handleNavigate(item)}
                        style={{
                          padding: '6px 12px',
                          borderRadius: 'var(--radius-sm)',
                          border: '1px solid var(--border-color)',
                          background: 'var(--bg-input)',
                          color: 'var(--text-primary)',
                          fontSize: '12.5px',
                          fontWeight: 500,
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          cursor: 'pointer',
                          transition: 'all var(--transition-fast)'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = 'var(--brand-primary)';
                          e.currentTarget.style.borderColor = 'var(--brand-primary)';
                          e.currentTarget.style.color = '#ffffff';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = 'var(--bg-input)';
                          e.currentTarget.style.borderColor = 'var(--border-color)';
                          e.currentTarget.style.color = 'var(--text-primary)';
                        }}
                      >
                        前往
                        <ArrowRight size={13} />
                      </button>
                      
                      <button
                        onClick={() => removeClickHistoryItem(item.id)}
                        title="刪除此紀錄"
                        style={{
                          padding: '6px',
                          borderRadius: 'var(--radius-sm)',
                          background: 'transparent',
                          color: 'var(--text-muted)',
                          border: 'none',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer',
                          transition: 'color var(--transition-fast)'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.color = 'var(--accent-error)'}
                        onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-muted)'}
                      >
                        <X size={15} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
