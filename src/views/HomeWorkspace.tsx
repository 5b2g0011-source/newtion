import React from 'react';
import { useApp } from '../context/AppContext';
import { FileText, Globe, MessageSquare } from 'lucide-react';

export const HomeWorkspace: React.FC = () => {
  const { notes, comments, currentUser, navigateToView, setActiveNoteId, users } = useApp();
  const [activeTab, setActiveTab] = React.useState<'my' | 'recommend'>('my');

  const userNotes = (currentUser
    ? notes.filter(n => n.userId === currentUser.id)
    : notes.filter(n => n.userId === 'guest')
  ).filter(n => !n.isTrash);

  const publicNotes = userNotes.filter(n => n.isPublic);

  const receivedComments = comments ? comments.filter(c => {
    const note = notes.find(n => n.id === c.noteId);
    return note && (currentUser ? note.userId === currentUser.id : note.userId === 'guest')
      && c.userId !== (currentUser ? currentUser.id : 'guest');
  }) : [];

  // Recent notes: sorted by updatedAt desc, top 6
  const recentNotes = [...userNotes]
    .sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''))
    .slice(0, 6);

  // Recommended Feed: creator followed or tags subscribed
  const recommendedNotes = React.useMemo(() => {
    const hasFollowsOrSubs = (currentUser?.following?.length || 0) > 0 || (currentUser?.subscribedTags?.length || 0) > 0;
    
    return notes
      .filter(n => n.isPublished && n.isPublic && !n.isTrash)
      .filter(n => {
        if (!hasFollowsOrSubs) return true; // Show all recent public notes if no active follows/subs
        const matchesAuthor = currentUser?.following?.includes(n.userId);
        const matchesTags = n.tags.some(tag => currentUser?.subscribedTags?.includes(tag));
        return matchesAuthor || matchesTags;
      })
      .sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''))
      .slice(0, 12);
  }, [notes, currentUser]);

  const statCards = [
    {
      label: '筆記總數',
      value: userNotes.length,
      icon: <FileText size={20} />,
      color: 'var(--brand-primary)',
      bg: 'rgba(99, 102, 241, 0.1)',
    },
    {
      label: '公開筆記',
      value: publicNotes.length,
      icon: <Globe size={20} />,
      color: '#10b981',
      bg: 'rgba(16, 185, 129, 0.1)',
    },
    {
      label: '收到的留言',
      value: receivedComments.length,
      icon: <MessageSquare size={20} />,
      color: '#f59e0b',
      bg: 'rgba(245, 158, 11, 0.1)',
    },
  ];

  const handleOpenNote = (id: string) => {
    setActiveNoteId(id);
    navigateToView('editor', id);
  };

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return '早安';
    if (h < 18) return '午安';
    return '晚安';
  };

  return (
    <div style={{
      height: '100vh',
      overflowY: 'auto',
      background: 'var(--bg-app)',
      padding: '48px 56px',
      boxSizing: 'border-box',
    }}>
      {/* Greeting */}
      <div style={{ marginBottom: '36px' }}>
        <h1 style={{
          fontSize: '28px',
          fontWeight: 700,
          color: 'var(--text-primary)',
          fontFamily: 'var(--font-display)',
          marginBottom: '6px',
        }}>
          {greeting()}，{currentUser?.displayName || '訪客'} 👋
        </h1>
        <p style={{ fontSize: '14px', color: 'var(--text-muted)' }}>
          {new Date().toLocaleDateString('zh-TW', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </div>

      {/* Stat Cards */}
      <div style={{ display: 'flex', gap: '16px', marginBottom: '48px', flexWrap: 'wrap' }}>
        {statCards.map(card => (
          <div key={card.label} style={{
            flex: '1 1 160px',
            background: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-md)',
            padding: '20px 24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
          }}>
            <div style={{
              width: '40px', height: '40px', borderRadius: '10px',
              background: card.bg, color: card.color,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {card.icon}
            </div>
            <div>
              <div style={{ fontSize: '28px', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1 }}>
                {card.value}
              </div>
              <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}>
                {card.label}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Feed Tabs Selector */}
      <div style={{
        display: 'flex',
        gap: '24px',
        borderBottom: '1px solid var(--border-color)',
        marginBottom: '24px'
      }}>
        <button
          onClick={() => setActiveTab('my')}
          style={{
            fontSize: '15px',
            fontWeight: activeTab === 'my' ? 700 : 500,
            color: activeTab === 'my' ? 'var(--brand-primary)' : 'var(--text-muted)',
            borderBottom: activeTab === 'my' ? '2px solid var(--brand-primary)' : '2px solid transparent',
            paddingBottom: '8px',
            background: 'transparent',
            border: 'none',
            outline: 'none',
            cursor: 'pointer',
            transition: 'all var(--transition-fast)'
          }}
        >
          我的最近編輯
        </button>
        <button
          onClick={() => setActiveTab('recommend')}
          style={{
            fontSize: '15px',
            fontWeight: activeTab === 'recommend' ? 700 : 500,
            color: activeTab === 'recommend' ? 'var(--brand-primary)' : 'var(--text-muted)',
            borderBottom: activeTab === 'recommend' ? '2px solid var(--brand-primary)' : '2px solid transparent',
            paddingBottom: '8px',
            background: 'transparent',
            border: 'none',
            outline: 'none',
            cursor: 'pointer',
            transition: 'all var(--transition-fast)'
          }}
        >
          推薦與訂閱牆 ✨
        </button>
      </div>

      {/* Feed Content List */}
      {activeTab === 'my' ? (
        <div>
          {recentNotes.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '14px' }}>
              還沒有任何筆記，開始建立第一篇吧！
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '12px' }}>
              {recentNotes.map(note => (
                <div
                  key={note.id}
                  onClick={() => handleOpenNote(note.id)}
                  style={{
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-md)',
                    padding: '16px 18px',
                    cursor: 'pointer',
                    transition: 'all var(--transition-fast)',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.background = 'var(--bg-hover)';
                    e.currentTarget.style.borderColor = 'var(--brand-primary)';
                    e.currentTarget.style.transform = 'translateY(-2px)';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.background = 'var(--bg-card)';
                    e.currentTarget.style.borderColor = 'var(--border-color)';
                    e.currentTarget.style.transform = 'translateY(0)';
                  }}
                >
                  <div style={{ fontSize: '20px', marginBottom: '8px' }}>
                    {note.icon || (note.type === 'mindmap' ? '🧠' : note.type === 'quiz' ? '❓' : '📄')}
                  </div>
                  <div style={{
                    fontSize: '13.5px', fontWeight: 600,
                    color: 'var(--text-primary)',
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                    marginBottom: '4px',
                  }}>
                    {note.title || '未命名筆記'}
                  </div>
                  <div style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
                    {note.updatedAt
                      ? new Date(note.updatedAt).toLocaleDateString('zh-TW', { month: 'short', day: 'numeric' })
                      : '—'}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div>
          {recommendedNotes.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '14px' }}>
              目前推薦牆沒有相符的文章，您可以先到探索廣場追蹤一些創作者或訂閱一些標籤！
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '12px' }}>
              {recommendedNotes.map(note => {
                const author = users.find(u => u.id === note.userId) || {
                  displayName: '未知用戶',
                  avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&h=150&q=80',
                  username: 'unknown'
                };

                return (
                  <div
                    key={note.id}
                    onClick={() => navigateToView('reader', note.id)}
                    style={{
                      background: 'var(--bg-card)',
                      border: '1px solid var(--border-color)',
                      borderRadius: 'var(--radius-md)',
                      padding: '16px 18px',
                      cursor: 'pointer',
                      transition: 'all var(--transition-fast)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px',
                      position: 'relative',
                      overflow: 'hidden'
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.background = 'var(--bg-hover)';
                      e.currentTarget.style.borderColor = 'var(--brand-primary)';
                      e.currentTarget.style.transform = 'translateY(-2px)';
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.background = 'var(--bg-card)';
                      e.currentTarget.style.borderColor = 'var(--border-color)';
                      e.currentTarget.style.transform = 'translateY(0)';
                    }}
                  >
                    {note.category && (
                      <span style={{
                        position: 'absolute',
                        top: '8px',
                        right: '8px',
                        fontSize: '9.5px',
                        fontWeight: 700,
                        background: 'rgba(99, 102, 241, 0.12)',
                        color: 'var(--brand-primary)',
                        padding: '1px 6px',
                        borderRadius: '4px'
                      }}>
                        {note.category}
                      </span>
                    )}

                    <div style={{ fontSize: '20px' }}>
                      {note.icon || (note.type === 'mindmap' ? '🧠' : note.type === 'quiz' ? '❓' : '📄')}
                    </div>

                    <div>
                      <div style={{
                        fontSize: '13.5px', fontWeight: 600,
                        color: 'var(--text-primary)',
                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                        marginBottom: '2px',
                      }}>
                        {note.title || '未命名筆記'}
                      </div>
                      
                      {/* Author row */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
                        <img 
                          src={author.avatarUrl} 
                          alt={author.displayName}
                          style={{ width: '16px', height: '16px', borderRadius: '50%', objectFit: 'cover' }}
                        />
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                          {author.displayName}
                        </span>
                      </div>
                    </div>

                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', borderTop: '1px solid var(--border-color)', paddingTop: '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span>
                        {note.updatedAt
                          ? new Date(note.updatedAt).toLocaleDateString('zh-TW', { month: 'short', day: 'numeric' })
                          : '—'}
                      </span>
                      {note.tags.length > 0 && (
                        <span style={{ color: 'var(--brand-secondary)' }}>
                          #{note.tags[0]}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
