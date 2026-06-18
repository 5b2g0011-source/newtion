import React, { createContext, useContext, useState, useEffect } from 'react';
import type { User, Note, Comment, ClickLogItem, Message } from '../types';
import { db } from '../db';
import { isFirebaseConfigured, auth, db as firestore } from '../firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, onSnapshot, doc, getDoc, query, where, updateDoc, deleteField } from 'firebase/firestore';

interface AppContextType {
  currentUser: User | null;
  users: User[];
  notes: Note[];
  comments: Comment[]; // Synced reactively
  activeNoteId: string | null;
  activeView: 'editor' | 'explore' | 'reader' | 'profile' | 'trash' | 'media' | 'home' | 'inbox';
  selectedReaderNoteId: string | null;
  selectedUserId: string | null;
  searchOpen: boolean;
  authModalOpen: boolean;
  authModalTab: 'login' | 'register';
  isCloud: boolean;
  clickHistory: ClickLogItem[];
  
  // Modals & Sidebar toggles
  setSearchOpen: (open: boolean) => void;
  setAuthModalOpen: (open: boolean) => void;
  setAuthModalTab: (tab: 'login' | 'register') => void;
  
  // Navigation / View state
  setActiveNoteId: (id: string | null) => void;
  navigateToView: (view: 'editor' | 'explore' | 'reader' | 'profile' | 'trash' | 'media' | 'home' | 'inbox', targetId?: string | null) => void;
  
  // Actions
  loginWithGoogle: () => Promise<boolean>;
  login: (username: string, password: string) => boolean | string;
  register: (username: string, displayName: string, password: string) => boolean | string;
  logout: () => Promise<void>;
  updateProfile: (displayName: string, avatarUrl: string) => Promise<boolean>;
  createNote: (parentId: string | null, type?: 'note' | 'mindmap' | 'quiz') => Promise<string>;
  updateNote: (id: string, updates: Partial<Omit<Note, 'id' | 'userId' | 'createdAt'>>) => Promise<void>;
  deleteNote: (id: string) => Promise<void>;
  restoreNote: (id: string) => Promise<void>;
  deleteNotePermanently: (id: string) => Promise<void>;
  addComment: (noteId: string, content: string) => Promise<void>;
  deleteComment: (commentId: string) => Promise<void>;
  toggleLike: (noteId: string) => Promise<void>;
  clearClickHistory: () => void;
  removeClickHistoryItem: (id: string) => void;
  refreshData: () => void;

  // Direct Messaging
  messages: Message[];
  sendMessage: (
    receiverId: string, 
    subject: string, 
    content: string,
    attachedNoteId?: string,
    attachedNoteData?: {
      title: string;
      type: 'note' | 'mindmap' | 'quiz';
      content: string;
      icon: string | null;
      coverImage: string | null;
    }
  ) => Promise<void>;
  deleteMessage: (messageId: string) => Promise<void>;
  markMessageAsRead: (messageId: string) => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [localNotes, setLocalNotes] = useState<Note[]>([]);
  const [publicNotes, setPublicNotes] = useState<Note[]>([]);
  const [userNotes, setUserNotes] = useState<Note[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  
  // Guest notes state
  const [guestNotes, setGuestNotes] = useState<Note[]>(() => {
    const saved = sessionStorage.getItem('newtion_guest_notes');
    if (saved) return JSON.parse(saved);
    return [{
      id: 'note-welcome-guest',
      title: '歡迎來到 Newtion (訪客模式)! 👋',
      content: `# 歡迎來到 Newtion (訪客模式)! 👋

您目前以 **訪客身份** 使用離線模式。

* 您的資料將不會儲存到雲端或本機資料庫（重新整理或關閉視窗後可能消失）。
* 您可以點擊編輯器右上角的 **「下載檔案」** 來將筆記匯出為 \`.md\` 或 \`.txt\` 檔案。
* 您也可以建立子頁面與使用 LaTeX 數學公式，例如：$E = mc^2$。
`,
      userId: 'guest',
      parentId: null,
      isPublished: false,
      isPublic: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      tags: ['訪客', '離線'],
      likes: [],
      coverImage: 'linear-gradient(135deg, #181c2c 0%, #2a314d 100%)',
      icon: '⚡'
    }];
  });

  const notes = React.useMemo(() => {
    if (!isFirebaseConfigured) {
      return localNotes;
    }
    const merged = [...userNotes];
    const userNoteIds = new Set(userNotes.map(n => n.id));
    for (const note of publicNotes) {
      if (!userNoteIds.has(note.id)) {
        merged.push(note);
      }
    }
    if (!currentUser) {
      for (const note of guestNotes) {
        if (!userNoteIds.has(note.id)) {
          merged.push(note);
        }
      }
    }
    return merged;
  }, [isFirebaseConfigured, localNotes, publicNotes, userNotes, guestNotes, currentUser]);

  // View states
  const [activeNoteId, setActiveNoteIdState] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<'editor' | 'explore' | 'reader' | 'profile' | 'trash' | 'media' | 'home' | 'inbox'>('home'); // Home by default!
  const [selectedReaderNoteId, setSelectedReaderNoteId] = useState<string | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  // Click History tracking
  const [clickHistory, setClickHistory] = useState<ClickLogItem[]>(() => {
    try {
      const saved = localStorage.getItem('newtion_click_history');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem('newtion_click_history', JSON.stringify(clickHistory));
  }, [clickHistory]);

  const clearClickHistory = () => {
    setClickHistory([]);
  };

  const removeClickHistoryItem = (id: string) => {
    setClickHistory(prev => prev.filter(item => item.id !== id));
  };
  
  // UI states
  const [searchOpen, setSearchOpen] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalTab, setAuthModalTab] = useState<'login' | 'register'>('login');

  // Sync guest notes to sessionStorage
  useEffect(() => {
    sessionStorage.setItem('newtion_guest_notes', JSON.stringify(guestNotes));
  }, [guestNotes]);

  const refreshData = () => {
    if (!isFirebaseConfigured) {
      setUsers(db.getUsers());
      setLocalNotes(db.getNotes());
      const allComments = JSON.parse(localStorage.getItem('newtion_comments') || '[]');
      setComments(allComments);
      const allMessages = JSON.parse(localStorage.getItem('newtion_messages') || '[]');
      setMessages(allMessages);
      setCurrentUser(db.getCurrentUser());
    }
  };

  // Real-time Firebase Subscriptions OR Local Storage Initialization
  useEffect(() => {
    if (isFirebaseConfigured) {
      let unsubUserNotes: (() => void) | null = null;
      let unsubMessages: (() => void) | null = null;

      // 1. Auth subscription
      const unsubAuth = onAuthStateChanged(auth, async (firebaseUser) => {
        // Unsubscribe from previous user notes subscription if any
        if (unsubUserNotes) {
          unsubUserNotes();
          unsubUserNotes = null;
        }
        if (unsubMessages) {
          unsubMessages();
          unsubMessages = null;
        }

        if (firebaseUser) {
          const userDocRef = doc(firestore, 'users', firebaseUser.uid);
          const snap = await getDoc(userDocRef);
          if (snap.exists()) {
            setCurrentUser(snap.data() as User);
          } else {
            setCurrentUser({
              id: firebaseUser.uid,
              username: firebaseUser.email?.split('@')[0] || firebaseUser.uid,
              displayName: firebaseUser.displayName || 'Google 用戶',
              avatarUrl: firebaseUser.photoURL || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&h=150&q=80',
              createdAt: new Date().toISOString()
            });
          }

          // Subscribe to logged-in user's own notes
          const qUser = query(
            collection(firestore, 'notes'),
            where('userId', '==', firebaseUser.uid)
          );
          unsubUserNotes = onSnapshot(qUser, (snapshot) => {
            const list = snapshot.docs.map(doc => {
              const data = doc.data();
              const hasLegacyTitle = data.Title !== undefined;
              if (hasLegacyTitle) {
                const noteRef = doc.ref;
                updateDoc(noteRef, {
                  title: data.title || data.Title || '未命名頁面',
                  Title: deleteField()
                }).catch(err => console.error("Failed to migrate Title field:", err));
              }
              return {
                ...data,
                title: data.title || data.Title || '未命名頁面',
                isPublic: data.isPublic !== false,
                tags: data.tags || [],
                likes: data.likes || []
              } as Note;
            });
            setUserNotes(list);
          }, (err) => {
            console.error("User notes subscription error:", err);
          });

          // Subscribe to user's messages (both received and sent)
          const qReceived = query(
            collection(firestore, 'messages'),
            where('receiverId', '==', firebaseUser.uid)
          );
          const qSent = query(
            collection(firestore, 'messages'),
            where('senderId', '==', firebaseUser.uid)
          );

          let receivedMsgs: Message[] = [];
          let sentMsgs: Message[] = [];

          const updateMergedMessages = () => {
            const merged = [...receivedMsgs];
            const ids = new Set(receivedMsgs.map(m => m.id));
            for (const m of sentMsgs) {
              if (!ids.has(m.id)) {
                merged.push(m);
              }
            }
            merged.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
            setMessages(merged);
          };

          const unsubReceived = onSnapshot(qReceived, (snap) => {
            receivedMsgs = snap.docs.map(doc => doc.data() as Message);
            updateMergedMessages();
          }, (err) => {
            console.error("Received messages sub error:", err);
          });

          const unsubSent = onSnapshot(qSent, (snap) => {
            sentMsgs = snap.docs.map(doc => doc.data() as Message);
            updateMergedMessages();
          }, (err) => {
            console.error("Sent messages sub error:", err);
          });

          unsubMessages = () => {
            unsubReceived();
            unsubSent();
          };
        } else {
          setCurrentUser(null);
          setUserNotes([]);
          setMessages([]);
        }
      });

      // 2. Public Notes subscription
      const qPublic = query(
        collection(firestore, 'notes'),
        where('isPublished', '==', true),
        where('isPublic', '==', true)
      );
      const unsubPublicNotes = onSnapshot(qPublic, (snapshot) => {
        const list = snapshot.docs.map(doc => {
          const data = doc.data();
          return {
            ...data,
            title: data.title || data.Title || '未命名頁面',
            isPublic: data.isPublic !== false,
            tags: data.tags || [],
            likes: data.likes || []
          } as Note;
        });
        setPublicNotes(list);
      }, (err) => {
        console.error("Public notes subscription error:", err);
      });

      // 3. Users subscription
      const unsubUsers = onSnapshot(collection(firestore, 'users'), (snapshot) => {
        const usersList = snapshot.docs.map(doc => doc.data() as User);
        setUsers(usersList);
      });

      // 4. Comments subscription
      const unsubComments = onSnapshot(collection(firestore, 'comments'), (snapshot) => {
        const commentsList = snapshot.docs.map(doc => doc.data() as Comment);
        setComments(commentsList);
      });

      return () => {
        unsubAuth();
        if (unsubUserNotes) unsubUserNotes();
        if (unsubMessages) unsubMessages();
        unsubPublicNotes();
        unsubUsers();
        unsubComments();
      };
    } else {
      refreshData();
    }
  }, []);

  // Set default note when notes list or current user loads
  useEffect(() => {
    const activeNotes = currentUser ? notes.filter(n => n.userId === currentUser.id && !n.isTrash) : guestNotes.filter(n => !n.isTrash);
    if (activeNotes.length > 0 && !activeNoteId) {
      const topLevel = activeNotes.find(n => n.parentId === null);
      setActiveNoteIdState(topLevel ? topLevel.id : activeNotes[0].id);
    }
  }, [notes, guestNotes, currentUser, activeNoteId]);

  const recordClick = (view: string, targetId: string | null) => {
    if (!targetId) return;
    
    const currentUserId = currentUser ? currentUser.id : 'guest';
    
    let title = '';
    let icon: string | null | undefined = null;
    let type: ClickLogItem['type'] = 'note';
    
    if (view === 'editor' || view === 'reader') {
      const note = notes.find(n => n.id === targetId);
      if (!note) return;
      
      title = note.title || (note.type === 'mindmap' ? '未命名心智圖' : note.type === 'quiz' ? '未命名測驗' : '未命名筆記');
      icon = note.icon;
      type = note.type || 'note';
    } else if (view === 'profile') {
      const user = users.find(u => u.id === targetId);
      const isSelf = currentUser && currentUser.id === targetId;
      const displayUser = isSelf ? currentUser : user;
      if (!displayUser) return;
      
      title = `${displayUser.displayName} 的個人檔案`;
      icon = '👤';
      type = 'profile';
    } else {
      return;
    }
    
    setClickHistory(prev => {
      const filtered = prev.filter(item => !(item.itemId === targetId && item.type === type && item.userId === currentUserId));
      const newItem: ClickLogItem = {
        id: Math.random().toString(36).substring(2, 9),
        itemId: targetId,
        type,
        title,
        icon,
        timestamp: new Date().toISOString(),
        userId: currentUserId
      };
      return [newItem, ...filtered].slice(0, 50);
    });
  };

  const navigateToView = (view: 'editor' | 'explore' | 'reader' | 'profile' | 'trash' | 'media' | 'home' | 'inbox', targetId?: string | null) => {
    setActiveView(view);
    if (view === 'home') {
      setSelectedUserId(null);
    } else if (view === 'editor') {
      if (targetId) {
        setActiveNoteIdState(targetId);
      } else if (!activeNoteId) {
        const activeNotes = currentUser ? notes.filter(n => n.userId === currentUser.id && !n.isTrash) : guestNotes.filter(n => !n.isTrash);
        if (activeNotes.length > 0) {
          setActiveNoteIdState(activeNotes[0].id);
        }
      }
    } else if (view === 'reader') {
      setSelectedReaderNoteId(targetId || null);
    } else if (view === 'profile') {
      setSelectedUserId(targetId || (currentUser ? currentUser.id : null));
    }
    
    if (targetId) {
      recordClick(view, targetId);
    }
  };

  const setActiveNoteId = (id: string | null) => {
    setActiveNoteIdState(id);
    if (id) {
      setActiveView('editor');
      recordClick('editor', id);
    }
  };

  // Google OAuth Login
  const handleLoginWithGoogle = async (): Promise<boolean> => {
    const user = await db.loginWithGoogle();
    if (user) {
      setCurrentUser(user);
      setAuthModalOpen(false);
      refreshData();
      return true;
    }
    return false;
  };

  // Auth Operations
  const handleLogin = (username: string, password: string): boolean | string => {
    const user = db.localLogin(username, password);
    if (user) {
      setCurrentUser(user);
      setAuthModalOpen(false);
      refreshData();
      return true;
    }
    return '帳號或密碼錯誤';
  };

  const handleRegister = (username: string, displayName: string, password: string): boolean | string => {
    const res = db.localRegister(username, displayName, password);
    if (typeof res === 'string') {
      return res;
    }
    setCurrentUser(res);
    setAuthModalOpen(false);
    refreshData();
    return true;
  };

  const handleLogout = async () => {
    await db.logout();
    setCurrentUser(null);
    setActiveNoteIdState(null);
    navigateToView('explore');
    refreshData();
  };

  const handleUpdateProfile = async (displayName: string, avatarUrl: string): Promise<boolean> => {
    if (!currentUser) return false;
    const updated = await db.updateProfile(currentUser.id, displayName, avatarUrl);
    if (updated) {
      if (!isFirebaseConfigured) {
        setCurrentUser(updated);
        refreshData();
      }
      return true;
    }
    return false;
  };

  // Notes Operations
  const handleCreateNote = async (
    parentId: string | null, 
    type: 'note' | 'mindmap' | 'quiz' = 'note'
  ): Promise<string> => {
    const title = type === 'note' ? '未命名頁面' : type === 'mindmap' ? '未命名心智圖' : '未命名測驗';
    
    if (!currentUser) {
      // Guest mode
      const noteId = 'guest-note-' + Math.random().toString(36).substr(2, 9);
      
      let content = `# ${title}\n\n從這裡開始編寫你的 Markdown 內容...`;
      let icon = '📄';

      if (type === 'mindmap') {
        content = JSON.stringify({
          nodes: [
            {
              id: 'root',
              name: title,
              x: 0,
              y: 0,
              width: 160,
              height: 40,
              color: '#6366f1',
              shape: 'rounded-rect'
            }
          ],
          edges: []
        });
        icon = '🧠';
      } else if (type === 'quiz') {
        content = JSON.stringify({ title, description: '點選開始測驗', questions: [] });
        icon = '❓';
      }

      const newNote: Note = {
        id: noteId,
        title,
        type,
        content,
        userId: 'guest',
        parentId,
        isPublished: false,
        isPublic: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        tags: [],
        likes: [],
        coverImage: 'linear-gradient(135deg, #181c2c 0%, #2a314d 100%)',
        icon
      };
      setGuestNotes(prev => [...prev, newNote]);
      setActiveNoteIdState(noteId);
      setActiveView('editor');
      return noteId;
    }
    
    // Logged in mode
    const noteId = await db.createNote(currentUser.id, parentId, title, type);
    if (!isFirebaseConfigured) {
      refreshData();
    }
    setActiveNoteIdState(noteId);
    setActiveView('editor');
    return noteId;
  };

  const handleUpdateNote = async (id: string, updates: Partial<Omit<Note, 'id' | 'userId' | 'createdAt'>>) => {
    if (!currentUser) {
      // Guest mode
      setGuestNotes(prev => prev.map(n => n.id === id ? { ...n, ...updates, updatedAt: new Date().toISOString() } : n));
      return;
    }

    // Logged in mode
    await db.updateNote(id, updates);
    if (!isFirebaseConfigured) {
      refreshData();
    }
  };

  const handleDeleteNote = async (id: string) => {
    // Soft delete: set isTrash = true for this note and all its children
    const getDescendantIds = (parentId: string, notesList: Note[]): string[] => {
      const childIds = notesList.filter(n => n.parentId === parentId).map(n => n.id);
      let allChildIds = [...childIds];
      for (const cid of childIds) {
        allChildIds = [...allChildIds, ...getDescendantIds(cid, notesList)];
      }
      return allChildIds;
    };

    if (!currentUser) {
      const idsToTrash = [id, ...getDescendantIds(id, guestNotes)];
      setGuestNotes(prev => prev.map(n => idsToTrash.includes(n.id) ? { ...n, isTrash: true } : n));
      if (activeNoteId && idsToTrash.includes(activeNoteId)) {
        setActiveNoteIdState(null);
      }
      return;
    }

    // Logged in mode
    const idsToTrash = [id, ...getDescendantIds(id, notes)];
    for (const noteId of idsToTrash) {
      await db.updateNote(noteId, { isTrash: true });
    }
    if (!isFirebaseConfigured) {
      refreshData();
    }

    if (activeNoteId && idsToTrash.includes(activeNoteId)) {
      const remainingNotes = isFirebaseConfigured ? notes : db.getNotes();
      const userNotes = remainingNotes.filter(n => n.userId === currentUser.id && !n.isTrash);
      if (userNotes.length > 0) {
        setActiveNoteIdState(userNotes[0].id);
      } else {
        setActiveNoteIdState(null);
      }
    }
  };

  const handleRestoreNote = async (id: string) => {
    const getDescendantIds = (parentId: string, notesList: Note[]): string[] => {
      const childIds = notesList.filter(n => n.parentId === parentId).map(n => n.id);
      let allChildIds = [...childIds];
      for (const cid of childIds) {
        allChildIds = [...allChildIds, ...getDescendantIds(cid, notesList)];
      }
      return allChildIds;
    };

    if (!currentUser) {
      const idsToRestore = [id, ...getDescendantIds(id, guestNotes)];
      setGuestNotes(prev => prev.map(n => idsToRestore.includes(n.id) ? { ...n, isTrash: false } : n));
      return;
    }

    // Logged in mode
    const idsToRestore = [id, ...getDescendantIds(id, notes)];
    for (const noteId of idsToRestore) {
      await db.updateNote(noteId, { isTrash: false });
    }
    if (!isFirebaseConfigured) {
      refreshData();
    }
  };

  const handleDeleteNotePermanently = async (id: string) => {
    if (!currentUser) {
      const getDescendantIds = (parentId: string, notesList: Note[]): string[] => {
        const childIds = notesList.filter(n => n.parentId === parentId).map(n => n.id);
        let allChildIds = [...childIds];
        for (const cid of childIds) {
          allChildIds = [...allChildIds, ...getDescendantIds(cid, notesList)];
        }
        return allChildIds;
      };
      const idsToDelete = [id, ...getDescendantIds(id, guestNotes)];
      setGuestNotes(prev => prev.filter(n => !idsToDelete.includes(n.id)));
      return;
    }

    // Logged in mode
    await db.deleteNote(id);
    if (!isFirebaseConfigured) {
      refreshData();
    }
  };

  // Interaction Operations
  const handleAddComment = async (noteId: string, content: string) => {
    if (!currentUser) {
      setAuthModalOpen(true);
      return;
    }
    await db.addComment(noteId, currentUser.id, content);
    if (!isFirebaseConfigured) {
      refreshData();
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    await db.deleteComment(commentId);
    if (!isFirebaseConfigured) {
      refreshData();
    }
  };

  const handleToggleLike = async (noteId: string) => {
    if (!currentUser) {
      setAuthModalOpen(true);
      return;
    }
    try {
      await db.toggleLike(noteId, currentUser.id);
      if (!isFirebaseConfigured) {
        refreshData();
      }
    } catch (err: any) {
      console.error("按讚失敗:", err);
      alert("按讚失敗，原因可能為 Firebase 安全性規則尚未部署或權限不足：" + err.message);
    }
  };

  const handleSendMessage = async (
    receiverId: string, 
    subject: string, 
    content: string,
    attachedNoteId?: string,
    attachedNoteData?: {
      title: string;
      type: 'note' | 'mindmap' | 'quiz';
      content: string;
      icon: string | null;
      coverImage: string | null;
    }
  ) => {
    const senderId = currentUser ? currentUser.id : 'guest';
    await db.sendMessage(senderId, receiverId, subject, content, attachedNoteId, attachedNoteData);
    if (!isFirebaseConfigured) {
      refreshData();
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    await db.deleteMessage(messageId);
    if (!isFirebaseConfigured) {
      refreshData();
    }
  };

  const handleMarkMessageAsRead = async (messageId: string) => {
    await db.markMessageAsRead(messageId);
    if (!isFirebaseConfigured) {
      refreshData();
    }
  };

  return (
    <AppContext.Provider
      value={{
        currentUser,
        users,
        notes,
        comments,
        activeNoteId,
        activeView,
        selectedReaderNoteId,
        selectedUserId,
        searchOpen,
        authModalOpen,
        authModalTab,
        isCloud: isFirebaseConfigured,
        setSearchOpen,
        setAuthModalOpen,
        setAuthModalTab,
        setActiveNoteId,
        navigateToView,
        clickHistory,
        clearClickHistory,
        removeClickHistoryItem,
        loginWithGoogle: handleLoginWithGoogle,
        login: handleLogin,
        register: handleRegister,
        logout: handleLogout,
        updateProfile: handleUpdateProfile,
        createNote: handleCreateNote,
        updateNote: handleUpdateNote,
        deleteNote: handleDeleteNote,
        restoreNote: handleRestoreNote,
        deleteNotePermanently: handleDeleteNotePermanently,
        addComment: handleAddComment,
        deleteComment: handleDeleteComment,
        toggleLike: handleToggleLike,
        messages,
        sendMessage: handleSendMessage,
        deleteMessage: handleDeleteMessage,
        markMessageAsRead: handleMarkMessageAsRead,
        refreshData
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
