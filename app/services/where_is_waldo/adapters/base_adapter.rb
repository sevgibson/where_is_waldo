# frozen_string_literal: true

module WhereIsWaldo
  module Adapters
    class BaseAdapter
      # Register a presence
      # @param session_id [String] Unique session identifier
      # @param subject_id [Integer/String] Subject identifier (user, member, etc.)
      # @param metadata [Hash] Additional data
      # @return [Boolean] success
      def connect(session_id:, subject_id:, metadata: {})
        raise NotImplementedError
      end

      # Remove a presence
      # @param session_id [String] Session identifier (optional if subject_id provided)
      # @param subject_id [Integer/String] Subject identifier (optional)
      # @return [Boolean] success
      def disconnect(session_id: nil, subject_id: nil)
        raise NotImplementedError
      end

      # Update heartbeat
      # @param session_id [String] Session identifier
      # @param tab_visible [Boolean] Is tab in foreground
      # @param subject_active [Boolean] Recent activity
      # @param metadata [Hash] Additional data
      # @return [Boolean] success
      def heartbeat(session_id:, tab_visible: true, subject_active: true, metadata: {})
        raise NotImplementedError
      end

      # Get all online subject IDs
      # @param timeout [Integer] Seconds threshold
      # @return [Array<Integer>] Subject IDs
      def online_subject_ids(timeout: nil)
        raise NotImplementedError
      end

      # Get all sessions for a subject
      # @param subject_id [Integer/String] Subject identifier
      # @return [Array<Hash>] Presence records
      def sessions_for_subject(subject_id)
        raise NotImplementedError
      end

      # Get session status
      # @param session_id [String] Session identifier
      # @return [Hash, nil] Presence record or nil
      def session_status(session_id)
        raise NotImplementedError
      end

      # Remove stale records
      # @param timeout [Integer] Seconds threshold
      # @return [Integer] Number removed
      def cleanup(timeout: nil)
        raise NotImplementedError
      end

      protected

      def config
        WhereIsWaldo.config
      end

      def default_timeout
        config.timeout
      end

      def session_column
        config.session_column
      end

      def subject_column
        config.subject_column
      end
    end
  end
end
