#!/bin/sh
#
# script/create-archived-public-dir.sh [name-of-versioned-dir]
#
if ps aux | grep -v grep | grep 'ruby bin/guard' > /dev/null
then
cat <<heredoc

*** shut down bin/guard first before generating a versioned public directory

heredoc
exit
fi

if git diff --exit-code --quiet && git diff --cached --exit-code --quiet
then

if [ ! -d public/.git ]
then
cat <<heredoc

*** creating separate branch named 'public to track generated content

heredoc
cd public
git init .
git checkout -b public
git checkout -b static
git checkout public
cp ../script/dot-gitignore-for-public .gitignore
git add --all .
git commit -am "generated from commit: `git --git-dir ../.git log -1 --format="%H%n%n%an <%ae>%n%cd%n%n    %s%n%n    %b"`"
cd ..
else
cat <<heredoc

*** updating separate branch named 'public to track generated content

heredoc
cd public
if git checkout --quiet public
then
echo "checked out existing public branch"
else
git checkout -b public
fi
git add --all .
git commit -am "generated from commit: `git --git-dir ../.git log -1 --format="%H%n%n%an <%ae>%n%cd%n%n    %s%n%n    %b"`"

if git checkout --quiet static
then
echo "checked out existing static branch"
else
git checkout -b static
fi
git merge public
cd ..
LAB_DISABLE_MODEL_LIST=true  bin/haml -r ./script/setup.rb src/interactives.html.haml public/interactives.html
LAB_DISABLE_MODEL_LIST=true  bin/haml -r ./script/setup.rb src/embeddable.html.haml public/embeddable.html
rm -f src/lab/lab.config.js; make public/lab/lab.js STATIC=true
make public/lab/lab.min.js
cd public
git commit -am "commit html files modified for static distribution into static branch"
git checkout public
cd ..
fi

# if no arg then use short SHA from commit as version name
if [ -z "$1" ]
  then
    version=`git log -1 --format=%h`
  else
    version=$1
fi

archivename="$version.tar.gz"

mkdir -p version
cat <<heredoc

***  copying public branch in ./public into: ./version/$version/public

heredoc

cd public
git checkout public
git checkout-index -f -a --prefix=../version/$version/public/

cat <<heredoc

***  archiving static branch in ./public into: ./version/$archivename

heredoc

git checkout static
git archive HEAD | gzip > ../version/$archivename
git checkout public

else
cat <<heredoc

*** uncommitted changes in your working directory

    please commit or stash changes in your working dir before generating a versioned public directory

heredoc
git status
fi
