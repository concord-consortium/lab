#!/bin/sh
if [ ! -d server/public/.git ]
then
cat <<heredoc

*** dir: server/public not yet setup as a separate gh-pages tracking branch

    Please setup the server/public as a separate git checkout tracking the gh-pages branch first.
    See: http://lab.dev.concord.org/readme.html#making-the-serverpublic-folder-track-the-gh-pages-branch

heredoc
exit
fi
if ps aux | grep -v grep | grep 'ruby bin/guard' > /dev/null
then
cat <<heredoc

*** shut down bin/guard first to generate a gh-pages branch

heredoc
exit
else

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
cat <<heredoc

*** downloading copy of tar.gx archive into ./tarballs

heredoc
mkdir -p tarballs
wget --directory-prefix=tarballs --max-redirect=1 --content-disposition https://github.com/concord-consortium/lab/tarball/gh-pages
else
cat <<heredoc

*** uncommitted changes in your working directory

    please commit or stash changes in your working dir before updating the gh-pages branch

heredoc
git status
fi
fi