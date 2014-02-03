# RVM, Ruby 2.0 and Bundler

We normally use [RVM](https://rvm.io/) to mange our development dependency on [Ruby 2.0.0](http://www.ruby-lang.org/en/)
and the specific Ruby Gems needed for building Lab and running the Lab server.

> Ubuntu Linux:
> - make sure that "run command as login shell" is checked in your terminal preferences
> - install curl `sudo apt-get install curl`

[Install RVM](https://rvm.io/rvm/install/)

    $ \curl -sSL https://get.rvm.io | bash -s stable --ruby

After RVM has finished installing it will ask you to run a command similar to

    $ source /home/user_name/.rvm/scripts/rvm

After installation you should see something like the following:

    $  ruby -v
    ruby 2.0.0p247 (2013-06-27 revision 41674) [x86_64-darwin10.8.0]

Often RVM has some additional dependencies, to view the list and directions for installing these, type:

    $ rvm requirements

> Ubuntu Linux: Often RVM doesn't recognise readline without being explictly pointed to it.
> To do this, reinstall ruby 2.0.0p247: `$ rvm reinstall 2.0.0-p247 --with-zlib1g-dev`

If you already have RVM installed update to the most up-to-date stable version.

    $ rvm get stable

Once you have a working version of Ruby 2.0.0 check to see if the RubyGem [Bundler](http://gembundler.com/)
is already installed:

    $ gem list bundler

    *** LOCAL GEMS ***

    bundler (1.3.5)

If Bundler is not installed, install it into the global gemset for ruby-2.0.0-p247

    $ rvm gemset use global
    $ gem install bundler
