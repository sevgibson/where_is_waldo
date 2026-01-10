# frozen_string_literal: true

module WhereIsWaldo
  class PresenceCleanupJob < ApplicationJob
    queue_as :default

    def perform(timeout: nil)
      cleaned = PresenceService.cleanup(timeout: timeout)
      Rails.logger.info "[WhereIsWaldo] Cleaned up #{cleaned} stale presence records"
      cleaned
    end
  end
end
