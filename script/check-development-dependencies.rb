#!/usr/bin/env ruby

require 'json'

@required_ruby_version = "2.0.0"
@minimum_ruby_patchlevel = 195
@recommended_ruby_patchlevel = 247
@minimum_node_version = "v0.10.0"

def macosx
  RUBY_PLATFORM.include?('darwin')
end

def linux
  RUBY_PLATFORM.include?('linux')
end

def ruby_check
  minimum = "= #{@required_ruby_version}-p#{@minimum_ruby_patchlevel}"
  recommended = "= #{@required_ruby_version}-p#{@recommended_ruby_patchlevel}"
  if RUBY_VERSION != @required_ruby_version && RUBY_PATCHLEVEL >= @minimum_ruby_patchlevel
    @errors["Ruby"] = {
      "requirement" => "#{minimum} to #{recommended}",
      "details" => <<-HEREDOC
  ==> Ruby #{RUBY_VERSION}-p#{RUBY_PATCHLEVEL} installed
      HEREDOC
    }
  end
  if RUBY_VERSION != @required_ruby_version && RUBY_PATCHLEVEL == @recommended_ruby_patchlevel
    @recommendations["Ruby"] = {
      "suggest" => recommended,
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
    @errors["nodejs"] = {
      "requirement" => requirement,
      "details" => <<-HEREDOC
  ==> nodejs not installed ...
      HEREDOC
    }
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

@errors = {}
@recommendations = {}

ruby_check
nodejs_check
xcode_check if macosx

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

unless @recommendations.empty?
  puts <<-HEREDOC

*** Recommendation: recommended development dependencies:

  HEREDOC
  @recommendations.each { |k, v|
    puts <<-HEREDOC
#{k} #{v["suggest"]}

#{v["details"]}
    HEREDOC
  }
end
