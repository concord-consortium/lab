module GeneratedInteractiveList
  class << self
    attr_accessor :interactive_meta_hashes
    attr_accessor :group_hashes
    # full path to file that contains the list of all interactive meta data and group info
    # ../public/examples/interactives/interactives.json
    # also is the root of files that define each interactive
    attr_accessor :interactives_file_path

    def create
      return if @interactive_meta_hashes && @interactive_meta_hashes.size > 1
      @interactives_file_path = File.join(Rails.root,"public","examples","interactives","interactives.json")

      interactives_json = File.open(@interactives_file_path).read
      all_hash = JSON.parse(interactives_json)
      @interactive_meta_hashes = all_hash['interactives']
      @group_hashes = all_hash['groups']
    end

    def interactive_meta_hash(property, value)
      @interactive_meta_hashes.find{ |i| i[property] == value }
    end

    def group_hash(property, value)
      property = 'path' if property == 'groupKey'
      @group_hashes.find { |g| g[property] == value }
    end

  #   def create_group(property, value)
  #     hash = group_hash(property, value)
  #     ::Group.create_or_update({:from_import => true }.merge(hash))
  #   end

  #   def create_interactive(property, value)
  #     hash = interactive_hash(property, value)
  #     create_group('groupKey', hash['groupKey'])
  #     ::Interactive.create_or_update({:from_import => true }.merge(hash))
  #   end
  end

end

RSpec.configure do |config|
  config.include GeneratedInteractiveList
end
