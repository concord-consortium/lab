module Parsers
  class ParsingError < StandardError; end
  class Base
    attr_accessor :data_hash
    attr_accessor :uri_helper

    # uri - URI for JSON resource.
    # data - data to merge into this resource's data
    def initialize(uri=Dir.pwd,data={})
      self.data_hash = {}
      # signals this resource has been imported
      self.data_hash['from_import'] = true
      # merge into data hash into self.data_hash
      self.update_data!(data)

      # URIHelper.frow_def is a factory that will return
      # either a class to read either a Local or a Remote
      # resource. Typical resources are an interactives list,
      # individual interactives/models defined in JSON.
      self.uri_helper = UriHelper.from_def(uri)
    end

     # TODO: transform hash-structure based on version info
    def migrate!; end

    # merge in json or ruby hash into this.data_hash
    def update_data!(new_datas={})
      case new_datas
      when String
        update_from_json!(new_datas)
      when Hash
        update_from_hash!(new_datas)
      else
        fail ArgumentError, "argument is not a String or Hash!"
      end
      self.migrate!
      return self
    end

    def update_from_hash!(hash)
      fail ArgumentError, "argument is not a Hash" unless hash.is_a? Hash
      self.data_hash.merge!(hash)
      return self
    end

    def update_from_json!(json)
      begin
        self.update_from_hash!(JSON.parse(json))
      rescue JSON::ParserError
        raise ParsingError.new
      end
    end

    # read in the json representation of a resource at the
    # uri passed in the constructor. And merge it into
    # self.data_hash
    def update_from_uri!()
      if self.uri_helper
        begin
          json_string = self.uri_helper.read
          self.update_from_json!(json_string)
        rescue Errno::ENOENT => e
          puts "WARNING: Could not read #{self.data_hash['url']}"
        end
      end
      return self
    end

    def parse
      return data_hash
    end

    # Forward to the a parser with hash_data as the input
    def parse_entity(hash_data, parser)
      fail ArgumentError, "first argument is not a Hash" unless hash_data.is_a? Hash
      fail ArgumentError, "second argument is not a Parser" unless parser.ancestors.include? Parsers::Base
      parser.new(self.uri_helper,hash_data).parse
    end

    # data_label - indentifies what should be parsed, .e.g. 'interactives', 'groups'
    # or 'models'.
    # collection - array that will contain the items parsed.
    # parser - an instance of the parser, i.e. Parsers::Interactive
    def parse_collection(data_label, collection, parser)
      hashes     = self.data_hash[data_label]
      if hashes
        bar = make_progressbar(data_label,hashes)
        hashes.each do |hash_data|
          collection << parser.new(self.uri_helper,hash_data).parse
          bar.increment
        end
      else
        raise ParsingError.new("can't find item in #{data_label}")
      end
      collection
    end

    private
    def verbose?
      true unless (Rails.env == 'test')
    end

    def make_progressbar(label,collection)
      if verbose?
        return ProgressBar.create(
          :title       => "creating #{collection.size} #{label}",
          :starting_at => 0,
          :total       => collection.size)
      else
        silent_result = Object.new
        def silent_result.increment; nil; end
        return silent_result
      end
    end
  end
end
