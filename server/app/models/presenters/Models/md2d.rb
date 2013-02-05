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

          # these are all in the generated models
          p.set('type','md2d')
          p.add('height')
          p.add('width')
          p.add('lennardJonesForces')
          p.add('coulombForces')
          p.add('temperatureControl')
          p.add('gravitationalField')
          p.add('timeStep')
          p.add('dielectricConstant')
          p.add('realisticDielectricEffect')
          p.add('solventForceFactor')
          p.add('solventForceType')
          p.add('additionalSolventForceThreshold')
          p.add('polarAAEpsilon')
          p.add('viscosity')
          p.add('viewRefreshInterval')

          # these are all objects in the generated models
          p.add('viewOptions')
          p.add('pairwiseLJProperties')
          p.add('elements')
          p.add('atoms')
          p.add('radialBonds')
          p.add('angularBonds')
          p.add('obstacles')
          p.add('restraints')
          p.add('geneticProperties')
          p.add('textBoxes')

        end
      end

      def interactive_properties
        HashProperties.new(self.md2d).hash_value do |p|
          p.add('id', 'local_ref_id')
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