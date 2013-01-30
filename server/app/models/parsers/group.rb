module Parsers
  class Group < Base
    def parse
      return ::Group.create_or_update(self.data_hash)
    end
  end
end