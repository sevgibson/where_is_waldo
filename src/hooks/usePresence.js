import { useState, useEffect, useCallback, useRef } from 'react';
import { getConsumer } from '../cable';

const DEFAULT_OPTIONS = {
  channelName: 'WhereIsWaldo::PresenceChannel',
  heartbeatInterval: 30000,
  activityTimeout: 30000,
  trackActivity: true,
  trackVisibility: true,
};

/**
 * usePresence - Hook for real-time presence tracking
 *
 * @param {string|number} scopeId - The scope identifier (room, channel, org, etc.)
 * @param {Object} options - Configuration options
 * @param {Object} options.metadata - Metadata to attach to presence
 * @param {string} options.channelName - ActionCable channel name
 * @param {number} options.heartbeatInterval - Heartbeat interval in ms
 * @param {number} options.activityTimeout - Activity timeout in ms
 * @param {boolean} options.trackActivity - Track user activity
 * @param {boolean} options.trackVisibility - Track tab visibility
 * @returns {Object} Presence state and methods
 */
export function usePresence(scopeId, options = {}) {
  const config = { ...DEFAULT_OPTIONS, ...options };

  const [connected, setConnected] = useState(false);
  const [onlineSubjects, setOnlineSubjects] = useState([]);
  const [tabVisible, setTabVisible] = useState(true);
  const [subjectActive, setSubjectActive] = useState(true);

  const subscriptionRef = useRef(null);
  const heartbeatIntervalRef = useRef(null);
  const activityTimeoutRef = useRef(null);

  // Track user activity
  const handleActivity = useCallback(() => {
    if (!subjectActive) {
      setSubjectActive(true);
    }

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
    if (visible) handleActivity();
  }, [handleActivity]);

  // Send heartbeat
  const sendHeartbeat = useCallback(() => {
    if (subscriptionRef.current) {
      subscriptionRef.current.perform('heartbeat', {
        tab_visible: tabVisible,
        subject_active: subjectActive,
        metadata: config.metadata || {},
      });
    }
  }, [tabVisible, subjectActive, config.metadata]);

  // Refresh online subjects
  const refresh = useCallback(() => {
    if (subscriptionRef.current) {
      subscriptionRef.current.perform('get_online_subjects');
    }
  }, []);

  // Subscribe to channel
  useEffect(() => {
    if (!scopeId) return;

    const consumer = getConsumer();

    subscriptionRef.current = consumer.subscriptions.create(
      {
        channel: config.channelName,
        room_id: scopeId, // Backend uses room_id param
        metadata: config.metadata || {},
      },
      {
        connected() {
          setConnected(true);
          this.perform('get_online_subjects');
        },

        disconnected() {
          setConnected(false);
        },

        received(data) {
          if (data.type === 'online_subjects') {
            setOnlineSubjects(data.subjects || []);
          } else if (data.type === 'presence_update') {
            if (data.event === 'joined') {
              setOnlineSubjects((prev) => {
                if (prev.some((s) => s.session_id === data.session_id)) return prev;
                return [...prev, {
                  session_id: data.session_id,
                  subject_id: data.subject_id,
                  subject: data.subject,
                }];
              });
            } else if (data.event === 'left') {
              setOnlineSubjects((prev) =>
                prev.filter((s) => s.session_id !== data.session_id)
              );
            }
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
  }, [scopeId, config.channelName, config.metadata]);

  // Heartbeat interval
  useEffect(() => {
    if (!connected) return;

    heartbeatIntervalRef.current = setInterval(sendHeartbeat, config.heartbeatInterval);

    return () => {
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
      }
    };
  }, [connected, sendHeartbeat, config.heartbeatInterval]);

  // Activity tracking
  useEffect(() => {
    if (!config.trackActivity) return;

    const events = ['mousemove', 'keydown', 'scroll', 'touchstart', 'click'];
    events.forEach((event) => window.addEventListener(event, handleActivity, { passive: true }));

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

  // Visibility tracking
  useEffect(() => {
    if (!config.trackVisibility) return;

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [handleVisibilityChange, config.trackVisibility]);

  return {
    connected,
    onlineSubjects,
    tabVisible,
    subjectActive,
    refresh,
    sendHeartbeat,
  };
}

export default usePresence;
