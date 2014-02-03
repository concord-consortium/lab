#!/usr/bin/env ruby
require_relative '../../script/setup.rb'

require 'rubygems'
require 'fileutils'
require 'json'                       # http://flori.github.com/json/doc/index.html
require 'yaml'
require 'pp'

INTERACTIVE_EXAMPLES_PATH = PUBLIC_PATH
INTERACTIVES_PATH = File.join(INTERACTIVE_EXAMPLES_PATH, 'interactives')
SRC_INTERACTIVES_PATH = File.join(SRC_PATH, 'interactives')

description = {}
groups = []
interactives = []

Dir.chdir(INTERACTIVE_EXAMPLES_PATH) do
  files = Dir["interactives/**/*"]
  directories = files.select { |f| File.directory?(f) }
  groups = YAML.load_file(File.join(SRC_INTERACTIVES_PATH, 'groups.yaml'))
  interactive_files = files.select {|f| f[/.*\.json$/]}
  interactive_files.each do |path|
    interactive = JSON.load(File.read(path))
    next if interactive['redirect']

    groupKey = File.join(File.dirname(path).split(File::SEPARATOR).slice(1..-1))
    meta = {
      :title => interactive['title'],
      :path => path,
      :groupKey => groupKey,
      :subtitle => interactive['subtitle'] || "",
      :about => interactive['about'] || "",
      :publicationStatus => interactive['publicationStatus'] || "draft",
      :category => interactive['category'] || "",
      :subCategory => interactive['subCategory'] || "",
      :screenshot => interactive['screenshot'] || ""
    }
    meta[:aspectRatio] = interactive['aspectRatio'] if interactive['aspectRatio']
    interactives << meta
  end
end

interactives = interactives.sort_by { |i| [i[:groupKey], i[:path]] }

interactives_description = {
  :interactives => interactives,
  :groups => groups
}

interactives_description_json = JSON.pretty_generate(interactives_description)

# puts interactives_description_json

interactives_json_path = File.join(INTERACTIVE_EXAMPLES_PATH, 'interactives.json')
File.open(interactives_json_path, 'w') { |f| f.write interactives_description_json }
