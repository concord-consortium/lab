#!/usr/bin/env ruby
require_relative 'setup.rb'
require 'grit'
require 'active_support/core_ext/string/output_safety'

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

VERSION_PATH = File.join(SERVER_PUBLIC_PATH, 'lab', 'lab.version.js')

def dirty?
  !system("git diff --exit-code --quiet")
end

def unpushed?
  !system("git diff --cached --exit-code --quiet")
end

repo = Grit::Repo.new(".")
head = repo.head
head_commit_sha = `git log -1 --pretty="%H"`.strip
commit = repo.commit(head_commit_sha)

short_message = "".html_safe + commit.short_message.gsub("\n", "\\n")
message = "".html_safe + commit.message.gsub("\n", "\\n")

version = <<HEREDOC
(function(){
if (typeof Lab === 'undefined') Lab = {};
Lab.version = {
  "repo": {
    "branch": "#{head.name if head != nil}",
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
    "dirty": #{dirty?}
  }
};

})();
HEREDOC

File.open(VERSION_PATH, 'w') { |f| f.write version }
