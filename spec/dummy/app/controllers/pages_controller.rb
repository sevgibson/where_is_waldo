# frozen_string_literal: true

class PagesController < ApplicationController
  skip_before_action :verify_authenticity_token

  def home
    @current_user = User.find_or_create_by!(email: "test@example.com") do |u|
      u.name = "Test User"
    end
    @session_id = session.id.to_s.presence || SecureRandom.hex(16)
    session[:session_id] = @session_id
  end

  def status
    render json: {
      online_ids: WhereIsWaldo.online_ids(User.all),
      online_count: WhereIsWaldo.online(User.all).count
    }
  end
end
