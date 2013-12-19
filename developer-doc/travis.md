# Continuous Integration on travis-ci

[travis-ci](http://travis-ci.org) is a free open-source web-based distributed continuous integration system.

When code is checked in to the master branch the [concord-consortium/lab](http://travis-ci.org/#!/concord-consortium/lab)
project on [travis-ci](http://travis-ci.org) automatically runs all the unit tests.

If any test fails the author of the commit will get an email as well the developers listed in the
[.travis.yml](https://github.com/concord-consortium/lab/blob/master/.travis.yml) configuration file.

## Setting up travis-ci integration

I created an account on [travis-ci](http://travis-ci.org) linked to the [stepheneb](https://github.com/stepheneb)
acocunt on github by having travis-ci authenticate me with github using oauth.

I was then able to manually setup a Travis service hook for the lab repository. I needed to
do this manually because I was integrating a repository under the concord-consortium github
organization instead of one directly under my own account.

Useful [travis-ci](http://travis-ci.org) resources

- [The Travis Architecture](http://about.travis-ci.org/docs/dev/overview/)
- [How to setup and trigger the hook manually](http://about.travis-ci.org/docs/user/how-to-setup-and-trigger-the-hook-manually/)
- [Build configuration](http://about.travis-ci.org/docs/user/build-configuration/)
- [Ruby projects](http://about.travis-ci.org/docs/user/languages/ruby/)
- [Nodejs projects](http://about.travis-ci.org/docs/user/languages/javascript-with-nodejs/)
- [GUI and Headless Browser testing](http://about.travis-ci.org/docs/user/gui-and-headless-browsers/)

