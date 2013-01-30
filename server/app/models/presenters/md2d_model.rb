module Presenters
  class Md2dModel < Base
    attr_accessor :md_2d_model

    def initialize(_md_2d_model)
      self.md_2d_model = _md_2d_model
    end

    def json_listing
      HashProperties.new(self.md_2d_model).hash_value do |p|
        p.add('id')
        p.add('name')
        p.set('type',"md2d")
        p.set('location', self.json_path)
      end
    end

    def runtime_properties
      HashProperties.new(self.md_2d_model).hash_value do |p|
        p.add('name')
        p.add('temperature')
        p.add('coulomb_forces')
        p.add('epsilon')
        p.add('sigma')
        p.add('name')
        p.add('temperature')
        p.add('coulomb_forces')
        p.add('epsilon')
        p.add('sigma')
        p.add('lennard_jones_forces')
        p.add('temperature_control')
        p.add('atoms')
        p.add('elements')
        p.add('height')
        p.add('width')
        p.set('type','md2d')
      end
    end

    def interactive_properties
      HashProperties.new(self.md_2d_model).hash_value do |p|
        p.add('id')
        p.add('viewOptions')
        p.set('type',"md2d")
        p.set('url', self.json_path)
      end
    end


    def json_path
      self.url_helper.md2d_model_url(md_2d_model, :host =>self.hostname, :format => :json)
    end

  end
end