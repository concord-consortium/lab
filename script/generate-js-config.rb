#!/usr/bin/env ruby
require_relative 'setup.rb'
require 'json'

JS_CONFIG_PATH = File.join(SERVER_PUBLIC_PATH, 'lab', 'lab.config.js')

# default jsconfig "sharing" is true
if CONFIG[:jsconfig] == nil || CONFIG[:jsconfig][:sharing] == nil
  CONFIG[:jsconfig] = { :sharing => true }
end

jsconfig = <<HEREDOC
(function(){
if (typeof Lab === 'undefined') Lab = {};
Lab.config = #{JSON.pretty_generate(CONFIG[:jsconfig])}
})();
HEREDOC

File.open(JS_CONFIG_PATH, 'w') { |f| f.write jsconfig }

