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
if ps aux | grep -v grep | grep 'ruby bin/guard' > /dev/null
then
cat <<heredoc

*** shut down bin/guard first to generate a gh-pages branch

heredoc
exit
else

if git diff --exit-code --quiet && git diff --cached --exit-code --quiet
then
cd public
git fetch
git reset --hard origin/gh-pages
cd ..
export LAB_DISABLE_MODEL_LIST=1
make clean; make
rm -f src/lab/lab.config.js; make public/lab/lab.js STATIC=true
unset LAB_DISABLE_MODEL_LIST
cd public
git add --all .
git commit -am "generated from commit: `git --git-dir ../.git log -1 --format="%H%n%n%an <%ae>%n%cd%n%n    %s%n%n    %b"`"
git push origin gh-pages
cd ..
bin/haml -r ./script/setup.rb src/interactives.html.haml public/interactives.html
bin/haml -r ./script/setup.rb src/embeddable.html.haml public/embeddable.html
rm -f src/lab/lab.config.js; make public/lab/lab.js
else
cat <<heredoc

*** uncommitted changes in your working directory

    please commit or stash changes in your working dir before updating the gh-pages branch

heredoc
git status
fi
fi
