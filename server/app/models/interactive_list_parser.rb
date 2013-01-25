require 'open-uri'

class InteractiveListParseError < StandardError
end

class InteractiveListParser
  attr_accessor :interactives
  attr_accessor :groups
  attr_accessor :hash_def
  attr_accessor :uri_string

  def self.parse_from_uri(uri_string)
    begin
      json_string       = open(uri_string).read 
    rescue
      raise InteractiveListParseError.new("unable to read remote file: #{uri_string}")
    end
    parser            = self.new(json_string)
    parser.uri_string = uri_string
    return parser
  end


  def initialize(json)
    self.interactives       = []
    self.groups             = []
    self.hash_def           = {}
    
    self.uri_string         = false
    self.read_json(json)
    self.migrate
    self.parse
  end

  # transform hash-structure based on 
  # version information
  def migrate; end

  def read_json(json)
    begin
      self.hash_def = JSON.parse(json)
    rescue JSON::ParserError
      raise InteractiveListParseError.new("invalid json")
    end
  end

  def parse
    #self.parse_items('groups', :groups, GroupParser.new)
    self.parse_types('interactives', :interactives, InteractiveParser.new)
  end

  def parse_types(data_label, attrbiute, parser)
    hashes     = self.hash_def[data_label]
    collection = self.send attrbiute
    if hashes
      hashes.each do |hash_data| 
        collection << parser.parse(hash_data)
      end
    else
      raise InteractiveListParseError.new("can't find data item in data #{data_label}")
    end
  end

end