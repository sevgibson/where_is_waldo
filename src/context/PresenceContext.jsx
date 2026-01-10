import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { getConsumer } from '../cable';

const PresenceContext = createContext(null);

const DEFAULT_CONFIG = {
  channelName: 'WhereIsWaldo::PresenceChannel',
  heartbeatInterval: 30000,
  activityTimeout: 30000,
  trackActivity: true,
  trackVisibility: true,
};

/**
 * PresenceProvider - Provides real-time presence tracking
 *
 * @param {Object} props
 * @param {React.ReactNode} props.children
 * @param {string|number} props.roomId - Room/channel identifier
 * @param {Object} props.metadata - Optional metadata to attach to presence
 * @param {Object} props.config - Optional configuration overrides
 * @param {Function} props.onConnected - Callback when connected
 * @param {Function} props.onDisconnected - Callback when disconnected
 * @param {Function} props.onSubjectJoined - Callback when subject joins
 * @param {Function} props.onSubjectLeft - Callback when subject leaves
 * @param {Function} props.onMessage - Callback for broadcast messages
 */
export function PresenceProvider({
  children,
  roomId,
  metadata = {},
  config: configOverrides = {},
  onConnected,
  onDisconnected,
  onSubjectJoined,
  onSubjectLeft,
  onMessage,
}) {
  const config = { ...DEFAULT_CONFIG, ...configOverrides };

  const [connected, setConnected] = useState(false);
  const [onlineSubjects, setOnlineSubjects] = useState([]);
  const [tabVisible, setTabVisible] = useState(true);
  const [subjectActive, setSubjectActive] = useState(true);

  const subscriptionRef = useRef(null);
  const heartbeatIntervalRef = useRef(null);
  const activityTimeoutRef = useRef(null);
  const lastActivityRef = useRef(Date.now());

  // Track user activity
  const handleActivity = useCallback(() => {
    lastActivityRef.current = Date.now();
    if (!subjectActive) {
      setSubjectActive(true);
    }

    // Reset activity timeout
    if (activityTimeoutRef.current) {
      clearTimeout(activityTimeoutRef.current);
    }

    activityTimeoutRef.current = setTimeout(() => {
      setSubjectActive(false);
    }, config.activityTimeout);
  }, [subjectActive, config.activityTimeout]);

  // Track tab visibility
  const handleVisibilityChange = useCallback(() => {
    const visible = document.visibilityState === 'visible';
    setTabVisible(visible);

    if (visible) {
      handleActivity();
    }
  }, [handleActivity]);

  // Send heartbeat
  const sendHeartbeat = useCallback(() => {
    if (subscriptionRef.current) {
      subscriptionRef.current.perform('heartbeat', {
        tab_visible: tabVisible,
        subject_active: subjectActive,
        metadata,
      });
    }
  }, [tabVisible, subjectActive, metadata]);

  // Request online subjects list
  const refreshOnlineSubjects = useCallback(() => {
    if (subscriptionRef.current) {
      subscriptionRef.current.perform('get_online_subjects');
    }
  }, []);

  // Subscribe to presence channel
  useEffect(() => {
    if (!roomId) return;

    const consumer = getConsumer();

    subscriptionRef.current = consumer.subscriptions.create(
      {
        channel: config.channelName,
        room_id: roomId,
        metadata,
      },
      {
        connected() {
          setConnected(true);
          onConnected?.();
          this.perform('get_online_subjects');
        },

        disconnected() {
          setConnected(false);
          onDisconnected?.();
        },

        received(data) {
          switch (data.type) {
            case 'online_subjects':
              setOnlineSubjects(data.subjects || []);
              break;

            case 'presence_update':
              if (data.event === 'joined') {
                setOnlineSubjects((prev) => {
                  const exists = prev.some((s) => s.session_id === data.session_id);
                  if (exists) return prev;
                  return [...prev, {
                    session_id: data.session_id,
                    subject_id: data.subject_id,
                    subject: data.subject,
                  }];
                });
                onSubjectJoined?.(data);
              } else if (data.event === 'left') {
                setOnlineSubjects((prev) =>
                  prev.filter((s) => s.session_id !== data.session_id)
                );
                onSubjectLeft?.(data);
              }
              break;

            case 'broadcast':
              onMessage?.(data);
              break;

            default:
              // Handle other message types
              onMessage?.(data);
          }
        },
      }
    );

    return () => {
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe();
        subscriptionRef.current = null;
      }
    };
  }, [roomId, config.channelName]); // eslint-disable-line react-hooks/exhaustive-deps

  // Set up heartbeat interval
  useEffect(() => {
    if (!connected) return;

    heartbeatIntervalRef.current = setInterval(sendHeartbeat, config.heartbeatInterval);

    return () => {
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
      }
    };
  }, [connected, sendHeartbeat, config.heartbeatInterval]);

  // Set up activity tracking
  useEffect(() => {
    if (!config.trackActivity) return;

    const events = ['mousemove', 'keydown', 'scroll', 'touchstart', 'click'];
    events.forEach((event) => window.addEventListener(event, handleActivity, { passive: true }));

    // Start activity timeout
    activityTimeoutRef.current = setTimeout(() => {
      setSubjectActive(false);
    }, config.activityTimeout);

    return () => {
      events.forEach((event) => window.removeEventListener(event, handleActivity));
      if (activityTimeoutRef.current) {
        clearTimeout(activityTimeoutRef.current);
      }
    };
  }, [handleActivity, config.trackActivity, config.activityTimeout]);

  // Set up visibility tracking
  useEffect(() => {
    if (!config.trackVisibility) return;

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [handleVisibilityChange, config.trackVisibility]);

  const value = {
    connected,
    roomId,
    onlineSubjects,
    tabVisible,
    subjectActive,
    refreshOnlineSubjects,
    sendHeartbeat,
  };

  return (
    <PresenceContext.Provider value={value}>
      {children}
    </PresenceContext.Provider>
  );
}

/**
 * Hook to access presence context
 * @returns {Object} Presence context value
 */
export function usePresenceContext() {
  const context = useContext(PresenceContext);
  if (!context) {
    throw new Error('usePresenceContext must be used within a PresenceProvider');
  }
  return context;
}

export default PresenceContext;
