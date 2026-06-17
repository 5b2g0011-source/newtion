import React from 'react';
import { AlignLeft } from 'lucide-react';

interface TableOfContentsProps {
  content: string;
  previewElement: HTMLDivElement | null;
}

interface HeadingItem {
  text: string;
  level: number;
  index: number;
}

export const TableOfContents: React.FC<TableOfContentsProps> = ({ content, previewElement }) => {
  // Parse headers from markdown content
  const parseHeadings = (md: string): HeadingItem[] => {
    const headings: HeadingItem[] = [];
    const lines = md.split('\n');
    let inCodeBlock = false;

    lines.forEach((line) => {
      // Ignore headings inside code blocks
      if (line.trim().startsWith('```')) {
        inCodeBlock = !inCodeBlock;
        return;
      }

      if (inCodeBlock) return;

      const match = line.match(/^(#{1,4})\s+(.+)$/);
      if (match) {
        headings.push({
          level: match[1].length,
          text: match[2].replace(/[#*`~]/g, '').trim(),
          index: headings.length
        });
      }
    });

    return headings;
  };

  const headings = parseHeadings(content);

  const handleHeadingClick = (heading: HeadingItem) => {
    if (!previewElement) return;

    // Find all heading elements in the preview (h1, h2, h3, h4)
    const elements = Array.from(previewElement.querySelectorAll('h1, h2, h3, h4'));
    
    // Find the one that matches our heading index/text
    // We match by text content to be safe
    const targetElement = elements.find(el => {
      const elText = el.textContent || '';
      return elText.toLowerCase().includes(heading.text.toLowerCase()) || 
             heading.text.toLowerCase().includes(elText.toLowerCase());
    });

    if (targetElement) {
      targetElement.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      });
    }
  };

  if (headings.length === 0) {
    return (
      <div style={{
        padding: '16px',
        color: 'var(--text-muted)',
        fontSize: '13px',
        textAlign: 'center',
        fontStyle: 'italic'
      }}>
        編寫標題（如 # 標題一）即可自動產生大綱目錄。
      </div>
    );
  }

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '12px',
      padding: '16px'
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        fontSize: '12px',
        fontWeight: 600,
        color: 'var(--text-secondary)',
        textTransform: 'uppercase',
        letterSpacing: '0.5px'
      }}>
        <AlignLeft size={14} />
        <span>大綱目錄 (TOC)</span>
      </div>

      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        maxHeight: 'calc(100vh - 280px)',
        overflowY: 'auto',
        paddingRight: '4px'
      }}>
        {headings.map((heading) => (
          <button
            key={heading.index}
            onClick={() => handleHeadingClick(heading)}
            style={{
              paddingLeft: `${(heading.level - 1) * 12}px`,
              fontSize: heading.level === 1 ? '13px' : '12px',
              fontWeight: heading.level === 1 ? 600 : 400,
              color: heading.level === 1 ? 'var(--text-primary)' : 'var(--text-secondary)',
              textAlign: 'left',
              cursor: 'pointer',
              lineHeight: '1.4',
              transition: 'color var(--transition-fast), border-left-color var(--transition-fast)',
              borderLeft: heading.level === 1 ? '2px solid transparent' : 'none',
              paddingTop: '2px',
              paddingBottom: '2px',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = 'var(--brand-primary)';
              if (heading.level === 1) e.currentTarget.style.borderLeftColor = 'var(--brand-primary)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = heading.level === 1 ? 'var(--text-primary)' : 'var(--text-secondary)';
              if (heading.level === 1) e.currentTarget.style.borderLeftColor = 'transparent';
            }}
          >
            {heading.text}
          </button>
        ))}
      </div>
    </div>
  );
};
