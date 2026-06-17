import React from 'react';
import { useApp } from '../context/AppContext';
import { FileText, Globe, MessageSquare, Clock } from 'lucide-react';

export const HomeWorkspace: React.FC = () => {
  const { notes, comments, currentUser, navigateToView, setActiveNoteId } = useApp();

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

      {/* Recent Notes */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
          <Clock size={15} style={{ color: 'var(--text-muted)' }} />
          <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            最近編輯
          </span>
        </div>

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
    </div>
  );
};
