# frozen_string_literal: true

module WhereIsWaldo
  module Adapters
    class RedisAdapter < BaseAdapter
      def connect(session_id:, subject_id:, room_id:, metadata: {})
        now = Time.current.to_i

        presence_data = {
          session_id: session_id,
          subject_id: subject_id,
          room_id: room_id,
          connected_at: now,
          last_heartbeat: now,
          tab_visible: true,
          subject_active: true,
          last_activity: now,
          metadata: metadata
        }

        redis.multi do |tx|
          # Store session data
          tx.set(session_key(session_id), presence_data.to_json, ex: ttl)

          # Add to room set with timestamp as score
          tx.zadd(room_key(room_id), now, session_id)

          # Add to subject's sessions set
          tx.sadd(subject_sessions_key(subject_id), session_id)

          # Map session to subject for reverse lookup
          tx.set(session_subject_key(session_id), subject_id, ex: ttl)
        end

        true
      rescue StandardError => e
        Rails.logger.error "[WhereIsWaldo] Redis connect failed: #{e.message}"
        false
      end

      def disconnect(session_id: nil, subject_id: nil, room_id: nil)
        if session_id
          disconnect_session(session_id)
        elsif subject_id && room_id
          disconnect_subject_from_room(subject_id, room_id)
        elsif subject_id
          disconnect_subject(subject_id)
        end

        true
      rescue StandardError => e
        Rails.logger.error "[WhereIsWaldo] Redis disconnect failed: #{e.message}"
        false
      end

      def heartbeat(session_id: nil, subject_id: nil, room_id: nil,
                    tab_visible: true, subject_active: true, metadata: {})
        target_session_id = session_id || find_session_id(subject_id, room_id)
        return false unless target_session_id

        data = get_presence_data(target_session_id)
        return false unless data

        now = Time.current.to_i
        data["last_heartbeat"] = now
        data["tab_visible"] = tab_visible
        data["subject_active"] = subject_active
        data["last_activity"] = now if subject_active
        data["metadata"] = data["metadata"].merge(metadata) if metadata.present?

        redis.multi do |tx|
          tx.set(session_key(target_session_id), data.to_json, ex: ttl)
          tx.zadd(room_key(data["room_id"]), now, target_session_id)
        end

        true
      rescue StandardError => e
        Rails.logger.error "[WhereIsWaldo] Redis heartbeat failed: #{e.message}"
        false
      end

      def online_in_room(room_id, timeout: nil)
        threshold = Time.current.to_i - (timeout || default_timeout)

        # Get session IDs with heartbeat after threshold
        session_ids = redis.zrangebyscore(room_key(room_id), threshold, "+inf")

        session_ids.filter_map do |sid|
          data = get_presence_data(sid)
          build_presence_hash(data) if data
        end
      end

      def sessions_for_subject(subject_id, room_id: nil)
        session_ids = redis.smembers(subject_sessions_key(subject_id))

        results = session_ids.filter_map do |sid|
          data = get_presence_data(sid)
          next unless data
          next if room_id && data["room_id"].to_s != room_id.to_s

          build_presence_hash(data)
        end

        results
      end

      def session_status(session_id)
        data = get_presence_data(session_id)
        return nil unless data

        build_presence_hash(data)
      end

      def cleanup(timeout: nil)
        threshold = Time.current.to_i - (timeout || default_timeout)
        cleaned = 0

        # Scan all room keys
        cursor = "0"
        loop do
          cursor, keys = redis.scan(cursor, match: "#{key_prefix}:room:*")

          keys.each do |room_key|
            # Remove stale entries from sorted set
            stale_sessions = redis.zrangebyscore(room_key, "-inf", threshold)
            stale_sessions.each do |sid|
              disconnect_session(sid)
              cleaned += 1
            end
          end

          break if cursor == "0"
        end

        cleaned
      end

      private

      def redis
        config.redis_client || raise("Redis client not configured")
      end

      def ttl
        (config.timeout * 1.5).to_i # Give some buffer beyond timeout
      end

      def key_prefix
        "where_is_waldo"
      end

      def session_key(session_id)
        "#{key_prefix}:session:#{session_id}"
      end

      def room_key(room_id)
        "#{key_prefix}:room:#{room_id}"
      end

      def subject_sessions_key(subject_id)
        "#{key_prefix}:subject:#{subject_id}:sessions"
      end

      def session_subject_key(session_id)
        "#{key_prefix}:session_subject:#{session_id}"
      end

      def get_presence_data(session_id)
        json = redis.get(session_key(session_id))
        return nil unless json

        JSON.parse(json)
      end

      def find_session_id(subject_id, room_id)
        return nil unless subject_id && room_id

        session_ids = redis.smembers(subject_sessions_key(subject_id))
        session_ids.find do |sid|
          data = get_presence_data(sid)
          data && data["room_id"].to_s == room_id.to_s
        end
      end

      def disconnect_session(session_id)
        data = get_presence_data(session_id)
        return unless data

        redis.multi do |tx|
          tx.del(session_key(session_id))
          tx.zrem(room_key(data["room_id"]), session_id)
          tx.srem(subject_sessions_key(data["subject_id"]), session_id)
          tx.del(session_subject_key(session_id))
        end
      end

      def disconnect_subject_from_room(subject_id, room_id)
        session_ids = redis.smembers(subject_sessions_key(subject_id))
        session_ids.each do |sid|
          data = get_presence_data(sid)
          disconnect_session(sid) if data && data["room_id"].to_s == room_id.to_s
        end
      end

      def disconnect_subject(subject_id)
        session_ids = redis.smembers(subject_sessions_key(subject_id))
        session_ids.each { |sid| disconnect_session(sid) }
      end

      def build_presence_hash(data)
        {
          session_id: data["session_id"],
          subject_id: data["subject_id"],
          room_id: data["room_id"],
          connected_at: Time.at(data["connected_at"]),
          last_heartbeat: Time.at(data["last_heartbeat"]),
          last_activity: data["last_activity"] ? Time.at(data["last_activity"]) : nil,
          tab_visible: data["tab_visible"],
          subject_active: data["subject_active"],
          metadata: data["metadata"] || {},
          subject: nil # Redis adapter doesn't eager load subjects
        }
      end
    end
  end
end
