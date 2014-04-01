ignore %r{(bin|node_modules)}

# FireSass allows Firebug to display the original Sass filename
# and line number of Sass-generated CSS styles
# https://github.com/nex3/firesass
FIRESASS = false

require "./script/setup.rb"

def command(cmd)
  puts cmd
  system(cmd)
end

ENV['LAB_DEVELOPMENT'] = "true"

command("make")

puts <<HEREDOC

ready ...

HEREDOC

def delete_css
  puts "re-generating all css resources ..."
  command("find public \! -path 'public/vendor*' -name '*.css' | xargs rm -f")
end

group :build do

  guard 'sass', :input => 'src/examples', :output => 'public/examples', :all_on_start => false, :load_paths => ['src']
  guard 'sass', :input => 'src/doc',      :output => 'public/doc',      :all_on_start => false, :load_paths => ['src']

  guard 'coffeescript', :input => 'src/examples', :output => 'public/examples', :all_on_start => false
  guard 'coffeescript', :input => 'src/doc',      :output => 'public/doc', :all_on_start => false

  guard 'haml',         :input => 'src', :output => 'public', :all_on_start => false do
    watch %r{^src.+(\.html\.haml)}
  end

  guard 'haml',         :input => 'test', :output => 'test', :all_on_start => false do
    watch %r{^test.+(\.html\.haml)}
  end

  guard 'shell' do

    watch(/(script\/(generate.*|setup.rb))|(config\/config\.yml)/) do |match|
      puts "re-generating version and config information ..."
      delete_css
      command("make")
    end

    watch(/(^src\/lab\/.+)|(^src\/modules\/.+)/) do |match|
      file = match[0]
      unless file =~ /(lab.config.js)|(lab.version.js)/
        puts "***" + file
        puts "re-generating javascript libraries and css resources for these libraries ..."
        command("make src")
      end
    end

    watch(/(^src\/helpers\/.+)/) do |match|
      file = match[0]
      case match[0]
      when /\/md2d\/mml-parser/
        if system("./node_modules/.bin/vows --isolate test/vows/mml-conversions/conversion-test.js")
          puts "*** mml conversion tests passed, mml conversions started ..."
          command("make convert-all-mml")
        else
          puts "*** error running mml conversion tests, mml conversions not started."
        end
      when /\/md2d\/(mw-batch-converter.+)|(post-batch-processor.+)/
        command("make convert-mml")
      else
        puts "***" + file
        puts "re-generating javascript libraries and css resources for these libraries ..."
        command("make src")
      end
    end

    watch(/^imports\/.+/) do |match|
      command("make public/imports")
    end

    watch(/^src\/(.+)(\.sass)|(\.scss)$/) do |match|
      path = match[1]
      puts path
      if path =~ /^sass\//
        delete_css
        command("make")
      else
        command("sass -I src -I public src/#{path}.sass public/#{path}.css")
      end
    end

    watch "src/readme.scss" do
      command("make")
    end

    # watch(/(^src\/doc\/.+)/) do |match|
    #   puts "running make because of change to src/doc file #{match[0]}"
    #   command("make")
    # end

    watch(/(^test\/vows\/.+\.js)$/) do |match|
      command("./node_modules/.bin/vows --isolate --no-color #{match[0]}")
    end

    watch(/^test\/vows\/mml-conversions\/(input-mml|expected-json)\/.+/) do
      command("./node_modules/.bin/vows --no-color test/vows/mml-conversions/conversion-test.js")
    end

    watch(/(^test\/mocha\/.+)/) do |match|
      command("./node_modules/.bin/mocha #{match[0]}")
    end

    watch(/(^src\/(?!sass).+)$/) do |match|
      unless match[0][/(\.haml)|(\.sass)|(\.scss)|(\.coffee)(\.yaml)|(^\..+)$/]
        puts match[0]
        source_path = match[0]
        destination_path = 'public/' + source_path[/src\/(.+?)$/, 1]
        destination_dir = destination_path[/(^.*)\//, 1]
        command("mkdir -p #{destination_dir}")
        command("cp -f #{source_path} #{destination_path}")
        command("ruby src/helpers/process-interactives.rb")
      end
    end

    watch(/^(src\/resources\/[^.].+)$/) do |match|
      source_path = match[0]
      destination_path = 'public/' + source_path[/src\/(.+?)$/, 1]
      command("cp -f #{source_path} #{destination_path}")
    end

    watch(/^src\/(experiments\/.+)$/) do |match|
      source_path = match[0]
      destination_path = "public/#{match[1]}"
      command("cp -f #{source_path} #{destination_path}")
    end
  end

  # , :api_version => '1.6', :port => '35728'
  unless ENV['LAB_USE_LIVE_RELOAD'] == 'NO' then
    guard 'livereload' do
      watch(/^(public\/).+\.(css|js|html|json)/)
    end
  end
end

group :test do

  guard 'shell' do

    watch(/(^src\/lab\/.+)|(^src\/modules\/.+)/) do |match|
      file = match[0]
      unless file =~ /(lab.config.js)|(lab.version.js)/
        command("make test-src")
      end
    end

    watch(/(^src\/helpers\/.+)/) do |match|
      file = match[0]
      case match[0]
      when /\/md2d\/mml-parser/
      when /\/md2d\/(mw-batch-converter.+)|(post-batch-processor.+)/
      else
        command("make test-src")
      end
    end

  end
end
