# frozen_string_literal: true

require "rails/generators"
require "rails/generators/migration"

module WhereIsWaldo
  module Generators
    class InstallGenerator < Rails::Generators::Base
      include Rails::Generators::Migration

      source_root File.expand_path("templates", __dir__)

      class_option :session_column, type: :string, default: "session_id",
                                    desc: "Column name for session identifier"
      class_option :subject_column, type: :string, default: "subject_id",
                                    desc: "Column name for subject (user/member/etc) identifier"
      class_option :table_name, type: :string, default: "presences",
                                desc: "Table name for presences"
      class_option :subject_table, type: :string, default: nil,
                                   desc: "Subject table for foreign key (e.g., 'users', 'members')"

      def self.next_migration_number(_path)
        Time.now.utc.strftime("%Y%m%d%H%M%S")
      end

      def create_migration
        migration_template "create_presences.rb.tt",
                           "db/migrate/create_#{table_name}.rb"
      end

      def create_initializer
        template "initializer.rb.tt",
                 "config/initializers/where_is_waldo.rb"
      end

      def display_post_install_message
        say ""
        say "=" * 60
        say "WhereIsWaldo has been installed!"
        say "=" * 60
        say ""
        say "Your configuration:"
        say "  Table:          #{table_name}"
        say "  Session column: #{session_column}"
        say "  Subject column: #{subject_column}"
        say ""
        say "Next steps:"
        say ""
        say "1. Review the initializer:"
        say "   config/initializers/where_is_waldo.rb"
        say ""
        say "2. Set your subject class in the initializer:"
        say "   config.subject_class = 'User'  # or 'Member', 'Student', etc."
        say ""
        say "3. Run migrations:"
        say "   rails db:migrate"
        say ""
        say "4. Add the React provider to your app:"
        say "   import { PresenceProvider } from '@sevgibson/where-is-waldo';"
        say ""
        say "=" * 60
      end

      private

      def table_name
        options[:table_name]
      end

      def session_column
        options[:session_column]
      end

      def subject_column
        options[:subject_column]
      end

      def subject_table
        options[:subject_table]
      end
    end
  end
end
