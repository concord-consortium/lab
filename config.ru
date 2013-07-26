require 'rack-livereload'
require 'shutterbug'

require "./script/setup"

ENVIRONMENT = CONFIG[:environment]
puts "environment: #{ENVIRONMENT}"

JNLP_APP_PATH = PUBLIC_PATH
require './lib/rack/jnlp.rb'

use Rack::Jnlp
use Rack::ConditionalGet
use Rack::ContentLength

# Shutterbug adds these:
# shutterbug/shutterbug.js shutterbug/get_png/SHA1
use Shutterbug::Rackapp

# see: https://github.com/johnbintz/rack-livereload
if ENVIRONMENT == 'development'
  puts "using rack-live-reload"
  use Rack::LiveReload
  use Rack::Static, :urls => [""], :root => PUBLIC_PATH, :index =>'index.html'
end

Rack::Mime::MIME_TYPES.merge!({
  ".ttf" => "font/ttf",
  ".mml" => "application/xml",
  ".cml" => "application/xml",
  ".e2d" => "application/xml"
})

app = Rack::Directory.new PUBLIC_PATH

run app
