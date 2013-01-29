class ViewModel::InteractivePresenter
  attr_accessor :interactive

  def initialize(_interactive)
    self.interactive = _interactive
  end


  def json_listing
    return {
      'id'               => (self.interactive.id),
      'name'             => (self.interactive.title),
      'location'         => (self.json_path)
    }
  end

  def runtime_properties
    {
      'title'             => (self.interactive.title),
      'publicationStatus' => (self.interactive.publicationStatus),
      'subtitle'          => (self.interactive.subtitle),
      'about'             => (self.interactive.about),
      'models'            => (self.full_models),
      'components'        => (self.interactive.components),
      'layout'            => (self.interactive.layout)
    }
  end

  def full_models
    self.interactive.md_2d_models.map do |m| 
      ViewModel::Md2dModelPresenter.new(m).runtime_properties
    end
  end

  def json_path
    Rails.application.routes.url_helpers.interactive_path(self.interactive)
  end

end
