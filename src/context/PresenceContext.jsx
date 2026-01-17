import React, { createContext, useContext, useMemo } from 'react';
import { usePresence } from '../hooks/usePresence';
import { getCableConfig } from '../cable';

const PresenceContext = createContext(null);

const DEFAULT_CONFIG = {
  channelName: 'WhereIsWaldo::PresenceChannel',
  heartbeatInterval: 30000,
  activityTimeout: 30000,
  trackActivity: true,
  trackVisibility: true,
  debug: false,
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

  // Use the shared usePresence hook for all presence tracking
  const presence = usePresence({
    ...config,
    metadata,
    onConnected,
    onDisconnected,
  });

  return (
    <PresenceContext.Provider value={presence}>
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
