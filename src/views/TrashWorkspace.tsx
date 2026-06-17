import React from 'react';
import { useApp } from '../context/AppContext';
import { Trash2, RotateCcw, Trash } from 'lucide-react';

export const TrashWorkspace: React.FC = () => {
  const { notes, restoreNote, deleteNotePermanently, currentUser } = useApp();

  // Find all notes in the trash that belong to the user (or all if guest)
  const trashNotes = notes.filter(n => n.isTrash && (!currentUser || n.userId === currentUser.id));

  return (
    <div style={{
      flex: 1,
      height: '100vh',
      overflowY: 'auto',
      background: 'var(--bg-editor)',
      padding: '2.5rem 2rem'
    }}>
      <div style={{ maxWidth: '800px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        
        {/* Header Title & Help Toggle Button */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <h1 style={{
            fontFamily: 'var(--font-display)',
            fontWeight: 800,
            fontSize: '2.25rem',
            color: 'var(--text-primary)',
            letterSpacing: '-0.5px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            margin: 0
          }}>
            <Trash2 size={32} style={{ color: 'var(--accent-error)' }} />
            垃圾桶
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', margin: 0 }}>
            在此處檢視已刪除的頁面。你可以還原它們，或將它們永久刪除。
          </p>
        </div>

        <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1.5rem' }}>
          {trashNotes.length === 0 ? (
            <div style={{
              padding: '64px 32px',
              textAlign: 'center',
              background: 'rgba(255,255,255,0.01)',
              border: '1px dashed var(--border-color)',
              borderRadius: 'var(--radius-lg)',
              color: 'var(--text-muted)'
            }}>
              垃圾桶是空的。
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {trashNotes.map(note => (
                <div
                  key={note.id}
                  className="glass-panel"
                  style={{
                    borderRadius: 'var(--radius-md)',
                    padding: '16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '16px',
                    boxShadow: 'var(--shadow-sm)'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0, flex: 1 }}>
                    <span style={{ fontSize: '20px' }}>{note.icon || '📄'}</span>
                    <div style={{ minWidth: 0, flex: 1 }}>
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
                        刪除於：{note.updatedAt ? new Date(note.updatedAt).toLocaleString('zh-TW') : '未知時間'}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={() => restoreNote(note.id)}
                      style={{
                        padding: '6px 12px',
                        borderRadius: 'var(--radius-sm)',
                        border: '1px solid var(--border-color)',
                        background: 'var(--bg-input)',
                        color: 'var(--text-primary)',
                        fontSize: '12px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        cursor: 'pointer'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.04)'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'var(--bg-input)'}
                    >
                      <RotateCcw size={13} />
                      還原
                    </button>
                    <button
                      onClick={() => {
                        if (confirm('確定要永久刪除此筆記嗎？此動作無法復原。')) {
                          deleteNotePermanently(note.id);
                        }
                      }}
                      style={{
                        padding: '6px 12px',
                        borderRadius: 'var(--radius-sm)',
                        background: 'var(--accent-error)',
                        color: '#ffffff',
                        fontSize: '12px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        cursor: 'pointer'
                      }}
                    >
                      <Trash size={13} />
                      永久刪除
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
