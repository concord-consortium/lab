#!/usr/bin/env ruby
require 'fileutils'

versions = Dir['version/*'].select {|p| File.directory?(p) }
public_version_path = 'public/version'
FileUtils.mkdir_p public_version_path

versions.each do |version|
  link_path = version.gsub(/^version\//, "#{public_version_path}/")
  unless File.exists?(link_path)
    cmd = "ln -s ../../#{version}/public #{link_path}"
    puts cmd
    system(cmd)
    cmd = "ln -s ../../#{version}.tar.gz #{link_path}.tar.gz"
    puts cmd
    system(cmd)
  end
end
