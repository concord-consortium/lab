#!/usr/bin/env ruby
require 'erb'
require 'optparse'

@interactive_dir = false

opts = OptionParser.new
opts.on("-m", "--mml-model=PATH")	{ |val| @mml_model_path = val }
opts.on("-o", "--output-interactive=DIR")	{ |val| @interactive_dir = val }

opts.on_tail("-h", "--help", "Show this message") do
  puts opts
  exit
end

opts.parse(ARGV)

template = ERB.new <<-HEREDOC
{
  "title": "<%= @title %>",
  "publicationStatus": "draft",
  "subtitle": "",
  "about": "",
  "models": [
    {
      "id": "<%= @model_name %>",
      "url": "<%= @model_path %>",
      "viewOptions": {
        "controlButtons": "play_reset"
      }
    }
  ],
  "components": [
  ],
  "layout": {
    "bottom": [
    ]
  }
}
HEREDOC


@model_path = @mml_model_path.gsub("imports/legacy-mw-content", "/imports/legacy-mw-content/converted").gsub(/\.mml$/, "")
@model_name = File.basename(@model_path)
@model_path += ".json"
@title = @model_name.gsub("$0", "")

@result = template.result(binding)
puts @result

if @interactive_dir
  @interactive_path = @interactive_dir + "/" + @title + ".json"
  puts "written to: #{@interactive_path}"
  File.open(@interactive_path, 'w') { |f| f.write @result }
end

