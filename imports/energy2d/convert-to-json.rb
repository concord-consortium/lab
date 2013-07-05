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
lab_interactives_path =   File.join(PROJECT_ROOT, "src", "interactives", "energy2d", "imported")
models_dir =              "models-json"
models_path =             File.join(HERE, models_dir)

interactive_template = JSON.load(File.read(File.join(HERE, "interactive-template.json")))
lab_interactive_template = JSON.load(File.read(File.join(HERE, "lab-interactive-template.json")))
lab_solar_angle_slider_template = JSON.load(File.read(File.join(HERE, "lab-solar-angle-slider-template.json")))

#
# E2dPage
#
# An class for representing and extracting the content
# from a legacy Java Energy2D page
#
class E2dPage
  attr_reader :e2d, :e2d_path, :path, :basename, :title, :tagline, :content, :sun_angle_slider
  def initialize(path)
    @path = path.gsub(PROJECT_ROOT+"/", "")
    @name = File.basename(@path)
    @doc = Nokogiri::HTML(File.read(@path))
    @applet = @doc.css('applet')
    if @applet.empty?
      @e2d = false
      return
    end
    @e2d = @applet.css('param[name=script]').attr('value').to_s.split(" ").last
    @e2d.gsub!(/;$/, '')
    @e2d_path = File.join(File.dirname(@path), @e2d)
    @basename = @e2d.gsub(/\.e2d$/, '')
    @title = @doc.css('a[id="cc-link"] + h1').text
    @tagline = @doc.css('p[id="tagline"]').text
    @content = @doc.css('div[id="content"] p').collect { |p| p.text }.join("\n")
    @content.gsub!(/(Right-click to download this model|Download this model)/, "")
    @content.gsub!(/\n\n/, "\n")
    @content.strip!
    @sun_angle_slider = @doc.css('div[id="sun-angle-slider"]').length > 0
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

  # process initial hash and do some changes in its structure
  final_hash = { type: "energy2d" }.merge(hash['state']['model'])

  # boundary options
  # change structure to simpler form with 'type' property.
  boundary = hash['state']['model']['boundary']
  if boundary
    if boundary['flux_at_border']
      boundary_opts = boundary['flux_at_border']
      boundary_opts['type'] = 'flux'
      final_hash['boundary'].delete('flux_at_border')
    else
      boundary_opts = boundary['temperature_at_border']
      boundary_opts['type'] = 'temperature'
      final_hash['boundary'].delete('temperature_at_border')
    end
    boundary_opts.each do |key, value|
      final_hash['boundary'][key] = value
    end
  end

  # state
  if hash['state']['sensor'] && hash['state']['sensor']['thermometer']
    t = hash['state']['sensor']['thermometer']
    t = [t] if t.is_a?(Hash)
    final_hash['thermometers'] = t
  end

  # view options
  final_hash['viewOptions'] = hash['state']['view']

  json_string = JSON.pretty_generate(final_hash)

  # strings to values conversion
  # numbers
  json_string.gsub!(/"([-+]?[0-9]*\.?[0-9]+([eE][-+]?[0-9]+)?)"/, '\1')
  # boolean
  json_string.gsub!(/"(true|false)"/, '\1')
  # timestep -> timeStep
  json_string.gsub!(/timestep/, 'timeStep')
  var_name = basename.gsub('-', '_')
  capitalized_name = var_name.gsub('_', ' ').split.collect {|w| w.capitalize }.join(" ")
  json_filename = "#{basename}.json"
  model_file_path = File.join(models_path, json_filename)
  File.open(model_file_path, 'w') do |f|
    f.write(json_string)
  end

  page = e2d_pages[basename]

  #
  # create and write out the json structure for the Lab Interactive form
  #
  interactive = Marshal.load( Marshal.dump(lab_interactive_template))
  interactive["models"][0]["id"] = basename
  interactive["models"][0]["url"] = File.join("imports", "energy2d", models_dir, json_filename)
  if page
    interactive["title"] = page.title
    interactive["subtitle"] = page.tagline
    interactive["about"] = page.content
    interactive["publicationStatus"] = "draft"
    interactive["importedFrom"] = page.path
    interactive["models"][0]["importedFrom"] = page.e2d_path
    if page.sun_angle_slider
      interactive["components"] << lab_solar_angle_slider_template
    end
  else
    interactive["title"] = capitalized_name
    interactive["subtitle"] = ""
    interactive["about"] = "* no further description available"
    interactive["publicationStatus"] = "draft"
    interactive.delete("importedFrom")
    interactive["models"][0]["importedFrom"] = xml_file_path.gsub(PROJECT_ROOT+"/", "")
  end
  File.open("#{lab_interactives_path}/#{json_filename}", 'w') do |f|
    f.write(JSON.pretty_generate(interactive))
  end
end
