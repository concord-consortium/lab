# https://github.com/moonmaster9000/recloner
# https://github.com/moonmaster9000/recloner/blob/master/lib/recloner/recloner.rb
module Recloner
  def clone(&block)
    block ||= Proc.new {}
    property_names = properties.map(&:name) - protected_properties.map(&:name)
    attrs = property_names.inject({}){|hash, x|
      val = send(x)
      val = val.to_a if val.class == CouchRest::Model::CastedArray
      hash[x] = val
      hash
    }
    self.class.new(attrs).tap(&block)
  end

  def clone!(&block)
    block ||= Proc.new {}
    next_id = database.server.next_uuid
    copy next_id
    self.class.get(next_id).tap(&block).tap {|d| d.save}
  end
end
