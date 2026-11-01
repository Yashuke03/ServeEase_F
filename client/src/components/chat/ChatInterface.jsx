import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import {
  MessageSquare,
  Send,
  Loader2,
  AlertCircle,
  User,
  Clock,
  Calendar,
  Check,
  CheckCheck,
  ArrowLeft,
  Search,
  Wifi,
  WifiOff,
  RefreshCw,
  Info,
  Lock,
  X
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { chatApi, getAvatarUrl } from '../../services/api';
import { getSocket, connectSocket } from '../../services/socket';

/**
 * Full-Featured Real-Time Customer-Provider Chat Interface
 * Can operate standalone or scoped directly to a specific booking appointment.
 */
export default function ChatInterface({
  role = 'customer',
  bookingId = null,
  initialBooking = null,
  isBookingScoped = false,
  onClose = null
}) {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const effectiveBookingId = bookingId || searchParams.get('bookingId');
  const effectiveIsBookingScoped = isBookingScoped || Boolean(bookingId);

  // State
  const [conversations, setConversations] = useState([]);
  const [activeConversation, setActiveConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messageText, setMessageText] = useState('');
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);
  const [sendError, setSendError] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const messagesEndRef = useRef(null);
  const activeConvRef = useRef(null);
  activeConvRef.current = activeConversation;

  // URL Query Parameters
  const paramBookingId = searchParams.get('bookingId');
  const paramProviderId = searchParams.get('providerId');
  const paramConversationId = searchParams.get('conversationId');

  // Scroll to latest message
  const scrollToBottom = (behavior = 'smooth') => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  };

  // Fetch all authorized conversations
  const loadConversations = useCallback(async (selectTargetId = null) => {
    setLoadingConversations(true);
    setError(null);
    try {
      const res = await chatApi.getConversations();
      if (res.success && Array.isArray(res.conversations)) {
        // Deduplicate incoming conversations by canonical ID
        const uniqueConversations = [];
        const seenIds = new Set();
        for (const c of res.conversations) {
          const id = String(c._id);
          if (!seenIds.has(id)) {
            seenIds.add(id);
            uniqueConversations.push(c);
          }
        }
        setConversations(uniqueConversations);

        // Determine which conversation to activate
        let target = null;
        if (selectTargetId) {
          target = uniqueConversations.find((c) => String(c._id) === String(selectTargetId));
        } else if (activeConvRef.current) {
          target = uniqueConversations.find((c) => String(c._id) === String(activeConvRef.current._id));
        } else if (paramConversationId) {
          target = uniqueConversations.find((c) => String(c._id) === String(paramConversationId));
        }

        if (target) {
          setActiveConversation(target);
        } else if (!activeConvRef.current && uniqueConversations.length > 0 && window.innerWidth > 768) {
          setActiveConversation(uniqueConversations[0]);
        }
      }
    } catch (err) {
      setError(err.message || 'Failed to load conversations.');
    } finally {
      setLoadingConversations(false);
    }
  }, [paramConversationId]);

  // Handle booking-scoped conversation initialization
  useEffect(() => {
    if (!user || !effectiveIsBookingScoped || !effectiveBookingId) return;

    let isSubscribed = true;
    const fetchBookingConversation = async () => {
      setLoadingConversations(true);
      setError(null);
      try {
        const res = await chatApi.createOrGetConversation({
          bookingId: effectiveBookingId
        });
        if (isSubscribed && res.success && res.conversation) {
          setActiveConversation(res.conversation);
        }
      } catch (err) {
        if (isSubscribed) {
          setError(err.message || 'Could not load conversation for this booking.');
        }
      } finally {
        if (isSubscribed) {
          setLoadingConversations(false);
        }
      }
    };

    fetchBookingConversation();
    return () => {
      isSubscribed = false;
    };
  }, [user, effectiveIsBookingScoped, effectiveBookingId]);

  // Handle URL initiated conversation (e.g. from booking or provider profile)
  const isInitiatingRef = useRef(false);
  useEffect(() => {
    if (!user || effectiveIsBookingScoped) return;

    if (paramBookingId || paramProviderId) {
      if (isInitiatingRef.current) return;
      isInitiatingRef.current = true;
      const initConversation = async () => {
        try {
          const res = await chatApi.createOrGetConversation({
            bookingId: paramBookingId || undefined,
            providerId: paramProviderId || undefined
          });
          if (res.success && res.conversation) {
            setActiveConversation(res.conversation);
            // Replace URL query params so providerId is removed and conversationId is retained
            setSearchParams({ conversationId: res.conversation._id }, { replace: true });
            loadConversations(res.conversation._id);
          }
        } catch (err) {
          setError(err.message || 'Could not initiate conversation.');
        } finally {
          isInitiatingRef.current = false;
        }
      };
      initConversation();
    } else {
      loadConversations();
    }
  }, [user, paramBookingId, paramProviderId, loadConversations, setSearchParams]);

  // Load message history when active conversation changes
  useEffect(() => {
    if (!activeConversation) {
      setMessages([]);
      return;
    }

    let isSubscribed = true;
    const loadMessages = async () => {
      setLoadingMessages(true);
      setSendError(null);
      try {
        const res = await chatApi.getMessages(activeConversation._id);
        if (isSubscribed && res.success && Array.isArray(res.messages)) {
          setMessages(res.messages);
          setTimeout(() => scrollToBottom('auto'), 50);

          // Mark messages as read on the backend
          await chatApi.markAsRead(activeConversation._id);

          // Update local unread counter
          setConversations((prev) =>
            prev.map((c) =>
              c._id === activeConversation._id ? { ...c, unreadCount: 0 } : c
            )
          );
        }
      } catch (err) {
        if (isSubscribed) {
          setSendError(err.message || 'Failed to load message history.');
        }
      } finally {
        if (isSubscribed) setLoadingMessages(false);
      }
    };

    loadMessages();

    return () => {
      isSubscribed = false;
    };
  }, [activeConversation?._id]);

  // Socket.IO Setup & Event Listeners
  useEffect(() => {
    if (!user) return;

    const socket = connectSocket();

    const handleConnect = () => {
      setIsConnected(true);
      // Join active room if any
      if (activeConvRef.current?._id) {
        socket.emit('join_conversation', { conversationId: activeConvRef.current._id });
      }
    };

    const handleDisconnect = () => {
      setIsConnected(false);
    };

    const handleNewMessage = (msg) => {
      if (!msg) return;

      const currentConvId = activeConvRef.current?._id ? String(activeConvRef.current._id) : null;
      const msgConvId = String(msg.conversation?._id || msg.conversation || '');

      if (currentConvId && msgConvId === currentConvId) {
        setMessages((prev) => {
          // Avoid duplicate messages
          if (prev.some((m) => String(m._id) === String(msg._id))) return prev;
          return [...prev, msg];
        });
        setTimeout(() => scrollToBottom('smooth'), 50);

        // Mark as read if received in active window
        const currentUserId = String(user?._id || user?.id || '');
        const senderId = String(msg.sender?._id || msg.sender || '');
        if (senderId && senderId !== currentUserId) {
          chatApi.markAsRead(currentConvId).catch(() => {});
          socket.emit('mark_read', { conversationId: currentConvId });
        }
      }

      // Update conversations list preview
      setConversations((prev) => {
        const threadExists = prev.some((c) => String(c._id) === msgConvId);
        if (!threadExists) {
          // If a new conversation was started, refresh thread list from backend
          loadConversations();
          return prev;
        }

        const updated = prev.map((c) => {
          if (String(c._id) === msgConvId) {
            const isCurrent = currentConvId === msgConvId;
            return {
              ...c,
              lastMessage: {
                text: msg.text,
                sender: msg.sender?._id || msg.sender,
                createdAt: msg.createdAt
              },
              updatedAt: msg.createdAt,
              unreadCount: isCurrent ? 0 : (c.unreadCount || 0) + 1
            };
          }
          return c;
        });

        // Sort latest updated to top
        return [...updated].sort(
          (a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt)
        );
      });
    };

    const handleMessagesRead = ({ conversationId }) => {
      const currentConvId = activeConvRef.current?._id;
      if (currentConvId === conversationId) {
        setMessages((prev) =>
          prev.map((m) => ({ ...m, isRead: true, readAt: new Date() }))
        );
      }
    };

    const handleBookingStatusUpdated = ({ bookingId, status, completedAt, booking }) => {
      setActiveConversation((current) => {
        if (!current) return current;
        const bId = current.booking?._id || current.booking;
        if (bId && bId.toString() === bookingId.toString()) {
          return {
            ...current,
            booking: {
              ...(typeof current.booking === 'object' ? current.booking : {}),
              status,
              completedAt: completedAt || booking?.completedAt || current.booking?.completedAt,
              ...(booking || {})
            }
          };
        }
        return current;
      });

      setConversations((prev) =>
        prev.map((c) => {
          const bId = c.booking?._id || c.booking;
          if (bId && bId.toString() === bookingId.toString()) {
            return {
              ...c,
              booking: {
                ...(typeof c.booking === 'object' ? c.booking : {}),
                status,
                completedAt: completedAt || booking?.completedAt || c.booking?.completedAt,
                ...(booking || {})
              }
            };
          }
          return c;
        })
      );
    };

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('new_message', handleNewMessage);
    socket.on('messages_read', handleMessagesRead);
    socket.on('booking_status_updated', handleBookingStatusUpdated);

    if (socket.connected) {
      setIsConnected(true);
      if (activeConvRef.current?._id) {
        socket.emit('join_conversation', { conversationId: activeConvRef.current._id });
      }
    }

    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('new_message', handleNewMessage);
      socket.off('messages_read', handleMessagesRead);
      socket.off('booking_status_updated', handleBookingStatusUpdated);
    };
  }, [user]);

  // Join/Leave socket room when activeConversation changes
  useEffect(() => {
    const socket = getSocket();
    if (!socket || !activeConversation?._id) return;

    if (socket.connected) {
      socket.emit('join_conversation', { conversationId: activeConversation._id });
    }

    return () => {
      if (socket.connected) {
        socket.emit('leave_conversation', { conversationId: activeConversation._id });
      }
    };
  }, [activeConversation?._id]);

  // Handle Send Message
  const handleSendMessage = async (e) => {
    e?.preventDefault();
    if (!activeConversation || !messageText.trim() || sending) return;

    // Check frontend restriction
    const bStatus = activeConversation?.booking?.status;
    if (activeConversation?.booking && !['accepted', 'in_progress'].includes(bStatus)) {
      if (bStatus === 'pending') {
        setSendError('Chat becomes available after the provider accepts your request.');
      } else if (bStatus === 'completed') {
        setSendError('This service has been completed. Chat is closed for new messages.');
      } else {
        setSendError(`Chat messaging is not available while booking is ${bStatus}.`);
      }
      return;
    }

    const trimmed = messageText.trim();
    if (trimmed.length > 2000) {
      setSendError('Message exceeds maximum 2000 characters limit.');
      return;
    }

    setSending(true);
    setSendError(null);

    const socket = getSocket();
    const canUseSocket = socket && socket.connected;

    if (canUseSocket) {
      // Send via Socket.IO with callback
      socket.emit(
        'send_message',
        { conversationId: activeConversation._id, text: trimmed },
        (res) => {
          setSending(false);
          if (res && res.success) {
            setMessageText('');
            if (res.message) {
              setMessages((prev) =>
                prev.some((m) => String(m._id) === String(res.message._id)) ? prev : [...prev, res.message]
              );
              setTimeout(() => scrollToBottom('smooth'), 50);
            }
          } else if (res && !res.success && res.error) {
            setSendError(res.error);
          } else {
            // Fallback to REST API if socket send callback failed without explicit error
            fallbackRestSend(trimmed);
          }
        }
      );
    } else {
      // Fallback to REST API
      await fallbackRestSend(trimmed);
    }
  };

  const fallbackRestSend = async (text) => {
    try {
      const res = await chatApi.sendMessage(activeConversation._id, text);
      if (res.success && res.message) {
        setMessages((prev) =>
          prev.some((m) => String(m._id) === String(res.message._id)) ? prev : [...prev, res.message]
        );
        setMessageText('');
        setTimeout(() => scrollToBottom('smooth'), 50);

        // Update local conversation preview
        setConversations((prev) =>
          prev.map((c) =>
            String(c._id) === String(activeConversation._id)
              ? {
                  ...c,
                  lastMessage: {
                    text,
                    sender: user._id || user.id,
                    createdAt: res.message.createdAt
                  },
                  updatedAt: res.message.createdAt
                }
              : c
          )
        );
      }
    } catch (err) {
      setSendError(err.message || 'Failed to send message. Please retry.');
    } finally {
      setSending(false);
    }
  };

  // Helper to extract other participant details
  const getOtherParticipant = (conv) => {
    if (!conv || !Array.isArray(conv.participants)) return {};
    const currentUserId = user?._id || user?.id;
    return (
      conv.participants.find(
        (p) => String(p._id || p.id) !== String(currentUserId)
      ) || conv.participants[0] || {}
    );
  };

  // Format relative timestamp
  const formatTime = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();

    if (isToday) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  // Filter conversations by search and ensure partner uniqueness
  const filteredConversations = conversations
    .filter((c) => {
      const other = getOtherParticipant(c);
      const q = searchQuery.toLowerCase();
      const matchName = other.name?.toLowerCase().includes(q);
      const matchService = c.booking?.serviceName?.toLowerCase().includes(q);
      return matchName || matchService;
    })
    .filter((c, idx, arr) => {
      const other = getOtherParticipant(c);
      const otherId = String(other._id || other.id || '');
      const bookingId = c.booking?._id || c.booking ? String(c.booking?._id || c.booking) : '';
      const key = bookingId ? `${otherId}_${bookingId}` : otherId;
      return arr.findIndex((item) => {
        const itemOther = getOtherParticipant(item);
        const itemOtherId = String(itemOther._id || itemOther.id || '');
        const itemBookingId = item.booking?._id || item.booking ? String(item.booking?._id || item.booking) : '';
        const itemKey = itemBookingId ? `${itemOtherId}_${itemBookingId}` : itemOtherId;
        return itemKey === key;
      }) === idx;
    });

  const activeOther = activeConversation ? getOtherParticipant(activeConversation) : null;
  const currentUserId = user?._id || user?.id;

  const bookingStatus = activeConversation?.booking?.status;
  const isBookingChat = Boolean(activeConversation?.booking);
  const isChatRestricted = isBookingChat && !['accepted', 'in_progress'].includes(bookingStatus);

  const getRestrictedBannerMessage = () => {
    if (!isBookingChat) return null;
    if (bookingStatus === 'pending') {
      return 'Chat becomes available after the provider accepts your request.';
    }
    if (bookingStatus === 'completed') {
      return 'This service has been completed. Chat is closed for new messages.';
    }
    if (bookingStatus === 'rejected') {
      return 'This service request was declined. Chat is closed for new messages.';
    }
    if (bookingStatus === 'cancelled') {
      return 'This booking was cancelled. Chat is closed for new messages.';
    }
    return 'Chat is not available for this booking.';
  };

  const getStatusBadgeConfig = (status) => {
    switch (status) {
      case 'pending':
        return { label: 'Pending Acceptance', bg: '#fef3c7', color: '#92400e', border: '#fcd34d' };
      case 'accepted':
        return { label: 'Accepted', bg: '#dbeafe', color: '#1e40af', border: '#bfdbfe' };
      case 'in_progress':
        return { label: 'In Progress', bg: '#f3e8ff', color: '#6b21a8', border: '#e9d5ff' };
      case 'completed':
        return { label: 'Completed', bg: '#dcfce7', color: '#166534', border: '#bbf7d0' };
      case 'rejected':
        return { label: 'Declined', bg: '#fee2e2', color: '#991b1b', border: '#fecaca' };
      case 'cancelled':
        return { label: 'Cancelled', bg: '#f1f5f9', color: '#475569', border: '#cbd5e1' };
      default:
        return { label: status || 'Unknown', bg: '#f1f5f9', color: '#475569', border: '#e2e8f0' };
    }
  };

  return (
    <div
      className="card chat-container"
      style={{
        padding: 0,
        height: effectiveIsBookingScoped ? '100%' : '75vh',
        minHeight: effectiveIsBookingScoped ? '460px' : '520px',
        display: 'flex',
        overflow: 'hidden',
        border: effectiveIsBookingScoped ? 'none' : '1px solid var(--color-border)',
        boxShadow: effectiveIsBookingScoped ? 'none' : 'var(--shadow-md)',
        backgroundColor: 'var(--color-bg-card)'
      }}
    >
      {/* =========================================================================
          LEFT PANE: CONVERSATION LIST (Shown only in standalone mode)
          ========================================================================= */}
      {!effectiveIsBookingScoped && (
        <div
          className={`chat-sidebar ${activeConversation ? 'hide-on-mobile' : ''}`}
          style={{
            width: '320px',
            minWidth: '280px',
            borderRight: '1px solid var(--color-border)',
            display: 'flex',
            flexDirection: 'column',
            backgroundColor: 'var(--color-bg-subtle)'
          }}
        >
        {/* Header & Search */}
        <div style={{ padding: '1.25rem 1rem 0.75rem', borderBottom: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg-card)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
            <h3 style={{ margin: 0, fontSize: '1.15rem', color: 'var(--color-text-title)', fontWeight: 700 }}>
              Messages
            </h3>

            {/* Connection badge */}
            <span
              title={isConnected ? 'Connected to real-time chat server' : 'Disconnected, using REST'}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.3rem',
                fontSize: '0.72rem',
                fontWeight: 600,
                color: isConnected ? '#15803d' : '#94a3b8'
              }}
            >
              {isConnected ? <Wifi size={13} /> : <WifiOff size={13} />}
              <span>{isConnected ? 'Live' : 'Sync'}</span>
            </span>
          </div>

          {/* Search bar */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            padding: '0.45rem 0.75rem',
            backgroundColor: '#f1f5f9',
            borderRadius: 'var(--radius-md)',
            border: '1px solid #e2e8f0'
          }}>
            <Search size={14} style={{ color: 'var(--color-text-muted)' }} />
            <input
              type="text"
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                border: 'none',
                background: 'transparent',
                outline: 'none',
                fontSize: '0.82rem',
                width: '100%',
                color: 'var(--color-text-title)'
              }}
            />
          </div>
        </div>

        {/* Conversation List Scroll Area */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {loadingConversations ? (
            <div style={{ textAlign: 'center', padding: '3rem 1rem' }}>
              <Loader2 size={24} className="animate-spin" style={{ color: 'var(--primary-600)', margin: '0 auto 0.5rem' }} />
              <p style={{ color: 'var(--color-text-muted)', fontSize: '0.82rem' }}>Loading threads...</p>
            </div>
          ) : error ? (
            <div style={{ padding: '1rem', color: 'var(--color-danger)', fontSize: '0.82rem', textAlign: 'center' }}>
              <AlertCircle size={20} style={{ margin: '0 auto 0.5rem' }} />
              <p>{error}</p>
              <button onClick={() => loadConversations()} className="btn btn-outline btn-sm">Retry</button>
            </div>
          ) : filteredConversations.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem 1.5rem', color: 'var(--color-text-muted)' }}>
              <MessageSquare size={32} style={{ margin: '0 auto 0.75rem', color: '#cbd5e1' }} />
              <h4 style={{ fontSize: '0.95rem', color: 'var(--color-text-title)', marginBottom: '0.25rem' }}>
                No message threads
              </h4>
              <p style={{ fontSize: '0.8rem', lineHeight: 1.5 }}>
                {searchQuery
                  ? 'No conversations match your search query.'
                  : role === 'customer'
                  ? 'Book a technician to initiate direct service consultations.'
                  : 'Customer inquiries regarding booking appointments will appear here.'}
              </p>
            </div>
          ) : (
            filteredConversations.map((conv) => {
              const other = getOtherParticipant(conv);
              const isActive = activeConversation?._id === conv._id;
              const hasUnread = conv.unreadCount > 0;
              const defaultAvatar = 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=160&q=80';

              return (
                <div
                  key={conv._id}
                  onClick={() => setActiveConversation(conv)}
                  style={{
                    padding: '0.85rem 1rem',
                    borderBottom: '1px solid var(--color-border)',
                    cursor: 'pointer',
                    backgroundColor: isActive ? 'var(--primary-100)' : hasUnread ? 'var(--color-bg-subtle)' : 'var(--color-bg-card)',
                    borderLeft: isActive ? '3px solid var(--primary-600)' : '3px solid transparent',
                    transition: 'all 0.15s ease',
                    display: 'flex',
                    gap: '0.75rem',
                    alignItems: 'center'
                  }}
                >
                  {/* Avatar */}
                  <div style={{ position: 'relative' }}>
                    <img
                      src={getAvatarUrl(other.avatar || other.providerDetails?.avatar) || defaultAvatar}
                      alt={other.name || 'User'}
                      style={{
                        width: '2.75rem',
                        height: '2.75rem',
                        borderRadius: 'var(--radius-full)',
                        objectFit: 'cover',
                        border: '1px solid #e2e8f0'
                      }}
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = defaultAvatar;
                      }}
                    />
                    {hasUnread && (
                      <span
                        style={{
                          position: 'absolute',
                          top: '-2px',
                          right: '-2px',
                          width: '10px',
                          height: '10px',
                          borderRadius: '50%',
                          backgroundColor: '#ef4444',
                          border: '2px solid #ffffff'
                        }}
                      />
                    )}
                  </div>

                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '0.2rem' }}>
                      <span style={{
                        fontSize: '0.9rem',
                        fontWeight: hasUnread ? 700 : 600,
                        color: 'var(--color-text-title)',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                      }}>
                        {other.name || 'ServeEase User'}
                      </span>
                      <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>
                        {formatTime(conv.lastMessage?.createdAt || conv.updatedAt)}
                      </span>
                    </div>

                    {/* Booking context chip */}
                    {conv.booking?.serviceName && (
                      <div style={{
                        fontSize: '0.72rem',
                        color: 'var(--primary-700)',
                        backgroundColor: '#dcfce7',
                        padding: '0.1rem 0.4rem',
                        borderRadius: '4px',
                        display: 'inline-block',
                        marginBottom: '0.2rem',
                        maxWidth: '100%',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                      }}>
                        {conv.booking.serviceName}
                      </div>
                    )}

                    {/* Last message preview */}
                    <p style={{
                      margin: 0,
                      fontSize: '0.78rem',
                      color: hasUnread ? 'var(--color-text-title)' : 'var(--color-text-muted)',
                      fontWeight: hasUnread ? 600 : 400,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }}>
                      {conv.lastMessage?.text || 'No messages yet'}
                    </p>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
      )}

      {/* =========================================================================
          RIGHT PANE: ACTIVE THREAD CHAT WINDOW
          ========================================================================= */}
      <div
        className={`chat-main-window ${!activeConversation ? 'hide-on-mobile' : ''}`}
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: 'var(--color-bg-card)'
        }}
      >
        {activeConversation ? (
          <>
            {/* Thread Header */}
            <div style={{
              padding: '0.85rem 1.25rem',
              borderBottom: '1px solid var(--color-border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              backgroundColor: 'var(--color-bg-card)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                {/* Back button on mobile (standalone mode only) */}
                {!effectiveIsBookingScoped && (
                  <button
                    type="button"
                    onClick={() => setActiveConversation(null)}
                    className="show-on-mobile btn-icon"
                    style={{
                      background: 'none',
                      border: 'none',
                      padding: '0.4rem',
                      cursor: 'pointer',
                      color: 'var(--color-text-muted)'
                    }}
                    aria-label="Back to conversations"
                  >
                    <ArrowLeft size={18} />
                  </button>
                )}

                {/* Avatar */}
                <div style={{ position: 'relative' }}>
                  <img
                    src={getAvatarUrl(activeOther.avatar || activeOther.providerDetails?.avatar) || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=160&q=80'}
                    alt={activeOther.name}
                    style={{
                      width: '2.5rem',
                      height: '2.5rem',
                      borderRadius: 'var(--radius-full)',
                      objectFit: 'cover',
                      border: '1px solid var(--color-border)'
                    }}
                  />
                  <span
                    style={{
                      position: 'absolute',
                      bottom: '0',
                      right: '0',
                      width: '9px',
                      height: '9px',
                      borderRadius: '50%',
                      backgroundColor: isConnected ? '#16a34a' : '#94a3b8',
                      border: '2px solid #ffffff'
                    }}
                  />
                </div>

                {/* Name & status */}
                <div>
                  <h4 style={{ margin: 0, fontSize: '0.98rem', color: 'var(--color-text-title)', fontWeight: 700 }}>
                    {activeOther.name}
                  </h4>
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                    {activeOther.role === 'provider'
                      ? (activeOther.providerDetails?.category || 'Service Specialist')
                      : 'Client'}
                    {activeOther.city ? ` • ${activeOther.city}` : ''}
                  </div>
                </div>
              </div>

              {/* Linked Booking Badge & Status */}
              {activeConversation.booking && (
                <div style={{ textAlign: 'right' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.4rem', flexWrap: 'wrap' }}>
                    <div style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                      padding: '0.2rem 0.55rem',
                      borderRadius: 'var(--radius-full)',
                      backgroundColor: '#f1f5f9',
                      border: '1px solid #e2e8f0',
                      fontSize: '0.75rem',
                      color: 'var(--color-text-title)',
                      fontWeight: 600
                    }}>
                      <Calendar size={12} />
                      <span>{activeConversation.booking.serviceName}</span>
                    </div>

                    {bookingStatus && (() => {
                      const cfg = getStatusBadgeConfig(bookingStatus);
                      return (
                        <span
                          id="chat-booking-status-badge"
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            padding: '0.2rem 0.55rem',
                            borderRadius: 'var(--radius-full)',
                            fontSize: '0.72rem',
                            fontWeight: 600,
                            backgroundColor: cfg.bg,
                            color: cfg.color,
                            border: `1px solid ${cfg.border}`
                          }}
                        >
                          {cfg.label}
                        </span>
                      );
                    })()}
                  </div>

                  {activeConversation.booking.completedAt ? (
                    <div style={{ fontSize: '0.7rem', color: '#166534', marginTop: '2px', fontWeight: 500 }}>
                      Completed on {new Date(activeConversation.booking.completedAt).toLocaleDateString()} {new Date(activeConversation.booking.completedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  ) : activeConversation.booking.bookingDate ? (
                    <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', marginTop: '2px' }}>
                      {activeConversation.booking.bookingDate} @ {activeConversation.booking.bookingTime}
                    </div>
                  ) : null}
                </div>
              )}

              {/* Close Button when inside Modal Dialog */}
              {onClose && (
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Close chat window"
                  style={{
                    background: 'none',
                    border: 'none',
                    padding: '0.4rem',
                    cursor: 'pointer',
                    color: 'var(--color-text-muted)',
                    borderRadius: 'var(--radius-md)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginLeft: '0.75rem'
                  }}
                >
                  <X size={20} />
                </button>
              )}
            </div>

            {/* Error banner */}
            {sendError && (
              <div className="alert-box alert-error" style={{ margin: '0.5rem 1rem', padding: '0.5rem 0.75rem', fontSize: '0.8rem' }}>
                <AlertCircle size={15} />
                <span>{sendError}</span>
              </div>
            )}

            {/* Message History */}
            <div
              style={{
                flex: 1,
                overflowY: 'auto',
                padding: '1.25rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.75rem',
                backgroundColor: 'var(--color-bg-page)'
              }}
            >
              {loadingMessages ? (
                <div style={{ textAlign: 'center', padding: '3rem 1rem' }}>
                  <Loader2 size={24} className="animate-spin" style={{ color: 'var(--primary-600)', margin: '0 auto 0.5rem' }} />
                  <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>Loading conversation history...</p>
                </div>
              ) : messages.length === 0 ? (
                <div style={{ textAlign: 'center', margin: 'auto', padding: '2rem 1rem', color: 'var(--color-text-muted)' }}>
                  <Info size={28} style={{ margin: '0 auto 0.5rem', color: '#94a3b8' }} />
                  <p style={{ fontSize: '0.9rem', marginBottom: '0.25rem', color: 'var(--color-text-title)', fontWeight: 600 }}>
                    Start of Conversation
                  </p>
                  <p style={{ fontSize: '0.82rem', maxWidth: '360px', margin: '0 auto' }}>
                    Send a message to coordinate job requirements, arrival timing, or diagnostic details.
                  </p>
                </div>
              ) : (
                messages.map((msg) => {
                  const senderId = String(msg.sender?._id || msg.sender);
                  const isMine = senderId === String(currentUserId);

                  return (
                    <div
                      key={msg._id}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: isMine ? 'flex-end' : 'flex-start',
                        maxWidth: '75%',
                        alignSelf: isMine ? 'flex-end' : 'flex-start'
                      }}
                    >
                      <div
                        style={{
                          padding: '0.65rem 0.95rem',
                          borderRadius: isMine ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                          backgroundColor: isMine ? 'var(--primary-600)' : 'var(--color-bg-card)',
                          color: isMine ? '#ffffff' : 'var(--color-text-title)',
                          boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
                          border: isMine ? 'none' : '1px solid var(--color-border)',
                          fontSize: '0.9rem',
                          lineHeight: 1.45,
                          wordBreak: 'break-word',
                          whiteSpace: 'pre-wrap'
                        }}
                      >
                        {msg.text}
                      </div>

                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.3rem',
                          fontSize: '0.68rem',
                          color: 'var(--color-text-muted)',
                          marginTop: '3px',
                          padding: '0 4px'
                        }}
                      >
                        <span>{formatTime(msg.createdAt)}</span>
                        {isMine && (
                          <span>
                            {msg.isRead ? (
                              <CheckCheck size={13} style={{ color: '#2563eb' }} title="Read" />
                            ) : (
                              <Check size={13} style={{ color: '#94a3b8' }} title="Sent" />
                            )}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Message Composer or Restricted Access Banner */}
            {isChatRestricted ? (
              <div
                id="chat-restricted-banner"
                style={{
                  padding: '1rem 1.25rem',
                  borderTop: '1px solid var(--color-border)',
                  backgroundColor: 'var(--color-bg-subtle)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.6rem',
                  color: 'var(--color-text-muted)',
                  fontSize: '0.88rem',
                  textAlign: 'center',
                  fontWeight: 500
                }}
              >
                <Lock size={16} style={{ color: '#64748b', flexShrink: 0 }} />
                <span>{getRestrictedBannerMessage()}</span>
              </div>
            ) : (
              <form
                onSubmit={handleSendMessage}
                style={{
                  padding: '0.85rem 1rem',
                  borderTop: '1px solid var(--color-border)',
                  backgroundColor: 'var(--color-bg-card)',
                  display: 'flex',
                  gap: '0.5rem',
                  alignItems: 'center'
                }}
              >
                <input
                  type="text"
                  placeholder="Type your message (Enter to send)..."
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  maxLength={2000}
                  disabled={sending}
                  style={{
                    flex: 1,
                    padding: '0.65rem 0.95rem',
                    borderRadius: 'var(--radius-full)',
                    border: '1px solid var(--color-border)',
                    outline: 'none',
                    fontSize: '0.9rem',
                    backgroundColor: 'var(--color-bg-subtle)',
                    color: 'var(--color-text-title)'
                  }}
                />

                <button
                  type="submit"
                  disabled={!messageText.trim() || sending}
                  className="btn btn-primary"
                  style={{
                    borderRadius: 'var(--radius-full)',
                    padding: '0.65rem 1.15rem',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    opacity: !messageText.trim() || sending ? 0.6 : 1
                  }}
                >
                  {sending ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <>
                      <Send size={15} />
                      <span>Send</span>
                    </>
                  )}
                </button>
              </form>
            )}
          </>
        ) : loadingConversations ? (
          <div style={{ textAlign: 'center', margin: 'auto', padding: '3rem 2rem', color: 'var(--color-text-muted)' }}>
            <Loader2 size={32} className="animate-spin" style={{ color: 'var(--primary-600)', margin: '0 auto 1rem' }} />
            <h4 style={{ fontSize: '1.05rem', color: 'var(--color-text-title)', marginBottom: '0.35rem' }}>
              Opening Booking Chat...
            </h4>
            <p style={{ fontSize: '0.85rem' }}>
              Connecting to secure conversation and message history.
            </p>
          </div>
        ) : error ? (
          <div style={{ textAlign: 'center', margin: 'auto', padding: '3rem 2rem', color: 'var(--color-text-muted)' }}>
            <AlertCircle size={32} style={{ color: 'var(--color-danger)', margin: '0 auto 1rem' }} />
            <h4 style={{ fontSize: '1.05rem', color: 'var(--color-text-title)', marginBottom: '0.35rem' }}>
              Chat Unavailable
            </h4>
            <p style={{ fontSize: '0.85rem', maxWidth: '380px', margin: '0 auto 1.5rem', color: 'var(--color-text-muted)' }}>
              {error}
            </p>
            {onClose && (
              <button type="button" onClick={onClose} className="btn btn-outline btn-sm">
                Close Chat
              </button>
            )}
          </div>
        ) : (
          /* Empty State when no conversation selected */
          <div style={{ textAlign: 'center', margin: 'auto', padding: '3rem 2rem', color: 'var(--color-text-muted)' }}>
            <div style={{
              width: '4rem',
              height: '4rem',
              borderRadius: '50%',
              backgroundColor: '#e0f2fe',
              color: '#0284c7',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '1rem'
            }}>
              <MessageSquare size={28} />
            </div>
            <h3 style={{ fontSize: '1.25rem', color: 'var(--color-text-title)', marginBottom: '0.35rem' }}>
              Select a conversation
            </h3>
            <p style={{ fontSize: '0.88rem', maxWidth: '380px', margin: '0 auto 1.5rem', lineHeight: 1.5 }}>
              Choose a message thread from the left to view message history and consult in real time.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
