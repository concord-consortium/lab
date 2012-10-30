#!/usr/bin/env ruby
require_relative 'setup.rb'
require 'json'

JS_CONFIG_PATH = File.join(SRC_LAB_PATH, 'lab.config.js')

# default jsconfig "sharing" is true
if CONFIG[:jsconfig] == nil || CONFIG[:jsconfig][:sharing] == nil
  CONFIG[:jsconfig] = { :sharing => true }
end

jsconfig = <<HEREDOC
// this file is generated during build process by: ./script/generate-js-config.rb
define(function (require) {
  return #{JSON.pretty_generate(CONFIG[:jsconfig])};
});
HEREDOC

File.open(JS_CONFIG_PATH, 'w') { |f| f.write jsconfig }

