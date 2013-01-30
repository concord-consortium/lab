# TODO: BadName
class ViewModel::Base
  attr_accessor :interactive

  def hostname
    "localhost:3000"
  end

  def json_path
    Rails.application.routes.url_helpers.interactive_url(self.interactive, :host => self.hostname )
  end

end
