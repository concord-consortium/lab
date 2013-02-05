module Parsers
  class Group < Base
    def parse
      self.set_id
      return ::Group.create_or_update(self.data_hash)
    end
    def set_id
      return unless self.data_hash['id'].blank?
      self.data_hash['id'] = self.data_hash['path']
    end
  end
end