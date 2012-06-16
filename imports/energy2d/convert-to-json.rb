#!/usr/bin/env ruby

require 'rubygems'
require 'json'                       # http://flori.github.com/json/doc/index.html
require 'active_support/core_ext'    # http://guides.rubyonrails.org/active_support_core_extensions.html

interactive = JSON.load(File.read("interactive-template.json"))

interactives_path = "../../src/examples/energy2d-model/interactives"
index_path = "../../src/examples/energy2d-model/models-index.js"

index_file = File.open(index_path, 'w');
index_file.write("var models_library = {};\nvar models_index = {\n");

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
  json_filename = "#{basename}.json"
  short_file_path = "models-json/#{json_filename}"
  File.open(short_file_path, 'w') do |f|
    f.write(json_string)
  end
  interactive["model"] = "/imports/energy2d/" + short_file_path
  interactive["components"][0]["title"] = basename.gsub('-', ' ').split.collect {|w| w.capitalize }.join(", ")
  File.open("#{interactives_path}/#{json_filename}", 'w') do |f|
    f.write(JSON.pretty_generate(interactive))
  end
  index_file.write("\t\"#{var_name}\": \"interactives/#{basename}.js\",\n")
end

index_file.write("};\n")
index_file.close()
