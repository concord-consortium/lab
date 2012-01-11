ignore_paths 'bin', 'examples', 'lib', 'node_modules'

# FireSass allows Firebug to display the original Sass filename 
# and line number of Sass-generated CSS styles
# https://github.com/nex3/firesass
FIRESASS = false

system("make")
puts <<HEREDOC

ready ...

HEREDOC

guard 'haml', :output => 'examples', :input => 'src/examples', :all_on_start => false do
  watch %r{^.+(\.html\.haml)}
end

guard 'sass', :input => 'src/examples', :output => 'examples', :all_on_start => false

guard 'shell' do
  watch(%r{src\/(?!examples).+\.js$}) do
    puts "re-generating javascript libraries ..."
    system("make")
  end
  watch(%r{^(src/examples/.+)$}) do |match|
    unless match[0][/(\.haml)|(\.sass)|(^\..+)$/]
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
