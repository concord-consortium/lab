#!/bin/sh
if [ ! -d public/.git ]
then
cat <<heredoc

*** dir: public not yet setup as a separate gh-pages tracking branch

    Please setup the public as a separate git checkout tracking the gh-pages branch first.
    See: http://lab.dev.concord.org/readme.html#making-the-public-folder-track-the-gh-pages-branch

heredoc
exit
fi
if ps aux | grep -v grep | grep 'ruby guard' > /dev/null
then
cat <<heredoc

*** shut down guard first before generating an archive of the gh-pages
    branch in public/

heredoc
exit
else

if git diff --exit-code --quiet && git diff --cached --exit-code --quiet
then
archivename="concord-consortium-lab-`git --git-dir .git log -1 --format=%h`.tar.gz"
mkdir -p tarballs
cat <<heredoc

*** generating an archive of the gh-page branch in public/ into: ./tarballs/$archivename

heredoc
cd public
git archive HEAD | gzip > ../tarballs/$archivename
cd ..
else
cat <<heredoc

*** uncommitted changes in your working directory

    please commit or stash changes in your working dir before generating
    an archive of the gh-pages branch in public/

heredoc
git status
fi
fi
