// WhereIsWaldo Test Application
//
// Simple ActionCable presence client for e2e testing

(function() {
  'use strict';

  // ActionCable consumer - loaded from Rails
  var consumer = null;
  var subscription = null;
  var heartbeatInterval = null;
  var activityTimeout = null;

  var state = {
    connected: false,
    tabVisible: true,
    userActive: true
  };

  // DOM elements
  var elements = {};

  function updateUI() {
    if (elements.connectionStatus) {
      elements.connectionStatus.textContent = state.connected ? 'Connected' : 'Disconnected';
    }
    if (elements.presenceStatus) {
      elements.presenceStatus.className = state.connected ? 'connected' : 'disconnected';
    }
    if (elements.tabVisible) {
      elements.tabVisible.textContent = state.tabVisible ? 'Yes' : 'No';
    }
    if (elements.userActive) {
      elements.userActive.textContent = state.userActive ? 'Yes' : 'No';
    }
    if (elements.connected) {
      elements.connected.textContent = state.connected ? 'Yes' : 'No';
    }
  }

  function sendHeartbeat() {
    if (subscription) {
      subscription.perform('heartbeat', {
        tab_visible: state.tabVisible,
        subject_active: state.userActive,
        metadata: {}
      });
    }
  }

  function startHeartbeat() {
    if (heartbeatInterval) clearInterval(heartbeatInterval);
    heartbeatInterval = setInterval(sendHeartbeat, 30000);
    // Send initial heartbeat
    sendHeartbeat();
  }

  function stopHeartbeat() {
    if (heartbeatInterval) {
      clearInterval(heartbeatInterval);
      heartbeatInterval = null;
    }
  }

  function handleActivity() {
    state.userActive = true;
    updateUI();

    if (activityTimeout) clearTimeout(activityTimeout);
    activityTimeout = setTimeout(function() {
      state.userActive = false;
      updateUI();
      sendHeartbeat();
    }, 30000);
  }

  function handleVisibilityChange() {
    state.tabVisible = !document.hidden;
    updateUI();
    sendHeartbeat();
  }

  function connect() {
    if (!window.appData) {
      console.error('No app data found');
      return;
    }

    var cableUrl = window.appData.cableUrl +
      '?user_id=' + encodeURIComponent(window.appData.userId) +
      '&session_id=' + encodeURIComponent(window.appData.sessionId);

    // Create consumer
    consumer = ActionCable.createConsumer(cableUrl);

    // Subscribe to presence channel
    subscription = consumer.subscriptions.create(
      { channel: 'WhereIsWaldo::PresenceChannel' },
      {
        connected: function() {
          console.log('Connected to presence channel');
          state.connected = true;
          updateUI();
          startHeartbeat();
        },

        disconnected: function() {
          console.log('Disconnected from presence channel');
          state.connected = false;
          updateUI();
          stopHeartbeat();
        },

        received: function(data) {
          console.log('Received:', data);
          handleMessage(data);
        }
      }
    );
  }

  function handleMessage(data) {
    // Handle different message types
    if (data.type === 'presence_update') {
      // Could update online users list
      console.log('Presence update:', data);
    } else if (data.type === 'broadcast') {
      console.log('Broadcast:', data);
    }
  }

  function init() {
    // Cache DOM elements
    elements.connectionStatus = document.getElementById('connection-status');
    elements.presenceStatus = document.getElementById('presence-status');
    elements.tabVisible = document.getElementById('tab-visible');
    elements.userActive = document.getElementById('user-active');
    elements.connected = document.getElementById('connected');
    elements.onlineUsers = document.getElementById('online-users');

    // Set up activity listeners
    document.addEventListener('mousemove', handleActivity);
    document.addEventListener('keydown', handleActivity);
    document.addEventListener('scroll', handleActivity);
    document.addEventListener('click', handleActivity);

    // Set up visibility listener
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Initialize state
    state.tabVisible = !document.hidden;
    updateUI();

    // Connect to ActionCable
    connect();
  }

  // Wait for DOM and ActionCable
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Expose for testing
  window.waldoPresence = {
    getState: function() { return state; },
    sendHeartbeat: sendHeartbeat,
    disconnect: function() {
      if (consumer) consumer.disconnect();
    }
  };
})();
