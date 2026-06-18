export interface User {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string;
  createdAt: string;
}

export interface Note {
  id: string;
  title: string;
  type?: 'note' | 'mindmap' | 'quiz'; // Page type indicator
  content: string; // Markdown content or JSON for mindmap/quiz
  userId: string; // Author
  parentId: string | null; // For hierarchical page nesting (Notion feature)
  isPublished: boolean; // Published to feed (HackMD / article sharing feature)
  isPublic: boolean; // Publicly searchable (or only by link if false but published)
  createdAt: string;
  updatedAt: string;
  tags: string[];
  likes: string[]; // User IDs who liked the page
  coverImage: string | null; // Cover picture selection
  icon: string | null; // Emoji symbol selection
  isTrash?: boolean; // Trash can soft-delete indicator
}

export interface Comment {
  id: string;
  noteId: string;
  userId: string;
  content: string;
  createdAt: string;
}

export interface MindMapNode {
  id: string;
  name: string;
  children: MindMapNode[];
  collapsed?: boolean;
  type?: 'root' | 'heading' | 'list';
  headingLevel?: number;
  indentLevel?: number;
  listSymbol?: string;
  lineIndex?: number;
}

export interface DragNode {
  id: string;
  name: string;
  x: number;
  y: number;
  children: DragNode[];
  collapsed?: boolean;
}

export interface GraphNode {
  id: string;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  shape: 'rect' | 'rounded-rect' | 'circle' | 'ellipse' | 'diamond' | 'triangle' | 'hexagon' | 'parallelogram' | 'cylinder' | 'star' | 'cloud' | 'document' | 'capsule';
  fontSize?: number;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
}

export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export interface Question {
  id: string;
  question: string;
  options: string[];
  answer: number;
  explanation?: string;
  attempts?: number;
  errors?: number;
}

export interface Quiz {
  title: string;
  description: string;
  questions: Question[];
}

export interface ClickLogItem {
  id: string;
  itemId: string;
  type: 'note' | 'mindmap' | 'quiz' | 'profile';
  title: string;
  icon?: string | null;
  timestamp: string;
  userId: string;
}

export interface Message {
  id: string;
  senderId: string;
  receiverId: string;
  subject: string;
  content: string;
  createdAt: string;
  isRead: boolean;
  attachedNoteId?: string;
  attachedNoteData?: {
    title: string;
    type: 'note' | 'mindmap' | 'quiz';
    content: string;
    icon: string | null;
    coverImage: string | null;
  };
}

