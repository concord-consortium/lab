JNLP_APP_PATH = File.join(Rails.public_path, 'jnlp')

JnlpApp = Rack::Builder.new {
  use Rack::Jnlp
  use Rack::ConditionalGet
  run Rack::Directory.new(JNLP_APP_PATH)
}.to_app
