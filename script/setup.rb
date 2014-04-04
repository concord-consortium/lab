#!/usr/bin/env ruby
require 'fileutils'
require 'yaml'
require 'optparse'

PROJECT_ROOT = File.expand_path('../..',  __FILE__)                if !defined? PROJECT_ROOT
SRC_PATH  = File.join(PROJECT_ROOT, 'src')                         if !defined? SRC_PATH
SRC_LAB_PATH  = File.join(PROJECT_ROOT, 'src', 'lab')              if !defined? SRC_LAB_PATH
CONFIG_PATH  = File.join(PROJECT_ROOT, 'config')                   if !defined? CONFIG_PATH
SCRIPT_PATH = File.join(PROJECT_ROOT, 'script')                    if !defined? SCRIPT_PATH
BIN_PATH  = File.join(PROJECT_ROOT, 'bin')                         if !defined? BIN_PATH
PUBLIC_PATH  = File.join(PROJECT_ROOT, 'public')                   if !defined? PUBLIC_PATH

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
if ENV['GA_ACCOUNT_ID'] || (CONFIG[:google_analytics] && CONFIG[:google_analytics][:account_id])
  account_id = ENV['GA_ACCOUNT_ID'] || CONFIG[:google_analytics][:account_id]
  ANALYTICS = <<-HEREDOC
  <script type="text/javascript">
    var _gaq = _gaq || [];
    _gaq.push(['_setAccount', '#{account_id}']);
    _gaq.push(['_setAllowAnchor', true]);
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

# setup partials for 'production' (minimized resources) or 'development'

LAB_JS_DEPENDENCIES = case CONFIG[:environment]
when 'production'
  <<-HEREDOC
<script src="lab/vendor/d3/d3.min.js" type="text/javascript"></script>
<script src="lab/vendor/jquery/jquery.min.js" type="text/javascript"></script>
<script src="lab/vendor/jquery-ui/jquery-ui.min.js" type="text/javascript"></script>
<script src="lab/vendor/jquery-ui-touch-punch/jquery.ui.touch-punch.min.js" type="text/javascript"></script>
<script src="lab/vendor/jquery-context-menu/jquery.contextMenu.js" type="text/javascript"></script>
<script src="lab/vendor/jquery-selectBoxIt/jquery.selectBoxIt.min.js" type="text/javascript"></script>
<script src='lab/vendor/tinysort/jquery.tinysort.min.js' type='text/javascript'></script>
  HEREDOC
else
  <<-HEREDOC
<script src="lab/vendor/d3/d3.js" type="text/javascript"></script>
<script src="lab/vendor/jquery/jquery.js" type="text/javascript"></script>
<script src="lab/vendor/jquery-ui/jquery-ui.js" type="text/javascript"></script>
<script src="lab/vendor/jquery-ui-touch-punch/jquery.ui.touch-punch.js" type="text/javascript"></script>
<script src="lab/vendor/jquery-context-menu/jquery.contextMenu.js" type="text/javascript"></script>
<script src="lab/vendor/jquery-selectBoxIt/jquery.selectBoxIt.js" type="text/javascript"></script>
<script src='lab/vendor/tinysort/jquery.tinysort.js' type='text/javascript'></script>
  HEREDOC
end

LAB_JS = case CONFIG[:environment]
when 'production'
  <<-HEREDOC
<script src='lab/lab.min.js'></script>
  HEREDOC
else
  <<-HEREDOC
<script src='lab/lab.js'></script>
  HEREDOC
end

if ENV['LAB_DISABLE_MODEL_LIST']
  LAB_MODEL_LIST = ''
else
  LAB_MODEL_LIST = "<script src='imports/legacy-mw-content/model-list.js' type='text/javascript'></script>"
end
