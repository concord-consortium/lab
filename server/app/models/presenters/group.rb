module Presenters
  class Group < Base
    attr_accessor :group
    
    def initialize(_group)
      self.group = _group
    end

    def json_listing
      HashProperties.new(self.group).hash_value do |p|
        p.add('id')
        p.add('name')
        p.add('path')
        p.add('category')
        p.set('location',self.json_path)
      end
    end

    def json_path
      url_helper.group_url(self.group, :host => self.hostname, :format => :json)
    end

  end
end
