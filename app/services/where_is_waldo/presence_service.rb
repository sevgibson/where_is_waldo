# frozen_string_literal: true

module WhereIsWaldo
  class PresenceService
    class << self
      # Register a new presence
      # @param session_id [String] Unique session identifier
      # @param subject_id [Integer/String] Subject identifier (user, account, etc.)
      # @param room_id [Integer/String] Room identifier
      # @param metadata [Hash] Additional data
      # @return [Boolean] success
      def connect(session_id:, subject_id:, room_id:, metadata: {})
        adapter.connect(
          session_id: session_id,
          subject_id: subject_id,
          room_id: room_id,
          metadata: metadata
        )
      end

      # Remove a presence by session, or all presences for a subject
      # @param session_id [String] Session identifier (optional)
      # @param subject_id [Integer/String] Subject identifier (optional)
      # @param room_id [Integer/String] Room identifier (optional)
      # @return [Boolean] success
      def disconnect(session_id: nil, subject_id: nil, room_id: nil)
        adapter.disconnect(
          session_id: session_id,
          subject_id: subject_id,
          room_id: room_id
        )
      end

      # Update heartbeat for a session
      # @param session_id [String] Session identifier (optional if subject_id + room_id provided)
      # @param subject_id [Integer/String] Subject identifier (optional)
      # @param room_id [Integer/String] Room identifier (optional)
      # @param tab_visible [Boolean] Is tab in foreground
      # @param subject_active [Boolean] Recent activity
      # @param metadata [Hash] Additional data to merge
      # @return [Boolean] success
      def heartbeat(session_id: nil, subject_id: nil, room_id: nil,
                    tab_visible: true, subject_active: true, metadata: {})
        adapter.heartbeat(
          session_id: session_id,
          subject_id: subject_id,
          room_id: room_id,
          tab_visible: tab_visible,
          subject_active: subject_active,
          metadata: metadata
        )
      end

      # Get all online presences in a room
      # @param room_id [Integer/String] Room identifier
      # @param timeout [Integer] Seconds threshold (defaults to config.timeout)
      # @return [Array<Hash>] Presence records
      def online_in_room(room_id, timeout: nil)
        adapter.online_in_room(room_id, timeout: timeout)
      end

      # Get all sessions for a subject
      # @param subject_id [Integer/String] Subject identifier
      # @param room_id [Integer/String] Optional room filter
      # @return [Array<Hash>] Presence records
      def sessions_for_subject(subject_id, room_id: nil)
        adapter.sessions_for_subject(subject_id, room_id: room_id)
      end

      # Get status of a specific session
      # @param session_id [String] Session identifier
      # @return [Hash, nil] Presence record or nil
      def session_status(session_id)
        adapter.session_status(session_id)
      end

      # Check if a subject is online in any room
      # @param subject_id [Integer/String] Subject identifier
      # @return [Boolean]
      def subject_online?(subject_id)
        sessions_for_subject(subject_id).any?
      end

      # Check if a subject is online in a specific room
      # @param subject_id [Integer/String] Subject identifier
      # @param room_id [Integer/String] Room identifier
      # @return [Boolean]
      def subject_in_room?(subject_id, room_id)
        sessions_for_subject(subject_id, room_id: room_id).any?
      end

      # Cleanup stale records
      # @param timeout [Integer] Seconds threshold (defaults to config.timeout)
      # @return [Integer] Number of records removed
      def cleanup(timeout: nil)
        adapter.cleanup(timeout: timeout)
      end

      private

      def adapter
        @adapter ||= build_adapter
      end

      def build_adapter
        case WhereIsWaldo.config.adapter
        when :database
          Adapters::DatabaseAdapter.new
        when :redis
          Adapters::RedisAdapter.new
        else
          raise ArgumentError, "Unknown adapter: #{WhereIsWaldo.config.adapter}"
        end
      end

      # Reset adapter (useful for testing or config changes)
      def reset_adapter!
        @adapter = nil
      end
    end
  end
end
