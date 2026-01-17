import { useState, useEffect, useCallback, useRef } from 'react';
import { getConsumer, handleMessage, getCableConfig } from '../cable';

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
 * @param {Object} options - Configuration options
 * @param {Object} options.metadata - Metadata to attach to presence
 * @param {string} options.channelName - ActionCable channel name
 * @param {number} options.heartbeatInterval - Heartbeat interval in ms
 * @param {number} options.activityTimeout - Activity timeout in ms
 * @param {boolean} options.trackActivity - Track user activity
 * @param {boolean} options.trackVisibility - Track tab visibility
 * @param {Function} options.onConnected - Callback when connected
 * @param {Function} options.onDisconnected - Callback when disconnected
 * @returns {Object} Presence state and methods
 */
export function usePresence(options = {}) {
  const config = { ...DEFAULT_OPTIONS, ...options };

  const [connected, setConnected] = useState(false);
  const [tabVisible, setTabVisible] = useState(true);
  const [subjectActive, setSubjectActive] = useState(true);
  const [sessionId, setSessionId] = useState(null);

  const subscriptionRef = useRef(null);
  const heartbeatIntervalRef = useRef(null);
  const activityTimeoutRef = useRef(null);

  // Track user activity
  const handleActivity = useCallback(() => {
    const wasInactive = !subjectActive;

    if (wasInactive) {
      setSubjectActive(true);
      // Send immediate heartbeat on transition from inactive to active
      if (subscriptionRef.current) {
        subscriptionRef.current.perform('heartbeat', {
          tab_visible: tabVisible,
          subject_active: true,
          metadata: config.metadata || {},
        });
      }
    }

    if (activityTimeoutRef.current) {
      clearTimeout(activityTimeoutRef.current);
    }

    activityTimeoutRef.current = setTimeout(() => {
      setSubjectActive(false);
      // Send immediate heartbeat on transition from active to inactive
      if (subscriptionRef.current) {
        subscriptionRef.current.perform('heartbeat', {
          tab_visible: document.visibilityState === 'visible',
          subject_active: false,
          metadata: config.metadata || {},
        });
      }
    }, config.activityTimeout);
  }, [subjectActive, tabVisible, config.activityTimeout, config.metadata]);

  // Track tab visibility
  const handleVisibilityChange = useCallback(() => {
    const visible = document.visibilityState === 'visible';
    const wasVisible = tabVisible;
    setTabVisible(visible);

    // Send immediate heartbeat on any visibility change
    if (visible !== wasVisible && subscriptionRef.current) {
      subscriptionRef.current.perform('heartbeat', {
        tab_visible: visible,
        subject_active: visible ? true : subjectActive,
        metadata: config.metadata || {},
      });
    }

    if (visible) handleActivity();
  }, [handleActivity, tabVisible, subjectActive, config.metadata]);

  // Send heartbeat (with optional override values for immediate updates)
  const sendHeartbeat = useCallback((overrides = {}) => {
    if (subscriptionRef.current) {
      subscriptionRef.current.perform('heartbeat', {
        tab_visible: overrides.tab_visible ?? tabVisible,
        subject_active: overrides.subject_active ?? subjectActive,
        metadata: config.metadata || {},
      });
    }
  }, [tabVisible, subjectActive, config.metadata]);

  // Subscribe to channel
  useEffect(() => {
    const consumer = getConsumer();

    subscriptionRef.current = consumer.subscriptions.create(
      {
        channel: config.channelName,
        metadata: config.metadata || {},
      },
      {
        connected() {
          setConnected(true);
          const cableConfig = getCableConfig();
          if (cableConfig.sessionId) {
            setSessionId(cableConfig.sessionId);
          }
          config.onConnected?.();
        },

        disconnected() {
          setConnected(false);
          config.onDisconnected?.();
        },

        received(message) {
          // Check if targeted to specific session
          if (message._target_session && message._target_session !== sessionId) {
            return;
          }

          // Route to registered handler
          handleMessage(message);
        },
      }
    );

    return () => {
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe();
        subscriptionRef.current = null;
      }
    };
  }, [config.channelName]); // eslint-disable-line react-hooks/exhaustive-deps

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
    sessionId,
    tabVisible,
    subjectActive,
    sendHeartbeat,
  };
}

export default usePresence;
