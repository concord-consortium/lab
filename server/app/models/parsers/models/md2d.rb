module Parsers
  module Models
    class Md2d < Parsers::Base

      def initialize(uri=Dir.pwd, data={ })
        # id and url are required, see src/lab/common/controllers/interactive-metadata.js
        data.fetch('id'){ fail ArgumentError, "Missing id key in second argument"}
        data.fetch('url'){ fail ArgumentError, "Missing url key in second argument"}
        super(uri, data)
      end
      
      def parse
        url = self.data_hash['url']
        unless url.blank?
          # set the full path of the model json file
          self.adapt_url url
          # read model json file and merge into data_hash
          self.update_from_uri!
        end
        self.generate_local_ref_id
        self.generate_couch_doc_id(url)
        update_db
      end

      def generate_local_ref_id
        # TODO: Its possible that the ID field has something we want
        # when importing, the 'id' is often a non-unique id.
        # this short id is for local references in interactives
        self.data_hash['local_ref_id'] = self.data_hash.delete('id')
      end

      def generate_couch_doc_id(url)
        return if url.blank?
        # no slashes alowed, no $ and dont start with _
        url = url.gsub("/","_").gsub('$','_').gsub(/^_/,"")
        self.data_hash['id'] = url.gsub(".json","")
      end

      def update_db
        ::Models::Md2d.create_or_update(self.data_hash)
      end

      # set the self.uri_helper.path to point the model json file.
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
