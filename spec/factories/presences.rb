# frozen_string_literal: true

FactoryBot.define do
  factory :presence, class: "WhereIsWaldo::Presence" do
    sequence(:session_id) { |n| "session-#{n}-#{SecureRandom.hex(4)}" }
    subject factory: %i[user]
    connected_at { Time.current }
    last_heartbeat { Time.current }
    last_activity { Time.current }
    tab_visible { true }
    subject_active { true }
    metadata { {} }

    trait :stale do
      last_heartbeat { 2.minutes.ago }
    end

    trait :inactive do
      subject_active { false }
      last_activity { 1.minute.ago }
    end

    trait :background_tab do
      tab_visible { false }
    end
  end
end
