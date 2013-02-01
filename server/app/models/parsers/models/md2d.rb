module Parsers
  module Models
    class Md2d < Parsers::Base
      def parse
        url = self.data_hash['url']
        unless data_hash['url'].blank?
          self.adapt_url url
          self.update_from_uri!
        end
        update_db
      end

      def update_db
        ::Models::Md2d.create_or_update(self.data_hash)
      end

      def adapt_url(url)
        # HACK: re-write paths with regex, mostly for parsing from FS :/
        if (url.match %r{^/})
          self.uri_helper.path = self.uri_helper.path.sub %r{^(.*/public/).*$} do |match|
            "#{$1}#{url}"
          end
        # file-system relative urls from import job:
        else
          self.uri_helper.set_relative_path("../../#{url}")
        end
      end

    end
  end
end