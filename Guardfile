ignore %r{(bin|node_modules)}

# FireSass allows Firebug to display the original Sass filename
# and line number of Sass-generated CSS styles
# https://github.com/nex3/firesass
FIRESASS = false

require "./script/setup.rb"
require './src/sass/bourbon/lib/bourbon.rb'

def command(cmd)
  puts cmd
  system(cmd)
end

command("make")
puts <<HEREDOC

ready ...

HEREDOC

guard 'sass', :input => 'src/examples', :output => 'server/public/examples', :all_on_start => false, :load_paths => ['src']
guard 'sass', :input => 'src/doc',      :output => 'server/public/doc',      :all_on_start => false, :load_paths => ['src']

guard 'coffeescript', :input => 'src/examples', :output => 'server/public/examples', :all_on_start => false
guard 'coffeescript', :input => 'src/doc',      :output => 'server/public/doc', :all_on_start => false

guard 'haml',         :input => 'src', :output => 'server/public', :all_on_start => false do
  watch %r{^src.+(\.html\.haml)}
end

guard 'haml',         :input => 'test', :output => 'test', :all_on_start => false do
  watch %r{^test.+(\.html\.haml)}
end

guard 'shell' do

  watch(/(script\/generate.*)|(config\/config\.yml)/) do |match|
    puts "re-generating version and config information ..."
    command("make src")
  end

  watch(/(^src\/lab\/.+)|(^src\/modules\/.+)/) do |match|
    file = match[0]
    unless file =~ /(lab.config.js)|(lab.version.js)/
      puts "***" + file
      puts "re-generating javascript libraries and css resources for these libraries ..."
      command("make src")
      command("make test-src")
    end
  end

  watch(/(^src\/helpers\/.+)/) do |match|
    file = match[0]
    case match[0]
    when /\/md2d\/mml-parser/
      if system("./node_modules/.bin/vows --isolate test/vows/mml-conversions/conversion-test.js")
        puts "*** mml conversion tests passed, mml conversions started ..."
        command("make convert-mml")
      else
        puts "*** error running mml conversion tests, mml conversions not started."
      end
    when /\/md2d\/(mw-batch-converter.+)|(post-batch-processor.+)/
      command("make convert-mml")
    else
      puts "***" + file
      puts "re-generating javascript libraries and css resources for these libraries ..."
      command("make src")
      command("make test-src")
    end
  end

  watch(/^imports\/.+/) do |match|
    command("make server/public/imports")
  end

  watch(/(^src\/sass\/.+)/) do |match|
    puts match[0]
    puts "re-generating all css resources because sass mixin updated ..."
    command("find server/public \! -path 'server/public/vendor*' -name '*.css' | xargs rm -f")
    command("make")
  end

  watch "src/index.sass" do
    command("bin/sass -I src -r ./src/sass/bourbon/lib/bourbon.rb src/index.sass server/public/index.css")
  end

  watch "src/readme.scss" do
    command("make")
  end

  watch(/(^test\/vows\/.+\.js)$/) do |match|
    command("./node_modules/.bin/vows --isolate --no-color #{match[0]}")
  end

  watch(/^test\/vows\/mml-conversions\/(input-mml|expected-json)\/.+/) do
    command("./node_modules/.bin/vows --no-color test/vows/mml-conversions/conversion-test.js")
  end

  watch(/(^test\/mocha\/.+)/) do |match|
    command("./node_modules/.bin/mocha #{match[0]}")
  end

  watch(/(^src\/examples\/[^.].+)$/) do |match|
    unless match[0][/(\.haml)|(\.sass)|(\.scss)|(\.coffee)(\.yaml)|(^\..+)$/]
      source_path = match[0]
      destination_path = 'server/public/' + source_path[/src\/(.+?)$/, 1]
      command("cp -f #{source_path} #{destination_path}")
      command("ruby src/helpers/examples/interactives/process-interactives.rb")
    end
  end

  watch(/^(src\/resources\/[^.].+)$/) do |match|
    source_path = match[0]
    destination_path = 'server/public/' + source_path[/src\/(.+?)$/, 1]
    command("cp -f #{source_path} #{destination_path}")
  end

  watch(/^src\/(experiments\/.+)$/) do |match|
    source_path = match[0]
    destination_path = "server/public/#{match[1]}"
    command("cp -f #{source_path} #{destination_path}")
  end
end

# , :api_version => '1.6', :port => '35728'
guard 'livereload' do
  watch(/^(server\/public\/).+\.(css|js|html)/)
end

guard 'markdown', :kram_ops => { :toc_levels => [2,3,4,5] } do
  watch "readme.md" do |m|
    "readme.md|server/public/readme.html|src/layouts/readme.html.erb"
  end
  watch "license.md" do |m|
    "license.md|server/public/license.html|src/layouts/license.html.erb"
  end
end
