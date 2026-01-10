# frozen_string_literal: true

require_relative "lib/where_is_waldo/version"

Gem::Specification.new do |spec|
  spec.name = "where_is_waldo"
  spec.version = WhereIsWaldo::VERSION
  spec.authors = ["Scott Gibson"]
  spec.email = ["scott@ideasbyscott.com"]

  spec.summary = "Real-time presence tracking for Rails + React applications"
  spec.description = "Track who's online, their activity state, and broadcast messages. " \
                     "Fully configurable - works with any user model, session system, and room concept."
  spec.homepage = "https://github.com/sevgibson/where_is_waldo"
  spec.license = "MIT"
  spec.required_ruby_version = ">= 3.0.0"

  spec.metadata["homepage_uri"] = spec.homepage
  spec.metadata["source_code_uri"] = spec.homepage
  spec.metadata["changelog_uri"] = "#{spec.homepage}/blob/master/CHANGELOG.md"

  spec.files = Dir[
    "lib/**/*",
    "app/**/*",
    "config/**/*",
    "LICENSE",
    "README.md"
  ]

  spec.require_paths = ["lib"]

  spec.add_dependency "rails", ">= 7.0"

  spec.metadata["rubygems_mfa_required"] = "true"
end
