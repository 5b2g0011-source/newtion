import React from 'react';
import { useApp } from '../context/AppContext';
import { MarkdownEditor } from '../components/MarkdownEditor';
import { MindMap } from '../components/MindMap';
import { QuizView } from '../components/QuizView';
import { Plus, PenTool } from 'lucide-react';

export const EditorWorkspace: React.FC = () => {
  const { activeNoteId, createNote, notes } = useApp();
  const note = notes.find(n => n.id === activeNoteId);

  const handleCreateNewPage = () => {
    createNote(null, 'note');
  };

  return (
    <div style={{ flex: 1, height: '100vh', overflow: 'hidden' }}>
      {activeNoteId && note ? (
        note.type === 'mindmap' ? (
          <MindMap note={note} />
        ) : note.type === 'quiz' ? (
          <QuizView note={note} />
        ) : (
          <MarkdownEditor noteId={activeNoteId} />
        )
      ) : (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          padding: '2rem',
          textAlign: 'center',
          background: 'var(--bg-editor)'
        }}>
          <div style={{
            width: '64px',
            height: '64px',
            background: 'var(--brand-primary-glow)',
            color: 'var(--brand-primary)',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '1.5rem',
            boxShadow: 'var(--shadow-glow)'
          }}>
            <PenTool size={32} />
          </div>

          <h2 style={{
            fontFamily: 'var(--font-display)',
            fontWeight: 800,
            fontSize: '1.75rem',
            color: 'var(--text-primary)',
            marginBottom: '8px'
          }}>
            開始你的寫作旅程
          </h2>
          <p style={{
            color: 'var(--text-secondary)',
            fontSize: '14px',
            maxWidth: '380px',
            lineHeight: '1.5',
            marginBottom: '1.5rem'
          }}>
            在左側側邊欄選擇一個頁面，或是立即建立一個空白筆記、心智圖、測驗。使用 Markdown、設定封面，然後分享到 Explore 探索廣場！
          </p>

          <button
            onClick={handleCreateNewPage}
            className="hover-scale btn-glow"
            style={{
              padding: '10px 20px',
              borderRadius: 'var(--radius-md)',
              background: 'var(--brand-primary)',
              color: '#ffffff',
              fontSize: '14px',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: 'var(--shadow-glow)'
            }}
          >
            <Plus size={16} />
            建立第一篇筆記
          </button>
        </div>
      )}
    </div>
  );
};

