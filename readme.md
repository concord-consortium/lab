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

### Prerequisites:

- [RVM, Ruby 2.0 and Bundler](developer-doc/setup-ruby.md)
- [node.js and npm](developer-doc/setup-node.md)
- [Java](developer-doc/setup-java.md)
- [additional Linux notes](developer-doc/linux-notes.md)

### Setup the local Lab repository for development

Clone the git repository

Open a shell and change to the `lab/` directory. The first time you `cd` into the `lab/` directory
RVM will switch to using `ruby-2.0.0-p247` based on the `.ruby-version` file in the repository.
Additionally the `.ruby-gemset` tells RVM to install the gems in a gemset named `lab`. So together
these files tell RVM to store and load gems from the `ruby-2.0.0-p247@lab` gemset.

    cd lab

If you don't have `ruby-2.0.0-p247` already installed rvm will display the command you need to
run to install it. Run this command if required.

If you do end up having to install a new version of Ruby with RVM change out of and back into the lab directory after the RVM install of Ruby is complete:

    cd ..; cd lab

#### Initial configuration

Copy the sample project configuration file to `config/config.yml`

    cp config/config.sample.yml config/config.yml

You can examine it and edit it if you want: [project configuration documentation](developer-doc/configuration.md)

#### Create a git post-commit hook

After every commit `src/lab/lab.version.js` should be updated to include recent version and build information for Lab's distribution.
This is done with a git post-commit hook. There is a pre built one in `script/post-commit` which you can copy:

    cp -vn script/post-commit .git/hooks/

If you already have a post-commit file the above command will tell you. So instead add the following line to your existing `post-commit`:

    (cd ../.. && ./script/update-git-commit-and-branch.rb)

#### Build the project

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

