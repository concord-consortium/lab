# Install node.js and npm

[node.js](http://nodejs.org/) and [npm](http://npmjs.org/) are required to build Lab.
[npm](http://npmjs.org/) is included as part of [node.js](http://nodejs.org/)

## OS X

Install the latest stable version of node with installers available here: [http://nodejs.org/#download](http://nodejs.org/#download)

## Linux (Ubuntu)

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