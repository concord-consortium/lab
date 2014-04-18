#!/usr/bin/env ruby

PROJECT_ROOT = File.expand_path('../..',  __FILE__)   if !defined? PROJECT_ROOT
# Used by script/generate-js-version.rb:
SRC_LAB_PATH  = File.join(PROJECT_ROOT, 'src', 'lab') if !defined? SRC_LAB_PATH
# Used by config.ru:
PUBLIC_PATH  = File.join(PROJECT_ROOT, 'public')      if !defined? PUBLIC_PATH

# Config based on environment variables.
CONFIG = {
  environment: ENV['LAB_ENV'] || 'production', # Used by config.ru and here.
  ga_account_id: ENV['GA_ACCOUNT_ID']          # Used onlu here.
}

# Used by embeddable.html.haml:
if CONFIG[:ga_account_id]
  ANALYTICS = <<-HEREDOC
  <script type="text/javascript">
    var _gaq = _gaq || [];
    _gaq.push(['_setAccount', '#{CONFIG[:ga_account_id]}']);
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

LAB_JS_DEPENDENCIES = case CONFIG[:environment]
when 'development'
  <<-HEREDOC
<script src="lab/vendor/d3/d3.js" type="text/javascript"></script>
<script src="lab/vendor/jquery/jquery.js" type="text/javascript"></script>
<script src="lab/vendor/jquery-ui/jquery-ui.js" type="text/javascript"></script>
<script src="lab/vendor/jquery-ui-touch-punch/jquery.ui.touch-punch.js" type="text/javascript"></script>
<script src="lab/vendor/jquery-context-menu/jquery.contextMenu.js" type="text/javascript"></script>
<script src="lab/vendor/jquery-selectBoxIt/jquery.selectBoxIt.js" type="text/javascript"></script>
<script src='lab/vendor/tinysort/jquery.tinysort.js' type='text/javascript'></script>
  HEREDOC
else
  <<-HEREDOC
<script src="lab/vendor/d3/d3.min.js" type="text/javascript"></script>
<script src="lab/vendor/jquery/jquery.min.js" type="text/javascript"></script>
<script src="lab/vendor/jquery-ui/jquery-ui.min.js" type="text/javascript"></script>
<script src="lab/vendor/jquery-ui-touch-punch/jquery.ui.touch-punch.min.js" type="text/javascript"></script>
<script src="lab/vendor/jquery-context-menu/jquery.contextMenu.js" type="text/javascript"></script>
<script src="lab/vendor/jquery-selectBoxIt/jquery.selectBoxIt.min.js" type="text/javascript"></script>
<script src='lab/vendor/tinysort/jquery.tinysort.min.js' type='text/javascript'></script>
  HEREDOC
end

LAB_JS = case CONFIG[:environment]
when 'development'
  <<-HEREDOC
<script src='lab/lab.js'></script>
  HEREDOC
else
  <<-HEREDOC
<script src='lab/lab.min.js'></script>
  HEREDOC
end
