# frozen_string_literal: true

Rails.application.configure do
  config.cache_classes = true
  config.eager_load = false
  config.consider_all_requests_local = true
  config.action_controller.perform_caching = false
  config.action_dispatch.show_exceptions = false
  config.active_support.deprecation = :stderr

  # ActionCable
  config.action_cable.url = "/cable"
  config.action_cable.allowed_request_origins = [%r{http://localhost.*}]

  # Assets
  config.assets.debug = true if respond_to?(:assets)
  config.assets.compile = true if respond_to?(:assets)
end
