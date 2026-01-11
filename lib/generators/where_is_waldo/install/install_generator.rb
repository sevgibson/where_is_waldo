# frozen_string_literal: true

require "rails/generators"
require "rails/generators/active_record"

module WhereIsWaldo
  module Generators
    class InstallGenerator < Rails::Generators::Base
      include ActiveRecord::Generators::Migration

      source_root File.expand_path("templates", __dir__)

      class_option :auth_method, type: :string, default: "jwt",
        desc: "Authentication method (jwt, devise, custom)"
      class_option :subject_class, type: :string, default: "User",
        desc: "The model class being tracked (User, Member, etc.)"
      class_option :subject_column, type: :string, default: "user_id",
        desc: "Foreign key column name for the subject"
      class_option :session_column, type: :string, default: "jti",
        desc: "Column name for session identifier"

      def create_initializer
        template "initializer.rb.tt", "config/initializers/where_is_waldo.rb"
      end

      def generate_migration
        migration_template "migration.rb.tt", "db/migrate/create_presences.rb"
      end

      def create_channels
        template "connection.rb.tt", "app/channels/application_cable/connection.rb"
        template "channel.rb.tt", "app/channels/application_cable/channel.rb"
        template "presence_channel.rb.tt", "app/channels/presence_channel.rb"
      end

      def show_post_install_message
        say ""
        say "WhereIsWaldo installed successfully!", :green
        say ""
        say "Next steps:"
        say "  1. Review config/initializers/where_is_waldo.rb"
        say "  2. Run: rails db:migrate"
        say "  3. Configure your frontend PresenceProvider:"
        say ""
        say "     <PresenceProvider config={{ channelName: 'PresenceChannel' }}>"
        say "       <App />"
        say "     </PresenceProvider>"
        say ""
      end

      private

      def migration_version
        "[#{ActiveRecord::VERSION::STRING.to_f}]"
      end

      def subject_class
        options[:subject_class]
      end

      def subject_column
        options[:subject_column]
      end

      def session_column
        options[:session_column]
      end

      def auth_method
        options[:auth_method]
      end
    end
  end
end
