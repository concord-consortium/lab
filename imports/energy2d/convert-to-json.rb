#!/usr/bin/env ruby

HERE = File.expand_path('..', __FILE__)
$: << File.expand_path('../../..', __FILE__);

require 'rubygems'
require 'fileutils'
require 'json'                       # http://flori.github.com/json/doc/index.html
require 'active_support/core_ext'    # http://guides.rubyonrails.org/active_support_core_extensions.html
require 'nokogiri'

require 'script/setup.rb'

e2d_models_path =         File.join(HERE, "models-xml")

original_content_path =   File.join(HERE, "content")

interactives_dir =        "interactives/imports"
interactives_path =       File.join(PROJECT_ROOT, "src/examples/energy2d-model", interactives_dir)
interactives_index_path = File.join(PROJECT_ROOT, "src/examples/energy2d-model/interactives-index.js")
FileUtils.mkdir_p interactives_path

models_dir =              "models-json"
models_path =             File.join(HERE, models_dir)
models_index_path =       File.join(HERE, "models-index.js")

models_file = File.open(models_index_path, 'w');
models_file.write("var models_library = {};\nvar models_index = {\n");

interactive_template = JSON.load(File.read(File.join(HERE, "interactive-template.json")))

#
# The hash objects from which the index files are generated
#
interactives = {}
models = {}

#
# E2dPage
#
# An class for representing and extracting the content
# from a legacy Java Energy2D page
#
class E2dPage
  attr_reader :e2d, :basename, :title, :tagline, :content
  def initialize(path)
    @name = File.basename(path)
    @doc = Nokogiri::HTML(File.read(path))
    @applet = @doc.css('applet')
    if @applet.empty?
      @e2d = false
      return
    end
    @e2d = @applet.css('param[name=script]').attr('value').to_s.split(" ").last
    @basename = @e2d.gsub(/\.e2d;$/, '')
    @title = @doc.css('a[id="cc-link"] + h1').text
    @tagline = @doc.css('p[id="tagline"]').text
    @content = @doc.css('div[id="content"] p').text
    @content.gsub!(/(Right-click to download this model|Download this model)/, "")
    @content.strip!
  end
end

#
# Create a hash object with all the html pages that reference the
# Energy2D Java applet. The key for each E2dPage object is the basename
# of the mode file.
#
e2d_pages = {}
Dir["#{original_content_path}/*.html"].collect {|path| E2dPage.new(path) }.find_all { |page| page.e2d }.each { |page| e2d_pages[page.basename] = page }

#
# Process the Energy2D model state xml files
#
xml_files = Dir["#{e2d_models_path}/*.e2d"]
xml_files.each do |xml_file_path|
  #
  #  create and write out the new json model
  #
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
  capitalized_name = var_name.gsub('_', ' ').split.collect {|w| w.capitalize }.join(" ")
  json_filename = "#{basename}.json"
  model_file_path = File.join(models_path, json_filename)
  File.open(model_file_path, 'w') do |f|
    f.write(json_string)
  end
  #
  # create and write out the new json interactive
  #
  page = e2d_pages[basename]
  interactive = interactive_template.clone
  interactive["model"] = File.join("/imports/energy2d/", models_dir, json_filename)
  if page
    interactive["description"]["title"] = page.title
    interactive["description"]["tagline"] = page.tagline
    interactive["description"]["content"] = page.content
    interactive["description"]["footnote"] = ""
  else
    interactive["description"]["title"] = capitalized_name
    interactive["description"]["tagline"] = ""
    interactive["description"]["content"] = ""
    interactive["description"]["footnote"] = "* no further description available"
    capitalized_name << "*"
  end
  File.open("#{interactives_path}/#{json_filename}", 'w') do |f|
    f.write(JSON.pretty_generate(interactive))
  end
  #
  # add another object to the index of models
  #
  models[var_name] = {
    "name" => capitalized_name,
    "path" => File.join(models_dir, json_filename)
  }
  #
  # add another object to the index of interactives
  #
  interactives[var_name] = {
    "name" => capitalized_name,
    "path" => File.join(interactives_dir, json_filename)
  }
end

#
# Write out the models index file
#
models_file = File.open(models_index_path, 'w');
models_file.write("var modelsIndex = ");
puts "writing: #{models_index_path} ..."
models_file.write JSON.pretty_generate(models)
models_file.write(";\n")
models_file.close()

#
# Write out the interactives index file
#
interactives_file = File.open(interactives_index_path, 'w');
interactives_file.write("var interactivesIndex = ");
puts "writing: #{interactives_index_path} ..."
interactives_file.write JSON.pretty_generate(interactives)
interactives_file.write(";\n")
interactives_file.close()
