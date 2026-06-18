import React, { useState, useMemo, useRef, useEffect } from 'react';
import type { Note, Quiz, Question } from '../types';
import { parseQuiz, serializeTOML, serializeJSON, parsePlainTextQuiz } from '../utils/quizParser';
import { useApp } from '../context/AppContext';
import { 
  Play, Edit3, Plus, Trash2, Upload, HelpCircle, 
  CheckCircle2, XCircle, RefreshCw, ArrowRight, X,
  Share2, Globe, Lock, Sparkles, FileText
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { Chart } from 'chart.js/auto';

interface QuizViewProps {
  note: Note;
  readOnly?: boolean;
}

export const QuizView: React.FC<QuizViewProps> = ({ note, readOnly = false }) => {
  const { updateNote, users, currentUser, sendMessage, notes } = useApp();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-detect format from content
  const currentFormat = useMemo<'json' | 'toml'>(() => {
    const trimmed = note.content.trim();
    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
      return 'json';
    }
    return 'toml';
  }, [note.content]);

  // Parse quiz from note content
  const parsedQuiz = useMemo<Quiz | null>(() => {
    return parseQuiz(note.content);
  }, [note.content]);

  // Quiz state that can be mutated locally for stats updates (works in readOnly/public mode too)
  const [quiz, setQuiz] = useState<Quiz | null>(null);

  // Sync state if note content changes externally
  useEffect(() => {
    setQuiz(parsedQuiz);
  }, [parsedQuiz]);

  // Local state for quiz title and description to prevent IME composition break
  const [localTitle, setLocalTitle] = useState(quiz ? quiz.title : '');
  const [localDescription, setLocalDescription] = useState(quiz ? quiz.description : '');

  const localTitleRef = useRef(localTitle);
  const localDescriptionRef = useRef(localDescription);

  const lastSavedTitleRef = useRef(quiz ? quiz.title : '');
  const lastSavedDescRef = useRef(quiz ? quiz.description : '');

  const metaDebounceRef = useRef<any>(null);

  // Keep refs in sync with state
  useEffect(() => {
    localTitleRef.current = localTitle;
  }, [localTitle]);

  useEffect(() => {
    localDescriptionRef.current = localDescription;
  }, [localDescription]);

  // Sync states when active note ID changes
  useEffect(() => {
    if (parsedQuiz) {
      setLocalTitle(parsedQuiz.title || '');
      setLocalDescription(parsedQuiz.description || '');
      lastSavedTitleRef.current = parsedQuiz.title || '';
      lastSavedDescRef.current = parsedQuiz.description || '';
    }
  }, [note.id]);

  // Sync states when quiz changes externally
  useEffect(() => {
    if (quiz) {
      if (quiz.title !== lastSavedTitleRef.current) {
        setLocalTitle(quiz.title || '');
        lastSavedTitleRef.current = quiz.title || '';
      }
      if (quiz.description !== lastSavedDescRef.current) {
        setLocalDescription(quiz.description || '');
        lastSavedDescRef.current = quiz.description || '';
      }
    }
  }, [quiz?.title, quiz?.description]);

  // Flush any pending save on note.id changes or component unmount
  useEffect(() => {
    return () => {
      if (metaDebounceRef.current) {
        clearTimeout(metaDebounceRef.current);
        saveMetaForcefully();
      }
    };
  }, [note.id]);

  const saveMetaForcefully = () => {
    if (!parsedQuiz) return;
    const title = localTitleRef.current;
    const description = localDescriptionRef.current;
    lastSavedTitleRef.current = title;
    lastSavedDescRef.current = description;

    // We must merge with current parsedQuiz to avoid losing other properties (like questions)
    const updatedQuiz = { ...parsedQuiz, title, description };
    updateNote(note.id, { title });
    const content = currentFormat === 'json' ? serializeJSON(updatedQuiz) : serializeTOML(updatedQuiz);
    updateNote(note.id, { content });
  };

  // Tab State: play (進行測驗) or edit (編輯測驗)
  const [tab, setTab] = useState<'play' | 'edit'>('play');

  // Auto-switch to edit tab if there are no questions and not read-only
  useEffect(() => {
    if (quiz && quiz.questions.length === 0 && !readOnly) {
      setTab('edit');
    }
  }, [quiz, readOnly]);

  // Play Mode State
  const [quizStarted, setQuizStarted] = useState(false);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [results, setResults] = useState<boolean[]>([]);
  const [quizFinished, setQuizFinished] = useState(false);

  // Share dropdown state
  const [showShareDropdown, setShowShareDropdown] = useState(false);
  const [selectedUserForShare, setSelectedUserForShare] = useState('');
  const [isSendingNote, setIsSendingNote] = useState(false);

  const handleTogglePublish = () => {
    const nextState = !note.isPublished;
    updateNote(note.id, { 
      isPublished: nextState,
      isPublic: note.isPublic !== false
    });
    
    if (nextState) {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#6366f1', '#ec4899', '#3b82f6', '#10b981']
      });
    }
  };

  // Chart refs and instances
  const sessionChartRef = useRef<HTMLCanvasElement | null>(null);
  const errorRateChartRef = useRef<HTMLCanvasElement | null>(null);
  const startChartRef = useRef<HTMLCanvasElement | null>(null);
  const editChartRef = useRef<HTMLCanvasElement | null>(null);

  const sessionChartInstance = useRef<any>(null);
  const errorRateChartInstance = useRef<any>(null);
  const startChartInstance = useRef<any>(null);
  const editChartInstance = useRef<any>(null);

  // Modal State for visual question editor
  const [modalOpen, setModalOpen] = useState(false);
  const [editingQIdx, setEditingQIdx] = useState<number | null>(null); // null = add new, number = edit index
  const [modalQuestion, setModalQuestion] = useState('');
  const [modalOptions, setModalOptions] = useState<string[]>(['選項 A', '選項 B']);
  const [modalAnswer, setModalAnswer] = useState(0);
  const [modalExplanation, setModalExplanation] = useState('');

  // AI Generation States
  const [aiModalOpen, setAiModalOpen] = useState(false);
  const [aiSource, setAiSource] = useState<'topic' | 'note'>('topic');
  const [aiTopic, setAiTopic] = useState('');
  const [aiSelectedNoteId, setAiSelectedNoteId] = useState('');
  const [aiNumQuestions, setAiNumQuestions] = useState(5);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiApiKey, setAiApiKey] = useState(() => localStorage.getItem('newtion_openrouter_api_key') || '');
  const [aiModel, setAiModel] = useState(() => localStorage.getItem('newtion_openrouter_model') || 'google/gemini-2.5-flash');

  // Text Import States
  const [textImportModalOpen, setTextImportModalOpen] = useState(false);
  const [rawImportText, setRawImportText] = useState('');

  // Handle format switch
  const handleFormatChange = (newFormat: 'json' | 'toml') => {
    if (!quiz) return;
    const serialized = newFormat === 'json' ? serializeJSON(quiz) : serializeTOML(quiz);
    updateNote(note.id, { content: serialized });
  };

  // Initialize Quiz
  const handleInitialize = () => {
    const defaultQuiz: Quiz = {
      title: note.title || '新測驗',
      description: '請在編輯器中編輯或新增選擇題問題。',
      questions: [
        {
          id: 'q-1',
          question: '這是一題範例問題？',
          options: ['選項 A', '選項 B', '選項 C', '選項 D'],
          answer: 0,
          explanation: '這是解答說明，答題後會顯示在此處。'
        }
      ]
    };
    const content = serializeJSON(defaultQuiz); // Default to JSON on init
    updateNote(note.id, { content });
    setTab('edit');
  };

  // Load Example Quiz
  const handleLoadExample = () => {
    const exampleQuiz: Quiz = {
      title: 'JavaScript 基礎觀念挑戰 🚀',
      description: '測試你對 JavaScript 基本型態、作用域與異步操作的理解！',
      questions: [
        {
          id: 'q-1',
          question: '下列哪一個選項「不是」 JavaScript 的基本資料型態 (Primitive Types)？',
          options: ['String', 'Boolean', 'Object', 'Symbol'],
          answer: 2,
          explanation: 'Object 不是基本資料型態，它屬於參照型態 (Reference Type)。JavaScript 的基本型態包括：String, Number, BigInt, Boolean, Undefined, Null, Symbol。'
        },
        {
          id: 'q-2',
          question: '執行 typeof null 的輸出結果是什麼？',
          options: ['"null"', '"object"', '"undefined"', '"string"'],
          answer: 1,
          explanation: 'typeof null 會回傳 "object"，這是 JavaScript 自第一版以來就存在的 Bug，因為歷史原因而被保留了下來。'
        },
        {
          id: 'q-3',
          question: '若要宣告一個不可重複賦值且具有區塊作用域 (Block Scope) 的變數，應該使用什麼關鍵字？',
          options: ['var', 'let', 'const', 'function'],
          answer: 2,
          explanation: 'const 用於宣告區塊作用域的常數，不可重新賦值。let 也是區塊作用域但可以重新賦值，而 var 是函數作用域 (Function Scope) 且會被提升。'
        }
      ]
    };
    const content = serializeJSON(exampleQuiz);
    updateNote(note.id, { content });
    setTab('play');
    setQuizStarted(false);
    setQuizFinished(false);
    setCurrentIdx(0);
  };

  // AI Quiz Generation
  const handleAiGenerateQuiz = async () => {
    if (!aiApiKey.trim()) {
      alert('請先設定您的 OpenRouter API 金鑰！');
      return;
    }
    setAiLoading(true);

    // Save settings
    localStorage.setItem('newtion_openrouter_api_key', aiApiKey.trim());
    localStorage.setItem('newtion_openrouter_model', aiModel);

    // Build the prompt
    let sourceContext = '';
    if (aiSource === 'note') {
      const selectedNote = notes.find(n => n.id === aiSelectedNoteId);
      if (selectedNote) {
        sourceContext = `以下是目前選定筆記的內容：\n\n---\n標題: ${selectedNote.title}\n內容:\n${selectedNote.content}\n---\n\n請根據這篇筆記的內容出題。`;
      } else {
        alert('請先選擇一個筆記作為出題來源！');
        setAiLoading(false);
        return;
      }
    } else {
      if (!aiTopic.trim()) {
        alert('請輸入出題的主題或關鍵字！');
        setAiLoading(false);
        return;
      }
      sourceContext = `請根據以下主題/關鍵字出題：\n主題/關鍵字: ${aiTopic.trim()}`;
    }

    const systemPrompt = `You are an expert quiz generator. Your task is to output a single JSON object representing a quiz.
The JSON object must contain the following keys:
- title: A short string title for this quiz (in Traditional Chinese)
- description: A short description of the quiz topic (in Traditional Chinese)
- questions: An array of question objects, where each object has:
  - question: The question text (in Traditional Chinese)
  - options: An array of 2 to 4 options (strings, in Traditional Chinese)
  - answer: A 0-indexed integer pointing to the correct option index in options
  - explanation: A detailed explanation/rationale of the answer (in Traditional Chinese)

CRITICAL RULES:
1. Output ONLY the raw JSON string. DO NOT wrap it in markdown block formatting (like \`\`\`json). DO NOT write any other introduction, commentary or summary.
2. Return exactly ${aiNumQuestions} questions.
3. The content must be in Traditional Chinese.`;

    try {
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${aiApiKey.trim()}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': window.location.origin || 'http://localhost:5173',
          'X-Title': 'Newtion AI Assistant',
        },
        body: JSON.stringify({
          model: aiModel,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: sourceContext }
          ],
          max_tokens: 3000
        })
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData?.error?.message || `API 錯誤: ${response.status}`);
      }

      const data = await response.json();
      const aiContent = data?.choices?.[0]?.message?.content || '';

      if (!aiContent.trim()) {
        throw new Error('AI 返回了空結果。');
      }

      // Parse JSON from output
      let cleanedText = aiContent.trim();
      if (cleanedText.startsWith('```')) {
        cleanedText = cleanedText.replace(/^```[a-zA-Z]*\n/, '').replace(/\n```$/, '');
      }

      const parsedJson = JSON.parse(cleanedText);
      if (!parsedJson || !Array.isArray(parsedJson.questions)) {
        throw new Error('AI 返回的格式不正確，找不到 questions 陣列。');
      }

      // Standardize/normalize questions
      const generatedQuestions = parsedJson.questions.map((q: any, idx: number) => ({
        id: `q-${Date.now()}-${idx}-${Math.random().toString(36).substr(2, 5)}`,
        question: q.question || '未命名問題',
        options: Array.isArray(q.options) ? q.options.map(String) : ['選項 A', '選項 B'],
        answer: typeof q.answer === 'number' ? q.answer : 0,
        explanation: q.explanation || ''
      }));

      const isDefaultTemplate = quiz && quiz.questions.length === 1 && quiz.questions[0].id === 'q-1';

      if (quiz && quiz.questions.length > 0 && !isDefaultTemplate) {
        // Append mode
        const updatedQuiz = {
          ...quiz,
          questions: [...quiz.questions, ...generatedQuestions]
        };
        const content = currentFormat === 'json' ? serializeJSON(updatedQuiz) : serializeTOML(updatedQuiz);
        updateNote(note.id, { content });
        alert(`成功利用 AI 額外生成並追加了 ${generatedQuestions.length} 題問題！`);
      } else {
        // Initialize or Overwrite default template mode
        const newQuiz: Quiz = {
          title: parsedJson.title || note.title || 'AI 智慧測驗',
          description: parsedJson.description || '由 Newtion AI 自動生成的測驗。',
          questions: generatedQuestions
        };
        const content = serializeJSON(newQuiz);
        updateNote(note.id, { content, title: newQuiz.title });
        setTab('play');
        setQuizStarted(false);
        setQuizFinished(false);
        setCurrentIdx(0);
        alert(`AI 測驗生成成功！共生成了 ${generatedQuestions.length} 題問題。`);
      }

      setAiModalOpen(false);
    } catch (err: any) {
      console.error(err);
      alert('AI 出題失敗：' + (err.message || err));
    } finally {
      setAiLoading(false);
    }
  };

  // Plain Text Paste Import
  const handleTextImportQuiz = () => {
    if (!rawImportText.trim()) {
      alert('請先貼上您要匯入的題目純文字內容！');
      return;
    }

    try {
      const importedQuestions = parsePlainTextQuiz(rawImportText);
      if (importedQuestions.length === 0) {
        alert('解析失敗：未偵測到任何符合格式的題目，請檢查格式是否符合範例說明。');
        return;
      }

      const isDefaultTemplate = quiz && quiz.questions.length === 1 && quiz.questions[0].id === 'q-1';

      if (quiz && quiz.questions.length > 0 && !isDefaultTemplate) {
        // Append mode
        const updatedQuiz = {
          ...quiz,
          questions: [...quiz.questions, ...importedQuestions]
        };
        const content = currentFormat === 'json' ? serializeJSON(updatedQuiz) : serializeTOML(updatedQuiz);
        updateNote(note.id, { content });
        alert(`成功匯入並追加了 ${importedQuestions.length} 題問題！`);
      } else {
        // Initialize or Overwrite default template mode
        const newQuiz: Quiz = {
          title: note.title || '文字匯入測驗',
          description: '透過純文字貼上匯入的選擇題測驗。',
          questions: importedQuestions
        };
        const content = serializeJSON(newQuiz);
        updateNote(note.id, { content });
        setTab('play');
        setQuizStarted(false);
        setQuizFinished(false);
        setCurrentIdx(0);
        alert(`成功初始化並匯入 ${importedQuestions.length} 題問題！`);
      }

      setRawImportText('');
      setTextImportModalOpen(false);
    } catch (err: any) {
      console.error(err);
      alert('解析匯入時發生錯誤：' + (err.message || err));
    }
  };

  // Play Actions
  const handleAnswerSelect = (optionIdx: number, correctIdx: number) => {
    if (selectedOption !== null || !quiz) return;
    setSelectedOption(optionIdx);

    const isCorrect = optionIdx === correctIdx;
    setResults((prev) => [...prev, isCorrect]);

    // Update local attempts and errors stats
    const nextQuestions = quiz.questions.map((q, idx) => {
      if (idx === currentIdx) {
        return {
          ...q,
          attempts: (q.attempts || 0) + 1,
          errors: (q.errors || 0) + (isCorrect ? 0 : 1)
        };
      }
      return q;
    });

    const nextQuiz = {
      ...quiz,
      questions: nextQuestions
    };

    setQuiz(nextQuiz);

    // If owner, persist updated stats to database
    if (!readOnly) {
      const serialized = currentFormat === 'json' ? serializeJSON(nextQuiz) : serializeTOML(nextQuiz);
      updateNote(note.id, { content: serialized });
    }

    if (isCorrect) {
      confetti({
        particleCount: 20,
        spread: 30,
        origin: { y: 0.85 },
        colors: ['#10b981', '#6366f1']
      });
    }
  };

  // Chart.js Effects
  // 1. Session charts (Finished screen)
  useEffect(() => {
    if (!quizFinished || !quiz) return;

    // Session Doughnut Chart
    if (sessionChartRef.current) {
      if (sessionChartInstance.current) sessionChartInstance.current.destroy();
      
      const correctCount = results.filter(Boolean).length;
      sessionChartInstance.current = new Chart(sessionChartRef.current, {
        type: 'doughnut',
        data: {
          labels: ['答對', '答錯'],
          datasets: [{
            data: [correctCount, quiz.questions.length - correctCount],
            backgroundColor: ['#10b981', '#f43f5e'],
            borderWidth: 1,
            borderColor: 'rgba(255,255,255,0.1)'
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'bottom',
              labels: { color: '#94a3b8', font: { size: 11 } }
            }
          }
        }
      });
    }

    // Cumulative Error Rate Bar Chart
    if (errorRateChartRef.current) {
      if (errorRateChartInstance.current) errorRateChartInstance.current.destroy();
      
      const labels = quiz.questions.map((_, i) => `第 ${i + 1} 題`);
      const errorRates = quiz.questions.map(q => {
        const att = q.attempts || 0;
        const err = q.errors || 0;
        return att > 0 ? Math.round((err / att) * 100) : 0;
      });
      const attempts = quiz.questions.map(q => q.attempts || 0);

      errorRateChartInstance.current = new Chart(errorRateChartRef.current, {
        type: 'bar',
        data: {
          labels,
          datasets: [
            {
              label: '錯誤率 (%)',
              data: errorRates,
              backgroundColor: 'rgba(244, 63, 94, 0.7)',
              borderColor: '#f43f5e',
              borderWidth: 1,
              yAxisID: 'y'
            },
            {
              label: '挑戰次數',
              data: attempts,
              backgroundColor: 'rgba(99, 102, 241, 0.4)',
              borderColor: '#6366f1',
              borderWidth: 1,
              yAxisID: 'y1',
              type: 'line'
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            y: {
              type: 'linear',
              display: true,
              position: 'left',
              min: 0,
              max: 100,
              grid: { color: 'rgba(255,255,255,0.05)' },
              ticks: { color: '#94a3b8', font: { size: 10 }, callback: (val) => `${val}%` }
            },
            y1: {
              type: 'linear',
              display: true,
              position: 'right',
              min: 0,
              grid: { drawOnChartArea: false },
              ticks: { color: '#94a3b8', font: { size: 10 } }
            },
            x: {
              grid: { color: 'rgba(255,255,255,0.05)' },
              ticks: { color: '#94a3b8', font: { size: 10 } }
            }
          },
          plugins: {
            legend: {
              position: 'top',
              labels: { color: '#94a3b8', font: { size: 10 } }
            }
          }
        }
      });
    }

    return () => {
      if (sessionChartInstance.current) {
        sessionChartInstance.current.destroy();
        sessionChartInstance.current = null;
      }
      if (errorRateChartInstance.current) {
        errorRateChartInstance.current.destroy();
        errorRateChartInstance.current = null;
      }
    };
  }, [quizFinished, quiz, results]);

  // 2. Start screen chart
  useEffect(() => {
    if (quizStarted || quizFinished || !quiz) return;
    const hasStats = quiz.questions.some(q => (q.attempts || 0) > 0);
    if (!hasStats || !startChartRef.current) return;

    if (startChartInstance.current) startChartInstance.current.destroy();

    const labels = quiz.questions.map((_, i) => `第 ${i + 1} 題`);
    const errorRates = quiz.questions.map(q => {
      const att = q.attempts || 0;
      const err = q.errors || 0;
      return att > 0 ? Math.round((err / att) * 100) : 0;
    });
    const attempts = quiz.questions.map(q => q.attempts || 0);

    startChartInstance.current = new Chart(startChartRef.current, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            label: '錯誤率 (%)',
            data: errorRates,
            backgroundColor: 'rgba(244, 63, 94, 0.7)',
            borderColor: '#f43f5e',
            borderWidth: 1,
            yAxisID: 'y'
          },
          {
            label: '挑戰次數',
            data: attempts,
            backgroundColor: 'rgba(99, 102, 241, 0.4)',
            borderColor: '#6366f1',
            borderWidth: 1,
            yAxisID: 'y1',
            type: 'line'
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            type: 'linear',
            display: true,
            position: 'left',
            min: 0,
            max: 100,
            grid: { color: 'rgba(255,255,255,0.05)' },
            ticks: { color: '#94a3b8', font: { size: 10 }, callback: (val) => `${val}%` }
          },
          y1: {
            type: 'linear',
            display: true,
            position: 'right',
            min: 0,
            grid: { drawOnChartArea: false },
            ticks: { color: '#94a3b8', font: { size: 10 } }
          },
          x: {
            grid: { color: 'rgba(255,255,255,0.05)' },
            ticks: { color: '#94a3b8', font: { size: 10 } }
          }
        },
        plugins: {
          legend: {
            position: 'top',
            labels: { color: '#94a3b8', font: { size: 10 } }
          }
        }
      }
    });

    return () => {
      if (startChartInstance.current) {
        startChartInstance.current.destroy();
        startChartInstance.current = null;
      }
    };
  }, [quizStarted, quizFinished, quiz]);

  // 3. Edit screen chart
  useEffect(() => {
    if (tab !== 'edit' || !quiz) return;
    const hasStats = quiz.questions.some(q => (q.attempts || 0) > 0);
    if (!hasStats || !editChartRef.current) return;

    if (editChartInstance.current) editChartInstance.current.destroy();

    const labels = quiz.questions.map((_, i) => `第 ${i + 1} 題`);
    const errorRates = quiz.questions.map(q => {
      const att = q.attempts || 0;
      const err = q.errors || 0;
      return att > 0 ? Math.round((err / att) * 100) : 0;
    });
    const attempts = quiz.questions.map(q => q.attempts || 0);

    editChartInstance.current = new Chart(editChartRef.current, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            label: '錯誤率 (%)',
            data: errorRates,
            backgroundColor: 'rgba(244, 63, 94, 0.7)',
            borderColor: '#f43f5e',
            borderWidth: 1,
            yAxisID: 'y'
          },
          {
            label: '挑戰次數',
            data: attempts,
            backgroundColor: 'rgba(99, 102, 241, 0.4)',
            borderColor: '#6366f1',
            borderWidth: 1,
            yAxisID: 'y1',
            type: 'line'
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            type: 'linear',
            display: true,
            position: 'left',
            min: 0,
            max: 100,
            grid: { color: 'rgba(255,255,255,0.05)' },
            ticks: { color: '#94a3b8', font: { size: 10 }, callback: (val) => `${val}%` }
          },
          y1: {
            type: 'linear',
            display: true,
            position: 'right',
            min: 0,
            grid: { drawOnChartArea: false },
            ticks: { color: '#94a3b8', font: { size: 10 } }
          },
          x: {
            grid: { color: 'rgba(255,255,255,0.05)' },
            ticks: { color: '#94a3b8', font: { size: 10 } }
          }
        },
        plugins: {
          legend: {
            position: 'top',
            labels: { color: '#94a3b8', font: { size: 10 } }
          }
        }
      }
    });

    return () => {
      if (editChartInstance.current) {
        editChartInstance.current.destroy();
        editChartInstance.current = null;
      }
    };
  }, [tab, quiz]);

  const handleNext = () => {
    if (!quiz) return;
    setSelectedOption(null);
    if (currentIdx < quiz.questions.length - 1) {
      setCurrentIdx((idx) => idx + 1);
    } else {
      setQuizFinished(true);
      const correctCount = results.filter(Boolean).length;
      const scorePct = (correctCount / quiz.questions.length) * 100;
      if (scorePct >= 70) {
        confetti({
          particleCount: 80,
          spread: 60,
          origin: { y: 0.6 }
        });
      }
    }
  };

  const handleResetQuiz = () => {
    setCurrentIdx(0);
    setSelectedOption(null);
    setResults([]);
    setQuizFinished(false);
    setQuizStarted(true);
  };

  // File Import - Auto detect JSON/TOML
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const parsed = parseQuiz(text);
      if (parsed) {
        updateNote(note.id, { content: text, title: parsed.title || note.title });
        alert('測驗匯入成功！已自動解析內容格式。');
        setTab('play');
        setQuizStarted(false);
        setQuizFinished(false);
        setCurrentIdx(0);
      } else {
        alert('匯入失敗：檔案格式不符合 JSON 或 TOML 測驗規範。');
      }
    };
    reader.readAsText(file);
  };

  // File Export
  const handleExport = (format: 'json' | 'toml') => {
    if (!quiz) return;
    const serialized = format === 'json' ? serializeJSON(quiz) : serializeTOML(quiz);
    const filename = `${quiz.title || 'quiz'}.${format}`;
    const blob = new Blob([serialized], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Open Question Modal
  const openQuestionModal = (idx: number | null) => {
    if (!quiz) return;
    if (idx === null) {
      // Create new
      setEditingQIdx(null);
      setModalQuestion('');
      setModalOptions(['選項 A', '選項 B']);
      setModalAnswer(0);
      setModalExplanation('');
    } else {
      // Edit index
      const q = quiz.questions[idx];
      setEditingQIdx(idx);
      setModalQuestion(q.question);
      setModalOptions([...q.options]);
      setModalAnswer(q.answer);
      setModalExplanation(q.explanation || '');
    }
    setModalOpen(true);
  };

  // Save Question from Modal
  const handleSaveQuestion = () => {
    if (!quiz) return;
    if (!modalQuestion.trim()) {
      alert('請輸入問題敘述！');
      return;
    }
    if (modalOptions.some(opt => !opt.trim())) {
      alert('所有選項皆不能為空！');
      return;
    }

    const updatedQ: Question = {
      id: editingQIdx !== null ? quiz.questions[editingQIdx].id : `q-${Date.now()}`,
      question: modalQuestion.trim(),
      options: modalOptions.map(opt => opt.trim()),
      answer: modalAnswer,
      explanation: modalExplanation.trim()
    };

    let nextQuestions = [...quiz.questions];
    if (editingQIdx === null) {
      nextQuestions.push(updatedQ);
    } else {
      nextQuestions[editingQIdx] = updatedQ;
    }

    const updatedQuiz = { ...quiz, questions: nextQuestions };
    const content = currentFormat === 'json' ? serializeJSON(updatedQuiz) : serializeTOML(updatedQuiz);
    updateNote(note.id, { content });
    
    setModalOpen(false);
  };

  // Delete Question
  const handleDeleteQuestion = (qIdx: number) => {
    if (!quiz) return;
    if (quiz.questions.length <= 1) {
      alert('至少需保留一題問題！');
      return;
    }
    if (!confirm('確定要刪除此問題嗎？')) return;
    const nextQuestions = quiz.questions.filter((_, i) => i !== qIdx);
    const updatedQuiz = { ...quiz, questions: nextQuestions };
    const content = currentFormat === 'json' ? serializeJSON(updatedQuiz) : serializeTOML(updatedQuiz);
    updateNote(note.id, { content });
  };

  // Main Quiz Title / Desc updates (debounced)
  const handleChangeTitle = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setLocalTitle(val);
    triggerMetaSave();
  };

  const handleChangeDescription = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setLocalDescription(val);
    triggerMetaSave();
  };

  const triggerMetaSave = () => {
    if (metaDebounceRef.current) {
      clearTimeout(metaDebounceRef.current);
    }
    metaDebounceRef.current = setTimeout(() => {
      saveMetaForcefully();
    }, 500);
  };

  const handleBlurMeta = () => {
    if (metaDebounceRef.current) {
      clearTimeout(metaDebounceRef.current);
    }
    saveMetaForcefully();
  };

  // ponytail: show the initialization screen if the quiz has no questions.
  if (!quiz || !quiz.questions || quiz.questions.length === 0) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        padding: '2.5rem',
        textAlign: 'center',
        background: 'var(--bg-editor)'
      }}>
        <div style={{
          width: '64px',
          height: '64px',
          background: 'rgba(79, 70, 229, 0.1)',
          color: 'var(--brand-primary)',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '1.5rem',
          border: '1px solid var(--border-color)'
        }}>
          <HelpCircle size={32} />
        </div>

        <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.75rem', color: 'var(--text-primary)', marginBottom: '8px' }}>
          建立選擇題測驗
        </h2>
        
        <p style={{ color: 'var(--text-secondary)', fontSize: '14px', maxWidth: '440px', lineHeight: '1.6', marginBottom: '2rem' }}>
          本頁面尚未初始化為測驗。點擊下方按鈕以快速建立一個新測驗，或直接匯入 JSON/TOML 格式的題庫。
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '100%', maxWidth: '300px' }}>
          {!readOnly && (
            <>
              <button onClick={handleInitialize} className="hover-scale" style={{ ...btnBaseStyle, background: 'var(--brand-primary)', color: '#ffffff' }}>
                <Plus size={15} />
                <span>建立空白測驗</span>
              </button>
              <button onClick={() => fileInputRef.current?.click()} className="hover-scale" style={{ ...btnBaseStyle, border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}>
                <Upload size={15} />
                <span>匯入題庫檔案 (.json / .toml)</span>
              </button>
            </>
          )}
          <button onClick={handleLoadExample} className="hover-scale" style={{ ...btnBaseStyle, background: 'rgba(219, 39, 119, 0.1)', color: 'var(--brand-secondary)', border: '1px solid rgba(219, 39, 119, 0.3)' }}>
            <Play size={15} />
            <span>載入觀念範例測驗</span>
          </button>
        </div>

        <input ref={fileInputRef} type="file" accept=".json,.toml" onChange={handleFileUpload} style={{ display: 'none' }} />
      </div>
    );
  }

  const activeQuestion = quiz.questions[currentIdx];
  const correctCount = results.filter(Boolean).length;
  const scorePct = quiz.questions.length > 0 ? Math.round((correctCount / quiz.questions.length) * 100) : 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', background: 'var(--bg-editor)' }}>
      {/* Header bar */}
      <div style={{
        padding: '12px 24px',
        borderBottom: '1px solid var(--border-color)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: 'rgba(255, 255, 255, 0.01)',
        flexShrink: 0
      }}>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)' }}>
            {quiz.title}
          </h3>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
            語法：{currentFormat.toUpperCase()} | 共 {quiz.questions.length} 題
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {!readOnly && (
            <div style={{
              display: 'flex',
              background: 'var(--bg-input)',
              padding: '2px',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-color)',
              marginRight: '12px'
            }}>
              <button
                onClick={() => setTab('play')}
                style={{
                  ...tabBtnStyle,
                  color: tab === 'play' ? 'var(--text-primary)' : 'var(--text-muted)',
                  background: tab === 'play' ? 'rgba(255, 255, 255, 0.08)' : 'transparent'
                }}
              >
                <Play size={12} />
                <span>進行測驗</span>
              </button>
              <button
                onClick={() => setTab('edit')}
                style={{
                  ...tabBtnStyle,
                  color: tab === 'edit' ? 'var(--text-primary)' : 'var(--text-muted)',
                  background: tab === 'edit' ? 'rgba(255, 255, 255, 0.08)' : 'transparent'
                }}
              >
                <Edit3 size={12} />
                <span>題目管理</span>
              </button>
            </div>
          )}

          {/* Export formats */}
          <button onClick={() => handleExport('json')} title="下載 JSON 格式" style={{ ...iconBtnStyle, fontSize: '10px', fontWeight: 700 }}>JSON</button>
          <button onClick={() => handleExport('toml')} title="下載 TOML 格式" style={{ ...iconBtnStyle, fontSize: '10px', fontWeight: 700 }}>TOML</button>
          {!readOnly && (
            <button onClick={() => fileInputRef.current?.click()} title="匯入題庫" style={iconBtnStyle}><Upload size={14} /></button>
          )}

          {/* Share Dropdown Button */}
          {!readOnly && (
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <button
                onClick={() => setShowShareDropdown(!showShareDropdown)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 12px',
                  background: note.isPublished ? 'rgba(16, 185, 129, 0.12)' : 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid ' + (note.isPublished ? 'var(--accent-success)' : 'var(--border-color)'),
                  borderRadius: 'var(--radius-md)',
                  color: note.isPublished ? 'var(--accent-success)' : 'var(--text-primary)',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all var(--transition-fast)'
                }}
              >
                <Share2 size={13} />
                <span>{note.isPublished ? '已分享' : '分享'}</span>
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
                    <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', textAlign: 'left' }}>
                      分享設定
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                        <span style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--text-secondary)' }}>發布至廣場</span>
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>發布後其他人即可檢閱與答題</span>
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
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                          <span style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--text-secondary)' }}>隱私權限</span>
                          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{note.isPublic ? '公開（所有人可見）' : '連結限定（不列於廣場）'}</span>
                        </div>
                        <button
                          onClick={() => updateNote(note.id, { isPublic: !note.isPublic })}
                          style={{
                            padding: '4px 8px',
                            borderRadius: 'var(--radius-sm)',
                            border: '1px solid var(--border-color)',
                            fontSize: '11px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            color: 'var(--text-secondary)',
                            background: 'transparent',
                            cursor: 'pointer'
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
                          const dummyUrl = window.location.origin + `/reader/${note.id}`;
                          navigator.clipboard.writeText(dummyUrl);
                          alert('已複製測驗連結至剪貼簿！');
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
                          cursor: 'pointer',
                          border: 'none'
                        }}
                      >
                        複製分享連結
                      </button>
                    )}

                    {/* Share with users */}
                    <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <div style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--text-secondary)', textAlign: 'left' }}>
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
                                    `分享了線上測驗：《${note.title}》`,
                                    `我與你分享了一個線上測驗，請點擊下方匯入！`,
                                    note.id,
                                    {
                                      title: note.title,
                                      type: 'quiz',
                                      content: note.content,
                                      icon: note.icon,
                                      coverImage: note.coverImage
                                    }
                                  );
                                  alert('已成功傳送線上測驗附件信件！');
                                  setShowShareDropdown(false);
                                } catch (err: any) {
                                  console.error('Send quiz failed:', err);
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
          )}
        </div>

        <input ref={fileInputRef} type="file" accept=".json,.toml" onChange={handleFileUpload} style={{ display: 'none' }} />
      </div>

      {/* Main viewport */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
        
        {/* ================= PLAY MODE ================= */}
        {tab === 'play' && (
          <div style={{ maxWidth: '600px', margin: '0 auto' }}>
            {!quizStarted && !quizFinished && (
              <div className="glass-panel" style={{ padding: '32px', borderRadius: 'var(--radius-lg)', textAlign: 'center', boxShadow: 'var(--shadow-md)', marginTop: '2rem' }}>
                <h2 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '12px' }}>{quiz.title}</h2>
                <p style={{ fontSize: '13.5px', color: 'var(--text-secondary)', lineHeight: '1.6', marginBottom: '24px' }}>{quiz.description}</p>
                <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', flexWrap: 'wrap' }}>
                  <button onClick={() => setQuizStarted(true)} className="hover-scale" style={{ padding: '12px 28px', background: 'var(--brand-primary)', color: '#ffffff', borderRadius: 'var(--radius-md)', fontWeight: 600, fontSize: '14px', display: 'inline-flex', alignItems: 'center', gap: '8px', cursor: 'pointer', border: 'none' }}>
                    <Play size={15} fill="#ffffff" />
                    <span>開始測驗挑戰</span>
                  </button>
                  {!readOnly && (
                    <button onClick={() => setTab('edit')} className="hover-scale" style={{ padding: '12px 28px', border: '1px solid var(--border-color)', color: 'var(--text-primary)', background: 'transparent', borderRadius: 'var(--radius-md)', fontWeight: 600, fontSize: '14px', display: 'inline-flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                      <Edit3 size={15} />
                      <span>編輯測驗題目</span>
                    </button>
                  )}
                </div>

                {/* Start Screen Stats Chart */}
                {quiz.questions.some(q => (q.attempts || 0) > 0) && (
                  <div style={{ marginTop: '28px', borderTop: '1px solid var(--border-color)', paddingTop: '20px', textAlign: 'left' }}>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span>📊</span>
                      <span>各題錯誤率與挑戰熱度統計</span>
                    </div>
                    <div style={{ height: '180px', position: 'relative' }}>
                      <canvas ref={startChartRef} style={{ position: 'absolute', left: 0, top: 0, width: '100%', height: '100%' }} />
                    </div>
                  </div>
                )}
              </div>
            )}

            {quizStarted && !quizFinished && activeQuestion && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                    <span>問題 {currentIdx + 1} / {quiz.questions.length}</span>
                    <span>答對率: {currentIdx > 0 ? Math.round((correctCount / currentIdx) * 100) : 0}%</span>
                  </div>
                  <div style={{ width: '100%', height: '4px', background: 'var(--border-color)', borderRadius: '2px' }}>
                    <div style={{ width: `${((currentIdx + 1) / quiz.questions.length) * 100}%`, height: '100%', background: 'var(--brand-primary)', borderRadius: '2px', transition: 'width var(--transition-normal)' }} />
                  </div>
                </div>

                <div className="glass-panel" style={{ padding: '24px', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-md)' }}>
                  <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', lineHeight: '1.5', marginBottom: '20px' }}>
                    {activeQuestion.question}
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {activeQuestion.options.map((opt, oIdx) => {
                      const isSelected = selectedOption === oIdx;
                      const isCorrect = oIdx === activeQuestion.answer;
                      const answered = selectedOption !== null;
                      let bg = 'rgba(255, 255, 255, 0.02)';
                      let border = 'var(--border-color)';
                      let icon = null;

                      if (answered) {
                        if (isCorrect) {
                          bg = 'rgba(5, 150, 105, 0.08)';
                          border = 'var(--accent-success)';
                          icon = <CheckCircle2 size={16} style={{ color: 'var(--accent-success)' }} />;
                        } else if (isSelected) {
                          bg = 'rgba(220, 38, 38, 0.08)';
                          border = 'var(--accent-error)';
                          icon = <XCircle size={16} style={{ color: 'var(--accent-error)' }} />;
                        }
                      }

                      return (
                        <button
                          key={oIdx}
                          onClick={() => handleAnswerSelect(oIdx, activeQuestion.answer)}
                          disabled={answered}
                          style={{
                            width: '100%',
                            padding: '12px 16px',
                            borderRadius: 'var(--radius-md)',
                            background: bg,
                            border: `1px solid ${border}`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            cursor: answered ? 'default' : 'pointer',
                            fontSize: '13px',
                            color: 'var(--text-primary)'
                          }}
                          className="hover-scale"
                        >
                          <span>{String.fromCharCode(65 + oIdx)}. {opt}</span>
                          {icon}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {selectedOption !== null && (
                  <div className="glass-panel" style={{ padding: '16px 20px', borderRadius: 'var(--radius-md)', borderLeft: `4px solid ${selectedOption === activeQuestion.answer ? 'var(--accent-success)' : 'var(--accent-error)'}` }}>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>
                      {selectedOption === activeQuestion.answer ? '🎉 回答正確！' : '❌ 回答錯誤！'}
                    </div>
                    <p style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                      {activeQuestion.explanation || '本題無說明解析。'}
                    </p>
                  </div>
                )}

                {selectedOption !== null && (
                  <button onClick={handleNext} className="hover-scale" style={{ alignSelf: 'flex-end', padding: '10px 20px', background: 'var(--brand-primary)', color: '#ffffff', borderRadius: 'var(--radius-md)', fontWeight: 600, fontSize: '12.5px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span>{currentIdx < quiz.questions.length - 1 ? '下一題' : '完成測驗'}</span>
                    <ArrowRight size={14} />
                  </button>
                )}
              </div>
            )}

            {quizFinished && (
              <div className="glass-panel" style={{ padding: '40px 32px', borderRadius: 'var(--radius-lg)', textAlign: 'center', boxShadow: 'var(--shadow-lg)', marginTop: '2rem' }}>
                <span style={{ fontSize: '48px' }}>{scorePct >= 75 ? '🏆' : '💪'}</span>
                <h2 style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-primary)', marginTop: '12px' }}>測驗挑戰完成！</h2>
                <div style={{ margin: '20px 0' }}>
                  <div style={{ fontSize: '40px', fontWeight: 800, color: scorePct >= 70 ? 'var(--accent-success)' : 'var(--text-primary)', fontFamily: 'var(--font-display)' }}>
                    {scorePct}%
                  </div>
                  <div style={{ fontSize: '12.5px', color: 'var(--text-muted)' }}>
                    答對 {correctCount} 題 / 共 {quiz.questions.length} 題
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', flexWrap: 'wrap', marginBottom: '24px' }}>
                  <button onClick={handleResetQuiz} className="hover-scale" style={{ padding: '10px 20px', border: '1px solid var(--border-color)', color: 'var(--text-primary)', background: 'transparent', borderRadius: 'var(--radius-md)', fontWeight: 600, fontSize: '12.5px', display: 'inline-flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                    <RefreshCw size={13} />
                    <span>重新挑戰</span>
                  </button>
                  {!readOnly && (
                    <button onClick={() => setTab('edit')} className="hover-scale" style={{ padding: '10px 20px', background: 'var(--brand-primary)', color: '#ffffff', border: 'none', borderRadius: 'var(--radius-md)', fontWeight: 600, fontSize: '12.5px', display: 'inline-flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                      <Edit3 size={13} />
                      <span>編輯測驗題目</span>
                    </button>
                  )}
                </div>

                {/* Chart.js stats visualizations */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginTop: '28px', borderTop: '1px solid var(--border-color)', paddingTop: '24px' }}>
                  <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', textAlign: 'left', margin: 0 }}>📊 答題結果統計</h3>
                  <div style={{ display: 'flex', flexDirection: 'row', gap: '16px', flexWrap: 'wrap' }}>
                    
                    {/* Doughnut Chart Container */}
                    <div className="glass-panel" style={{ flex: '1 1 200px', padding: '16px', borderRadius: 'var(--radius-md)', height: '220px', display: 'flex', flexDirection: 'column', gap: '8px', minWidth: '200px' }}>
                      <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', textAlign: 'left' }}>本次挑戰結果</div>
                      <div style={{ flex: 1, position: 'relative' }}>
                        <canvas ref={sessionChartRef} style={{ position: 'absolute', left: 0, top: 0, width: '100%', height: '100%' }} />
                      </div>
                    </div>

                    {/* Bar Chart Container */}
                    <div className="glass-panel" style={{ flex: '2 1 300px', padding: '16px', borderRadius: 'var(--radius-md)', height: '220px', display: 'flex', flexDirection: 'column', gap: '8px', minWidth: '280px' }}>
                      <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', textAlign: 'left' }}>歷史累計錯誤率與挑戰熱度</div>
                      <div style={{ flex: 1, position: 'relative' }}>
                        <canvas ref={errorRateChartRef} style={{ position: 'absolute', left: 0, top: 0, width: '100%', height: '100%' }} />
                      </div>
                    </div>

                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ================= EDIT MODE (Visual list, details edit in modal) ================= */}
        {tab === 'edit' && !readOnly && (
          <div style={{ maxWidth: '720px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            
            {/* Cumulative Statistics Panel */}
            {quiz && quiz.questions.some(q => (q.attempts || 0) > 0) && (
              <div className="glass-panel" style={{ padding: '20px', borderRadius: 'var(--radius-md)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ fontSize: '12.5px', fontWeight: 700, color: 'var(--text-primary)', textAlign: 'left' }}>📊 測驗難度歷史統計 (編輯檢視)</div>
                <div style={{ height: '220px', position: 'relative' }}>
                  <canvas ref={editChartRef} style={{ position: 'absolute', left: 0, top: 0, width: '100%', height: '100%' }} />
                </div>
              </div>
            )}

            {/* Meta data */}
            <div className="glass-panel" style={{ padding: '20px', borderRadius: 'var(--radius-md)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ fontSize: '12.5px', fontWeight: 700, color: 'var(--text-primary)' }}>測驗基本說明</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={labelStyle}>測驗標題</label>
                <input 
                  type="text" 
                  value={localTitle} 
                  onChange={handleChangeTitle} 
                  onBlur={handleBlurMeta}
                  style={inputStyle} 
                  placeholder="請輸入測驗標題..." 
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={labelStyle}>測驗描述</label>
                <textarea 
                  value={localDescription} 
                  onChange={handleChangeDescription} 
                  onBlur={handleBlurMeta}
                  style={{ ...inputStyle, height: '60px', resize: 'vertical' }} 
                  placeholder="請輸入測驗描述..." 
                />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '6px' }}>
                <span style={labelStyle}>預設下載格式：</span>
                <div style={{ display: 'flex', gap: '4px' }}>
                  <button onClick={() => handleFormatChange('toml')} style={{ ...formatBadgeStyle, borderColor: currentFormat === 'toml' ? 'var(--brand-primary)' : 'var(--border-color)', background: currentFormat === 'toml' ? 'rgba(79,70,229,0.1)' : 'transparent', color: currentFormat === 'toml' ? 'var(--text-primary)' : 'var(--text-secondary)' }}>TOML</button>
                  <button onClick={() => handleFormatChange('json')} style={{ ...formatBadgeStyle, borderColor: currentFormat === 'json' ? 'var(--brand-primary)' : 'var(--border-color)', background: currentFormat === 'json' ? 'rgba(79,70,229,0.1)' : 'transparent', color: currentFormat === 'json' ? 'var(--text-primary)' : 'var(--text-secondary)' }}>JSON</button>
                </div>
              </div>
            </div>

            {/* Question outline list */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>問題列表 (共 {quiz.questions.length} 題)</span>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button onClick={() => openQuestionModal(null)} style={{ padding: '5px 10px', background: 'var(--brand-primary)', color: '#ffffff', borderRadius: 'var(--radius-sm)', fontSize: '11px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', border: 'none' }}>
                    <Plus size={11} />
                    <span>新增題目</span>
                  </button>
                  <button onClick={() => setAiModalOpen(true)} style={{ padding: '5px 10px', background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)', color: '#ffffff', borderRadius: 'var(--radius-sm)', fontSize: '11px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', border: 'none' }}>
                    <Sparkles size={11} />
                    <span>AI 增題</span>
                  </button>
                  <button onClick={() => setTextImportModalOpen(true)} style={{ padding: '5px 10px', background: 'var(--bg-input)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', borderRadius: 'var(--radius-sm)', fontSize: '11px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
                    <FileText size={11} />
                    <span>文字增題</span>
                  </button>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {quiz.questions.map((q, idx) => (
                  <div key={q.id || idx} className="glass-panel" style={{ padding: '14px 18px', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', transition: 'border-color var(--transition-fast)' }} onMouseEnter={(e)=>e.currentTarget.style.borderColor='var(--text-secondary)'} onMouseLeave={(e)=>e.currentTarget.style.borderColor='var(--border-color)'}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: 0 }}>
                      <span style={{ width: '22px', height: '22px', borderRadius: '50%', background: 'var(--bg-input)', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', fontSize: '11.5px', fontWeight: 700, color: 'var(--text-secondary)', flexShrink: 0, justifyContent: 'center' }}>{idx + 1}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{q.question}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>選項數: {q.options.length} | 正解: 選項 {String.fromCharCode(65 + q.answer)}</div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', marginLeft: '12px' }}>
                      <button onClick={() => openQuestionModal(idx)} style={{ fontSize: '12px', color: 'var(--brand-primary)', fontWeight: 600 }}>編輯</button>
                      <button onClick={() => handleDeleteQuestion(idx)} style={{ fontSize: '12px', color: 'var(--text-muted)' }} onMouseEnter={(e)=>e.currentTarget.style.color='var(--accent-error)'} onMouseLeave={(e)=>e.currentTarget.style.color='var(--text-muted)'}>刪除</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ================= QUESTION DETAIL EDITOR MODAL ================= */}
      {modalOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(9, 11, 16, 0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px',
          animation: 'fadeIn 0.2s ease'
        }}>
          <div className="glass-panel" style={{
            width: '100%',
            maxWidth: '560px',
            borderRadius: 'var(--radius-lg)',
            boxShadow: 'var(--shadow-lg)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            maxHeight: '90vh'
          }}>
            {/* Modal Header */}
            <div style={{
              padding: '16px 20px',
              borderBottom: '1px solid var(--border-color)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: 'rgba(255,255,255,0.01)'
            }}>
              <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>
                {editingQIdx === null ? '新增測驗題目' : `編輯第 ${editingQIdx + 1} 題`}
              </span>
              <button onClick={() => setModalOpen(false)} style={{ color: 'var(--text-muted)', cursor: 'pointer' }} onMouseEnter={(e)=>e.currentTarget.style.color='var(--text-primary)'} onMouseLeave={(e)=>e.currentTarget.style.color='var(--text-muted)'}>
                <X size={16} />
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              
              {/* Question Text */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={labelStyle}>問題敘述</label>
                <input
                  type="text"
                  value={modalQuestion}
                  onChange={(e) => setModalQuestion(e.target.value)}
                  placeholder="請輸入題目問題..."
                  style={inputStyle}
                />
              </div>

              {/* Options */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={labelStyle}>選項內容 (請勾選正確答案的單選框)</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {modalOptions.map((opt, oIdx) => (
                    <div key={oIdx} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <input
                        type="radio"
                        name="modal-correct-idx"
                        checked={modalAnswer === oIdx}
                        onChange={() => setModalAnswer(oIdx)}
                        style={{ cursor: 'pointer', accentColor: 'var(--brand-primary)' }}
                      />
                      <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', width: '15px' }}>{String.fromCharCode(65 + oIdx)}</span>
                      <input
                        type="text"
                        value={opt}
                        onChange={(e) => {
                          const next = [...modalOptions];
                          next[oIdx] = e.target.value;
                          setModalOptions(next);
                        }}
                        placeholder={`輸入選項 ${String.fromCharCode(65 + oIdx)}...`}
                        style={{ ...inputStyle, flex: 1 }}
                      />
                      {modalOptions.length > 2 && (
                        <button
                          onClick={() => {
                            const next = modalOptions.filter((_, idx) => idx !== oIdx);
                            let nextAns = modalAnswer;
                            if (nextAns === oIdx) nextAns = 0;
                            else if (nextAns > oIdx) nextAns -= 1;
                            setModalOptions(next);
                            setModalAnswer(nextAns);
                          }}
                          style={{ color: 'var(--text-muted)' }}
                          onMouseEnter={(e)=>e.currentTarget.style.color='var(--accent-error)'}
                          onMouseLeave={(e)=>e.currentTarget.style.color='var(--text-muted)'}
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                {/* Add Option */}
                {modalOptions.length < 6 && (
                  <button
                    onClick={() => setModalOptions([...modalOptions, ''])}
                    style={{
                      alignSelf: 'flex-start',
                      fontSize: '11px',
                      color: 'var(--brand-primary)',
                      fontWeight: 600,
                      marginTop: '4px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    <Plus size={10} />
                    <span>新增選項</span>
                  </button>
                )}
              </div>

              {/* Explanation */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={labelStyle}>解答說明 (解析)</label>
                <textarea
                  value={modalExplanation}
                  onChange={(e) => setModalExplanation(e.target.value)}
                  placeholder="輸入正確答案的觀念解析說明..."
                  style={{ ...inputStyle, height: '60px', resize: 'vertical' }}
                />
              </div>

            </div>

            {/* Modal Footer */}
            <div style={{
              padding: '16px 20px',
              borderTop: '1px solid var(--border-color)',
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '10px',
              background: 'rgba(255,255,255,0.01)'
            }}>
              <button
                onClick={() => setModalOpen(false)}
                style={{
                  padding: '8px 16px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-color)',
                  fontSize: '12.5px',
                  color: 'var(--text-primary)'
                }}
              >
                取消
              </button>
              <button
                onClick={handleSaveQuestion}
                style={{
                  padding: '8px 16px',
                  borderRadius: 'var(--radius-sm)',
                  background: 'var(--brand-primary)',
                  fontSize: '12.5px',
                  color: '#ffffff',
                  fontWeight: 600
                }}
              >
                儲存題目
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= AI GENERATION MODAL ================= */}
      {aiModalOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(9, 11, 16, 0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px',
          animation: 'fadeIn 0.2s ease'
        }}>
          <div className="glass-panel" style={{
            width: '100%',
            maxWidth: '560px',
            borderRadius: 'var(--radius-lg)',
            boxShadow: 'var(--shadow-lg)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            maxHeight: '90vh'
          }}>
            {/* Modal Header */}
            <div style={{
              padding: '16px 20px',
              borderBottom: '1px solid var(--border-color)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: 'rgba(255,255,255,0.01)'
            }}>
              <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Sparkles size={16} style={{ color: 'var(--brand-primary)' }} />
                <span>🤖 AI 智慧出題輔助</span>
              </span>
              <button 
                onClick={() => !aiLoading && setAiModalOpen(false)} 
                disabled={aiLoading}
                style={{ color: 'var(--text-muted)', cursor: aiLoading ? 'default' : 'pointer', border: 'none', background: 'transparent' }}
                onMouseEnter={(e)=>!aiLoading && (e.currentTarget.style.color='var(--text-primary)')}
                onMouseLeave={(e)=>!aiLoading && (e.currentTarget.style.color='var(--text-muted)')}
              >
                <X size={16} />
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              
              {/* API Key setting */}
              <div className="glass-panel" style={{ padding: '12px 14px', borderRadius: 'var(--radius-md)', display: 'flex', flexDirection: 'column', gap: '10px', background: 'rgba(255,255,255,0.01)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label style={labelStyle}>OpenRouter API 設定</label>
                  <a href="https://openrouter.ai/keys" target="_blank" rel="noopener noreferrer" style={{ fontSize: '10px', color: 'var(--brand-primary)', textDecoration: 'none' }}>獲取金鑰 ↗</a>
                </div>
                <input
                  type="password"
                  value={aiApiKey}
                  onChange={(e) => setAiApiKey(e.target.value)}
                  placeholder="請貼上您的 OpenRouter API 金鑰 (sk-or-...)"
                  style={inputStyle}
                  disabled={aiLoading}
                />
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ ...labelStyle, whiteSpace: 'nowrap' }}>選擇模型：</span>
                  <select
                    value={aiModel}
                    onChange={(e) => setAiModel(e.target.value)}
                    style={{ ...inputStyle, padding: '4px 8px', fontSize: '12px' }}
                    disabled={aiLoading}
                  >
                    <option value="google/gemini-2.5-flash">Gemini 2.5 Flash (極低成本/推薦)</option>
                    <option value="meta-llama/llama-3-8b-instruct:free">Llama 3 8B (免費)</option>
                    <option value="google/gemma-2-9b-it:free">Gemma 2 9B (免費)</option>
                    <option value="qwen/qwen-2-7b-instruct:free">Qwen 2 7B (免費)</option>
                    <option value="mistralai/mistral-7b-instruct:free">Mistral 7B (免費)</option>
                  </select>
                </div>
              </div>

              {/* Quiz Generation Settings */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <label style={labelStyle}>出題來源方式</label>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: 'var(--text-primary)', cursor: 'pointer' }}>
                    <input
                      type="radio"
                      name="ai-source-type"
                      checked={aiSource === 'topic'}
                      onChange={() => setAiSource('topic')}
                      disabled={aiLoading}
                      style={{ accentColor: 'var(--brand-primary)' }}
                    />
                    <span>根據主題/關鍵字</span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: 'var(--text-primary)', cursor: 'pointer' }}>
                    <input
                      type="radio"
                      name="ai-source-type"
                      checked={aiSource === 'note'}
                      onChange={() => setAiSource('note')}
                      disabled={aiLoading}
                      style={{ accentColor: 'var(--brand-primary)' }}
                    />
                    <span>讀取我的筆記內容</span>
                  </label>
                </div>

                {aiSource === 'topic' ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={labelStyle}>出題主題或關鍵字</label>
                    <input
                      type="text"
                      value={aiTopic}
                      onChange={(e) => setAiTopic(e.target.value)}
                      placeholder="例如：JavaScript 閉包 (Closure)、線性代數矩陣運算"
                      style={inputStyle}
                      disabled={aiLoading}
                    />
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={labelStyle}>選擇出題筆記</label>
                    {(() => {
                      const userNotes = notes.filter(n => (n.type === 'note' || !n.type) && !n.isTrash);
                      return userNotes.length > 0 ? (
                        <select
                          value={aiSelectedNoteId}
                          onChange={(e) => setAiSelectedNoteId(e.target.value)}
                          style={inputStyle}
                          disabled={aiLoading}
                        >
                          <option value="">-- 請選擇一項筆記 --</option>
                          {userNotes.map(n => (
                            <option key={n.id} value={n.id}>{n.title || '未命名頁面'}</option>
                          ))}
                        </select>
                      ) : (
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)', padding: '6px 0' }}>
                          目前尚無任何筆記可供選擇，請先在左側建立一般筆記。
                        </div>
                      );
                    })()}
                  </div>
                )}

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <label style={{ ...labelStyle, whiteSpace: 'nowrap' }}>出題題數：</label>
                  <select
                    value={aiNumQuestions}
                    onChange={(e) => setAiNumQuestions(Number(e.target.value))}
                    style={{ ...inputStyle, width: '80px', padding: '4px 8px' }}
                    disabled={aiLoading}
                  >
                    <option value={3}>3 題</option>
                    <option value={5}>5 題</option>
                    <option value={10}>10 題</option>
                  </select>
                </div>
              </div>

            </div>

            {/* Modal Footer */}
            <div style={{
              padding: '16px 20px',
              borderTop: '1px solid var(--border-color)',
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '10px',
              background: 'rgba(255,255,255,0.01)'
            }}>
              <button
                onClick={() => setAiModalOpen(false)}
                disabled={aiLoading}
                style={{
                  padding: '8px 16px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-color)',
                  fontSize: '12.5px',
                  color: 'var(--text-primary)',
                  background: 'transparent',
                  cursor: aiLoading ? 'default' : 'pointer'
                }}
              >
                取消
              </button>
              <button
                onClick={handleAiGenerateQuiz}
                disabled={aiLoading}
                style={{
                  padding: '8px 16px',
                  borderRadius: 'var(--radius-sm)',
                  background: 'var(--brand-primary)',
                  fontSize: '12.5px',
                  color: '#ffffff',
                  fontWeight: 600,
                  cursor: aiLoading ? 'default' : 'pointer',
                  opacity: aiLoading ? 0.7 : 1,
                  border: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                {aiLoading ? (
                  <>
                    <RefreshCw size={13} className="spin" />
                    <span>AI 出題中...</span>
                  </>
                ) : (
                  <>
                    <Sparkles size={13} />
                    <span>開始 AI 出題</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= PLAIN TEXT IMPORT MODAL ================= */}
      {textImportModalOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(9, 11, 16, 0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px',
          animation: 'fadeIn 0.2s ease'
        }}>
          <div className="glass-panel" style={{
            width: '100%',
            maxWidth: '560px',
            borderRadius: 'var(--radius-lg)',
            boxShadow: 'var(--shadow-lg)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            maxHeight: '90vh'
          }}>
            {/* Modal Header */}
            <div style={{
              padding: '16px 20px',
              borderBottom: '1px solid var(--border-color)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: 'rgba(255,255,255,0.01)'
            }}>
              <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <FileText size={16} style={{ color: 'var(--brand-primary)' }} />
                <span>📝 純文字題目貼上匯入</span>
              </span>
              <button 
                onClick={() => setTextImportModalOpen(false)} 
                style={{ color: 'var(--text-muted)', cursor: 'pointer', border: 'none', background: 'transparent' }}
                onMouseEnter={(e)=>(e.currentTarget.style.color='var(--text-primary)')}
                onMouseLeave={(e)=>(e.currentTarget.style.color='var(--text-muted)')}
              >
                <X size={16} />
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={labelStyle}>貼上題目文字</label>
                <textarea
                  value={rawImportText}
                  onChange={(e) => setRawImportText(e.target.value)}
                  placeholder="請貼上符合規範的題目純文字..."
                  style={{ ...inputStyle, height: '180px', fontFamily: 'monospace', resize: 'vertical' }}
                />
              </div>

              {/* Format description */}
              <div className="glass-panel" style={{ padding: '12px 14px', borderRadius: 'var(--radius-md)', background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-color)' }}>
                <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '6px' }}>💡 支援的文字格式範例（題目間請空一行）：</div>
                <pre style={{ margin: 0, fontSize: '10.5px', color: 'var(--text-muted)', lineHeight: '1.5', fontFamily: 'monospace', whiteSpace: 'pre-wrap' }}>
{`1. 哪一個程式語言主要用於網頁前端開發？
A. Python
B. Java
C. JavaScript
D. C++
答案：C
解析：JavaScript 可以在瀏覽器中直接運行，是網頁前端的核心語言。

2. 請問 2 + 2 等於多少？
A) 3
B) 4
答案：B`}
                </pre>
              </div>

            </div>

            {/* Modal Footer */}
            <div style={{
              padding: '16px 20px',
              borderTop: '1px solid var(--border-color)',
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '10px',
              background: 'rgba(255,255,255,0.01)'
            }}>
              <button
                onClick={() => setTextImportModalOpen(false)}
                style={{
                  padding: '8px 16px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-color)',
                  fontSize: '12.5px',
                  color: 'var(--text-primary)',
                  background: 'transparent',
                  cursor: 'pointer'
                }}
              >
                取消
              </button>
              <button
                onClick={handleTextImportQuiz}
                style={{
                  padding: '8px 16px',
                  borderRadius: 'var(--radius-sm)',
                  background: 'var(--brand-primary)',
                  fontSize: '12.5px',
                  color: '#ffffff',
                  fontWeight: 600,
                  cursor: 'pointer',
                  border: 'none'
                }}
              >
                解析並匯入
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Styles
const tabBtnStyle: React.CSSProperties = {
  padding: '4px 10px',
  borderRadius: 'var(--radius-sm)',
  fontSize: '11.5px',
  fontWeight: 600,
  display: 'flex',
  alignItems: 'center',
  gap: '4px',
  transition: 'background var(--transition-fast)'
};

const iconBtnStyle: React.CSSProperties = {
  width: '32px',
  height: '28px',
  borderRadius: 'var(--radius-sm)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: 'var(--text-secondary)',
  cursor: 'pointer',
  border: '1px solid var(--border-color)',
  background: 'var(--bg-input)',
  transition: 'background var(--transition-fast)'
};

const btnBaseStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px',
  borderRadius: 'var(--radius-md)',
  fontSize: '13.5px',
  fontWeight: 600,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '8px',
  cursor: 'pointer',
  transition: 'all var(--transition-fast)'
};

const labelStyle: React.CSSProperties = {
  fontSize: '11px',
  fontWeight: 700,
  color: 'var(--text-secondary)',
  textTransform: 'uppercase',
  letterSpacing: '0.5px'
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '8px 12px',
  background: 'var(--bg-input)',
  border: '1px solid var(--border-color)',
  borderRadius: 'var(--radius-sm)',
  color: 'var(--text-primary)',
  fontSize: '13px',
  outline: 'none',
  transition: 'border-color var(--transition-fast)'
};

const formatBadgeStyle: React.CSSProperties = {
  padding: '3px 8px',
  borderRadius: 'var(--radius-sm)',
  fontSize: '10px',
  fontWeight: 700,
  border: '1px solid var(--border-color)',
  cursor: 'pointer',
  transition: 'all var(--transition-fast)'
};
