# Lab Framework

HTML5-based open source scientific models, visualizations, graphing, and probeware from the
[Concord Consortium](http://www.concord.org). This framework is deployed in the following places.
These sites contain many examples of what it can do:

- **[lab-framework.concord.org](http://lab-framework.concord.org)** _(production)_
- **[lab-framework.concord.org/branch/master/](http://lab-framework.concord.org/branch/master/)** _(development)_

## Setup Development

### Prerequisites:

- [node.js, npm](developer-doc/setup-node.md)
- [RVM, Ruby 2.0 and Bundler](developer-doc/setup-ruby.md)
- [additional Linux notes](developer-doc/linux-notes.md)

### Setup the local Lab repository for development

1. Clone the git repository
2. `cd lab`
3. `npm install`
4. `npm run build`
5. open another new terminal and run `npm start`
6. open http://localhost:9191

It is recommended that you review the [initial setup details](developer-doc/initial-setup-details.md).
They describe what each of the steps above does.

### Testing

Lab is using [Jest test framework](https://jestjs.io/).

- `npm test` will run all tests.
- `npm run test:coverage` will execute all tests and display code coverage stats.

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

## Automated Browser Testing

Lab framework tests are automated using open source support from [BrowserStack](http://www.browserstack.com/) and [SauceLabs](https://saucelabs.com/).

For more information, please visit [lab-selenium-tests repository](https://github.com/concord-consortium/lab-selenium-tests).

## More Documentation

SVG support is required to run Lab.
IE 9+, FF, Chrome, Safari, iOS Safari, Chrome for Android all support SVG

- [Project Configuration](developer-doc/configuration.md)
- [Repository Structure](developer-doc/repository-structure.md)
- [Localization](developer-doc/localization.md)
- [Physical Constants and Units](developer-doc/physical-constants-and-units.md)
- [Deployment](developer-doc/deployment.md)
- [References](developer-doc/references.md)
- [Java Resources](developer-doc/java.md)
- [Building Website](developer-doc/website.md)
- [Fonts](developer-doc/fonts.md)
