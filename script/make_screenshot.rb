#!/usr/bin/env ruby

require 'fog'
require 'open-uri'
require 'etc'

login = Etc.getlogin
bucket_name     = "screenshots.lab.concord.org"
base_url        = "http://#{bucket_name}/"
login           = Etc.getlogin

source_filename = ARGV.first || HighLine.new.ask("Image source: ")
base_name       = File.basename(source_filename)
dst_file_name   = "#{login}_#{base_name}"

dst_file_name   = ARGV[1]  || HighLine.new.ask("Destination name: ") do |q|
  q.default = dst_file_name
end

source_file     = open(source_filename)

connection = Fog::Storage.new({:provider => 'AWS'})
if connection
  directory  = connection.directories.create(:key => bucket_name, :public => true)
  file       = nil
  write_file = false
  url = "#{base_url}#{dst_file_name}"

  if directory.files.head(dst_file_name)
    file = directory.files.get(dst_file_name)
    puts "found file at #{url}"
    write_file = HighLine.new.agree("Overwrite existing file? ") { |q| q.default = "n" }
  else
    file = directory.files.create(:key => dst_file_name)
    write_file = true
  end
  if write_file
    file.body = source_file
    file.public = true
    file.save
  end
  puts url
else
  puts "Couldn't connect to the S3 bucket named: #{bucket_name}"
end