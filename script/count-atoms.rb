#!/usr/bin/env ruby

# count the number of atoms referenced by all the model files

require_relative 'setup.rb'

require 'rubygems'
require 'fileutils'
require 'json'                       # http://flori.github.com/json/doc/index.html

# this needs to be run from the root of the repo after it has been built
converted_models = Dir["public/imports/legacy-mw-content/converted/**/*.json"]
models = Dir["public/models/md2d/**/*.json"]

puts "converted_models: #{converted_models.size}"
puts "models: #{models.size}"

models = models + converted_models

atoms = 0
models.each do |path|
	model = JSON.load(File.read(path))
	if(model['atoms'])
	  atoms += model['atoms']['x'].size
	end
end
puts "number of atoms: #{atoms}"
