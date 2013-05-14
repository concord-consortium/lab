module Parsers
  class InteractiveList < Base
    attr_accessor :interactives
    attr_accessor :groups
    attr_accessor :interactive_parser
    attr_accessor :group_parser

    def initialize(uri=Dir.pwd, data={})
      super(uri,data)
      self.interactives = []
      self.groups       = []

      self.interactive_parser = Parsers::Interactive
      self.group_parser       = Parsers::Group
    end

    def parse
      # read in the list of interactives and groups from the JSON file pointed to by
      # self.uri into self.hash_data
      self.update_from_uri!();
      # read in each group contained in self.hash_data and create a Group model
      self.parse_collection('groups', self.groups, self.group_parser)
      remove_broken_interactives
      # read in each interactive contained in self.hash_data and create an Interactive model
      self.parse_collection('interactives', self.interactives, self.interactive_parser)
      return self
    end

    def remove_broken_interactives
      self.data_hash['interactives'].reject!{ |i| i['publicationStatus'] == 'broken'}
    end
  end
end
