module Presenters
  class Base
    attr_accessor :interactive

    def hostname
      "localhost:3000"
    end

    def url_helper
      Rails.application.routes.url_helpers
    end
  end
end
