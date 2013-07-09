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
if CONFIG[:google_analytics] && CONFIG[:google_analytics][:account_id]
  ANALYTICS = <<-HEREDOC
  <script type="text/javascript">
    var _gaq = _gaq || [];
    _gaq.push(['_setAccount', '#{CONFIG[:google_analytics][:account_id]}']);
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

if @mocha_phantomjs
  MOCHA_PHANTOMJS_HEAD = "  <link href='test/mocha.css' rel='stylesheet'>"
  MOCHA_PHANTOMJS_BODY = <<-HEREDOC
    <div id='mocha'></div>
    <script src='test/mocha.js'></script>
    <script src='test/chai.js'></script>
    <script>
      mocha.ui('bdd');
      mocha.reporter('html');
      expect = chai.expect;
    </script>
    <script>
      if (window.mochaPhantomJS) { mochaPhantomJS.run(); }
      else { mocha.run(); }
    </script>
  HEREDOC
else
  MOCHA_PHANTOMJS_HEAD = ""
  MOCHA_PHANTOMJS_BODY = ""
end

# setup partial for fontface
if CONFIG[:jsconfig] && CONFIG[:jsconfig][:fontface]
  FONTFACE = CONFIG[:jsconfig][:fontface]
else
  FONTFACE = 'Open Sans'
end

FONTFACE_LINK = case FONTFACE
when "Lato"
  <<-HEREDOC
<link href='http://fonts.googleapis.com/css?family=Lato:300italic,700italic,300,400,400italic,700' rel='stylesheet' type='text/css'>
  HEREDOC
else          # default is "Open Sans"
  <<-HEREDOC
<link href='http://fonts.googleapis.com/css?family=Open+Sans:400italic,700italic,300italic,400,300,700&amp;subset=latin,greek,latin-ext' rel='stylesheet' type='text/css'>
  HEREDOC
end

# setup partials for 'production' (minimized resources) or 'development'

LAB_JS_DEPENDENCIES = case CONFIG[:environment]
when 'production'
  <<-HEREDOC
<script src="vendor/d3/d3.min.js" type="text/javascript"></script>
<script src="vendor/jquery/jquery.min.js" type="text/javascript"></script>
<script src="vendor/jquery-ui/jquery-ui.min.js" type="text/javascript"></script>
<script src="vendor/jquery-ui-touch-punch/jquery.ui.touch-punch.min.js" type="text/javascript"></script>
<script src="vendor/jquery-context-menu/jquery.contextMenu.js" type="text/javascript"></script>
<script src="vendor/jquery-selectBoxIt/jquery.selectBoxIt.min.js" type="text/javascript"></script>
  HEREDOC
else
  <<-HEREDOC
<script src="vendor/d3/d3.js" type="text/javascript"></script>
<script src="vendor/jquery/jquery.min.js" type="text/javascript"></script>
<script src="vendor/jquery-ui/jquery-ui.min.js" type="text/javascript"></script>
<script src="vendor/jquery-ui-touch-punch/jquery.ui.touch-punch.min.js" type="text/javascript"></script>
<script src="vendor/jquery-context-menu/jquery.contextMenu.js" type="text/javascript"></script>
<script src="vendor/jquery-selectBoxIt/jquery.selectBoxIt.min.js" type="text/javascript"></script>
  HEREDOC
end

LAB_JS_ADDITIONAL_DEPENDENCIES = case CONFIG[:environment]
when 'production'
  <<-HEREDOC
<script src='vendor/tinysort/jquery.tinysort.min.js' type='text/javascript'></script>
<script src='vendor/codemirror/lib/codemirror.js' type='text/javascript'></script>
<script src='vendor/codemirror/mode/javascript/javascript.js' type='text/javascript'></script>
<script src='vendor/codemirror/addon/fold/foldcode.js' type='text/javascript'></script>
<script src='vendor/codemirror/addon/fold/collapserange.js' type='text/javascript'></script>
<script src='vendor/codemirror/addon/format/formatting.js' type='text/javascript'></script>
<script src='vendor/codemirror/addon/edit/matchbrackets.js' type='text/javascript'></script>
<script src='vendor/codemirror/addon/edit/closebrackets.js' type='text/javascript'></script>
  HEREDOC
else
  <<-HEREDOC
<script src='vendor/tinysort/jquery.tinysort.js' type='text/javascript'></script>
<script src='vendor/codemirror/lib/codemirror.js' type='text/javascript'></script>
<script src='vendor/codemirror/mode/javascript/javascript.js' type='text/javascript'></script>
<script src='vendor/codemirror/addon/fold/foldcode.js' type='text/javascript'></script>
<script src='vendor/codemirror/addon/fold/collapserange.js' type='text/javascript'></script>
<script src='vendor/codemirror/addon/format/formatting.js' type='text/javascript'></script>
<script src='vendor/codemirror/addon/edit/matchbrackets.js' type='text/javascript'></script>
<script src='vendor/codemirror/addon/edit/closebrackets.js' type='text/javascript'></script>
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