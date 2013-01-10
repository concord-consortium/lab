source "http://rubygems.org"

gem "rake",               "~> 0.9.2"
gem "thor",               "~> 0.16.0"
gem 'rails',              "~> 3.2.11"

gem "fog",                "~> 1.7.0"
gem "librarian",          "~> 0.0.23"

gem "haml",               "~> 3.1.7"
gem "sass",               "~> 3.2.1"
gem 'bourbon',            "~> 2.1.1"

gem "guard",              "~> 1.5.4"
gem "guard-haml",         "~> 0.4"
gem "guard-sass",         "~> 1.0.1"
gem "guard-shell",        "~> 0.5.1"
gem "guard-livereload",   "~> 1.1.2"
gem 'guard-coffeescript', "~> 1.2.1"
gem 'kramdown',           "~> 0.13.6"
gem 'guard-markdown',     "~> 0.2.0"

gem "capistrano",         "~> 2.13.3"
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
  gem 'rb-fsevent', :require => darwin_only('rb-fsevent')
  gem 'rb-inotify', :require => linux_only('rb-inotify')
end

# gem 'debugger'
