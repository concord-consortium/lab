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
  # hex values (only color, texture_fg and texture_bg)
  json_string.gsub!(/("(color|texture_fg|texture_bg)": )"?([-+]?)(\h+)"?/, '\1\30x\4')
  var_name = basename.gsub('-', '_')
  File.open("models-json/#{basename}.js", 'w') { |f| f.write "var #{var_name} = #{json_string};" }
end
