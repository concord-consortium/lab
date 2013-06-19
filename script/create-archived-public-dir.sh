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
cp ../script/dot-gitignore-for-public .gitignore
git add --all .
git commit -am "generated from commit: `git --git-dir ../.git log -1 --format="%H%n%n%an <%ae>%n%cd%n%n    %s%n%n    %b"`"
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

***  copying public into: ./version/$version/public

heredoc

cd public
git checkout-index -f -a --prefix=../version/$version/public/

cat <<heredoc

***  archiving public into: ./version/$archivename

heredoc

git archive HEAD | gzip > ../version/$archivename

else
cat <<heredoc

*** uncommitted changes in your working directory

    please commit or stash changes in your working dir before generating a versioned public directory

heredoc
git status
fi
