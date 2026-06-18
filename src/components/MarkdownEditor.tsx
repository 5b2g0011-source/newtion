import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { CoverPicker } from './CoverPicker';
import { EmojiPicker } from './EmojiPicker';
import { MarkdownPreview } from './MarkdownPreview';
import { TableOfContents } from './TableOfContents';
import { 
  Bold, Italic, Code, Quote, Link as LinkIcon, List, Table,
  Eye, Columns, Edit3, Globe, Lock, Share2, Tag, Check, Download,
  Image as ImageIcon, Sparkles
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { uploadImage } from '../utils/upload';

interface NoteTemplate {
  name: string;
  description: string;
  icon: string;
  content: string;
}

const NOTE_TEMPLATES: NoteTemplate[] = [
  {
    name: '會議記錄',
    description: '記錄會議日期、出席者、議程、討論重點及後續待辦事項',
    icon: '📝',
    content: `# 📝 會議記錄：[會議主題]\n\n- **日期時間**：\${new Date().toLocaleDateString('zh-TW')} \n- **與會人員**：\n- **會議主席**：\n\n---\n\n## 🎯 會議議程\n1. \n2. \n\n## 💬 討論重點\n- **議題一：**\n  - 重點內容或決議\n- **議題二：**\n  - 重點內容或決議\n\n## 📅 後續待辦事項 (Action Items)\n- [ ] @負責人 工作項目一 (預計完成日: )\n- [ ] @負責人 工作項目二 (預計完成日: )\n\n> [!NOTE]\n> 下次會議預定於： 進行。\n`
  },
  {
    name: '週計畫',
    description: '安排本週核心目標，列出週一到週五的每日任務清單與反思',
    icon: '📅',
    content: `# 📅 週工作與學習計畫\n\n- **本週目標 (Weekly Goals)**：\n  1. \n  2. \n\n---\n\n## 🏃‍♂️ 每日任務清單\n\n### 星期一 (Monday)\n- [ ] \n- [ ] \n\n### 星期二 (Tuesday)\n- [ ] \n\n### 星期三 (Wednesday)\n- [ ] \n\n### 星期四 (Thursday)\n- [ ] \n\n### 星期五 (Friday)\n- [ ] \n\n---\n\n## 💡 心得與反思 (Reflections)\n- 本週收穫：\n- 待改善點：\n`
  },
  {
    name: '專案規劃書',
    description: '撰寫專案大綱、關鍵目標、開發時程里程碑與技術選型',
    icon: '🚀',
    content: `# 🚀 專案規劃書：[專案名稱]\n\n- **建立時間**：\n- **專案負責人**：\n- **目標受眾**：\n\n---\n\n## 📋 專案概述 (Overview)\n簡短描述這個專案要解決什麼問題，以及預期的商業或個人價值。\n\n## 🎯 關鍵目標 (Objectives)\n- [ ] 目標一：\n- [ ] 目標二：\n\n## 🗺️ 開發里程碑 (Milestones)\n- **第一階段：** 準備與設計 (預計完成: )\n- **第二階段：** 核心開發 (預計完成: )\n- **第三階段：** 測試與發布 (預計完成: )\n\n## 🛠️ 技術選型與資源\n- **前端：**\n- **後端：**\n- **資料庫：**\n\n> [!TIP]\n> 專案開始前，先透過心智圖梳理架構，能事半功倍！\n`
  },
  {
    name: '讀書筆記',
    description: '書籍名稱與評分，核心要點摘要、經典句子摘錄與讀後行動指南',
    icon: '📚',
    content: `# 📚 讀書筆記：[書名]\n\n- **作者**：\n- **閱讀日期**：\n- **個人評分**：⭐⭐⭐⭐⭐\n\n---\n\n## 📝 一句話總結\n這本書主要在講什麼？對你最大的啟發是什麼？\n\n## 💡 核心重點整理 (Key Takeaways)\n\n### 📌 重點一：\n詳細論述或書中論據。\n\n### 📌 重點二：\n詳細論述或書中論據。\n\n## 💬 佳句摘錄\n- *「在此處輸入書中感動你的佳句」* — 第 頁\n- *「在此處輸入書中感動你的佳句」* — 第 頁\n\n## 🏃‍♂️ 行動方針 (Action Plan)\n看完這本書後，我打算在日常生活中實踐的 3 件事：\n1. \n2. \n`
  },
  {
    name: '個人日記',
    description: '記錄今天的天氣、心情、亮點事件、感恩事物以及個人心得',
    icon: '✍️',
    content: `# ✍️ 個人日記：\n\n- **天氣**：☀️ / ☁️ / 🌧️\n- **心情**：😊 / 😐 / 😢\n- **關鍵字**：今天最特別的一件事\n\n---\n\n## 🌟 今日亮點 (Highlights)\n1. \n2. \n\n## 🙏 感恩日記 (Three Gratitudes)\n1. \n2. \n3. \n\n## 💭 今日省思與隨筆\n在此處自由書寫今天的想法、遭遇或心情...\n`
  },
  {
    name: '程式開發筆記',
    description: '撰寫演算法解題思路、代碼實作、時空複雜度分析與邊界條件測試',
    icon: '💻',
    content: `# 💻 程式開發與演算法筆記：[題目/功能名稱]\n\n- **語言 (Language)**：TypeScript / Python / C++\n- **難易度 (Difficulty)**：Easy / Medium / Hard\n- **日期 (Date)**：\n\n---\n\n## 🎯 題目 / 需求描述\n在此處簡短描述題目要求或開發需求...\n\n- **連結 (Link)**：[LeetCode # / GitHub Repo](url)\n\n## 💡 解題思路 / 設計架構\n詳細寫下解決方案、演算法選擇（例如：Dynamic Programming、Divide and Conquer）或是系統架構：\n\n1. **核心概念：** \n2. **步驟拆解：** \n\n## 🛠️ 程式碼實作 (Implementation)\n\n\`\`\`typescript\n// 在此處撰寫程式碼\nfunction solve() {\n  // TODO: Implement solution\n}\n\`\`\`\n\n## 📊 複雜度分析 (Complexity Analysis)\n- **時間複雜度 (Time Complexity)**：\\(O(N)\\) - 說明原因。\n- **空間複雜度 (Space Complexity)**：\\(O(1)\\) - 說明原因。\n\n## ⚠️ 邊界條件與測試 (Edge Cases & Verification)\n- **空輸入處理：**\n- **最大值/極端值：**\n- **測試結果：** Pass / Fail\n`
  }
];

interface MarkdownEditorProps {
  noteId: string;
}

export const MarkdownEditor: React.FC<MarkdownEditorProps> = ({ noteId }) => {
  const { notes, updateNote, users, currentUser, sendMessage } = useApp();
  const note = notes.find(n => n.id === noteId);

  const [viewMode, setViewMode] = useState<'edit' | 'split' | 'view'>('split');
  const [tagInput, setTagInput] = useState('');
  const [showShareDropdown, setShowShareDropdown] = useState(false);
  const [selectedUserForShare, setSelectedUserForShare] = useState('');
  const [isSendingNote, setIsSendingNote] = useState(false);
  const [showDownloadDropdown, setShowDownloadDropdown] = useState(false);
  const [isSaved, setIsSaved] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [bypassTemplates, setBypassTemplates] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [editorWidth, setEditorWidth] = useState(50); // percentage (20-80)
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Local state for editor content to prevent IME composition break
  const [localContent, setLocalContent] = useState(note ? note.content : '');
  const lastSavedContentRef = useRef(note ? note.content : '');
  const debounceTimerRef = useRef<any>(null);
  const localContentRef = useRef(localContent);

  // Keep localContentRef in sync with state
  useEffect(() => {
    localContentRef.current = localContent;
  }, [localContent]);

  const isNewNote = !bypassTemplates && (
                    !note || !localContent || 
                    localContent.trim() === '' || 
                    localContent === `# ${note.title}\n\n從這裡開始編寫你的 Markdown 內容...` ||
                    localContent.trim() === `# ${note.title}`);

  const handleApplyTemplate = (tmpl: NoteTemplate) => {
    if (window.confirm(`確定要套用「${tmpl.name}」範本嗎？這將會完全覆蓋目前的筆記內容！`)) {
      setLocalContent(tmpl.content);
      lastSavedContentRef.current = tmpl.content;
      updateNote(noteId, { content: tmpl.content });
      setIsSaved(true);
    }
  };

  // Sync localContent when active noteId changes
  useEffect(() => {
    if (note) {
      setLocalContent(note.content);
      lastSavedContentRef.current = note.content;
      setBypassTemplates(false);
    }
  }, [noteId]);

  // Sync localContent when note.content changes externally (e.g., via AI)
  useEffect(() => {
    if (note && note.content !== lastSavedContentRef.current) {
      setLocalContent(note.content);
      lastSavedContentRef.current = note.content;
    }
  }, [note?.content]);

  // Flush any pending save on noteId changes or component unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
        updateNote(noteId, { content: localContentRef.current });
      }
    };
  }, [noteId]);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const container = containerRef.current;
      if (!container) return;

      const containerRect = container.getBoundingClientRect();
      const newWidthPx = e.clientX - containerRect.left;
      let newWidthPercent = (newWidthPx / containerRect.width) * 100;

      // Limit editor width between 20% and 80% to keep both panels readable
      if (newWidthPercent < 20) newWidthPercent = 20;
      if (newWidthPercent > 80) newWidthPercent = 80;

      setEditorWidth(newWidthPercent);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  // Sync scroll refs
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const activeScrollRef = useRef<'editor' | 'preview' | null>(null);

  // Auto-save feedback
  useEffect(() => {
    setIsSaved(true);
  }, [noteId]);

  if (!note) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        color: 'var(--text-muted)'
      }}>
        請選擇或新增筆記開始編輯。
      </div>
    );
  }

  const handleChangeTitle = (e: React.ChangeEvent<HTMLInputElement>) => {
    setIsSaved(false);
    updateNote(noteId, { title: e.target.value });
    setTimeout(() => setIsSaved(true), 600);
  };

  const handleChangeContent = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setLocalContent(value);
    setIsSaved(false);

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      lastSavedContentRef.current = value;
      updateNote(noteId, { content: value });
      setIsSaved(true);
    }, 500);
  };

  // --- Scroll Sync Handlers ---
  const handleEditorScroll = (e: React.UIEvent<HTMLTextAreaElement>) => {
    if (activeScrollRef.current !== 'editor' || viewMode !== 'split') return;
    const editor = e.currentTarget;
    const preview = previewRef.current;
    if (!preview) return;

    const maxEditorScroll = editor.scrollHeight - editor.clientHeight;
    const maxPreviewScroll = preview.scrollHeight - preview.clientHeight;
    
    if (maxEditorScroll <= 0 || maxPreviewScroll <= 0) return;
    
    const ratio = editor.scrollTop / maxEditorScroll;
    preview.scrollTop = ratio * maxPreviewScroll;
  };

  const handlePreviewScroll = (e: React.UIEvent<HTMLDivElement>) => {
    if (activeScrollRef.current !== 'preview' || viewMode !== 'split') return;
    const preview = e.currentTarget;
    const editor = textareaRef.current;
    if (!editor) return;

    const maxEditorScroll = editor.scrollHeight - editor.clientHeight;
    const maxPreviewScroll = preview.scrollHeight - preview.clientHeight;

    if (maxEditorScroll <= 0 || maxPreviewScroll <= 0) return;

    const ratio = preview.scrollTop / maxPreviewScroll;
    editor.scrollTop = ratio * maxEditorScroll;
  };

  // --- Formatting Helpers ---
  const insertFormat = (formatType: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    const selectedText = text.substring(start, end);
    
    let replacement = '';
    let cursorOffset = 0;

    switch (formatType) {
      case 'bold':
        replacement = `**${selectedText || '粗體文字'}**`;
        cursorOffset = selectedText ? replacement.length : 2;
        break;
      case 'italic':
        replacement = `*${selectedText || '斜體文字'}*`;
        cursorOffset = selectedText ? replacement.length : 1;
        break;
      case 'code':
        replacement = `\n\`\`\`javascript\n${selectedText || '// 在此輸入代碼'}\n\`\`\`\n`;
        cursorOffset = selectedText ? replacement.length : 15;
        break;
      case 'quote':
        replacement = `\n> ${selectedText || '引用文字'}\n`;
        cursorOffset = selectedText ? replacement.length : 3;
        break;
      case 'link':
        replacement = `[${selectedText || '連結描述'}](https://)`;
        cursorOffset = selectedText ? replacement.length : 1;
        break;
      case 'list':
        replacement = `\n- ${selectedText || '項目一'}\n`;
        cursorOffset = selectedText ? replacement.length : 4;
        break;
      case 'table':
        replacement = `\n| 欄位一 | 欄位二 |\n| :--- | :--- |\n| ${selectedText || '內容一'} | 內容二 |\n`;
        cursorOffset = selectedText ? replacement.length : 25;
        break;
      default:
        return;
    }

    const newValue = text.substring(0, start) + replacement + text.substring(end);
    setLocalContent(newValue);
    lastSavedContentRef.current = newValue;
    setIsSaved(false);
    updateNote(noteId, { content: newValue });
    
    // Reset focus and selection
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + cursorOffset, start + cursorOffset + (selectedText ? 0 : 4));
      setIsSaved(true);
    }, 50);
  };

  // --- Tags Management ---
  const handleAddTag = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tagInput.trim()) return;
    const cleanTag = tagInput.trim().replace('#', '');
    if (!note.tags.includes(cleanTag)) {
      updateNote(noteId, { tags: [...note.tags, cleanTag] });
    }
    setTagInput('');
  };

  const handleRemoveTag = (tagToRemove: string) => {
    updateNote(noteId, { tags: note.tags.filter(t => t !== tagToRemove) });
  };

  // --- Publish Actions ---
  const handleTogglePublish = () => {
    const nextState = !note.isPublished;
    updateNote(noteId, { 
      isPublished: nextState,
      isPublic: note.isPublic !== false
    });
    
    if (nextState) {
      // Fire confetti animation when publishing!
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#6366f1', '#ec4899', '#3b82f6', '#10b981']
      });
    }
  };

  const handleDownload = (format: 'md' | 'txt') => {
    const filename = `${note.title || 'untitled'}.${format}`;
    const blob = new Blob([note.content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setShowDownloadDropdown(false);
  };

  const handleImageUpload = async (file: File) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;

    const placeholder = `![上傳圖片中...](${file.name})`;
    const newValue = text.substring(0, start) + placeholder + text.substring(end);
    
    setLocalContent(newValue);
    lastSavedContentRef.current = newValue;
    setIsSaved(false);
    updateNote(noteId, { content: newValue });
    setIsUploading(true);

    // Focus textarea after inserting placeholder
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + placeholder.length, start + placeholder.length);
    }, 50);

    try {
      const url = await uploadImage(file);
      const replacement = `![${file.name.split('.')[0]}](${url})`;
      
      const currentText = textareaRef.current ? textareaRef.current.value : newValue;
      const finalValue = currentText.replace(placeholder, replacement);
      
      setLocalContent(finalValue);
      lastSavedContentRef.current = finalValue;
      updateNote(noteId, { content: finalValue });
    } catch (err: any) {
      alert(err.message || '圖片上傳失敗');
      const currentText = textareaRef.current ? textareaRef.current.value : newValue;
      const finalValue = currentText.replace(placeholder, '');
      setLocalContent(finalValue);
      lastSavedContentRef.current = finalValue;
      updateNote(noteId, { content: finalValue });
    } finally {
      setIsUploading(false);
      setIsSaved(true);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleImageUpload(files[0]);
    }
  };

  const handlePaste = async (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = e.clipboardData.items;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const file = items[i].getAsFile();
        if (file) {
          e.preventDefault();
          await handleImageUpload(file);
        }
      }
    }
  };

  const handleDrop = async (e: React.DragEvent<HTMLTextAreaElement>) => {
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (file.type.indexOf('image') !== -1) {
        e.preventDefault();
        await handleImageUpload(file);
      }
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      
      {/* 1. Header Banner & Cover Selector */}
      <div style={{
        height: note.coverImage ? '180px' : '48px',
        background: note.coverImage || 'transparent',
        position: 'relative',
        transition: 'height var(--transition-normal)',
        flexShrink: 0
      }}>
        {/* Cover picker trigger overlays inside cover if active */}
        <div style={{
          position: 'absolute',
          bottom: '12px',
          right: '24px',
          zIndex: 5,
          display: 'flex',
          gap: '8px'
        }}>
          <CoverPicker 
            currentCover={note.coverImage} 
            onSelectCover={(cover) => updateNote(noteId, { coverImage: cover })} 
          />
        </div>
      </div>

      {/* 2. Page Title & Meta Controls Workspace */}
      <div style={{
        padding: '20px 24px 12px 24px',
        borderBottom: '1px solid var(--border-color)',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        flexShrink: 0
      }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px' }}>
          
          {/* Icon & Title */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flex: 1 }}>
            <EmojiPicker 
              currentIcon={note.icon}
              onSelectEmoji={(emoji) => updateNote(noteId, { icon: emoji })}
            />
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
              <input
                type="text"
                placeholder="未命名頁面"
                value={note.title}
                onChange={handleChangeTitle}
                style={{
                  fontSize: '24px',
                  fontWeight: 800,
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  color: 'var(--text-primary)',
                  width: '100%',
                  fontFamily: 'var(--font-display)',
                  letterSpacing: '-0.5px'
                }}
              />
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                {isSaved ? (
                  <>
                    <Check size={12} style={{ color: 'var(--accent-success)' }} />
                    已儲存至本機
                  </>
                ) : '儲存中...'}
              </span>
            </div>
          </div>

          {/* Social Share & Publication controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', position: 'relative' }}>
            <button
              onClick={() => setShowShareDropdown(!showShareDropdown)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 14px',
                background: note.isPublished ? 'rgba(16, 185, 129, 0.12)' : 'rgba(255, 255, 255, 0.05)',
                border: '1px solid ' + (note.isPublished ? 'var(--accent-success)' : 'var(--border-color)'),
                borderRadius: 'var(--radius-md)',
                color: note.isPublished ? 'var(--accent-success)' : 'var(--text-primary)',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all var(--transition-fast)'
              }}
              onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-1px)'}
              onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
            >
              <Share2 size={14} />
              <span>{note.isPublished ? '已發布分享' : '分享與發布'}</span>
            </button>

            {showShareDropdown && (
              <>
                <div 
                  onClick={() => setShowShareDropdown(false)} 
                  style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 100 }}
                />
                <div 
                  className="glass-panel"
                  style={{
                    position: 'absolute',
                    top: 'calc(100% + 8px)',
                    right: 0,
                    width: '280px',
                    zIndex: 101,
                    padding: '16px',
                    borderRadius: 'var(--radius-lg)',
                    boxShadow: 'var(--shadow-lg)',
                    animation: 'popIn 0.2s ease forwards',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px'
                  }}
                >
                  <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>
                    分享設定
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--text-secondary)' }}>發布至廣場</span>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>發布後其他人即可閱讀及留言</span>
                    </div>
                    <button
                      onClick={handleTogglePublish}
                      style={{
                        width: '40px',
                        height: '22px',
                        borderRadius: '11px',
                        background: note.isPublished ? 'var(--accent-success)' : 'var(--text-muted)',
                        position: 'relative',
                        cursor: 'pointer',
                        transition: 'background var(--transition-fast)',
                        border: 'none',
                        padding: 0
                      }}
                    >
                      <div style={{
                        width: '16px',
                        height: '16px',
                        borderRadius: '50%',
                        background: '#ffffff',
                        position: 'absolute',
                        top: '3px',
                        left: note.isPublished ? '21px' : '3px',
                        transition: 'left var(--transition-fast)'
                      }} />
                    </button>
                  </div>

                  {note.isPublished && (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid var(--border-color)', paddingTop: '10px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--text-secondary)' }}>隱私權限</span>
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{note.isPublic ? '公開（所有人可見）' : '連結限定（不列於廣場）'}</span>
                      </div>
                      <button
                        onClick={() => updateNote(noteId, { isPublic: !note.isPublic })}
                        style={{
                          padding: '4px 8px',
                          borderRadius: 'var(--radius-sm)',
                          border: '1px solid var(--border-color)',
                          fontSize: '11px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          color: 'var(--text-secondary)'
                        }}
                      >
                        {note.isPublic ? <Globe size={11} /> : <Lock size={11} />}
                        <span>{note.isPublic ? '公開' : '限定'}</span>
                      </button>
                    </div>
                  )}

                  {note.isPublished && (
                    <button
                      onClick={() => {
                        // In mock environments, we can simulate copying url
                        const dummyUrl = window.location.origin + `/reader/${note.id}`;
                        navigator.clipboard.writeText(dummyUrl);
                        alert('已複製文章連結至剪貼簿！');
                        setShowShareDropdown(false);
                      }}
                      style={{
                        width: '100%',
                        padding: '8px',
                        textAlign: 'center',
                        background: 'var(--brand-primary)',
                        color: '#ffffff',
                        borderRadius: 'var(--radius-md)',
                        fontSize: '12px',
                        fontWeight: 600,
                        cursor: 'pointer'
                      }}
                    >
                      複製分享連結
                    </button>
                  )}

                  {/* Share with users */}
                  <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                      傳送給站內用戶
                    </div>
                    {(() => {
                      const shareRecipients = users.filter(u => u.id !== (currentUser?.id || 'guest'));
                      return shareRecipients.length > 0 ? (
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <select
                            value={selectedUserForShare || shareRecipients[0]?.id}
                            onChange={(e) => setSelectedUserForShare(e.target.value)}
                            style={{
                              flex: 1,
                              padding: '4px 6px',
                              borderRadius: 'var(--radius-sm)',
                              border: '1px solid var(--border-color)',
                              background: 'var(--bg-input)',
                              color: 'var(--text-primary)',
                              fontSize: '11.5px',
                              outline: 'none'
                            }}
                          >
                            {shareRecipients.map(u => (
                              <option key={u.id} value={u.id}>
                                {u.displayName}
                              </option>
                            ))}
                          </select>
                          <button
                            disabled={isSendingNote}
                            onClick={async () => {
                              if (!note) return;
                              const targetId = selectedUserForShare || shareRecipients[0]?.id;
                              if (!targetId) {
                                alert('請選擇收件人');
                                return;
                              }
                              setIsSendingNote(true);
                              try {
                                await sendMessage(
                                  targetId,
                                  `分享了筆記：《${note.title}》`,
                                  `我與你分享了一篇筆記，請點擊下方匯入！`,
                                  note.id,
                                  {
                                    title: note.title,
                                    type: note.type || 'note',
                                    content: note.content,
                                    icon: note.icon,
                                    coverImage: note.coverImage
                                  }
                                );
                                alert('已成功傳送筆記附件信件！');
                                setShowShareDropdown(false);
                              } catch (err: any) {
                                console.error('Send note failed:', err);
                                alert('傳送失敗: ' + (err?.message || err));
                              } finally {
                                setIsSendingNote(false);
                              }
                            }}
                            style={{
                              padding: '4px 10px',
                              borderRadius: 'var(--radius-sm)',
                              background: 'var(--brand-primary)',
                              color: '#ffffff',
                              border: 'none',
                              fontSize: '11.5px',
                              fontWeight: 600,
                              cursor: 'pointer',
                              opacity: isSendingNote ? 0.7 : 1
                            }}
                          >
                            {isSendingNote ? '傳送中' : '傳送'}
                          </button>
                        </div>
                      ) : (
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>尚無其他註冊用戶</span>
                      );
                    })()}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Tags Row */}
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '8px' }}>
          <Tag size={13} style={{ color: 'var(--text-muted)' }} />
          {note.tags.map(tag => (
            <span
              key={tag}
              style={{
                fontSize: '11.5px',
                background: 'rgba(255, 255, 255, 0.05)',
                color: 'var(--text-secondary)',
                border: '1px solid var(--border-color)',
                padding: '2px 8px',
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              #{tag}
              <button 
                onClick={() => handleRemoveTag(tag)}
                style={{
                  fontSize: '9px',
                  fontWeight: 800,
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center'
                }}
                onMouseEnter={(e) => e.currentTarget.style.color = 'var(--accent-error)'}
                onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-muted)'}
              >
                ✕
              </button>
            </span>
          ))}

          <form onSubmit={handleAddTag} style={{ display: 'inline-flex' }}>
            <input
              type="text"
              placeholder="+ 新增標籤"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              style={{
                fontSize: '11.5px',
                background: 'transparent',
                border: 'none',
                outline: 'none',
                color: 'var(--text-muted)',
                padding: '2px 4px',
                width: '70px',
                transition: 'width var(--transition-fast)'
              }}
              onFocus={(e) => {
                e.target.placeholder = '按 Enter 送出';
                e.target.style.width = '100px';
              }}
              onBlur={(e) => {
                e.target.placeholder = '+ 新增標籤';
                e.target.style.width = '70px';
              }}
            />
          </form>
        </div>
      </div>

      {/* 3. Helper toolbar (Format buttons & View mode toggles) */}
      <div style={{
        padding: '6px 16px',
        borderBottom: '1px solid var(--border-color)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: 'rgba(255, 255, 255, 0.01)',
        flexShrink: 0
      }}>
        {/* Markdown Shortcuts */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <button onClick={() => insertFormat('bold')} title="粗體 (**)" style={{ padding: '6px', borderRadius: '4px', color: 'var(--text-secondary)', display: 'flex' }} onMouseEnter={(e)=>e.currentTarget.style.background='rgba(255,255,255,0.05)'} onMouseLeave={(e)=>e.currentTarget.style.background='transparent'}><Bold size={15} /></button>
          <button onClick={() => insertFormat('italic')} title="斜體 (*)" style={{ padding: '6px', borderRadius: '4px', color: 'var(--text-secondary)', display: 'flex' }} onMouseEnter={(e)=>e.currentTarget.style.background='rgba(255,255,255,0.05)'} onMouseLeave={(e)=>e.currentTarget.style.background='transparent'}><Italic size={15} /></button>
          <button onClick={() => insertFormat('code')} title="程式碼區塊 (```)" style={{ padding: '6px', borderRadius: '4px', color: 'var(--text-secondary)', display: 'flex' }} onMouseEnter={(e)=>e.currentTarget.style.background='rgba(255,255,255,0.05)'} onMouseLeave={(e)=>e.currentTarget.style.background='transparent'}><Code size={15} /></button>
          <div style={{ width: '1px', height: '14px', background: 'var(--border-color)', margin: '0 4px' }} />
          <button onClick={() => insertFormat('quote')} title="引用區塊 (>)" style={{ padding: '6px', borderRadius: '4px', color: 'var(--text-secondary)', display: 'flex' }} onMouseEnter={(e)=>e.currentTarget.style.background='rgba(255,255,255,0.05)'} onMouseLeave={(e)=>e.currentTarget.style.background='transparent'}><Quote size={15} /></button>
          <button onClick={() => insertFormat('link')} title="插入連結 ([])" style={{ padding: '6px', borderRadius: '4px', color: 'var(--text-secondary)', display: 'flex' }} onMouseEnter={(e)=>e.currentTarget.style.background='rgba(255,255,255,0.05)'} onMouseLeave={(e)=>e.currentTarget.style.background='transparent'}><LinkIcon size={15} /></button>
          <button onClick={() => insertFormat('list')} title="無序列表 (-)" style={{ padding: '6px', borderRadius: '4px', color: 'var(--text-secondary)', display: 'flex' }} onMouseEnter={(e)=>e.currentTarget.style.background='rgba(255,255,255,0.05)'} onMouseLeave={(e)=>e.currentTarget.style.background='transparent'}><List size={15} /></button>
          <button onClick={() => insertFormat('table')} title="表格" style={{ padding: '6px', borderRadius: '4px', color: 'var(--text-secondary)', display: 'flex' }} onMouseEnter={(e)=>e.currentTarget.style.background='rgba(255,255,255,0.05)'} onMouseLeave={(e)=>e.currentTarget.style.background='transparent'}><Table size={15} /></button>
          <button onClick={() => fileInputRef.current?.click()} title="上傳並插入圖片" disabled={isUploading} style={{ padding: '6px', borderRadius: '4px', color: isUploading ? 'var(--text-muted)' : 'var(--text-secondary)', display: 'flex' }} onMouseEnter={(e)=>!isUploading && (e.currentTarget.style.background='rgba(255,255,255,0.05)')} onMouseLeave={(e)=>e.currentTarget.style.background='transparent'}><ImageIcon size={15} /></button>
          <div style={{ width: '1px', height: '14px', background: 'var(--border-color)', margin: '0 4px' }} />
          <button 
            onClick={() => {
              const textarea = textareaRef.current;
              const selectedText = textarea ? textarea.value.substring(textarea.selectionStart, textarea.selectionEnd) : '';
              window.dispatchEvent(new CustomEvent('open-ai-assistant', { 
                detail: { 
                  prompt: selectedText 
                    ? `請幫我修改與潤飾這段選取的文字：\n\n"${selectedText}"\n\n修改建議：`
                    : `請幫我編輯目前的筆記《${note.title}》。我的要求是：`
                } 
              }));
            }} 
            title="使用 AI 編輯/潤飾筆記" 
            style={{ padding: '6px', borderRadius: '4px', color: 'var(--brand-primary)', display: 'flex' }} 
            onMouseEnter={(e)=>e.currentTarget.style.background='rgba(99, 102, 241, 0.1)'} 
            onMouseLeave={(e)=>e.currentTarget.style.background='transparent'}
          >
            <Sparkles size={15} />
          </button>
        </div>

        {/* View Mode & Download controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {/* Download Dropdown */}
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setShowDownloadDropdown(!showDownloadDropdown)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '4px 10px',
                borderRadius: 'var(--radius-sm)',
                fontSize: '11.5px',
                fontWeight: 600,
                color: 'var(--text-secondary)',
                background: 'var(--bg-input)',
                border: '1px solid var(--border-color)',
                transition: 'background var(--transition-fast)'
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
            >
              <Download size={12} />
              <span>下載檔案</span>
            </button>
            {showDownloadDropdown && (
              <>
                <div 
                  onClick={() => setShowDownloadDropdown(false)}
                  style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 100 }}
                />
                <div 
                  className="glass-panel"
                  style={{
                    position: 'absolute',
                    top: 'calc(100% + 4px)',
                    right: 0,
                    zIndex: 101,
                    padding: '4px',
                    borderRadius: 'var(--radius-sm)',
                    boxShadow: 'var(--shadow-md)',
                    minWidth: '110px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '2px'
                  }}
                >
                  <button
                    onClick={() => handleDownload('md')}
                    style={{
                      padding: '6px 12px',
                      fontSize: '11.5px',
                      textAlign: 'left',
                      borderRadius: 'var(--radius-sm)',
                      width: '100%',
                      color: 'var(--text-primary)'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    下載為 .md
                  </button>
                  <button
                    onClick={() => handleDownload('txt')}
                    style={{
                      padding: '6px 12px',
                      fontSize: '11.5px',
                      textAlign: 'left',
                      borderRadius: 'var(--radius-sm)',
                      width: '100%',
                      color: 'var(--text-primary)'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    下載為 .txt
                  </button>
                </div>
              </>
            )}
          </div>

          <div style={{
            display: 'flex',
            background: 'var(--bg-input)',
            padding: '2px',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-color)'
          }}>
            <button
              onClick={() => setViewMode('edit')}
              style={{
                padding: '4px 10px',
                borderRadius: 'var(--radius-sm)',
                fontSize: '11.5px',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                color: viewMode === 'edit' ? 'var(--text-primary)' : 'var(--text-muted)',
                background: viewMode === 'edit' ? 'rgba(255, 255, 255, 0.08)' : 'transparent'
              }}
            >
              <Edit3 size={12} />
              <span>編輯</span>
            </button>
            <button
              onClick={() => setViewMode('split')}
              style={{
                padding: '4px 10px',
                borderRadius: 'var(--radius-sm)',
                fontSize: '11.5px',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                color: viewMode === 'split' ? 'var(--text-primary)' : 'var(--text-muted)',
                background: viewMode === 'split' ? 'rgba(255, 255, 255, 0.08)' : 'transparent'
              }}
            >
              <Columns size={12} />
              <span>雙欄對照</span>
            </button>
            <button
              onClick={() => setViewMode('view')}
              style={{
                padding: '4px 10px',
                borderRadius: 'var(--radius-sm)',
                fontSize: '11.5px',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                color: viewMode === 'view' ? 'var(--text-primary)' : 'var(--text-muted)',
                background: viewMode === 'view' ? 'rgba(255, 255, 255, 0.08)' : 'transparent'
              }}
            >
              <Eye size={12} />
              <span>預覽</span>
            </button>
          </div>
        </div>
      </div>

      {/* 4. Main Editors Panel Workspace */}
      <div 
        ref={containerRef}
        style={{ flex: 1, display: 'flex', overflow: 'hidden', position: 'relative' }}
      >
        
        {isNewNote ? (
          <div style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '40px 24px',
            overflowY: 'auto',
            background: 'var(--bg-editor)',
            height: '100%',
            width: '100%'
          }}>
            <div style={{ maxWidth: '680px', width: '100%', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <div>
                <h2 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '6px' }}>
                  💡 選擇範本快速開始
                </h2>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                  選擇一個常用的結構化範本以省去排版時間，或是直接開始寫作！
                </p>
              </div>

              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                gap: '12px',
                width: '100%',
                textAlign: 'left'
              }}>
                {NOTE_TEMPLATES.map((tmpl) => (
                  <div
                    key={tmpl.name}
                    className="glass-panel hover-scale"
                    onClick={() => {
                      setLocalContent(tmpl.content);
                      lastSavedContentRef.current = tmpl.content;
                      updateNote(noteId, { content: tmpl.content });
                      setIsSaved(true);
                    }}
                    style={{
                      padding: '16px',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border-color)',
                      cursor: 'pointer',
                      background: 'rgba(255, 255, 255, 0.02)',
                      transition: 'all var(--transition-fast)',
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '12px'
                    }}
                  >
                    <span style={{ fontSize: '24px', background: 'rgba(255,255,255,0.03)', padding: '8px', borderRadius: 'var(--radius-sm)' }}>
                      {tmpl.icon}
                    </span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '14.5px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>
                        {tmpl.name}
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
                        {tmpl.description}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ marginTop: '12px' }}>
                <button
                  onClick={() => {
                    setBypassTemplates(true);
                    const emptyContent = `# ${note.title}\n\n`;
                    setLocalContent(emptyContent);
                    lastSavedContentRef.current = emptyContent;
                    updateNote(noteId, { content: emptyContent });
                    setIsSaved(true);
                  }}
                  className="hover-scale btn-glow"
                  style={{
                    padding: '10px 24px',
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--brand-primary)',
                    color: '#ffffff',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    boxShadow: 'var(--shadow-glow)',
                    border: 'none'
                  }}
                >
                  直接開始寫作（空白頁面）
                </button>
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* Docked templates vertical bar on the left */}
            <div style={{
              width: '42px',
              borderRight: '1px solid var(--border-color)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '12px',
              padding: '16px 0',
              backgroundColor: 'rgba(255, 255, 255, 0.01)',
              flexShrink: 0,
              zIndex: 5
            }}>
              {NOTE_TEMPLATES.map((tmpl) => (
                <button
                  key={tmpl.name}
                  onClick={() => handleApplyTemplate(tmpl)}
                  title={`套用「${tmpl.name}」範本 (覆蓋目前內容)`}
                  style={{
                    width: '30px',
                    height: '30px',
                    borderRadius: 'var(--radius-md)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '16px',
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    transition: 'all var(--transition-fast)'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
                    e.currentTarget.style.transform = 'scale(1.1)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                    e.currentTarget.style.transform = 'scale(1)';
                  }}
                >
                  {tmpl.icon}
                </button>
              ))}
            </div>

            {/* LEFT: Raw Markdown Textarea Editor */}
            {(viewMode === 'edit' || viewMode === 'split') && (
              <div style={{
                width: viewMode === 'split' ? `${editorWidth}%` : '100%',
                flex: viewMode === 'split' ? 'none' : 1,
                height: '100%',
                position: 'relative',
                borderRight: (viewMode === 'split' && !isDragging) ? '1px solid var(--border-color)' : 'none'
              }}>
                <textarea
                  ref={textareaRef}
                  value={localContent}
                  onChange={handleChangeContent}
                  onScroll={handleEditorScroll}
                  onMouseEnter={() => activeScrollRef.current = 'editor'}
                  onMouseLeave={() => activeScrollRef.current = null}
                  onPaste={handlePaste}
                  onDrop={handleDrop}
                  placeholder="# 開始編寫 Markdown..."
                  style={{
                    width: '100%',
                    height: '100%',
                    padding: '24px',
                    background: 'transparent',
                    border: 'none',
                    outline: 'none',
                    resize: 'none',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '14px',
                    lineHeight: '1.6',
                    color: 'var(--text-primary)'
                  }}
                />
              </div>
            )}

            {/* Vertical Resizer Divider */}
            {viewMode === 'split' && (
              <div
                onMouseDown={handleMouseDown}
                style={{
                  width: '6px',
                  cursor: 'col-resize',
                  background: isDragging ? 'var(--brand-primary)' : 'var(--border-color)',
                  zIndex: 10,
                  position: 'relative',
                  transition: 'background var(--transition-fast)',
                  flexShrink: 0
                }}
              />
            )}

            {/* RIGHT: Live Previews Rendered HTML */}
            {(viewMode === 'split' || viewMode === 'view') && (
              <div style={{ flex: 1, height: '100%', display: 'flex', overflow: 'hidden' }}>
                <div 
                  onMouseEnter={() => activeScrollRef.current = 'preview'}
                  onMouseLeave={() => activeScrollRef.current = null}
                  onScroll={handlePreviewScroll}
                  style={{ flex: 1, height: '100%', overflowY: 'auto' }}
                >
                  <MarkdownPreview 
                    content={localContent} 
                    previewRef={previewRef}
                  />
                </div>
                
                {/* Auto outline Table of Contents (only visible in full preview or split screen) */}
                <div style={{
                  width: '180px',
                  borderLeft: '1px solid var(--border-color)',
                  display: 'flex',
                  flexDirection: 'column',
                  flexShrink: 0
                }}>
                  <TableOfContents 
                    content={localContent}
                    previewElement={previewRef.current}
                  />
                </div>
              </div>
            )}
          </>
        )}

        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept="image/*"
          style={{ display: 'none' }}
        />
      </div>
    </div>
  );
};
