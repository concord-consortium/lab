module FontCDN
  def self.cssURL
  	"//fonts.googleapis.com/css?family=Lato:300italic,700italic,300,400,400italic,700"
  end

  def self.cssLink
  	"<link href='#{cssURL}' rel='stylesheet' type='text/css'>"
  end
end