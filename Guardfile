ignore_paths 'bin', 'examples', 'lib', 'node_modules'

# FireSass allows Firebug to display the original Sass filename 
# and line number of Sass-generated CSS styles
# https://github.com/nex3/firesass
FIRESASS = false

guard 'shell' do
  watch(%r{^src/grapher/.+$}) do
    `make`
    `cp grapher.js examples/lib`
  end
  watch(%r{^(src/examples/.+.haml)$}) do |match|
    source_path = match[0]
    destination_path = source_path[/src\/(.+?)\.haml/, 1]
    `haml #{source_path} #{destination_path}`
  end
  watch(%r{^(src/examples/.+.sass)$}) do |match|
    source_path = match[0]
    destination_path = source_path[/src\/(.+?\.)sass/, 1] + 'css'
    if FIRESASS
      `sass --debug-info #{source_path} #{destination_path}`
    else
      `sass #{source_path} #{destination_path}`
    end
  end
  watch(%r{^(src/examples/.+)$}) do |match|
    unless match[0][/(\.haml)|(\.sass)$/]
      source_path = match[0]
      destination_path = source_path[/src\/(.+?)$/, 1]
      puts "cp -f #{source_path} #{destination_path}"
      `cp -f #{source_path} #{destination_path}`
    end
  end
  callback(:start_begin) do
    `make`
  end
end

# , :api_version => '1.6', :port => '35728'
guard 'livereload' do
  watch(%r{(examples/).+\.(css|js|html)})
end

