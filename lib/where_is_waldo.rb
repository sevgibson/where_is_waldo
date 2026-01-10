# frozen_string_literal: true

require "where_is_waldo/version"
require "where_is_waldo/configuration"
require "where_is_waldo/engine" if defined?(Rails)

module WhereIsWaldo
  class << self
    def configuration
      @configuration ||= Configuration.new
    end

    def configure
      yield(configuration)
    end

    def config
      configuration
    end

    def reset_configuration!
      @configuration = Configuration.new
    end

    # Delegate common methods to PresenceService for convenience
    # These become available after Rails loads the engine

    def connect(...)
      PresenceService.connect(...)
    end

    def disconnect(...)
      PresenceService.disconnect(...)
    end

    def heartbeat(...)
      PresenceService.heartbeat(...)
    end

    def online_in_room(...)
      PresenceService.online_in_room(...)
    end

    def subject_online?(...)
      PresenceService.subject_online?(...)
    end

    def subject_in_room?(...)
      PresenceService.subject_in_room?(...)
    end

    def sessions_for_subject(...)
      PresenceService.sessions_for_subject(...)
    end

    def session_status(...)
      PresenceService.session_status(...)
    end

    def cleanup(...)
      PresenceService.cleanup(...)
    end

    def broadcast_to_room(...)
      Broadcaster.broadcast_to_room(...)
    end

    def broadcast_to_subject(...)
      Broadcaster.broadcast_to_subject(...)
    end

    def broadcast_to_session(...)
      Broadcaster.broadcast_to_session(...)
    end
  end
end
