#!/usr/bin/env ruby

archives = Dir['archived/*']

archives.each do |archive|
  link_path = archive.gsub(/^archived\//, 'public/')
  unless File.exists?(link_path)
    cmd = "ln -s ../#{archive}/public #{link_path}"
    puts cmd
    system(cmd)
  end
end
