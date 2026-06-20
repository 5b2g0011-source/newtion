import React, { useRef, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { MarkdownPreview } from '../components/MarkdownPreview';
import { TableOfContents } from '../components/TableOfContents';
import { CommentSection } from '../components/CommentSection';
import { ArrowLeft, Edit3, Heart, Calendar, Globe } from 'lucide-react';
import { MindMap } from '../components/MindMap';
import { QuizView } from '../components/QuizView';


export const ReaderWorkspace: React.FC = () => {
  const { 
    selectedReaderNoteId, 
    notes, 
    users, 
    currentUser, 
    toggleLike, 
    navigateToView,
    isCloud,
    markAllCommentsAsReadForNote
  } = useApp();

  const previewRef = useRef<HTMLDivElement>(null);
  
  const note = notes.find(n => n.id === selectedReaderNoteId);

  useEffect(() => {
    if (note) {
      markAllCommentsAsReadForNote(note.id);
    }
  }, [note?.id, markAllCommentsAsReadForNote]);

  if (!note) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        color: 'var(--text-muted)'
      }}>
        文章不存在或已被刪除。
      </div>
    );
  }

  const author = users.find(u => u.id === note.userId) || {
    displayName: '未知用戶',
    avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&h=150&q=80',
    username: 'unknown'
  };

  const isOwner = currentUser && note.userId === currentUser.id;
  const isLiked = currentUser && note.likes.includes(currentUser.id);

  const formatDate = (isoString: string) => {
    return new Date(isoString).toLocaleDateString('zh-TW', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div style={{
      flex: 1,
      height: '100vh',
      overflowY: 'auto',
      background: 'var(--bg-editor)',
      display: 'flex',
      flexDirection: 'column',
      position: 'relative'
    }}>
      
      {/* 1. Header Cover Background */}
      <div style={{
        height: note.coverImage ? '240px' : '64px',
        background: note.coverImage || 'transparent',
        position: 'relative',
        flexShrink: 0
      }}>
        {/* Floating Toolbar (Back to Explore, Edit if owner) */}
        <div style={{
          position: 'absolute',
          top: '20px',
          left: '24px',
          right: '24px',
          zIndex: 10,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <button
            onClick={() => navigateToView('explore')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              background: 'rgba(15, 17, 26, 0.7)',
              backdropFilter: 'blur(8px)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-md)',
              color: '#ffffff',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            <ArrowLeft size={14} />
            <span>返回探索廣場</span>
          </button>

          {(isOwner || note.isPublished) && (
            <button
              onClick={() => {
                if (isCloud && !currentUser) {
                  alert('請先登入以進行協同編輯！');
                  return;
                }
                navigateToView('editor', note.id);
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 14px',
                background: 'var(--brand-primary)',
                border: 'none',
                borderRadius: 'var(--radius-md)',
                color: '#ffffff',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
                boxShadow: 'var(--shadow-glow)'
              }}
            >
              <Edit3 size={14} />
              <span>{isOwner ? '進入編輯模式' : '加入協同編輯'}</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. Reader Body Container */}
      <div style={{
        maxWidth: '1000px',
        width: '100%',
        margin: '0 auto',
        padding: '0 24px 80px 24px',
        display: 'flex',
        gap: '40px',
        position: 'relative'
      }}>
        
        {/* Left/Middle Column: Content reading page */}
        <div style={{ flex: 1, minWidth: 0, marginTop: '-40px' }}>
          {note.type === 'mindmap' ? (
            <>
              {/* Mindmap Title & Author */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '2rem' }}>
                <h1 style={{
                  fontFamily: 'var(--font-display)',
                  fontWeight: 800,
                  fontSize: '2.5rem',
                  color: 'var(--text-primary)',
                  letterSpacing: '-0.5px',
                  lineHeight: '1.2'
                }}>
                  {note.title || '未命名心智圖'}
                </h1>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  borderBottom: '1px solid var(--border-color)',
                  paddingBottom: '20px'
                }}>
                  <div 
                    onClick={() => navigateToView('profile', note.userId)}
                    style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}
                  >
                    <img 
                      src={author.avatarUrl} 
                      alt={author.displayName}
                      style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover' }}
                    />
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontWeight: 600, fontSize: '14px', color: 'var(--text-primary)' }}>
                        {author.displayName}
                      </span>
                      <span style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
                        @{author.username}
                      </span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11.5px', color: 'var(--text-muted)' }}>
                      <Calendar size={12} />
                      發布時間：{formatDate(note.createdAt)}
                    </span>
                  </div>
                </div>
              </div>
              
              <div style={{
                height: '560px',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-lg)',
                overflow: 'hidden',
                marginTop: '10px',
                marginBottom: '2rem'
              }}>
                <MindMap note={note} readOnly={true} />
              </div>
              <CommentSection noteId={note.id} />
            </>
          ) : note.type === 'quiz' ? (
            <>
              {/* Quiz Title & Author */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '2rem' }}>
                <h1 style={{
                  fontFamily: 'var(--font-display)',
                  fontWeight: 800,
                  fontSize: '2.5rem',
                  color: 'var(--text-primary)',
                  letterSpacing: '-0.5px',
                  lineHeight: '1.2'
                }}>
                  {note.title || '未命名測驗'}
                </h1>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  borderBottom: '1px solid var(--border-color)',
                  paddingBottom: '20px'
                }}>
                  <div 
                    onClick={() => navigateToView('profile', note.userId)}
                    style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}
                  >
                    <img 
                      src={author.avatarUrl} 
                      alt={author.displayName}
                      style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover' }}
                    />
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontWeight: 600, fontSize: '14px', color: 'var(--text-primary)' }}>
                        {author.displayName}
                      </span>
                      <span style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
                        @{author.username}
                      </span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11.5px', color: 'var(--text-muted)' }}>
                      <Calendar size={12} />
                      發布時間：{formatDate(note.createdAt)}
                    </span>
                  </div>
                </div>
              </div>
              
              <div style={{
                height: '620px',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-lg)',
                overflow: 'hidden',
                marginTop: '10px',
                marginBottom: '2rem'
              }}>
                <QuizView note={note} readOnly={true} />
              </div>
              <CommentSection noteId={note.id} />
            </>
          ) : (
            <>
              {/* Emoji Badge overlay if preset */}
              {note.icon && (
                <div style={{
                  width: '72px',
                  height: '72px',
                  background: 'var(--bg-editor)',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-lg)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '40px',
                  boxShadow: 'var(--shadow-lg)',
                  marginBottom: '20px',
                  position: 'relative',
                  zIndex: 2
                }}>
                  {note.icon}
                </div>
              )}

              {/* Article Meta Header */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '2rem' }}>
                <h1 style={{
                  fontFamily: 'var(--font-display)',
                  fontWeight: 800,
                  fontSize: '2.5rem',
                  color: 'var(--text-primary)',
                  letterSpacing: '-0.5px',
                  lineHeight: '1.2'
                }}>
                  {note.title || '未命名筆記'}
                </h1>

                {/* Author bar info */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  borderBottom: '1px solid var(--border-color)',
                  paddingBottom: '20px'
                }}>
                  <div 
                    onClick={() => navigateToView('profile', note.userId)}
                    style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}
                  >
                    <img 
                      src={author.avatarUrl} 
                      alt={author.displayName}
                      style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover' }}
                    />
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontWeight: 600, fontSize: '14px', color: 'var(--text-primary)' }}>
                        {author.displayName}
                      </span>
                      <span style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
                        @{author.username}
                      </span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                    <span style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      fontSize: '11.5px',
                      color: 'var(--text-muted)'
                    }}>
                      <Calendar size={12} />
                      發布時間：{formatDate(note.createdAt)}
                    </span>
                    <span style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      fontSize: '11.5px',
                      color: 'var(--text-muted)'
                    }}>
                      <Globe size={12} />
                      已發布分享
                    </span>
                  </div>
                </div>
              </div>

              {/* Markdown Content Output */}
              <div ref={previewRef}>
                <MarkdownPreview 
                  content={note.content} 
                  style={{ padding: 0, overflowY: 'visible', height: 'auto' }}
                />
              </div>

              {/* Social Feedback Panel */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: 'rgba(255, 255, 255, 0.02)',
                border: '1px solid var(--border-color)',
                padding: '16px 24px',
                borderRadius: 'var(--radius-lg)',
                marginTop: '3rem'
              }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>
                    覺得這篇文章有幫助嗎？
                  </span>
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                    已有 {note.likes.length} 人按讚支持
                  </span>
                </div>

                <button
                  onClick={() => toggleLike(note.id)}
                  className="hover-scale"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '10px 20px',
                    background: isLiked ? 'rgba(236, 72, 153, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid ' + (isLiked ? 'var(--brand-secondary)' : 'var(--border-color)'),
                    borderRadius: 'var(--radius-lg)',
                    color: isLiked ? 'var(--brand-secondary)' : 'var(--text-primary)',
                    fontWeight: 600,
                    fontSize: '14px',
                    cursor: 'pointer',
                    transition: 'all var(--transition-fast)'
                  }}
                >
                  <Heart size={16} fill={isLiked ? 'var(--brand-secondary)' : 'transparent'} />
                  <span>{isLiked ? '已按讚' : '點擊按讚'}</span>
                </button>
              </div>

              {/* Discussion comments Section */}
              <CommentSection noteId={note.id} />
            </>
          )}
        </div>

        {/* Right Column: Outline navigation Table of Contents (sticky sidebar) */}
        {(!note.type || note.type === 'note') && (
          <div style={{
            width: '200px',
            flexShrink: 0,
            position: 'sticky',
            top: '24px',
            alignSelf: 'start',
            height: 'fit-content',
            display: 'none', // Hidden on narrow screens, shown via media query or flex wrapper
            marginTop: '60px'
          }} className="reader-toc">
            <div className="glass-panel" style={{ borderRadius: 'var(--radius-lg)' }}>
              <TableOfContents 
                content={note.content} 
                previewElement={previewRef.current}
              />
            </div>
          </div>
        )}

      </div>

      {/* Media query styling support for reader TOC */}
      <style>{`
        @media (min-width: 900px) {
          .reader-toc {
            display: block !important;
          }
        }
      `}</style>
    </div>
  );
};
