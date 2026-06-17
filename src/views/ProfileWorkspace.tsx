import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { Heart, MessageSquare, BookOpen, Edit2, Check, X, FileText } from 'lucide-react';

export const ProfileWorkspace: React.FC = () => {
  const { selectedUserId, currentUser, users, notes, updateProfile, navigateToView, comments } = useApp();

  // Find target user details
  const profileUser = users.find(u => u.id === selectedUserId) || currentUser;
  const isOwnProfile = currentUser && profileUser && currentUser.id === profileUser.id;

  const [isEditing, setIsEditing] = useState(false);
  const [displayName, setDisplayName] = useState(profileUser?.displayName || '');
  const [avatarUrl, setAvatarUrl] = useState(profileUser?.avatarUrl || '');
  const [saveFeedback, setSaveFeedback] = useState('');

  const [currentTheme, setCurrentTheme] = useState(() => {
    return localStorage.getItem('newtion_theme') || '';
  });

  useEffect(() => {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.attributeName === 'class') {
          setCurrentTheme(document.documentElement.className);
        }
      });
    });

    observer.observe(document.documentElement, { attributes: true });
    return () => observer.disconnect();
  }, []);

  if (!profileUser) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        color: 'var(--text-muted)'
      }}>
        使用者未登入或不存在。
      </div>
    );
  }

  // Calculate statistics
  const userNotes = notes.filter(n => n.userId === profileUser.id && !n.isTrash);
  const userPublishedNotes = userNotes.filter(n => n.isPublished && n.isPublic);
  const totalLikes = userPublishedNotes.reduce((acc, note) => acc + note.likes.length, 0);

  const getContributionColor = (count: number, theme: string) => {
    if (theme === 'light') {
      if (count === 0) return '#ebedf0';
      if (count === 1) return '#e0e7ff';
      if (count === 2) return '#c7d2fe';
      if (count === 3) return '#4f46e5';
      return '#312e81';
    } else if (theme === 'theme-sepia') {
      if (count === 0) return '#eadfbf';
      if (count === 1) return '#fed7aa';
      if (count === 2) return '#f97316';
      if (count === 3) return '#c2410c';
      return '#7c2d12';
    } else if (theme === 'theme-forest') {
      if (count === 0) return '#233c2a';
      if (count === 1) return '#064e3b';
      if (count === 2) return '#047857';
      if (count === 3) return '#10b981';
      return '#34d399';
    } else {
      // Default Slate Dark
      if (count === 0) return '#161b22';
      if (count === 1) return '#1e1b4b';
      if (count === 2) return '#312e81';
      if (count === 3) return '#4f46e5';
      return '#818cf8';
    }
  };

  const generateContributionData = () => {
    const data: Record<string, number> = {};
    if (!profileUser) return [];

    const today = new Date();
    const startDate = new Date();
    startDate.setDate(today.getDate() - 365);
    const dayOfWeek = startDate.getDay();
    startDate.setDate(startDate.getDate() - dayOfWeek);

    const tempDate = new Date(startDate);
    while (tempDate <= today) {
      const dateString = tempDate.toISOString().split('T')[0];
      data[dateString] = 0;
      tempDate.setDate(tempDate.getDate() + 1);
    }

    userNotes.forEach(note => {
      if (note.createdAt) {
        const cDate = note.createdAt.split('T')[0];
        if (data[cDate] !== undefined) {
          data[cDate] += 2;
        }
      }
      if (note.updatedAt) {
        const uDate = note.updatedAt.split('T')[0];
        const cDate = note.createdAt ? note.createdAt.split('T')[0] : '';
        if (uDate !== cDate && data[uDate] !== undefined) {
          data[uDate] += 1;
        }
      }
    });

    const weeksList: { date: Date; dateString: string; count: number }[][] = [];
    let currentWeek: { date: Date; dateString: string; count: number }[] = [];

    const dateCursor = new Date(startDate);
    while (dateCursor <= today) {
      const dateString = dateCursor.toISOString().split('T')[0];
      currentWeek.push({
        date: new Date(dateCursor),
        dateString,
        count: data[dateString] || 0
      });

      if (currentWeek.length === 7) {
        weeksList.push(currentWeek);
        currentWeek = [];
      }
      dateCursor.setDate(dateCursor.getDate() + 1);
    }

    if (currentWeek.length > 0) {
      while (currentWeek.length < 7) {
        currentWeek.push({
          date: new Date(dateCursor),
          dateString: dateCursor.toISOString().split('T')[0],
          count: 0
        });
        dateCursor.setDate(dateCursor.getDate() + 1);
      }
      weeksList.push(currentWeek);
    }

    return weeksList;
  };

  const getMonthLabels = (weeksData: any[][]) => {
    const labels: { text: string; index: number }[] = [];
    let prevMonth = -1;
    weeksData.forEach((week, index) => {
      const month = week[0].date.getMonth();
      if (month !== prevMonth) {
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        labels.push({ text: monthNames[month], index });
        prevMonth = month;
      }
    });
    return labels;
  };

  const weeks = generateContributionData();
  const monthLabels = getMonthLabels(weeks);
  const totalContributions = weeks.reduce((sum, week) => sum + week.reduce((wSum, day) => wSum + day.count, 0), 0);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveFeedback('');

    if (!displayName.trim()) {
      setSaveFeedback('暱稱不能為空');
      return;
    }

    const success = await updateProfile(displayName.trim(), avatarUrl.trim());
    if (success) {
      setSaveFeedback('個人資料已成功更新！');
      setIsEditing(false);
      setTimeout(() => setSaveFeedback(''), 3000);
    } else {
      setSaveFeedback('更新失敗，請重試');
    }
  };

  const handleCancel = () => {
    setDisplayName(profileUser.displayName);
    setAvatarUrl(profileUser.avatarUrl);
    setIsEditing(false);
    setSaveFeedback('');
  };

  return (
    <div style={{
      flex: 1,
      height: '100vh',
      overflowY: 'auto',
      background: 'var(--bg-editor)',
      padding: '2.5rem 2rem'
    }}>
      <div style={{ maxWidth: '800px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        
        {/* 1. Profile Info Card Panel */}
        <div className="glass-panel" style={{
          borderRadius: 'var(--radius-lg)',
          padding: '2rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '1.5rem',
          boxShadow: 'var(--shadow-md)',
          animation: 'fadeIn var(--transition-normal) forwards'
        }}>
          {!isEditing ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
              <img 
                src={profileUser.avatarUrl} 
                alt={profileUser.displayName} 
                style={{ width: '80px', height: '80px', borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--border-color)' }}
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <h2 style={{
                    fontSize: '24px',
                    fontWeight: 800,
                    color: 'var(--text-primary)',
                    fontFamily: 'var(--font-display)'
                  }}>
                    {profileUser.displayName}
                  </h2>
                  {isOwnProfile && (
                    <button
                      onClick={() => setIsEditing(true)}
                      title="編輯個人資料"
                      style={{
                        padding: '6px',
                        borderRadius: '50%',
                        color: 'var(--text-muted)',
                        display: 'flex',
                        background: 'rgba(255,255,255,0.04)',
                        cursor: 'pointer'
                      }}
                      onMouseEnter={(e)=>e.currentTarget.style.background='rgba(255,255,255,0.08)'}
                      onMouseLeave={(e)=>e.currentTarget.style.background='rgba(255,255,255,0.04)'}
                    >
                      <Edit2 size={13} />
                    </button>
                  )}
                </div>
                <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}>
                  @{profileUser.username}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '8px' }}>
                  加入時間：{new Date(profileUser.createdAt).toLocaleDateString('zh-TW', { year: 'numeric', month: 'long' })}
                </div>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSaveProfile} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>
                編輯個人資料
              </h3>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', flexWrap: 'wrap' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>暱稱 (Display Name)</label>
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e)=>setDisplayName(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      background: 'var(--bg-input)',
                      border: '1px solid var(--border-color)',
                      borderRadius: 'var(--radius-md)',
                      fontSize: '13px'
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>頭像 URL (Avatar URL)</label>
                  <input
                    type="text"
                    value={avatarUrl}
                    onChange={(e)=>setAvatarUrl(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      background: 'var(--bg-input)',
                      border: '1px solid var(--border-color)',
                      borderRadius: 'var(--radius-md)',
                      fontSize: '13px'
                    }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '8px', marginTop: '8px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={handleCancel}
                  style={{
                    padding: '6px 14px',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border-color)',
                    fontSize: '12.5px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  <X size={13} />
                  取消
                </button>
                <button
                  type="submit"
                  style={{
                    padding: '6px 14px',
                    borderRadius: 'var(--radius-sm)',
                    background: 'var(--brand-primary)',
                    color: '#ffffff',
                    fontSize: '12.5px',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  <Check size={13} />
                  儲存
                </button>
              </div>
            </form>
          )}

          {saveFeedback && (
            <div style={{
              fontSize: '12.5px',
              textAlign: 'center',
              color: saveFeedback.includes('成功') ? 'var(--accent-success)' : 'var(--accent-error)',
              background: saveFeedback.includes('成功') ? 'rgba(16, 185, 129, 0.08)' : 'rgba(239, 68, 68, 0.08)',
              padding: '6px',
              borderRadius: 'var(--radius-sm)'
            }}>
              {saveFeedback}
            </div>
          )}

          {/* Stats Section grid layout */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '12px',
            borderTop: '1px solid var(--border-color)',
            paddingTop: '1.5rem',
            textAlign: 'center'
          }}>
            <div>
              <div style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}>
                {userNotes.length}
              </div>
              <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginTop: '2px' }}>
                擁有筆記總數
              </div>
            </div>
            <div>
              <div style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}>
                {userPublishedNotes.length}
              </div>
              <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginTop: '2px' }}>
                已發布文章
              </div>
            </div>
            <div>
              <div style={{ fontSize: '20px', fontWeight: 800, color: 'var(--brand-secondary)', fontFamily: 'var(--font-display)' }}>
                {totalLikes}
              </div>
              <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginTop: '2px' }}>
                獲得讚數
              </div>
            </div>
          </div>
        </div>

        {/* 3. GitHub-style Contribution Calendar Panel */}
        <div className="glass-panel" style={{
          borderRadius: 'var(--radius-lg)',
          padding: '1.5rem',
          boxShadow: 'var(--shadow-md)',
          animation: 'fadeIn var(--transition-normal) forwards',
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
            <h3 style={{
              fontFamily: 'var(--font-display)',
              fontWeight: 800,
              fontSize: '18px',
              color: 'var(--text-primary)'
            }}>
              寫作貢獻圖
            </h3>
            <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
              過去一年內共累積了 <strong>{totalContributions}</strong> 次寫作活動
            </span>
          </div>

          <div style={{ overflowX: 'auto', width: '100%', paddingBottom: '8px' }}>
            <div style={{ minWidth: '760px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              
              {/* Month Labels Row */}
              <div style={{ display: 'flex', position: 'relative', height: '18px', marginLeft: '32px', marginBottom: '2px' }}>
                {monthLabels.map((label, idx) => (
                  <span
                    key={idx}
                    style={{
                      position: 'absolute',
                      left: `${label.index * 13}px`,
                      fontSize: '10px',
                      color: 'var(--text-muted)',
                      fontFamily: 'var(--font-sans)',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    {label.text}
                  </span>
                ))}
              </div>

              {/* Grid Wrapper */}
              <div style={{ display: 'flex', gap: '3px' }}>
                {/* Weekday Labels (Mon, Wed, Fri) */}
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  height: '88px',
                  width: '28px',
                  padding: '2px 0',
                  fontSize: '9px',
                  color: 'var(--text-muted)',
                  textAlign: 'left',
                  lineHeight: '10px'
                }}>
                  <span style={{ visibility: 'hidden' }}>Sun</span>
                  <span>Mon</span>
                  <span style={{ visibility: 'hidden' }}>Tue</span>
                  <span>Wed</span>
                  <span style={{ visibility: 'hidden' }}>Thu</span>
                  <span>Fri</span>
                  <span style={{ visibility: 'hidden' }}>Sat</span>
                </div>

                {/* Calendar Columns (Weeks) */}
                <div style={{ display: 'flex', gap: '3px', flex: 1 }}>
                  {weeks.map((week, weekIdx) => (
                    <div key={weekIdx} style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                      {week.map((day, dayIdx) => {
                        const cellColor = getContributionColor(day.count, currentTheme);
                        const formattedDate = new Date(day.dateString).toLocaleDateString('zh-TW', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        });
                        
                        return (
                          <div
                            key={dayIdx}
                            title={`${day.count > 0 ? `${day.count} 次寫作活動` : '無寫作活動'}，於 ${formattedDate}`}
                            style={{
                              width: '10px',
                              height: '10px',
                              backgroundColor: cellColor,
                              borderRadius: '1.5px',
                              transition: 'transform 0.1s ease, filter 0.1s ease',
                              cursor: 'pointer'
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.transform = 'scale(1.2)';
                              e.currentTarget.style.filter = 'brightness(1.2)';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.transform = 'scale(1)';
                              e.currentTarget.style.filter = 'none';
                            }}
                          />
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>

              {/* Grid Legend Footer */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                fontSize: '11px',
                color: 'var(--text-muted)',
                marginTop: '8px',
                paddingLeft: '32px'
              }}>
                <span style={{ fontSize: '10px' }}>數據包含筆記建立與內容更新記錄</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span>較少</span>
                  <div style={{ width: '10px', height: '10px', backgroundColor: getContributionColor(0, currentTheme), borderRadius: '1.5px' }} />
                  <div style={{ width: '10px', height: '10px', backgroundColor: getContributionColor(1, currentTheme), borderRadius: '1.5px' }} />
                  <div style={{ width: '10px', height: '10px', backgroundColor: getContributionColor(2, currentTheme), borderRadius: '1.5px' }} />
                  <div style={{ width: '10px', height: '10px', backgroundColor: getContributionColor(3, currentTheme), borderRadius: '1.5px' }} />
                  <div style={{ width: '10px', height: '10px', backgroundColor: getContributionColor(4, currentTheme), borderRadius: '1.5px' }} />
                  <span>較多</span>
                </div>
              </div>

            </div>
          </div>
        </div>

        {/* 2. Published articles grid lists */}
        <div>
          <h3 style={{
            fontFamily: 'var(--font-display)',
            fontWeight: 800,
            fontSize: '18px',
            color: 'var(--text-primary)',
            marginBottom: '1rem',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <BookOpen size={18} style={{ color: 'var(--brand-primary)' }} />
            {isOwnProfile ? '我已發布的文章' : `${profileUser.displayName} 發表的文章`}
            <span style={{ fontSize: '13px', fontWeight: 400, color: 'var(--text-muted)' }}>
              ({userPublishedNotes.length})
            </span>
          </h3>

          {userPublishedNotes.length === 0 ? (
            <div style={{
              padding: '48px 24px',
              textAlign: 'center',
              background: 'rgba(255,255,255,0.01)',
              border: '1px dashed var(--border-color)',
              borderRadius: 'var(--radius-lg)',
              color: 'var(--text-muted)',
              fontSize: '14px'
            }}>
              目前沒有發布的文章。
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {userPublishedNotes.map(note => {
                // Get comment count
                const commentsCount = comments.filter(c => c.noteId === note.id).length;

                return (
                  <div
                    key={note.id}
                    className="glass-panel hover-scale"
                    onClick={() => navigateToView('reader', note.id)}
                    style={{
                      borderRadius: 'var(--radius-md)',
                      padding: '16px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '16px',
                      cursor: 'pointer',
                      boxShadow: 'var(--shadow-sm)',
                      transition: 'background var(--transition-fast), transform var(--transition-fast)'
                    }}
                    onMouseEnter={(e)=>e.currentTarget.style.background='rgba(255,255,255,0.02)'}
                    onMouseLeave={(e)=>e.currentTarget.style.background='transparent'}
                  >
                    <div style={{
                      fontSize: '24px',
                      width: '40px',
                      height: '40px',
                      borderRadius: '8px',
                      background: 'rgba(255, 255, 255, 0.04)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      {note.icon || <FileText size={18} />}
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <h4 style={{
                        fontSize: '15px',
                        fontWeight: 700,
                        color: 'var(--text-primary)',
                        marginBottom: '4px',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                      }}>
                        {note.title}
                      </h4>
                      <p style={{
                        fontSize: '12px',
                        color: 'var(--text-secondary)',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                      }}>
                        {(() => {
                          if (note.type === 'mindmap') {
                            try {
                              const parsed = JSON.parse(note.content);
                              const nodesCount = parsed?.nodes?.length || 0;
                              return `🧠 心智圖頁面 • 包含 ${nodesCount} 個節點`;
                            } catch (e) {
                              return '🧠 心智圖頁面';
                            }
                          } else if (note.type === 'quiz') {
                            try {
                              const parsed = JSON.parse(note.content);
                              const qCount = parsed?.questions?.length || 0;
                              return `❓ 選擇題測驗 • 共 ${qCount} 題問題`;
                            } catch (e) {
                              return '❓ 選擇題測驗';
                            }
                          } else {
                            return note.content.replace(/[#*`\n>!\[\]]/g, '').substring(0, 100);
                          }
                        })()}
                      </p>
                    </div>

                    {/* Likes / Comments Metrics */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: 'var(--text-muted)' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px' }}>
                        <Heart size={12} style={{ color: note.likes.length > 0 ? 'var(--brand-secondary)' : 'inherit' }} />
                        {note.likes.length}
                      </span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px' }}>
                        <MessageSquare size={12} />
                        {commentsCount}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
