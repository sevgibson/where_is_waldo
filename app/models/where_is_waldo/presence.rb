# frozen_string_literal: true

module WhereIsWaldo
  class Presence < ActiveRecord::Base
    self.table_name = -> { WhereIsWaldo.config.table_name }

    class << self
      def table_name
        tn = WhereIsWaldo.config.table_name
        tn.respond_to?(:call) ? tn.call : tn
      end

      def configure_associations!
        subject_class = WhereIsWaldo.config.subject_class_constant
        return unless subject_class

        subject_col = WhereIsWaldo.config.subject_column
        belongs_to :subject,
                   class_name: subject_class.name,
                   foreign_key: subject_col,
                   optional: true
      end

      # Dynamic column accessors
      def session_column
        WhereIsWaldo.config.session_column
      end

      def subject_column
        WhereIsWaldo.config.subject_column
      end

      def room_column
        WhereIsWaldo.config.room_column
      end
    end

    # Validations using configured column names
    validates_presence_of -> { self.class.session_column }
    validates_uniqueness_of -> { self.class.session_column }

    # Scopes
    scope :online, ->(timeout: nil) {
      threshold = (timeout || WhereIsWaldo.config.timeout_duration).ago
      where("last_heartbeat > ?", threshold)
    }

    scope :in_room, ->(room_id) {
      where(self.class.room_column => room_id)
    }

    scope :for_subject, ->(subject_id) {
      where(self.class.subject_column => subject_id)
    }

    scope :visible_tab, -> { where(tab_visible: true) }
    scope :active, -> { where(subject_active: true) }

    # Convert to hash for API responses
    def as_presence_hash
      config = WhereIsWaldo.config

      {
        session_column => self[config.session_column],
        subject_column => self[config.subject_column],
        room_column => self[config.room_column],
        connected_at: connected_at&.iso8601,
        last_heartbeat: last_heartbeat&.iso8601,
        tab_visible: tab_visible,
        subject_active: subject_active,
        last_activity: last_activity&.iso8601,
        metadata: metadata,
        subject: subject_data
      }.transform_keys(&:to_sym)
    end

    # Check if this presence is considered online
    def online?(timeout: nil)
      threshold = (timeout || WhereIsWaldo.config.timeout_duration).ago
      last_heartbeat && last_heartbeat > threshold
    end

    private

    def session_column
      self.class.session_column
    end

    def subject_column
      self.class.subject_column
    end

    def room_column
      self.class.room_column
    end

    def subject_data
      subject_record = try(:subject)
      WhereIsWaldo.config.build_subject_data(subject_record)
    end
  end
end
