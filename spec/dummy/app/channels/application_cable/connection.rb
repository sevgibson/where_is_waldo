# frozen_string_literal: true

module ApplicationCable
  class Connection < ActionCable::Connection::Base
    identified_by :waldo_subject_id, :waldo_session_id

    def connect
      auth_data = WhereIsWaldo.config.authenticate_proc.call(env)

      if auth_data[:subject_id] && auth_data[:session_id]
        self.waldo_subject_id = auth_data[:subject_id]
        self.waldo_session_id = auth_data[:session_id]
      else
        reject_unauthorized_connection
      end
    end
  end
end
