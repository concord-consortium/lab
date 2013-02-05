module Presenters
  class HashProperties
    attr_accessor :model
    attr_accessor :data_hash

    def initialize(_model)
      self.data_hash = {}
      self.model = _model
    end

    def hash_value
      yield self
      return self.data_hash
    end

    def all()
      self.model.properties.each do |p|
        self.set(p,self.model.send(p.name.to_sym))
      end
    end

    def add(key,propname=nil)
      propname ||= key
      prop = self.model.send propname
      self.set(key,prop)
    end

    def merge(props)
      props.each_pair do |k,v|
        self.set(k,v)
      end
    end

    def set(key,value)
      (self.data_hash[key] = value) unless value.nil?
    end

  end
end