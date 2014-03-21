#!/bin/sh

# this will deploy the current public folder to a subfolder in the s3 bucket
# the subfolder is the name of the TRAVIS_BRANCH
if [ "$TRAVIS_PULL_REQUEST" != "false" ]; then
	echo "skiping deploy to S3: this is a pull request"
	exit 0
fi

mkdir _site
mv public _site/$TRAVIS_BRANCH
disable_parallel_processing=true bundle exec s3_website push --site _site --headless --config_dir config
