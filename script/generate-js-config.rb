#!/usr/bin/env ruby
require_relative 'setup.rb'
require 'json'

JS_CONFIG_PATH = File.join(SRC_LAB_PATH, 'lab.config.js')

# Provide default values for some values.
CONFIG[:jsconfig] = {} if CONFIG[:jsconfig] == nil

CONFIG[:jsconfig][:sharing] = true  if CONFIG[:jsconfig][:sharing] == nil
CONFIG[:jsconfig][:logging] = true  if CONFIG[:jsconfig][:logging] == nil
CONFIG[:jsconfig][:tracing] = false if CONFIG[:jsconfig][:tracing] == nil
CONFIG[:jsconfig][:authoring] = false if CONFIG[:jsconfig][:authoring] == nil
CONFIG[:jsconfig][:actualRoot] = "" if CONFIG[:jsconfig][:actualRoot] == nil

jsconfig = <<HEREDOC
// this file is generated during build process by: ./script/generate-js-config.rb
define(function (require) {
  return #{JSON.pretty_generate(CONFIG[:jsconfig])};
});
HEREDOC

File.open(JS_CONFIG_PATH, 'w') { |f| f.write jsconfig }

