#!/usr/bin/env ruby
require_relative 'setup.rb'

JS_CONFIG_PATH = File.join(SERVER_PUBLIC_PATH, 'lab', 'lab.config.js')

config = <<HEREDOC
(function(){
  if (typeof Lab === 'undefined') Lab = {};
  Lab.config = {
    "sharing": true
  }
})();
HEREDOC

File.open(JS_CONFIG_PATH, 'w') { |f| f.write config }
