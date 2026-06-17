import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { 
  Inbox, Send, Bell, Trash2, Plus, X, 
  CornerUpLeft, Mail, Search, Download 
} from 'lucide-react';
import type { Message } from '../types';

export const InboxWorkspace: React.FC = () => {
  const { 
    messages, 
    comments, 
    notes, 
    currentUser, 
    users, 
    sendMessage, 
    deleteMessage, 
    markMessageAsRead,
    navigateToView,
    createNote,
    updateNote
  } = useApp();

  const currentUserId = currentUser ? currentUser.id : 'guest';

  // Navigation folders inside Inbox
  const [folder, setFolder] = useState<'inbox' | 'sent' | 'notifications'>('inbox');
  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Compose modal states
  const [showCompose, setShowCompose] = useState(false);
  const [composeTo, setComposeTo] = useState('');
  const [composeSubject, setComposeSubject] = useState('');
  const [composeContent, setComposeContent] = useState('');
  const [isSending, setIsSending] = useState(false);

  // Get unread counts
  const unreadMessagesCount = messages ? messages.filter(m => m.receiverId === currentUserId && !m.isRead).length : 0;
  
  // Comment notifications count
  const userNotesForComments = notes.filter(n => !n.isTrash && (currentUser ? n.userId === currentUser.id : n.userId === 'guest'));
  const userNoteIdsForComments = new Set(userNotesForComments.map(n => n.id));
  const commentNotifications = comments ? comments.filter(c => 
    userNoteIdsForComments.has(c.noteId) && c.userId !== currentUserId
  ) : [];

  // Filtered Messages / Comments based on folder & search
  const filteredMessages = (messages || []).filter(m => {
    const matchesFolder = folder === 'inbox' 
      ? (m.receiverId === currentUserId || m.senderId === currentUserId) 
      : m.senderId === currentUserId;
    if (!matchesFolder) return false;
    
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return m.subject.toLowerCase().includes(q) || m.content.toLowerCase().includes(q);
  });

  const filteredComments = commentNotifications.filter(c => {
    if (!searchQuery) return true;
    const note = notes.find(n => n.id === c.noteId);
    return c.content.toLowerCase().includes(searchQuery.toLowerCase()) || 
      (note && note.title.toLowerCase().includes(searchQuery.toLowerCase()));
  });

  const selectedMessage = messages ? messages.find(m => m.id === selectedMessageId) : null;

  // Recipient list (all users excluding current user)
  const recipients = users.filter(u => u.id !== currentUserId);

  const handleSelectMessage = (msg: Message) => {
    setSelectedMessageId(msg.id);
    if (msg.receiverId === currentUserId && !msg.isRead) {
      markMessageAsRead(msg.id);
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!composeTo) {
      alert('請選擇收件人');
      return;
    }
    setIsSending(true);
    try {
      await sendMessage(composeTo, composeSubject, composeContent);
      setComposeSubject('');
      setComposeContent('');
      setShowCompose(false);
    } catch (err: any) {
      console.error('Send mail failed:', err);
      alert('發送失敗: ' + (err?.message || err));
    } finally {
      setIsSending(false);
    }
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (confirm('確定要刪除這封郵件嗎？')) {
      await deleteMessage(id);
      if (selectedMessageId === id) {
        setSelectedMessageId(null);
      }
    }
  };

  // Reply handler
  const handleReply = (msg: Message) => {
    const sender = users.find(u => u.id === msg.senderId);
    if (!sender) return;
    setComposeTo(sender.id);
    setComposeSubject(msg.subject.startsWith('Re:') ? msg.subject : `Re: ${msg.subject}`);
    setComposeContent(`\n\n\n----- 原始郵件 -----\n寄件者：${sender.displayName}\n時間：${new Date(msg.createdAt).toLocaleString()}\n\n${msg.content}`);
    setShowCompose(true);
  };

  return (
    <div style={{
      display: 'flex',
      height: '100vh',
      width: '100%',
      background: 'var(--bg-editor)',
      color: 'var(--text-primary)',
      overflow: 'hidden'
    }}>
      {/* 1. LEFT SUB-SIDEBAR (Folders & Actions) */}
      <div style={{
        width: '220px',
        borderRight: '1px solid var(--border-color)',
        background: 'var(--bg-sidebar)',
        display: 'flex',
        flexDirection: 'column',
        padding: '24px 12px 16px 12px',
        gap: '20px',
        flexShrink: 0
      }}>
        {/* Compose Button */}
        <button
          onClick={() => {
            if (recipients.length === 0) {
              alert('系統中尚無其他註冊使用者！');
              return;
            }
            setComposeTo(recipients[0].id);
            setComposeSubject('');
            setComposeContent('');
            setShowCompose(true);
          }}
          className="btn-glow hover-scale"
          style={{
            width: '100%',
            padding: '10px',
            borderRadius: 'var(--radius-md)',
            background: 'var(--brand-primary)',
            color: '#ffffff',
            fontSize: '13.5px',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            cursor: 'pointer'
          }}
        >
          <Plus size={16} />
          <span>撰寫郵件</span>
        </button>

        {/* Folders List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {/* 收件匣 */}
          <button
            onClick={() => {
              setFolder('inbox');
              setSelectedMessageId(null);
            }}
            style={{
              width: '100%',
              padding: '8px 12px',
              borderRadius: 'var(--radius-sm)',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              background: folder === 'inbox' ? 'rgba(255, 255, 255, 0.05)' : 'transparent',
              color: folder === 'inbox' ? 'var(--text-primary)' : 'var(--text-secondary)',
              fontSize: '13px',
              fontWeight: folder === 'inbox' ? 600 : 400,
              textAlign: 'left'
            }}
          >
            <Inbox size={15} style={{ color: folder === 'inbox' ? 'var(--brand-primary)' : 'var(--text-muted)' }} />
            <span style={{ flex: 1 }}>收件匣</span>
            {unreadMessagesCount > 0 && (
              <span style={{
                fontSize: '11px',
                fontWeight: 600,
                background: 'var(--brand-primary)',
                color: '#fff',
                borderRadius: '10px',
                padding: '1px 6px'
              }}>{unreadMessagesCount}</span>
            )}
          </button>

          {/* 寄件備份 */}
          <button
            onClick={() => {
              setFolder('sent');
              setSelectedMessageId(null);
            }}
            style={{
              width: '100%',
              padding: '8px 12px',
              borderRadius: 'var(--radius-sm)',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              background: folder === 'sent' ? 'rgba(255, 255, 255, 0.05)' : 'transparent',
              color: folder === 'sent' ? 'var(--text-primary)' : 'var(--text-secondary)',
              fontSize: '13px',
              fontWeight: folder === 'sent' ? 600 : 400,
              textAlign: 'left'
            }}
          >
            <Send size={15} style={{ color: folder === 'sent' ? 'var(--brand-primary)' : 'var(--text-muted)' }} />
            <span>寄件備份</span>
          </button>

          {/* 筆記通知 */}
          <button
            onClick={() => {
              setFolder('notifications');
              setSelectedMessageId(null);
            }}
            style={{
              width: '100%',
              padding: '8px 12px',
              borderRadius: 'var(--radius-sm)',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              background: folder === 'notifications' ? 'rgba(255, 255, 255, 0.05)' : 'transparent',
              color: folder === 'notifications' ? 'var(--text-primary)' : 'var(--text-secondary)',
              fontSize: '13px',
              fontWeight: folder === 'notifications' ? 600 : 400,
              textAlign: 'left'
            }}
          >
            <Bell size={15} style={{ color: folder === 'notifications' ? 'var(--brand-secondary)' : 'var(--text-muted)' }} />
            <span style={{ flex: 1 }}>筆記留言通知</span>
            {commentNotifications.length > 0 && (
              <span style={{
                fontSize: '11px',
                fontWeight: 600,
                background: 'var(--brand-secondary)',
                color: '#fff',
                borderRadius: '10px',
                padding: '1px 6px'
              }}>{commentNotifications.length}</span>
            )}
          </button>
        </div>
      </div>

      {/* 2. CENTER PANEL (Message List) */}
      <div style={{
        width: '360px',
        borderRight: '1px solid var(--border-color)',
        display: 'flex',
        flexDirection: 'column',
        flexShrink: 0
      }}>
        {/* Search Bar */}
        <div style={{
          padding: '16px',
          borderBottom: '1px solid var(--border-color)',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          background: 'rgba(255, 255, 255, 0.01)'
        }}>
          <Search size={15} style={{ color: 'var(--text-muted)' }} />
          <input
            type="text"
            placeholder={folder === 'notifications' ? '搜尋留言內容...' : '搜尋主旨與內文...'}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              outline: 'none',
              fontSize: '12.5px',
              color: 'var(--text-primary)'
            }}
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} style={{ color: 'var(--text-muted)' }}>
              <X size={14} />
            </button>
          )}
        </div>

        {/* Scrollable list */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {/* Render Direct Messages */}
          {folder !== 'notifications' && (
            filteredMessages.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '48px 16px', color: 'var(--text-muted)', fontSize: '12.5px' }}>
                <Mail size={32} style={{ color: 'var(--text-muted)', opacity: 0.4, marginBottom: '8px' }} />
                <div>這裡空空如也</div>
              </div>
            ) : (
              filteredMessages.map(msg => {
                const isSentByMe = msg.senderId === currentUserId;
                const partnerId = isSentByMe ? msg.receiverId : msg.senderId;
                const partner = users.find(u => u.id === partnerId);
                const isSelected = selectedMessageId === msg.id;
                const showUnread = !isSentByMe && !msg.isRead;

                return (
                  <div
                    key={msg.id}
                    onClick={() => handleSelectMessage(msg)}
                    style={{
                      padding: '12px',
                      borderRadius: 'var(--radius-md)',
                      background: isSelected ? 'rgba(99, 102, 241, 0.08)' : 'var(--bg-card)',
                      border: '1px solid ' + (isSelected ? 'var(--brand-primary)' : 'var(--border-color)'),
                      cursor: 'pointer',
                      position: 'relative',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '4px',
                      transition: 'all var(--transition-fast)'
                    }}
                    onMouseEnter={(e) => {
                      const btn = e.currentTarget.querySelector('.mail-delete-btn');
                      if (btn) (btn as HTMLElement).style.opacity = '1';
                    }}
                    onMouseLeave={(e) => {
                      const btn = e.currentTarget.querySelector('.mail-delete-btn');
                      if (btn) (btn as HTMLElement).style.opacity = '0';
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}>
                        {isSentByMe ? (
                          <span style={{
                            fontSize: '9.5px',
                            padding: '1px 4px',
                            background: 'rgba(255, 255, 255, 0.08)',
                            border: '1px solid var(--border-color)',
                            color: 'var(--text-muted)',
                            borderRadius: '3px',
                            marginRight: '2px',
                            fontWeight: 600,
                            flexShrink: 0
                          }}>
                            已傳送
                          </span>
                        ) : (
                          showUnread && (
                            <div style={{
                              width: '6px',
                              height: '6px',
                              borderRadius: '50%',
                              background: 'var(--brand-primary)',
                              flexShrink: 0
                            }} />
                          )
                        )}
                        <span style={{
                          fontSize: '13px',
                          fontWeight: showUnread ? 700 : 500,
                          color: 'var(--text-primary)',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis'
                        }}>
                          {isSentByMe ? '寄給：' : '來自：'}{partner?.displayName || '未知用戶'}
                        </span>
                      </div>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)', flexShrink: 0 }}>
                        {new Date(msg.createdAt).toLocaleDateString()}
                      </span>
                    </div>

                    <div style={{
                      fontSize: '12.5px',
                      fontWeight: showUnread ? 600 : 400,
                      color: showUnread ? 'var(--text-primary)' : 'var(--text-secondary)',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }}>
                      {msg.subject}
                    </div>

                    <div style={{
                      fontSize: '11.5px',
                      color: 'var(--text-muted)',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }}>
                      {msg.content}
                    </div>

                    {/* Quick Delete */}
                    <button
                      className="mail-delete-btn"
                      onClick={(e) => handleDelete(e, msg.id)}
                      style={{
                        position: 'absolute',
                        right: '8px',
                        bottom: '8px',
                        opacity: 0,
                        padding: '4px',
                        borderRadius: '4px',
                        background: 'var(--bg-input)',
                        border: '1px solid var(--border-color)',
                        color: 'var(--text-muted)',
                        transition: 'opacity var(--transition-fast), color var(--transition-fast)'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.color = 'var(--accent-error)'}
                      onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-muted)'}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                );
              })
            )
          )}

          {/* Render Comment Notifications */}
          {folder === 'notifications' && (
            filteredComments.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '48px 16px', color: 'var(--text-muted)', fontSize: '12.5px' }}>
                <Bell size={32} style={{ color: 'var(--text-muted)', opacity: 0.4, marginBottom: '8px' }} />
                <div>目前沒有留言通知</div>
              </div>
            ) : (
              filteredComments.map(comment => {
                const commenter = users.find(u => u.id === comment.userId);
                const note = notes.find(n => n.id === comment.noteId);
                return (
                  <div
                    key={comment.id}
                    onClick={() => {
                      if (note) {
                        const isOwner = currentUser ? note.userId === currentUser.id : note.userId === 'guest';
                        navigateToView(isOwner ? 'editor' : 'reader', note.id);
                      }
                    }}
                    style={{
                      padding: '12px',
                      borderRadius: 'var(--radius-md)',
                      background: 'var(--bg-card)',
                      border: '1px solid var(--border-color)',
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '6px',
                      transition: 'border-color var(--transition-fast)'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--brand-secondary)'}
                    onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--border-color)'}
                  >
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <img
                        src={commenter?.avatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=50'}
                        style={{ width: '20px', height: '20px', borderRadius: '50%' }}
                      />
                      <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {commenter?.displayName || '訪客'}
                      </span>
                      <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                        {new Date(comment.createdAt).toLocaleDateString()}
                      </span>
                    </div>

                    <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)' }}>
                      在您的筆記「<b>{note?.title || '未命名'}</b>」中回覆：
                    </div>

                    <div style={{
                      fontSize: '12px',
                      color: 'var(--text-primary)',
                      padding: '6px 8px',
                      background: 'var(--bg-input)',
                      borderRadius: '4px',
                      borderLeft: '2px solid var(--brand-secondary)'
                    }}>
                      {comment.content}
                    </div>
                  </div>
                );
              })
            )
          )}
        </div>
      </div>

      {/* 3. RIGHT PANEL (Reading view & Inline Reply) */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--bg-editor)',
        height: '100%'
      }}>
        {selectedMessage ? (
          <div style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
            overflow: 'hidden'
          }}>
            {/* Top Toolbar */}
            <div style={{
              padding: '16px 24px',
              borderBottom: '1px solid var(--border-color)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: 'rgba(255, 255, 255, 0.01)',
              flexShrink: 0
            }}>
              <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>
                信件內容
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                {folder === 'inbox' && (
                  <button
                    onClick={() => handleReply(selectedMessage)}
                    style={{
                      padding: '6px 12px',
                      borderRadius: 'var(--radius-sm)',
                      background: 'var(--bg-input)',
                      border: '1px solid var(--border-color)',
                      fontSize: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      cursor: 'pointer',
                      transition: 'background var(--transition-fast)'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.04)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'var(--bg-input)'}
                  >
                    <CornerUpLeft size={13} />
                    <span>回覆</span>
                  </button>
                )}
                <button
                  onClick={(e) => handleDelete(e, selectedMessage.id)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: 'var(--radius-sm)',
                    background: 'var(--accent-error)',
                    color: '#ffffff',
                    fontSize: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    cursor: 'pointer'
                  }}
                >
                  <Trash2 size={13} />
                  <span>刪除信件</span>
                </button>
              </div>
            </div>

            {/* Scrollable Reader area */}
            <div style={{
              flex: 1,
              overflowY: 'auto',
              padding: '28px 24px',
              display: 'flex',
              flexDirection: 'column',
              gap: '24px'
            }}>
              {/* Mail Headers */}
              <div>
                <h1 style={{
                  fontSize: '20px',
                  fontWeight: 800,
                  color: 'var(--text-primary)',
                  marginBottom: '16px',
                  fontFamily: 'var(--font-display)',
                  letterSpacing: '-0.5px'
                }}>
                  {selectedMessage.subject}
                </h1>

                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                  {(() => {
                    const detailIsSentByMe = selectedMessage.senderId === currentUserId;
                    const displayUser = users.find(u => u.id === (detailIsSentByMe ? selectedMessage.receiverId : selectedMessage.senderId));
                    return (
                      <>
                        <img
                          src={displayUser?.avatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=80'}
                          style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover' }}
                        />
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--text-primary)' }}>
                            {detailIsSentByMe ? '收件者：' : '寄件者：'}
                            {displayUser?.displayName || '未知用戶'}
                          </div>
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                            時間：{new Date(selectedMessage.createdAt).toLocaleString('zh-TW')}
                          </div>
                        </div>
                      </>
                    );
                  })()}
                </div>
              </div>

              <div style={{ borderTop: '1px solid var(--border-color)' }} />

              {/* Mail content body */}
              <div style={{
                fontSize: '13.5px',
                lineHeight: '1.7',
                color: 'var(--text-secondary)',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                fontFamily: 'var(--font-sans)'
              }}>
                {selectedMessage.content}
              </div>

              {/* Attachment Section */}
              {selectedMessage.attachedNoteData && (
                <div style={{
                  marginTop: '24px',
                  padding: '16px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-color)',
                  background: 'rgba(255, 255, 255, 0.02)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '12px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: 'var(--radius-sm)',
                      background: 'rgba(99, 102, 241, 0.1)',
                      color: 'var(--brand-primary)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '20px'
                    }}>
                      {selectedMessage.attachedNoteData.icon || (
                        selectedMessage.attachedNoteData.type === 'mindmap' ? '🧠' :
                        selectedMessage.attachedNoteData.type === 'quiz' ? '❓' : '📄'
                      )}
                    </div>
                    <div>
                      <div style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--text-primary)' }}>
                        {selectedMessage.attachedNoteData.title}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                        附帶筆記：{
                          selectedMessage.attachedNoteData.type === 'mindmap' ? '心智圖' :
                          selectedMessage.attachedNoteData.type === 'quiz' ? '線上測驗' : '一般筆記'
                        }
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={async () => {
                      if (!currentUser && !confirm('您目前以訪客身份登入，匯入的筆記僅會暫存於您的瀏覽器中，確定要匯入嗎？')) {
                        return;
                      }
                      try {
                        const newNoteId = await createNote(null, selectedMessage.attachedNoteData!.type);
                        await updateNote(newNoteId, {
                          title: selectedMessage.attachedNoteData!.title + ' (匯入)',
                          content: selectedMessage.attachedNoteData!.content,
                          icon: selectedMessage.attachedNoteData!.icon,
                          coverImage: selectedMessage.attachedNoteData!.coverImage
                        });
                        alert('成功匯入筆記！正在轉向編輯器...');
                      } catch (err) {
                        console.error('Import failed:', err);
                        alert('匯入失敗，請稍後再試！');
                      }
                    }}
                    className="hover-scale"
                    style={{
                      padding: '8px 16px',
                      borderRadius: 'var(--radius-sm)',
                      background: 'var(--brand-primary)',
                      color: '#ffffff',
                      fontSize: '12px',
                      fontWeight: 600,
                      border: 'none',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      transition: 'transform var(--transition-fast)'
                    }}
                  >
                    <Download size={13} />
                    <span>匯入至我的筆記空間</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--text-muted)',
            gap: '12px'
          }}>
            <Mail size={48} style={{ color: 'var(--text-muted)', opacity: 0.2 }} />
            <span style={{ fontSize: '13px' }}>請從列表中選擇信件來閱讀。</span>
          </div>
        )}
      </div>

      {/* 4. COMPOSE MESSAGE DIALOG MODAL */}
      {showCompose && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.65)',
          backdropFilter: 'blur(3px)',
          zIndex: 10000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          {/* Backdrop Click Closes */}
          <div onClick={() => setShowCompose(false)} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} />

          <form 
            onSubmit={handleSend}
            className="glass-panel" 
            style={{
              width: '540px',
              maxWidth: '92vw',
              maxHeight: '90vh',
              borderRadius: 'var(--radius-lg)',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              boxShadow: 'var(--shadow-lg)',
              zIndex: 10001,
              border: '1px solid var(--border-color)',
              background: 'var(--bg-popover)'
            }}
          >
            {/* Modal Header */}
            <div style={{
              padding: '16px 20px',
              borderBottom: '1px solid var(--border-color)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: 'var(--bg-popover)'
            }}>
              <span style={{ fontWeight: 700, fontSize: '15px', color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}>
                撰寫信件
              </span>
              <button 
                type="button"
                onClick={() => setShowCompose(false)}
                style={{ color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', padding: '4px' }}
                onMouseEnter={(e)=>e.currentTarget.style.color='var(--text-primary)'}
                onMouseLeave={(e)=>e.currentTarget.style.color='var(--text-secondary)'}
              >
                <X size={18} />
              </button>
            </div>

            {/* Form Fields */}
            <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px', flex: 1, overflowY: 'auto' }}>
              {/* Recipient select */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>收件人</label>
                <select
                  value={composeTo}
                  onChange={(e) => setComposeTo(e.target.value)}
                  required
                  style={{
                    padding: '8px 10px',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border-color)',
                    background: 'var(--bg-input)',
                    color: 'var(--text-primary)',
                    fontSize: '13px',
                    outline: 'none'
                  }}
                >
                  {recipients.map(user => (
                    <option key={user.id} value={user.id}>
                      {user.displayName} (@{user.username})
                    </option>
                  ))}
                </select>
              </div>

              {/* Subject */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>郵件主旨</label>
                <input
                  type="text"
                  placeholder="輸入郵件主旨..."
                  value={composeSubject}
                  onChange={(e) => setComposeSubject(e.target.value)}
                  style={{
                    padding: '8px 10px',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border-color)',
                    background: 'var(--bg-input)',
                    color: 'var(--text-primary)',
                    fontSize: '13px',
                    outline: 'none'
                  }}
                />
              </div>

              {/* Body */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1 }}>
                <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>郵件內容</label>
                <textarea
                  placeholder="輸入信件內容..."
                  value={composeContent}
                  onChange={(e) => setComposeContent(e.target.value)}
                  required
                  style={{
                    padding: '10px',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border-color)',
                    background: 'var(--bg-input)',
                    color: 'var(--text-primary)',
                    fontSize: '13px',
                    outline: 'none',
                    resize: 'none',
                    minHeight: '180px',
                    flex: 1
                  }}
                />
              </div>
            </div>

            {/* Footer Buttons */}
            <div style={{
              padding: '12px 20px',
              borderTop: '1px solid var(--border-color)',
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '10px',
              background: 'var(--bg-popover)'
            }}>
              <button
                type="button"
                onClick={() => setShowCompose(false)}
                style={{
                  padding: '6px 14px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-color)',
                  background: 'transparent',
                  color: 'var(--text-secondary)',
                  fontSize: '12.5px',
                  cursor: 'pointer'
                }}
              >
                取消
              </button>
              <button
                type="submit"
                disabled={isSending}
                style={{
                  padding: '6px 16px',
                  borderRadius: 'var(--radius-sm)',
                  background: 'var(--brand-primary)',
                  color: '#ffffff',
                  fontSize: '12.5px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  border: 'none',
                  opacity: isSending ? 0.7 : 1
                }}
              >
                {isSending ? '發送中...' : '發送信件'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
