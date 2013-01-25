class GroupParser < Parser
  def parse
    return Group.new(self.data_hash)
  end
end