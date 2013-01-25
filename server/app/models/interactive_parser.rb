class InteractiveParser < Parser

  def initialize(uri=Dir.pwd, data={})
    super(uri,data)
  end
  
  def parse(meta_data_hash={})
    if (self.data_hash['path'])
      self.uri_helper.set_relative_path(data_hash['path'])
      self.update_from_uri!
    end
    return Interactive.new(self.data_hash)
  end

end