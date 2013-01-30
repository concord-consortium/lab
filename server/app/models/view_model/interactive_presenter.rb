class ViewModel::InteractivePresenter < ViewModel::Base
  attr_accessor :interactive

  
  def initialize(_interactive)
    self.interactive = _interactive
  end


  def json_listing
    return {
      'id'               => self.interactive.id,
      'name'             => self.interactive.title,
      'location'         => self.json_path
    }
  end

  def runtime_properties
    props = {
      'title'             => self.interactive.title,
      'publicationStatus' => self.interactive.publicationStatus,
      'subtitle'          => self.interactive.subtitle,
      'about'             => self.interactive.about,
      'models'            => self.model_summary,
      'components'        => self.interactive.components,
      'layout'            => self.interactive.layout
    }
    # hacky
    props.delete('layout') if self.interactive.layout.nil?
    props
  end

  def model_summary
    self.interactive.md_2d_models.map do |m| 
      ViewModel::Md2dModelPresenter.new(m).interactive_properties
    end
  end

  def json_path
    Rails.application.routes.url_helpers.interactive_url(self.interactive, :host => self.hostname )
  end

end
