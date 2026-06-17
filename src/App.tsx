import React, { useState, useEffect } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Sidebar } from './components/Sidebar';
import { EditorWorkspace } from './views/EditorWorkspace';
import { ExploreHub } from './views/ExploreHub';
import { ReaderWorkspace } from './views/ReaderWorkspace';
import { ProfileWorkspace } from './views/ProfileWorkspace';
import { TrashWorkspace } from './views/TrashWorkspace';
import { MediaWorkspace } from './views/MediaWorkspace';
import { HomeWorkspace } from './views/HomeWorkspace';
import { InboxWorkspace } from './views/InboxWorkspace';
import { SearchModal } from './components/SearchModal';
import { AuthModal } from './components/AuthModal';
import { AiAssistant } from './components/AiAssistant';
import { Menu, ChevronLeft } from 'lucide-react';
import './App.css';

const AppShell: React.FC = () => {
  const { activeView, setSearchOpen, searchOpen } = useApp();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // 1. Listen for global hotkeys (Ctrl+P to search)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'p') {
        e.preventDefault();
        setSearchOpen(!searchOpen);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [searchOpen, setSearchOpen]);

  // Determine when to hide sidebar (e.g. reader mode defaults to clean centered reader)
  const showSidebar = activeView !== 'reader';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', width: '100vw', overflow: 'hidden' }}>
      
      <div className="app-container" style={{ flex: 1, height: '100%' }}>
        {/* Notion-style Left Sidebar (Collapsible) */}
        {showSidebar && (
          <div style={{
            display: 'flex',
            height: '100vh',
            zIndex: 90,
            transition: 'width var(--transition-normal)',
            width: sidebarCollapsed ? '0px' : 'var(--sidebar-width)',
            overflow: 'hidden',
            position: 'relative'
          }}>
            <Sidebar />
          </div>
        )}

        {/* Sidebar Collapse Toggle Overlay Button */}
        {showSidebar && (
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            title={sidebarCollapsed ? '展開側邊欄' : '收折側邊欄'}
            style={{
              position: 'absolute',
              top: '16px',
              left: sidebarCollapsed ? '16px' : 'calc(var(--sidebar-width) - 14px)',
              zIndex: 95,
              width: '28px',
              height: '28px',
              borderRadius: '50%',
              background: 'var(--bg-popover)',
              border: '1px solid var(--border-color)',
              color: 'var(--text-secondary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: 'var(--shadow-sm)',
              cursor: 'pointer',
              transition: 'left var(--transition-normal), transform var(--transition-fast)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = 'var(--text-primary)';
              e.currentTarget.style.transform = 'scale(1.1)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = 'var(--text-secondary)';
              e.currentTarget.style.transform = 'scale(1)';
            }}
          >
            {sidebarCollapsed ? <Menu size={14} /> : <ChevronLeft size={14} />}
          </button>
        )}

        {/* Main Content Pane Workspace */}
        <div 
          className="main-content"
          style={{
            paddingLeft: 0,
            transition: 'padding-left var(--transition-normal)'
          }}
        >
          {activeView === 'home' && <HomeWorkspace />}
          {activeView === 'inbox' && <InboxWorkspace />}
          {activeView === 'editor' && <EditorWorkspace />}
          {activeView === 'explore' && <ExploreHub />}
          {activeView === 'reader' && <ReaderWorkspace />}
          {activeView === 'profile' && <ProfileWorkspace />}
          {activeView === 'trash' && <TrashWorkspace />}
          {activeView === 'media' && <MediaWorkspace />}
        </div>

        {/* Modals & Dialogues Overlay */}
        <SearchModal />
        <AuthModal />
        <AiAssistant />
      </div>
    </div>
  );
};

function App() {
  return (
    <AppProvider>
      <AppShell />
    </AppProvider>
  );
}

export default App;
