module Presenters
  module Models
    class Md2d < Base
      attr_accessor :md2d

      def initialize(_md2d)
        self.md2d = _md2d
      end

      def json_listing
        HashProperties.new(self.md2d).hash_value do |p|
          p.add('id')
          p.add('name')
          p.set('type',"md2d")
          p.set('location', self.json_path)
        end
      end

      def runtime_properties
        HashProperties.new(self.md2d).hash_value do |p|
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
        HashProperties.new(self.md2d).hash_value do |p|
          p.add('id')
          p.add('viewOptions')
          p.set('type',"md2d")
          p.set('url', self.json_path)
        end
      end


      def json_path
        self.url_helper.models_md2d_url(md2d, :host => self.hostname, :format => :json)
      end

    end
  end
end