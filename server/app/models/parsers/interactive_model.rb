module Parsers
  class InteractiveModel < Base
    attr_accessor :md2d_parser

    def initialize(uri=Dir.pwd, data={})
      super(uri,data)
      self.md2d_parser  = Parsers::Models::Md2d
    end

    def parse(meta_data_hash={})
      self.add_model
      ::InteractiveModel.create_or_update(self.data_hash)
    end

    def add_model
      model_hash = {
        "id"  => self.data_hash.delete('id'),
        "url" => self.data_hash.delete('url'),
        "viewOptions" => self.data_hash['viewOptions']
      }
      model = self.parse_entity(model_hash,self.md2d_parser)
      self.data_hash['md2d_id'] = model.id
    end

  end
end
