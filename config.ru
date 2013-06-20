gem 'rack-rewrite', '~> 1.3.3'
require 'rack/rewrite'
require 'shutterbug'

PUBLIC_PATH =  File.join(Dir.pwd, 'public')
JNLP_APP_PATH = PUBLIC_PATH

require './lib/rack/jnlp.rb'

use Rack::Jnlp
use Rack::ConditionalGet
use Rack::ContentLength

# Shutterbug adds these:
# shutterbug/shutterbug.js shutterbug/get_png/SHA1
use Shutterbug::Rackapp

Rack::Mime::MIME_TYPES.merge!({
  ".ttf" => "font/ttf",
  ".mml" => "application/xml"
})

# use Rack::Rewrite do
#   r301   '/examples/interactives/interactives.html',  '/interactives.html'
#   r301   '/examples/interactives/embeddable.html',    '/embeddable.html'
#   r301   '/examples/interactives/interactives.json',  '/interactives.json'
# end

app = Rack::Directory.new PUBLIC_PATH

run app
