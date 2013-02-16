#!/usr/bin/env ruby

require 'json'

@required_ruby_version = "1.9.3"
@required_ruby_patchlevel = 385
@minimum_node_version = "v0.8.6"
@minimum_couchdb_version = "1.2.0"

def macosx
  RUBY_PLATFORM.include?('darwin')
end

def linux
  RUBY_PLATFORM.include?('linux')
end

def ruby_check
  requirement = "= #{@required_ruby_version}-p#{@required_ruby_patchlevel}"
  if RUBY_VERSION != @required_ruby_version || RUBY_PATCHLEVEL != @required_ruby_patchlevel
    @errors["Ruby"] = {
      "requirement" => requirement,
      "details" => <<-HEREDOC
  ==> Ruby #{RUBY_VERSION}-p#{RUBY_PATCHLEVEL} installed
      HEREDOC
    }
  end
end

def nodejs_check
  # Check for nodejs
  requirement = ">= #{@minimum_node_version}"
  begin
    node_version = `node --version`.strip
    # Convert version strings to array of integers.
    node_version_arr = node_version.split('.').map { |e| e.to_i }
    minimum_node_version_arr = @minimum_node_version.split('.').map { |e| e.to_i }
    # Compare version numbers one by one using array comparison operator.
    unless (node_version_arr <=> minimum_node_version_arr) >= 0
      @errors["Nodejs"] = {
        "requirement" => requirement,
        "details" => <<-HEREDOC
  ==> nodejs #{node_version} installed
        HEREDOC
      }
    end
  rescue Errno::ENOENT
    @notifications["nodejs"] = {
      "requirement" => requirement,
      "details" => <<-HEREDOC
  ==> nodejs not installed ...
      HEREDOC
    }
  end
end

def couchdb_check
  # Check for couchdb
  requirement = ">= #{@minimum_couchdb_version}"
  response = `curl http://localhost:5984 2> /dev/null`
  # => {"couchdb":"Welcome","version":"1.2.0"}
  if response.empty?
    @warnings["Couchdb"] = {
      "requirement" => requirement,
      "details" => <<-HEREDOC
  ==> couchdb not installed or not running, web server persistence won't work ...
      HEREDOC
    }
  else
    couch = JSON.parse(response)
    couch_version = couch["version"]
    if couch_version < @minimum_couchdb_version
      @warnings["Couchdb"] = {
        "requirement" => requirement,
        "details" => <<-HEREDOC
  ==> couchdb #{couch_version} installed, web server persistence might not work
        HEREDOC
      }
        
    end
  end
end

def xcode_check
  if macosx
    requirement = "Xcode"
    xcode = `xcode-select -print-path  2> /dev/null`
    if xcode.empty?
      @errors["Mac OS X"] = {
        "requirement" => requirement,
        "details" => <<-HEREDOC
  ==> Either you don't have xcode installed ... or you haven't used
      xcode-path to set the location of xcode for command-line tools.
        HEREDOC
      }
    end
  end
end

@warnings = {}      
@errors = {}
ruby_check
nodejs_check
couchdb_check
xcode_check if macosx

unless @warnings.empty?
  puts <<-HEREDOC

*** Warning: missing optional development dependencies:

  HEREDOC
  @warnings.each { |k, v|
    puts <<-HEREDOC
#{k} #{v["requirement"]}
    
#{v["details"]}
    HEREDOC
  }
  exit 1
end

unless @errors.empty?
  puts <<-HEREDOC

*** Error: missing development dependencies, building Lab project requires:

  HEREDOC
  @errors.each { |k, v|
    puts <<-HEREDOC
#{k} #{v["requirement"]}
    
#{v["details"]}
    HEREDOC
  }
  exit 1
end
