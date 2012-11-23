#!/usr/bin/env ruby
require_relative '../../../../script/setup.rb'

require 'rubygems'
require 'fileutils'
require 'json'                       # http://flori.github.com/json/doc/index.html
require 'yaml'
require 'active_support/core_ext'    # http://guides.rubyonrails.org/active_support_core_extensions.html
require 'pp'

INTERACTIVE_EXAMPLES_PATH = File.join(SERVER_PUBLIC_PATH, 'examples', 'interactives')
INTERACTIVES_PATH = File.join(INTERACTIVE_EXAMPLES_PATH, 'interactives')
SRC_INTERACTIVE_PATH = File.join(SRC_PATH, 'examples', 'interactives', 'interactives')

description = {}
groups = []
interactives = []

Dir.chdir(INTERACTIVE_EXAMPLES_PATH) do
  files = Dir["interactives/**/*"]
  directories = files.select { |f| File.directory?(f) }
  groups = YAML.load_file(File.join(SRC_INTERACTIVE_PATH, 'groups.yaml'))
  interactive_files = files.select {|f| f[/.*\.json$/]}
  interactive_files.each do |path|
    interactive = JSON.load(File.read(path))
    groupKey = File.join(File.dirname(path).split(File::SEPARATOR).slice(1..-1))
    interactives << { 
      :title => interactive['title'],
      :path => path,
      :groupKey => groupKey,
      :subtitle => interactive['subtitle'] || "",
      :about => interactive['about'] || "",
      :publicationStatus => interactive['publicationStatus'] || 'draft'
    }
  end
end

interactives_description = {
  :interactives => interactives,
  :groups => groups
}

interactives_description_json = JSON.pretty_generate(interactives_description)

# puts interactives_description_json

interactives_json_path = File.join(INTERACTIVE_EXAMPLES_PATH, 'interactives.json')
File.open(interactives_json_path, 'w') { |f| f.write interactives_description_json }
