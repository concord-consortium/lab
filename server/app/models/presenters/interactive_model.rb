module Presenters
  class InteractiveModel < Base
    attr_accessor :interactive_model

    def initialize(_interactive_model)
      self.interactive_model = _interactive_model
    end

    def json_listing
      HashProperties.new(self.interactive_model).hash_value do |p|
        p.all()
      end
    end

    def runtime_properties
      HashProperties.new(self.interactive_model).hash_value { |p|
        #p.all()
        p.merge(self.md2d_props)
        p.add('viewOptions')
      }
    end

    def interactive_properties
      self.runtime_properties
    end

    def md2d_props
      Models::Md2d.new(self.interactive_model.md2d).interactive_model_properties
    end

  end
end
