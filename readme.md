# Lab Framework

HTML5-based open source scientific models, visualizations, graphing, and probeware from the
[Concord Consortium](http://www.concord.org). This framework is deployed in the following places.
These sites contain many examples of what it can do:

- **[lab.concord.org](http://lab.concord.org)** _(production)_
- **[lab.dev.concord.org](http://lab.dev.concord.org)** _(development)_

## Licensing

Lab is Copyright 2012 (c) by the Concord Consortium and is distributed under
any of the following licenses:

- [Simplified BSD](http://www.opensource.org/licenses/BSD-2-Clause),
- [MIT](http://www.opensource.org/licenses/MIT), or
- [Apache 2.0](http://www.opensource.org/licenses/Apache-2.0).

The complete licensing details can be read [here](license.md).

If you have have received a **distribution archive** of the
[Concord Consortium Lab project](https://github.com/concord-consortium/lab)
our copyright applies to all resources **except** the files in the
`vendor/` directory. The files in the `vendor/` directory are from
third-parties and are distributed under either BSD, MIT, or Apache 2.0 licenses.

## Setup Development

Lab uses a number of RubyGems and node modules to manage development. Lab's test framework
uses [Vows](http://vowsjs.org) amd [Mocha](http://visionmedia.github.io/mocha/) which both depend
on [nodejs](http://nodejs.org/) and [npm](http://npmjs.org/) the Node Package Manager.

In addition JavaScript minification is done using [UglifyJS](https://github.com/mishoo/UglifyJS).
JavaScript dependency management is handled by [RequireJS](http://requirejs.org/).

### Prerequisites:

#### RVM, Ruby 2.0 and the RubyGem bundler

We normally use [RVM](https://rvm.io/) to mange our development dependency on [Ruby 2.0.0](http://www.ruby-lang.org/en/)
and the specific Ruby Gems needed for building Lab and running the Lab server.

1. [Install RVM](https://rvm.io/rvm/install/)

After installation you should see something like the following:

    $  ruby -v
    ruby 2.0.0p247 (2013-06-27 revision 41674) [x86_64-darwin10.8.0]

If you already have RVM installed update to the most up-to-date stable version.

    $ rvm get stable

Once you have a working version of Ruby 2.0.0 check to see if the RubyGem [bundler](http://gembundler.com/)
is already installed:

    $ gem list bundler

    *** LOCAL GEMS ***

    bundler (1.3.5)

If Bundler is not installed install it now into the global gemset for ruby-2.0.0-p247

    $ rvm gemset use global
    $ gem install bundler
    Fetching: bundler-1.3.5.gem (100%)
    Successfully installed bundler-1.3.5
    1 gem installed

#### nodejs and npm, the Node Package Manager

[nodejs](http://nodejs.org/) and [npm](http://npmjs.org/), the Node Package Manager are additional
development dependencies.

[npm](http://npmjs.org/), the Node Package Manager is included as part of [nodejs](http://nodejs.org/)

Install the latest stable version of node (currently v0.10.4) with installers available here: [http://nodejs.org/#download](http://nodejs.org/#download)

Currently development is being done with these versions of node and npm:

    $ node -v
    v0.10.4

    $ npm -v
    1.2.18

#### Java

Java is needed for the legacy Java applications we are porting to HTML5.

Test to see if Java is installed and available:

    $ java -version
	java version "1.6.0_33"
	Java(TM) SE Runtime Environment (build 1.6.0_33-b03-424-11M3720)
	Java HotSpot(TM) 64-Bit Server VM (build 20.8-b03-424, mixed mode)

On Mac OS X 10.7 and later Java is not automatically installed. However running the command
`java -version` when Java is not installed will bring up an operating system dialog enabling
Java to be installed.

###Linux (Ubuntu)

Before any of this make sure that "run command as login shell" is checked. if it isn't go to edit-profile
preferences-Title and Command, and check Run command as a login shell.

To [Install RVM](https://rvm.io/rvm/install/) you need to have curl:

    $ sudo apt-get install curl </code></pre>

Install RVM using curl with:

    $ curl -L https://get.rvm.io | bash -s stable --ruby

After RVM has finnished installing it will ask you to run a command similar to

    $ source /home/user_name/.rvm/scripts/rvm

After installation you should see something like the following:

    $  ruby -v
    ruby 2.0.0p247 (2013-06-27 revision 41674) [x86_64-darwin12.4.0]

RVM has some additional dependancies, to view these type:

    $ rvm requirements

Under additional dependancies and ruby, copy the list of dependancies and paste them in to your terminal
and install them using `sudo`. The command will look something like this:

    sudo /usr/bin/apt-get install build-essential openssl libreadline6 libreadline6-dev curl git-core zlib1g zlib1g-dev libssl-dev libyaml-dev libsqlite3-dev sqlite3 libxml2-dev libxslt-dev autoconf libc6-dev ncurses-dev automake libtool bison subversion</code></pre>

Becouse of some unknown bugs RVM doesn't recognise readline without being explictly pointed to it.
To do this I've had to reinstall ruby 2.0.0p247.

  $ rvm reinstall 2.0.0-p247 --with-zlib1g-dev

[ruby gem bundler](http://gembundler.com/) should be installed. To check if it has been try:

    $ gem list bundler

    *** LOCAL GEMS ***

    bundler (1.3.5)

If it doesn't return anything install Bundler:

    $ gem install bundler

#### nodejs and npm

[nodejs](http://nodejs.org/) and [npm](http://npmjs.org/), the Node Package Manager are additional
development dependencies.

[npm](http://npmjs.org/), the Node Package Manager has been included as part of [nodejs](http://nodejs.org/)
since version 0.6.3.

To install the latest stable versions of node you first need to add this PPA repositories:

1. [node PPA repo](https://launchpad.net/~chris-lea/+archive/node.js/)

For this to work as intended python software properties must also be installed.

    $ sudo apt-get install python-software-properties
    $ sudo apt-add-repository ppa:chris-lea/node.js
    $ sudo apt-get update

Now install node and npm:

    $ sudo apt-get install nodejs npm

Neither the Java run time environment nor the Java development kit are installed by
default, both of which are used for the java projects.

    sudo apt-get install  default-jre openjdk-6-jdk

The Ruby Gem Nokogiri requires libxslt and libxml2, install them with:

    sudo apt-get install libxslt-dev libxml2-dev

Final note, before you `make everything` setup the project configurations files by copying the
configuration samples:

    cp config/config.sample.yml config/config.yml

#### Known problems with Linux during Lab build process

- D3.js build process fails:

        locale: Cannot set LC_ALL to default locale: No such file or directory

    Solution:

        $ sudo locale-gen en_US

- D3.js build process fails:

        make[1]: /usr/lib/nodejs:/usr/share/javascript/uglify-js/bin/uglifyjs: Command not found

    Workaround:

        $ unset NODE_PATH

    and try to build the project again.

### Use git to create a local clone of the Lab repository.

If you have commit access to the repository use this form:

    git clone git@github.com:concord-consortium/lab.git

Alternatively if you don't have commit access use this form:

    git clone git://github.com/concord-consortium/lab.git

### Setup the local Lab repository for development

Make sure you have already installed the prerequistes: [Ruby 2.0](http://www.ruby-lang.org/en/),
the RubyGem [bundler](http://gembundler.com/), and [nodejs](http://nodejs.org/) (which now includes
[npm](http://npmjs.org/) the Node Package Manager.

Open a shell and change to the `lab/` directory. The first time you `cd` into the `lab/` directory
RVM will switch to using `ruby-2.0.0-p247` based on the `.ruby-version` file in the repository.
Additionally the `.ruby-gemset` tells RVM to install the gems in a gemset named `lab`. So together
these files tell RVM to store and load gems from the `ruby-2.0.0-p247@lab` gemset.

    cd lab

If you don't have `ruby-2.0.0-p247` already installed rvm will display the command you need to
run to install it. Run this command if required.

If you do end up having to install a new version of Ruby with RVM change out of and back into the lab directory after the RVM install of Ruby is complete:

    cd ..
    cd lab

#### Initial configuration

Copy the sample project configuration file to `config/config.yml` (you can examine it and edit if you want).

    cp config/config.sample.yml config/config.yml

#### Create a git post-commit hook

After every commit `src/lab/lab.version.js` should be updated to include recent version and build information for Lab's distrobution. To do this make a git `post-commit` hook by creating the file `.git/hooks/post-commit` with this content:

    #!/bin/sh
    (cd ../.. && ./script/update-git-commit-and-branch.rb)

Make the file `.git/hooks/post-commit` executable:

    chmod u+x .git/hooks/post-commit

Now run a make task that will download and install all the dependencies and build the whole project
for the first time.

    make everything

When `make everything` is run on a freshly cloned repository it performs the following tasks:

1.  Install the runtime dependencies as git submodules into the `vendor/` directory:

        git submodule update --init --recursive

2.  Install the development dependencies that use [nodejs](http://nodejs.org/) and
    are managed by [npm](http://npmjs.org/):

        npm install

    You can see the list of dependencies to be installed in the file `package.json`. In addition
    `vendor/d3` and `vendor/science.js` are manually installed into `node_modules/`.

3.  Install the additional RubyGems used for development: haml, sass, guard ...

        bundle install --binstubs

    This creates the `bin/` directory and populates it with command-line executables for running
    the specific versions of the RubyGems installed for development.

4.  Generates the `public` directory:

5.  Generates the Java resources in the `public/jnlp` directory:

You should now be able to open the file: `public/index.html` in a browser and run some of the examples.
On Chrome browsers you will need to start a server, using `bin/rackup` (see below) or `python -m SimpleHTTPServer` from the lab root directory.

#### Automatic build processing using Guard

Start watching the `src/` and `test/` directories with [Guard](#guard) and when files are
changed automatically generate the JavaScript Lab modules, the examples, and run the tests.

    bin/guard

Now any change you make in `src/examples/` will generate the corresponding content in `public/examples/`.
In addition changes in `src/lab/` generate the associated Lab modules in `lab/` and copy these modules
to `public/lab/`. In addition any change in either the `src/lab/` or `test/`directories will run the
tests and display the results in the console window where `bin/guard`
is running.

#### Startup the Rack-based Lab server for local development

The Lab server is a simple Rack application.

    bin/rackup config.ru

Now open http://localhost:9292/index.html

This developer server and the production server are running an [embedded Jnlp service](developer-doc/jnlp-rack-app.md).

## Contributing to Lab

If you think you'd like to contribute to Lab as an external developer:

1. Create a local clone from the repository located here: http://github.com/concord-consortium/lab.
   This will by default have the git-remote name: **origin**.

2. Make a fork of http://github.com/concord-consortium/lab to your account on github.

3. Make a new git-remote referencing your fork. I recommend making the remote name your github user name.
   For example my username is `stepheneb` so I would add a remote to my fork like this:

        git remote add stepheneb git@github.com:stepheneb/lab.git

4. Create your changes on a topic branch. Please include tests if you can. When your commits are ready
   push your topic branch to your fork and send a pull request.

## More Documentation

- [Static Distribution](developer-doc/static-distribution.md)
- [Project Configuration](developer-doc/configuration.md)
- [Continuous Integration on Travis](developer-doc/travis.md)
- [Repository Structure](developer-doc/repository-structure.md)
- [Javascript Dependency Management and Build Process](developer-doc/js-dependency-management.md)
- [Testing](developer-doc/testing.md)
- [Physical Constants and Units](developer-doc/physical-constants-and-units.md)
- [Deployment](developer-doc/deployment.md)
- [References](developer-doc/references.md)
- [Dependencies](developer-doc/dependencies.md)
- [Java Resources](developer-doc/java.md)
- [Building Website](developer-doc/website.md)

