#!/bin/sh
#
# script/create-archived-public-dir.sh [name-of-versioned-dir]
#

version=$1
archivename="$version.tar.gz"

echo "- create version/$version/public/ directory"

mkdir -p version/$version/public/

echo "- copy public to version/$version/public/"

# Exclude:
# .git - public folder used to be a git repo (previous version of this script was creating it),
# version - symbolic links to other versions,
# jnlp - following convention of the previous script, we also don't want to include that in archive.
rsync -a --exclude='.git/' --exclude='version/' --exclude='jnlp/' public version/$version/

echo "- generate $archivename archive"

mv version/$version/public/ version/$version/$version/
tar -zcf version/$archivename --directory=version/$version/ $version
mv version/$version/$version/ version/$version/public/
