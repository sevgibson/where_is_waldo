import { createConsumer } from '@rails/actioncable';

let consumer = null;
let config = {
  url: '/cable',
  getToken: null,
};

/**
 * Configure the ActionCable connection
 * @param {Object} options
 * @param {string} options.url - WebSocket URL (default: '/cable')
 * @param {Function} options.getToken - Function that returns auth token
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
