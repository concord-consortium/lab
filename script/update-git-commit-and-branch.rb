#!/usr/bin/env ruby
require_relative 'setup.rb'
require 'grit'

# If current git commit is different that that saved in ./src/lab/git-commit
# then update ./src/lab/git-commit
#
# If current git branch-name is different that that saved in ./src/lab/git-branch-name
# then update ./src/lab/git-branch-name
#
# These files are ignored by git ... but when are used as Makefile prerequisites
# for ./src/lab/lab.version.js

repo = Grit::Repo.new(".")
head = repo.head
head_commit_sha = `git log -1 --pretty="%H"`.strip
commit = repo.commit(head_commit_sha)

branch_name = head.name if head != nil

def dirty?
  !system("git diff --exit-code --quiet")
end

LAST_GIT_COMMIT_PATH = File.join(SRC_LAB_PATH, 'git-commit')
LAST_GIT_DIRTY_PATH = File.join(SRC_LAB_PATH, 'git-dirty')
LAST_GIT_BRANCH_NAME_PATH = File.join(SRC_LAB_PATH, 'git-branch-name')

begin
  last_git_commit = File.read(LAST_GIT_COMMIT_PATH)
rescue Errno::ENOENT
  last_git_commit = nil
end


begin
  last_git_dirty = File.read(LAST_GIT_DIRTY_PATH)
rescue Errno::ENOENT
  last_git_dirty = false
end

begin
  last_git_branch_name = File.read(LAST_GIT_BRANCH_NAME_PATH)
rescue Errno::ENOENT
  last_git_branch_name = nil
end

if last_git_commit != commit.id
  File.open(LAST_GIT_COMMIT_PATH, 'w') { |f| f.write commit.id }
end

if last_git_dirty != dirty?.to_s
  File.open(LAST_GIT_DIRTY_PATH, 'w') { |f| f.write dirty?.to_s }
end

if last_git_branch_name != branch_name
  File.open(LAST_GIT_BRANCH_NAME_PATH, 'w') { |f| f.write branch_name }
end
