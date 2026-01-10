# WhereIsWaldo

Real-time presence tracking for Rails + React applications using ActionCable.

## Features

- Track who's online in any scope (rooms, channels, organizations, etc.)
- Monitor tab visibility and user activity
- Multi-session support (same user on multiple devices/tabs)
- Fully configurable column names and terminology
- Database or Redis storage adapters
- React hooks and context provider

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
  --room_column=channel_id \
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
  config.subject_column = :user_id
  config.room_column = :channel_id

  # Subject model for eager loading (optional)
  config.subject_class = "User"

  # Custom subject data (optional)
  config.subject_data_proc = ->(user) {
    {
      id: user.id,
      name: user.name,
      avatar_url: user.avatar_url
    }
  }

  # Timing
  config.timeout = 90            # Seconds until offline
  config.heartbeat_interval = 30 # Expected heartbeat frequency

  # Authentication (optional - customize for your auth system)
  config.authenticate_proc = ->(request) {
    token = request.params[:token]
    # Decode your token and return subject_id
    # Or return { subject_id: ..., session_id: ... }
  }

  # Redis client (for :redis adapter)
  # config.redis_client = Redis.new(url: ENV["REDIS_URL"])
end
```

### React

```jsx
import { configureCable } from '@sevgibson/where-is-waldo';

// Configure the ActionCable connection
configureCable({
  url: '/cable',
  getToken: () => localStorage.getItem('auth_token'),
});
```

## Usage

### React Context Provider

```jsx
import { PresenceProvider, usePresenceContext } from '@sevgibson/where-is-waldo';

function App() {
  return (
    <PresenceProvider
      roomId={currentChannelId}
      metadata={{ device: 'desktop' }}
      onSubjectJoined={(data) => console.log('Joined:', data)}
      onSubjectLeft={(data) => console.log('Left:', data)}
    >
      <OnlineIndicator />
    </PresenceProvider>
  );
}

function OnlineIndicator() {
  const { connected, onlineSubjects, tabVisible, subjectActive } = usePresenceContext();

  return (
    <div>
      <span>{connected ? 'Connected' : 'Disconnected'}</span>
      <ul>
        {onlineSubjects.map((presence) => (
          <li key={presence.session_id}>
            {presence.subject?.name || `User ${presence.subject_id}`}
          </li>
        ))}
      </ul>
    </div>
  );
}
```

### usePresence Hook (without Provider)

```jsx
import { usePresence } from '@sevgibson/where-is-waldo';

function ChatRoom({ channelId }) {
  const { connected, onlineSubjects, refresh } = usePresence(channelId, {
    heartbeatInterval: 30000,
    activityTimeout: 30000,
  });

  return (
    <div>
      <h3>Online ({onlineSubjects.length})</h3>
      <button onClick={refresh}>Refresh</button>
    </div>
  );
}
```

### Backend API

```ruby
# Register presence
WhereIsWaldo.connect(
  session_id: "abc-123",
  subject_id: current_user.id,
  room_id: channel.id
)

# Remove presence
WhereIsWaldo.disconnect(session_id: "abc-123")
# Or disconnect all sessions for a subject
WhereIsWaldo.disconnect(subject_id: current_user.id)

# Update heartbeat
WhereIsWaldo.heartbeat(
  session_id: "abc-123",
  tab_visible: true,
  subject_active: false
)

# Query online subjects
WhereIsWaldo.online_in_room(channel.id)
# => [{ session_id: "...", subject_id: 1, subject: {...}, ... }]

# Get sessions for a subject
WhereIsWaldo.sessions_for_subject(user.id)

# Check if subject is online
WhereIsWaldo.subject_online?(user.id)

# Cleanup stale records (for database adapter)
WhereIsWaldo.cleanup(timeout: 120)
```

### Broadcasting

```ruby
# Broadcast to all in a room
WhereIsWaldo.broadcast_to_room(channel.id, {
  type: "notification",
  message: "Hello everyone!"
})

# Broadcast to a specific subject (all their sessions)
WhereIsWaldo.broadcast_to_subject(user.id, {
  type: "alert",
  message: "You have a new message"
})

# Broadcast to a specific session
WhereIsWaldo.broadcast_to_session("abc-123", { ... })
```

## Cleanup Job

For the database adapter, schedule cleanup of stale records:

```ruby
# config/initializers/sidekiq.rb (if using Sidekiq)
Sidekiq::Cron::Job.create(
  name: 'Presence cleanup',
  cron: '*/5 * * * *',  # Every 5 minutes
  class: 'WhereIsWaldo::PresenceCleanupJob'
)

# Or call manually
WhereIsWaldo::PresenceCleanupJob.perform_later
```

## License

MIT License
