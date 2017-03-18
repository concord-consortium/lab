# Install node.js, npm and yarn

[node.js](http://nodejs.org/) and [npm](http://npmjs.org/) are required to build Lab.
[npm](http://npmjs.org/) is included as part of [node.js](http://nodejs.org/).
[yarn](https://yarnpkg.com) needs to be installed separately.

## OS X

Install the latest stable version of node with installers available here: [http://nodejs.org/#download](http://nodejs.org/#download)

Install yarn using homebrew: `brew install yarn` or check other installation methods: https://yarnpkg.com/en/docs/install#mac-tab

## Linux (Ubuntu)

To install the latest stable versions of node you first need to add this PPA repositories:

1. [node PPA repo](https://launchpad.net/~chris-lea/+archive/node.js/)

For this to work as intended python software properties must also be installed.

    $ sudo apt-get install python-software-properties
    $ sudo apt-add-repository ppa:chris-lea/node.js
    $ sudo apt-get update

Now install node and npm:

    $ sudo apt-get install nodejs npm
    
2. Install Yarn: https://yarnpkg.com/en/docs/install#linux-tab
