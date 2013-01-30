module Presenters
  class Md2dModel < Base
    attr_accessor :md_2d_model

    def initialize(_md_2d_model)
      self.md_2d_model = _md_2d_model
    end

    def json_listing
      return {
        'id'               => self.md_2d_model.id,
        'name'             => self.md_2d_model.title,
        'location'         => self.json_path
      }
    end

    def runtime_properties
      {
        'name'                 => self.md_2d_model.name,
        'temperature'          => self.md_2d_model.temperature,
        'coulomb_forces'       => self.md_2d_model.coulomb_forces,
        'epsilon'              => self.md_2d_model.epsilon,
        'sigma'                => self.md_2d_model.sigma,
        'lennard_jones_forces' => self.md_2d_model.lennard_jones_forces,
        'temperature_control'  => self.md_2d_model.temperature_control,
        'atoms'                => self.md_2d_model.atoms,
        'elements'             => self.md_2d_model.elements,
        'type'                 => "md2d"
      }
    end

    def interactive_properties
      {
        "id"          =>  self.md_2d_model.id,
        "type"        =>  "md2d", 
        "url"         =>  self.json_path,
        "viewOptions" =>  self.md_2d_model.viewOptions
      }
    end


    def json_path
      self.url_helper.md2d_model_url(md_2d_model, :host =>self.hostname, :format => :json)
    end

  end
end