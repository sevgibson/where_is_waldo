# frozen_string_literal: true

module WhereIsWaldo
  class Presence < ApplicationRecord
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
        # rubocop:disable Rails/InverseOf -- dynamic association, inverse not applicable
        belongs_to :subject,
                   class_name: subject_class.name,
                   foreign_key: subject_col,
                   optional: true
        # rubocop:enable Rails/InverseOf
      end

      # Dynamic column accessors
      def session_column
        WhereIsWaldo.config.session_column
      end

      def subject_column
        WhereIsWaldo.config.subject_column
      end
    end

    # Scopes
    scope :online, lambda { |timeout: nil|
      threshold = (timeout || WhereIsWaldo.config.timeout).seconds.ago
      where("last_heartbeat > ?", threshold)
    }

    scope :for_subject, lambda { |subject_id|
      where(WhereIsWaldo.config.subject_column => subject_id)
    }

    scope :for_subjects, lambda { |subject_ids|
      where(WhereIsWaldo.config.subject_column => subject_ids)
    }

    scope :visible_tab, -> { where(tab_visible: true) }
    scope :active, -> { where(subject_active: true) }

    # Convert to hash for API responses
    def as_presence_hash
      config = WhereIsWaldo.config

      {
        session_id: self[config.session_column],
        subject_id: self[config.subject_column],
        connected_at: connected_at&.iso8601,
        last_heartbeat: last_heartbeat&.iso8601,
        tab_visible: tab_visible,
        subject_active: subject_active,
        last_activity: last_activity&.iso8601,
        metadata: metadata,
        subject: subject_data
      }
    end

    # Check if this presence is considered online
    def online?(timeout: nil)
      threshold = (timeout || WhereIsWaldo.config.timeout).seconds.ago
      last_heartbeat && last_heartbeat > threshold
    end

    private

    def subject_data
      subject_record = try(:subject)
      WhereIsWaldo.config.build_subject_data(subject_record)
    end
  end
end
