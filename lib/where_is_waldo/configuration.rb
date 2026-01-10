# frozen_string_literal: true

module WhereIsWaldo
  class Configuration
    # Storage settings
    attr_accessor :adapter           # :database or :redis
    attr_accessor :table_name        # defaults to 'presences'
    attr_accessor :redis_client      # custom Redis instance (optional)

    # Column names - fully configurable, no assumptions about your schema
    attr_accessor :session_column    # unique identifier per connection/tab (e.g., :session_id, :jti)
    attr_accessor :subject_column    # who is present (e.g., :user_id, :account_id, :device_id)
    attr_accessor :room_column       # where they are (e.g., :room_id, :channel_id, :organization_id)

    # Optional: subject model for eager loading (e.g., 'User', 'Account')
    # Set to nil to disable association/eager loading
    attr_accessor :subject_class

    # Optional: subject data method - proc that returns hash of subject info
    # Called with the subject record to build presence hash
    # Default returns { id: subject.id } if subject responds to :id
    attr_accessor :subject_data_proc

    # Timing
    attr_accessor :timeout           # seconds until considered offline (default: 90)
    attr_accessor :heartbeat_interval # expected heartbeat frequency (default: 30)

    # ActionCable settings
    attr_accessor :channel_name      # defaults to 'WhereIsWaldo::PresenceChannel'
    attr_accessor :authenticate_proc # proc to authenticate connection, receives request

    def initialize
      # Storage defaults
      @adapter = :database
      @table_name = "presences"
      @redis_client = nil

      # Column defaults - generic names
      @session_column = :session_id
      @subject_column = :subject_id
      @room_column = :room_id

      # Association defaults
      @subject_class = nil
      @subject_data_proc = nil

      # Timing defaults
      @timeout = 90
      @heartbeat_interval = 30

      # ActionCable defaults
      @channel_name = "WhereIsWaldo::PresenceChannel"
      @authenticate_proc = nil
    end

    # Helper to get timeout as duration
    def timeout_duration
      timeout.is_a?(ActiveSupport::Duration) ? timeout : timeout.seconds
    end

    # Helper to get subject class constant
    def subject_class_constant
      return nil unless subject_class.present?

      subject_class.is_a?(String) ? subject_class.constantize : subject_class
    end

    # Build subject data hash from a subject record
    def build_subject_data(subject)
      return {} unless subject

      if subject_data_proc
        subject_data_proc.call(subject)
      elsif subject.respond_to?(:id)
        { id: subject.id }
      else
        {}
      end
    end
  end
end
