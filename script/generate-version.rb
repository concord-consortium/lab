#!/usr/bin/env ruby
require_relative 'setup.rb'
require 'grit'
require 'active_support/core_ext/string/output_safety'

VERSION_PATH = File.join(SERVER_PUBLIC_PATH, 'lab', 'lab.version.js')

def dirty?
  x = `git diff --cached --exit-code --quiet`
  y = `git diff --exit-code --quiet`
  (x + y).empty?
end

repo = Grit::Repo.new(".")
head = repo.head
head_commit_sha = `git log -1 --pretty="%H"`.strip
commit = repo.commit(head_commit_sha)

short_message = "".html_safe + commit.short_message.gsub("\n", "\\n")
message = "".html_safe + commit.message.gsub("\n", "\\n")

version = <<HEREDOC
(function(){

Lab.version = {
  "repo": {
    "branch": "#{head.name}",
    "commit": {
      "sha":           "#{commit.id}",
      "short_sha":      "#{commit.id[0..7]}",
      "url":            "https://github.com/concord-consortium/lab/commit/#{commit.id[0..7]}",
      "author":        "#{commit.author.name}",
      "email":         "#{commit.author.email}",
      "date":          "#{commit.committed_date}",
      "short_message": "#{short_message}",
      "message":       "#{message}"
    },
    "dirty": #{dirty?}
  }
};

})();
HEREDOC

File.open(VERSION_PATH, 'w') { |f| f.write version }
