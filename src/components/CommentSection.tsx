import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Send, Trash2, MessageSquare, LogIn } from 'lucide-react';

interface CommentSectionProps {
  noteId: string;
}

export const CommentSection: React.FC<CommentSectionProps> = ({ noteId }) => {
  const { 
    currentUser, 
    users, 
    addComment, 
    deleteComment, 
    setAuthModalOpen,
    navigateToView,
    comments
  } = useApp();

  const [newComment, setNewComment] = useState('');

  const noteComments = comments
    .filter(c => c.noteId === noteId)
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    addComment(noteId, newComment.trim());
    setNewComment('');
  };

  const formatTime = (isoString: string) => {
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return '剛剛';
    if (diffMins < 60) return `${diffMins} 分鐘前`;
    if (diffHours < 24) return `${diffHours} 小時前`;
    if (diffDays < 7) return `${diffDays} 天前`;
    return date.toLocaleDateString('zh-TW', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div style={{
      borderTop: '1px solid var(--border-color)',
      paddingTop: '2rem',
      marginTop: '3rem',
      display: 'flex',
      flexDirection: 'column',
      gap: '1.5rem'
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        fontSize: '18px',
        fontWeight: 700,
        color: 'var(--text-primary)',
        fontFamily: 'var(--font-display)'
      }}>
        <MessageSquare size={20} style={{ color: 'var(--brand-primary)' }} />
        <span>文章留言討論 ({noteComments.length})</span>
      </div>

      {/* Comments List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {noteComments.length === 0 ? (
          <div style={{
            padding: '24px',
            textAlign: 'center',
            color: 'var(--text-muted)',
            fontSize: '14px',
            background: 'rgba(255,255,255,0.01)',
            borderRadius: 'var(--radius-md)',
            border: '1px dashed var(--border-color)'
          }}>
            目前尚無留言。成為第一個分享想法的人吧！
          </div>
        ) : (
          noteComments.map((comment: any) => {
            const author = users.find(u => u.id === comment.userId) || {
              displayName: '未知用戶',
              avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&h=150&q=80',
              username: 'unknown'
            };
            const isCommentOwner = currentUser && comment.userId === currentUser.id;

            return (
              <div 
                key={comment.id}
                style={{
                  display: 'flex',
                  gap: '12px',
                  padding: '12px',
                  background: 'rgba(255, 255, 255, 0.02)',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-md)',
                  animation: 'fadeIn var(--transition-fast) forwards'
                }}
              >
                <img 
                  src={author.avatarUrl} 
                  alt={author.displayName}
                  onClick={() => navigateToView('profile', comment.userId)}
                  style={{ 
                    width: '36px', 
                    height: '36px', 
                    borderRadius: '50%', 
                    objectFit: 'cover',
                    cursor: 'pointer'
                  }}
                />
                
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'baseline',
                    justifyContent: 'space-between',
                    marginBottom: '4px'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span 
                        onClick={() => navigateToView('profile', comment.userId)}
                        style={{
                          fontWeight: 600,
                          fontSize: '13px',
                          color: 'var(--text-primary)',
                          cursor: 'pointer'
                        }}
                      >
                        {author.displayName}
                      </span>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                        @{author.username}
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                        {formatTime(comment.createdAt)}
                      </span>
                      {isCommentOwner && (
                        <button
                          onClick={() => {
                            if (confirm('確定要刪除此留言嗎？')) {
                              deleteComment(comment.id);
                            }
                          }}
                          title="刪除留言"
                          style={{
                            color: 'var(--text-muted)',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.color = 'var(--accent-error)'}
                          onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-muted)'}
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  </div>

                  <p style={{
                    fontSize: '13.5px',
                    color: 'var(--text-secondary)',
                    lineHeight: '1.5',
                    wordBreak: 'break-word',
                    whiteSpace: 'pre-wrap'
                  }}>
                    {comment.content}
                  </p>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Add Comment Input */}
      {currentUser ? (
        <form onSubmit={handleSubmit} style={{
          display: 'flex',
          gap: '10px',
          alignItems: 'flex-start'
        }}>
          <img 
            src={currentUser.avatarUrl} 
            alt={currentUser.displayName}
            style={{ width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover' }}
          />
          <div style={{ flex: 1, position: 'relative' }}>
            <textarea
              placeholder="撰寫留言，參與討論..."
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              rows={2}
              style={{
                width: '100%',
                padding: '10px 48px 10px 14px',
                background: 'var(--bg-input)',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-md)',
                color: 'var(--text-primary)',
                outline: 'none',
                resize: 'none',
                fontSize: '13.5px',
                lineHeight: '1.5',
                transition: 'border-color var(--transition-fast)'
              }}
              onFocus={(e) => e.target.style.borderColor = 'var(--border-focus)'}
              onBlur={(e) => e.target.style.borderColor = 'var(--border-color)'}
            />
            <button
              type="submit"
              disabled={!newComment.trim()}
              className="hover-scale"
              style={{
                position: 'absolute',
                right: '10px',
                bottom: '12px',
                background: newComment.trim() ? 'var(--brand-primary)' : 'rgba(255,255,255,0.05)',
                color: newComment.trim() ? '#ffffff' : 'var(--text-muted)',
                borderRadius: 'var(--radius-sm)',
                padding: '6px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all var(--transition-fast)'
              }}
            >
              <Send size={14} />
            </button>
          </div>
        </form>
      ) : (
        <div style={{
          padding: '16px',
          background: 'rgba(99, 102, 241, 0.04)',
          border: '1px dashed var(--border-color)',
          borderRadius: 'var(--radius-md)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
          gap: '8px',
          textAlign: 'center'
        }}>
          <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
            登入後即可發表留言與社群作者互動！
          </span>
          <button
            onClick={() => setAuthModalOpen(true)}
            style={{
              padding: '6px 16px',
              background: 'var(--brand-primary)',
              color: '#ffffff',
              borderRadius: 'var(--radius-sm)',
              fontSize: '12px',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <LogIn size={13} />
            登入 / 註冊
          </button>
        </div>
      )}
    </div>
  );
};
