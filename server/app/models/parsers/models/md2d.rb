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
          self.uri_helper.path = "#{Rails.root}/public/#{url}"
          # read model json file and merge into data_hash
          self.update_from_uri!
        end
        self.generate_couch_doc_id(url)
        data_hash['url'] = ::Models::Md2d.generate_url(data_hash['id'])
        self.generate_image_path(url)
        update_db
      end

      # NOTE: The imagePath is only set on import for now. We
      # may want this to be set in the in the model's that we
      # are importing in the future. For example, the images
      # may be in a server/public/resource subdir or served by the
      # asset pipeline.
      def generate_image_path(url)
        return if url.blank?
        self.data_hash['imagePath'] = url.gsub(/^\//, '').match(/.*\//)[0];
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
    end
  end
end
