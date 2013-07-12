#!/usr/bin/env ruby

HERE = File.expand_path('..', __FILE__)
$: << File.expand_path('../../..', __FILE__);

require 'rubygems'
require 'fileutils'
require 'json'                       # http://flori.github.com/json/doc/index.html
require 'active_support/core_ext'    # http://guides.rubyonrails.org/active_support_core_extensions.html
require 'nokogiri'
require 'kramdown'

require 'script/setup.rb'

e2d_models_path =         File.join(HERE, "models-xml")
original_content_path =   File.join(HERE, "content")
original_content_htb_path =   File.join(HERE, "content-htb")
lab_interactives_imported_path = File.join(PROJECT_ROOT, "src", "interactives", "energy2d", "imported")
lab_interactives_imported_htb_path = File.join(PROJECT_ROOT, "src", "interactives", "energy2d", "imported-htb")

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
  attr_reader :e2d, :e2d_path, :path, :htb, :basename, :title, :tagline, :content, :sun_angle_slider
  def initialize(path)
    @path = path.gsub(PROJECT_ROOT+"/", "")
    @htb = @path[/content-htb/]
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
    @basename = File.basename(@e2d).gsub(/\.e2d$/, '')
    if @htb
      puts @path
      @title = @doc.css('h1').first.text
      if @doc.css('h2').first
        @tagline = @doc.css('h2').first.text
      end
      html_content = @doc.xpath("//td")[0].xpath('*[not(self::h2)]').to_html
    else
      @title = @doc.css('a[id="cc-link"] + h1').text
      @tagline = @doc.css('p[id="tagline"]').text
      html_content = @doc.xpath("//div[@id='content']//p[not(.//*[contains(text(), 'Right-click')])]").to_html
    end
    html_content.gsub!(/<center.*?>(.*?)<\/center.*?>/m, '\1')
    html_content.gsub!(/<font.*?>(.*?)<\/font.*?>/m, '\1')
    html_content.gsub!(/\n{3,}/m, "\n\n")
    html_content.gsub!(/(?<!\n)\n(?!\n)/, " ")
    html_content.strip!
    @content = Kramdown::Document.new(html_content, :input => 'html').to_kramdown
    @sun_angle_slider = @doc.css('div[id="sun-angle-slider"]').length > 0
  end
end

#
# Create a hash object with all the html pages that reference the
# Energy2D Java applet. The key for each E2dPage object is the basename
# of the model file.
#
e2d_pages = {}
pages = Dir["#{original_content_path}/*.html"].collect {|path| E2dPage.new(path) }.find_all { |page| page.e2d }
pages.each do |page|
  e2d_pages[page.basename] = page
end

pages = Dir["#{original_content_htb_path}/*.html"].collect {|path| E2dPage.new(path) }.find_all { |page| page.e2d }
pages.each do |page|
  e2d_pages[page.basename] = page
end

#
# Process the Energy2D model state xml files
#
xml_files = Dir["#{e2d_models_path}/*.e2d"]
xml_files.each do |xml_file_path|
  puts "Generating interactive for: " + xml_file_path
  basename = File.basename(xml_file_path).gsub(/\.e2d$/, '')
  page = e2d_pages[basename]
  var_name = basename.gsub('-', '_')
  capitalized_name = var_name.gsub('_', ' ').split.collect {|w| w.capitalize }.join(" ")
  json_filename = "#{basename}.json"

  #
  # create and write out the json structure for the Lab Interactive form
  #
  interactive = Marshal.load( Marshal.dump(lab_interactive_template))
  interactive["models"][0]["id"] = basename
  interactive["models"][0]["url"] = File.join("imports", "energy2d", models_dir, json_filename)
  path = lab_interactives_imported_path
  if page
    interactive["title"] = page.title
    interactive["subtitle"] = page.tagline
    interactive["about"] = page.content
    interactive["publicationStatus"] = "draft"
    interactive["importedFrom"] = page.path
    interactive["models"][0]["importedFrom"] = "imports/energy2d/models-xml/#{page.basename}.e2d"
    if page.sun_angle_slider
      interactive["components"] << lab_solar_angle_slider_template
    end
    if page.htb
      path = lab_interactives_imported_htb_path
    end
  else
    interactive["title"] = capitalized_name
    interactive["subtitle"] = ""
    interactive["about"] = "* no further description available"
    interactive["publicationStatus"] = "draft"
    interactive.delete("importedFrom")
    interactive["models"][0]["importedFrom"] = xml_file_path.gsub(PROJECT_ROOT+"/", "")
  end
  File.open("#{path}/#{json_filename}", 'w') do |f|
    f.write(JSON.pretty_generate(interactive))
  end
end
