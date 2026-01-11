import React, { createContext, useContext, useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { getConsumer, handleMessage, getCableConfig } from '../cable';

const PresenceContext = createContext(null);

const DEFAULT_CONFIG = {
  channelName: 'WhereIsWaldo::PresenceChannel',
  heartbeatInterval: 30000,
  activityTimeout: 30000,
  trackActivity: true,
  trackVisibility: true,
};

/**
 * Get merged config from defaults, cable config, and overrides
 */
function getMergedConfig(configOverrides) {
  const cableConfig = getCableConfig();
  const presenceConfig = cableConfig.presence || {};
  return { ...DEFAULT_CONFIG, ...presenceConfig, ...configOverrides };
}

/**
 * PresenceProvider - Provides real-time presence tracking and message handling
 *
 * @param {Object} props
 * @param {React.ReactNode} props.children
 * @param {Object} props.metadata - Optional metadata to attach to presence
 * @param {Object} props.config - Optional configuration overrides
 * @param {Function} props.onConnected - Callback when connected
 * @param {Function} props.onDisconnected - Callback when disconnected
 */
export function PresenceProvider({
  children,
  metadata = {},
  config: configOverrides = {},
  onConnected,
  onDisconnected,
}) {
  const config = useMemo(() => getMergedConfig(configOverrides), [configOverrides]);

  const [connected, setConnected] = useState(false);
  const [tabVisible, setTabVisible] = useState(true);
  const [subjectActive, setSubjectActive] = useState(true);
  const [sessionId, setSessionId] = useState(null);

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
        metadata,
      });
    }
  }, [tabVisible, subjectActive, metadata]);

  // Subscribe to presence channel
  useEffect(() => {
    console.log('[WhereIsWaldo] Setting up subscription, channel:', config.channelName);
    const consumer = getConsumer();
    console.log('[WhereIsWaldo] Got consumer:', !!consumer);

    subscriptionRef.current = consumer.subscriptions.create(
      {
        channel: config.channelName,
        metadata,
      },
      {
        connected() {
          console.log('[WhereIsWaldo] Subscription connected callback fired');
          setConnected(true);
          // Get session_id from cable config if available
          const cableConfig = getCableConfig();
          if (cableConfig.sessionId) {
            setSessionId(cableConfig.sessionId);
          }
          onConnected?.();
        },

        disconnected() {
          console.log('[WhereIsWaldo] Subscription disconnected callback fired');
          setConnected(false);
          onDisconnected?.();
        },

        rejected() {
          console.log('[WhereIsWaldo] Subscription REJECTED');
        },

        received(message) {
          // Check if this message is targeted to a specific session
          if (message._target_session && message._target_session !== sessionId) {
            return; // Not for this session
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
    sessionId,
    tabVisible,
    subjectActive,
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
