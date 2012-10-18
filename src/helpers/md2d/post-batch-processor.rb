#!/usr/bin/env ruby

require 'json'

module ProcessMML
  def process_mml_files(name, cml_file, mml_files)
    index = 0
    index_str = ""
    mml_files.each do |mml_file|
      if mml_files.length > 1
        index += 1
        index_str = "-#{index}"
      end
      page = {
        "name" => name + index_str,
        "path" => @section_path + "/",
        "cml" => cml_file,
        "mml" => mml_file,
        "json" => 'converted/' + mml_file.gsub(".mml", ".json")
      }
      @pages.push(page)
    end
  end
end

#
# MD2DDirectory
#
# Use this when there are multiple cml and mml files in a single directory
#
# Example: imports/legacy-mw-content/student/classic/pendulum/
#
#  $ tree -L 2 imports/legacy-mw-content/student/classic/pendulum/
#  imports/legacy-mw-content/student/classic/pendulum/
#  |-- NewtonCradle$0.mml
#  |-- NewtonCradle.cml
#  |-- NewtonCradle.html
#  |-- doublependulum1$0.mml
#  |-- doublependulum1.cml
#  |-- doublependulum1.html
#
class MD2DDirectory
  include ProcessMML
  attr_reader :section
  def initialize(dir, special_path="")
    @section_path = dir
    @section = { "section" => @section_path }
    @all_cml_files =  Dir["#{@section_path}/*.cml"]
    @cml_files = []
    @mml_files = []
    @pages = []
    @all_cml_files.each do |cml_file|
      cml_base = cml_file.gsub(".cml", "")
      name = File.basename(cml_base)
      matching_mml_files = Dir["#{cml_base}*.mml"]
      process_mml_files(name, cml_file, matching_mml_files)
    end
    @section["content"] = @pages
    if @pages.length == 0
      @section = false
    end
  end
end

#
# MD2DSection
#
# Use this when there is a single separate cml file in each directory
#
# Example: imports/legacy-mw-content/potential-tests/
#
#  $ tree -L 2 imports/legacy-mw-content/potential-tests/
#   imports/legacy-mw-content/potential-tests/
#   |-- boiling-point-non-polar-only
#   |   |-- boiling-point-non-polar-only$0.mml
#   |   `-- boiling-point-non-polar-only.cml
#   |-- boiling-point-polar-only
#   |   |-- boiling-point-polar-only$0.mml
#   |   `-- boiling-point-polar-only.cml
#
#
class MD2DSection
  include ProcessMML
  attr_reader :section, :page_directories
  def initialize(dir, special_path="")
    @section_path = dir
    @section = { "section" => @section_path }
    @page_directories = Dir["#{@section_path}/#{special_path}**"]
    @page_directories = @page_directories.find_all { |d| Dir["#{d}/*.mml"].length > 0 }
    @section["content"] = []
    @page_directories.each do |page_dir|
      @section["content"] += process_page_dir(page_dir)
    end
  end

  def process_page_dir(page_dir)
    @section_path = File.dirname(page_dir)
    name = File.basename(page_dir)
    cml_file =  Dir["#{page_dir}/*.cml"][0]
    mml_files = Dir["#{page_dir}/*.mml"]
    @pages = []
    process_mml_files(name, cml_file, mml_files)
    @pages
  end
end

#
# MD2DImports
#
# An class for representing and extracting the content
# from a legacy Java Energy2D page
#
class MD2DImports
  attr_reader :model_list, :model_list_dot_js
  def initialize()
    @model_list = []
    @path = "server/public/imports/legacy-mw-content"
    @model_list_dot_js = "#{@path}/model-list.js"
    Dir.chdir(@path) do
      @dirs = Dir["sam-activities/**"]
      @dirs.each do |dir|
        @model_list.push(MD2DSection.new(dir, "original-interactives-in-pages/").section)
      end
      @dirs = Dir["other-activities/**"]
      @dirs.each do |dir|
        model_list.push(MD2DSection.new(dir, "original-interactives-in-pages/").section)
      end
      @model_list.push(MD2DSection.new("potential-tests").section)
      @model_list.push(MD2DSection.new("validation").section)
      @model_list.push(MD2DDirectory.new("tutorial").section)
      @model_list.push(MD2DDirectory.new("new-examples-for-nextgen").section)
      @model_list.push(MD2DDirectory.new("student/classic/pendulum").section)
      @model_list.push(MD2DDirectory.new("visual/Recycling").section)
      @model_list.push(MD2DSection.new("inquiry-space").section)
      @dirs = Dir["tutorial/**"]
      @dirs.each do |dir|
        @tutorial_section = MD2DDirectory.new(dir).section
        @model_list.push(@tutorial_section) if @tutorial_section
      end
      @model_list.push(MD2DDirectory.new("conversion-and-physics-examples").section)
    end
  end

  def write_model_list
    File.open(@model_list_dot_js, "w") { |f| f.write("modelList = " + JSON.pretty_generate(@model_list)) }
    puts "created: #{@model_list_dot_js}"
  end

end

md2d_imports = MD2DImports.new
md2d_imports.write_model_list
