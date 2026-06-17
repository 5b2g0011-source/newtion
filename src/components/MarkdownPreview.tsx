import React, { useMemo } from 'react';
import { marked } from 'marked';
import katex from 'katex';
import 'katex/dist/katex.min.css';

interface MarkdownPreviewProps {
  content: string;
  previewRef?: React.RefObject<HTMLDivElement | null>;
  style?: React.CSSProperties;
}

// Map alert types to display titles and icons
const ALERT_MAP: Record<string, { title: string; icon: string }> = {
  NOTE: { title: '提醒', icon: '💡' },
  TIP: { title: '提示', icon: '⚡' },
  IMPORTANT: { title: '重要', icon: '🔔' },
  WARNING: { title: '警告', icon: '⚠️' }
};

// Math parsing pre-processor
const renderMath = (text: string): string => {
  const codeBlocks: string[] = [];
  
  // 1. Shield code blocks (```...```)
  let processed = text.replace(/```[\s\S]*?```/g, (match) => {
    codeBlocks.push(match);
    return `__CODE_BLOCK_PLACEHOLDER_${codeBlocks.length - 1}__`;
  });

  // 2. Shield inline code (`...`)
  processed = processed.replace(/`[^`\n]+?`/g, (match) => {
    codeBlocks.push(match);
    return `__CODE_BLOCK_PLACEHOLDER_${codeBlocks.length - 1}__`;
  });

  // 3. Render block math ($$ ... $$)
  processed = processed.replace(/\$\$([\s\S]+?)\$\$/g, (_, math) => {
    try {
      return `<div style="overflow-x: auto; padding: 8px 0; margin: 12px 0;">${katex.renderToString(math.trim(), { displayMode: true, throwOnError: false })}</div>`;
    } catch (err) {
      console.error('KaTeX block rendering error:', err);
      return `<span class="katex-error">${math}</span>`;
    }
  });

  // 4. Render inline math ($ ... $)
  processed = processed.replace(/\$([^$\n]+?)\$/g, (_, math) => {
    try {
      return katex.renderToString(math.trim(), { displayMode: false, throwOnError: false });
    } catch (err) {
      console.error('KaTeX inline rendering error:', err);
      return `<span class="katex-error">${math}</span>`;
    }
  });

  // 5. Restore code blocks
  processed = processed.replace(/__CODE_BLOCK_PLACEHOLDER_(\d+)__/g, (_, idx) => {
    return codeBlocks[parseInt(idx, 10)];
  });

  return processed;
};

export const MarkdownPreview: React.FC<MarkdownPreviewProps> = ({ content, previewRef, style }) => {
  // Configure marked options
  useMemo(() => {
    marked.setOptions({
      gfm: true,
      breaks: true,
    });
  }, []);

  const htmlContent = useMemo(() => {
    try {
      // 1. Process LaTeX Math first
      const mathRenderedContent = renderMath(content);

      // 2. Render markdown to standard HTML
      let html = marked.parse(mathRenderedContent) as string;

      // 3. Post-process to support GitHub-style Alert Callouts
      const alertRegex = /<blockquote>\s*<p>\s*\[!(NOTE|TIP|IMPORTANT|WARNING)\]\s*(?:<br\s*\/?>)?([\s\S]*?)<\/p>\s*<\/blockquote>/gi;

      html = html.replace(alertRegex, (_, type, innerText) => {
        const uType = type.toUpperCase();
        const alertConfig = ALERT_MAP[uType] || { title: uType, icon: '💡' };
        
        return `
          <div class="markdown-alert markdown-alert-${uType.toLowerCase()}">
            <div class="alert-title">
              <span>${alertConfig.icon}</span>
              <span>${alertConfig.title}</span>
            </div>
            <p>${innerText.trim()}</p>
          </div>
        `;
      });

      return html;
    } catch (err) {
      console.error('Markdown parsing error:', err);
      return `<p style="color: var(--accent-error)">無法解析 Markdown 內容。</p>`;
    }
  }, [content]);

  return (
    <div
      ref={previewRef}
      className="markdown-body"
      style={{
        padding: '2rem',
        overflowY: 'auto',
        height: '100%',
        ...style
      }}
      dangerouslySetInnerHTML={{ __html: htmlContent }}
    />
  );
};
