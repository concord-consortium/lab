module Parsers
  class Interactive < Base
    attr_accessor :md2d_parser

    def initialize(uri=Dir.pwd, data={})
      super(uri,data)
      self.md2d_parser  = Parsers::Models::Md2d
    end

    def parse(meta_data_hash={})
      if (self.data_hash['path'])
        self.uri_helper.set_relative_path(data_hash['path'])
      end
      self.update_from_uri!
      self.add_models
      interactive = ::Interactive.create_or_update(self.data_hash)
    end

    def add_models
      md2ds  = []
      self.parse_collection('models', md2ds, self.md2d_parser)
      self.data_hash['md2d_ids'] = md2ds.map { |m| m.id }
    end

  end
end