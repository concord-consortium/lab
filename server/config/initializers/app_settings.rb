require 'yaml'

settings = YAML.load_file(File.join( ::Rails.root.to_s, "config", "settings.yml"))
hostname = settings[Rails.env][:hostname]
Rails.application.routes.default_url_options[:host] = hostname
