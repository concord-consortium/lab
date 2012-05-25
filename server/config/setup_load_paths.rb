# config/setup_load_paths.rb
# https://rvm.io/integration/passenger/
# see: http://everydayrails.com/2010/09/13/rvm-project-gemsets.html
#     http://jeremy.wordpress.com/2010/08/19/ruby-rvm-passenger-rails-bundler-in-development/
#
if ENV['MY_RUBY_HOME'] && ENV['MY_RUBY_HOME'].include?('rvm')
  begin
    require 'rvm'
    RVM.use_from_path! File.dirname(File.dirname(__FILE__))
  rescue LoadError
    raise "RVM gem is currently unavailable."
  end
end

# If you're not using Bundler at all, remove lines bellow
ENV['BUNDLE_GEMFILE'] = File.expand_path('../Gemfile', File.dirname(__FILE__))
require 'bundler/setup'