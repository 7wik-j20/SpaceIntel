'use client';
import { useEffect, useState, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useTranslation } from 'react-i18next';

export default function Sidebar({ layout = 'futuristic' }) {
  const [sessions, setSessions]       = useState([]);
  const [activeSession, setActiveSession] = useState(null);
  const [selectedSessions, setSelectedSessions] = useState([]);
  const [hoveredSession, setHoveredSession] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [renamingSession, setRenamingSession] = useState(null);
  const [pinningSession, setPinningSession] = useState(null);
  const [deletingSessions, setDeletingSessions] = useState(false);
  const [isLoggedIn, setIsLoggedIn]   = useState(false);
  const [networkStatus, setNetworkStatus] = useState(
    typeof navigator !== 'undefined' && !navigator.onLine ? 'offline' : 'strong'
  );
  const router = useRouter();
  const pathname = usePathname();
  const isProfileAligned = layout === 'profile';
  const { t } = useTranslation();

  const fetchSessions = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token || token === 'undefined' || token === 'null') {
        setIsLoggedIn(false);
        setSessions([]);
        return;
      }
      const res  = await fetch('http://localhost:8000/history/sessions', {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setIsLoggedIn(false);
        setSessions([]);
        return;
      }

      if (!res.ok) {
        throw new Error(`Failed to load sessions: ${res.status}`);
      }

      const data = await res.json();
      const ordered = [...(data.sessions || [])].sort((a, b) => {
        if (!!a.pinned !== !!b.pinned) return a.pinned ? -1 : 1;
        return (b.created_at || '').localeCompare(a.created_at || '');
      });
      setSessions(ordered);
    } catch (err) {
      console.error('Failed to load sessions', err);
    }
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      setIsLoggedIn(true);
      fetchSessions();
    }
    const current = localStorage.getItem('session_id');
    if (current) setActiveSession(current);
  }, [fetchSessions]);

  // Listen for new messages so sidebar refreshes after first message in a new chat
  useEffect(() => {
    const handler = () => fetchSessions();
    window.addEventListener('spaceintel:session-updated', handler);
    return () => window.removeEventListener('spaceintel:session-updated', handler);
  }, [fetchSessions]);

  useEffect(() => {
    const resolveNetworkStatus = () => {
      if (!navigator.onLine) {
        setNetworkStatus('offline');
        return;
      }

      const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
      if (!connection) {
        setNetworkStatus('strong');
        return;
      }

      const effectiveType = (connection.effectiveType || '').toLowerCase();
      const downlink = typeof connection.downlink === 'number' ? connection.downlink : null;

      const isStrongType = effectiveType === '4g';
      const isStrongDownlink = downlink !== null ? downlink >= 5 : false;
      setNetworkStatus(isStrongType || isStrongDownlink ? 'strong' : 'medium');
    };

    const probeConnection = async () => {
      if (!navigator.onLine) {
        setNetworkStatus('offline');
        return;
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3500);

      try {
        const res = await fetch('http://localhost:8000/', {
          method: 'GET',
          cache: 'no-store',
          signal: controller.signal,
        });

        if (!res.ok) {
          throw new Error('Network probe failed');
        }

        resolveNetworkStatus();
      } catch {
        setNetworkStatus('offline');
      } finally {
        clearTimeout(timeoutId);
      }
    };

    probeConnection();
    const probeInterval = setInterval(probeConnection, 10000);

    const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    window.addEventListener('online', probeConnection);
    window.addEventListener('offline', resolveNetworkStatus);
    if (connection && connection.addEventListener) {
      connection.addEventListener('change', resolveNetworkStatus);
    }

    return () => {
      clearInterval(probeInterval);
      window.removeEventListener('online', probeConnection);
      window.removeEventListener('offline', resolveNetworkStatus);
      if (connection && connection.removeEventListener) {
        connection.removeEventListener('change', resolveNetworkStatus);
      }
    };
  }, []);

  const indicatorColor = '#00e676';
  const indicatorGlow = '0 0 8px rgba(0,230,118,0.85)';

  function newChat() {
    const id = crypto.randomUUID();
    localStorage.setItem('session_id', id);
    setActiveSession(id);
    window.dispatchEvent(new CustomEvent('spaceintel:load-session', { detail: { sessionId: id } }));
    router.push('/chat');
  }

  function openSession(sessionId) {
    localStorage.setItem('session_id', sessionId);
    setActiveSession(sessionId);
    window.dispatchEvent(new CustomEvent('spaceintel:load-session', { detail: { sessionId } }));
    router.push('/chat');
  }

  function toggleSelectSession(sessionId) {
    setSelectedSessions(prev =>
      prev.includes(sessionId)
        ? prev.filter(id => id !== sessionId)
        : [...prev, sessionId]
    );
  }

  async function deleteSelectedChats() {
    if (selectedSessions.length === 0 || deletingSessions) return;
    const confirmed = window.confirm(`Delete ${selectedSessions.length} selected chat(s)?`);
    if (!confirmed) return;

    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      setDeletingSessions(true);
      const idsToDelete = [...selectedSessions];

      await Promise.all(
        idsToDelete.map((sessionId) =>
          fetch(`http://localhost:8000/history/sessions/${sessionId}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${token}` },
          })
        )
      );

      setSessions((prev) => prev.filter((s) => !idsToDelete.includes(s.session_id)));
      setSelectedSessions([]);

      if (activeSession && idsToDelete.includes(activeSession)) {
        const id = crypto.randomUUID();
        localStorage.setItem('session_id', id);
        setActiveSession(id);
        window.dispatchEvent(new CustomEvent('spaceintel:load-session', { detail: { sessionId: id } }));
      }
    } catch (err) {
      console.error('Failed to delete selected chats', err);
    } finally {
      setDeletingSessions(false);
      fetchSessions();
    }
  }

  async function renameChat(session) {
    const newTitle = window.prompt(t('nav_rename'), session.title || 'Untitled Chat');
    if (newTitle === null) return;
    const title = newTitle.trim();
    if (!title) return;

    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      setRenamingSession(session.session_id);
      const res = await fetch(`http://localhost:8000/history/sessions/${session.session_id}/title`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ title })
      });
      if (!res.ok) throw new Error('Rename failed');
      setSessions(prev => prev.map(s => s.session_id === session.session_id ? { ...s, title } : s));
    } catch (err) {
      console.error('Failed to rename chat', err);
    } finally {
      setRenamingSession(null);
    }
  }

  async function togglePin(session) {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      const nextPinned = !session.pinned;
      setPinningSession(session.session_id);
      const res = await fetch(`http://localhost:8000/history/sessions/${session.session_id}/pin`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ pinned: nextPinned })
      });
      if (!res.ok) throw new Error('Pin update failed');

      setSessions(prev => {
        const updated = prev.map(s => s.session_id === session.session_id ? { ...s, pinned: nextPinned } : s);
        return updated.sort((a, b) => {
          if (!!a.pinned !== !!b.pinned) return a.pinned ? -1 : 1;
          return (b.created_at || '').localeCompare(a.created_at || '');
        });
      });
    } catch (err) {
      console.error('Failed to pin chat', err);
    } finally {
      setPinningSession(null);
    }
  }

  const hasAnySessions = sessions.length > 0;
  const filteredSessions = sessions.filter((s) =>
    (s.title || 'Untitled Chat').toLowerCase().includes(searchTerm.toLowerCase())
  );

  useEffect(() => {
    const validIds = new Set(sessions.map((s) => s.session_id));
    setSelectedSessions((prev) => prev.filter((id) => validIds.has(id)));
  }, [sessions]);
  const middleNavItems = [
    { label: t('nav_news'), icon: '✦', path: '/news' },
    { label: t('nav_library'), icon: '⊞', path: '/library' },
    { label: t('nav_upload'), icon: '↑', path: '/upload' },
  ];
  const profileNavItem = { label: t('nav_profile'), icon: '◯', path: '/profile' };

  return (
    <div style={{
      width: isProfileAligned ? '256px' : '260px',
      height: '100vh',
      padding: isProfileAligned ? '0' : '12px 10px',
      position: 'fixed',
      left: 0,
      top: 0,
      zIndex: 50,
    }}>

      {!isProfileAligned && (
        <div style={{
          position: 'absolute',
          top: '16px',
          bottom: '16px',
          left: '8px',
          width: '2px',
          borderRadius: '100px',
          background: 'linear-gradient(180deg, rgba(0,212,255,0.75), rgba(0,212,255,0.05))',
          boxShadow: '0 0 24px rgba(0,212,255,0.35)',
        }} />
      )}

      <div style={{
        height: '100%',
        background: isProfileAligned
          ? 'rgba(3,6,14,0.97)'
          : 'linear-gradient(180deg, rgba(10,16,32,0.96) 0%, rgba(7,12,24,0.96) 100%)',
        border: isProfileAligned
          ? 'none'
          : '1px solid rgba(255,255,255,0.08)',
        borderRight: isProfileAligned
          ? '1px solid rgba(0,212,255,0.08)'
          : '1px solid rgba(255,255,255,0.08)',
        borderRadius: isProfileAligned ? '0' : '18px',
        boxShadow: isProfileAligned
          ? 'none'
          : '0 20px 40px rgba(0,0,0,0.35), inset 0 0 0 1px rgba(0,212,255,0.08)',
        backdropFilter: isProfileAligned ? 'none' : 'blur(10px)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        position: 'relative',
      }}>

        {!isProfileAligned && (
          <div style={{
            position: 'absolute',
            top: '-60px',
            right: '-50px',
            width: '160px',
            height: '160px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(0,212,255,0.18) 0%, rgba(0,212,255,0) 70%)',
            pointerEvents: 'none',
          }} />
        )}

      {/* Logo */}
      <div style={{
        padding: isProfileAligned ? '18px 16px 14px' : '16px 14px 12px',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '28px', height: '28px', borderRadius: '8px',
            background: 'rgba(0,212,255,0.12)',
            border: '1px solid rgba(0,212,255,0.25)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '14px', color: '#00d4ff', flexShrink: 0,
            boxShadow: '0 0 14px rgba(0,212,255,0.25)',
          }}>◈</div>
          <span style={{
            fontSize: '15px', fontWeight: '700', color: '#00d4ff',
            letterSpacing: '3px', fontFamily: 'Orbitron, sans-serif',
          }}>
            {t('app_name').toUpperCase()}
          </span>
        </div>
        <div
          title={t('nav_settings')}
          style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            background: indicatorColor,
            boxShadow: indicatorGlow,
          }}
        />
      </div>

      {/* New Chat button */}
      <div style={{ padding: '12px 12px 10px' }}>
        <button
          onClick={newChat}
          style={{
            width: '100%',
            padding: '10px 12px',
            background: 'rgba(255,255,255,0.035)',
            border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: '14px',
            color: 'rgba(255,255,255,0.9)',
            fontSize: '13px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '10px',
            transition: 'all 0.18s ease',
            fontFamily: 'DM Sans, sans-serif',
            boxShadow: '0 8px 18px rgba(0,0,0,0.22)',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background = 'rgba(255,255,255,0.06)';
            e.currentTarget.style.borderColor = 'rgba(255,255,255,0.22)';
            e.currentTarget.style.transform = 'translateY(-1px)';
            e.currentTarget.style.boxShadow = '0 10px 24px rgba(0,0,0,0.28)';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = 'rgba(255,255,255,0.035)';
            e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)';
            e.currentTarget.style.transform = 'translateY(0px)';
            e.currentTarget.style.boxShadow = '0 8px 18px rgba(0,0,0,0.22)';
          }}
        >
          <span style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '22px',
            height: '22px',
            borderRadius: '7px',
            background: 'rgba(255,255,255,0.08)',
            border: '1px solid rgba(255,255,255,0.18)',
            color: 'rgba(255,255,255,0.92)',
            fontSize: '14px',
            lineHeight: 1,
            flexShrink: 0,
          }}>+</span>
          <span style={{ flex: 1, textAlign: 'left' }}>{t('nav_new_chat')}</span>
          <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.45)' }}>⌘K</span>
        </button>
      </div>

      {/* Session list */}
      <div style={{
        flex: 1, overflowY: 'auto', padding: '6px 10px 10px',
        scrollbarWidth: 'thin',
        scrollbarColor: 'rgba(255,255,255,0.08) transparent',
      }}>
        {isLoggedIn && (
          <div style={{ marginBottom: '8px' }}>
            <input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={t('nav_search')}
              style={{
                width: '100%',
                padding: '8px 10px',
                borderRadius: '10px',
                border: '1px solid rgba(255,255,255,0.1)',
                background: 'rgba(255,255,255,0.03)',
                color: 'rgba(255,255,255,0.92)',
                fontFamily: 'DM Sans, sans-serif',
                fontSize: '12px',
                outline: 'none',
              }}
            />
          </div>
        )}

        {isLoggedIn && selectedSessions.length > 0 && (
          <div
            style={{
              marginBottom: '8px',
              padding: '8px 10px',
              borderRadius: '10px',
              border: '1px solid rgba(255,82,82,0.22)',
              background: 'rgba(255,82,82,0.06)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '8px',
            }}
          >
            <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.78)', fontFamily: 'JetBrains Mono, monospace' }}>
              {selectedSessions.length} SELECTED
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <div
                role="button"
                onClick={() => setSelectedSessions([])}
                style={{
                  border: '1px solid rgba(255,255,255,0.18)',
                  borderRadius: '6px',
                  background: 'rgba(255,255,255,0.06)',
                  color: 'rgba(255,255,255,0.86)',
                  padding: '2px 6px',
                  fontSize: '10px',
                  cursor: 'pointer',
                  userSelect: 'none',
                }}
              >
                CLEAR
              </div>
              <div
                role="button"
                onClick={deleteSelectedChats}
                style={{
                  border: '1px solid rgba(255,82,82,0.35)',
                  borderRadius: '6px',
                  background: 'rgba(255,82,82,0.12)',
                  color: '#ff8a8a',
                  padding: '2px 6px',
                  fontSize: '10px',
                  cursor: deletingSessions ? 'not-allowed' : 'pointer',
                  userSelect: 'none',
                  opacity: deletingSessions ? 0.5 : 1,
                }}
              >
                {deletingSessions ? '...' : 'DELETE'}
              </div>
            </div>
          </div>
        )}

        {!isLoggedIn ? (
          <div style={{
            padding: '24px 12px', textAlign: 'center',
            color: 'rgba(255,255,255,0.2)', fontSize: '12px',
            lineHeight: '1.6',
          }}>
            {t('login_title')} {t('nav_chat')}
          </div>
        ) : !hasAnySessions ? (
          <div style={{
            padding: '24px 12px', textAlign: 'center',
            color: 'rgba(255,255,255,0.2)', fontSize: '12px',
            lineHeight: '1.6',
          }}>
            {t('nav_no_history')}
          </div>
        ) : filteredSessions.length === 0 ? (
          <div style={{
            padding: '20px 12px', textAlign: 'center',
            color: 'rgba(255,255,255,0.26)', fontSize: '12px',
            lineHeight: '1.6',
          }}>
            {t('nav_no_search_results')}
          </div>
        ) : (
          filteredSessions.map(s => {
            const isActive  = activeSession === s.session_id;
            const isSelected = selectedSessions.includes(s.session_id);
            const isHovered = hoveredSession === s.session_id;
            return (
              <div
                key={s.session_id}
                onClick={() => openSession(s.session_id)}
                onMouseEnter={() => setHoveredSession(s.session_id)}
                onMouseLeave={() => setHoveredSession(null)}
                style={{
                  padding: '8px 12px',
                  borderRadius: '10px',
                  cursor: 'pointer',
                  fontSize: '13px',
                  color: isActive
                    ? '#ffffff'
                    : 'rgba(255,255,255,0.55)',
                  background: isActive
                    ? 'linear-gradient(90deg, rgba(0,212,255,0.22), rgba(255,255,255,0.1))'
                    : isHovered
                      ? 'rgba(255,255,255,0.08)'
                      : 'rgba(255,255,255,0.03)',
                  marginBottom: '6px',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  transition: 'all 0.14s',
                  border: isActive
                    ? '1px solid rgba(0,212,255,0.48)'
                    : '1px solid rgba(255,255,255,0.08)',
                  fontFamily: 'DM Sans, sans-serif',
                  lineHeight: '1.4',
                  textAlign: 'center',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  boxShadow: isActive
                    ? '0 8px 20px rgba(0,212,255,0.16)'
                    : 'none',
                }}
                title={s.title || 'Untitled Chat'}
              >
                <div
                  role="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleSelectSession(s.session_id);
                  }}
                  style={{
                    width: '20px',
                    height: '20px',
                    borderRadius: '6px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    userSelect: 'none',
                    fontSize: '11px',
                    color: isSelected ? '#00d4ff' : 'rgba(255,255,255,0.38)',
                    background: isSelected ? 'rgba(0,212,255,0.15)' : 'rgba(255,255,255,0.04)',
                    border: isSelected ? '1px solid rgba(0,212,255,0.4)' : '1px solid rgba(255,255,255,0.12)',
                  }}
                >
                  {isSelected ? '✓' : '◻'}
                </div>
                <span style={{
                  flex: 1,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  padding: '0 8px',
                }}>
                  {s.pinned ? '📌 ' : ''}{s.title || 'Untitled Chat'}
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      togglePin(s);
                    }}
                    disabled={pinningSession === s.session_id}
                    title={s.pinned ? t('nav_unpin') : t('nav_pin')}
                    style={{
                      border: '1px solid rgba(255,255,255,0.15)',
                      borderRadius: '6px',
                      background: 'rgba(255,255,255,0.04)',
                      color: 'rgba(255,255,255,0.8)',
                      padding: '2px 5px',
                      fontSize: '10px',
                      cursor: 'pointer',
                    }}
                  >
                    {pinningSession === s.session_id ? '…' : (s.pinned ? t('nav_unpin').toUpperCase() : t('nav_pin').toUpperCase())}
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      renameChat(s);
                    }}
                    disabled={renamingSession === s.session_id}
                    title={t('nav_rename')}
                    style={{
                      border: '1px solid rgba(255,255,255,0.15)',
                      borderRadius: '6px',
                      background: 'rgba(255,255,255,0.04)',
                      color: 'rgba(255,255,255,0.8)',
                      padding: '2px 5px',
                      fontSize: '10px',
                      cursor: 'pointer',
                    }}
                  >
                    {renamingSession === s.session_id ? '…' : t('nav_rename').toUpperCase()}
                  </button>
                  <span style={{
                    fontSize: '11px',
                    color: isActive ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.35)',
                  }}>›</span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Bottom nav */}
      <div style={{
        padding: '10px 12px 14px',
        borderTop: '1px solid rgba(255,255,255,0.08)',
        minHeight: '220px',
        display: 'flex',
        flexDirection: 'column',
      }}>
        <div style={{
          flex: 1,
          display: 'flex',
          alignItems: 'flex-start',
          paddingTop: '10px',
        }}>
          <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          width: '100%',
          padding: '6px',
          borderRadius: '12px',
          background: 'rgba(255,255,255,0.02)',
          border: '1px solid rgba(255,255,255,0.07)',
        }}>
          {middleNavItems.map(item => {
            const isCurrent = pathname === item.path;
            return (
            <div
            key={item.path}
            onClick={() => router.push(item.path)}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
              padding: '9px 10px', borderRadius: '10px',
              cursor: 'pointer', fontSize: '13px',
              color: isCurrent ? '#ffffff' : 'rgba(255,255,255,0.45)',
              transition: 'all 0.1s',
              fontFamily: 'DM Sans, sans-serif',
              textAlign: 'center',
              background: isCurrent
                ? 'linear-gradient(90deg, rgba(0,212,255,0.2), rgba(0,212,255,0.08))'
                : 'rgba(255,255,255,0.025)',
              border: isCurrent
                ? '1px solid rgba(0,212,255,0.45)'
                : '1px solid rgba(255,255,255,0.08)',
              boxShadow: isCurrent
                ? '0 8px 18px rgba(0,212,255,0.18)'
                : 'none',
            }}
            onMouseEnter={e => {
              if (!isCurrent) {
                e.currentTarget.style.background = 'rgba(255,255,255,0.07)';
                e.currentTarget.style.borderColor = 'rgba(0,212,255,0.3)';
              }
              e.currentTarget.style.color = 'rgba(255,255,255,0.8)';
            }}
            onMouseLeave={e => {
              if (!isCurrent) {
                e.currentTarget.style.background = 'rgba(255,255,255,0.025)';
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)';
                e.currentTarget.style.color = 'rgba(255,255,255,0.45)';
              } else {
                e.currentTarget.style.color = '#ffffff';
              }
            }}
          >
            <span style={{ fontSize: '15px', opacity: 0.6 }}>{item.icon}</span>
            <span>{item.label}</span>
          </div>
          );
          })}
        </div>
        </div>

        <div style={{ paddingTop: '8px' }}>
          {(() => {
            const isCurrent = pathname === profileNavItem.path;
            return (
              <div
                onClick={() => router.push(profileNavItem.path)}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
                  padding: '9px 10px', borderRadius: '10px',
                  cursor: 'pointer', fontSize: '13px',
                  color: isCurrent ? '#ffffff' : 'rgba(255,255,255,0.45)',
                  transition: 'all 0.1s',
                  fontFamily: 'DM Sans, sans-serif',
                  textAlign: 'center',
                  background: isCurrent
                    ? 'linear-gradient(90deg, rgba(0,212,255,0.2), rgba(0,212,255,0.08))'
                    : 'rgba(255,255,255,0.025)',
                  border: isCurrent
                    ? '1px solid rgba(0,212,255,0.45)'
                    : '1px solid rgba(255,255,255,0.08)',
                  boxShadow: isCurrent
                    ? '0 8px 18px rgba(0,212,255,0.18)'
                    : 'none',
                }}
                onMouseEnter={e => {
                  if (!isCurrent) {
                    e.currentTarget.style.background = 'rgba(255,255,255,0.07)';
                    e.currentTarget.style.borderColor = 'rgba(0,212,255,0.3)';
                  }
                  e.currentTarget.style.color = 'rgba(255,255,255,0.8)';
                }}
                onMouseLeave={e => {
                  if (!isCurrent) {
                    e.currentTarget.style.background = 'rgba(255,255,255,0.025)';
                    e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)';
                    e.currentTarget.style.color = 'rgba(255,255,255,0.45)';
                  } else {
                    e.currentTarget.style.color = '#ffffff';
                  }
                }}
              >
                <span style={{ fontSize: '15px', opacity: 0.6 }}>{profileNavItem.icon}</span>
                <span>{profileNavItem.label}</span>
              </div>
            );
          })()}
        </div>
      </div>

      </div>

    </div>
  );
}