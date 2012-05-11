#!/bin/sh
if git diff --exit-code --quiet && git diff --cached --exit-code --quiet
then
  cd dist
  git fetch
  git reset --hard origin/gh-pages
  cd ..; make clean; make
  cd dist; git add .
  git commit -m "gh-pages generated from `git --git-dir ../.git log -1 --format=%H`"
  git push
  cd ..
else
  echo "\n*** please commit or stash changes in your working dir first\n"
  git status
fi
