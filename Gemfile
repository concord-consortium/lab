source "http://rubygems.org"

gem "rake",               "~> 10.0.3"
gem "thor",               "~> 0.16.0"
gem 'rails',              "~> 3.2.12"

gem "fog",                "~> 1.9.0"
gem "librarian",          "~> 0.0.26"

gem "haml",               "~> 4.0.0"
gem "sass",               "~> 3.2.5"
gem 'bourbon',            "~> 3.1.0"
gem 'neat',               "~> 1.1.0"

gem "guard",              "~> 1.6.2"
gem "guard-haml",         "~> 0.4"
gem "guard-sass",         "~> 1.0.2"
gem "guard-shell",        "~> 0.5.1"
gem "guard-livereload",   "~> 1.1.3"
gem 'guard-coffeescript', "~> 1.2.1"
gem 'kramdown',           "~> 0.13.6"
gem 'guard-markdown',     "~> 0.2.0"

gem "capistrano",         "~> 2.14.2"
gem "rvm-capistrano",     "~> 1.2.6"
gem "grit",               "~> 2.5.0"

gem "mustache",           "~> 0.99.4"

def darwin_only(require_as)
  RUBY_PLATFORM.include?('darwin') && require_as
end

def linux_only(require_as)
  RUBY_PLATFORM.include?('linux') && require_as
end

group :development do
  gem 'rb-fsevent', "~> 0.9.3", :require => darwin_only('rb-fsevent')
  gem 'rb-inotify', "~> 0.8.8", :require => linux_only('rb-inotify')
end

# gem 'debugger'
