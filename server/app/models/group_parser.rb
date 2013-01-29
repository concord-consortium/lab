class GroupParser < Parser

  def parse
    return Group.create_or_update(self.data_hash)
  end

end