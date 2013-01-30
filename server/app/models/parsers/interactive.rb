module Parsers
  class Interactive < Base
    attr_accessor :md_2d_parser

    def initialize(uri=Dir.pwd, data={})
      super(uri,data)
      self.md_2d_parser  = Parsers::Md2dModel
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
      md_2d_models  = []
      self.parse_collection('models', md_2d_models, self.md_2d_parser)
      self.data_hash['md_2d_model_ids'] = md_2d_models.map { |m| m.id }
    end

  end
end