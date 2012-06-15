#!/usr/bin/env ruby

require 'rubygems'
require 'json'                       # http://flori.github.com/json/doc/index.html
require 'active_support/core_ext'    # http://guides.rubyonrails.org/active_support_core_extensions.html


xml_files = Dir["models-xml/*.e2d"]
xml_files.each do | xml_file_path|
  puts "converting: " + xml_file_path
  basename = File.basename(xml_file_path).gsub(/\.e2d$/, '')
  xml_file = File.open(xml_file_path).read.to_s
  hash = Hash.from_xml(xml_file)
  json_string = JSON.pretty_generate(hash['state'])
  # strings to values conversion
  # numbers
  json_string.gsub!(/"([-+]?[0-9]*\.?[0-9]+([eE][-+]?[0-9]+)?)"/, '\1') 
  # boolean
  json_string.gsub!(/"(true|false)"/, '\1')
  var_name = basename.gsub('-', '_')
  File.open("models-json/#{basename}.json", 'w') do |f| 
    f.write(json_string)
  end
end