# frozen_string_literal: true

module WhereIsWaldo
  class Engine < ::Rails::Engine
    isolate_namespace WhereIsWaldo

    config.autoload_paths << File.expand_path("../../app/services", __dir__)
    config.autoload_paths << File.expand_path("../../app/channels", __dir__)
    config.autoload_paths << File.expand_path("../../app/jobs", __dir__)
    config.autoload_paths << File.expand_path("../../app/models", __dir__)

    initializer "where_is_waldo.configure_presence_model" do
      ActiveSupport.on_load(:active_record) do
        # Configure the Presence model associations when ActiveRecord is ready
        WhereIsWaldo::Presence.configure_associations! if WhereIsWaldo::Presence.respond_to?(:configure_associations!)
      end
    end
  end
end
