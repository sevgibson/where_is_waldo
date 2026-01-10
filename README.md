# WhereIsWaldo

Real-time presence tracking for Rails + React applications using ActionCable.

## Features

- Track who's online across your application
- Broadcast messages to any AR scope (users, members, admins, etc.)
- Message type routing with registered handlers
- Monitor tab visibility and user activity
- Multi-session support (same user on multiple devices/tabs)
- Fully configurable - no assumptions about your model names
- Database or Redis storage adapters

## Installation

### Rails Gem

Add to your Gemfile:

```ruby
gem 'where_is_waldo', github: 'sevgibson/where_is_waldo'
```

Run the install generator:

```bash
rails generate where_is_waldo:install \
  --table_name=presences \
  --session_column=session_id \
  --subject_column=user_id \
  --subject_table=users
```

Run migrations:

```bash
rails db:migrate
```

### NPM Package

```bash
npm install @sevgibson/where-is-waldo @rails/actioncable
```

## Configuration

### Rails (config/initializers/where_is_waldo.rb)

```ruby
WhereIsWaldo.configure do |config|
  # Storage adapter: :database or :redis
  config.adapter = :database

  # Table/column names (must match your migration)
  config.table_name = "presences"
  config.session_column = :session_id
  config.subject_column = :user_id  # or :member_id, :student_id, etc.

  # Subject model (required for scope-based operations)
  config.subject_class = "User"  # or "Member", "Student", etc.

  # Custom subject data (optional)
  config.subject_data_proc = ->(user) {
    { id: user.id, name: user.name, avatar_url: user.avatar_url }
  }

  # Timing
  config.timeout = 90
  config.heartbeat_interval = 30

  # Authentication (customize for your auth system)
  config.authenticate_proc = ->(request) {
    token = request.params[:token]
    # Decode your token and return subject_id
  }

  # Redis (for :redis adapter)
  # config.redis_client = Redis.new(url: ENV["REDIS_URL"])
end
```

### React

```jsx
import { configureCable } from '@sevgibson/where-is-waldo';

configureCable({
  url: '/cable',
  getToken: () => localStorage.getItem('auth_token'),
  handlers: {
    notification: (data) => showToast(data.message),
    force_logout: () => {
      logout();
      navigate('/login');
    },
    data_refresh: (data) => queryClient.invalidateQueries(data.keys),
  }
});
```

## Usage

### React Provider

```jsx
import { PresenceProvider, usePresenceContext } from '@sevgibson/where-is-waldo';

function App() {
  return (
    <PresenceProvider
      metadata={{ device: 'desktop' }}
      onConnected={() => console.log('Connected!')}
      onDisconnected={() => console.log('Disconnected')}
    >
      <MyApp />
    </PresenceProvider>
  );
}

function StatusIndicator() {
  const { connected, tabVisible, subjectActive } = usePresenceContext();

  return (
    <span className={connected ? 'online' : 'offline'}>
      {connected ? 'Connected' : 'Disconnected'}
    </span>
  );
}
```

### usePresence Hook

```jsx
import { usePresence } from '@sevgibson/where-is-waldo';

function Dashboard() {
  const { connected, tabVisible, subjectActive } = usePresence({
    metadata: { page: 'dashboard' },
    onConnected: () => console.log('Connected'),
  });

  return <div>Status: {connected ? 'Online' : 'Offline'}</div>;
}
```

### Backend: Query Who's Online

```ruby
# Get online users from any AR scope
WhereIsWaldo.online(org.users)
# => ActiveRecord::Relation of online users

WhereIsWaldo.online(org.users.admin)
# => Only online admins in this org

WhereIsWaldo.online(User.where(plan_id: premium_plan.id))
# => Online users on premium plan

# Just get IDs
WhereIsWaldo.online_ids(org.users)
# => [1, 5, 12, ...]

# Check if specific user is online
WhereIsWaldo.subject_online?(user.id)
# => true/false

# Get all sessions for a user
WhereIsWaldo.sessions_for_subject(user.id)
# => [{ session_id: "...", connected_at: ..., tab_visible: true, ... }]
```

### Backend: Broadcasting

```ruby
# Broadcast to users in any AR scope
WhereIsWaldo.broadcast_to(org.users, :notification, {
  message: "System maintenance in 5 minutes"
})

# Broadcast to admins only
WhereIsWaldo.broadcast_to(org.users.admin, :alert, {
  level: "warning",
  message: "Server load high"
})

# Broadcast to users on a specific plan
WhereIsWaldo.broadcast_to(User.where(plan_id: starter.id), :upgrade_prompt, {
  feature: "advanced_reports"
})

# Broadcast only to online users (skip offline)
WhereIsWaldo.broadcast_to_online(org.users, :realtime_update, {
  type: "new_message",
  count: 5
})

# Broadcast to a single user (all their sessions)
WhereIsWaldo.broadcast_to(user, :force_logout, {
  reason: "Password changed"
})

# Broadcast to a specific session
WhereIsWaldo.broadcast_to_session(session_id, :session_warning, {
  message: "This session will expire soon"
})
```

### Presence Management

```ruby
# Register presence (usually done automatically by channel)
WhereIsWaldo.connect(session_id: "abc-123", subject_id: user.id)

# Remove presence
WhereIsWaldo.disconnect(session_id: "abc-123")

# Disconnect all sessions for a user
WhereIsWaldo.disconnect(subject_id: user.id)

# Update heartbeat
WhereIsWaldo.heartbeat(
  session_id: "abc-123",
  tab_visible: true,
  subject_active: false
)

# Cleanup stale records (for database adapter)
WhereIsWaldo.cleanup(timeout: 120)
```

## Cleanup Job

For the database adapter, schedule cleanup of stale records:

```ruby
# config/initializers/sidekiq.rb
Sidekiq::Cron::Job.create(
  name: 'Presence cleanup',
  cron: '*/5 * * * *',
  class: 'WhereIsWaldo::PresenceCleanupJob'
)
```

## Message Handler Registration

Register handlers at app initialization or dynamically:

```jsx
import { configureCable, registerHandler, unregisterHandler } from '@sevgibson/where-is-waldo';

// At initialization
configureCable({
  url: '/cable',
  getToken: () => getAuthToken(),
  handlers: {
    notification: showNotification,
    force_logout: handleForceLogout,
  }
});

// Or register dynamically
registerHandler('chat_message', (data) => {
  addMessageToChat(data);
});

// Unregister when no longer needed
unregisterHandler('chat_message');
```

## License

MIT License
