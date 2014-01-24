#!/usr/bin/env ruby
require_relative 'setup.rb'
require 'grit'
require "erb"

ENCODING_OPTIONS = {
    :invalid           => :replace,  # Replace invalid byte sequences
    :undef             => :replace,  # Replace anything not defined in ASCII
    :replace           => ''        # Use a blank for those replacements
    # :universal_newline => true doesn't work in Ruby 1.9.3-p194
}

def cleanup_string(str)
  clean = str.encode Encoding.find('ASCII'), ENCODING_OPTIONS
  clean.gsub("\r", "\\n")
end

JS_VERSION_PATH = File.join(SRC_LAB_PATH, 'lab.version.js')

def dirty?
  !system("git diff --exit-code --quiet")
end

def unpushed?
  !system("git diff --cached --exit-code --quiet")
end

# get the latest (nearest) tagged version see: http://bit.ly/1aORIhz
def last_tagged_version
  %x[git describe --tags --abbrev=0].chomp
end

repo = Grit::Repo.new(".")
head = repo.head
head_commit_sha = `git log -1 --pretty="%H"`.strip
commit = repo.commit(head_commit_sha)

branch_name = head.name if head != nil

short_message = ERB::Util.html_escape(commit.short_message.gsub("\n", "\\n"))
message = ERB::Util.html_escape(commit.message.gsub("\n", "\\n"))

version = <<HEREDOC
// this file is generated during build process by: ./script/generate-js-version.rb
define(function (require) {
  return {
    "repo": {
      "branch": "#{branch_name}",
      "commit": {
        "sha":           "#{commit.id}",
        "short_sha":      "#{commit.id[0..7]}",
        "url":            "https://github.com/concord-consortium/lab/commit/#{commit.id[0..7]}",
        "author":        "#{commit.author.name}",
        "email":         "#{commit.author.email}",
        "date":          "#{commit.committed_date}",
        "short_message": "#{short_message}",
        "message":       "#{cleanup_string(message)}"
      },
      "last_tag":        "#{last_tagged_version}",
      "dirty": #{dirty?}
    }
  };
});
HEREDOC
File.open(JS_VERSION_PATH, 'w') { |f| f.write version }
