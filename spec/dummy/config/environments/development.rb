# frozen_string_literal: true

require "active_support/core_ext/integer/time"

Rails.application.configure do
  config.cache_classes = false
  config.eager_load = false
  config.consider_all_requests_local = true

  config.action_controller.perform_caching = false
  config.cache_store = :null_store

  # ActionCable
  config.action_cable.url = "/cable"
  config.action_cable.allowed_request_origins = [%r{http://localhost.*}]

  # Assets
  config.assets.debug = true
  config.assets.quiet = true

  # Logging
  config.log_level = :debug
end
