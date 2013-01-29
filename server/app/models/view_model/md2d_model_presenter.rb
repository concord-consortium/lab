class ViewModel::Md2dModelPresenter
  attr_accessor :md_2d_model

  def initialize(_md_2d_model)
    self.md_2d_model = _md_2d_model
  end

  def json_listing
    return {
      'id'               => (self.md_2d_model.id),
      'name'             => (self.md_2d_model.title),
      'location'         => (self.json_path)
    }
  end

  def runtime_properties
    {
      'name'             => (self.md_2d_model.name),
      'temperature' => (self.md_2d_model.temperature),
      'coulomb_forces'          => (self.md_2d_model.coulomb_forces),
      'epsilon'             => (self.md_2d_model.epsilon),
      'sigma'            => (self.md_2d_model.sigma),
      'lennard_jones_forces'      => (self.md_2d_model.lennard_jones_forces),
      'temperature_control'        => (self.md_2d_model.temperature_control),
      'atoms'            => (self.md_2d_model.atoms),
      'elements'            => (self.md_2d_model.elements)
    }
  end

  def json_path
    Rails.application.routes.url_helpers.md_2d_model_path(self.md_2d_model)
  end

end
