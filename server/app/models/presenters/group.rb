module Presenters
  class Group < Base
    attr_accessor :group
    
    def initialize(_group)
      self.group = _group
    end

    def json_listing
      g = self.group
      { "_id" =>  g.id, 
        "name" => g.name, 
        "path" => g.path,
        "category" => g.category,
        "location" => json_path
      }
    end

    def json_path
      url_helper.group_url(self.group, :host => self.hostname, :format => :json)
    end

  end
end
