# Lab Framework

HTML5-based open source scientific models, visualizations, graphing, and probeware from the
[Concord Consortium](http://www.concord.org). This framework is deployed in the following places.
These sites contain many examples of what it can do:

- **[lab-framework.concord.org](http://lab.concord.org)** _(production)_
- **[lab-framework.dev.concord.org](http://lab.dev.concord.org)** _(development)_

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
- [additional Linux notes](developer-doc/linux-notes.md)

### Setup the local Lab repository for development

1. Clone the git repository
2. `cd lab`
3. `cp config/config.sample.yml config/config.yml`
4. `make everything`
5. open another new terminal and run `rackup`
6. open http://localhost:9191
7. (optional) open a new terminal and run `guard`
8. (optional) `mkdir .git/hooks; cp -vn script/post-commit .git/hooks/`

It is recommended that you review the [initial setup details](developer-doc/initial-setup-details.md).
They describe what each of the steps above does.

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

