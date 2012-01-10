ignore_paths 'bin', 'examples', 'lib', 'node_modules'

# FireSass allows Firebug to display the original Sass filename 
# and line number of Sass-generated CSS styles
# https://github.com/nex3/firesass
FIRESASS = false

# puts "\nre-creating examples/ dir ..."
system("make clean")
system("make")
system("rsync -avmq --include='*.js' --include='*.json' --include='*.gif' --include='*.png' --include='*.jpg' --filter 'hide,! */' src/examples/ examples/")

haml_files = Dir["src/**/*.haml"].collect { |s| { :src => s, :dest => s[/src\/(.+?)\.haml/, 1]} }
puts "processing #{haml_files.length} haml files ..."
haml_files.each do |p| 
  puts "source: #{p[:src]} ... destination: #{p[:dest]}"
  system("haml #{p[:src]} #{p[:dest]}")
end
# 
# sass_files = Dir["src/**/*.sass"].collect { |s| { :src => s, :dest => s[/src\/(.+?)\.sass/, 1] + '.css'} }
# puts "processing #{sass_files.length} sass files ...\n"
# sass_files.each { |p| system("sass #{p[:src]} #{p[:dest]}") }

guard 'haml', :output => 'examples', :input => 'src/examples', :all_on_start => true do
  watch %r{^.+(\.html\.haml)}
end

guard 'sass', :input => 'src/examples', :output => 'examples', :all_on_start => true

guard 'shell' do
  watch(%r{src\/(?!examples).+\.js$}) do
    puts "re-generating javascript libraries ..."
    system("make")
  end
  watch(%r{^(src/examples/.+)$}) do |match|
    unless match[0][/(\.haml)|(\.sass)$/]
      source_path = match[0]
      destination_path = source_path[/src\/(.+?)$/, 1]
      puts "cp -f #{source_path} #{destination_path}"
      `cp -f #{source_path} #{destination_path}`
    end
  end
  # callback(:start_begin) do
  #   copy_generated_javascript
  # end
end

# , :api_version => '1.6', :port => '35728'
guard 'livereload' do
  watch(%r{(examples/).+\.(css|js|html)})
end
