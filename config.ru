require 'rack-livereload'
require 'shutterbug'

require "./script/setup"
JNLP_APP_PATH = PUBLIC_PATH
require './lib/rack/jnlp.rb'

use Rack::Jnlp
use Rack::ConditionalGet
use Rack::ContentLength

# Shutterbug adds these:
# shutterbug/shutterbug.js shutterbug/get_png/SHA1
use Shutterbug::Rackapp

# see: https://github.com/johnbintz/rack-livereload
if CONFIG[:environment] == 'development'
  use Rack::LiveReload, :min_delay => 200
end

Rack::Mime::MIME_TYPES.merge!({
  ".ttf" => "font/ttf",
  ".mml" => "application/xml",
  ".cml" => "application/xml",
  ".e2d" => "application/xml"
})

app = Rack::Directory.new PUBLIC_PATH

run app
