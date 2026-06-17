import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { MarkdownPreview } from './MarkdownPreview';
import { 
  Sparkles, Send, Settings, X, Trash2, 
  ExternalLink, FileText, Copy, Check
} from 'lucide-react';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
}

const FREE_MODELS = [
  { id: 'google/gemini-2.5-flash', name: 'Gemini 2.5 Flash (極低成本/推薦)' },
  { id: 'meta-llama/llama-3-8b-instruct:free', name: 'Llama 3 8B (免費)' },
  { id: 'google/gemma-2-9b-it:free', name: 'Gemma 2 9B (免費)' },
  { id: 'qwen/qwen-2-7b-instruct:free', name: 'Qwen 2 7B (免費)' },
  { id: 'mistralai/mistral-7b-instruct:free', name: 'Mistral 7B (免費)' },
];

export const AiAssistant: React.FC = () => {
  const { activeNoteId, notes, updateNote } = useApp();
  const note = notes.find(n => n.id === activeNoteId);

  // Core state
  const [isOpen, setIsOpen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('newtion_openrouter_api_key') || import.meta.env.VITE_OPENROUTER_API_KEY || '');
  const [selectedModel, setSelectedModel] = useState(() => localStorage.getItem('newtion_openrouter_model') || 'google/gemini-2.5-flash');
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    const saved = localStorage.getItem('newtion_ai_chat_history');
    return saved ? JSON.parse(saved) : [];
  });
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copySuccess, setCopySuccess] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Save chat history & settings
  useEffect(() => {
    localStorage.setItem('newtion_ai_chat_history', JSON.stringify(messages));
  }, [messages]);

  useEffect(() => {
    localStorage.setItem('newtion_openrouter_model', selectedModel);
  }, [selectedModel]);

  // Listen to open-ai-assistant global event
  useEffect(() => {
    const handleOpenAI = (e: Event) => {
      const customEvent = e as CustomEvent;
      setIsOpen(true);
      if (customEvent.detail?.prompt) {
        setInput(customEvent.detail.prompt);
      }
    };
    window.addEventListener('open-ai-assistant', handleOpenAI);
    return () => window.removeEventListener('open-ai-assistant', handleOpenAI);
  }, []);

  // Scroll to bottom on new message
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  // Open settings automatically if no API key is present when opened
  useEffect(() => {
    if (isOpen && !apiKey) {
      setShowSettings(true);
    }
  }, [isOpen, apiKey]);

  const handleSaveSettings = (key: string, model: string) => {
    const trimmedKey = key.trim();
    if (trimmedKey) {
      localStorage.setItem('newtion_openrouter_api_key', trimmedKey);
      setApiKey(trimmedKey);
    } else {
      localStorage.removeItem('newtion_openrouter_api_key');
      setApiKey(import.meta.env.VITE_OPENROUTER_API_KEY || '');
    }
    setSelectedModel(model);
    setShowSettings(false);
  };

  const handleClearHistory = () => {
    if (window.confirm('確定要清除所有對話紀錄嗎？')) {
      setMessages([]);
      localStorage.removeItem('newtion_ai_chat_history');
    }
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!input.trim() || isLoading) return;

    if (!apiKey) {
      setShowSettings(true);
      alert('請先設定您的 OpenRouter API 金鑰！');
      return;
    }

    const userPrompt = input.trim();
    setInput('');
    setIsLoading(true);

    // Create user message
    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: userPrompt,
      timestamp: new Date().toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' })
    };

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);

    try {
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': window.location.origin || 'http://localhost:5173',
          'X-Title': 'Newtion AI Assistant',
        },
        body: JSON.stringify({
          model: selectedModel,
          messages: [
            {
              role: 'system',
              content: 'You are Newtion AI, a helpful, polite, and precise note-taking assistant. You respond in Traditional Chinese unless requested otherwise. Always write standard markdown and math formulas in LaTeX using single $ for inline math and $$ for blocks. Help the user summarize, rewrite, format, or write new content.'
            },
            ...newMessages.map(msg => ({ role: msg.role, content: msg.content }))
          ],
          max_tokens: 2000
        })
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData?.error?.message || `API 錯誤: ${response.status}`);
      }

      const data = await response.json();
      const aiContent = data?.choices?.[0]?.message?.content || '未收到有效回覆。';

      const aiMessage: ChatMessage = {
        id: `ai-${Date.now()}`,
        role: 'assistant',
        content: aiContent,
        timestamp: new Date().toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' })
      };

      setMessages(prev => [...prev, aiMessage]);
    } catch (err: any) {
      console.error(err);
      const errorMessage: ChatMessage = {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: `❌ **呼叫失敗**\n\n原因: ${err.message || '未知錯誤'}。請確認您的 API 金鑰是否正確、網路是否暢通，或嘗試更換模型。`,
        timestamp: new Date().toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  // Note actions
  const handleImportNote = () => {
    if (!note) return;
    const noteContext = `以下是目前筆記的內容：\n\n---\n標題: ${note.title}\n\n${note.content}\n---\n\n【請幫我對此筆記進行：】`;
    setInput(prev => noteContext + prev);
  };

  const handleAppendToNote = (content: string) => {
    if (!note || !activeNoteId) return;
    const newContent = `${note.content}\n\n---\n\n### AI 助手補充：\n${content}`;
    updateNote(activeNoteId, { content: newContent });
    alert('已成功將回答插入到筆記尾端！');
  };

  const handleReplaceNote = (content: string) => {
    if (!note || !activeNoteId) return;
    if (window.confirm('確定要用 AI 的回答取代目前的整篇筆記內容嗎？（此動作會覆蓋現有內容）')) {
      updateNote(activeNoteId, { content });
      alert('已覆蓋筆記內容！');
    }
  };

  const handleCopyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopySuccess(id);
    setTimeout(() => setCopySuccess(null), 2000);
  };

  const hasCustomKey = !!localStorage.getItem('newtion_openrouter_api_key');
  const hasSystemKey = !!import.meta.env.VITE_OPENROUTER_API_KEY;

  return (
    <>
      {/* Floating Action Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        title="開啟 AI 筆記助手"
        style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          width: '52px',
          height: '52px',
          borderRadius: '50%',
          backgroundColor: 'var(--brand-primary)',
          color: '#ffffff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 4px 16px rgba(79, 70, 229, 0.4)',
          zIndex: 99,
          cursor: 'pointer',
          border: 'none',
          transition: 'transform 0.2s ease, background-color 0.2s ease',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'scale(1.1)';
          e.currentTarget.style.backgroundColor = 'var(--border-focus)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'scale(1)';
          e.currentTarget.style.backgroundColor = 'var(--brand-primary)';
        }}
      >
        {isOpen ? <X size={22} /> : <Sparkles size={22} />}
      </button>

      {/* Slide-out Drawer Overlay */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          height: '100vh',
          width: '380px',
          maxWidth: '92vw',
          backgroundColor: 'var(--bg-popover)',
          borderLeft: '1px solid var(--border-color)',
          boxShadow: 'var(--shadow-lg)',
          zIndex: 98,
          display: 'flex',
          flexDirection: 'column',
          transform: isOpen ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        {/* Drawer Header */}
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid var(--border-color)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Sparkles size={16} style={{ color: 'var(--brand-primary)' }} />
            <span style={{ fontWeight: 600, fontSize: '15px', color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}>
              AI 筆記助手
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {messages.length > 0 && (
              <button
                onClick={handleClearHistory}
                title="清除聊天紀錄"
                style={{
                  padding: '6px',
                  borderRadius: 'var(--radius-sm)',
                  color: 'var(--text-secondary)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                }}
                onMouseEnter={(e) => e.currentTarget.style.color = 'var(--accent-error)'}
                onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-secondary)'}
              >
                <Trash2 size={16} />
              </button>
            )}

            <button
              onClick={() => setShowSettings(!showSettings)}
              title="API 設定"
              style={{
                padding: '6px',
                borderRadius: 'var(--radius-sm)',
                color: showSettings ? 'var(--brand-primary)' : 'var(--text-secondary)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
              }}
              onMouseEnter={(e) => e.currentTarget.style.color = 'var(--brand-primary)'}
              onMouseLeave={(e) => e.currentTarget.style.color = showSettings ? 'var(--brand-primary)' : 'var(--text-secondary)'}
            >
              <Settings size={16} />
            </button>

            <button
              onClick={() => setIsOpen(false)}
              title="關閉"
              style={{
                padding: '6px',
                borderRadius: 'var(--radius-sm)',
                color: 'var(--text-secondary)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
              }}
              onMouseEnter={(e) => e.currentTarget.style.color = 'var(--text-primary)'}
              onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-secondary)'}
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* API Settings Section */}
        {showSettings && (
          <div
            style={{
              padding: '16px 20px',
              backgroundColor: 'var(--bg-input)',
              borderBottom: '1px solid var(--border-color)',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
            }}
          >
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                OpenRouter API 金鑰 {hasSystemKey && !hasCustomKey && <span style={{ color: 'var(--accent-success)' }}>(已載入預設金鑰)</span>}
              </label>
              <input
                type="password"
                placeholder={hasSystemKey ? "已套用系統預設金鑰 (可在此輸入自訂金鑰覆蓋)" : "sk-or-v1-..."}
                defaultValue={localStorage.getItem('newtion_openrouter_api_key') || ''}
                id="ai-api-key-input"
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: 'var(--bg-popover)',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-primary)',
                  fontSize: '13px',
                  outline: 'none',
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                選擇 AI 模型
              </label>
              <select
                defaultValue={selectedModel}
                id="ai-model-select"
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: 'var(--bg-popover)',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-primary)',
                  fontSize: '13px',
                  outline: 'none',
                  cursor: 'pointer',
                }}
              >
                {FREE_MODELS.map(model => (
                  <option key={model.id} value={model.id}>{model.name}</option>
                ))}
              </select>
            </div>

            <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
              <button
                onClick={() => {
                  const keyEl = document.getElementById('ai-api-key-input') as HTMLInputElement;
                  const modelEl = document.getElementById('ai-model-select') as HTMLSelectElement;
                  if (keyEl && modelEl) {
                    handleSaveSettings(keyEl.value, modelEl.value);
                  }
                }}
                style={{
                  flex: 1,
                  padding: '8px 0',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: 'var(--brand-primary)',
                  color: '#ffffff',
                  fontSize: '12px',
                  fontWeight: 600,
                  textAlign: 'center',
                  cursor: 'pointer',
                }}
              >
                儲存設定
              </button>
              <button
                onClick={() => {
                  localStorage.removeItem('newtion_openrouter_api_key');
                  setApiKey(import.meta.env.VITE_OPENROUTER_API_KEY || '');
                  const keyEl = document.getElementById('ai-api-key-input') as HTMLInputElement;
                  if (keyEl) keyEl.value = '';
                  alert(import.meta.env.VITE_OPENROUTER_API_KEY ? '已清除自訂金鑰，回復為系統預設金鑰' : '金鑰已清除');
                }}
                style={{
                  padding: '8px 12px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-secondary)',
                  fontSize: '12px',
                  cursor: 'pointer',
                }}
              >
                清除金鑰
              </button>
            </div>

            <a
              href="https://openrouter.ai/keys"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                fontSize: '11px',
                color: 'var(--brand-primary)',
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                alignSelf: 'flex-start',
              }}
            >
              獲取 OpenRouter API 金鑰 <ExternalLink size={10} />
            </a>
          </div>
        )}

        {/* Note Context Actions */}
        {note && !showSettings && (
          <div
            style={{
              padding: '10px 16px',
              backgroundColor: 'rgba(99, 102, 241, 0.05)',
              borderBottom: '1px solid var(--border-color)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '8px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', overflow: 'hidden' }}>
              <FileText size={14} style={{ color: 'var(--text-secondary)', flexShrink: 0 }} />
              <span style={{ fontSize: '12px', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                當前筆記：{note.title || '未命名頁面'}
              </span>
            </div>
            <button
              onClick={handleImportNote}
              style={{
                padding: '4px 8px',
                fontSize: '11px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border-color)',
                backgroundColor: 'var(--bg-popover)',
                color: 'var(--text-primary)',
                fontWeight: 500,
                cursor: 'pointer',
                flexShrink: 0,
              }}
              onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--brand-primary)'}
              onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--border-color)'}
            >
              讀取目前筆記
            </button>
          </div>
        )}

        {/* Chat History Panel */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
          }}
        >
          {messages.length === 0 ? (
            <div
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                textAlign: 'center',
                gap: '16px',
                padding: '24px',
                color: 'var(--text-secondary)',
              }}
            >
              <div
                style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '50%',
                  backgroundColor: 'rgba(99, 102, 241, 0.1)',
                  color: 'var(--brand-primary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Sparkles size={24} />
              </div>
              <div>
                <h4 style={{ color: 'var(--text-primary)', fontSize: '14px', fontWeight: 600, marginBottom: '6px' }}>
                  歡迎使用 AI 筆記助手！
                </h4>
                <p style={{ fontSize: '12px', lineHeight: '1.6' }}>
                  請先在右上方設定金鑰。<br />
                  您可以請 AI 幫您摘要、重寫、或是回答任何寫作靈感！
                </p>
              </div>
            </div>
          ) : (
            messages.map((msg) => {
              const isAi = msg.role === 'assistant';

              return (
                <div
                  key={msg.id}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: isAi ? 'flex-start' : 'flex-end',
                    gap: '4px',
                    maxWidth: '85%',
                    alignSelf: isAi ? 'flex-start' : 'flex-end',
                  }}
                >
                  {/* Bubble content */}
                  <div
                    style={{
                      padding: isAi ? '4px 10px' : '10px 14px',
                      borderRadius: '8px',
                      backgroundColor: isAi ? 'var(--bg-input)' : 'rgba(99, 102, 241, 0.15)',
                      color: 'var(--text-primary)',
                      fontSize: '13px',
                      lineHeight: '1.5',
                      border: isAi ? '1px solid var(--border-color)' : 'none',
                    }}
                  >
                    {isAi ? (
                      <MarkdownPreview 
                        content={msg.content} 
                        style={{ 
                          padding: '0', 
                          height: 'auto', 
                          background: 'transparent',
                          fontSize: '13px',
                          overflowY: 'visible',
                        }} 
                      />
                    ) : (
                      <div style={{ whiteSpace: 'pre-wrap' }}>{msg.content}</div>
                    )}
                  </div>

                  {/* Actions for messages */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      fontSize: '11px',
                      color: 'var(--text-muted)',
                      padding: '0 4px',
                    }}
                  >
                    <span>{msg.timestamp}</span>

                    {/* Copy Button */}
                    <button
                      onClick={() => handleCopyToClipboard(msg.content, msg.id)}
                      title="複製內容"
                      style={{
                        cursor: 'pointer',
                        color: copySuccess === msg.id ? 'var(--accent-success)' : 'var(--text-muted)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '2px',
                      }}
                    >
                      {copySuccess === msg.id ? <Check size={12} /> : <Copy size={12} />}
                      {copySuccess === msg.id && '已複製'}
                    </button>

                    {/* Editor link actions for AI messages */}
                    {isAi && note && !msg.content.startsWith('❌') && (
                      <>
                        <button
                          onClick={() => handleAppendToNote(msg.content)}
                          style={{ color: 'var(--brand-primary)', cursor: 'pointer' }}
                        >
                          插入尾端
                        </button>
                        <button
                          onClick={() => handleReplaceNote(msg.content)}
                          style={{ color: 'var(--brand-primary)', cursor: 'pointer' }}
                        >
                          覆蓋筆記
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })
          )}

          {/* Loading indicator */}
          {isLoading && (
            <div
              style={{
                alignSelf: 'flex-start',
                maxWidth: '85%',
                display: 'flex',
                flexDirection: 'column',
                gap: '4px',
              }}
            >
              <div
                style={{
                  padding: '12px 16px',
                  borderRadius: '8px',
                  backgroundColor: 'var(--bg-input)',
                  border: '1px solid var(--border-color)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <div style={{ display: 'flex', gap: '4px' }}>
                  <div className="ai-dot-pulse" style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: 'var(--text-secondary)', animation: 'ai-pulse 1s infinite alternate' }} />
                  <div className="ai-dot-pulse" style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: 'var(--text-secondary)', animation: 'ai-pulse 1s infinite alternate 0.3s' }} />
                  <div className="ai-dot-pulse" style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: 'var(--text-secondary)', animation: 'ai-pulse 1s infinite alternate 0.6s' }} />
                </div>
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>AI 正在思考中...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Form Box */}
        <form
          onSubmit={handleSendMessage}
          style={{
            padding: '16px 20px',
            borderTop: '1px solid var(--border-color)',
            display: 'flex',
            gap: '8px',
            backgroundColor: 'var(--bg-popover)',
          }}
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={isLoading}
            placeholder={apiKey ? "向 AI 提問... (Enter 發送)" : "請先在上方設定金鑰"}
            style={{
              flex: 1,
              padding: '10px 14px',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-color)',
              backgroundColor: 'var(--bg-input)',
              color: 'var(--text-primary)',
              fontSize: '13px',
              outline: 'none',
            }}
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            style={{
              width: '36px',
              height: '36px',
              borderRadius: 'var(--radius-md)',
              backgroundColor: input.trim() && !isLoading ? 'var(--brand-primary)' : 'var(--bg-input)',
              color: input.trim() && !isLoading ? '#ffffff' : 'var(--text-muted)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: input.trim() && !isLoading ? 'pointer' : 'default',
              border: 'none',
              transition: 'background-color 0.2s ease, color 0.2s ease',
            }}
          >
            <Send size={16} />
          </button>
        </form>

        {/* CSS Animation injection */}
        <style dangerouslySetInnerHTML={{__html: `
          @keyframes ai-pulse {
            from { opacity: 0.3; transform: scale(0.9); }
            to { opacity: 1; transform: scale(1.1); }
          }
          /* Custom overrides for markdown body in chat */
          .markdown-body {
            color: inherit !important;
            font-size: 13px !important;
            line-height: 1.5 !important;
          }
          .markdown-body p {
            margin-bottom: 8px !important;
          }
          .markdown-body pre {
            padding: 8px !important;
            margin: 8px 0 !important;
            background-color: rgba(0, 0, 0, 0.2) !important;
            border: 1px solid var(--border-color) !important;
            border-radius: 4px !important;
            overflow-x: auto !important;
          }
          .markdown-body code {
            font-size: 11px !important;
            padding: 2px 4px !important;
            background-color: rgba(0, 0, 0, 0.15) !important;
            border-radius: 3px !important;
          }
        `}} />
      </div>
    </>
  );
};
