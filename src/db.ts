import type { User, Note, Comment, Message } from './types';
import { db as firestore, auth, googleProvider, isFirebaseConfigured } from './firebase';
import { 
  signInWithPopup, 
  signOut 
} from 'firebase/auth';
import { 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  getDocs, 
  collection, 
  query, 
  where,
  arrayUnion,
  arrayRemove
} from 'firebase/firestore';

// -------------------------------------------------------------
// LOCAL STORAGE ADAPTER (FALLBACK)
// -------------------------------------------------------------
const DEFAULT_USERS: User[] = [
  {
    id: 'user-1',
    username: 'notion_fan',
    displayName: 'Notion Enthusiast 🚀',
    avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&h=150&q=80',
    createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'user-2',
    username: 'hackmd_dev',
    displayName: 'Markdown Wizard 🧙‍♂️',
    avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&h=150&q=80',
    createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: 'user-3',
    username: 'newtion_team',
    displayName: 'Newtion Official ⚡',
    avatarUrl: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?auto=format&fit=crop&w=150&h=150&q=80',
    createdAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString()
  }
];

const USER_PASSWORDS: Record<string, string> = {
  'notion_fan': 'password123',
  'hackmd_dev': 'markdown456',
  'newtion_team': 'official789'
};

const DEFAULT_NOTES: Note[] = [
  {
    id: 'note-welcome',
    title: '歡迎來到 Newtion! 👋',
    content: `# 歡迎來到 Newtion! 👋

Newtion 是一個結合了 **Notion** 與 **HackMD** 優點的線上筆記與文章分享網站。

## 🌟 核心特色

1. **Notion 風格的樹狀目錄**：在左側側邊欄，你可以自由建立無限層級的子筆記，輕鬆整理知識網絡。
2. **Markdown 雙面板編輯器**：左側輸入，右側即時預覽，支援同步滾動。
3. **LaTeX 數學公式**：支援 $E = mc^2$ 行內公式與雙錢符號的區塊公式！
4. **扁平化 UI**：簡潔規整的邊框與卡片設計。

---

> [!TIP]
> **本機模式**：當前處於 LocalStorage 測試模式。您可以在左下角切換測試帳號，或是在 \`.env\` 設定 Firebase 啟用雲端同步！
`,
    userId: 'user-3',
    parentId: null,
    isPublished: true,
    isPublic: true,
    createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    tags: ['Newtion', '指南'],
    likes: ['user-1'],
    coverImage: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    icon: '🚀'
  }
];

const localDB = {
  getUsers: (): User[] => JSON.parse(localStorage.getItem('newtion_users') || JSON.stringify(DEFAULT_USERS)),
  getNotes: (): Note[] => {
    const raw = JSON.parse(localStorage.getItem('newtion_notes') || JSON.stringify(DEFAULT_NOTES));
    return raw.map((n: any) => ({
      ...n,
      isPublic: n.isPublic !== false,
      tags: n.tags || [],
      likes: n.likes || []
    }));
  },
  getComments: (): Comment[] => JSON.parse(localStorage.getItem('newtion_comments') || '[]'),
  getMessages: (): Message[] => JSON.parse(localStorage.getItem('newtion_messages') || '[]'),
  
  init: () => {
    if (!localStorage.getItem('newtion_users')) localStorage.setItem('newtion_users', JSON.stringify(DEFAULT_USERS));
    if (!localStorage.getItem('newtion_notes')) localStorage.setItem('newtion_notes', JSON.stringify(DEFAULT_NOTES));
    if (!localStorage.getItem('newtion_comments')) localStorage.setItem('newtion_comments', JSON.stringify([]));
    if (!localStorage.getItem('newtion_messages')) localStorage.setItem('newtion_messages', JSON.stringify([]));
    if (!localStorage.getItem('newtion_passwords')) localStorage.setItem('newtion_passwords', JSON.stringify(USER_PASSWORDS));
  }
};

localDB.init();

// -------------------------------------------------------------
// HYBRID DB API
// -------------------------------------------------------------
export const db = {
  isCloud: isFirebaseConfigured,

  // --- AUTH ---
  loginWithGoogle: async (): Promise<User | null> => {
    if (!isFirebaseConfigured) {
      alert('Firebase 未設定！自動切換為 LocalStorage 測試帳號登入。');
      // Log in as newtion_team for local testing if google oauth clicked on local mode
      const teamUser = localDB.getUsers().find(u => u.username === 'newtion_team') || null;
      if (teamUser) localStorage.setItem('newtion_current_user', JSON.stringify(teamUser));
      return teamUser;
    }

    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      
      // Check if user document already exists in Firestore
      const userDocRef = doc(firestore, 'users', user.uid);
      const userSnap = await getDoc(userDocRef);
      
      let finalUser: User;
      
      if (!userSnap.exists()) {
        finalUser = {
          id: user.uid,
          username: user.email?.split('@')[0] || user.uid,
          displayName: user.displayName || 'Google 用戶',
          avatarUrl: user.photoURL || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&h=150&q=80',
          createdAt: new Date().toISOString()
        };
        await setDoc(userDocRef, finalUser);
      } else {
        finalUser = userSnap.data() as User;
      }
      
      return finalUser;
    } catch (err) {
      console.error('Google login failed:', err);
      return null;
    }
  },

  logout: async (): Promise<void> => {
    if (isFirebaseConfigured) {
      await signOut(auth);
    } else {
      localStorage.removeItem('newtion_current_user');
    }
  },

  getCurrentUser: (): User | null => {
    if (isFirebaseConfigured) {
      // In firebase mode, auth state is listened in AppContext using onAuthStateChanged
      return null;
    }
    const userJson = localStorage.getItem('newtion_current_user');
    return userJson ? JSON.parse(userJson) : null;
  },

  getUsers: (): User[] => {
    // Return local users if local mode
    if (!isFirebaseConfigured) return localDB.getUsers();
    return []; // Handled reactively in AppContext via subscription
  },

  getUserById: async (id: string): Promise<User | undefined> => {
    if (isFirebaseConfigured) {
      const snap = await getDoc(doc(firestore, 'users', id));
      return snap.exists() ? (snap.data() as User) : undefined;
    }
    return localDB.getUsers().find(u => u.id === id);
  },

  updateProfile: async (userId: string, displayName: string, avatarUrl: string): Promise<User | null> => {
    if (isFirebaseConfigured) {
      const userRef = doc(firestore, 'users', userId);
      await updateDoc(userRef, { displayName, avatarUrl });
      const snap = await getDoc(userRef);
      return snap.data() as User;
    } else {
      const users = localDB.getUsers();
      const idx = users.findIndex(u => u.id === userId);
      if (idx === -1) return null;
      users[idx] = { ...users[idx], displayName, avatarUrl };
      localStorage.setItem('newtion_users', JSON.stringify(users));
      
      const curr = localStorage.getItem('newtion_current_user');
      if (curr && JSON.parse(curr).id === userId) {
        localStorage.setItem('newtion_current_user', JSON.stringify(users[idx]));
      }
      return users[idx];
    }
  },

  // --- LOCAL ONLY CREDENTIAL LOGIN ---
  localLogin: (username: string, password: string): User | null => {
    if (isFirebaseConfigured) return null; // Disabled in cloud mode
    const users = localDB.getUsers();
    const passwords: Record<string, string> = JSON.parse(localStorage.getItem('newtion_passwords') || '{}');
    const user = users.find(u => u.username.toLowerCase() === username.toLowerCase());
    if (user && passwords[user.username] === password) {
      localStorage.setItem('newtion_current_user', JSON.stringify(user));
      return user;
    }
    return null;
  },

  localRegister: (username: string, displayName: string, password: string): User | string => {
    if (isFirebaseConfigured) return '雲端模式下請使用 Google 登入';
    const users = localDB.getUsers();
    const passwords: Record<string, string> = JSON.parse(localStorage.getItem('newtion_passwords') || '{}');
    if (users.some(u => u.username.toLowerCase() === username.toLowerCase())) return '此帳號已被註冊';

    const newUser: User = {
      id: 'user-' + Math.random().toString(36).substr(2, 9),
      username,
      displayName: displayName || username,
      avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&h=150&q=80',
      createdAt: new Date().toISOString()
    };

    users.push(newUser);
    passwords[username] = password;
    localStorage.setItem('newtion_users', JSON.stringify(users));
    localStorage.setItem('newtion_passwords', JSON.stringify(passwords));
    localStorage.setItem('newtion_current_user', JSON.stringify(newUser));
    return newUser;
  },

  // --- NOTES ---
  getNotes: (): Note[] => {
    if (!isFirebaseConfigured) return localDB.getNotes();
    return []; // Handled reactively via AppContext snapshot subscription
  },

  createNote: async (
    userId: string, 
    parentId: string | null = null, 
    title: string = '未命名頁面', 
    type: 'note' | 'mindmap' | 'quiz' = 'note'
  ): Promise<string> => {
    const noteId = 'note-' + Math.random().toString(36).substr(2, 9);
    const defaultCovers = [
      'linear-gradient(135deg, #4f46e5 0%, #db2777 100%)',
      'linear-gradient(135deg, #0284c7 0%, #059669 100%)',
      'linear-gradient(135deg, #181c2c 0%, #2a314d 100%)'
    ];
    const randomCover = defaultCovers[Math.floor(Math.random() * defaultCovers.length)];

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
      userId,
      parentId,
      isPublished: false,
      isPublic: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      tags: [],
      likes: [],
      coverImage: randomCover,
      icon
    };

    if (isFirebaseConfigured) {
      await setDoc(doc(firestore, 'notes', noteId), newNote);
    } else {
      const notes = localDB.getNotes();
      notes.push(newNote);
      localStorage.setItem('newtion_notes', JSON.stringify(notes));
    }
    return noteId;
  },

  updateNote: async (id: string, updates: Partial<Omit<Note, 'id' | 'userId' | 'createdAt'>>): Promise<void> => {
    if (isFirebaseConfigured) {
      const noteRef = doc(firestore, 'notes', id);
      await updateDoc(noteRef, {
        ...updates,
        updatedAt: new Date().toISOString()
      });
    } else {
      const notes = localDB.getNotes();
      const idx = notes.findIndex(n => n.id === id);
      if (idx !== -1) {
        notes[idx] = { ...notes[idx], ...updates, updatedAt: new Date().toISOString() };
        localStorage.setItem('newtion_notes', JSON.stringify(notes));
      }
    }
  },

  deleteNote: async (id: string): Promise<void> => {
    if (isFirebaseConfigured) {
      // Find children notes to delete recursively (only user's own notes to respect security rules)
      const currentUser = auth.currentUser;
      if (!currentUser) throw new Error('User not authenticated');
      const allNotesQuery = query(
        collection(firestore, 'notes'),
        where('userId', '==', currentUser.uid)
      );
      const snap = await getDocs(allNotesQuery);
      const allNotes = snap.docs.map(d => d.data() as Note);

      const getChildIds = (parentId: string): string[] => {
        const childIds = allNotes.filter(n => n.parentId === parentId).map(n => n.id);
        let allChildIds = [...childIds];
        for (const cid of childIds) {
          allChildIds = [...allChildIds, ...getChildIds(cid)];
        }
        return allChildIds;
      };

      const idsToDelete = [id, ...getChildIds(id)];

      for (const noteId of idsToDelete) {
        await deleteDoc(doc(firestore, 'notes', noteId));
        
        // Delete associated comments
        const commentsQuery = query(collection(firestore, 'comments'), where('noteId', '==', noteId));
        const commentsSnap = await getDocs(commentsQuery);
        for (const commentDoc of commentsSnap.docs) {
          await deleteDoc(commentDoc.ref);
        }
      }
    } else {
      const notes = localDB.getNotes();
      const getChildIds = (parentId: string): string[] => {
        const childIds = notes.filter(n => n.parentId === parentId).map(n => n.id);
        let allChildIds = [...childIds];
        for (const cid of childIds) {
          allChildIds = [...allChildIds, ...getChildIds(cid)];
        }
        return allChildIds;
      };

      const idsToDelete = [id, ...getChildIds(id)];
      const filteredNotes = notes.filter(n => !idsToDelete.includes(n.id));
      localStorage.setItem('newtion_notes', JSON.stringify(filteredNotes));

      let comments = localDB.getComments();
      comments = comments.filter(c => !idsToDelete.includes(c.noteId));
      localStorage.setItem('newtion_comments', JSON.stringify(comments));
    }
  },

  // --- COMMENTS ---
  getCommentsByNote: (noteId: string): Comment[] => {
    // In Firebase mode, comments are synced inside AppContext, and filtered in UI
    if (!isFirebaseConfigured) {
      return localDB.getComments()
        .filter(c => c.noteId === noteId)
        .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    }
    return []; // Handled in AppContext state
  },

  addComment: async (noteId: string, userId: string, content: string): Promise<void> => {
    const newComment = {
      id: 'comment-' + Math.random().toString(36).substr(2, 9),
      noteId,
      userId,
      content,
      createdAt: new Date().toISOString()
    };

    if (isFirebaseConfigured) {
      await setDoc(doc(firestore, 'comments', newComment.id), newComment);
    } else {
      const comments = localDB.getComments();
      comments.push(newComment);
      localStorage.setItem('newtion_comments', JSON.stringify(comments));
    }
  },

  deleteComment: async (commentId: string): Promise<void> => {
    if (isFirebaseConfigured) {
      await deleteDoc(doc(firestore, 'comments', commentId));
    } else {
      const comments = localDB.getComments();
      const filtered = comments.filter(c => c.id !== commentId);
      localStorage.setItem('newtion_comments', JSON.stringify(filtered));
    }
  },

  // --- LIKES ---
  toggleLike: async (noteId: string, userId: string): Promise<void> => {
    if (isFirebaseConfigured) {
      const noteRef = doc(firestore, 'notes', noteId);
      const snap = await getDoc(noteRef);
      if (snap.exists()) {
        const likes = (snap.data().likes as string[]) || [];
        if (likes.includes(userId)) {
          await updateDoc(noteRef, { likes: arrayRemove(userId) });
        } else {
          await updateDoc(noteRef, { likes: arrayUnion(userId) });
        }
      }
    } else {
      const notes = localDB.getNotes();
      const idx = notes.findIndex(n => n.id === noteId);
      if (idx !== -1) {
        const note = notes[idx];
        const userIdx = note.likes.indexOf(userId);
        if (userIdx === -1) {
          note.likes.push(userId);
        } else {
          note.likes.splice(userIdx, 1);
        }
        notes[idx] = { ...note, updatedAt: new Date().toISOString() };
        localStorage.setItem('newtion_notes', JSON.stringify(notes));
      }
    }
  },

  // --- MESSAGES ---
  getMessages: (): Message[] => {
    if (!isFirebaseConfigured) {
      return JSON.parse(localStorage.getItem('newtion_messages') || '[]');
    }
    return [];
  },

  sendMessage: async (
    senderId: string, 
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
  ): Promise<void> => {
    const newMessage: Message = {
      id: 'msg-' + Math.random().toString(36).substr(2, 9),
      senderId,
      receiverId,
      subject: subject || '(無主題)',
      content,
      createdAt: new Date().toISOString(),
      isRead: false
    };

    if (attachedNoteId !== undefined) {
      newMessage.attachedNoteId = attachedNoteId;
    }
    if (attachedNoteData !== undefined) {
      newMessage.attachedNoteData = {
        title: attachedNoteData.title,
        type: attachedNoteData.type,
        content: attachedNoteData.content,
        icon: attachedNoteData.icon !== undefined ? attachedNoteData.icon : null,
        coverImage: attachedNoteData.coverImage !== undefined ? attachedNoteData.coverImage : null
      };
    }

    if (isFirebaseConfigured) {
      await setDoc(doc(firestore, 'messages', newMessage.id), newMessage);
    } else {
      const messages = JSON.parse(localStorage.getItem('newtion_messages') || '[]');
      messages.push(newMessage);
      localStorage.setItem('newtion_messages', JSON.stringify(messages));
    }
  },

  deleteMessage: async (messageId: string): Promise<void> => {
    if (isFirebaseConfigured) {
      await deleteDoc(doc(firestore, 'messages', messageId));
    } else {
      const messages = JSON.parse(localStorage.getItem('newtion_messages') || '[]');
      const filtered = messages.filter((m: any) => m.id !== messageId);
      localStorage.setItem('newtion_messages', JSON.stringify(filtered));
    }
  },

  markMessageAsRead: async (messageId: string): Promise<void> => {
    if (isFirebaseConfigured) {
      const msgRef = doc(firestore, 'messages', messageId);
      await updateDoc(msgRef, { isRead: true });
    } else {
      const messages = JSON.parse(localStorage.getItem('newtion_messages') || '[]');
      const idx = messages.findIndex((m: any) => m.id === messageId);
      if (idx !== -1) {
        messages[idx].isRead = true;
        localStorage.setItem('newtion_messages', JSON.stringify(messages));
      }
    }
  }
};
