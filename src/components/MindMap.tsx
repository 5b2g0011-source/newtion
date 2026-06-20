import React, { useState, useRef, useEffect, useMemo } from 'react';
import type { Note, GraphNode, GraphEdge, GraphData, DragNode } from '../types';
import { useApp } from '../context/AppContext';
import { 
  ZoomIn, ZoomOut, RotateCcw, Maximize2, Download, 
  Trash2, Link, X, Share2, Globe, Lock, LayoutTemplate, ChevronDown
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { collection, doc, setDoc, deleteDoc, onSnapshot, query, where } from 'firebase/firestore';
import { db as firestore, isFirebaseConfigured } from '../firebase';
import type { Presence } from '../types';

const CURSOR_COLORS = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#06b6d4', '#14b8a6'];
const getUserColor = (userId: string) => {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = userId.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % CURSOR_COLORS.length;
  return CURSOR_COLORS[index];
};

interface MindMapProps {
  note: Note;
  readOnly?: boolean;
}

// Beautiful color presets for nodes
const COLOR_PRESETS = [
  { value: '#6366f1', text: '#ffffff', name: '靛藍' },
  { value: '#10b981', text: '#ffffff', name: '翡翠' },
  { value: '#f43f5e', text: '#ffffff', name: '玫瑰' },
  { value: '#f59e0b', text: '#0f172a', name: '琥珀' },
  { value: '#06b6d4', text: '#0f172a', name: '青綠' },
  { value: '#a855f7', text: '#ffffff', name: '紫羅蘭' },
  { value: '#64748b', text: '#ffffff', name: '石板灰' }
];

const getTextColor = (bgColor: string) => {
  const preset = COLOR_PRESETS.find(p => p.value === bgColor);
  return preset ? preset.text : '#ffffff';
};

// Tree-to-Graph migration helper
function convertTreeToGraph(root: DragNode): GraphData {
  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];

  function visit(node: DragNode, parentId: string | null) {
    nodes.push({
      id: node.id,
      name: node.name,
      x: node.x,
      y: node.y,
      width: 150,
      height: 40,
      color: '#6366f1',
      shape: 'rounded-rect'
    });

    if (parentId) {
      edges.push({
        id: `edge-${parentId}-${node.id}-${Math.random().toString(36).substr(2, 5)}`,
        source: parentId,
        target: node.id
      });
    }

    if (node.children) {
      node.children.forEach(c => visit(c, node.id));
    }
  }

  visit(root, null);
  return { nodes, edges };
}

interface DiagramTemplate {
  name: string;
  description: string;
  nodes: GraphNode[];
  edges: GraphEdge[];
}

const DIAGRAM_TEMPLATES: DiagramTemplate[] = [
  {
    name: 'SWOT 分析模板',
    description: '分析優勢、劣勢、機會與威脅',
    nodes: [
      { id: 'root', name: 'SWOT 分析', x: 0, y: 0, width: 160, height: 48, color: '#6366f1', shape: 'rounded-rect', fontSize: 13 },
      { id: 'strengths', name: '優勢 (Strengths)\n如: 專利、品牌、人才', x: -220, y: -100, width: 160, height: 50, color: '#10b981', shape: 'rect', fontSize: 12 },
      { id: 'weaknesses', name: '劣勢 (Weaknesses)\n如: 資金不足、通路有限', x: 220, y: -100, width: 160, height: 50, color: '#f43f5e', shape: 'rect', fontSize: 12 },
      { id: 'opportunities', name: '機會 (Opportunities)\n如: 新市場、政策支持', x: -220, y: 100, width: 160, height: 50, color: '#06b6d4', shape: 'rect', fontSize: 12 },
      { id: 'threats', name: '威脅 (Threats)\n如: 強大對手、法規風險', x: 220, y: 100, width: 160, height: 50, color: '#f59e0b', shape: 'rect', fontSize: 12 },
    ],
    edges: [
      { id: 'e1', source: 'root', target: 'strengths' },
      { id: 'e2', source: 'root', target: 'weaknesses' },
      { id: 'e3', source: 'root', target: 'opportunities' },
      { id: 'e4', source: 'root', target: 'threats' },
    ]
  },
  {
    name: '專案啟動計畫',
    description: '專案目標、時程、分工與預算',
    nodes: [
      { id: 'root', name: '專案啟動計畫', x: 0, y: 0, width: 160, height: 48, color: '#a855f7', shape: 'rounded-rect', fontSize: 13 },
      { id: 'goals', name: '🎯 目標與範圍', x: -200, y: -90, width: 140, height: 44, color: '#6366f1', shape: 'ellipse', fontSize: 12 },
      { id: 'timeline', name: '📅 時程規劃', x: 200, y: -90, width: 140, height: 44, color: '#10b981', shape: 'ellipse', fontSize: 12 },
      { id: 'team', name: '👥 團隊與分工', x: -200, y: 90, width: 140, height: 44, color: '#f59e0b', shape: 'ellipse', fontSize: 12 },
      { id: 'budget', name: '💰 預算與資源', x: 200, y: 90, width: 140, height: 44, color: '#f43f5e', shape: 'ellipse', fontSize: 12 },
    ],
    edges: [
      { id: 'e1', source: 'root', target: 'goals' },
      { id: 'e2', source: 'root', target: 'timeline' },
      { id: 'e3', source: 'root', target: 'team' },
      { id: 'e4', source: 'root', target: 'budget' },
    ]
  },
  {
    name: '心智圖腦力激盪',
    description: '自由發想主題、想法與延伸',
    nodes: [
      { id: 'root', name: '腦力激盪主題', x: 0, y: 0, width: 160, height: 48, color: '#06b6d4', shape: 'rounded-rect', fontSize: 13 },
      { id: 'idea1', name: '想法 A', x: -180, y: -70, width: 120, height: 40, color: '#6366f1', shape: 'rounded-rect', fontSize: 12 },
      { id: 'idea1_sub1', name: '延伸點 A1', x: -310, y: -110, width: 100, height: 36, color: '#64748b', shape: 'rect', fontSize: 11 },
      { id: 'idea1_sub2', name: '延伸點 A2', x: -310, y: -30, width: 100, height: 36, color: '#64748b', shape: 'rect', fontSize: 11 },
      { id: 'idea2', name: '想法 B', x: 180, y: -70, width: 120, height: 40, color: '#10b981', shape: 'rounded-rect', fontSize: 12 },
      { id: 'idea2_sub1', name: '延伸點 B1', x: 310, y: -70, width: 100, height: 36, color: '#64748b', shape: 'rect', fontSize: 11 },
      { id: 'idea3', name: '想法 C', x: 0, y: 130, width: 120, height: 40, color: '#f59e0b', shape: 'rounded-rect', fontSize: 12 },
    ],
    edges: [
      { id: 'e1', source: 'root', target: 'idea1' },
      { id: 'e2', source: 'idea1', target: 'idea1_sub1' },
      { id: 'e3', source: 'idea1', target: 'idea1_sub2' },
      { id: 'e4', source: 'root', target: 'idea2' },
      { id: 'e5', source: 'idea2', target: 'idea2_sub1' },
      { id: 'e6', source: 'root', target: 'idea3' },
    ]
  },
  {
    name: '5W1H 分析模板',
    description: '核心主題多維度結構化拆解',
    nodes: [
      { id: 'root', name: '5W1H 核心分析主題', x: 0, y: 0, width: 180, height: 50, color: '#0f172a', shape: 'rounded-rect', fontSize: 13 },
      { id: 'what', name: '📝 What (要做什麼)\n核心內容與任務', x: -240, y: -100, width: 150, height: 46, color: '#3b82f6', shape: 'rect', fontSize: 12 },
      { id: 'why', name: '🎯 Why (為什麼做)\n動機與預期目標', x: 0, y: -120, width: 150, height: 46, color: '#ef4444', shape: 'rect', fontSize: 12 },
      { id: 'who', name: '👥 Who (由誰來做)\n負責人與利害關係人', x: 240, y: -100, width: 150, height: 46, color: '#10b981', shape: 'rect', fontSize: 12 },
      { id: 'when', name: '📅 When (何時進行)\n時程規劃與截止日', x: -240, y: 100, width: 150, height: 46, color: '#f59e0b', shape: 'rect', fontSize: 12 },
      { id: 'where', name: '📍 Where (在哪裡做)\n發佈管道與環境地點', x: 0, y: 120, width: 150, height: 46, color: '#8b5cf6', shape: 'rect', fontSize: 12 },
      { id: 'how', name: '🛠️ How (如何執行)\n執行步驟與方法流程', x: 240, y: 100, width: 150, height: 46, color: '#06b6d4', shape: 'rect', fontSize: 12 },
    ],
    edges: [
      { id: 'e_what', source: 'root', target: 'what' },
      { id: 'e_why', source: 'root', target: 'why' },
      { id: 'e_who', source: 'root', target: 'who' },
      { id: 'e_when', source: 'root', target: 'when' },
      { id: 'e_where', source: 'root', target: 'where' },
      { id: 'e_how', source: 'root', target: 'how' },
    ]
  },
  {
    name: '魚骨因果分析圖',
    description: '尋找根本原因 (人、機、料、法、環)',
    nodes: [
      { id: 'root', name: '🐟 核心待解決問題', x: 300, y: 0, width: 160, height: 50, color: '#ef4444', shape: 'diamond', fontSize: 13 },
      { id: 'backbone', name: '主要魚骨幹', x: -100, y: 0, width: 250, height: 10, color: '#64748b', shape: 'rect' },
      { id: 'people', name: '👥 人員 (People)', x: -200, y: -120, width: 140, height: 40, color: '#3b82f6', shape: 'rounded-rect', fontSize: 12 },
      { id: 'people_sub1', name: '技能訓練不足', x: -160, y: -60, width: 100, height: 32, color: '#94a3b8', shape: 'ellipse', fontSize: 10 },
      { id: 'process', name: '⚙️ 流程 (Process)', x: 0, y: -120, width: 140, height: 40, color: '#ec4899', shape: 'rounded-rect', fontSize: 12 },
      { id: 'process_sub1', name: 'SOP未標準化', x: 40, y: -60, width: 100, height: 32, color: '#94a3b8', shape: 'ellipse', fontSize: 10 },
      { id: 'tech', name: '💻 設備 (Machine)', x: 200, y: -120, width: 140, height: 40, color: '#10b981', shape: 'rounded-rect', fontSize: 12 },
      { id: 'material', name: '📦 物料 (Material)', x: -200, y: 120, width: 140, height: 40, color: '#f59e0b', shape: 'rounded-rect', fontSize: 12 },
      { id: 'env', name: '🌍 環境 (Environment)', x: 0, y: 120, width: 140, height: 40, color: '#8b5cf6', shape: 'rounded-rect', fontSize: 12 },
    ],
    edges: [
      { id: 'e_bb', source: 'backbone', target: 'root' },
      { id: 'e_peo', source: 'people', target: 'backbone' },
      { id: 'e_peo_s1', source: 'people', target: 'people_sub1' },
      { id: 'e_pro', source: 'process', target: 'backbone' },
      { id: 'e_pro_s1', source: 'process', target: 'process_sub1' },
      { id: 'e_tech', source: 'tech', target: 'backbone' },
      { id: 'e_mat', source: 'material', target: 'backbone' },
      { id: 'e_env', source: 'env', target: 'backbone' },
    ]
  },
  {
    name: 'OKR 目標與關鍵結果',
    description: '規劃團隊或個人的目標架構',
    nodes: [
      { id: 'root', name: '🏆 年度核心 OKR 目標', x: 0, y: 0, width: 180, height: 50, color: '#d97706', shape: 'rounded-rect', fontSize: 13 },
      { id: 'obj1', name: '🎯 目標 (Objective 1)\n提升產品使用者體驗', x: -220, y: -60, width: 160, height: 48, color: '#2563eb', shape: 'rounded-rect', fontSize: 12 },
      { id: 'kr1_1', name: '📈 KR 1.1: 載入時間降低 50%', x: -380, y: -120, width: 150, height: 40, color: '#475569', shape: 'rect', fontSize: 11 },
      { id: 'kr1_2', name: '📈 KR 1.2: 使用者滿意度達 4.5/5', x: -380, y: 0, width: 150, height: 40, color: '#475569', shape: 'rect', fontSize: 11 },
      { id: 'obj2', name: '🎯 目標 (Objective 2)\n拓展亞太地區市場', x: 220, y: 60, width: 160, height: 48, color: '#059669', shape: 'rounded-rect', fontSize: 12 },
      { id: 'kr2_1', name: '📈 KR 2.1: 簽署 5 家大型經銷商', x: 380, y: 0, width: 150, height: 40, color: '#475569', shape: 'rect', fontSize: 11 },
      { id: 'kr2_2', name: '📈 KR 2.2: 亞太區營收增長 30%', x: 380, y: 120, width: 150, height: 40, color: '#475569', shape: 'rect', fontSize: 11 },
    ],
    edges: [
      { id: 'e_obj1', source: 'root', target: 'obj1' },
      { id: 'e_kr1_1', source: 'obj1', target: 'kr1_1' },
      { id: 'e_kr1_2', source: 'obj1', target: 'kr1_2' },
      { id: 'e_obj2', source: 'root', target: 'obj2' },
      { id: 'e_kr2_1', source: 'obj2', target: 'kr2_1' },
      { id: 'e_kr2_2', source: 'obj2', target: 'kr2_2' },
    ]
  },
  {
    name: 'PDCA 專案持續改善循環',
    description: '計畫 - 執行 - 查核 - 行動',
    nodes: [
      { id: 'root', name: '🔄 PDCA 專案持續改善', x: 0, y: 0, width: 180, height: 50, color: '#8b5cf6', shape: 'rounded-rect', fontSize: 13 },
      { id: 'plan', name: '📝 1. Plan (計畫)\n設定目標、流程與方針', x: -160, y: -100, width: 150, height: 46, color: '#3b82f6', shape: 'rounded-rect', fontSize: 12 },
      { id: 'do', name: '⚙️ 2. Do (執行)\n付諸實踐、記錄數據', x: 160, y: -100, width: 150, height: 46, color: '#10b981', shape: 'rounded-rect', fontSize: 12 },
      { id: 'check', name: '🔍 3. Check (查核)\n比對數據、評估效能', x: 160, y: 100, width: 150, height: 46, color: '#f59e0b', shape: 'rounded-rect', fontSize: 12 },
      { id: 'act', name: '⚡ 4. Act (行動)\n標準化成功經驗、改善缺點', x: -160, y: 100, width: 150, height: 46, color: '#ef4444', shape: 'rounded-rect', fontSize: 12 },
    ],
    edges: [
      { id: 'e_p', source: 'root', target: 'plan' },
      { id: 'e_d', source: 'root', target: 'do' },
      { id: 'e_c', source: 'root', target: 'check' },
      { id: 'e_a', source: 'root', target: 'act' },
      { id: 'e_pd', source: 'plan', target: 'do' },
      { id: 'e_dc', source: 'do', target: 'check' },
      { id: 'e_ca', source: 'check', target: 'act' },
      { id: 'e_ap', source: 'act', target: 'plan' },
    ]
  }
];

export const MindMap: React.FC<MindMapProps> = ({ note, readOnly = false }) => {
  const { updateNote, users, currentUser, sendMessage } = useApp();
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  // Pan and Zoom Canvas State
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDraggingCanvas, setIsDraggingCanvas] = useState(false);
  const canvasDragStart = useRef({ x: 0, y: 0 });

  // Dimensions of canvas viewport
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });

  // Parsing & Migration
  const initialGraphData = useMemo<GraphData>(() => {
    try {
      const data = JSON.parse(note.content);
      // Compatibility Check: If it has tree structure 'root', migrate it to graph structure
      if (data && data.root) {
        return convertTreeToGraph(data.root);
      }
      // If it is already graph structure
      if (data && Array.isArray(data.nodes) && Array.isArray(data.edges)) {
        return data as GraphData;
      }
    } catch (e) {
      console.warn("Failed to parse mindmap JSON, using fallback root:", e);
    }

    // Default graph structure fallback
    return {
      nodes: [
        {
          id: 'root',
          name: note.title || '未命名心智圖',
          x: 0,
          y: 0,
          width: 160,
          height: 44,
          color: '#6366f1',
          shape: 'rounded-rect'
        }
      ],
      edges: []
    };
  }, [note.content, note.title]);

  // Local graph data state for smooth 60fps rendering
  const [graphData, setGraphData] = useState<GraphData>(initialGraphData);

  // Sync state if note content changes externally
  useEffect(() => {
    setGraphData(initialGraphData);
  }, [initialGraphData]);

  // Local state for mindmap title to prevent IME composition break
  const [localTitle, setLocalTitle] = useState(note.title);
  const lastSavedTitleRef = useRef(note.title);
  const titleDebounceRef = useRef<any>(null);
  const localTitleRef = useRef(localTitle);

  // Keep localTitleRef in sync with state
  useEffect(() => {
    localTitleRef.current = localTitle;
  }, [localTitle]);

  // Sync localTitle when active note.id changes
  useEffect(() => {
    setLocalTitle(note.title);
    lastSavedTitleRef.current = note.title;
  }, [note.id]);

  // Sync localTitle when note.title changes externally
  useEffect(() => {
    if (note.title !== lastSavedTitleRef.current) {
      setLocalTitle(note.title);
      lastSavedTitleRef.current = note.title;
    }
  }, [note.title]);

  // Flush any pending save on note.id changes or component unmount
  useEffect(() => {
    return () => {
      if (titleDebounceRef.current) {
        clearTimeout(titleDebounceRef.current);
        const finalTitle = localTitleRef.current || '未命名心智圖';
        updateNote(note.id, { title: finalTitle });
      }
    };
  }, [note.id]);

  // Selected Node State
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [presences, setPresences] = useState<Presence[]>([]);

  // Sync own selected node & listen to other presences
  useEffect(() => {
    if (!isFirebaseConfigured || !currentUser) return;
    
    const presenceId = `${note.id}_${currentUser.id}`;
    const docRef = doc(firestore, 'note_presence', presenceId);
    const color = getUserColor(currentUser.id);
    
    const updateOwnPresence = async (nodeIdVal?: string | null) => {
      try {
        await setDoc(docRef, {
          id: presenceId,
          noteId: note.id,
          userId: currentUser.id,
          userName: currentUser.displayName || currentUser.username,
          avatarUrl: currentUser.avatarUrl,
          nodeId: nodeIdVal || null,
          lastActive: Date.now(),
          color
        });
      } catch (err) {
        console.error('Update presence failed:', err);
      }
    };

    updateOwnPresence(selectedNodeId);
    
    const presenceInterval = setInterval(() => {
      updateOwnPresence(selectedNodeId);
    }, 10000);
    
    const q = query(
      collection(firestore, 'note_presence'),
      where('noteId', '==', note.id)
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const now = Date.now();
      const activePresences: Presence[] = [];
      snapshot.forEach((snapDoc) => {
        const p = snapDoc.data() as Presence;
        if (p.userId !== currentUser.id && (now - p.lastActive < 30000)) {
          activePresences.push(p);
        }
      });
      setPresences(activePresences);
    });
    
    return () => {
      clearInterval(presenceInterval);
      unsubscribe();
      deleteDoc(docRef).catch(err => console.error('Delete presence failed:', err));
    };
  }, [note.id, currentUser, selectedNodeId]);

  // Share dropdown state
  const [showShareDropdown, setShowShareDropdown] = useState(false);
  const [selectedUserForShare, setSelectedUserForShare] = useState('');
  const [isSendingNote, setIsSendingNote] = useState(false);
  const [showTemplateDropdown, setShowTemplateDropdown] = useState(false);

  const handleApplyTemplate = (templateIndex: number) => {
    if (confirm('套用模板將會覆蓋您目前的圖表內容，確定要繼續嗎？')) {
      const template = DIAGRAM_TEMPLATES[templateIndex];
      const nextData: GraphData = {
        nodes: template.nodes.map(node => ({ ...node })),
        edges: template.edges.map(edge => ({ ...edge }))
      };
      setGraphData(nextData);
      saveGraphData(nextData);
      setSelectedNodeId(null);
      setConnectingSourceId(null);
      setShowTemplateDropdown(false);
      setTimeout(() => {
        handleFitScreen();
      }, 80);
    }
  };

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

  // Node Dragging State
  const [draggedNodeId, setDraggedNodeId] = useState<string | null>(null);
  const nodeDragInitMouse = useRef({ x: 0, y: 0 });
  const nodeDragInitPos = useRef({ x: 0, y: 0 });

  // Double Click Editing Node Name State
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');
  const editInputRef = useRef<HTMLInputElement>(null);

  // Connection (Edge) Link Mode State
  const [connectingSourceId, setConnectingSourceId] = useState<string | null>(null);
  const [tempMousePos, setTempMousePos] = useState<{ x: number; y: number } | null>(null);

  // Hovered Edge ID State for Edge Deletion
  const [hoveredEdgeId, setHoveredEdgeId] = useState<string | null>(null);

  // Hovered Node ID State for handles
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);

  // Resizing Node State
  const [resizingNodeId, setResizingNodeId] = useState<string | null>(null);
  const nodeResizeInitMouse = useRef({ x: 0, y: 0 });
  const nodeResizeInitSize = useRef({ w: 0, h: 0 });

  // Measure container dimensions and center initial position
  useEffect(() => {
    if (!containerRef.current) return;
    const resizeObserver = new ResizeObserver((entries) => {
      for (let entry of entries) {
        setDimensions({
          width: entry.contentRect.width || 800,
          height: entry.contentRect.height || 600
        });
      }
    });
    resizeObserver.observe(containerRef.current);
    
    const rect = containerRef.current.getBoundingClientRect();
    const w = rect.width || 800;
    const h = rect.height || 600;
    setDimensions({ width: w, height: h });
    setPan({ x: w / 2, y: h / 2 });

    return () => resizeObserver.disconnect();
  }, []);

  // Save graph data to db
  const saveGraphData = (data: GraphData) => {
    updateNote(note.id, { content: JSON.stringify(data) });
  };

  // Zoom / Pan controls
  const handleZoomIn = () => setZoom((z) => Math.min(z + 0.1, 2.5));
  const handleZoomOut = () => setZoom((z) => Math.max(z - 0.1, 0.4));
  const handleReset = () => {
    setZoom(1);
    setPan({ x: dimensions.width / 2, y: dimensions.height / 2 });
    setSelectedNodeId(null);
    setConnectingSourceId(null);
  };
  const handleFitScreen = () => {
    if (graphData.nodes.length === 0) return;
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    graphData.nodes.forEach((n) => {
      const hw = n.width / 2;
      const hh = n.height / 2;
      if (n.x - hw < minX) minX = n.x - hw;
      if (n.x + hw > maxX) maxX = n.x + hw;
      if (n.y - hh < minY) minY = n.y - hh;
      if (n.y + hh > maxY) maxY = n.y + hh;
    });

    const pad = 60;
    const w = maxX - minX + pad * 2;
    const h = maxY - minY + pad * 2;
    const zoomX = dimensions.width / w;
    const zoomY = dimensions.height / h;
    const nextZoom = Math.max(0.4, Math.min(1.5, Math.min(zoomX, zoomY)));

    setZoom(nextZoom);
    setPan({
      x: dimensions.width / 2 - ((minX + maxX) / 2) * nextZoom,
      y: dimensions.height / 2 - ((minY + maxY) / 2) * nextZoom
    });
  };

  // Get current viewport center in canvas coordinate space
  const getCanvasCenter = () => {
    return {
      x: (dimensions.width / 2 - pan.x) / zoom,
      y: (dimensions.height / 2 - pan.y) / zoom
    };
  };

  // Mouse canvas coordination helper
  const getCanvasCoords = (clientX: number, clientY: number) => {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    return {
      x: (clientX - rect.left - pan.x) / zoom,
      y: (clientY - rect.top - pan.y) / zoom
    };
  };

  // Canvas Mouse events
  const handleCanvasMouseDown = (e: React.MouseEvent<SVGSVGElement>) => {
    const target = e.target as HTMLElement;
    if (target.closest('.interactive-el') || target.closest('.floating-inspector') || target.tagName === 'INPUT' || target.tagName === 'BUTTON') {
      return;
    }
    // Clicking empty space deselects nodes and exits link mode
    setSelectedNodeId(null);
    setConnectingSourceId(null);

    setIsDraggingCanvas(true);
    canvasDragStart.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
  };

  const handleCanvasMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    // 1. Pan canvas
    if (isDraggingCanvas) {
      setPan({
        x: e.clientX - canvasDragStart.current.x,
        y: e.clientY - canvasDragStart.current.y
      });
      return;
    }

    // 2. Resize Node
    if (resizingNodeId) {
      const dw = (e.clientX - nodeResizeInitMouse.current.x) / zoom;
      const dh = (e.clientY - nodeResizeInitMouse.current.y) / zoom;

      setGraphData((prev) => {
        const nextNodes = prev.nodes.map((n) => {
          if (n.id === resizingNodeId) {
            return {
              ...n,
              width: Math.max(60, nodeResizeInitSize.current.w + dw * 2),
              height: Math.max(30, nodeResizeInitSize.current.h + dh * 2)
            };
          }
          return n;
        });
        return { ...prev, nodes: nextNodes };
      });
      return;
    }

    // 3. Drag Node
    if (draggedNodeId) {
      const dx = (e.clientX - nodeDragInitMouse.current.x) / zoom;
      const dy = (e.clientY - nodeDragInitMouse.current.y) / zoom;

      setGraphData((prev) => {
        const nextNodes = prev.nodes.map((n) => {
          if (n.id === draggedNodeId) {
            return {
              ...n,
              x: nodeDragInitPos.current.x + dx,
              y: nodeDragInitPos.current.y + dy
            };
          }
          return n;
        });
        return { ...prev, nodes: nextNodes };
      });
      return;
    }

    // 4. Update temporary line in connecting link mode
    if (connectingSourceId) {
      const coords = getCanvasCoords(e.clientX, e.clientY);
      setTempMousePos(coords);
    }
  };

  const handleCanvasMouseUp = () => {
    setIsDraggingCanvas(false);
    if (draggedNodeId) {
      setDraggedNodeId(null);
      saveGraphData(graphData);
    }
    if (resizingNodeId) {
      setResizingNodeId(null);
      saveGraphData(graphData);
    }
  };

  const handleCanvasWheel = (e: React.WheelEvent<SVGSVGElement>) => {
    e.preventDefault();
    const scale = e.deltaY < 0 ? 1.05 : 0.95;
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return;
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const nextZoom = Math.max(0.4, Math.min(2.5, zoom * scale));

    setPan({
      x: mouseX - (mouseX - pan.x) * (nextZoom / zoom),
      y: mouseY - (mouseY - pan.y) * (nextZoom / zoom)
    });
    setZoom(nextZoom);
  };

  // Node operations
  const handleNodeMouseDown = (e: React.MouseEvent, node: GraphNode) => {
    e.stopPropagation();
    
    // If in connecting mode and this node is not the source, establish link!
    if (connectingSourceId) {
      if (connectingSourceId !== node.id) {
        handleAddEdge(connectingSourceId, node.id);
      }
      setConnectingSourceId(null);
      setTempMousePos(null);
      return;
    }

    // Otherwise, select node and start dragging
    setSelectedNodeId(node.id);
    if (readOnly) return;

    setDraggedNodeId(node.id);
    nodeDragInitMouse.current = { x: e.clientX, y: e.clientY };
    nodeDragInitPos.current = { x: node.x, y: node.y };
  };

  // Add individual floating node
  const handleAddFloatingNode = (shape: GraphNode['shape']) => {
    const center = getCanvasCenter();
    const newId = 'node-' + Math.random().toString(36).substr(2, 9);
    
    let w = 120;
    let h = 40;
    let name = '新項目';
    if (shape === 'circle') {
      w = 60;
      h = 60;
      name = '圓形';
    } else if (shape === 'diamond') {
      w = 70;
      h = 70;
      name = '菱形';
    } else if (shape === 'triangle') {
      w = 80;
      h = 80;
      name = '三角形';
    } else if (shape === 'hexagon') {
      w = 90;
      h = 80;
      name = '六角形';
    } else if (shape === 'parallelogram') {
      w = 120;
      h = 45;
      name = '平行四邊形';
    } else if (shape === 'cylinder') {
      w = 80;
      h = 90;
      name = '資料庫';
    } else if (shape === 'star') {
      w = 85;
      h = 85;
      name = '星形';
    } else if (shape === 'cloud') {
      w = 110;
      h = 70;
      name = '雲朵';
    } else if (shape === 'document') {
      w = 80;
      h = 100;
      name = '文件';
    } else if (shape === 'capsule') {
      w = 120;
      h = 45;
      name = '膠囊形';
    }

    const newNode: GraphNode = {
      id: newId,
      name: name,
      x: center.x,
      y: center.y,
      width: w,
      height: h,
      color: '#6366f1',
      shape
    };

    const nextData = {
      ...graphData,
      nodes: [...graphData.nodes, newNode]
    };
    
    setGraphData(nextData);
    saveGraphData(nextData);
    setSelectedNodeId(newId);
  };

  // Update Node Name (Double Click)
  const handleDoubleClick = (e: React.MouseEvent, node: GraphNode) => {
    if (readOnly) return;
    e.stopPropagation();
    setEditingNodeId(node.id);
    setEditingText(node.name);
    setTimeout(() => {
      editInputRef.current?.focus();
      editInputRef.current?.select();
    }, 50);
  };

  const handleSaveEdit = (node: GraphNode) => {
    if (!editingText.trim()) {
      setEditingNodeId(null);
      return;
    }
    const nextData = {
      ...graphData,
      nodes: graphData.nodes.map((n) => {
        if (n.id === node.id) {
          // If editing root, also sync note title
          if (node.id === 'root') {
            updateNote(note.id, { title: editingText.trim() });
          }
          return { ...n, name: editingText.trim() };
        }
        return n;
      })
    };
    setGraphData(nextData);
    saveGraphData(nextData);
    setEditingNodeId(null);
  };

  // Delete Node & connected edges
  const handleDeleteNode = (nodeId: string) => {
    if (nodeId === 'root') {
      alert('根節點不能被刪除！');
      return;
    }
    if (!confirm('確定要刪除此節點與其所有的連線嗎？')) return;

    const nextNodes = graphData.nodes.filter(n => n.id !== nodeId);
    const nextEdges = graphData.edges.filter(e => e.source !== nodeId && e.target !== nodeId);
    
    const nextData = { nodes: nextNodes, edges: nextEdges };
    setGraphData(nextData);
    saveGraphData(nextData);
    setSelectedNodeId(null);
    setConnectingSourceId(null);
  };

  // Update properties on selected node
  const handleUpdateNodeProperty = (nodeId: string, updates: Partial<GraphNode>) => {
    const nextData = {
      ...graphData,
      nodes: graphData.nodes.map(n => n.id === nodeId ? { ...n, ...updates } : n)
    };
    
    // If root title changed, sync note title
    if (nodeId === 'root' && updates.name) {
      updateNote(note.id, { title: updates.name });
    }

    setGraphData(nextData);
    saveGraphData(nextData);
  };

  // Custom Edge connection operations
  const handleAddEdge = (sourceId: string, targetId: string) => {
    // Check if edge already exists
    const exists = graphData.edges.some(
      e => (e.source === sourceId && e.target === targetId) || (e.source === targetId && e.target === sourceId)
    );
    if (exists) return;

    const newEdge: GraphEdge = {
      id: `edge-${sourceId}-${targetId}-${Math.random().toString(36).substr(2, 5)}`,
      source: sourceId,
      target: targetId
    };

    const nextData = {
      ...graphData,
      edges: [...graphData.edges, newEdge]
    };
    setGraphData(nextData);
    saveGraphData(nextData);
  };

  const handleDeleteEdge = (edgeId: string) => {
    const nextEdges = graphData.edges.filter(e => e.id !== edgeId);
    const nextData = { ...graphData, edges: nextEdges };
    setGraphData(nextData);
    saveGraphData(nextData);
    setHoveredEdgeId(null);
  };

  // Trigger Link mode
  const handleStartLinking = (nodeId: string) => {
    setConnectingSourceId(nodeId);
    setTempMousePos(null);
  };

  // Update note title (Header bar input)
  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTitle = e.target.value;
    setLocalTitle(newTitle);

    if (titleDebounceRef.current) {
      clearTimeout(titleDebounceRef.current);
    }

    titleDebounceRef.current = setTimeout(() => {
      const finalTitle = newTitle || '未命名心智圖';
      lastSavedTitleRef.current = finalTitle;
      updateNote(note.id, { title: finalTitle });
      
      // Sync root node name
      const nextData = {
        ...graphData,
        nodes: graphData.nodes.map((n) => n.id === 'root' ? { ...n, name: finalTitle } : n)
      };
      setGraphData(nextData);
      saveGraphData(nextData);
    }, 500);
  };

  const handleTitleBlur = () => {
    if (titleDebounceRef.current) {
      clearTimeout(titleDebounceRef.current);
    }
    const finalTitle = localTitle || '未命名心智圖';
    lastSavedTitleRef.current = finalTitle;
    updateNote(note.id, { title: finalTitle });
    
    const nextData = {
      ...graphData,
      nodes: graphData.nodes.map((n) => n.id === 'root' ? { ...n, name: finalTitle } : n)
    };
    setGraphData(nextData);
    saveGraphData(nextData);
  };

  // Selected Node Object details
  const selectedNode = graphData.nodes.find(n => n.id === selectedNodeId);

  // Compute inspector position overlay above selected node
  const inspectorStyles = useMemo<React.CSSProperties | null>(() => {
    if (!selectedNode) return null;
    const x = selectedNode.x * zoom + pan.x;
    const y = (selectedNode.y - selectedNode.height / 2) * zoom + pan.y;

    return {
      position: 'absolute',
      left: `${x}px`,
      top: `${y}px`,
      transform: 'translate(-50%, -100%) translateY(-10px)',
      zIndex: 100,
      pointerEvents: 'auto'
    };
  }, [selectedNode, zoom, pan]);

  // Export SVG handler
  const handleExportSVG = () => {
    if (!svgRef.current) return;
    const svgElement = svgRef.current.cloneNode(true) as SVGSVGElement;
    svgElement.setAttribute('width', '1600');
    svgElement.setAttribute('height', '1200');
    svgElement.setAttribute('viewBox', '-800 -600 1600 1200');
    
    const mainGroup = svgElement.querySelector('.main-zoom-group');
    if (mainGroup) mainGroup.setAttribute('transform', 'translate(0, 0) scale(1)');

    const styleElement = document.createElementNS('http://www.w3.org/2000/svg', 'style');
    styleElement.textContent = `
      svg { background-color: #0d0f16; }
      text { font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
      .link-line {
        fill: none;
        stroke: #2a314d;
        stroke-width: 2;
      }
    `;
    svgElement.insertBefore(styleElement, svgElement.firstChild);

    const serializer = new XMLSerializer();
    const source = serializer.serializeToString(svgElement);
    const url = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(source);
    
    const downloadLink = document.createElement('a');
    downloadLink.href = url;
    downloadLink.download = `${note.title || 'graph-diagram'}.svg`;
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
  };

  // Rendering Helpers for Shapes
  const renderShapeElement = (node: GraphNode, isSelected: boolean) => {
    const hw = node.width / 2;
    const hh = node.height / 2;
    const strokeColor = isSelected ? 'var(--brand-primary)' : 'var(--border-color)';
    const strokeWidth = isSelected ? 3 : 1.5;
    const fill = node.color || '#6366f1';

    switch (node.shape) {
      case 'rect':
        return (
          <rect
            x={-hw}
            y={-hh}
            width={node.width}
            height={node.height}
            fill={fill}
            stroke={strokeColor}
            strokeWidth={strokeWidth}
            className="interactive-el"
            style={{ transition: 'stroke var(--transition-fast)' }}
          />
        );
      case 'circle':
        const r = Math.min(node.width, node.height) / 2;
        return (
          <circle
            cx={0}
            cy={0}
            r={r}
            fill={fill}
            stroke={strokeColor}
            strokeWidth={strokeWidth}
            className="interactive-el"
            style={{ transition: 'stroke var(--transition-fast)' }}
          />
        );
      case 'ellipse':
        return (
          <ellipse
            cx={0}
            cy={0}
            rx={hw}
            ry={hh}
            fill={fill}
            stroke={strokeColor}
            strokeWidth={strokeWidth}
            className="interactive-el"
            style={{ transition: 'stroke var(--transition-fast)' }}
          />
        );
      case 'diamond':
        const points = `0,${-hh} ${hw},0 0,${hh} ${-hw},0`;
        return (
          <polygon
            points={points}
            fill={fill}
            stroke={strokeColor}
            strokeWidth={strokeWidth}
            className="interactive-el"
            style={{ transition: 'stroke var(--transition-fast)' }}
          />
        );
      case 'triangle':
        return (
          <polygon
            points={`0,${-hh} ${hw},${hh} ${-hw},${hh}`}
            fill={fill}
            stroke={strokeColor}
            strokeWidth={strokeWidth}
            className="interactive-el"
            style={{ transition: 'stroke var(--transition-fast)' }}
          />
        );
      case 'hexagon':
        return (
          <polygon
            points={`${-hw * 0.5},${-hh} ${hw * 0.5},${-hh} ${hw},0 ${hw * 0.5},${hh} ${-hw * 0.5},${hh} ${-hw},0`}
            fill={fill}
            stroke={strokeColor}
            strokeWidth={strokeWidth}
            className="interactive-el"
            style={{ transition: 'stroke var(--transition-fast)' }}
          />
        );
      case 'parallelogram':
        return (
          <polygon
            points={`${-hw + hh * 0.3},${-hh} ${hw + hh * 0.3},${-hh} ${hw - hh * 0.3},${hh} ${-hw - hh * 0.3},${hh}`}
            fill={fill}
            stroke={strokeColor}
            strokeWidth={strokeWidth}
            className="interactive-el"
            style={{ transition: 'stroke var(--transition-fast)' }}
          />
        );
      case 'cylinder':
        return (
          <g className="interactive-el">
            <path
              d={`M ${-hw} ${-hh + 8} L ${-hw} ${hh - 8} A ${hw} 8 0 0 0 ${hw} ${hh - 8} L ${hw} ${-hh + 8} Z`}
              fill={fill}
              stroke={strokeColor}
              strokeWidth={strokeWidth}
              style={{ transition: 'stroke var(--transition-fast)' }}
            />
            <ellipse
              cx={0}
              cy={-hh + 8}
              rx={hw}
              ry={8}
              fill={fill}
              stroke={strokeColor}
              strokeWidth={strokeWidth}
              style={{ transition: 'stroke var(--transition-fast)' }}
            />
          </g>
        );
      case 'star':
        return (
          <polygon
            points={`0,${-hh} ${hw * 0.22},${-hh * 0.27} ${hw},${-hh * 0.27} ${hw * 0.36},${hh * 0.2} ${hw * 0.6},${hh} 0,${hh * 0.5} ${-hw * 0.6},${hh} ${-hw * 0.36},${hh * 0.2} ${-hw},${-hh * 0.27} ${-hw * 0.22},${-hh * 0.27}`}
            fill={fill}
            stroke={strokeColor}
            strokeWidth={strokeWidth}
            className="interactive-el"
            style={{ transition: 'stroke var(--transition-fast)' }}
          />
        );
      case 'cloud':
        return (
          <path
            d={`M ${-hw + hh * 0.5} ${hh * 0.2} C ${-hw} ${hh * 0.2}, ${-hw} ${-hh * 0.4}, ${-hw + hh * 0.6} ${-hh * 0.4} C ${-hw + hh * 0.6} ${-hh * 0.8}, ${-hw * 0.2} ${-hh}, 0 ${-hh * 0.8} C ${hw * 0.2} ${-hh}, ${hw - hh * 0.6} ${-hh * 0.8}, ${hw - hh * 0.6} ${-hh * 0.4} C ${hw} ${-hh * 0.4}, ${hw} ${hh * 0.2}, ${hw - hh * 0.5} ${hh * 0.2} C ${hw - hh * 0.5} ${hh}, ${-hw + hh * 0.5} ${hh}, ${-hw + hh * 0.5} ${hh * 0.2} Z`}
            fill={fill}
            stroke={strokeColor}
            strokeWidth={strokeWidth}
            className="interactive-el"
            style={{ transition: 'stroke var(--transition-fast)' }}
          />
        );
      case 'document':
        return (
          <g className="interactive-el">
            <polygon
              points={`${-hw},${-hh} ${hw - 10},${-hh} ${hw},${-hh + 10} ${hw},${hh} ${-hw},${hh}`}
              fill={fill}
              stroke={strokeColor}
              strokeWidth={strokeWidth}
              style={{ transition: 'stroke var(--transition-fast)' }}
            />
            <polygon
              points={`${hw - 10},${-hh} ${hw - 10},${-hh + 10} ${hw},${-hh + 10}`}
              fill="rgba(255, 255, 255, 0.25)"
              stroke={strokeColor}
              strokeWidth={strokeWidth / 1.5}
            />
          </g>
        );
      case 'capsule':
        return (
          <rect
            x={-hw}
            y={-hh}
            width={node.width}
            height={node.height}
            rx={hh}
            ry={hh}
            fill={fill}
            stroke={strokeColor}
            strokeWidth={strokeWidth}
            className="interactive-el"
            style={{ transition: 'stroke var(--transition-fast)' }}
          />
        );
      case 'rounded-rect':
      default:
        return (
          <rect
            x={-hw}
            y={-hh}
            width={node.width}
            height={node.height}
            rx="8"
            ry="8"
            fill={fill}
            stroke={strokeColor}
            strokeWidth={strokeWidth}
            className="interactive-el"
            style={{ transition: 'stroke var(--transition-fast)' }}
          />
        );
    }
  };

  return (
    <div
      ref={containerRef}
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        background: 'var(--bg-editor)',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column'
      }}
    >
      {/* 1. Canvas Editor Title Header */}
      {!readOnly && (
        <div style={{
          padding: '12px 24px',
          borderBottom: '1px solid var(--border-color)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'rgba(255,255,255,0.01)',
          flexShrink: 0
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flex: 1 }}>
            <span style={{ fontSize: '15px' }}>🧠</span>
            <input
              type="text"
              value={localTitle}
              onChange={handleTitleChange}
              onBlur={handleTitleBlur}
              placeholder="未命名心智圖"
              style={{
                fontSize: '18px',
                fontWeight: 700,
                background: 'transparent',
                border: 'none',
                outline: 'none',
                color: 'var(--text-primary)',
                width: '100%',
                fontFamily: 'var(--font-display)'
              }}
            />
          </div>
          
          {/* Share Button & Dropdown */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', position: 'relative' }}>
            {!readOnly && (
              <div style={{ position: 'relative' }}>
                <button
                  onClick={() => setShowTemplateDropdown(!showTemplateDropdown)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '6px 12px',
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-md)',
                    color: 'var(--text-primary)',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all var(--transition-fast)'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-1px)'}
                  onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                >
                  <LayoutTemplate size={13} />
                  <span>套用模板</span>
                  <ChevronDown size={12} />
                </button>

                {showTemplateDropdown && (
                  <>
                    <div 
                      onClick={() => setShowTemplateDropdown(false)}
                      style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 100 }}
                    />
                    <div 
                      className="glass-panel"
                      style={{
                        position: 'absolute',
                        top: 'calc(100% + 8px)',
                        right: 0,
                        width: '240px',
                        zIndex: 101,
                        padding: '8px',
                        borderRadius: 'var(--radius-md)',
                        boxShadow: 'var(--shadow-lg)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '4px'
                      }}
                    >
                      <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', padding: '4px 8px', textTransform: 'uppercase' }}>
                        選擇圖表模板
                      </div>
                      {DIAGRAM_TEMPLATES.map((tmpl, idx) => (
                        <button
                          key={tmpl.name}
                          onClick={() => handleApplyTemplate(idx)}
                          style={{
                            padding: '8px 12px',
                            textAlign: 'left',
                            borderRadius: 'var(--radius-sm)',
                            width: '100%',
                            color: 'var(--text-primary)',
                            background: 'transparent',
                            border: 'none',
                            cursor: 'pointer',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '2px'
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'}
                          onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                        >
                          <span style={{ fontSize: '12.5px', fontWeight: 600 }}>{tmpl.name}</span>
                          <span style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>{tmpl.description}</span>
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}

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
              onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-1px)'}
              onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
            >
              <Share2 size={13} />
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
                                  `分享了心智圖：《${note.title}》`,
                                  `我與你分享了一個心智圖，請點擊下方匯入！`,
                                  note.id,
                                  {
                                    title: note.title,
                                    type: 'mindmap',
                                    content: note.content,
                                    icon: note.icon,
                                    coverImage: note.coverImage
                                  }
                                );
                                alert('已成功傳送心智圖附件信件！');
                                setShowShareDropdown(false);
                              } catch (err: any) {
                                console.error('Send mindmap failed:', err);
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
      )}

      {/* 2. Top-Left Node Shape Selector overlay */}
      {!readOnly && (
        <div
          className="glass-panel"
          style={{
            position: 'absolute',
            top: readOnly ? '16px' : '72px',
            left: '16px',
            padding: '10px 14px',
            borderRadius: 'var(--radius-md)',
            boxShadow: 'var(--shadow-md)',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            zIndex: 10
          }}
        >
          <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            新增圖形節點
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', maxWidth: '200px' }}>
            {/* Rectangle Button */}
            <button
              onClick={() => handleAddFloatingNode('rect')}
              title="矩形"
              style={shapeSelectorBtnStyle}
              onMouseEnter={(e)=>e.currentTarget.style.borderColor='var(--brand-primary)'}
              onMouseLeave={(e)=>e.currentTarget.style.borderColor='var(--border-color)'}
            >
              <div style={{ width: '16px', height: '11px', border: '1.5px solid var(--text-primary)' }} />
            </button>
            {/* Rounded Rect Button */}
            <button
              onClick={() => handleAddFloatingNode('rounded-rect')}
              title="圓角矩形"
              style={shapeSelectorBtnStyle}
              onMouseEnter={(e)=>e.currentTarget.style.borderColor='var(--brand-primary)'}
              onMouseLeave={(e)=>e.currentTarget.style.borderColor='var(--border-color)'}
            >
              <div style={{ width: '16px', height: '11px', border: '1.5px solid var(--text-primary)', borderRadius: '3px' }} />
            </button>
            {/* Circle Button */}
            <button
              onClick={() => handleAddFloatingNode('circle')}
              title="圓形"
              style={shapeSelectorBtnStyle}
              onMouseEnter={(e)=>e.currentTarget.style.borderColor='var(--brand-primary)'}
              onMouseLeave={(e)=>e.currentTarget.style.borderColor='var(--border-color)'}
            >
              <div style={{ width: '12px', height: '12px', borderRadius: '50%', border: '1.5px solid var(--text-primary)' }} />
            </button>
            {/* Ellipse Button */}
            <button
              onClick={() => handleAddFloatingNode('ellipse')}
              title="橢圓"
              style={shapeSelectorBtnStyle}
              onMouseEnter={(e)=>e.currentTarget.style.borderColor='var(--brand-primary)'}
              onMouseLeave={(e)=>e.currentTarget.style.borderColor='var(--border-color)'}
            >
              <div style={{ width: '16px', height: '10px', borderRadius: '50% / 50%', border: '1.5px solid var(--text-primary)' }} />
            </button>
            {/* Diamond Button */}
            <button
              onClick={() => handleAddFloatingNode('diamond')}
              title="菱形"
              style={shapeSelectorBtnStyle}
              onMouseEnter={(e)=>e.currentTarget.style.borderColor='var(--brand-primary)'}
              onMouseLeave={(e)=>e.currentTarget.style.borderColor='var(--border-color)'}
            >
              <div style={{ width: '11px', height: '11px', border: '1.5px solid var(--text-primary)', transform: 'rotate(45deg)' }} />
            </button>
            {/* Triangle Button */}
            <button
              onClick={() => handleAddFloatingNode('triangle')}
              title="三角形"
              style={shapeSelectorBtnStyle}
              onMouseEnter={(e)=>e.currentTarget.style.borderColor='var(--brand-primary)'}
              onMouseLeave={(e)=>e.currentTarget.style.borderColor='var(--border-color)'}
            >
              <svg width="14" height="12" viewBox="0 0 16 14" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ color: 'var(--text-primary)' }}><polygon points="8,1 15,13 1,13"/></svg>
            </button>
            {/* Hexagon Button */}
            <button
              onClick={() => handleAddFloatingNode('hexagon')}
              title="六角形"
              style={shapeSelectorBtnStyle}
              onMouseEnter={(e)=>e.currentTarget.style.borderColor='var(--brand-primary)'}
              onMouseLeave={(e)=>e.currentTarget.style.borderColor='var(--border-color)'}
            >
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ color: 'var(--text-primary)' }}><polygon points="4,2 12,2 15,8 12,14 4,14 1,8"/></svg>
            </button>
            {/* Parallelogram Button */}
            <button
              onClick={() => handleAddFloatingNode('parallelogram')}
              title="平行四邊形"
              style={shapeSelectorBtnStyle}
              onMouseEnter={(e)=>e.currentTarget.style.borderColor='var(--brand-primary)'}
              onMouseLeave={(e)=>e.currentTarget.style.borderColor='var(--border-color)'}
            >
              <svg width="14" height="11" viewBox="0 0 16 12" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ color: 'var(--text-primary)' }}><polygon points="4,1 15,1 12,11 1,11"/></svg>
            </button>
            {/* Cylinder Button */}
            <button
              onClick={() => handleAddFloatingNode('cylinder')}
              title="圓柱體 / 資料庫"
              style={shapeSelectorBtnStyle}
              onMouseEnter={(e)=>e.currentTarget.style.borderColor='var(--brand-primary)'}
              onMouseLeave={(e)=>e.currentTarget.style.borderColor='var(--border-color)'}
            >
              <svg width="12" height="14" viewBox="0 0 14 16" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ color: 'var(--text-primary)' }}><ellipse cx="7" cy="3" rx="6" ry="2"/><path d="M1,3 L1,13 A6,2 0 0,0 13,13 L13,3"/></svg>
            </button>
            {/* Star Button */}
            <button
              onClick={() => handleAddFloatingNode('star')}
              title="星形"
              style={shapeSelectorBtnStyle}
              onMouseEnter={(e)=>e.currentTarget.style.borderColor='var(--brand-primary)'}
              onMouseLeave={(e)=>e.currentTarget.style.borderColor='var(--border-color)'}
            >
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ color: 'var(--text-primary)' }}><polygon points="8,1.5 10.3,6.2 15.5,7 11.8,10.6 12.6,15.8 8,13.3 3.4,15.8 4.2,10.6 0.5,7 5.7,6.2"/></svg>
            </button>
            {/* Cloud Button */}
            <button
              onClick={() => handleAddFloatingNode('cloud')}
              title="雲朵"
              style={shapeSelectorBtnStyle}
              onMouseEnter={(e)=>e.currentTarget.style.borderColor='var(--brand-primary)'}
              onMouseLeave={(e)=>e.currentTarget.style.borderColor='var(--border-color)'}
            >
              <svg width="14" height="12" viewBox="0 0 16 12" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ color: 'var(--text-primary)' }}><path d="M4.5,3.5 A2.5,2.5 0 0,1 9.5,3 A3.5,3.5 0 0,1 15,6.5 A2.5,2.5 0 0,1 12.5,9.5 L3.5,9.5 A2.5,2.5 0 0,1 1,7 A2.5,2.5 0 0,1 4.5,3.5 Z"/></svg>
            </button>
            {/* Document Button */}
            <button
              onClick={() => handleAddFloatingNode('document')}
              title="文件"
              style={shapeSelectorBtnStyle}
              onMouseEnter={(e)=>e.currentTarget.style.borderColor='var(--brand-primary)'}
              onMouseLeave={(e)=>e.currentTarget.style.borderColor='var(--border-color)'}
            >
              <svg width="12" height="14" viewBox="0 0 12 14" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ color: 'var(--text-primary)' }}><path d="M1,1 L8,1 L11,4 L11,13 L1,13 Z M8,1 L8,4 L11,4"/></svg>
            </button>
            {/* Capsule Button */}
            <button
              onClick={() => handleAddFloatingNode('capsule')}
              title="膠囊形"
              style={shapeSelectorBtnStyle}
              onMouseEnter={(e)=>e.currentTarget.style.borderColor='var(--brand-primary)'}
              onMouseLeave={(e)=>e.currentTarget.style.borderColor='var(--border-color)'}
            >
              <div style={{ width: '16px', height: '8px', border: '1.5px solid var(--text-primary)', borderRadius: '4px' }} />
            </button>
          </div>
        </div>
      )}

      {/* 3. Link Mode Notification Tip Banner */}
      {connectingSourceId && (
        <div style={{
          position: 'absolute',
          top: readOnly ? '16px' : '72px',
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'var(--brand-primary)',
          color: '#ffffff',
          padding: '8px 16px',
          borderRadius: 'var(--radius-md)',
          fontSize: '12.5px',
          fontWeight: 600,
          boxShadow: 'var(--shadow-glow)',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          zIndex: 10
        }}>
          <Link size={14} />
          <span>選取另一個節點來建立連線...</span>
          <button 
            onClick={() => { setConnectingSourceId(null); setTempMousePos(null); }}
            style={{ background: 'transparent', border: 'none', color: '#ffffff', cursor: 'pointer', display: 'flex', padding: '2px' }}
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* 4. Canvas SVG Workspace */}
      <svg
        ref={svgRef}
        width="100%"
        height="100%"
        onMouseDown={handleCanvasMouseDown}
        onMouseMove={handleCanvasMouseMove}
        onMouseUp={handleCanvasMouseUp}
        onMouseLeave={handleCanvasMouseUp}
        onWheel={handleCanvasWheel}
        style={{ cursor: isDraggingCanvas ? 'grabbing' : (connectingSourceId ? 'crosshair' : (resizingNodeId ? 'se-resize' : 'grab')), flex: 1 }}
      >
        <g className="main-zoom-group" transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
          
          {/* A. Render Connections (Edges) */}
          {graphData.edges.map((edge) => {
            const source = graphData.nodes.find((n) => n.id === edge.source);
            const target = graphData.nodes.find((n) => n.id === edge.target);
            if (!source || !target) return null;

            const x1 = source.x;
            const y1 = source.y;
            const x2 = target.x;
            const y2 = target.y;

            const midX = (x1 + x2) / 2;
            const midY = (y1 + y2) / 2;
            const isHovered = hoveredEdgeId === edge.id;

            return (
              <g
                key={edge.id}
                onMouseEnter={() => setHoveredEdgeId(edge.id)}
                onMouseLeave={() => setHoveredEdgeId(null)}
              >
                {/* Thick invisible path for easy hover */}
                <line
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  stroke="transparent"
                  strokeWidth={14}
                  style={{ cursor: 'pointer' }}
                />
                
                {/* Visible link line */}
                <line
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  stroke={isHovered ? 'var(--accent-error)' : 'var(--border-color)'}
                  strokeWidth={isHovered ? 2.5 : 1.5}
                  strokeDasharray={isHovered ? '4 3' : undefined}
                  style={{ transition: 'stroke var(--transition-fast)' }}
                />

                {/* Deletion button on hover */}
                {!readOnly && isHovered && (
                  <g
                    transform={`translate(${midX}, ${midY})`}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteEdge(edge.id);
                    }}
                    style={{ cursor: 'pointer' }}
                    className="interactive-el"
                  >
                    <circle r="9" fill="var(--accent-error)" />
                    <path
                      d="M -3.5 -3.5 L 3.5 3.5 M -3.5 3.5 L 3.5 -3.5"
                      stroke="#ffffff"
                      strokeWidth={1.5}
                    />
                  </g>
                )}
              </g>
            );
          })}

          {/* B. Render Temporary Link Line (Linking Mode) */}
          {connectingSourceId && tempMousePos && (() => {
            const source = graphData.nodes.find(n => n.id === connectingSourceId);
            if (!source) return null;
            return (
              <line
                x1={source.x}
                y1={source.y}
                x2={tempMousePos.x}
                y2={tempMousePos.y}
                stroke="var(--brand-primary)"
                strokeWidth={1.5}
                strokeDasharray="4 4"
              />
            );
          })()}

          {/* C. Render Nodes */}
          {graphData.nodes.map((node) => {
            const isSelected = selectedNodeId === node.id;
            const isEditing = editingNodeId === node.id;
            const isTargetOfConnect = connectingSourceId !== null && connectingSourceId !== node.id;

            const nodePresences = presences.filter(p => p.nodeId === node.id);

            return (
              <g
                key={node.id}
                transform={`translate(${node.x}, ${node.y})`}
                onMouseDown={(e) => handleNodeMouseDown(e, node)}
                onMouseEnter={() => setHoveredNodeId(node.id)}
                onMouseLeave={() => setHoveredNodeId(null)}
                style={{ cursor: connectingSourceId ? (isTargetOfConnect ? 'pointer' : 'not-allowed') : 'move' }}
              >
                {/* Node Shape */}
                {renderShapeElement(node, isSelected)}

                {/* Collaborative Selection Contours */}
                {nodePresences.map((p, idx) => (
                  <rect
                    key={p.userId}
                    x={-node.width / 2 - 4 - idx * 3}
                    y={-node.height / 2 - 4 - idx * 3}
                    width={node.width + 8 + idx * 6}
                    height={node.height + 8 + idx * 6}
                    fill="none"
                    stroke={p.color}
                    strokeWidth={2}
                    strokeDasharray="4 2"
                    rx={6}
                    ry={6}
                    style={{ pointerEvents: 'none' }}
                  />
                ))}

                {/* Collaborative User Avatars */}
                {nodePresences.map((p, idx) => (
                  <g 
                    key={p.userId} 
                    transform={`translate(${node.width / 2 - 12 - idx * 18}, ${-node.height / 2 - 12})`}
                    style={{ pointerEvents: 'none' }}
                  >
                    <circle
                      cx={8}
                      cy={8}
                      r={9}
                      fill={p.color}
                    />
                    <clipPath id={`avatar-clip-${p.userId}`}>
                      <circle cx={8} cy={8} r={8} />
                    </clipPath>
                    <image
                      href={p.avatarUrl}
                      x={0}
                      y={0}
                      width={16}
                      height={16}
                      clipPath={`url(#avatar-clip-${p.userId})`}
                    />
                  </g>
                ))}

                {/* Node Name Text / Input Box Overlay */}
                <foreignObject
                  x={-node.width / 2}
                  y={-node.height / 2}
                  width={node.width}
                  height={node.height}
                  style={{ pointerEvents: 'none' }}
                >
                  <div
                    style={{
                      width: '100%',
                      height: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: node.shape === 'diamond' ? '12px' : '4px 10px',
                      boxSizing: 'border-box',
                      overflow: 'hidden',
                      textAlign: 'center',
                      fontSize: `${node.fontSize || 12}px`,
                      lineHeight: 1.25,
                      fontWeight: node.id === 'root' ? 700 : 500,
                      color: getTextColor(node.color),
                      pointerEvents: 'auto'
                    }}
                  >
                    {isEditing ? (
                      <div 
                        style={{ width: '100%', height: '100%' }}
                        onMouseDown={(e) => e.stopPropagation()}
                      >
                        <input
                          ref={editInputRef}
                          type="text"
                          value={editingText}
                          onChange={(e) => setEditingText(e.target.value)}
                          onBlur={() => handleSaveEdit(node)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveEdit(node);
                            if (e.key === 'Escape') setEditingNodeId(null);
                          }}
                          style={{
                            width: '100%',
                            height: '100%',
                            background: 'rgba(255, 255, 255, 0.15)',
                            border: '1.5px solid #ffffff',
                            borderRadius: '4px',
                            outline: 'none',
                            color: getTextColor(node.color),
                            fontSize: `${node.fontSize || 12}px`,
                            textAlign: 'center',
                            fontWeight: 'inherit',
                            padding: '2px 4px',
                            boxSizing: 'border-box'
                          }}
                        />
                      </div>
                    ) : (
                      <span
                        onDoubleClick={(e) => handleDoubleClick(e, node)}
                        style={{
                          width: '100%',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          wordBreak: 'break-all',
                          cursor: 'text',
                          userSelect: 'none'
                        }}
                      >
                        {node.name}
                      </span>
                    )}
                  </div>
                </foreignObject>

                {/* Connection Handles on Hover */}
                {!readOnly && hoveredNodeId === node.id && !connectingSourceId && (
                  <g className="interactive-el">
                    {/* Left connection dot */}
                    <circle
                      cx={-node.width / 2}
                      cy={0}
                      r={6}
                      fill="#ffffff"
                      stroke="var(--brand-primary)"
                      strokeWidth={2}
                      style={{ cursor: 'crosshair' }}
                      onMouseDown={(e) => {
                        e.stopPropagation();
                        handleStartLinking(node.id);
                      }}
                    >
                      <title>點擊或拖曳此處建立連線</title>
                    </circle>
                    {/* Right connection dot */}
                    <circle
                      cx={node.width / 2}
                      cy={0}
                      r={6}
                      fill="#ffffff"
                      stroke="var(--brand-primary)"
                      strokeWidth={2}
                      style={{ cursor: 'crosshair' }}
                      onMouseDown={(e) => {
                        e.stopPropagation();
                        handleStartLinking(node.id);
                      }}
                    >
                      <title>點擊或拖曳此處建立連線</title>
                    </circle>
                  </g>
                )}

                {/* Resize Handle (only for selected node in edit mode) */}
                {!readOnly && isSelected && (
                  <rect
                    x={node.width / 2 - 4}
                    y={node.height / 2 - 4}
                    width={8}
                    height={8}
                    fill="#ffffff"
                    stroke="var(--brand-primary)"
                    strokeWidth={1.5}
                    style={{ cursor: 'se-resize' }}
                    className="interactive-el"
                    onMouseDown={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      setResizingNodeId(node.id);
                      nodeResizeInitMouse.current = { x: e.clientX, y: e.clientY };
                      nodeResizeInitSize.current = { w: node.width, h: node.height };
                    }}
                  />
                )}
              </g>
            );
          })}

        </g>
      </svg>

      {/* 5. Floating Node Inspector Toolbar Overlay */}
      {selectedNode && inspectorStyles && !readOnly && (
        <div 
          className="glass-panel floating-inspector" 
          style={{
            ...inspectorStyles,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '6px 10px',
            borderRadius: 'var(--radius-md)',
            boxShadow: 'var(--shadow-lg)',
            border: '1px solid var(--border-color)'
          }}
        >
          {/* Colors preseter */}
          <div style={{ display: 'flex', gap: '4px', borderRight: '1px solid var(--border-color)', paddingRight: '8px' }}>
            {COLOR_PRESETS.map((color) => (
              <button
                key={color.value}
                onClick={() => handleUpdateNodeProperty(selectedNode.id, { color: color.value })}
                style={{
                  width: '15px',
                  height: '15px',
                  borderRadius: '50%',
                  background: color.value,
                  border: selectedNode.color === color.value ? '1.5px solid #ffffff' : '1px solid rgba(255,255,255,0.2)',
                  cursor: 'pointer',
                  boxShadow: selectedNode.color === color.value ? '0 0 4px rgba(255,255,255,0.6)' : 'none',
                  padding: 0
                }}
                title={color.name}
              />
            ))}
          </div>

          {/* Width controller */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
            <span style={inspectorLabelStyle}>寬</span>
            <button
              onClick={() => handleUpdateNodeProperty(selectedNode.id, { width: Math.max(60, selectedNode.width - 20) })}
              style={inspectorBtnStyle}
            >
              -
            </button>
            <button
              onClick={() => handleUpdateNodeProperty(selectedNode.id, { width: selectedNode.width + 20 })}
              style={inspectorBtnStyle}
            >
              +
            </button>
          </div>

          {/* Height controller */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '2px', borderRight: '1px solid var(--border-color)', paddingRight: '8px', marginRight: '4px' }}>
            <span style={inspectorLabelStyle}>高</span>
            <button
              onClick={() => handleUpdateNodeProperty(selectedNode.id, { height: Math.max(30, selectedNode.height - 10) })}
              style={inspectorBtnStyle}
            >
              -
            </button>
            <button
              onClick={() => handleUpdateNodeProperty(selectedNode.id, { height: selectedNode.height + 10 })}
              style={inspectorBtnStyle}
            >
              +
            </button>
          </div>

          {/* Font Size controller */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '2px', borderRight: '1px solid var(--border-color)', paddingRight: '8px', marginRight: '4px' }}>
            <span style={inspectorLabelStyle}>字</span>
            <button
              onClick={() => handleUpdateNodeProperty(selectedNode.id, { fontSize: Math.max(8, (selectedNode.fontSize || 12) - 1) })}
              style={inspectorBtnStyle}
              title="縮小字型"
            >
              -
            </button>
            <span style={{ fontSize: '11px', fontWeight: 600, minWidth: '16px', textAlign: 'center' }}>
              {selectedNode.fontSize || 12}
            </span>
            <button
              onClick={() => handleUpdateNodeProperty(selectedNode.id, { fontSize: Math.min(32, (selectedNode.fontSize || 12) + 1) })}
              style={inspectorBtnStyle}
              title="放大字型"
            >
              +
            </button>
          </div>

          {/* Connect node */}
          <button
            onClick={() => handleStartLinking(selectedNode.id)}
            style={inspectorIconBtnStyle}
            title="與其他節點連線"
          >
            <Link size={13} />
          </button>

          {/* Change Shape */}
          <select
            value={selectedNode.shape}
            onChange={(e) => handleUpdateNodeProperty(selectedNode.id, { shape: e.target.value as GraphNode['shape'] })}
            style={{
              background: 'var(--bg-input)',
              border: '1px solid var(--border-color)',
              color: 'var(--text-primary)',
              fontSize: '11px',
              borderRadius: 'var(--radius-sm)',
              padding: '2px 4px',
              outline: 'none',
              cursor: 'pointer'
            }}
          >
            <option value="rect">矩形</option>
            <option value="rounded-rect">圓角矩形</option>
            <option value="circle">圓形</option>
            <option value="ellipse">橢圓</option>
            <option value="diamond">菱形</option>
            <option value="triangle">三角形</option>
            <option value="hexagon">六角形</option>
            <option value="parallelogram">平行四邊形</option>
            <option value="cylinder">資料庫</option>
            <option value="star">星形</option>
            <option value="cloud">雲朵</option>
            <option value="document">文件</option>
            <option value="capsule">膠囊形</option>
          </select>

          {/* Delete node */}
          {selectedNode.id !== 'root' && (
            <button
              onClick={() => handleDeleteNode(selectedNode.id)}
              style={{ ...inspectorIconBtnStyle, color: 'var(--accent-error)' }}
              title="刪除節點"
            >
              <Trash2 size={13} />
            </button>
          )}
        </div>
      )}

      {/* 6. Bottom Right Toolbar (Zoom, Fit, Reset, Export) */}
      <div
        className="glass-panel"
        style={{
          position: 'absolute',
          bottom: '24px',
          right: '88px',
          display: 'flex',
          gap: '4px',
          padding: '4px',
          borderRadius: 'var(--radius-md)',
          boxShadow: 'var(--shadow-md)',
          zIndex: 10
        }}
      >
        <button onClick={handleZoomIn} title="放大" style={toolbarBtnStyle} onMouseEnter={(e)=>e.currentTarget.style.background='rgba(255,255,255,0.05)'} onMouseLeave={(e)=>e.currentTarget.style.background='transparent'}><ZoomIn size={14} /></button>
        <button onClick={handleZoomOut} title="縮小" style={toolbarBtnStyle} onMouseEnter={(e)=>e.currentTarget.style.background='rgba(255,255,255,0.05)'} onMouseLeave={(e)=>e.currentTarget.style.background='transparent'}><ZoomOut size={14} /></button>
        <button onClick={handleReset} title="重設視角" style={toolbarBtnStyle} onMouseEnter={(e)=>e.currentTarget.style.background='rgba(255,255,255,0.05)'} onMouseLeave={(e)=>e.currentTarget.style.background='transparent'}><RotateCcw size={14} /></button>
        <button onClick={handleFitScreen} title="適應螢幕" style={toolbarBtnStyle} onMouseEnter={(e)=>e.currentTarget.style.background='rgba(255,255,255,0.05)'} onMouseLeave={(e)=>e.currentTarget.style.background='transparent'}><Maximize2 size={14} /></button>
        <div style={{ width: '1px', height: '18px', background: 'var(--border-color)', margin: 'auto 2px' }} />
        <button onClick={handleExportSVG} title="匯出 SVG 向量圖" style={toolbarBtnStyle} onMouseEnter={(e)=>e.currentTarget.style.background='rgba(255,255,255,0.05)'} onMouseLeave={(e)=>e.currentTarget.style.background='transparent'}><Download size={14} /></button>
      </div>

      {/* 7. Bottom Left Instruction helper overlay */}
      {!readOnly && (
        <div style={{
          position: 'absolute',
          bottom: '16px',
          left: '16px',
          color: 'var(--text-secondary)',
          fontSize: '11px',
          pointerEvents: 'none',
          background: 'rgba(13, 15, 22, 0.6)',
          padding: '6px 10px',
          borderRadius: 'var(--radius-sm)'
        }}>
          💡 提示：點擊節點跳出上方面板，可連線、改色、縮放或變更外觀。雙擊文字即可修改名稱。
        </div>
      )}
    </div>
  );
};

// Styling structures
const toolbarBtnStyle: React.CSSProperties = {
  width: '28px',
  height: '28px',
  borderRadius: 'var(--radius-sm)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: 'var(--text-secondary)',
  cursor: 'pointer',
  transition: 'background var(--transition-fast)',
  border: 'none',
  background: 'transparent'
};

const shapeSelectorBtnStyle: React.CSSProperties = {
  width: '32px',
  height: '32px',
  borderRadius: 'var(--radius-sm)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: 'var(--bg-input)',
  border: '1px solid var(--border-color)',
  cursor: 'pointer',
  transition: 'all var(--transition-fast)'
};

const inspectorLabelStyle: React.CSSProperties = {
  fontSize: '10px',
  fontWeight: 700,
  color: 'var(--text-muted)',
  margin: '0 2px'
};

const inspectorBtnStyle: React.CSSProperties = {
  padding: '1px 6px',
  fontSize: '11px',
  background: 'var(--bg-input)',
  border: '1px solid var(--border-color)',
  color: 'var(--text-primary)',
  borderRadius: 'var(--radius-sm)',
  cursor: 'pointer',
  fontWeight: 700
};

const inspectorIconBtnStyle: React.CSSProperties = {
  width: '24px',
  height: '24px',
  borderRadius: 'var(--radius-sm)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: 'var(--bg-input)',
  border: '1px solid var(--border-color)',
  color: 'var(--text-secondary)',
  cursor: 'pointer',
  padding: 0
};
