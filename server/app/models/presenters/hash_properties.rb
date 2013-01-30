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

    def add(key,propname=nil)
      propname ||= key
      prop = self.model.send propname
      self.set(key,prop)
    end

    def set(key,value)
      (self.data_hash[key] = value) unless value.nil?
    end

  end
end