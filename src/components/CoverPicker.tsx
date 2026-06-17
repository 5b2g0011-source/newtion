import React from 'react';
import { Palette } from 'lucide-react';

interface CoverPickerProps {
  currentCover: string | null;
  onSelectCover: (cover: string | null) => void;
}

const PRESET_COVERS = [
  'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  'linear-gradient(135deg, #130cb7 0%, #52e5e7 100%)',
  'linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)',
  'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
  'linear-gradient(135deg, #a1c4fd 0%, #c2e9fb 100%)',
  'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
  'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
  'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
  'linear-gradient(135deg, #ee9ca7 0%, #ffdde1 100%)',
  'linear-gradient(135deg, #30cfd0 0%, #330867 100%)',
  '#1e293b', // Slate solid
  '#0f172a', // Dark slate solid
  '#18181b', // Zinc solid
];

export const CoverPicker: React.FC<CoverPickerProps> = ({ currentCover, onSelectCover }) => {
  const [isOpen, setIsOpen] = React.useState(false);

  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          padding: '6px 12px',
          background: 'rgba(255, 255, 255, 0.08)',
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--radius-sm)',
          fontSize: '12px',
          fontWeight: 500,
          color: 'var(--text-secondary)',
          transition: 'all var(--transition-fast)'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'rgba(255, 255, 255, 0.12)';
          e.currentTarget.style.color = 'var(--text-primary)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
          e.currentTarget.style.color = 'var(--text-secondary)';
        }}
      >
        <Palette size={14} />
        變更封面
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
              right: 0,
              zIndex: 11,
              width: '240px',
              padding: '12px',
              borderRadius: 'var(--radius-md)',
              boxShadow: 'var(--shadow-lg)',
              animation: 'popIn 0.2s ease forwards'
            }}
          >
            <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>
              選擇封面樣式
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: '6px',
              marginBottom: '10px'
            }}>
              {PRESET_COVERS.map((cover, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    onSelectCover(cover);
                    setIsOpen(false);
                  }}
                  style={{
                    height: '36px',
                    borderRadius: 'var(--radius-sm)',
                    background: cover,
                    border: currentCover === cover ? '2px solid #ffffff' : '1px solid rgba(255,255,255,0.1)',
                    cursor: 'pointer',
                    boxShadow: currentCover === cover ? '0 0 4px rgba(255,255,255,0.5)' : 'none',
                    transition: 'transform var(--transition-fast)'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.08)'}
                  onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                />
              ))}
            </div>

            <button
              onClick={() => {
                onSelectCover(null);
                setIsOpen(false);
              }}
              style={{
                width: '100%',
                padding: '6px',
                textAlign: 'center',
                background: 'rgba(239, 68, 68, 0.1)',
                color: 'var(--accent-error)',
                borderRadius: 'var(--radius-sm)',
                fontSize: '12px',
                fontWeight: 500,
                cursor: 'pointer',
                transition: 'background var(--transition-fast)'
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.18)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'}
            >
              移除封面
            </button>
          </div>
        </>
      )}
    </div>
  );
};
