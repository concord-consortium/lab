module Parsers
  class Interactive < Base
    attr_accessor :models_parser

    def initialize(uri=Dir.pwd, data={})
      # data is a hash for one interactive from the list of interactives,
      # interactives.json
      data['staticExamplePath'] = ''
      super(uri,data)
      self.models_parser  = Parsers::InteractiveModel
    end

    # meta_data_hash - hash of properties kept in the interactives.json for
    # each interactive.
    def parse(meta_data_hash={})
      # The path is the location of the resource/file that defines this interactive
      if (self.data_hash['path'])
        self.uri_helper.set_relative_path(data_hash['path'])
      end
      self.data_hash['staticExamplePath'] = self.data_hash.fetch('path')
      self.generate_couch_doc_id(self.data_hash['path'])
      self.data_hash['path'] = "/interactives/" + self.data_hash['id']
      # here we read in the json file for the interactive
      self.update_from_uri!
      self.add_models
      self.set_group
      ::Interactive.create_or_update(self.data_hash)
    end


    def generate_couch_doc_id(url)
      return if url.blank?
      return unless self.data_hash['id'].blank?
      # no slashes alowed, no $ and dont start with _
      url = url.gsub("/","_").gsub('$','_').gsub(/^_/,"")
      self.data_hash['id'] = url.gsub(".json","")
    end

    def set_group
      self.data_hash['group_id'] = self.data_hash.delete('groupKey')
    end

    def add_models
      interactive_models = []
      self.parse_collection('models', interactive_models, self.models_parser)
      self.data_hash['interactive_models'] = interactive_models
    end

  end
end
