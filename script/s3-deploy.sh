#!/bin/sh

# this will deploy the current public folder to a subfolder in the s3 bucket
# the subfolder is the name of the TRAVIS_BRANCH
if [ "$TRAVIS_PULL_REQUEST" != "false" ]; then
	echo "skiping deploy to S3: this is a pull request"
	exit 0
fi

if [ "$TRAVIS_BRANCH" = "production" ]; then
  mv public _site
else
  # the 2> is to prevent error messages when no match is found
  CURRENT_TAG=`git describe --tags --exact-match $TRAVIS_COMMIT 2> /dev/null`
  if [ "$TRAVIS_BRANCH" = "$CURRENT_TAG" ]; then
    mkdir -p "_site/version"
    DEPLOY_DIR="version/$TRAVIS_BRANCH"
  else
    mkdir -p "_site/branch"
    DEPLOY_DIR="branch/$TRAVIS_BRANCH"
  fi
  mv public "_site/$DEPLOY_DIR"
  export DEPLOY_DIR
fi
disable_parallel_processing=true bundle exec s3_website push --site _site --headless --config_dir config
