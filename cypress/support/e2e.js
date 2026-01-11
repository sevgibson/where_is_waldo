// Cypress E2E Support File

// Custom commands for presence testing
Cypress.Commands.add('waitForConnection', (options = {}) => {
  const timeout = options.timeout || 10000;

  return cy.get('[data-testid="connection-status"]', { timeout })
    .should('contain', 'Connected');
});

Cypress.Commands.add('getPresenceState', () => {
  return cy.window().then((win) => {
    if (win.waldoPresence) {
      return win.waldoPresence.getState();
    }
    throw new Error('waldoPresence not available on window');
  });
});

Cypress.Commands.add('sendHeartbeat', () => {
  return cy.window().then((win) => {
    if (win.waldoPresence) {
      win.waldoPresence.sendHeartbeat();
    }
  });
});

Cypress.Commands.add('disconnectPresence', () => {
  return cy.window().then((win) => {
    if (win.waldoPresence) {
      win.waldoPresence.disconnect();
    }
  });
});

Cypress.Commands.add('checkOnlineStatus', () => {
  return cy.request('/status').its('body');
});

// Handle uncaught exceptions
Cypress.on('uncaught:exception', (err, runnable) => {
  // Ignore ActionCable connection errors during test
  if (err.message.includes('ActionCable') || err.message.includes('WebSocket')) {
    return false;
  }
  // Ignore cross-origin script errors
  if (err.message.includes('Script error')) {
    return false;
  }
  // Ignore network/fetch errors
  if (err.message.includes('fetch') || err.message.includes('Failed to fetch')) {
    return false;
  }
  return true;
});
