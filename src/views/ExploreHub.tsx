import React, { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { Search, Heart, MessageSquare } from 'lucide-react';

export const ExploreHub: React.FC = () => {
  const { notes, users, navigateToView, comments } = useApp();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);

  // Get only notes that are published and public
  const publishedNotes = useMemo(() => {
    return notes.filter(n => n.isPublished && n.isPublic && !n.isTrash);
  }, [notes]);

  // Extract all unique tags
  const allTags = useMemo(() => {
    const tagsSet = new Set<string>();
    publishedNotes.forEach(n => n.tags.forEach(t => tagsSet.add(t)));
    return Array.from(tagsSet);
  }, [publishedNotes]);

  // Filter notes by search query and selected tag
  const filteredNotes = useMemo(() => {
    return publishedNotes.filter(note => {
      const matchSearch = 
        note.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        note.content.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchTag = selectedTag ? note.tags.includes(selectedTag) : true;
      
      return matchSearch && matchTag;
    });
  }, [publishedNotes, searchQuery, selectedTag]);

  // Get comment count helper
  // Since we refresh context data, we can check context comments reactively.

  return (
    <div style={{
      flex: 1,
      height: '100vh',
      overflowY: 'auto',
      background: 'var(--bg-editor)',
      padding: '2.5rem 2rem'
    }}>
      {/* 1. Header Banner */}
      <div style={{
        maxWidth: '1000px',
        margin: '0 auto 2.5rem auto',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{
            padding: '4px 10px',
            background: 'rgba(99, 102, 241, 0.1)',
            color: 'var(--brand-primary)',
            borderRadius: '12px',
            fontSize: '11px',
            fontWeight: 600,
            letterSpacing: '1px',
            textTransform: 'uppercase'
          }}>
            Explore Hub
          </span>
        </div>
        <h1 style={{
          fontFamily: 'var(--font-display)',
          fontWeight: 800,
          fontSize: '2.25rem',
          color: 'var(--text-primary)',
          letterSpacing: '-0.5px'
        }}>
          探索廣場
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '15px', maxWidth: '600px' }}>
          閱讀來自全球開發者與寫作者分享的筆記、教學與思考記錄。
        </p>
      </div>

      {/* 2. Search & Tag Filters controls */}
      <div style={{
        maxWidth: '1000px',
        margin: '0 auto 2rem auto',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px'
      }}>
        {/* Search Bar */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          background: 'var(--bg-input)',
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--radius-lg)',
          padding: '12px 18px',
          gap: '12px',
          boxShadow: 'var(--shadow-sm)'
        }}>
          <Search size={18} style={{ color: 'var(--text-secondary)' }} />
          <input
            type="text"
            placeholder="搜尋發表文章標題或內容..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              outline: 'none',
              fontSize: '14.5px',
              color: 'var(--text-primary)'
            }}
          />
        </div>

        {/* Tag Pills */}
        {allTags.length > 0 && (
          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '8px',
            alignItems: 'center'
          }}>
            <button
              onClick={() => setSelectedTag(null)}
              style={{
                fontSize: '12.5px',
                padding: '6px 14px',
                borderRadius: '16px',
                border: '1px solid ' + (selectedTag === null ? 'var(--brand-primary)' : 'var(--border-color)'),
                background: selectedTag === null ? 'var(--brand-primary)' : 'rgba(255, 255, 255, 0.02)',
                color: selectedTag === null ? '#ffffff' : 'var(--text-secondary)',
                fontWeight: selectedTag === null ? 600 : 400,
                transition: 'all var(--transition-fast)'
              }}
            >
              全部文章
            </button>
            {allTags.map(tag => (
              <button
                key={tag}
                onClick={() => setSelectedTag(tag)}
                style={{
                  fontSize: '12.5px',
                  padding: '6px 14px',
                  borderRadius: '16px',
                  border: '1px solid ' + (selectedTag === tag ? 'var(--brand-primary)' : 'var(--border-color)'),
                  background: selectedTag === tag ? 'var(--brand-primary)' : 'rgba(255, 255, 255, 0.02)',
                  color: selectedTag === tag ? '#ffffff' : 'var(--text-secondary)',
                  fontWeight: selectedTag === tag ? 600 : 400,
                  transition: 'all var(--transition-fast)'
                }}
              >
                #{tag}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 3. Article Cards Grid */}
      <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
        {filteredNotes.length === 0 ? (
          <div style={{
            padding: '64px 32px',
            textAlign: 'center',
            background: 'rgba(255,255,255,0.01)',
            border: '1px dashed var(--border-color)',
            borderRadius: 'var(--radius-lg)',
            color: 'var(--text-muted)'
          }}>
            目前沒有相符的公開文章。
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
            gap: '24px'
          }}>
            {filteredNotes.map(note => {
              const author = users.find(u => u.id === note.userId) || {
                displayName: '未知用戶',
                avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&h=150&q=80',
                username: 'unknown'
              };

              const commentsCount = comments.filter(c => c.noteId === note.id).length;

              return (
                <div
                  key={note.id}
                  className="glass-panel hover-scale"
                  style={{
                    borderRadius: 'var(--radius-lg)',
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column',
                    cursor: 'pointer',
                    boxShadow: 'var(--shadow-md)',
                    animation: 'fadeIn var(--transition-normal) forwards'
                  }}
                  onClick={() => navigateToView('reader', note.id)}
                >
                  {/* Card Cover Banner */}
                  <div style={{
                    height: '110px',
                    background: note.coverImage || 'linear-gradient(135deg, #1f2336 0%, #151824 100%)',
                    position: 'relative'
                  }}>
                    {/* Emoji badge */}
                    <div style={{
                      position: 'absolute',
                      bottom: '-16px',
                      left: '20px',
                      width: '40px',
                      height: '40px',
                      background: 'var(--bg-card)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '8px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '22px',
                      boxShadow: 'var(--shadow-sm)'
                    }}>
                      {note.icon || '📄'}
                    </div>
                  </div>

                  {/* Card Content Info */}
                  <div style={{
                    padding: '28px 20px 20px 20px',
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    gap: '12px'
                  }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <h3 style={{
                        fontSize: '17px',
                        fontWeight: 700,
                        color: 'var(--text-primary)',
                        lineHeight: '1.4',
                        margin: 0,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                      }}>
                        {note.title || '未命名筆記'}
                      </h3>
                      <p style={{
                        fontSize: '13px',
                        color: 'var(--text-secondary)',
                        lineHeight: '1.5',
                        height: '58px',
                        overflow: 'hidden',
                        display: '-webkit-box',
                        WebkitLineClamp: 3,
                        WebkitBoxOrient: 'vertical',
                        textOverflow: 'ellipsis'
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
                              const desc = parsed?.description || '點選開始測驗';
                              return `❓ 選擇題測驗 • 共 ${qCount} 題問題 • ${desc}`;
                            } catch (e) {
                              return '❓ 選擇題測驗';
                            }
                          } else {
                            return note.content.replace(/[#*`\n>!\[\]]/g, '').substring(0, 150);
                          }
                        })()}
                      </p>
                    </div>

                    {/* Tags sub-row */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', margin: '4px 0' }}>
                      {note.tags.slice(0, 3).map(tag => (
                        <span key={tag} style={{
                          fontSize: '10px',
                          fontWeight: 600,
                          background: 'rgba(255,255,255,0.04)',
                          color: 'var(--text-muted)',
                          padding: '2px 8px',
                          borderRadius: '10px'
                        }}>
                          #{tag}
                        </span>
                      ))}
                    </div>

                    {/* Card Footer author/metrics */}
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      borderTop: '1px solid var(--border-color)',
                      paddingTop: '12px',
                      marginTop: '4px'
                    }}>
                      {/* Author profile snippet */}
                      <div 
                        onClick={(e) => {
                          e.stopPropagation(); // Avoid opening note reader
                          navigateToView('profile', note.userId);
                        }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          cursor: 'pointer'
                        }}
                      >
                        <img 
                          src={author.avatarUrl} 
                          alt={author.displayName}
                          style={{ width: '24px', height: '24px', borderRadius: '50%', objectFit: 'cover' }}
                        />
                        <span style={{
                          fontSize: '12.5px',
                          fontWeight: 500,
                          color: 'var(--text-secondary)'
                        }}>
                          {author.displayName}
                        </span>
                      </div>

                      {/* Engagement Counters */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--text-muted)' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px' }}>
                          <Heart size={12} style={{ color: note.likes.length > 0 ? 'var(--brand-secondary)' : 'inherit' }} />
                          {note.likes.length}
                        </span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px' }}>
                          <MessageSquare size={12} />
                          {commentsCount}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
