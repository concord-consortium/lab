#!/usr/bin/env ruby
require_relative 'setup.rb'
require 'grit'

VERSION_PATH = File.join(SERVER_PUBLIC_PATH, 'lab', 'lab.version.js')

repo = Grit::Repo.new(".")
head = repo.head
commit = repo.commits.first

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
      "short_message": "#{commit.short_message}",
      "message":       "#{commit.message}"
    }
  }
};

})();
HEREDOC

File.open(VERSION_PATH, 'w') { |f| f.write version }
