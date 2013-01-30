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
      self.update_from_uri!();
      self.parse_collection('groups', self.groups, self.group_parser)
      self.parse_collection('interactives', self.interactives, self.interactive_parser)
      return self
    end
  end
end