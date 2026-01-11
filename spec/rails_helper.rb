# frozen_string_literal: true

require "spec_helper"

ENV["RAILS_ENV"] ||= "test"

require_relative "dummy/config/environment"

require "rspec/rails"
require "factory_bot_rails"
require "database_cleaner/active_record"
require "action_cable/channel/test_case"

# Load support files except database_schema (loaded separately)
Dir[File.join(__dir__, "support", "**", "*.rb")].each do |f|
  next if f.include?("database_schema")

  require f
end

# Set up database schema
require_relative "support/database_schema"

RSpec.configure do |config|
  config.fixture_paths = [Rails.root.join("spec/fixtures")]
  config.use_transactional_fixtures = true
  config.infer_spec_type_from_file_location!
  config.filter_rails_from_backtrace!

  config.include FactoryBot::Syntax::Methods
  config.include ActiveSupport::Testing::TimeHelpers

  config.before(:suite) do
    DatabaseCleaner.strategy = :transaction
    DatabaseCleaner.clean_with(:truncation)
  end

  config.around do |example|
    DatabaseCleaner.cleaning do
      example.run
    end
  end

  config.before do
    WhereIsWaldo.reset_configuration!
    WhereIsWaldo.configure do |c|
      c.subject_class = "User"
      c.subject_column = :user_id
      c.session_column = :session_id
      c.table_name = "presences"
    end
    WhereIsWaldo::Presence.configure_associations!
  end
end
