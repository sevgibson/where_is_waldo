# frozen_string_literal: true

Rails.application.routes.draw do
  root "pages#home"
  get "status", to: "pages#status"

  mount ActionCable.server => "/cable"
end
