#!/bin/sh
#
# ./create-versioned-public-dir.sh [name-of-versioned-dir]
#
if ps aux | grep -v grep | grep 'ruby bin/guard' > /dev/null
then
cat <<heredoc

*** shut down bin/guard first before generating a versioned public directory

heredoc
exit
else

if git diff --exit-code --quiet && git diff --cached --exit-code --quiet
then

if [ -z "$1" ]
  then
    version=`git log -1 --format=%h`
  else
    version=$1
fi

mkdir -p archived
cat <<heredoc

***  copying public into: ./archived/$version/public

heredoc

rsync -aq --no-links -f"- .git/" public archived/$version

else
cat <<heredoc

*** uncommitted changes in your working directory

    please commit or stash changes in your working dir before generating a versioned public directory

heredoc
git status
fi
fi
