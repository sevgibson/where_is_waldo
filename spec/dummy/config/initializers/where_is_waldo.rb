# frozen_string_literal: true

WhereIsWaldo.configure do |config|
  config.adapter = :database
  config.table_name = "presences"
  config.session_column = :session_id
  config.subject_column = :user_id
  config.subject_class = "User"
  config.timeout = 60

  config.authenticate_proc = lambda { |env|
    # For testing, extract user_id and session_id from query params
    query = Rack::Utils.parse_query(env["QUERY_STRING"])
    {
      subject_id: query["user_id"]&.to_i,
      session_id: query["session_id"]
    }
  }

  config.subject_data_proc = lambda { |subject|
    return {} unless subject

    {
      id: subject.id,
      name: subject.name,
      email: subject.email
    }
  }
end
