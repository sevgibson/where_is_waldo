# frozen_string_literal: true

module WhereIsWaldo
  class Broadcaster
    class << self
      # Broadcast a message to all sessions in a room
      # @param room_id [Integer/String] Room identifier
      # @param message [Hash] Message payload
      def broadcast_to_room(room_id, message)
        ActionCable.server.broadcast(room_stream(room_id), message)
      end

      # Broadcast a message to all sessions of a subject
      # @param subject_id [Integer/String] Subject identifier
      # @param message [Hash] Message payload
      def broadcast_to_subject(subject_id, message)
        ActionCable.server.broadcast(subject_stream(subject_id), message)
      end

      # Broadcast a message to a specific session
      # @param session_id [String] Session identifier
      # @param message [Hash] Message payload
      def broadcast_to_session(session_id, message)
        # Get the session's subject_id to use subject stream
        status = PresenceService.session_status(session_id)
        return false unless status

        # Use subject stream with session filter
        ActionCable.server.broadcast(subject_stream(status[:subject_id]), {
          **message,
          _target_session: session_id
        })
        true
      end

      # Broadcast to all online subjects in a room
      # @param room_id [Integer/String] Room identifier
      # @param message [Hash] Message payload
      # @param except_subject_id [Integer/String] Optional subject to exclude
      def broadcast_to_online_in_room(room_id, message, except_subject_id: nil)
        online = PresenceService.online_in_room(room_id)

        online.each do |presence|
          next if except_subject_id && presence[:subject_id].to_s == except_subject_id.to_s

          broadcast_to_subject(presence[:subject_id], message)
        end
      end

      private

      def room_stream(room_id)
        "where_is_waldo:room:#{room_id}"
      end

      def subject_stream(subject_id)
        "where_is_waldo:subject:#{subject_id}"
      end
    end
  end
end
