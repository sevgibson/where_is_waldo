# frozen_string_literal: true

module WhereIsWaldo
  class PresenceChannel < ApplicationCable::Channel
    def subscribed
      stream_from subject_stream

      register_presence
    end

    def unsubscribed
      WhereIsWaldo.disconnect(session_id: waldo_session_id)
    end

    def heartbeat(data = {})
      WhereIsWaldo.heartbeat(
        session_id: waldo_session_id,
        tab_visible: data["tab_visible"] != false,
        subject_active: data["subject_active"] != false,
        metadata: data["metadata"] || {}
      )
    end

    private

    def register_presence
      WhereIsWaldo.connect(
        session_id: waldo_session_id,
        subject_id: waldo_subject_id,
        metadata: params[:metadata] || {}
      )
    end

    def subject_stream
      "where_is_waldo:subject:#{waldo_subject_id}"
    end
  end
end
