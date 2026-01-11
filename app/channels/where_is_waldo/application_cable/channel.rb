# frozen_string_literal: true

module WhereIsWaldo
  module ApplicationCable
    class Channel < ActionCable::Channel::Base
      private

      def waldo_session_id
        connection.session_id
      end

      def waldo_subject_id
        subject = connection.try(:current_user) ||
                  connection.try("current_#{WhereIsWaldo.configuration.subject_class.underscore}")
        subject&.id
      end
    end
  end
end
