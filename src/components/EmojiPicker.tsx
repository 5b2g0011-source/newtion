import React, { useState } from 'react';
import { Smile } from 'lucide-react';

interface EmojiPickerProps {
  currentIcon: string | null;
  onSelectEmoji: (emoji: string | null) => void;
}

const POPULAR_EMOJIS = [
  '📝', '🚀', '📂', '💡', '💭', '🛠️', '🎨', '💼',
  '📚', '📅', '🧠', '⚙️', '🌟', '🔥', '💻', '🧪',
  '🥑', '🎯', '📢', '📌', '🔍', '🔒', '🔑', '🏠',
  '🍿', '✈️', '🏝️', '🧩', '📈', '💬', '❤️', '✅'
];

export const EmojiPicker: React.FC<EmojiPickerProps> = ({ currentIcon, onSelectEmoji }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          fontSize: '32px',
          background: 'rgba(255, 255, 255, 0.04)',
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--radius-md)',
          width: '56px',
          height: '56px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          transition: 'all var(--transition-fast)',
          outline: 'none'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
          e.currentTarget.style.borderColor = 'var(--text-muted)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)';
          e.currentTarget.style.borderColor = 'var(--border-color)';
        }}
      >
        {currentIcon || <Smile size={24} style={{ color: 'var(--text-secondary)' }} />}
      </button>

      {isOpen && (
        <>
          <div
            onClick={() => setIsOpen(false)}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 10
            }}
          />
          <div
            className="glass-panel"
            style={{
              position: 'absolute',
              top: 'calc(100% + 8px)',
              left: 0,
              zIndex: 11,
              width: '210px',
              padding: '12px',
              borderRadius: 'var(--radius-md)',
              boxShadow: 'var(--shadow-lg)',
              animation: 'popIn 0.2s ease forwards'
            }}
          >
            <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>
              選擇頁面圖示
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(6, 1fr)',
              gap: '6px',
              marginBottom: '10px'
            }}>
              {POPULAR_EMOJIS.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => {
                    onSelectEmoji(emoji);
                    setIsOpen(false);
                  }}
                  style={{
                    fontSize: '20px',
                    height: '28px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: 'var(--radius-sm)',
                    cursor: 'pointer',
                    transition: 'background var(--transition-fast), transform var(--transition-fast)'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(255,255,255,0.06)';
                    e.currentTarget.style.transform = 'scale(1.15)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent';
                    e.currentTarget.style.transform = 'scale(1)';
                  }}
                >
                  {emoji}
                </button>
              ))}
            </div>

            <button
              onClick={() => {
                onSelectEmoji(null);
                setIsOpen(false);
              }}
              style={{
                width: '100%',
                padding: '6px',
                textAlign: 'center',
                background: 'rgba(255, 255, 255, 0.05)',
                borderRadius: 'var(--radius-sm)',
                fontSize: '11px',
                fontWeight: 500,
                cursor: 'pointer',
                transition: 'background var(--transition-fast)'
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'}
            >
              無圖示
            </button>
          </div>
        </>
      )}
    </div>
  );
};
