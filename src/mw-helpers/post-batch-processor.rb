#!/usr/bin/env ruby

require 'json'

def process_dir(dir)
  section_path = dir
  all_cml_files =  Dir["#{dir}/*.cml"]
  cml_files = []
  mml_files = []
  pages = []
  all_cml_files.each do |cml_file|
    index = 0
    index_str = ""
    cml_base = cml_file.gsub(".cml", "")
    name = File.basename(cml_base)
    matching_mml_files = Dir["#{cml_base}*.mml"]
    matching_mml_files.each do |mml_file|
      if matching_mml_files.length > 1
        index += 1
        index_str = "-#{index}"
      end
      page = {
        "name" => name + index_str,
        "path" => section_path + "/",
        "cml" => cml_file,
        "mml" => mml_file,
        "json" => 'converted/' + mml_file.gsub(".mml", ".json")
      }
      pages.push(page)
    end
  end
  section = { "section" => section_path }
  section["content"] = pages
  pages.length > 0 ? section : false
end

def process_page_dir(page_dir)
  section_path = File.dirname(page_dir)
  name = File.basename(page_dir)
  cml_file =  Dir["#{page_dir}/*.cml"][0]
  mml_files = Dir["#{page_dir}/*.mml"]
  page_index = mml_files.length
  index = 0
  index_str = ""
  pages = []
  mml_files.each do |mml_file|
    if mml_files.length > 1
      index += 1
      index_str = "-#{index}"
    end
    page = {
      "name" => name + index_str,
      "path" => section_path + "/",
      "cml" => cml_file,
      "mml" => mml_file,
      "json" => 'converted/' + mml_file.gsub(".mml", ".json")
    }
    pages.push(page)
  end
  pages
end

def process_section(dir, special_path="")
  section_path = dir
  section = { "section" => section_path }
  page_directories = Dir["#{dir}/#{special_path}**"]
  page_directories = page_directories.find_all { |d| Dir["#{d}/*.mml"].length > 0 }
  section["content"] = []
  page_directories.each do |page_dir|
    section["content"] += process_page_dir(page_dir)
  end
  section
end

model_list = []
path = "server/public/imports/legacy-mw-content"

Dir.chdir(path) do
  dirs = Dir["sam-activities/**"]
  dirs.each do |dir|
    model_list.push(process_section(dir, "original-interactives-in-pages/"))
  end
  dirs = Dir["other-activities/**"]
  dirs.each do |dir|
    model_list.push(process_section(dir, "original-interactives-in-pages/"))
  end
  model_list.push(process_section("visual"))
  model_list.push(process_section("potential-tests"))
  model_list.push(process_section("validation"))
  model_list.push(process_dir("tutorial"))
  dirs = Dir["tutorial/**"]
  dirs.each do |dir|
    tutorial_section = process_dir(dir)
    model_list.push(tutorial_section) if tutorial_section
  end
  model_list.push(process_dir("conversion-and-physics-examples"))
end

model_list_dot_js = "#{path}/model-list.js"

File.open(model_list_dot_js, "w") {|f| f.write("modelList = " + JSON.pretty_generate(model_list)) }

puts "created: #{model_list_dot_js}"