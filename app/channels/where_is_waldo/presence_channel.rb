# frozen_string_literal: true

module WhereIsWaldo
  class PresenceChannel < ApplicationCable::Channel
    def subscribed
      @room_id = params[:room_id]

      reject and return unless @room_id

      stream_from room_stream
      stream_from subject_stream

      register_presence
      broadcast_joined
    end

    def unsubscribed
      return unless @room_id

      WhereIsWaldo.disconnect(session_id: waldo_session_id)
      broadcast_left
    end

    def heartbeat(data = {})
      WhereIsWaldo.heartbeat(
        session_id: waldo_session_id,
        tab_visible: data["tab_visible"] != false,
        subject_active: data["subject_active"] != false,
        metadata: data["metadata"] || {}
      )
    end

    def get_online_subjects
      subjects = WhereIsWaldo.online_in_room(@room_id)
      transmit(type: "online_subjects", subjects: subjects)
    end

    private

    def register_presence
      WhereIsWaldo.connect(
        session_id: waldo_session_id,
        subject_id: waldo_subject_id,
        room_id: @room_id,
        metadata: params[:metadata] || {}
      )
    end

    def broadcast_joined
      Broadcaster.broadcast_to_room(@room_id, {
        type: "presence_update",
        event: "joined",
        session_id: waldo_session_id,
        subject_id: waldo_subject_id,
        subject: subject_data
      })
    end

    def broadcast_left
      Broadcaster.broadcast_to_room(@room_id, {
        type: "presence_update",
        event: "left",
        session_id: waldo_session_id,
        subject_id: waldo_subject_id
      })
    end

    def subject_data
      return nil unless WhereIsWaldo.config.subject_class_constant

      subject = WhereIsWaldo.config.subject_class_constant.find_by(id: waldo_subject_id)
      return nil unless subject

      if WhereIsWaldo.config.subject_data_proc
        WhereIsWaldo.config.subject_data_proc.call(subject)
      else
        { id: subject.id }
      end
    end

    def room_stream
      "#{stream_prefix}:room:#{@room_id}"
    end

    def subject_stream
      "#{stream_prefix}:subject:#{waldo_subject_id}"
    end

    def stream_prefix
      "where_is_waldo"
    end
  end
end
