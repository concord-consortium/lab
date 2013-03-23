#!/bin/sh
if [ ! -d server/public/.git ]
then
cat <<heredoc

*** dir server/public not yet a separate git repository

    please setup the server/public as a separate git checkout tracking the gh-pages branch first
    see: http://lab.dev.concord.org/readme.html#making-the-serverpublic-folder-track-the-gh-pages-branch

heredoc
exit
fi
if git diff --exit-code --quiet && git diff --cached --exit-code --quiet
then
cd server/public
git fetch
git reset --hard origin/gh-pages
cd ../..; make clean; make; cd server/public
git add .
git commit -am "gh-pages generated from `git --git-dir ../../.git log -1 --format=%H`"
git push origin gh-pages
cd ../..
else
cat <<heredoc

*** uncommitted changes in your working directory

    please commit or stash changes in your working dir before updating the gh-pages branch

heredoc
git status
fi
