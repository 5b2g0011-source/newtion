import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { Search, X, FileText, Globe } from 'lucide-react';

export const SearchModal: React.FC = () => {
  const { searchOpen, setSearchOpen, notes, currentUser, navigateToView } = useApp();
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (searchOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery('');
    }
  }, [searchOpen]);

  if (!searchOpen) return null;

  // Search across:
  // 1. User's own notes (even private ones)
  // 2. Other users' public published notes
  const searchableNotes = notes.filter(note => {
    const isOwner = currentUser ? note.userId === currentUser.id : note.userId === 'guest';
    const isPublicAndPublished = note.isPublished && note.isPublic;
    return (isOwner || isPublicAndPublished) && !note.isTrash;
  });

  const filtered = searchableNotes.filter(note => {
    const q = query.toLowerCase();
    return (
      note.title.toLowerCase().includes(q) ||
      note.content.toLowerCase().includes(q) ||
      note.tags.some(tag => tag.toLowerCase().includes(q))
    );
  }).slice(0, 8); // Cap at 8 results

  const handleSelectNote = (noteId: string, authorId: string) => {
    const isOwner = currentUser && authorId === currentUser.id;
    setSearchOpen(false);

    if (isOwner) {
      navigateToView('editor', noteId);
    } else {
      navigateToView('reader', noteId);
    }
  };

  return (
    <div className="modal-overlay" onClick={() => setSearchOpen(false)}>
      <div 
        className="modal-content glass-panel" 
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '90%',
          maxWidth: '550px',
          padding: 0,
          overflow: 'hidden',
          borderRadius: 'var(--radius-lg)'
        }}
      >
        <div style={{
          display: 'flex',
          alignItems: 'center',
          padding: '16px',
          borderBottom: '1px solid var(--border-color)',
          gap: '12px'
        }}>
          <Search size={20} style={{ color: 'var(--text-secondary)' }} />
          <input
            ref={inputRef}
            type="text"
            placeholder="搜尋你的筆記、公開文章或標籤..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              outline: 'none',
              fontSize: '16px',
              color: 'var(--text-primary)'
            }}
          />
          <button 
            onClick={() => setSearchOpen(false)}
            style={{
              padding: '4px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--text-secondary)'
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
          >
            <X size={18} />
          </button>
        </div>

        <div style={{
          maxHeight: '350px',
          overflowY: 'auto',
          padding: '8px'
        }}>
          {filtered.length === 0 ? (
            <div style={{
              padding: '32px 16px',
              textAlign: 'center',
              color: 'var(--text-muted)',
              fontSize: '14px'
            }}>
              找不到相符的筆記。輸入不同的關鍵字試試看！
            </div>
          ) : (
            filtered.map((note) => {
              const isOwner = currentUser && note.userId === currentUser.id;
              
              return (
                <button
                  key={note.id}
                  onClick={() => handleSelectNote(note.id, note.userId)}
                  style={{
                    width: '100%',
                    padding: '12px',
                    borderRadius: 'var(--radius-md)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    textAlign: 'left',
                    transition: 'background var(--transition-fast)'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                >
                  <div style={{
                    fontSize: '20px',
                    width: '32px',
                    height: '32px',
                    borderRadius: 'var(--radius-sm)',
                    background: 'rgba(255, 255, 255, 0.04)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    {note.icon || <FileText size={16} />}
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontWeight: 600,
                      fontSize: '14px',
                      color: 'var(--text-primary)',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }}>
                      {note.title || '未命名筆記'}
                    </div>
                    <div style={{
                      fontSize: '12px',
                      color: 'var(--text-muted)',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      marginTop: '2px'
                    }}>
                      {(() => {
                        if (note.type === 'mindmap') {
                          try {
                            const parsed = JSON.parse(note.content);
                            const nodesCount = parsed?.nodes?.length || 0;
                            return `🧠 心智圖頁面 • 包含 ${nodesCount} 個節點`;
                          } catch (e) {
                            return '🧠 心智圖頁面';
                          }
                        } else if (note.type === 'quiz') {
                          try {
                            const parsed = JSON.parse(note.content);
                            const qCount = parsed?.questions?.length || 0;
                            return `❓ 選擇題測驗 • 共 ${qCount} 題問題`;
                          } catch (e) {
                            return '❓ 選擇題測驗';
                          }
                        } else {
                          return note.content.replace(/[#*`\n>!\[\]]/g, '').substring(0, 60);
                        }
                      })()}
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '6px' }}>
                    {note.isPublished && (
                      <span style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '3px',
                        fontSize: '10px',
                        fontWeight: 600,
                        padding: '2px 6px',
                        background: 'rgba(16, 185, 129, 0.1)',
                        color: 'var(--accent-success)',
                        borderRadius: '12px'
                      }}>
                        <Globe size={10} />
                        已發布
                      </span>
                    )}
                    <span style={{
                      fontSize: '10px',
                      fontWeight: 600,
                      padding: '2px 6px',
                      background: isOwner ? 'rgba(99, 102, 241, 0.1)' : 'rgba(255, 255, 255, 0.05)',
                      color: isOwner ? 'var(--brand-primary)' : 'var(--text-secondary)',
                      borderRadius: '12px'
                    }}>
                      {isOwner ? '我的筆記' : '社群文章'}
                    </span>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
