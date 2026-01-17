import { useState, useEffect, useCallback, useRef } from 'react';
import { getConsumer, handleMessage, getCableConfig } from '../cable';

const DEFAULT_OPTIONS = {
  channelName: 'WhereIsWaldo::PresenceChannel',
  heartbeatInterval: 30000,
  activityTimeout: 30000,
  trackActivity: true,
  trackVisibility: true,
  debug: false,
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
  const [windowFocused, setWindowFocused] = useState(document.hasFocus());
  const [subjectActive, setSubjectActive] = useState(true);
  const [sessionId, setSessionId] = useState(null);

  const subscriptionRef = useRef(null);
  const heartbeatIntervalRef = useRef(null);
  const activityTimeoutRef = useRef(null);
  const lastActivityTimeRef = useRef(Date.now());

  // Debug logging helper
  const log = useCallback((...args) => {
    if (config.debug) console.log('[Presence]', ...args);
  }, [config.debug]);

  // Refs to track latest values for callbacks (avoids stale closures)
  const stateRef = useRef({ tabVisible: true, windowFocused: document.hasFocus(), subjectActive: true });
  stateRef.current = { tabVisible, windowFocused, subjectActive };

  // Track user activity
  const handleActivity = useCallback(() => {
    const { subjectActive: wasActive, tabVisible: currentTabVisible, windowFocused: currentWindowFocused } = stateRef.current;
    const wasInactive = !wasActive;

    // Always update the last activity timestamp
    lastActivityTimeRef.current = Date.now();

    log('handleActivity called, wasActive:', wasActive, 'wasInactive:', wasInactive);

    if (wasInactive) {
      setSubjectActive(true);
      // Send immediate heartbeat on transition from inactive to active
      if (subscriptionRef.current) {
        log('IMMEDIATE heartbeat: inactive -> active');
        subscriptionRef.current.perform('heartbeat', {
          tab_visible: currentTabVisible && currentWindowFocused,
          subject_active: true,
          last_activity_at: lastActivityTimeRef.current,
          metadata: config.metadata || {},
        });
      } else {
        log('No subscription, skipping heartbeat');
      }
    }

    if (activityTimeoutRef.current) {
      clearTimeout(activityTimeoutRef.current);
    }

    activityTimeoutRef.current = setTimeout(() => {
      log('Activity timeout fired, setting inactive');
      setSubjectActive(false);
      // Send immediate heartbeat on transition from active to inactive
      if (subscriptionRef.current) {
        log('IMMEDIATE heartbeat: active -> inactive');
        subscriptionRef.current.perform('heartbeat', {
          tab_visible: document.visibilityState === 'visible' && document.hasFocus(),
          subject_active: false,
          last_activity_at: lastActivityTimeRef.current,
          metadata: config.metadata || {},
        });
      }
    }, config.activityTimeout);
  }, [config.activityTimeout, config.metadata, log]);

  // Track tab visibility
  const handleVisibilityChange = useCallback(() => {
    const { tabVisible: wasVisible, windowFocused: currentWindowFocused, subjectActive: currentSubjectActive } = stateRef.current;
    const visible = document.visibilityState === 'visible';

    log('handleVisibilityChange, wasVisible:', wasVisible, 'nowVisible:', visible);
    setTabVisible(visible);

    // Send immediate heartbeat on any visibility change
    if (visible !== wasVisible) {
      if (subscriptionRef.current) {
        log('IMMEDIATE heartbeat: visibility change', wasVisible, '->', visible);
        subscriptionRef.current.perform('heartbeat', {
          tab_visible: visible && currentWindowFocused,
          subject_active: visible ? true : currentSubjectActive,
          metadata: config.metadata || {},
        });
      } else {
        log('No subscription, skipping heartbeat');
      }
    }

    if (visible) handleActivity();
  }, [handleActivity, config.metadata, log]);

  // Track window focus/blur
  const handleWindowFocus = useCallback(() => {
    const { windowFocused: wasFocused, tabVisible: currentTabVisible } = stateRef.current;

    log('handleWindowFocus, wasFocused:', wasFocused);
    setWindowFocused(true);

    // Send immediate heartbeat on focus gain
    if (!wasFocused) {
      if (subscriptionRef.current) {
        log('IMMEDIATE heartbeat: window focus gained');
        subscriptionRef.current.perform('heartbeat', {
          tab_visible: currentTabVisible,
          subject_active: true,
          metadata: config.metadata || {},
        });
      } else {
        log('No subscription, skipping heartbeat');
      }
    }

    handleActivity();
  }, [handleActivity, config.metadata, log]);

  const handleWindowBlur = useCallback(() => {
    const { windowFocused: wasFocused, subjectActive: currentSubjectActive } = stateRef.current;

    log('handleWindowBlur, wasFocused:', wasFocused);
    setWindowFocused(false);

    // Send immediate heartbeat on focus loss
    if (wasFocused) {
      if (subscriptionRef.current) {
        log('IMMEDIATE heartbeat: window focus lost');
        subscriptionRef.current.perform('heartbeat', {
          tab_visible: false,
          subject_active: currentSubjectActive,
          metadata: config.metadata || {},
        });
      } else {
        log('No subscription, skipping heartbeat');
      }
    }
  }, [config.metadata, log]);

  // Send heartbeat (with optional override values for immediate updates)
  const sendHeartbeat = useCallback((overrides = {}) => {
    if (subscriptionRef.current) {
      log('INTERVAL heartbeat');
      subscriptionRef.current.perform('heartbeat', {
        tab_visible: overrides.tab_visible ?? (tabVisible && windowFocused),
        subject_active: overrides.subject_active ?? subjectActive,
        last_activity_at: lastActivityTimeRef.current,
        metadata: config.metadata || {},
      });
    }
  }, [tabVisible, windowFocused, subjectActive, config.metadata, log]);

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

  // Visibility tracking (tab visibility + window focus)
  useEffect(() => {
    if (!config.trackVisibility) return;

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleWindowFocus);
    window.addEventListener('blur', handleWindowBlur);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleWindowFocus);
      window.removeEventListener('blur', handleWindowBlur);
    };
  }, [handleVisibilityChange, handleWindowFocus, handleWindowBlur, config.trackVisibility]);

  return {
    connected,
    sessionId,
    tabVisible,
    windowFocused,
    subjectActive,
    sendHeartbeat,
  };
}

export default usePresence;
