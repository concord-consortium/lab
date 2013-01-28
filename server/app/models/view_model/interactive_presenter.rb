class ViewModel::InteractivePresenter
  attr_accessor :interactive

  def initialize(_interactive)
    self.interactive = _interactive
  end

  def meta_data
    {
      'title'             => (self.interactive.send :title),
      'subtitle'          => (self.interactive.send :subtitle),
      'publicationStatus' => (self.interactive.send :publicationStatus),
      'about'             => (self.interactive.send :about),
      'group_key'         => (self.interactive.send :group_key),
      'path'              => (self.interactive.send :path),
      'layout'            => (self.interactive.send :layout)
    }
  end


  def json_listing
    return {
      'id'               => (self.interactive.send :id),
      'name'             => (self.interactive.send :title),
      'location'         => (self.json_path)
    }
  end

  def runtime_properties
    {
      'title'             => (self.interactive.send :title),
      'publicationStatus' => (self.interactive.send :publicationStatus),
      'subtitle'          => (self.interactive.send :subtitle),
      'about'             => (self.interactive.send :about),
      'models'            => (self.interactive.send :models),
      'components'        => (self.interactive.send :components),
      'layout'            => (self.interactive.send :layout)
    }
  end


  def json_path
    Rails.application.routes.url_helpers.interactive_path(self.interactive)
  end

end
