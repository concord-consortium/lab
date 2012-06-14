require 'fileutils'
require 'yaml'

PROJECT_ROOT = File.expand_path('../..',  __FILE__) if !defined? PROJECT_ROOT
CONFIG_PATH  = File.join(PROJECT_ROOT, 'config')    if !defined? CONFIG_PATH
SCRIPT_PATH = File.join(PROJECT_ROOT, 'script')     if !defined? SCRIPT_PATH

begin
  CONFIG = YAML.load_file(File.join(CONFIG_PATH, 'config.yml'))
rescue Errno::ENOENT
  msg = <<-HEREDOC

*** missing config/config.yml

    cp config/config_sample.yml config/config.yml

    and edit appropriately ...

  HEREDOC
  raise msg
end
