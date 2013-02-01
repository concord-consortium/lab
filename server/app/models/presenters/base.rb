module Presenters
  class Base
    attr_accessor :interactive

    def hostname
      Rails.application.routes.default_url_options[:host]
    end

    def url_helper
      Rails.application.routes.url_helpers
    end
  end
end
