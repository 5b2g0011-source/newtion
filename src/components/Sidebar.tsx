import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import type { Note } from '../types';
import { 
  Search, Plus, ChevronDown, ChevronRight, 
  Trash2, Globe, FileText, LogOut, User as UserIcon,
  Library, Inbox, HelpCircle, X, Key
} from 'lucide-react';

export const Sidebar: React.FC = () => {
  const { 
    notes, 
    activeNoteId, 
    currentUser, 
    users,
    login,
    logout,
    createNote, 
    deleteNote, 
    setActiveNoteId, 
    setSearchOpen, 
    setAuthModalOpen,
    activeView,
    navigateToView,
    selectedUserId,
    isCloud,
    comments,
    messages
  } = useApp();

  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('newtion_theme') || '';
  });

  useEffect(() => {
    document.documentElement.className = theme;
    localStorage.setItem('newtion_theme', theme);
  }, [theme]);

  // Keep track of which pages are expanded
  const [expandedNodes, setExpandedNodes] = useState<Record<string, boolean>>({
    'note-guide': true // Guide is expanded by default
  });
  
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [addMenuOpen, setAddMenuOpen] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [activeHelpTab, setActiveHelpTab] = useState<'overview' | 'editor' | 'mindmap' | 'ai' | 'pages'>('overview');

  // Get notifications for Inbox
  const userNotesForComments = notes.filter(n => !n.isTrash && (currentUser ? n.userId === currentUser.id : n.userId === 'guest'));
  const userNoteIdsForComments = new Set(userNotesForComments.map(n => n.id));
  const incomingComments = comments ? comments.filter(c => 
    userNoteIdsForComments.has(c.noteId) && 
    c.userId !== (currentUser ? currentUser.id : 'guest')
  ) : [];

  const unreadMessages = messages ? messages.filter(m => 
    m.receiverId === (currentUser ? currentUser.id : 'guest') && !m.isRead
  ) : [];

  const totalInboxCount = incomingComments.length + unreadMessages.length;

  const toggleExpand = (noteId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedNodes(prev => ({
      ...prev,
      [noteId]: !prev[noteId]
    }));
  };

  const handleSelectPage = (id: string) => {
    setActiveNoteId(id);
    navigateToView('editor', id);
  };

  const handleAddPage = async (
    parentId: string | null = null, 
    type?: 'note' | 'mindmap' | 'quiz'
  ) => {
    const newId = await createNote(parentId, type);
    if (newId && parentId) {
      // Auto expand parent when adding child
      setExpandedNodes(prev => ({
        ...prev,
        [parentId]: true
      }));
    }
  };

  // Switch between mock users for demo purposes
  const handleSwitchUser = (username: string) => {
    setUserMenuOpen(false);
    login(username, 'password123'); // Custom dummy logins
  };

  // Get notes for sidebar
  const userNotes = (currentUser 
    ? notes.filter(n => n.userId === currentUser.id)
    : notes.filter(n => n.userId === 'guest')
  ).filter(n => !n.isTrash);

  const docNotes = userNotes.filter(n => n.type === 'note' || !n.type);

  // Render a recursive tree item
  const renderNoteItem = (note: Note, depth: number = 0) => {
    const children = docNotes.filter(n => n.parentId === note.id);
    const hasChildren = children.length > 0;
    const isExpanded = !!expandedNodes[note.id];
    const isActive = activeNoteId === note.id && activeView === 'editor';

    return (
      <div key={note.id} style={{ display: 'flex', flexDirection: 'column' }}>
        <div
          onClick={() => handleSelectPage(note.id)}
          style={{
            display: 'flex',
            alignItems: 'center',
            padding: '6px 8px 6px ' + (depth * 12 + 8) + 'px',
            borderRadius: 'var(--radius-sm)',
            cursor: 'pointer',
            background: isActive ? 'rgba(99, 102, 241, 0.15)' : 'transparent',
            color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
            transition: 'background var(--transition-fast)',
            position: 'relative'
          }}
          className="sidebar-item"
          onMouseEnter={(e) => {
            if (!isActive) e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)';
            const btns = e.currentTarget.querySelectorAll('.sidebar-action-btn');
            btns.forEach(b => (b as HTMLElement).style.opacity = '1');
          }}
          onMouseLeave={(e) => {
            if (!isActive) e.currentTarget.style.background = 'transparent';
            const btns = e.currentTarget.querySelectorAll('.sidebar-action-btn');
            btns.forEach(b => (b as HTMLElement).style.opacity = '0');
          }}
        >
          {/* Collapse/Expand Arrow */}
          <button
            onClick={(e) => toggleExpand(note.id, e)}
            style={{
              visibility: hasChildren ? 'visible' : 'hidden',
              padding: '2px',
              marginRight: '4px',
              color: 'var(--text-muted)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </button>

          {/* Icon */}
          <span style={{ marginRight: '8px', fontSize: '15px', display: 'flex', alignItems: 'center' }}>
            {note.icon || <FileText size={14} style={{ color: 'var(--text-muted)' }} />}
          </span>

          {/* Title */}
          <span style={{
            flex: 1,
            fontSize: '13.5px',
            fontWeight: isActive ? 600 : 400,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis'
          }}>
            {note.title || '未命名筆記'}
          </span>

          {/* Sidebar Actions (Add Subpage, Delete Page) */}
          <div style={{ display: 'flex', gap: '2px' }}>
            <button
              className="sidebar-action-btn"
              onClick={(e) => {
                e.stopPropagation();
                handleAddPage(note.id);
              }}
              title="新增子頁面"
              style={{
                opacity: 0,
                padding: '2px',
                borderRadius: '4px',
                color: 'var(--text-muted)',
                transition: 'opacity var(--transition-fast), color var(--transition-fast)'
              }}
              onMouseEnter={(e) => e.currentTarget.style.color = 'var(--text-primary)'}
              onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-muted)'}
            >
              <Plus size={14} />
            </button>
            <button
              className="sidebar-action-btn"
              onClick={(e) => {
                e.stopPropagation();
                if (confirm('確定要刪除此筆記及其所有子筆記嗎？')) {
                  deleteNote(note.id);
                }
              }}
              title="刪除"
              style={{
                opacity: 0,
                padding: '2px',
                borderRadius: '4px',
                color: 'var(--text-muted)',
                transition: 'opacity var(--transition-fast), color var(--transition-fast)'
              }}
              onMouseEnter={(e) => e.currentTarget.style.color = 'var(--accent-error)'}
              onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-muted)'}
            >
              <Trash2 size={14} />
            </button>
          </div>
        </div>

        {/* Render Children Recursively */}
        {hasChildren && isExpanded && (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {children.map(child => renderNoteItem(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  const renderFlatItem = (note: Note) => {
    const isActive = activeNoteId === note.id && activeView === 'editor';
    const itemIcon = note.type === 'mindmap' ? '🧠' : '❓';
    return (
      <div
        key={note.id}
        onClick={() => handleSelectPage(note.id)}
        className="sidebar-item"
        style={{
          display: 'flex',
          alignItems: 'center',
          padding: '6px 8px 6px 12px',
          borderRadius: 'var(--radius-sm)',
          cursor: 'pointer',
          background: isActive ? 'rgba(99, 102, 241, 0.15)' : 'transparent',
          color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
          transition: 'background var(--transition-fast)',
          position: 'relative'
        }}
        onMouseEnter={(e) => {
          if (!isActive) e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)';
          const btns = e.currentTarget.querySelectorAll('.sidebar-action-btn');
          btns.forEach(b => (b as HTMLElement).style.opacity = '1');
        }}
        onMouseLeave={(e) => {
          if (!isActive) e.currentTarget.style.background = 'transparent';
          const btns = e.currentTarget.querySelectorAll('.sidebar-action-btn');
          btns.forEach(b => (b as HTMLElement).style.opacity = '0');
        }}
      >
        <span style={{ marginRight: '8px', fontSize: '15px', display: 'flex', alignItems: 'center' }}>
          {note.icon || itemIcon}
        </span>
        <span style={{
          flex: 1,
          fontSize: '13.5px',
          fontWeight: isActive ? 600 : 400,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis'
        }}>
          {note.title || (note.type === 'mindmap' ? '未命名心智圖' : '未命名測驗')}
        </span>
        <button
          className="sidebar-action-btn"
          onClick={(e) => {
            e.stopPropagation();
            if (confirm('確定要刪除嗎？')) {
              deleteNote(note.id);
            }
          }}
          title="刪除"
          style={{
            opacity: 0,
            padding: '2px',
            borderRadius: '4px',
            color: 'var(--text-muted)',
            transition: 'opacity var(--transition-fast), color var(--transition-fast)'
          }}
          onMouseEnter={(e) => e.currentTarget.style.color = 'var(--accent-error)'}
          onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-muted)'}
        >
          <Trash2 size={14} />
        </button>
      </div>
    );
  };

  const topLevelItems = userNotes.filter(n => n.parentId === null);

  const sectionHeaderStyle: React.CSSProperties = {
    padding: '6px 8px',
    fontSize: '11px',
    fontWeight: 600,
    color: 'var(--text-muted)',
    letterSpacing: '0.5px',
    textTransform: 'uppercase',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between'
  };

  const emptyTextStyle: React.CSSProperties = {
    padding: '8px 12px',
    fontSize: '11.5px',
    color: 'var(--text-muted)',
    textAlign: 'center'
  };

  const addMenuItemStyle: React.CSSProperties = {
    width: '100%',
    padding: '8px 10px',
    display: 'flex',
    alignItems: 'center',
    borderRadius: 'var(--radius-sm)',
    fontSize: '12.5px',
    textAlign: 'left',
    background: 'transparent',
    border: 'none',
    color: 'var(--text-primary)',
    cursor: 'pointer',
    transition: 'background var(--transition-fast)'
  };

  return (
    <div style={{
      width: 'var(--sidebar-width)',
      height: '100vh',
      background: 'var(--bg-sidebar)',
      borderRight: '1px solid var(--border-color)',
      display: 'flex',
      flexDirection: 'column',
      userSelect: 'none',
      flexShrink: 0
    }}>
      {/* Top Brand Logo */}
      <div style={{
        padding: '16px 16px 8px 16px',
        display: 'flex',
        alignItems: 'center',
        gap: '10px'
      }}>
        <div style={{
          width: '28px',
          height: '28px',
          background: 'linear-gradient(135deg, var(--brand-primary) 0%, var(--brand-secondary) 100%)',
          borderRadius: '8px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#ffffff',
          fontWeight: 800,
          fontSize: '16px',
          fontFamily: 'var(--font-display)'
        }}>
          N
        </div>
        <span style={{
          fontFamily: 'var(--font-display)',
          fontWeight: 800,
          fontSize: '18px',
          letterSpacing: '-0.5px',
          background: 'linear-gradient(90deg, var(--text-primary) 0%, var(--text-secondary) 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          maxWidth: '180px'
        }} title={currentUser ? `${currentUser.displayName}的空間` : '空間'}>
          {currentUser ? `${currentUser.displayName}的空間` : '空間'}
        </span>
      </div>


      {/* Global Controls & Views */}
      <div style={{ padding: '12px 8px', display: 'flex', flexDirection: 'column', gap: '4px' }}>



        {/* 搜尋 */}
        <button
          onClick={() => setSearchOpen(true)}
          style={{
            width: '100%',
            padding: '8px 10px',
            borderRadius: 'var(--radius-sm)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: 'transparent',
            color: 'var(--text-secondary)',
            fontSize: '13px',
            fontWeight: 400,
            textAlign: 'left',
            transition: 'background var(--transition-fast)'
          }}
          onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)'}
          onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
        >
          <Search size={15} style={{ color: 'var(--text-muted)' }} />
          <span>搜尋</span>
          <span style={{ marginLeft: 'auto', fontSize: '11px', color: 'var(--text-muted)', opacity: 0.7 }}>Ctrl+P</span>
        </button>

        {/* 探索廣場 */}
        <button
          onClick={() => navigateToView('explore')}
          style={{
            width: '100%',
            padding: '8px 10px',
            borderRadius: 'var(--radius-sm)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: activeView === 'explore' ? 'rgba(255, 255, 255, 0.05)' : 'transparent',
            color: activeView === 'explore' ? 'var(--text-primary)' : 'var(--text-secondary)',
            fontSize: '13px',
            fontWeight: activeView === 'explore' ? 600 : 400,
            textAlign: 'left',
            transition: 'background var(--transition-fast)'
          }}
          onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)'}
          onMouseLeave={(e) => e.currentTarget.style.background = activeView === 'explore' ? 'rgba(255, 255, 255, 0.05)' : 'transparent'}
        >
          <Globe size={15} style={{ color: 'var(--text-muted)' }} />
          <span>探索廣場</span>
        </button>

        {currentUser && (
          <button
            onClick={() => navigateToView('profile', currentUser.id)}
            style={{
              width: '100%',
              padding: '8px 10px',
              borderRadius: 'var(--radius-sm)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              background: activeView === 'profile' && !selectedUserId ? 'rgba(255, 255, 255, 0.05)' : 'transparent',
              color: activeView === 'profile' && !selectedUserId ? 'var(--text-primary)' : 'var(--text-secondary)',
              fontSize: '13px',
              fontWeight: activeView === 'profile' && !selectedUserId ? 600 : 400,
              textAlign: 'left',
              transition: 'background var(--transition-fast)'
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)'}
            onMouseLeave={(e) => e.currentTarget.style.background = activeView === 'profile' && !selectedUserId ? 'rgba(255, 255, 255, 0.05)' : 'transparent'}
          >
            <UserIcon size={15} style={{ color: 'var(--text-muted)' }} />
            <span>我的個人檔案</span>
          </button>
        )}

        {/* 收件夾 */}
        <button
          onClick={() => navigateToView('inbox')}
          style={{
            width: '100%',
            padding: '8px 10px',
            borderRadius: 'var(--radius-sm)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: activeView === 'inbox' ? 'rgba(255, 255, 255, 0.05)' : 'transparent',
            color: activeView === 'inbox' ? 'var(--text-primary)' : 'var(--text-secondary)',
            fontSize: '13px',
            fontWeight: activeView === 'inbox' ? 600 : 400,
            textAlign: 'left',
            transition: 'background var(--transition-fast)'
          }}
          onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)'}
          onMouseLeave={(e) => e.currentTarget.style.background = activeView === 'inbox' ? 'rgba(255, 255, 255, 0.05)' : 'transparent'}
        >
          <Inbox size={15} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
          <span>收件夾</span>
          {totalInboxCount > 0 && (
            <span style={{
              marginLeft: 'auto',
              fontSize: '11px',
              fontWeight: 600,
              background: 'var(--brand-secondary)',
              color: '#fff',
              borderRadius: '10px',
              padding: '1px 6px'
            }}>{totalInboxCount}</span>
          )}
        </button>

        {/* 媒體櫃 */}
        <button
          onClick={() => navigateToView('media')}
          style={{
            width: '100%',
            padding: '8px 10px',
            borderRadius: 'var(--radius-sm)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: activeView === 'media' ? 'rgba(255, 255, 255, 0.05)' : 'transparent',
            color: activeView === 'media' ? 'var(--text-primary)' : 'var(--text-secondary)',
            fontSize: '13px',
            fontWeight: activeView === 'media' ? 600 : 400,
            textAlign: 'left',
            transition: 'background var(--transition-fast)'
          }}
          onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)'}
          onMouseLeave={(e) => e.currentTarget.style.background = activeView === 'media' ? 'rgba(255, 255, 255, 0.05)' : 'transparent'}
        >
          <Library size={15} style={{ color: 'var(--text-muted)' }} />
          <span>媒體櫃</span>
        </button>
      </div>

      {/* Sidebar Sections Container (Scrollable) */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '0 8px 16px 8px',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px'
      }}>
        {/* Section: 私人 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', position: 'relative' }}>
          <div style={sectionHeaderStyle}>
            <span>私人</span>
          </div>

          {/* Unified List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            {topLevelItems.length === 0 ? (
              <div style={emptyTextStyle}>尚無頁面</div>
            ) : (
              topLevelItems.map(item => {
                if (item.type === 'mindmap' || item.type === 'quiz') {
                  return renderFlatItem(item);
                } else {
                  return renderNoteItem(item, 0);
                }
              })
            )}
          </div>

          {/* 新增按鈕 */}
          <div style={{ position: 'relative', marginTop: '4px' }}>
            <div
              onClick={() => setAddMenuOpen(!addMenuOpen)}
              style={{
                display: 'flex',
                alignItems: 'center',
                padding: '6px 8px 6px 12px',
                borderRadius: 'var(--radius-sm)',
                cursor: 'pointer',
                color: 'var(--text-secondary)',
                transition: 'background var(--transition-fast)'
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
            >
              <Plus size={14} style={{ marginRight: '8px', color: 'var(--text-muted)' }} />
              <span style={{ fontSize: '13px' }}>新增</span>
            </div>
            
            {addMenuOpen && (
              <>
                <div 
                  onClick={() => setAddMenuOpen(false)}
                  style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 100 }}
                />
                <div 
                  className="glass-panel"
                  style={{
                    position: 'absolute',
                    top: 'calc(100% + 4px)',
                    left: '12px',
                    width: '160px',
                    zIndex: 101,
                    padding: '4px',
                    borderRadius: 'var(--radius-md)',
                    boxShadow: 'var(--shadow-lg)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '2px',
                    background: 'var(--bg-popover)',
                    border: '1px solid var(--border-color)'
                  }}
                >
                  <button
                    onClick={() => {
                      setAddMenuOpen(false);
                      handleAddPage(null, 'note');
                    }}
                    style={addMenuItemStyle}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    <span>📄 新增筆記頁面</span>
                  </button>
                  <button
                    onClick={() => {
                      setAddMenuOpen(false);
                      handleAddPage(null, 'mindmap');
                    }}
                    style={addMenuItemStyle}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    <span>🧠 新增心智圖</span>
                  </button>
                  <button
                    onClick={() => {
                      setAddMenuOpen(false);
                      handleAddPage(null, 'quiz');
                    }}
                    style={addMenuItemStyle}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    <span>❓ 新增線上測驗</span>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Utilities */}
      <div style={{
        borderTop: '1px solid var(--border-color)',
        padding: '8px 8px 0 8px',
        display: 'flex',
        flexDirection: 'column',
        gap: '4px'
      }}>
        {/* 自訂 API 金鑰按鈕 */}
        <button
          onClick={() => {
            window.dispatchEvent(new CustomEvent('open-ai-assistant', { detail: { openSettings: true } }));
          }}
          style={{
            width: '100%',
            padding: '8px 10px',
            borderRadius: 'var(--radius-sm)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: 'transparent',
            color: 'var(--text-secondary)',
            fontSize: '13px',
            fontWeight: 400,
            textAlign: 'left',
            transition: 'background var(--transition-fast)'
          }}
          onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)'}
          onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
        >
          <Key size={15} style={{ color: 'var(--accent-warning)' }} />
          <span>自訂 API 金鑰</span>
        </button>

        {/* 使用說明按鈕 */}
        <button
          onClick={() => setShowHelpModal(true)}
          style={{
            width: '100%',
            padding: '8px 10px',
            borderRadius: 'var(--radius-sm)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: showHelpModal ? 'rgba(255, 255, 255, 0.05)' : 'transparent',
            color: showHelpModal ? 'var(--text-primary)' : 'var(--text-secondary)',
            fontSize: '13px',
            fontWeight: showHelpModal ? 600 : 400,
            textAlign: 'left',
            transition: 'background var(--transition-fast)'
          }}
          onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)'}
          onMouseLeave={(e) => e.currentTarget.style.background = showHelpModal ? 'rgba(255, 255, 255, 0.05)' : 'transparent'}
        >
          <HelpCircle size={15} style={{ color: 'var(--brand-primary)' }} />
          <span>使用說明</span>
        </button>

        {/* 垃圾桶按鈕 */}
        <button
          onClick={() => navigateToView('trash')}
          style={{
            width: '100%',
            padding: '8px 10px',
            borderRadius: 'var(--radius-sm)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: activeView === 'trash' ? 'rgba(255, 255, 255, 0.05)' : 'transparent',
            color: activeView === 'trash' ? 'var(--text-primary)' : 'var(--text-secondary)',
            fontSize: '13px',
            fontWeight: activeView === 'trash' ? 600 : 400,
            textAlign: 'left',
            transition: 'background var(--transition-fast)'
          }}
          onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)'}
          onMouseLeave={(e) => e.currentTarget.style.background = activeView === 'trash' ? 'rgba(255, 255, 255, 0.05)' : 'transparent'}
        >
          <Trash2 size={15} style={{ color: 'var(--text-muted)' }} />
          <span>垃圾桶</span>
        </button>
      </div>

      {/* Theme Selector */}
      <div style={{
        borderTop: '1px solid var(--border-color)',
        padding: '12px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '8px'
      }}>
        <span style={{ fontSize: '12.5px', fontWeight: 500, color: 'var(--text-secondary)' }}>主題配色</span>
        <select
          value={theme}
          onChange={(e) => setTheme(e.target.value)}
          style={{
            background: 'var(--bg-input)',
            color: 'var(--text-primary)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-sm)',
            fontSize: '12px',
            padding: '4px 8px',
            cursor: 'pointer',
            outline: 'none',
            width: '100px'
          }}
        >
          <option value="">預設深色</option>
          <option value="light">明亮模式</option>
          <option value="theme-sepia">復古暖沙</option>
          <option value="theme-forest">森林綠意</option>
        </select>
      </div>

      {/* Bottom User Area */}
      <div style={{
        borderTop: '1px solid var(--border-color)',
        padding: '12px',
        position: 'relative'
      }}>
        {currentUser ? (
          <div>
            <div 
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                cursor: 'pointer',
                padding: '6px',
                borderRadius: 'var(--radius-md)',
                transition: 'background var(--transition-fast)'
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
            >
              <img 
                src={currentUser.avatarUrl} 
                alt={currentUser.displayName}
                style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover' }}
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontSize: '13px',
                  fontWeight: 600,
                  color: 'var(--text-primary)',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis'
                }}>
                  {currentUser.displayName}
                </div>
                <div style={{
                  fontSize: '11px',
                  color: 'var(--text-muted)',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis'
                }}>
                  {isCloud ? '雲端帳戶' : `@${currentUser.username}`}
                </div>
              </div>
              <ChevronDown size={14} style={{ color: 'var(--text-muted)' }} />
            </div>

            {userMenuOpen && (
              <>
                <div 
                  onClick={() => setUserMenuOpen(false)}
                  style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 100 }}
                />
                <div 
                  className="glass-panel"
                  style={{
                    position: 'absolute',
                    bottom: 'calc(100% + 8px)',
                    left: '12px',
                    width: 'calc(100% - 24px)',
                    zIndex: 101,
                    padding: '8px',
                    borderRadius: 'var(--radius-md)',
                    boxShadow: 'var(--shadow-lg)'
                  }}
                >
                  {!isCloud && (
                    <>
                      <div style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-muted)', padding: '4px 8px 6px' }}>
                        切換測試帳號 (DEMO)
                      </div>
                      {users.filter(u => u.id !== currentUser.id).map(user => (
                        <button
                          key={user.id}
                          onClick={() => handleSwitchUser(user.username)}
                          style={{
                            width: '100%',
                            padding: '6px 8px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            borderRadius: 'var(--radius-sm)',
                            fontSize: '12px',
                            textAlign: 'left'
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)'}
                          onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                        >
                          <img src={user.avatarUrl} style={{ width: '20px', height: '20px', borderRadius: '50%' }} />
                          <span>{user.displayName}</span>
                        </button>
                      ))}
                      <div style={{ borderTop: '1px solid var(--border-color)', margin: '6px 0' }} />
                    </>
                  )}
                  <button
                    onClick={() => {
                      setUserMenuOpen(false);
                      logout();
                    }}
                    style={{
                      width: '100%',
                      padding: '8px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: '12px',
                      color: 'var(--accent-error)',
                      textAlign: 'left'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.08)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    <LogOut size={14} />
                    <span>登出系統</span>
                  </button>
                </div>
              </>
            )}
          </div>
        ) : (
          <button
            onClick={() => setAuthModalOpen(true)}
            className="hover-scale btn-glow"
            style={{
              width: '100%',
              padding: '10px',
              borderRadius: 'var(--radius-md)',
              background: 'var(--brand-primary)',
              color: '#ffffff',
              fontSize: '13px',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              boxShadow: 'var(--shadow-glow)'
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#ffffff"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#ffffff"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#ffffff"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#ffffff"/>
            </svg>
            <span>使用 Google 登入</span>
          </button>
        )}
      </div>

      {/* 詳細網站使用說明互動 Modal */}
      {showHelpModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.65)',
          backdropFilter: 'blur(4px)',
          zIndex: 10000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          {/* 點擊背景關閉 */}
          <div 
            onClick={() => setShowHelpModal(false)}
            style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
          />

          <div className="glass-panel" style={{
            width: '720px',
            maxWidth: '92vw',
            height: '600px',
            maxHeight: '85vh',
            borderRadius: 'var(--radius-lg)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            boxShadow: 'var(--shadow-lg)',
            zIndex: 10001,
            border: '1px solid var(--border-color)'
          }}>
            {/* Header */}
            <div style={{
              padding: '16px 20px',
              borderBottom: '1px solid var(--border-color)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: 'var(--bg-popover)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <HelpCircle size={18} style={{ color: 'var(--brand-primary)' }} />
                <span style={{ fontWeight: 700, fontSize: '16px', color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}>
                  Newtion 系統完整使用指南
                </span>
              </div>
              <button 
                onClick={() => setShowHelpModal(false)}
                style={{ color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', padding: '4px' }}
                onMouseEnter={(e)=>e.currentTarget.style.color='var(--text-primary)'}
                onMouseLeave={(e)=>e.currentTarget.style.color='var(--text-secondary)'}
              >
                <X size={18} />
              </button>
            </div>

            {/* Tab 切換器 */}
            <div style={{
              display: 'flex',
              borderBottom: '1px solid var(--border-color)',
              backgroundColor: 'var(--bg-input)',
              padding: '0 12px',
              overflowX: 'auto'
            }}>
              {([
                { id: 'overview', label: '🚀 系統總覽' },
                { id: 'editor', label: '✍️ 編輯與語法' },
                { id: 'mindmap', label: '🧠 畫布心智圖' },
                { id: 'ai', label: '🤖 AI 智慧助手' },
                { id: 'pages', label: '📂 頁面與社群' }
              ] as const).map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveHelpTab(tab.id)}
                  style={{
                    padding: '12px 16px',
                    fontSize: '13px',
                    fontWeight: activeHelpTab === tab.id ? 700 : 500,
                    color: activeHelpTab === tab.id ? 'var(--brand-primary)' : 'var(--text-secondary)',
                    borderBottom: '2px solid ' + (activeHelpTab === tab.id ? 'var(--brand-primary)' : 'transparent'),
                    marginBottom: '-1px',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    transition: 'all var(--transition-fast)'
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* 說明內文 (可捲動) */}
            <div style={{
              flex: 1,
              overflowY: 'auto',
              padding: '24px',
              fontSize: '13.5px',
              lineHeight: '1.6',
              color: 'var(--text-secondary)',
              backgroundColor: 'var(--bg-popover)'
            }}>
              {activeHelpTab === 'overview' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <h3 style={{ color: 'var(--text-primary)', fontSize: '15px', fontWeight: 700 }}>🚀 歡迎使用 Newtion</h3>
                  <p>
                    Newtion 是一個極致流暢、功能豐富的個人知識管理與創作空間。本系統支援雲端即時同步與訪客離線儲存，完美融合了筆記編輯、關係心智圖、線上測驗與 AI 智慧寫作助手。
                  </p>
                  
                  <h4 style={{ color: 'var(--text-primary)', fontSize: '14px', fontWeight: 600, marginTop: '8px' }}>🌐 核心工作區概覽</h4>
                  <ul style={{ paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <li><b>📄 筆記編輯器</b>：完美相容標準 Markdown 格式，支援精美 KaTeX 數學公式、自動產生左側大綱目錄，並可一鍵下載匯出筆記檔案。</li>
                    <li><b>🧠 畫布心智圖</b>：提供自由拖曳與長寬縮放、關係線連接，內建經典範本與 9 種視覺圖形形狀（支援矩形、圓形、三角形、平行四邊形、圓柱體等），可直接匯出向量 SVG 檔。</li>
                    <li><b>❓ 線上測驗</b>：支援針對筆記或心智圖，利用 AI 自動生成或手動編輯專屬測驗題，提升學習與記憶效率。</li>
                    <li><b>📂 媒體櫃</b>：統一管理所有上傳的背景封面與內文圖片附件，方便隨時調用。</li>
                    <li><b>🎨 主題配色</b>：點擊側邊欄底部的主題下拉選單，即可一鍵切換預設深色、明亮模式、復古暖沙、森林綠意等四種視覺配色。</li>
                  </ul>

                  <h4 style={{ color: 'var(--text-primary)', fontSize: '14px', fontWeight: 600, marginTop: '8px' }}>⌨️ 全域快捷鍵</h4>
                  <ul style={{ paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <li>鍵盤按下 <code>Ctrl + P</code> (或 macOS <code>Cmd + P</code>) 可以立刻喚起全域模糊搜尋框，快速尋找並切換至任何筆記或心智圖頁面。</li>
                  </ul>
                </div>
              )}

              {activeHelpTab === 'editor' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <h3 style={{ color: 'var(--text-primary)', fontSize: '15px', fontWeight: 700 }}>✍️ Markdown 編輯器與語法指南</h3>
                  <p>本系統的 Markdown 編輯器提供「純編輯」、「預覽」、「雙欄對照」三種模式，並支援標準排版格式：</p>
                  
                  <h4 style={{ color: 'var(--text-primary)', fontSize: '14px', fontWeight: 600, marginTop: '8px' }}>1. 常用 Markdown 語法</h4>
                  <ul style={{ paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <li><b>標題結構</b>：輸入 <code># 標題一</code>、<code>## 標題二</code>、<code>### 標題三</code> 來設定不同層級的大小。</li>
                    <li><b>字體樣式</b>：使用 <code>**粗體文字**</code> 表達核心重點，<code>*斜體文字*</code> 與 <code>~~刪除線~~</code> 則做為輔助標註。</li>
                    <li><b>引用與清單</b>：以 <code>&gt; 引用內容</code> 建立 Notion 風格的精美引用區塊；使用 <code>- 項目</code> 建立無序清單。</li>
                    <li><b>程式碼區塊</b>：輸入三個反單引號並指定語言（如 <code>```typescript ... ```</code>）即可渲染精美的程式碼高亮排版。</li>
                  </ul>

                  <h4 style={{ color: 'var(--text-primary)', fontSize: '14px', fontWeight: 600, marginTop: '8px' }}>2. 📐 LaTeX 數學公式 (KaTeX)</h4>
                  <p>內建 KaTeX 解析引擎，能完美渲染學術級數學符號：</p>
                  <ul style={{ paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <li><b>行內公式</b>：使用單個錢字號包裹公式，如 <code>$E = mc^2$</code>。</li>
                    <li><b>獨立區塊公式</b>：使用雙錢字號包裹，會自動獨立換行置中，例如：{"$$\\sum_{i=1}^n i = \\frac{n(n+1)}{2}$$"}。</li>
                  </ul>

                  <h4 style={{ color: 'var(--text-primary)', fontSize: '14px', fontWeight: 600, marginTop: '8px' }}>3. 本機匯入與匯出</h4>
                  <p>編輯器底部工具列右側提供檔案下載圖示，可一鍵將當前內容存為 <code>.md</code> 或 <code>.txt</code> 格式。您也可以直接將本機的 Markdown 檔案載入編輯器，進行覆蓋或續寫。</p>
                </div>
              )}

              {activeHelpTab === 'mindmap' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <h3 style={{ color: 'var(--text-primary)', fontSize: '15px', fontWeight: 700 }}>🧠 畫布心智圖操作說明</h3>
                  <p>畫布心智圖提供思維視覺化與架構繪製空間，支援多種自訂控制與 9 種圖案形狀：</p>

                  <h4 style={{ color: 'var(--text-primary)', fontSize: '14px', fontWeight: 600, marginTop: '8px' }}>1. 新增與操作節點</h4>
                  <ul style={{ paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <li><b>新增圖形</b>：在左側「新增圖形節點」面板中可選取：<b>矩形、圓角矩形、圓形、菱形、資料庫、三角形、六角形、平行四邊形、圓柱體</b>。點擊即可在畫布中央生成。</li>
                    <li><b>拖曳與縮放</b>：按住節點中心即可拖曳移動位置；選取節點後，拖曳其**右下角白色控制方塊**可調整長度與寬度。</li>
                    <li><b>樣式列與文字</b>：選取節點後，上方會彈出浮動控制列，可更換填充色彩、字體大小、修改節點形狀，或直接修改內容文字。</li>
                  </ul>

                  <h4 style={{ color: 'var(--text-primary)', fontSize: '14px', fontWeight: 600, marginTop: '8px' }}>2. 關係連線</h4>
                  <ul style={{ paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <li>滑鼠指針懸停於任何節點上時，其左右兩側會亮起**白色小圓圈（連接點）**。</li>
                    <li>點選白色圓圈並按住拖曳出連線指向另一個節點，釋放滑鼠即可自動建立有向箭頭關係連線。</li>
                  </ul>

                  <h4 style={{ color: 'var(--text-primary)', fontSize: '14px', fontWeight: 600, marginTop: '8px' }}>3. 經典思維範本與向量導出</h4>
                  <ul style={{ paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <li>點擊頂部工具列的「套用模板」，可一鍵自動建置<b>「SWOT 分析」</b>、<b>「專案啟動計畫 (Project Launch)」</b>與<b>「腦力激盪 (Brainstorming)」</b>三種經典圖表。</li>
                    <li>繪製完成後，點擊右下角下載圖示，即可將整張畫布匯出成無損的 <code>.svg</code> 向量圖片。</li>
                  </ul>
                </div>
              )}

              {activeHelpTab === 'ai' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <h3 style={{ color: 'var(--text-primary)', fontSize: '15px', fontWeight: 700 }}>🤖 AI 智慧寫作與協作指南</h3>
                  <p>系統無縫整合 OpenRouter 平台，為您提供頂尖 AI 模型（如 Gemini 2.5 Flash, Llama 3）的寫作與內容修改協助：</p>

                  <h4 style={{ color: 'var(--text-primary)', fontSize: '14px', fontWeight: 600, marginTop: '8px' }}>1. API 金鑰設定</h4>
                  <p>點擊右下角 Sparkles 懸浮按鈕打開 AI 側邊欄，再點擊右上角 Settings 齒輪。在此您可以填入個人 OpenRouter 金鑰（安全儲存於您的瀏覽器本地）。若未填寫，系統會自動 fallback 使用共享金鑰供直接呼叫。</p>

                  <h4 style={{ color: 'var(--text-primary)', fontSize: '14px', fontWeight: 600, marginTop: '8px' }}>2. ✨ Sparkles 局部文字選取改寫</h4>
                  <ul style={{ paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <li>在 Markdown 編輯器中，使用滑鼠**圈選任意一段文字段落**。</li>
                    <li>編輯器頂部快捷列會點亮 <b>Sparkles 閃爍圖示</b>。</li>
                    <li>點擊該圖示會將選取的文字直接帶入 AI 側邊欄！您可以直接對 AI 下達「翻譯成英文」、「潤飾更流暢」、「擴寫/縮寫」等指令。</li>
                  </ul>

                  <h4 style={{ color: 'var(--text-primary)', fontSize: '14px', fontWeight: 600, marginTop: '8px' }}>3. 筆記內容同步與寫入</h4>
                  <ul style={{ paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <li>在對話框中點選「讀取目前筆記」，AI 就會主動將當前整篇筆記載入，方便您要求「請幫我寫這篇筆記的摘要」或「請幫我續寫」。</li>
                    <li>AI 回覆內容後，可點選訊息氣泡底部的<b>「插入至尾端」</b>或<b>「覆蓋筆記」</b>，一鍵將寫作成果填入您的筆記中，無須手動貼上。</li>
                  </ul>
                </div>
              )}

              {activeHelpTab === 'pages' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <h3 style={{ color: 'var(--text-primary)', fontSize: '15px', fontWeight: 700 }}>📂 筆記目錄、個人檔案與社群發布</h3>

                  <h4 style={{ color: 'var(--text-primary)', fontSize: '14px', fontWeight: 600, marginTop: '8px' }}>1. 樹狀階層管理</h4>
                  <p>側邊欄的「私人」分區列出了所有筆記與圖形。滑鼠移到頁面上時，點擊右側的 <code>+</code> 圖示可以無限層級地建立子頁面。拖曳頁面可以重新排列目錄樹。點選垃圾桶圖示則會將筆記移入垃圾桶。</p>

                  <h4 style={{ color: 'var(--text-primary)', fontSize: '14px', fontWeight: 600, marginTop: '8px' }}>2. 📈 寫作貢獻圖 (GitHub Commit 風格)</h4>
                  <p>點選進入「我的個人檔案」，您會看到精美的寫作貢獻日曆（熱力圖），記錄您每日的創作足跡：</p>
                  <ul style={{ paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <li>建立一個新頁面/心智圖：當日寫作貢獻 <b>+2</b> 分。</li>
                    <li>編輯/更新現有的筆記內容：當日寫作貢獻 <b>+1</b> 分。</li>
                    <li>貢獻越多，當天的方格顏色越深。快來畫滿您的專屬寫作牆吧！</li>
                  </ul>

                  <h4 style={{ color: 'var(--text-primary)', fontSize: '14px', fontWeight: 600, marginTop: '8px' }}>3. 分享與公開發布</h4>
                  <p>在筆記編輯器或心智圖的右上角點選「分享發布」並啟用，便能生成公開網址，同時該筆記會呈現在「探索廣場」中，允許其他創作者點讚或留言與您交流互動。</p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div style={{
              padding: '12px 20px',
              borderTop: '1px solid var(--border-color)',
              display: 'flex',
              justifyContent: 'flex-end',
              background: 'var(--bg-popover)'
            }}>
              <button
                onClick={() => setShowHelpModal(false)}
                style={{
                  padding: '6px 16px',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: 'var(--brand-primary)',
                  color: '#ffffff',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  border: 'none'
                }}
              >
                確認
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
