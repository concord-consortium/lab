#!/usr/bin/env ruby
require 'fileutils'
require 'yaml'

PROJECT_ROOT = File.expand_path('../..',  __FILE__)                if !defined? PROJECT_ROOT
SRC_PATH  = File.join(PROJECT_ROOT, 'src')                         if !defined? SRC_PATH
SRC_LAB_PATH  = File.join(PROJECT_ROOT, 'src', 'lab')              if !defined? SRC_LAB_PATH
CONFIG_PATH  = File.join(PROJECT_ROOT, 'config')                   if !defined? CONFIG_PATH
SCRIPT_PATH = File.join(PROJECT_ROOT, 'script')                    if !defined? SCRIPT_PATH
BIN_PATH  = File.join(PROJECT_ROOT, 'bin')                         if !defined? BIN_PATH
SERVER_PUBLIC_PATH  = File.join(PROJECT_ROOT, 'server', 'public')  if !defined? SERVER_PUBLIC_PATH

begin
  CONFIG = YAML.load_file(File.join(CONFIG_PATH, 'config.yml'))
rescue Errno::ENOENT
  msg = <<-HEREDOC

*** missing config/config.yml

    cp config/config.sample.yml config/config.yml

    and edit appropriately ...

  HEREDOC
  raise msg
end

# setup partial for Google Analytics
if CONFIG[:google_analytics] && CONFIG[:google_analytics][:account_id]
  ANALYTICS = <<-HEREDOC
  <script type="text/javascript">
    // make an array out of the URL's hashtag string, splitting the string at every ampersand
    var my_hashtag_array = location.hash.split('&');

    // grab the first value of the array (assuming that's the value that indicates which interactive is being viewed)
    var my_hashtag = my_hashtag_array[0];

    var _gaq = _gaq || [];
    _gaq.push(['_setAccount', '#{CONFIG[:google_analytics][:account_id]}']);
    _gaq.push(['_setAllowAnchor', true]);
    _gaq.push(['_trackPageview', location.pathname + my_hashtag]);
    (function() {
    var ga = document.createElement('script'); ga.type = 'text/javascript'; ga.async = true;
    ga.src = ('https:' == document.location.protocol ? 'https://ssl' : 'http://www') + '.google-analytics.com/ga.js';
    var s = document.getElementsByTagName('script')[0]; s.parentNode.insertBefore(ga, s);
  })();
  </script>
  HEREDOC
else
  ANALYTICS = ""
end

# setup partial for fontface
if CONFIG[:jsconfig] && CONFIG[:jsconfig][:fontface]
  FONTFACE = CONFIG[:jsconfig][:fontface]
else
  FONTFACE = 'Open Sans'
end

FONTFACE_LINK = case @fontface
when "Lato"
  <<-HEREDOC
<link href='http://fonts.googleapis.com/css?family=Lato:300italic,700italic,300,400,400italic,700' rel='stylesheet' type='text/css'>
  HEREDOC
else          # default is "Open Sans"
  <<-HEREDOC
<link href='http://fonts.googleapis.com/css?family=Open+Sans:400italic,700italic,300italic,400,300,700&amp;subset=latin,greek,latin-ext' rel='stylesheet' type='text/css'>
  HEREDOC
end
