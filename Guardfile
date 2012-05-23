ignore_paths 'bin', 'examples', 'lab', 'node_modules'

# FireSass allows Firebug to display the original Sass filename
# and line number of Sass-generated CSS styles
# https://github.com/nex3/firesass
FIRESASS = false

system("make")
puts <<HEREDOC

ready ...

HEREDOC

def command(cmd)
  puts cmd
  system(cmd)
end

require './src/sass/bourbon/lib/bourbon.rb'

guard 'sass',         :input => 'src/examples', :output => 'dist/examples', :all_on_start => false
guard 'sass',         :input => 'src/doc',      :output => 'dist/doc',      :all_on_start => false

guard 'coffeescript', :input => 'src/examples', :output => 'dist/examples', :all_on_start => false

guard 'haml',         :input => 'src', :output => 'dist', :all_on_start => false do
  watch %r{^src.+(\.html\.haml)}
end

guard 'haml',         :input => 'test', :output => 'test', :all_on_start => false do
  watch %r{^test.+(\.html\.haml)}
end

guard 'shell' do
  watch(/(^src\/lab\/.+)|(^src\/md-engine\/.+)|(^src\/mw-helpers\/.+)/) do |match|
    puts match[0]
    puts "re-generating javascript libraries and css resources for these libraries ..."
    command("make")
    command("make test")
  end

  watch(/^imports\/.+/) do |match|
    command("make dist/imports")
  end

  watch(/(^src\/sass\/.+)/) do |match|
    puts match[0]
    puts "re-generating all css resources because sass mixin updated ..."
    command("find dist \! -path 'dist/vendor*' -name '*.css' | xargs rm -f")
    command("make")
  end

  watch "src/index.sass" do
    command("bin/sass -I src -r ./src/sass/bourbon/lib/bourbon.rb src/index.sass dist/index.css")
  end

  watch "src/readme.scss" do
    command("make")
  end

  watch(/^test\/.+\.js$/) do
    system("make test")
  end

  watch(/(^src\/examples\/[^.].+)$/) do |match|
    unless match[0][/(\.haml)|(\.sass)|(\.coffee)|(^\..+)$/]
      source_path = match[0]
      destination_path = 'dist/' + source_path[/src\/(.+?)$/, 1]
      command("cp -f #{source_path} #{destination_path}")
    end
  end

  watch(/^(src\/resources\/[^.].+)$/) do |match|
    source_path = match[0]
    destination_path = 'dist/' + source_path[/src\/(.+?)$/, 1]
    command("cp -f #{source_path} #{destination_path}")
  end

  watch(/^src\/(experiments\/.+)$/) do |match|
    source_path = match[0]
    destination_path = "dist/#{match[1]}"
    command("cp -f #{source_path} #{destination_path}")
  end
end

# , :api_version => '1.6', :port => '35728'
guard 'livereload' do
  watch(/^(dist\/).+\.(css|js|html)/)
end

guard 'markdown', :kram_ops => { :toc_levels => [2,3,4,5] } do
  watch "readme.md" do |m|
    "readme.md|dist/readme.html|src/layouts/readme.html.erb"
  end
  watch "license.md" do |m|
    "license.md|dist/license.html|src/layouts/license.html.erb"
  end
end
