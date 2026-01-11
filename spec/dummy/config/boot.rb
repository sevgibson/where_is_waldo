# frozen_string_literal: true

# Point to the gem's Gemfile (4 levels up from config/)
gemfile_path = File.expand_path("../../../Gemfile", __dir__)
ENV["BUNDLE_GEMFILE"] = gemfile_path

require "bundler/setup"
$LOAD_PATH.unshift File.expand_path("../../../lib", __dir__)
