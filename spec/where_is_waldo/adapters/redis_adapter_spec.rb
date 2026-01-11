# frozen_string_literal: true

require "rails_helper"
require "mock_redis"

RSpec.describe WhereIsWaldo::Adapters::RedisAdapter do
  subject(:adapter) { described_class.new }

  let(:mock_redis) { MockRedis.new }
  let(:user) { create(:user) }
  let(:session_id) { "test-session-#{SecureRandom.hex(4)}" }

  before do
    WhereIsWaldo.configure do |config|
      config.adapter = :redis
      config.redis_client = mock_redis
    end
  end

  describe "#connect" do
    it "stores session data in Redis" do
      adapter.connect(session_id: session_id, subject_id: user.id)

      data = JSON.parse(mock_redis.get("where_is_waldo:session:#{session_id}"))
      expect(data["session_id"]).to eq(session_id)
      expect(data["subject_id"]).to eq(user.id)
    end

    it "adds session to subject's sessions set" do
      adapter.connect(session_id: session_id, subject_id: user.id)

      sessions = mock_redis.smembers("where_is_waldo:subject:#{user.id}:sessions")
      expect(sessions).to include(session_id)
    end

    it "adds subject to online subjects sorted set" do
      adapter.connect(session_id: session_id, subject_id: user.id)

      subjects = mock_redis.zrange("where_is_waldo:online_subjects", 0, -1)
      expect(subjects).to include(user.id.to_s)
    end

    it "returns true on success" do
      result = adapter.connect(session_id: session_id, subject_id: user.id)
      expect(result).to be true
    end

    it "stores metadata" do
      adapter.connect(session_id: session_id, subject_id: user.id, metadata: { device: "mobile" })

      data = JSON.parse(mock_redis.get("where_is_waldo:session:#{session_id}"))
      expect(data["metadata"]).to eq({ "device" => "mobile" })
    end
  end

  describe "#disconnect" do
    before { adapter.connect(session_id: session_id, subject_id: user.id) }

    context "by session_id" do
      it "removes session data" do
        adapter.disconnect(session_id: session_id)
        expect(mock_redis.get("where_is_waldo:session:#{session_id}")).to be_nil
      end

      it "removes from subject's sessions set" do
        adapter.disconnect(session_id: session_id)
        sessions = mock_redis.smembers("where_is_waldo:subject:#{user.id}:sessions")
        expect(sessions).not_to include(session_id)
      end

      it "removes subject from online set when no sessions remain" do
        adapter.disconnect(session_id: session_id)
        subjects = mock_redis.zrange("where_is_waldo:online_subjects", 0, -1)
        expect(subjects).not_to include(user.id.to_s)
      end

      it "returns true" do
        expect(adapter.disconnect(session_id: session_id)).to be true
      end
    end

    context "by subject_id" do
      let(:other_session) { "other-session-#{SecureRandom.hex(4)}" }

      before { adapter.connect(session_id: other_session, subject_id: user.id) }

      it "removes all sessions for the subject" do
        adapter.disconnect(subject_id: user.id)

        expect(mock_redis.get("where_is_waldo:session:#{session_id}")).to be_nil
        expect(mock_redis.get("where_is_waldo:session:#{other_session}")).to be_nil
      end
    end
  end

  describe "#heartbeat" do
    before { adapter.connect(session_id: session_id, subject_id: user.id) }

    it "updates last_heartbeat timestamp" do
      freeze_time do
        travel 1.minute
        adapter.heartbeat(session_id: session_id)

        data = JSON.parse(mock_redis.get("where_is_waldo:session:#{session_id}"))
        expect(data["last_heartbeat"]).to eq(Time.current.to_i)
      end
    end

    it "updates tab_visible" do
      adapter.heartbeat(session_id: session_id, tab_visible: false)

      data = JSON.parse(mock_redis.get("where_is_waldo:session:#{session_id}"))
      expect(data["tab_visible"]).to be false
    end

    it "returns true on success" do
      expect(adapter.heartbeat(session_id: session_id)).to be true
    end

    it "returns false when session not found" do
      expect(adapter.heartbeat(session_id: "nonexistent")).to be false
    end
  end

  describe "#online_subject_ids" do
    let(:user2) { create(:user) }

    before do
      adapter.connect(session_id: "session-1", subject_id: user.id)
      adapter.connect(session_id: "session-2", subject_id: user2.id)
    end

    it "returns online subject IDs" do
      ids = adapter.online_subject_ids
      expect(ids).to contain_exactly(user.id, user2.id)
    end
  end

  describe "#sessions_for_subject" do
    before do
      adapter.connect(session_id: "session-1", subject_id: user.id, metadata: { device: "desktop" })
      adapter.connect(session_id: "session-2", subject_id: user.id, metadata: { device: "mobile" })
    end

    it "returns all sessions for the subject" do
      sessions = adapter.sessions_for_subject(user.id)
      expect(sessions.length).to eq(2)
    end

    it "returns session data as hashes" do
      sessions = adapter.sessions_for_subject(user.id)
      session = sessions.first

      expect(session).to include(
        :session_id,
        :subject_id,
        :connected_at,
        :tab_visible,
        :subject_active
      )
    end
  end

  describe "#session_status" do
    before { adapter.connect(session_id: session_id, subject_id: user.id) }

    it "returns session status hash" do
      status = adapter.session_status(session_id)

      expect(status[:session_id]).to eq(session_id)
      expect(status[:subject_id]).to eq(user.id)
      expect(status[:tab_visible]).to be true
    end

    it "returns nil for nonexistent session" do
      expect(adapter.session_status("nonexistent")).to be_nil
    end
  end
end
