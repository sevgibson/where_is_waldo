describe('WhereIsWaldo Presence', () => {
  beforeEach(() => {
    cy.visit('/');
  });

  describe('Connection', () => {
    it('displays the home page', () => {
      cy.contains('h1', 'WhereIsWaldo Test');
    });

    it('shows initial connection status', () => {
      cy.get('[data-testid="connection-status"]').should('exist');
    });

    it('connects to presence channel', () => {
      cy.waitForConnection();
      cy.get('[data-testid="connected"]').should('contain', 'Yes');
    });

    it('shows session id', () => {
      cy.get('[data-testid="session-id"]').should('not.be.empty');
    });
  });

  describe('Presence State', () => {
    beforeEach(() => {
      cy.waitForConnection();
    });

    it('shows tab visible status', () => {
      cy.get('[data-testid="tab-visible"]').should('contain', 'Yes');
    });

    it('shows user active status', () => {
      cy.get('[data-testid="user-active"]').should('contain', 'Yes');
    });

    it('updates presence state in window object', () => {
      cy.getPresenceState().then((state) => {
        expect(state.connected).to.be.true;
        expect(state.tabVisible).to.be.true;
      });
    });
  });

  describe('API Status', () => {
    beforeEach(() => {
      cy.waitForConnection();
      // Wait a bit for presence to register
      cy.wait(1000);
    });

    it('shows online count via API', () => {
      cy.checkOnlineStatus().then((status) => {
        expect(status.online_count).to.be.at.least(1);
      });
    });

    it('includes current user in online ids', () => {
      cy.window().then((win) => {
        const userId = win.appData.userId;
        cy.checkOnlineStatus().then((status) => {
          expect(status.online_ids).to.include(userId);
        });
      });
    });
  });

  describe('Heartbeat', () => {
    beforeEach(() => {
      cy.waitForConnection();
    });

    it('can send heartbeat manually', () => {
      cy.sendHeartbeat();
      // Just verify it doesn't error
      cy.get('[data-testid="connection-status"]').should('contain', 'Connected');
    });
  });

  describe('Disconnection', () => {
    beforeEach(() => {
      cy.waitForConnection();
    });

    it('can disconnect from presence', () => {
      cy.disconnectPresence();
      cy.get('[data-testid="connection-status"]', { timeout: 5000 })
        .should('contain', 'Disconnected');
    });

    it('updates UI when disconnected', () => {
      cy.disconnectPresence();
      cy.get('[data-testid="connected"]', { timeout: 5000 })
        .should('contain', 'No');
    });
  });

  describe('Activity Tracking', () => {
    beforeEach(() => {
      cy.waitForConnection();
    });

    it('detects user activity on mouse move', () => {
      // Simulate mouse movement
      cy.get('body').trigger('mousemove');
      cy.getPresenceState().then((state) => {
        expect(state.userActive).to.be.true;
      });
    });

    it('detects user activity on keydown', () => {
      cy.get('body').trigger('keydown', { key: 'a' });
      cy.getPresenceState().then((state) => {
        expect(state.userActive).to.be.true;
      });
    });
  });
});
