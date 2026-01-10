import { createConsumer } from '@rails/actioncable';

let consumer = null;
let config = {
  url: '/cable',
  getToken: null,
  handlers: {},
};

/**
 * Configure the ActionCable connection
 * @param {Object} options
 * @param {string} options.url - WebSocket URL (default: '/cable')
 * @param {Function} options.getToken - Function that returns auth token
 * @param {Object} options.handlers - Message type handlers { type: handler }
 */
export function configureCable(options = {}) {
  config = { ...config, ...options };
  // Reset consumer when config changes
  if (consumer) {
    consumer.disconnect();
    consumer = null;
  }
}

/**
 * Register a message handler for a specific type
 * @param {string} messageType - The message type to handle
 * @param {Function} handler - Handler function receiving (data, message)
 */
export function registerHandler(messageType, handler) {
  config.handlers[messageType] = handler;
}

/**
 * Unregister a message handler
 * @param {string} messageType - The message type to unregister
 */
export function unregisterHandler(messageType) {
  delete config.handlers[messageType];
}

/**
 * Get or create the ActionCable consumer
 * @returns {Consumer}
 */
export function getConsumer() {
  if (!consumer) {
    let url = config.url;

    if (config.getToken) {
      const token = config.getToken();
      if (token) {
        const separator = url.includes('?') ? '&' : '?';
        url = `${url}${separator}token=${encodeURIComponent(token)}`;
      }
    }

    consumer = createConsumer(url);
  }

  return consumer;
}

/**
 * Disconnect and reset the consumer
 */
export function disconnectCable() {
  if (consumer) {
    consumer.disconnect();
    consumer = null;
  }
}

/**
 * Get current cable configuration
 * @returns {Object}
 */
export function getCableConfig() {
  return { ...config };
}

/**
 * Get registered handlers
 * @returns {Object}
 */
export function getHandlers() {
  return config.handlers;
}

/**
 * Handle an incoming message by routing to registered handler
 * @param {Object} message - The message object with type and data
 * @returns {boolean} - Whether a handler was found and called
 */
export function handleMessage(message) {
  const { type, data } = message;
  const handler = config.handlers[type];

  if (handler) {
    handler(data, message);
    return true;
  }

  return false;
}
