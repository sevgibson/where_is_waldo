# frozen_string_literal: true

module WhereIsWaldo
  class Engine < ::Rails::Engine
    isolate_namespace WhereIsWaldo

    config.autoload_paths << File.expand_path("../../app/services", __dir__)
    config.autoload_paths << File.expand_path("../../app/channels", __dir__)
    config.autoload_paths << File.expand_path("../../app/jobs", __dir__)
    config.autoload_paths << File.expand_path("../../app/models", __dir__)

    # Configure Presence model associations after all code is loaded
    config.after_initialize do
      WhereIsWaldo::Presence.configure_associations! if WhereIsWaldo::Presence.respond_to?(:configure_associations!)
    end
  end
end
