# [lab.concord.org](http://lab.concord.org/)

HTML5-based open source scientific models, visualizations, graphing, and probeware from the
[Concord Consortium](http://www.concord.org).

**Production site:**
  : **[lab.concord.org](http://lab.concord.org/)**

**Technical Readme:**
  : **[lab.concord.org/readme.html](http://lab.concord.org/readme.html)**

**Development site:**
  : **[lab.dev.concord.org](http://lab.dev.concord.org/)**

**Source code repository:**
  : **[github.com/concord-consortium/lab](https://github.com/concord-consortium/lab)**

_Note: many of the links in this readme only work properly when this document is served
from a web-server and do not resolve properly at
[github.com/concord-consortium/lab](https://github.com/concord-consortium/lab).
A live version of the readme is always available here:
[lab.concord.org/readme.html](http://lab.concord.org/readme.html)._

**Table of Contents**

* toc
{:toc}

## Licensing

Lab is Copyright 2012 (c) by the Concord Consortium and is distributed under
any of the following licenses:

- [Simplified BSD](http://www.opensource.org/licenses/BSD-2-Clause),
- [MIT](http://www.opensource.org/licenses/MIT), or
- [Apache 2.0](http://www.opensource.org/licenses/Apache-2.0).

The complete licensing details can be read [here](license.html).

If you have have received a **distribution archive** of the
[Concord Consortium Lab project](https://github.com/concord-consortium/lab)
our copyright applies to all resources **except** the files in the
`vendor/` directory. The files in the `vendor/` directory are from
third-parties and are distributed under either BSD, MIT, or Apache 2.0 licenses.

## Examples

### Molecular Modeling Examples

- [Oil and Water](/examples/interactives/interactives.html#interactives/samples/1-oil-and-water-shake.json), ([embeddable link](/examples/interactives/embeddable.html#interactives/samples/1-oil-and-water-shake.json))
- [A Simple Gas](/examples/interactives/interactives.html#interactives/samples/2-simple-gas.json), ([embeddable link](/examples/interactives/embeddable.html#interactives/samples/2-simple-gas.json))
- [Explore 100 Atoms](/examples/interactives/interactives.html#interactives/samples/3-100-atoms.json), ([embeddable link](/examples/interactives/embeddable.html#interactives/samples/3-100-atoms.json))

### Energy2D Examples

- [Energy2D Models](examples/energy2d-model/energy2d-model.html)

### Graphing examples

- [Graphing Samples](examples/grapher/grapher.html)
- [Digital Signal Processing Samples](experiments/dsp/dsp.html)

### Probeware Examples

- [Vernier GoIO Sensor Grapher](experiments/goio-sensor-grapher/index.html) _(only works on web-server)_

## Distribution of Project and Examples

Compressed archives of the generated Lab distribution are available for download:

- [Lab distribution (tar.gz archive)](https://github.com/concord-consortium/lab/tarball/gh-pages) _(32MB)_
- [Lab distribution (zip archive)](https://github.com/concord-consortium/lab/zipball/gh-pages) _(42MB)_

Download and expand one of these archives to create a folder named `concord-consortium-lab-xxxxxxx`.
The seven characters at the end of the archive filename are the first seven characters of the git
commit SHA.

To access the content on your local you will need to serve the files from a web server running on your
local computer. Once there open the file index.html in the expanded archive.

For example Chrome generates this error when I try and load the sample Oil and Water Interactive directly
from my filesystem:

    XMLHttpRequest cannot load file:///Users/stephen/Downloads/concord-consortium-lab-9771ec6/examples/interactives/interactives/samples/1-oil-and-water-shake.json.
    Origin null is not allowed by Access-Control-Allow-Origin.

## Setup Development

Lab uses a number of RubyGems and node modules to manage development. Lab's test framework
uses [Vows](http://vowsjs.org), which depends on [nodejs](http://nodejs.org/) and
[npm](http://npmjs.org/) (Node Package Manager). In addition JavaScript minification is
done using [UglifyJS](https://github.com/mishoo/UglifyJS). JavaScript dependency management
is handled by [RequireJS](http://requirejs.org/).

### Prerequisites:

#### RVM, Ruby 1.9 and the RubyGem bundler

We use [RVM](https://rvm.io/) to mange our development dependency on [Ruby 1.9.3](http://www.ruby-lang.org/en/)
and the specific Ruby Gems needed for building Lab and running the Lab server.

1. [Install RVM](https://rvm.io/rvm/install/)

After installation you should see something like the following:

    $  ruby -v
    ruby 1.9.3p194 (2012-04-20 revision 35410) [x86_64-darwin10.8.0]

Once you have a working version of Ruby 1.9.3 check to see if the RubyGem [bundler](http://gembundler.com/)
is already installed:

    $ gem list bundler

    *** LOCAL GEMS ***

    bundler (1.1.3)

If Bundler is not installed install it now:

    $ gem install bundler
    Fetching: bundler-1.1.3.gem (100%)
    Successfully installed bundler-1.1.3
    1 gem installed

#### nodejs and npm, the Node Package Manager

[nodejs](http://nodejs.org/) and [npm](http://npmjs.org/), the Node Package Manager are additional
development dependencies.

[npm](http://npmjs.org/), the Node Package Manager has been included as part of [nodejs](http://nodejs.org/)
since version 0.8.7.

Install the latest stable version of node (currently v0.8.12) with installers available here: [http://nodejs.org/#download](http://nodejs.org/#download)

Currently development is being done with these versions of node and npm:

    $ node -v
    v0.8.12

    $ npm -v
    1.1.63

#### CouchDB

Install the nosql document-oriented [CouchDB](http://couchdb.apache.org/) database server to support persistence for the Lab server.

Installation options:

**MacOS X**

Most of the developers on Lab use [Homebrew](http://mxcl.github.com/homebrew/) a package manager for Mac OS X.

1. [Install Homebrew](https://github.com/mxcl/homebrew/wiki/installation)
2. Install CouchDB using homebrew

        brew doctor     # fix issues if needed
        brew update     # if you haven't run it in the last 24 hours
        brew install couchdb

#### Java

Java is needed for compiling the invisible sensor applet as well as the legacy Java applications we are porting to HTML5.

Test to see if Java is installed and available:

    $ java -version
	java version "1.6.0_33"
	Java(TM) SE Runtime Environment (build 1.6.0_33-b03-424-11M3720)
	Java HotSpot(TM) 64-Bit Server VM (build 20.8-b03-424, mixed mode)

On Mac OS X 10.7 and later Java is not automatically installed. However running the command
`java -version` when Java is not installed will bring up an operating system dialog enabling
Java to be installed.

##### Customize Maven mirror

**Note:** Currently in order to compile OTrunk a very old version of the maven jarjar plugin is
needed (v0.4). Only newer versions of the jarjar plugin are available in the public Maven artifact
repositories. Until OTrunk is updated you will need to include the Concord nexus Maven mirror
(which has v0.4 of the maven jarjar plugin) in `~/.m2/settings.xml`.

A minimal working `~/.m2/settings.xml` will look like this:

    <?xml version="1.0"?>
    <settings>
      <mirrors>
        <mirror>
          <id>nexus</id>
          <mirrorOf>*</mirrorOf>
          <url>http://source.concord.org/nexus/content/groups/public</url>
        </mirror>
      </mirrors>
    </settings>

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
    ruby 1.9.3p194 (2012-04-20 revision 35410) [x86_64-linux]

RVM has some additional dependancies, to view these type:

    $ rvm requirements

Under additional dependancies and ruby, copy the list of dependancies and paste them in to your terminal
and install them using `sudo`. The command will look something like this:

    sudo /usr/bin/apt-get install build-essential openssl libreadline6 libreadline6-dev curl git-core zlib1g zlib1g-dev libssl-dev libyaml-dev libsqlite3-dev sqlite3 libxml2-dev libxslt-dev autoconf libc6-dev ncurses-dev automake libtool bison subversion</code></pre>

Becouse of some unknown bugs RVM doesn't recognise readline without being explictly pointed to it.
To do this I've had to reinstall ruby 1.9.3-p194.

  $ rvm reinstall 1.9.3-p194 --with-zlib1g-dev

[ruby gem bundler](http://gembundler.com/) should be installed. To check if it has been try:

    $ gem list bundler

    *** LOCAL GEMS ***

    bundler (1.1.4)

If it doesn't return anything install Bundler:

    $ gem install bundler

#### nodejs and npm and couchdb

[nodejs](http://nodejs.org/) and [npm](http://npmjs.org/), the Node Package Manager are additional
development dependencies.

[npm](http://npmjs.org/), the Node Package Manager has been included as part of [nodejs](http://nodejs.org/)
since version 0.6.3.

The nosql document-oriented [CouchDB](http://couchdb.apache.org/) database server is installed to support persistence for the Lab server.

To install the latest stable versions of node and couchdb you first need to add these PPA repositories:

1. [node PPA repo](https://launchpad.net/~chris-lea/+archive/node.js/)
2. [couchdb PPA repo](https://launchpad.net/~longsleep/+archive/couchdb)

For these to work as intended python software properties must also be installed.

    $ sudo apt-get install python-software-properties
    $ sudo apt-add-repository ppa:chris-lea/node.js
    $ sudo apt-add-repository ppa:longsleep/couchdb
    $ sudo apt-get update

Now install node and couchdb:

    $ sudo apt-get install couchdb nodejs npm

Currently development is being done with these versions of node and npm:

    $ node -v
    v0.8.2

    $ npm -v
    1.1.37

Neither the Java run time environment nor the Java development kit are installed by
default, both of which are used for the java projects.

    sudo apt-get install  default-jre openjdk-6-jdk

The Ruby Gem Nokogiri requires libxslt and libxml2, install them with:

    sudo apt-get install libxslt-dev libxml2-dev

Final note, before you `make everything` setup the project configurations files by copying the
configuration samples:

    cp config/config_sample.yml config/config.yml
    cp server/config/couchdb.sample.yml server/config/couchdb.yml

### Use git to create a local clone of the Lab repository.

If you have commit access to the repository use this form:

    git clone git@github.com:concord-consortium/lab.git

Alternatively if you don't have commit access use this form:

    git clone git://github.com/concord-consortium/lab.git

### Setup the local Lab repository for development

Make sure you have already installed the prerequistes: [Ruby 1.9](http://www.ruby-lang.org/en/),
the RubyGem [bundler](http://gembundler.com/), and [nodejs](http://nodejs.org/) (which now includes
[npm](http://npmjs.org/) the Node Package Manager.

Open a shell and change to the `lab/` directory. The first time you `cd` into the `lab/` directory RVM will
ask you if this *new* `.rvmrc` file should be trusted.

The `.rvmrc` specifies that this project dependeds on Ruby 1.9.3-p194 and all the required Ruby Gems
will be installed in the RVM gemset named `ruby-1.9.3-p194@lab`.

    cd lab
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

4.  Generates the `server/public` directory:

5.  Generates the Java resources in the `server/public/jnlp` directory:

You should now be able to open the file: `server/public/index.html` in a browser and run some of the examples.

#### Automatic build processing using Guard

Start watching the `src/` and `test/` directories with [Guard](#guard) and when files are
changed automatically generate the JavaScript Lab modules, the examples, and run the tests.

    bin/guard

Now any change you make in `src/examples/` will generate the corresponding content in `server/public/examples/`.
In addition changes in `src/lab/` generate the associated Lab modules in `lab/` and copy these modules
to `server/public/lab/`. In addition any change in either the `src/lab/` or `test/`directories will run the
tests and display the results in the console window where `bin/guard`
is running.

#### Setup the Rails Lab server for development

The Lab server is a very simple Rails 3.2 application that uses CouchDB for persistence.

Open a shell and change to the `lab/server` directory. The first time you `cd` into the `lab/server` directory RVM will
ask you if this *new* `.rvmrc` file should be trusted.

The `.rvmrc` specifies that this project dependeds on Ruby 1.9.3-p194-server and all the required Ruby Gems
will be installed in the RVM gemset named `ruby-1.9.3-p194@lab-server`.

    cd lab/server
    bundle install

Create a couchdb configuration by copying the sample:

    cp config/couchdb.sample.yml config/couchdb.yml

If you have setup your local CouchDB server to require admin login for creating new databases
you will need to enter user and password for a valid admin user.

##### Starting the Rails Lab server

    cd lab/server
    thin start

You can now open your local Lab application at this url:

    http://localhost:3000/

You can use a pre-configured route to open the local CouchDb admin web interface:

    http://localhost:3000/_utils

##### Entering the Rails Lab server console

    cd lab/server
    rails console

#### Building the Classic Java applications and the Sensor Java Applet

The Lab repository can build the legacy Java applications Molecular Workbench and Energy2D we
are converting to HTML5.

Building these Java applications allows developers to more easily compare the operation
of the HTML5 versions of these applications to the Java versions running in he browser as applets.

In addition we can create the Java resources to run the invisible Java applet needed for communicating
with Vernier GoIO probware in the browser however the Java resources for communicating with the
Vernier GoIO Probeware need to be digitally signed.

##### Running the Classic Java Molecular Workbench and Energy2D as Applications

After building the Java resources the Java applications Molecular Workbench and Energy2D can be
run as applications from the command line:

1. Molecular Workbench

        bin/mw

2. Energy2D

        bin/energy2d

##### Java Code-Signing Certificate and Keystore

A self-signed Java certificate is included with the Lab repository: `config/lab-sample-keystore,jks`
with a password and private key password of *abc123* however for production use you will want to use
a keystore with a publically-recognized Java code-siging certificate from a company like
[Thawte](http://www.thawte.com/code-signing/index.html).

To build the Jar resources for the probeware using either the self-signed certificate provided
with the Lab repository or one of your own first create the file `config/config.yml` by
copying `config/config.sample.yml` and editing appropriately.

    cp config/config.sample.yml config/config.yml

The `:java:` section of the `config.yml` yaml file looks like this:

    ---
    # password and alias for Java siging certificate.
    :java:
      :password: abc123
      :alias: lab-sample-keystore
      :keystore_path: config/lab-sample-keystore.jks

If you have a keystore already accessible via an alias replace `lab-sample-keystore` with
the alias for your existing keystore. If your keystore is stored in your home directory in the
file `.keystore` then you do should leave the `:keystore_path` empty.

    :keystore_path:

The self-signed `lab-sample-keystore,jks` keystore was generated with the Java keytool command as follows:

    $ keytool -genkey -keyalg RSA -keystore config/lab-sample-keystore,jks -alias lab-sample-keystore -storepass abc123 -validity 360 -keysize 2048
    What is your first and last name?
      [Unknown]:  Stephen Bannasch
    What is the name of your organizational unit?
      [Unknown]:  Lab Project
    What is the name of your organization?
      [Unknown]:  Concord Consortium
    What is the name of your City or Locality?
      [Unknown]:  Concord
    What is the name of your State or Province?
      [Unknown]:  Massachusetts
    What is the two-letter country code for this unit?
      [Unknown]:  US
    Is CN=Stephen Bannasch, OU=Lab Project, O=Concord Consortium, L=Concord, ST=Massachusetts, C=US correct?
      [no]:  yes
    Enter key password for <lab-sample-keystore>
    	(RETURN if same as keystore password):

    $ keytool -selfcert -alias lab-sample-keystore -keystore config/lab-sample-keystore.jks
    Enter keystore password:

##### Building the Java Resources

**Note:** Currently in order to compile OTrunk you need to include the Concord nexus Maven mirror in `~/.m2/settings.xml`. See [Customize Maven mirror](#customize_aven_mirror)

Run `make jnlp-all` to erase, build, package, sign and deploy all the Java resurces.

The first time this task is run it:

1.  Creates a `java/` top-level directory and checks out the required Java projects into this directory.
2.  Builds each of the projects
3.  Copies the jar resources into the `server/public/jnlp/` directory packing and signing them as needed.

Later if you have made updates in the Java source code or need to re-build and deploy for any reason you
can run:

    script/build-and-deploy-jars.rb --maven-update

If one of the maven projects fails to build because a dependency could not be found try running
the command again with the `--maven-update` argument:

    script/build-and-deploy-jars.rb --maven-update

Details about each Java project, where the repository is located, what branch is compiled, the specific
compilation details are all contained in this Ruby file:
[`config/java-projects.rb`](https://github.com/concord-consortium/lab/blob/master/config/java-projects.rb)

#### Java build/deploy integration

There is a configuration file expressed in Ruby code here which defines build specifications
for each Java project:
[`config/java-projects.rb`](https://github.com/concord-consortium/lab/blob/master/config/java-projects.rb)

The specification indicates whether the Java Jar resource will be directly downloaded or whether the
source code will be checked-out and compiled to create the Jar.

##### Java Projects Build Strategies

The `:build_type` option is used to specify the Java Projects Build Strategy.
Five different kinds of build strategies are available. Each strategy includes
additional build information in the `:build` option.

The `:maven`, `:custom`, and `:ant` build strategies all expect to be able to get the source
code to build projects from git repositories.

Most of Concord Consportium's open source Java codebase is published at our public Subversion
repository: [svn.concord.org/svn/projects/trunk](http://svn.concord.org/svn/projects/trunk)
however all of the legacy Java code the Lab project references is also mirrored to separate git
repositories at: [github.com/concord-consortium/](https://github.com/concord-consortium/).

The `trunk` branches in the git mirrors we maintain such as:
[concord-consortium/otrunk](https://github.com/concord-consortium/otrunk/tree/trunk) always represent
the latest code checked into the Subversion `trunk` branch.

We have made small changes to the Molecular Workbench codebase and we are maintaining these in
the `master` branch of the git mirror here: [concord-consortium/mw](https://github.com/concord-consortium/mw).

1. `:maven`

    Concord's sensor applet framework uses the `:maven` build strategy:

        'sensor-applets' => { :build_type => :maven,
                              :build => MAVEN_STD_CLEAN_BUILD,
                              :repository => 'git://github.com/concord-consortium/sensor-applets.git',
                              :branch => 'master',
                              :path => 'org/concord/sensor/sensor-applets',
                              :has_applet_class => true,
                              :sign => true },

    The `master` branch of the sensor-applets repo will be checked out into `./java/sensor-applets` and be built using Maven.
    Because the sensor-applets jar is used with native libraries, it must also be signed.

    **Deploying both signed and unsigned jars**

    Concord's Molecular Workbench also uses the `:maven` build strategy however when running
    it as a Java Web Start jnlp it needs to be signed while normally when run as an applet it
    should be unsigned.

        'mw'             => { :build_type => :maven,
                              :build => MAVEN_STD_CLEAN_BUILD,
                              :repository => 'git://github.com/concord-consortium/mw.git',
                              :branch => 'master',
                              :path => 'org/concord/modeler',
                              :main_class => "org.concord.modeler.ModelerLauncher",
                              :has_applet_class => true,
                              :sign => true,
                              :also_unsigned => true }

    By setting both the `:sign` and `:also_unsigned` options to `true` two jars will be deployed:

    - `jnlp/org/concord/modeler/mw.jar`
    - `jnlp/org/concord/modeler/unsigned/mw.jar`

3. `:ant`
4. `:custom`

    For Energy2D a `:custom` build strategy is used and the command line invocation necessary is in the
    `MANUAL_JAR_BUILD` constant.

        'energy2d' => { :repository => 'git://github.com/concord-consortium/energy2d.git',
                        :branch => 'trunk',
                        :path => 'org/concord/energy2d',
                        :build_type => :custom,
                        :version => '0.1.0',
                        :build => MANUAL_JAR_BUILD,
                        :has_applet_class => true,
                        :sign => false }

    In this case `MANUAL_JAR_BUILD` has been defined as:

        MANUAL_JAR_BUILD = "rm -rf bin; mkdir bin; find src -name *.java | xargs javac -target 5 -sourcepath src -d bin"

4. `:copy_jars`
5. `:download`

    goio-jna uses the `:download` build strategy:

        'goio-jna'       => { :build_type => :download,
                              :url => 'http://source.concord.org/nexus/content/repositories/cc-repo-internal-snapshot/org/concord/sensor/goio-jna/1.0-SNAPSHOT/goio-jna-1.0-20121109.222028-22.jar',
                              :version => '1.0-20121109.222028-22',
                              :path => 'org/concord/sensor/goio-jna',
                              :sign => true }

The script that runs the checkout-build-pack-sign-deploy can either operate on ALL projects specified or on a smaller number.

Running `script/build-and-deploy-jars.rb` with no arguments operates on all projects listed in config/java-projects.rb.

Optionally you can specify one or more projects to operate on. This builds just sensor and sensor-applets:

    script/build-and-deploy-jars.rb sensor sensor-applets

The Jar resources deployed to the `server/public/jnlp` directory include a timestamp in the deployed artifact so unless you specifically
request an earlier version you will always get the latest version deployed.

##### Working with the Sensor projects source

Most of the sensor related java jars are being downloaded as jars, not
compiled from source. If you're interested in building them from source:

1. Clone the [concord-consortium/sensor-projects](https://github.com/concord-consortium/sensor-projects) repo:

        git clone https://github.com/concord-consortium/sensor-projects.git sensor-projects

    sensor-projects includes these resources:

        sensor-projects/
          README
          ftdi-serial-wrapper/
          goio-jna/
          labpro-usb-jna/
          labquest-jna/
          pasco-jna/
          pom.xml/
          sensor/
          sensor-native/
          sensor-pasco/
          sensor-vernier/

2. Link the individual project folder into `java/`

        rm -rf java/goio-jna
        ln -s /path/to/sensor-projects/goio-jna java/goio-jna

3. Update `config/java-projects.rb` to use a `:maven` type build, but *without* `:repo` or `:branch` specified

        'goio-jna'  => { :build_type => :maven,
                         :build => MAVEN_STD_CLEAN_BUILD,
                         :path => 'org/concord/sensor/goio-jna',
                         :sign => true }

4. Rebuild the project using `script/build-and-deploy-jars.rb`

        script/build-and-deploy-jars.rb --maven-update goio-jna

5. Repeat 2 - 4 for any other projects you'd like to build from source

##### JnlpApp Rack Application Service

The Rails server has a Rack application `JnlpApp` mounted at the route `/jnlp` for servicing requests for Java jar resources.

The `JnlpApp` Rack application uses the `Rack::Jnlp` middleware defined here `server/lib/rack/jnlp.rb`.

Normally versions for jars can only be specified by using a jnlp form. A jnlp form of specification can be used for webstart and also for applets.

The older form of applet invocation that uses the <applet> html element normally can't specify version numbers for jar dependencies, however the Jnlp::Rack application included with Lab does allow version specification.

Example: right now on my local system there are two different versions of the vernier-goio-macosx-x86_64-nar.jar:

    $ ls -l server/public/jnlp/org/concord/sensor/vernier/vernier-goio/vernier-goio-macosx-x86_64-nar*
      98396 May 28 01:55 ../org/concord/sensor/vernier/vernier-goio/vernier-goio-macosx-x86_64-nar__V1.5.0-20101012.203835-2.jar
      99103 May 28 16:40 ../org/concord/sensor/vernier/vernier-goio/vernier-goio-macosx-x86_64-nar__V1.5.0-20120528.164030-3.jar

Note the different lengths for the two different versions.

If a request comes in from Java for vernier-goio-macosx-x86_64-nar.jar the most recent version is returned:

    $ curl --user-agent java -I http://localhost:3000/jnlp/org/concord/sensor/vernier/vernier-goio/vernier-goio-macosx-x86_64-nar.jar
    HTTP/1.1 200 OK
    Last-Modified: Mon, 28 May 2012 20:40:34 GMT
    Content-Type: application/java-archive
    Content-Length: 99103

However the version number can be added as a http query parameter.

    $ curl --user-agent java -I http://localhost:3000/jnlp/org/concord/sensor/vernier/vernier-goio/vernier-goio-macosx-x86_64-nar.jar?version-id=1.5.0-20101012.203835-2
    HTTP/1.1 200 OK
    Last-Modified: Mon, 28 May 2012 05:55:05 GMT
    Content-Type: application/java-archive
    Content-Length: 98396
    x-java-jnlp-version-id: 1.5.0-20101012.203835-2

Note that in the response the x-java-jnlp-version-id HTTP header is added with teh actual version.

This feature of specifying versioned jar resources should NOT be used for production because Java won't properly cache the jar locally. Eveytime a request is made for a jar with a version-id query parameter the complete jar will be downloaded again.

When a version is specified in a jnlp form for an applet the jar WILL be cached properly.

**Development Note**: If the applets no longer operate properly it may be that the server is no longer operating properly
and needs to be restarted. The Java console log for the applet may show requests made for jars that are not fulfilled.

If a request like the following produces an error:

    $ curl --user-agent java -I http://localhost:3000/jnlp/org/concord/sensor-native/sensor-native.jar
    HTTP/1.1 500 Internal Server Error

Restart the server and the request should now succeed:

    $ curl --user-agent java -I http://localhost:3000/jnlp/org/concord/sensor-native/sensor-native.jar
    HTTP/1.1 200 OK
    Last-Modified: Thu, 07 Jun 2012 16:44:28 GMT
    Content-Type: application/java-archive
    Content-Length: 34632
    content-encoding: pack200-gzip

## Project Configuration

Configuration variables used by the runtime JavaScript code are available in the JavaScript global
object `Lab.config`.

In a full build environment the JavaScript configuration is set in the `:jsconfg` section of
`config/config.yml`:

    :jsconfig:
      :sharing: true
      :home: http://lab.concord.org
      :homeInteractivePath: /examples/interactives/interactive.html
      :homeEmbeddablePath: /examples/interactives/embeddable.html
      :utmCampaign: <external-campaign-key>

**`sharing`** A boolean attribute used to determine if the **Share** link in the Interactives will be enabled.
The default value for this is `true`.

**`home`** Url used to reference cannonical site when sharing is turned off.

**`homeInteractivePath`** Path to page to run non-embeddable version of Interactives.

**`homeEmbeddablePath`** Path to page to run embeddable version of Interactives.

**`utmCampaign`** If present a UTM suffix is added to links in the About box.
Set to a string which identifies the external organization.

When the build environment is active these values are used to generate JavaScript code integrated
into the project by the Ruby program:
[`script/generate-js-config.rb`](https://github.com/concord-consortium/lab/blob/master/script/generate-js-config.rb)

### Interactive Share link

Normally the **Share** link in an Interactive is enabled. The **Share** dialog allows a user to more easily
share the Interactive in an email or IM, and also provides generated HTML content that can be copied and pasted
to embed the Interactive into a blog or web page.

If you are hosting this content on an external server where supporting
sharing is impractical in some manner you can disable the display of the Interactive **Share** link by setting
`:sharing` in `config/config.yml` to `false`:

    :jsconfig:
      :sharing: false
      :home: http://lab.concord.org
      :homeInteractivePath: /examples/interactives/interactive.html
      :homeEmbeddablePath: /examples/interactives/embeddable.html
      :utmCampaign: <external-campaign-key>

The additional values for `:home`, `homeInteractivePath`, and `homeEmbeddablePath` are used to construct an
additional paragraph in the Interactive **About** box providing a link to the Interactive on the production
[site for the project](http://lab.concord.org).

The value for `utmCampaign` is optional. If present and the **home** site has enabled Google Analytics
setting a value for `utmCampaign` will allow better tracking of users who click through links in the
Interactive **About** box.

### Google Analytics

In addition there is a optional section in `config/config.yml` which if present enables embedding google
analytics script into the head of the main `index.html` and all html pages in the `examples/` and `doc/`
directories. This includes all the Interactives which are located in `examples/interactives` directory.

Include your Google Analytics account number here to enable insertion of the Google Analytics
script by the build system into the generated HTML pages.

    :google_analytics:
      :account_id: <account-id>

The content from which the embedded Google Analytics script is generated is contained in this Ruby file:
[`script/setup.rb`](https://github.com/concord-consortium/lab/blob/master/script/setup.rb).

### Limitations changing configuration in an archive distribution

If you have downloaded a distribution archive you can manually modify the code that initializes the JavaScript
runtime configuration in the files: `lab/lab.js` and `lab/lab.min.js`. Editing the value for `Lab.config.sharing`
in these files will affect the JavaScript runtime settings when these files are loaded.

Additionally you can turn on UTM suffixes by adding a string value to `Lab.config.utmCampaign``.

However generation and insertion of the Google Analytics script into HTML pages can only be done by
setting a value for the `:google_analytics :account_id` and running the build process.

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

## Continuous Integration on travis-ci

[travis-ci](http://travis-ci.org) is a free open-source web-based distributed continuous integration system.

When code is checked in to the master branch the [concord-consortium/lab](http://travis-ci.org/#!/concord-consortium/lab)
project on [travis-ci](http://travis-ci.org) automatically runs all the unit tests.

If any test fails the author of the commit will get an email as well the developers listed in the
[.travis.yml](https://github.com/concord-consortium/lab/blob/master/.travis.yml) configuration file.

### Setting up travis-ci integration

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

## Measuring Performance

The [Complex Atoms Model](http://lab.dev.concord.org/examples/complex-atoms-model/complex-atoms-model.html)
includes several features for estimating and measuring performance of the molecular modeler.

1. End of **Stats** section displays average number of model steps/s.

2. **Run Benchmarks** button stops model and measures time for running the model
   100 steps and also time for running the model and rendering the graphics for 100
   steps. When measuring the speed of the model and graphics together the test is run
   continuously and control is *not* returned to the browser for repainting the screen.

3. A separate [lab.performance](https://github.com/concord-consortium/lab) repository with a
   Ruby script [performance.rb](https://github.com/concord-consortium/lab) available which
   uses Selenium Webdriver to automate running the **Run Benchmarks** test 10 times and
   collects , averages, and reports the results.

### Installing and using `performance.rb`

We use a completely separate repository for the performance monitoring tools so the
same performance mesuring scripts can be used to measure performance over a range of
commits to the Lab project. This  makes it easier to monitor performance and investigate
performance regressions.

In your working copy of the Lab project:

    git checkout git://github.com/concord-consortium/lab.performance.git

Edit paths in the file `lab.performance/performance.rb` to reference locations for FireFox and Chrome
on your computer as well as the variable `URL_TO_COMPLEX_MODEL` for running the
[Complex Atoms Model](http://lab.dev.concord.org/examples/complex-atoms-model/complex-atoms-model.html)
locally.

Gem prequisites: [selenium-webdriver](http://code.google.com/p/selenium/wiki/RubyBindings)

    gem install selenium-webdriver

**Measuring performance:**

    $ ./lab.performance/performance.rb

    browser: Chrome: 19.0.1085.0, Intel Mac OS X 10_6_8
    Date: 2012-03-30 08:44
    Molecule number: 50
    Temperature: 5

    git commit
    commit 2c3a9328a43964485ed5f661cfb6e6cc6850ce95
    Author: Stephen Bannasch <stephen.bannasch@gmail.com>
    Date:   Fri Mar 30 08:44:05 2012 -0400

        whitespace fixups
    true

    average steps                  167.30
    average steps w/graphics       101.63

## Repository structure

### Summary of Directories in `src/`

#### `src/lab`

The **`src/lab`** directory includes JavaScript source code for the Lab JavaScript modules.
During the build process individual files are copied into modules which are placed in
the **`server/public/lab`** directory.

#### `src/examples/`, `src/doc/`, and `src/experiments/`

The **`src/examples/`**, **`src/doc/`**, and **`src/experiments/`** directories contain additional
resources for generating the html, css, and image resources for the matching target
folders in **`server/public`**.

**Note:** remember to make changes you want saved in the **`src/examples/`**, **`src/doc/`**,
and **`src/experiments/`** and not in the target directories of the same names in
**`server/public`**. Change made in **`server/public`** will be overwritten during the next
build process.

#### `src/vendor`

[Third-party JavaScript runtime dependencies](#javascript-library-runtime-dependencies)
for Lab are located in the **`src/vendor`** directory and are installed as git submodules
the first time `make` is run in a new checkout of the source code repository.

Only the necessary JavaScript library files and other resources needed for runtime operation along
with the associated README and LICENSE files are copied to **`server/public/vendor`** during
the build process.

All of the files copied to **`server/public/vendor`** are licensed and distributed under
one or more of the following licenses: [Simplified BSD](http://www.opensource.org/licenses/BSD-2-Clause),
[The BSD 3-Clause](http://www.opensource.org/licenses/BSD-3-Clause),
[MIT](http://www.opensource.org/licenses/MIT), or
[Apache 2.0](http://www.opensource.org/licenses/Apache-2.0).

#### `src/resources`

The **`src/resources`** directory contains image resources and are copied directly to
**`server/public/resources`**.

#### `src/sass`

The **`src/sass`** directory contains Sass templates and the Bourbon Sass library are are used
during the build process to generate CSS resources.

#### `src/helpers`

The **`src/helpers`** directory contains CoffeeScript and JavaScript modules as well as Ruby programs
only used as part of the testing and build process and are not copied to **`server/public/resources`**.

#### `src/jnlp`

The **`src/jnlp`** directory currently contains the Vernier GoIO Java sensor Jars. While these
files are needed to use Vernier GoIO sensor in the browser normally there are no compiled
artifacts included in either the Lab repository or referenced and used by the Lab either
as external git submodules or as separately downloaded Java projects. The presence of these
specific files is temporary until I can recreate or redevelop the specifc combination of Java,
Vernier GoIO native libraries and JNI code generated by SWIG used 18 months ago to create
these resources at Concord Consortium.

### Lab Modules: `src/lab`

The source code for the Lab modules is all contained in
**[`src/lab`](https://github.com/concord-consortium/lab/tree/master/src/lab)**:

- [`src/lab/md2d`](https://github.com/concord-consortium/lab/tree/master/src/lab/md2d)
- [`src/lab/energy2d`](https://github.com/concord-consortium/lab/tree/master/src/lab/energy2d)
- [`src/lab/grapher`](https://github.com/concord-consortium/lab/tree/master/src/lab/grapher)
- [`src/lab/common`](https://github.com/concord-consortium/lab/tree/master/src/lab/common)

The list above presents independent modules built as separate sub-libraries (`md2d`, `energy2d`, `grapher`)
and one directory which contains common utilities and modules (`common`).

### Lab Modeling Engines: `md2d` and `energy2d`

#### 2D Molecular Dynamics: [`md2d`](https://github.com/concord-consortium/lab/tree/master/src/lab/md2d)

[`md2d`](https://github.com/concord-consortium/lab/tree/master/src/lab/md2d) module contains a basic *Next Gen Molecular Workbench* application. It built over MVC design
pattern and consist of following units:

- Models - [`src/lab/md2d/models`](https://github.com/concord-consortium/lab/tree/master/src/lab/md2d/models)
- Views - [`src/lab/md2d/views`](https://github.com/concord-consortium/lab/tree/master/src/lab/md2d/views)
- Controllers - [`src/lab/md2d/controllers`](https://github.com/concord-consortium/lab/tree/master/src/lab/md2d/controllers)

The source code of the core molecular dynamics engine is currently located in the
[`src/lab/md2d/models/engine`](https://github.com/concord-
consortium/lab/tree/master/src/lab/md2d/models/engine) directory, which is organized as a set of
related RequireJS modules. These modules are compatible both with the Web browser environment and
Node.

##### MD2D Headless Mode

###### [`node-bin/run-md2d`](https://github.com/concord-consortium/lab/blob/master/node-bin/run-md2d)

There is one working script for now:
[`node-bin/run-md2d`](https://github.com/concord-consortium/lab/blob/master/node-bin/run-md2d)

It runs simulation for desired time and prints Time, Kinetic Energy, Total Energy every tick.

Usage:

    ./node-bin/run-md2d -i [path] -o [path or stdout] -i [num]

    Options:
      -i, --input   Model JSON file        [string]  [required]
      -o, --output  Output file or stdout  [string]  [default: "stdout"]
      -t, --time    Integration time       [default: 100]

Example results:

    Model file: server/public/imports/legacy-mw-content/converted/new-examples-for-nextgen/simple-gas$0.json
    Output: stdout
    Integration time: 150
    time    KE      TE
    0       3.0988  3.1003
    50      3.1748  3.1011
    100     3.1748  3.0998
    150     3.1868  3.0986

###### Writing new scripts

In addition, new Node-based executables can be written. These are expected to be useful for verifying and tuning the model by running the model headless and saving summary results into a file for offline analysis.

If you want to create your own script running simulation in headless mode, the most reasonable solution is to use [`src/lab/md2d/models/modeler.js`](https://github.com/concord-
consortium/lab/blob/master/src/lab/md2d/models/modeler.js) as it provides high level API and
allows to load model description using JSON file. To run simulation use the `tick()` method.

[RequireJS](https://http://requirejs.org/) package must be correctly configured and used to load this module (see [the section about
RequireJS](#javascript-dependency-management-and-build-process---requrejs)). It also depends on [jQuery](http://jquery.com/) and [d3.js](http://mbostock.github.com/d3/) libraries.

Fortunately, you do not have to think about this configuration each time. There is prepared the entry point for external Node.js applications:

[`src/helpers/md2d/md2d-node-api.js`](https://github.com/concord-consortium/lab/blob/master/src/helpers/md2d/md2d-node-api.js)

This module configures RequireJS loader, environment (D3, jQuery) and exports MD2D Node API using Node.js/CommonJS approach.

Usage:

    var md2dAPI = require("../src/helpers/md2d/md2d-node-api");
    // (...)
    // To create e.g. Modeler mentioned above:
    var model = md2dAPI.Modeler(properties);

If you need to use something what is not included in this API, you can:

- Extend API defined in [`md2d-node-api.js`](https://github.com/concord-consortium/lab/blob/master/src/helpers/md2d/md2d-node-api.js). It should easy to do it looking at the existing code.
- Configure RequireJS yourself and use it to load module. Again, take a look at [`md2d-node-api.js`](https://github.com/concord-consortium/lab/blob/master/src/helpers/md2d/md2d-node-api.js) how to do it.

There is a chance that existing RequireJS config won't be sufficient (e.g. if you wan't to use dynamic cs files loading).

- The official, complete documentation:

  [http://requirejs.org/docs/api.html#config](http://requirejs.org/docs/api.html#config)

- RequireJS config for tests, as they also use similar approach:

  [`test/requirejs-config.js`](https://github.com/concord-consortium/lab/blob/master/test/requirejs-config.js)


Hashbang scripts for starting these executables (i.e., files which start with the line
`#!/usr/bin/env node` and which have the execute bit set) should be placed in the directory
[`node-bin`](https://github.com/concord-consortium/lab/tree/master/node-bin). Lab's
[`packages.json`](https://github.com/concord-consortium/lab/blob/master/package.json) file
specifies [`node-bin`](https://github.com/concord-consortium/lab/tree/master/node-bin) as the
location of the executable scripts which `npm` should make available whenever Lab is imported into
another project as a Node module. (For developer convenience, `bin/` is being reserved for Ruby
executables made available via Bundler.)

##### MD2D simulation stepping

Main parameters which define speed and accuracy of simulation in MD2D are:

- timeStep,
- viewRefreshInterval,
- modelSampleRate.

To explain them let's start from the definition of the model "tick". One "tick" consists of:

- running simulation for **viewRefreshInterval** * **timeStep** femtoseconds,
- update of the view.

The "tick" is constantly repeated while simulation is running.

So, when viewRefreshInterval = 50 and timeStep = 1fs, one "tick" causes that the engine performs calculations for 50fs.

**timeStep** defines a time value used during the one integration step in the engine internals. It affects accuracy of calculations.
**viewRefreshInterval** in fact defines number of these integration steps during one "tick". It is defined because it makes no sense to refresh view too often.

Using pseudo-code we can say that tick is:

    for (i = 0 to viewRefreshInterval) {
       engine.advanceBy(timeStep)
    }
    view.update()

That's why viewRefreshInterval = 50 and timeStep = 1fs is different from viewRefreshInterval = 25 and timeStep = 2fs.
First one will be more accurate and two times slower (more or less) than second one, however both configurations will cause that one "tick" advance model by 50fs (25 * 2fs or 50 * 1fs).

**modelSampleRate** defines how often we should execute "tick". Of course, in most cases we should call it as often as it's possible and that's the default behavior (with upper limit of 60 times per second to avoid running simple models too fast).

You can test how these parameters work using [this interactive](http://lab.dev.concord.org/examples/interactives/interactives.html#interactives/basic-examples/sample-rate-and-refresh-rate.json).

#### 2D Thermal Energy: [`energy2d`](https://github.com/concord-consortium/lab/tree/master/src/lab/energy2d)

[`energy2d`](https://github.com/concord-consortium/lab/tree/master/src/lab/energy2d) module contains
a basic *Energy2D* application. It is a direct port of [Java Energy2D](http://energy.concord.org/energy2d/).
Energy2D is also built over MVC design pattern and consist of following units:

- Models - [`src/lab/energy2d/models`](https://github.com/concord-consortium/lab/tree/master/src/lab/energy2d/models)
- Views - [`src/lab/energy2d/views`](https://github.com/concord-consortium/lab/tree/master/src/lab/energy2d/views)
- Controllers - [`src/lab/energy2d/controllers`](https://github.com/concord-consortium/lab/tree/master/src/lab/energy2d/controllers)

and additionally:

- Internal Utils - [`src/lab/energy2d/utils`](https://github.com/concord-consortium/lab/tree/master/src/lab/energy2d/utils)
- GPU Toolkit - [`src/lab/energy2d/gpu`](https://github.com/concord-consortium/lab/tree/master/src/lab/energy2d/gpu)

GPU Toolkit is a small set of utilities which wraps basic WebGL structures and objects, providing
higher level API. It is useful, as Energy2D uses WebGL for General-Purpose Computing on
Graphics Processing Unit. So, a lot of physics calculations are performed on the GPU if user's Web
browser supports WebGL technology.

The source code of the core physics engine is located in the [`src/lab/energy2d/models`](https://github.com/concord-consortium/lab/tree/master/src/lab/energy2d/models) directory.
Especially important units are listed below:

- Core Model [`src/lab/energy2d/models/core-model.js`](https://github.com/concord-consortium/lab/blob/master/src/lab/energy2d/models/core-model.js) - constructs all physics solvers,
stores simulation data (arrays, textures) and delegates physics calculations to proper objects.
- Physics Solvers [`src/lab/energy2d/models/physics-solvers`](https://github.com/concord-consortium/lab/tree/master/src/lab/energy2d/models/physics-solvers) - directory containing sequential
(plain JavaScritp) implementation of physics algorithms used by core model.
- Physics Solvers GPU [`src/lab/energy2d/models/physics-solvers-gpu`](https://github.com/concord-consortium/lab/tree/master/src/lab/energy2d/models/physics-solvers-gpu) - directory containing parallel
implementation (WebGL-based) of heat and fluid solvers.

Necessary GLSL (GL Shading Language) sources are stored in separate files. They are loaded using
RequireJS *text* plug-in which just allows to load plain text files. Finally, they are inlined in
the resulting library due to the RequireJS optimization process.

### JavaScript Dependency Management and Build Process - RequreJS

Lab's modules use [RequireJS](http://requirejs.org/) for dependency management. It is a JavaScript
file and module loader optimized for in-browser use, but it can be used in other JavaScript
environments, like Rhino and Node. So, you don't have to worry about manual JavaScript files
concatenation and the library build process - everything is done automatically.

[RequireJS](http://requirejs.org/) might be used for fully asynchronous in-browser module loading,
but it can also be used for combining all source files into one output JavaScript file. The Lab
project mostly uses the second approach. The tool which resolves all dependencies and combines them
into single output file is called **RequireJS Optimizer**.

Useful RequireJS resources:

- [How to get started with RequireJS](http://requirejs.org/docs/start.html)
- [RequireJS API](http://requirejs.org/docs/api.html)
- [RequireJS Optimization](http://requirejs.org/docs/optimization.html)
- [RequireJS in Node](http://requirejs.org/docs/node.html)
- [RequireJS Google Group](https://groups.google.com/forum/?fromgroups#!forum/requirejs)


#### Adding new source file intended to work in the Web browser

Adding a new source to existing module is straightforward.

1. Put the source file in an appropriate directory (e.g. `src/lab/module-name/`).

2. Define it as a module using RequireJS syntax, e.g. following this pattern:

        define(function (require) {
          // Dependencies.
          var utils = require('other-module-name/file-name');
          // Preparation code.
          // (...)
          // Finally, return module API.
          return {
            // (...)
          };
          // Or just constructor function:
          // return function ClassName() {
          //   (...)
          // };
        });

    You can read more about RequireJS modules syntax
    [here](http://requirejs.org/docs/api.html#define).


3. In case of need, reference this file in other sources using RequireJS syntax:

          var dependency = require('module-name/file-name');

That's all! Your file will be automatically included during module build process.

#### Adding new source file intended to work in the Web browser and in Node

If you are working on file which should also work in the Node environment as a typical package
(without using RequireJS as a dependency and its syntax), follow instructions above and
additionally:

1. Add following snippet at the beginning of the source file:

        if (typeof define !== 'function') { var define = require('amdefine')(module) }

2. Make sure that `amdefine` package is listed as a dependency in your `package.json` file (it can be
Lab's [`packages.json`](https://github.com/concord-consortium/lab/blob/master/package.json) file
or separate one if you work on the independent module, like those stored in
[`src/modules`](https://github.com/concord-consortium/lab/tree/master/src/modules) directory).

The Lab's **array** module uses this technique, so you may look for a reference in
[`src/modules/arrays`](https://github.com/concord-consortium/lab/tree/master/src/modules/arrays).


#### Adding new module which should be built as a separate library

This involves a few additional steps comparing with adding a single source file.

1. Create a new directory in `src/lab`.
2. Put all related sources there or in `src/lab/common` (if you think that they are generic enough
and may be reused by other modules).
3. Define `module-name.build.js` and `public-api.js` files in your new directory (described below).
4. Add build routines to the [`Makefile`](https://github.com/concord-consortium/lab/blob/master/Makefile):

    4.1. Define a new target, for example:

        server/public/lab/lab.module-name.js: \
            $(NEW_MODULE_SRC_FILES) \
            $(COMMON_SRC_FILES)
            $(R_OPTIMIZER) -o src/lab/module-name/module-name.build.js

    4.2. List this target in `LAB_JS_FILES` Makefile variable containing the list of all Lab JavaScript
      modules to be generated.

Your module will be built during Lab's build process. You may use one of the existing modules for
reference in case of any troubles
([`md2d`](https://github.com/concord-consortium/lab/tree/master/src/lab/md2d),
[`energy2d`](https://github.com/concord-consortium/lab/tree/master/src/lab/energy2d) or
[`grapher`](https://github.com/concord-consortium/lab/tree/master/src/lab/grapher)).

#### Module Build Configuration - *.build.js file

Each Lab's module contains file `name.build.js`. It is a RequireJS Optimizer build profile. Useful,
related resources:

- [RequireJS Build Profile Help](http://requirejs.org/docs/optimization.html#wholeproject)
- [Example Build File with All Options
Documented](https://github.com/jrburke/r.js/blob/master/build/example.build.js)

**If you create new build file, make sure that you use one of the existing build profiles as a
reference!** It will enforce consistent style and options across all Lab's modules.

Lab's build profiles use [almond](https://github.com/jrburke/almond) module - a replacement AMD
loader for RequireJS. It is a smaller "shim" loader, providing the minimal AMD API footprint that
includes loader plugin support.

Why? [almond](https://github.com/jrburke/almond) allows us to create the resulting library which is
totally independent from RequireJS. It is a reasonable approach as RequireJS is used only for module
definition, dependency resolving and building a single file library using Optimizer. The
asynchronous module loading is not utilized by the final Lab library, so there is no need to force
users to load whole RequireJS library. Instead, use and include minimalistic RequireJS API
replacement.

#### Module Public API - public-api.js file

If module exposes API using global variables, it should define it in `public-api.js` file. It is
a typical RequireJS module, which just adds properties to `window` object. You can look at
[`src/md2d/public-api.js`](https://github.com/concord-consortium/lab/blob/master/src/lab/md2d/public-api.js),
[`src/energy2d/public-api.js`](https://github.com/concord-consortium/lab/blob/master/src/lab/energy2d/public-api.js)
or [`src/grapher/public-api.js`](https://github.com/concord-consortium/lab/blob/master/src/lab/grapher/public-api.js)
file for a reference.

This files are **not necessary**, but **highly recommended** if module has to define some global
variables. It is a convention used internally by Lab repository. Such files are enforcing clean
definition of public API exposed by modules. Developers will have certainty that all global
variables are defined **there and only there**.

Execution of this script should be enforced by build profile (*.build.js files described above).
Most often is done by `wrap` option:

      // Protect global namespace and call Public API export.
      wrap: {
        start: "(function() {",
        // Almond by default simulates async call of require (sets timeout).
        // Last argument (true) forces sync call instead.
        end: "require(['module-name/public-api'], undefined, undefined, true); }());"
      }

#### CoffeeScript Files Support

The Lab project is configured to easily support CoffeeScript sources. RequireJS plugin called
**require-cs** is used for dynamic loading of CoffeeScript sources.

To enable CoffeeScript support, make sure that module's build profile (see section about *.build.js
files) contains following options:

    // Additional modules.
    paths: {
    'cs' :'../vendor/require-cs/cs',
    'coffee-script': '../vendor/coffee-script/extras/coffee-script'
    },
    //Stub out the cs module after a build since
    //it will not be needed.
    stubModules: ['cs'],
    // The optimization will load CoffeeScript to convert
    // the CoffeeScript files to plain JS. Use the exclude
    // directive so that the coffee-script module is not included
    // in the built file.
    exclude: ['coffee-script']

`md2d` module has CoffeeScript support enabled, so you can use
[its build profile](https://github.com/concord-consortium/lab/blob/master/src/lab/md2d/md2d.build.js)
as a reference.



- To define a CoffeeScript module just use typical RequireJS syntax converted to CoffeeScript:

        define (require) ->
          # Dependencies.
          CoffeeScriptDependency = require 'cs!other-module-name/file-name'
          JavaScriptDependency   = require 'module-name/file-name'

          class SomeClass extends BaseClass
          // (...)

- You can also load CoffeeScript in JavaScript files:

        define(function (require) {
          // Dependencies.
          var CoffeeScriptDependency = require('cs!module-name/file-name');
          // (...)

Just remember about **cs!** prefix in paths when loading CoffeeScript sources. RequireJS Optimizer
will convert such files to plain JavaScript and include them in the final library.

### Generated Examples: `server/public/examples/`

The `server/public/examples/` directory is automatically generated running `make` and is not part of the repository.

When `bin/guard` is running any changes to files in the `src/examples/` directory cause automatic rebuilding
of the associated files in the `server/public/examples/` directory.

### HTML and CSS Generation

[Haml](http://haml-lang.com/) is used to generate most of the HTML in the `server/public/` directory.

[kramdown](http://kramdown.rubyforge.org/) is used to generate `readme.html` in `server/public/` from Mardown markup.

[Sass](http://sass-lang.com/) is used to generate the CSS assets. The Sass markup may be in the form of
`*.sass` or `*.scss` files

The [Bourbon](http://thoughtbot.com/bourbon/) library of Sass mixins is included.

- [Bourbon documentation](http://thoughtbot.com/bourbon/)
- [ASCIIcast 330: Better SASS With Bourbon](http://asciicasts.com/episodes/330-better-sass-with-bourbon)
- [Introducing Bourbon Sass Mixins](http://robots.thoughtbot.com/post/7846399901/introducing-bourbon-sass-mixins)


## Testing: `test/`

Lab's JavaScript tests use [Vows](http://vowsjs.org), an asynchronous behavior driven framework based
on [Node.js](http://nodejs.org/). In addition Lab uses [jsdom](https://github.com/tmpvar/jsdom), a
lightweight CommonJS implementation of the W3C DOM specifications. Lab's test setup was inspired
by that used by [d3.js](http://mbostock.github.com/d3/). The development dependencies for running the
tests are installed using [npm](http://npmjs.org/).

Running the tests:

    $ make test
    ................................. . . .. . . .
    x OK > 40 honored (0.012s)

If you are running `bin/guard` the tests run automatically anytime a change is made in the JavaScript
files in the `src/` or `test/` directory.

The results of the tests are displayed in the console that `bin/guard` is running in.

If the bottom of the console window is viewable you will see new test results whenever you save a changes.

Recent versions of nodejs/v8 support TypedArrays -- this make it possible to more extensively
test lab.arrays which is designed to support using either typed or regular arrays for computation.

`test/env.js` uses the node module [jsdom](https://github.com/tmpvar/jsdom) to setup resources for
simple emulation of a browser.

[Vows](http://vowsjs.org) integrates the [standard nodejs assertions](http://nodejs.org/docs/latest/api/assert.html)
with an additional collection of useful [assertions](http://vowsjs.org/#assertions) summarized below:

- numerical

        assert.greater (3, 2);
        assert.lesser (2, 3);
        assert.inDelta (Math.random(), 0, 1);

- equality

        assert.equal          (4, 4);
        assert.strictEqual    (4 > 2, true);
        assert.notEqual       (4, 2);
        assert.strictNotEqual (1, true);
        assert.deepEqual      ([4, 2], [4, 2]);
        assert.notDeepEqual   ([4, 2], [2, 4]);

- type

        assert.isFunction (function () {});
        assert.isObject   ({goo:true});
        assert.isString   ('goo');
        assert.isArray    ([4, 2]);
        assert.isNumber   (42);
        assert.isBoolean  (true);
        assert.typeOf     (42, 'number');
        assert.instanceOf ([], Array);

- truth

        assert.isTrue  (true);
        assert.isFalse (false);

- null, undefined, NaN

        assert.isNull      (null);
        assert.isNotNull   (undefined);
        assert.isUndefined ('goo'[9]);
        assert.isNaN       (0/0);

- inclusion

        assert.include ([4, 2, 0], 2);
        assert.include ({goo:true}, 'goo');
        assert.include ('goo', 'o');

- regexp matching

        assert.match ('hello', /^[a-z]+/);

- length

        assert.length ([4, 2, 0], 3);
        assert.length ('goo', 3);  *** not working ***

- emptiness

        assert.isEmpty ([]);
        assert.isEmpty ({});
        assert.isEmpty ("");

- exceptions

        assert.throws(function () { x + x }, ReferenceError);
        assert.doesNotThrow(function () { 1 + 1 }, Error);

Additionally `test/env-assert.js` has a number of useful additional assertions copied from
[d3.js](http://mbostock.github.com/d3/).

_**Note**: Using a more specific assertion usually results in more useful error reports._

There are also many interesting test examples and patterns in the
[d3.js test directory](https://github.com/mbostock/d3/tree/master/test) that can be adapted for use in Lab.

### A Simple Example of Test Driven Development

Here's a simple example that is part of the tests for `lab.arrays.js` to test the `arrays.max()` function:

    "find max in array with negative and positive numbers": function(max) {
      assert.equal(max([3, -1, 0, 1, 2, 3]), 3);
    },

The 'model stepping' tests are a good example where the tests help helped drive new features. The basic
features I was testing in this section relate to the existing functionality exposed by the Stop, Start, Go, and
Reset buttons as wells as the extended keyboard controls that allow stepping forward and backwards a step at a time.

First I created this test that passed:

    "after running running one tick the model is at step 1": function(model) {
      model.tick();
      assert.equal(model.stepCounter(), 1);
      assert.isTrue(model.isNewStep());
    },

In thinking about driving out changes to KE, PE and Temperature of the molecular model itself I realized
I'd like the capability to run a specific number of steps forward and then check the results.

I then wrote this test that failed -- because the model.tick() function didn't yet take an optional argument to
run multiple steps forward:

    "after running 9 more ticks the model is at step 10": function(model) {
      model.tick(9);
      assert.equal(model.stepCounter(), 10);
      assert.isTrue(model.isNewStep());
    },

After saving the change I saw the new test failure reported in my console. I then implemented the new
feature in the actual `src/lab/molecules.js`. Less than a second after saving the file the tests
completed and the report showed it passing.

This is a very simple example -- but part of the value of this kind of test driven development is in first
thinking of how something should behave rather than in how to get it to actually do the work.

Since I already had this function for running one model step:

    model.tick()

Adding an optional numeric argument for running more steps is a fine way to express the intent of the new feature:

    model.tick(9)

In more complicated coding thinking about how to express the intent clearly and then what the result
should be if that intent is successful **FIRST** ... and then 'driving out' the actual implementation to
achieve that result can result in a better architecture -- and of course you also end up with tests.

Because the tests run SO quickly I can interactively change the code in the module or the test and
immediately see results.

### Debugging Tests using the node debugger

Sometimes it can be helpful to break into a debugger when there is a problem in either the code
or the test setup itself. Node comes with a [debugger](http://nodejs.org/docs/latest/api/debugger.html)
which can be used in combination with vows and the tests.

First set a breakpoint by inserting the statement: `debugger;`

    suite.addBatch({
      "Thermometer": {
        topic: function() {
          debugger;
          return new components.Thermometer("#thermometer");
        },
        "creates thermometer": function(t) {
          assert.equal(t.max, 0.7)
        }
      }
    });

Start the node debugger and pass in the full command line to run the tests:

    node debug ./node_modules/vows/bin/vows --no-color

The debugger will break at the beginning of vows:

    < debugger listening on port 5858
    connecting... ok
    break in node_modules/vows/bin/vows:3
      1
      2
      3 var path   = require('path'),
      4     fs     = require('fs'),
      5     util   = require('util'),

Enter `cont` to continue execution until your breakpoint.

    debug> cont
    < ·
    < ········
    < ·
    <
    break in test/lab/components/components-test.js:13
     11   "Thermometer": {
     12     topic: function() {
     13       debugger;
     14       return new components.Thermometer("#thermometer");
     15     },

To evaluate expressions type `repl`  -- use ctrl-C to exit the repl:

    repl
    Press Ctrl + C to leave debug repl
    > initialization_options
    { model_listener: false,
      lennard_jones_forces: true,
      coulomb_forces: true }
    > atoms[0].charge
    -1

Enter **ctrl-C** to exit the repl and return to the debugger.

Enter **ctrl-D** to exit the debugger.

[node-inspector](https://github.com/dannycoates/node-inspector)
[npm package for node-inspector](http://search.npmjs.org/#/node-inspector)

#### Using node-inspector while debugging

[node-inspector](https://npmjs.org/package/node-inspector) supports using the webkit inspector in Chrome to support
interactive debugging in node. This can be particualrly help when debugging tests.

Example:

Add a debugger statement to your test:

    originalModelJson = fs.readFileSync(testDir + "expected-json/" + modelJsonFile).toString();
    modelName = /\/?([^\/]*)\.json/.exec(modelJsonFile)[1];
    debugger;
    originalModel = JSON.parse(originalModelJson);
    model = new Model(originalModel);

Start a debugging session:

    $ node --debug-brk ./node_modules/vows/bin/vows --no-color test/vows/mml-conversions/deserialize-serialize-test.js
    debugger listening on port 5858

Start node-inspector:

    $ ./node_modules/.bin/node-inspector &
    info  - socket.io started
    visit http://0.0.0.0:8080/debug?port=5858 to start debugging

## Physical constants and units

The core of the molecular dynamics engine performs computations using dimensioned quantities; we do
not nondimensionalize to reduced units.  The units used internally are:

- femtoseconds
- nanometers
- Dalton (atomic mass units)
- elementary charges
- Kelvin

(Note that we will shortly switch to representing time in picoseconds rather than femtoseconds.)

The above implies that the 'natural' unit of energy within the application is the "Dalton nm^2 /
fs^2", and the natural unit of force is the "Dalton nm / fs^2". We call these "MW Energy Units" and
"MW Force Units" respectively; however, externally-facing methods accept and report energies in
electron volts, rather than "MW Units".

The molecular dynamics engine in `src/md-engine` contains a submodule, defined in `src/md-
engine/constants/` which defines physical useful constants and allows one to perform some unit
conversions in a mnemonic way.

Once you have `require()`d the constants module appropriately, you can access the constants, 2
converter methods, and an object that defines the various units. For the following, assume the
`constants` module has been `require()`d into the variable `constants`.

### Units

The various units are available as properties of the object `constants.unit`, and are named
appropriately. The units themselves are objects, but their properties are not external API; rather,
the unit objects are expected to be passed as arguments to conversion methods which return numeric
values. Units are named in the singular and are written as all-uppercase (they are constants).

Some example units are:

- `constants.unit.JOULE` constants.unit.MW_ENERGY_UNIT` (Dalton nm^2 / fs^2, see above)
- `constants.unit.METERS_PER_FARAD`

### Physical Constants

The various constants are defined as properties of the `constants` object. However, these do not
have numerical values; instead, they each contain a single method, `as`, which accepts a unit (see
above) and returns the numerical value of that constant in terms of that unit. This is intended to
be a convenience for the programmer and to reduce the likelihood that he or she will forget to keep
track of the units in which a value is stored.

For example,

- `constants.BOLTZMANN_CONSTANT.as(constants.unit.JOULES_PER_KELVIN)` (== 1.380658e-23)
- `constants.PERMITTIVITY_OF_FREE_SPACE.as(constants.unit.FARADS_PER_METER)` (== 8.854187e-12)

### Unit conversions

The `constants` module does not attempt to do dimensional analysis (for example, converting kg m/s^2
into Newtons). However, it can convert a value between two different units that measure the same
type of quantity, and it can supply conversion ratios that make it easier to do dimensional analysis
carefully in your own code.


#### Converting a value between two unit types:

To convert the value 1kg into Daltons (aka atomic mass units), use the `convert` method:

`constants.convert(1, { from: constants.unit.KILOGRAM, to: constants.unit.DALTON })` (==
6.022137376997844e+26)

#### Finding the ratio between two unit types and rolling your own unit conversions:

To find the number of atomic masses in 1 kg, use the `ratio` method with the `per` argument:

`constants.ratio(constants.unit.DALTON, { per: constants.unit.KILOGRAM })`
(== 6.022137376997844e+26)

This form of ratio is especially useful for unit conversion, and the "per" is intended as a
mnemonic. The number reported above, for example, is easily understood to be "6.022 x 10^26 Dalton
per kilogram" and can therefore be used as a factor that "cancels" kilograms and replaces them with
Daltons in a compound unit such as "kg m/s".

However, sometimes you want the value of a Dalton expressed as kilograms. Although you *could*
reverse the units in the above function call, or divide 1 by the result above, it is better to use
the mnemonic `as` form of `ratio`:

`constants.ratio(constants.unit.DALTON, { as: constants.unit.KILOGRAM })` (== 1.66054e-27)

## Deployment

### Deploying static content to a Github gh-pages branch

Github's [github:pages](http://pages.github.com/) feature supports sharing any content in
a `gh-pages` repository branch as static web content.

The [gh-pages branch of the Lab repository](https://github.com/concord-consortium/lab/tree/gh-pages)
is used to store the static pages and client-side code built by the Makefile at the directory `server/public`.

  [concord-consortium.github.com/lab](http://concord-consortium.github.com/lab/)

In addition the content of the `gh-pages` branch is used to create the
[downloadable archive distributions of Lab](#distribution-of-project-and-examples)

The contents of the
gh-pages branch are automatically made available in a standard web-page form (as opposed to the standard Github
page for showing a repository) at this url:

  [concord-consortium.github.com/lab](http://concord-consortium.github.com/lab/)

   when you push to the gh-pages branch.

If you maintain a fork of this project on Github, you get a Github Page for free, and the
instructions below apply to you as well!

#### Making the `server/public/` folder track the gh-pages branch

If you haven't done this yet, make the `server/public` folder track the contents of the gh-pages branch.

**If you have a `Guard` process running make sure and stop it before continuing!**

    # server/public/ needs to be empty for git clone to be happy:
    rm -rf server/public

    # substitute the URL for whatever fork of the Lab repository you have write access to:
    git clone git@github.com:concord-consortium/lab.git -b gh-pages server/public

Note that `make clean` now empties the `server/public` folder in-place, leaving the Git
`server/public/.git` and `server/public/jnlp` directories intact.

#### Pushing changes to gh-pages branch

First, make sure your `server/public` folder tracks the gh-pages branch, as per the above.

Then run the following shell command in the `script/` folder:

    script/gh-pages

This script will first make sure there is nothing that isn't committed. If
there are unstaged or staged and uncommitted files the `gh-pages` script will halt.

Test and commit (or save the changes to a topic branch) and if your testing show
the bugs are fixed or the new features or examples are stable then push
these changes to the master branch and try running the `gh-pages` script again:

    git push origin master
    script/gh-pages

### Deploying to a remote server

The Lab project has a suite of scripts for creating and deploying to EC2 servers running
on Amazon Web services (AWS).

The scripts for creating, stopping and re-creating a server require an AWS account. These scrpts use
the Ruby proge

The Capistrano scripts for updating a deployment to an existing server only require that you have a copy of
the pem file associated

To deploy to AWS you will need an AWS account and the ability to create and modify EC2 instances.

If you are create a new server from scratch you will also need access to the AWS DNS service Route53.

**Note: currently there are a few steps/resources that only work properly if you have a concord.org
AWS account.**

#### AWS Setup/Prerequisites

1.  AWS account. For deployment to the lab servers managed by CC you will need an AWS
    account managed by concord.org.
2.  Create your AWS Access Key ID and AWS Secret Access Key. To do this, go to the IAM Dashboard in
    AWS (Services -> IAM), click 'Users', click the checkbox by your username, and select User Actions ->
    Manage Access Keys
3.  Copy your AWS Access Key ID and AWS Secret Access Key to the following yaml configuration
    file `.fog` in your home directory:

        :default:
          :aws_access_key_id: YOUR_AWS_ACCESS_KEY_ID
          :aws_secret_access_key: YOUR_AWS_SECRET_ACCESS_KEY

4.  Place a copy of a the appropriate AWS PEM file on your local files system. For deployment
    to the lab servers managed by CC use the `lab-dev` pem. This can be found in CC's Google Docs/Drive.
    This file should have its permissions set to 600, and the folder it is in (e.g. ~/.ec2) should be 700.
5.  Create or identify an appropriate AWS security group. For deployment to the lab servers managed
    by CC the `lab.dev` security group is used.
6.  Edit the `:deploy` section of `config/config.yml` using values in `config/config_sample.yml`
    as a guide.

    Here's an example from the `:deploy` section of a working `config.yml`:

        :deploy:
          :targets:
          - :name: lab-dev
            :url: lab.dev.concord.org
            :branch: master
          :group_name: lab.dev
          :zone_domain: concord.org.
          :zone_records_name: dev.concord.org
          :pem:
            :name: lab-dev
            :path: ~/.ec2

    There is one deploy target named `lab-dev` associated with a server running at `lab.dev.concord.org`.
    Deployments to `lab-dev` use the master branch of the repository. The `lab.dev` security group is
    used when new servers are created or existing sever are re-created.

    When a whole new server is created the DNS entry is created in the `concord.org.` zone domain and
    when searching for an existing DNS entry for a `deploy-target` the zone record name `dev.concord.org`
    is used.

    Besides the AWS Access Key ID and AWS Secret Access Key security credentials copyied locally to
    to the file `~/.fog` the `lab-dev.pem` file saved in the directory: `~/.ec2` is also used when
    communicating with AWS.

7.  List the deploy targets described in `config/config.yml` with the task: `thor cloud:list_targets`
    to confirm the configuration is valid:

        $ thor cloud:list_targets

          Deploy Targets
          name                    url                           branch
        ------------------------------------------------------------------------------------------
          lab-dev                 lab.dev.concord.org           master

8.  Generate specific Capistrano deploy tasks and littlechef nodes using `deploy-targets`
    specified in `config/config.yml`. Run this `thor` task whenever you change the `:deploy`
    section in `config/config.yml` to generate the Ruby Capastrano configuration files in
    `config/deployment/<deploy-target>.rb` and the littlechef JSON configurations in
    `config/littlechef/nodes/<deploy-target>.json`

        $ thor cloud:setup

9.  List the running AWS server instances to confirm that your local AWS security credentials
    are setup correctly:

        $ thor cloud:list

          target              hostname                      state         ipaddress           ec2-id          ec2-dns
        ------------------------------------------------------------------------------------------------------------------------------------------------------
          lab-dev             lab.dev.concord.org.          running       107.22.184.173      i-f844ec81      ec2-107-22-184-173.compute-1.amazonaws.com

10. If you are working with an existing host that has already been setup such as `lab.dev.concord.org`
    generate the proper ssh configuration and add the remote host key to `~/.ssh/known_hosts`.
    This adds a local **`ubuntu`** user in `~/ssh/config` and connects to the remote host to add the key.

    Example of setting up SSH configuration with the existing remote AWS host: `lab..dev.concord.org`:

        $ thor cloud:setup_ssh lab.dev.concord.org

### Using Capstrano to deploy new code to an existing server

After testing, committing, and pushing code to a public repository use the Capistrano
tasks to update a remote server.

The capistrano commands take the form:

    cap <deploy-target> task

The basic command to update a server:

    cap <deploy-target> deploy:update

Here are the list of current Capistrano deploy commands:

    $ cap -T deploy:
    cap deploy:restart          # restart rails app
    cap deploy:clean_and_update # clean and update server
    cap deploy:setup            # setup server
    cap deploy:status           # display last commit on deployed server
    cap deploy:update           # update server
    cap deploy:update_jnlps     # update public/jnlp dir on server

Update the `lab.dev.concord.org` server with the latest code committed on the master branch on
[concord-consortium/lab](https://github.com/concord-consortium/lab}):

    cap lab-dev deploy:update

When you have made changes in the repository like adding or updating a git submodule in
`src/vendor` then you will need instead run the `deploy:clean_and_update` task:

    cap lab-dev deploy:clean_and_update

### Updating the Java jar resources on a remote rerver

The Java resources require much less frequent updates since the main body of work
for Lab is occuriring in the HTML5 development.

The capistrano task: `deploy:update_jnlps` erases the `server/public/jnlp/`
directory on the remote server and re-generates and deploy the packed signed
jars from source or from downloads:

    $ cap <deploy-target> deploy:update_jnlps

The resulting directory on the server will look something like this:

    $ tree /var/www/app/server/public/jnlp/
    server/public/jnlp/
    ├── jdom
    │   └── jdom
    │       ├── jdom__V1.0.jar
    │       └── jdom__V1.0.jar.pack.gz
    ├── jug
    │   └── jug
    │       ├── jug__V1.1.2.jar
    │       └── jug__V1.1.2.jar.pack.gz
    └── org
        └── concord
            ├── data
            │   ├── data__V0.2.0-20120531.005123-1.jar
            │   └── data__V0.2.0-20120531.005123-1.jar.pack.gz
            ├── energy2d
            │   ├── energy2d__V0.1.0-20120531.005123-1.jar
            │   └── energy2d__V0.1.0-20120531.005123-1.jar.pack.gz
            ├── framework
            │   ├── framework__V0.1.0-20120531.005123-1.jar
            │   └── framework__V0.1.0-20120531.005123-1.jar.pack.gz
            ├── frameworkview
            │   ├── frameworkview__V0.1.0-20120531.005123-1.jar
            │   └── frameworkview__V0.1.0-20120531.005123-1.jar.pack.gz
            ├── modeler
            │   ├── mw__V2.1.0-20120531.005123-1.jar
            │   └── mw__V2.1.0-20120531.005123-1.jar.pack.gz
            ├── otrunk
            │   ├── otrunk__V0.3.0-20120531.005123-1.jar
            │   └── otrunk__V0.3.0-20120531.005123-1.jar.pack.gz
            ├── sensor
            │   ├── sensor-applets
            │   │   ├── sensor-applets__V0.1.0-20120531.005123-1.jar
            │   │   └── sensor-applets__V0.1.0-20120531.005123-1.jar.pack.gz
            │   ├── sensor__V0.2.0-20120531.005123-1.jar
            │   ├── sensor__V0.2.0-20120531.005123-1.jar.pack.gz
            │   └── vernier
            │       └── vernier-goio
            │           ├── vernier-goio-macosx-i386-nar__V1.5.0-20101012.203834-2.jar
            │           ├── vernier-goio-macosx-ppc-nar__V1.5.0-20101012.203834-2.jar
            │           ├── vernier-goio-macosx-x86_64-nar__V1.5.0-20101012.203835-2.jar
            │           └── vernier-goio-win32-nar__V1.4.0.jar
            └── sensor-native
                ├── sensor-native__V0.1.0-20120531.005123-1.jar
                └── sensor-native__V0.1.0-20120531.005123-1.jar.pack.gz

### Managing AWS servers with thor tasks

There are a set of [thor](#thor) tasks for managing, creating, and re-creating AWS servers for Lab:

    $ thor -T
    cloud
    -----
    thor cloud:create hostname                       # create a new server instance using this hostname
    thor cloud:delete hostname                       # delete an existing server instance running at this hostname
    thor cloud:find_dns_record hostname              # find dns record for hostname
    thor cloud:list                                  # list existing servers
    thor cloud:list_targets                          # list existing deploy targets
    thor cloud:recreate hostname                     # recreate a new server instance for this hostname by destroying and rebuilding an existing server
    thor cloud:setup                                 # setup capistrano deploy tasks and littlechef nodes using targets in config/config.yml
    thor cloud:setup_ssh hostname                    # setup ssh configuration for communication to hostname
    thor cloud:start ec2_id                          # start a stopped existing server instance using the ec2-id
    thor cloud:stop reference                        # stop a running existing server instance at this hostname or ec2-id
    thor cloud:update reference                      # update server <ec2_id|hostname> provisioning with littlechef 'lab-server' role
    thor cloud:update_dns_record hostname ipaddress  # updating IP address for DNS record hostname to ipaddress


### Creating a new AWS Lab Server

Creating a new Lab server on AWS consists of three steps:

1. Creating a new hostname, server, and provisioning the server with thor:

        $ thor cloud:create <hostname>

      This task will create a new **hostname** as a DNS A record if the **hostname** does not already exists.

      If the hostname already exists as a CNAME first login to the [AWS:Route53](https://console.aws.amazon.com/route53/home)
      service and delete the existing host name.

      If the new DNS entry for **hostname** is not properly propogated when the hostname is created or
      changed you will get an error that looks something like this:

        *** running local command: echo '
        Host <hostname>
          User ubuntu
          IdentityFile ~/.ec2/lab-dev.pem
        ' >> ~/.ssh/config

        *** running local command: ssh-keygen -R <hostname>
        /Users/stephen/.ssh/known_hosts updated.
        Original contents retained as /Users/stephen/.ssh/known_hosts.old

        *** running local command: ssh ubuntu@<hostname> -o StrictHostKeyChecking=no exit
        ssh: Could not resolve hostname <hostname>: nodename nor servname provided, or not known

        *** updating littlechef node: <hostname>.json

        *** provisioning <hostname> with littlechef role: lab-server
            <ec2-id>, <ec2-hostname>, <new-ip-address>
            command: cd /Users/stephen/dev/concord/lab/config/littlechef && fix node:<hostname> role:lab-server


        == Applying role 'lab-server' to <hostname> ==

        Fatal error: Name lookup failed for <hostname>

        Underlying exception:
            nodename nor servname provided, or not known

      You will need to resolve the issue with getting the correct DNS record for **hostname** before
      continuing. After this is resolved you can follow these steps to continue the initial setup and
      provisioning:

        $ ssh-keygen -R <hostname>
        $ ssh ubuntu@<hostname> -o StrictHostKeyChecking=no exit
        $ thor cloud:update  <hostname>

2. Optionally configure the server to use a valid Java code-siging certificate.

      If you wish to support the integration of the optional Java resources that are required to be signed to work:

      - legacy Molecular Worbench and Energy2D Java Web Start applications
      - Java-based Vernier GoIO browser-sensor applet integration

      You should put copy of a valid Java siging certificate keystore on **hostname** and edit
      `config/config.yml` to reference this keystore before running `cap <deploy-target> deploy:setup`

      The one supplied with the repository is a sample self-signed certificate and end user will be warned that it
      is not valid.

      Here is one way to acomplish this:

        $ scp <path-to-keystore> deploy@<hostname>:/var/www/app/config/<new-keystore-name>.jks

      Now ssh to the new host and edit the [java section](https://github.com/concord-consortium/lab/blob/master/config/config_sample.yml#L2-6)
      of `/var/www/app/config/config.yml` to update the values for `:password`, `:alias`, and `:keystore_path`.

3. Finishing the setup of the server with a capistrano task

        $ cap <deploy-target> deploy:setup

    This completes the initial deploy and builds of all the project resources to the server.

## References

### Molecular Simulation

- [Basic molecular dynamics](http://li.mit.edu/Archive/Papers/05/Li05-2.8.pdf)
- [CHARMM: A theoretical introduction to molecular dynamics simulations and practical examples](http://www.ch.embnet.org/MD_tutorial/)

  This site has a basic introduction to the physics of molecular dynamics simulations, and practical
  exercises with the CHARMM package

- [Thermostat Algorithms for Molecular Dynamics Simulations](http://phjoan23.technion.ac.il/~phr76ja/thermostats.pdf)
- [the "flying ice cube"](http://en.wikipedia.org/wiki/Flying_ice_cube)

  One kind of unphysical effect that can arise. See linked paper.

- [SklogWiki: Lennard-Jones](http://www.sklogwiki.org/SklogWiki/index.php/Lennard-Jones_model)

#### Courses

- [CHE 800-002: Molecular Simulation](http://www.pages.drexel.edu/~cfa22/msim/msim.html)
    Cameron Abrams Department of Chemical Engineering at Drexel

- [Computational Physics](http://courses.theophys.kth.se/SI2530/)
- [Benchmark results for Lennard-Jones fluid](http://www.cstl.nist.gov/srs/LJ_PURE/index.htm)
- [Statistical Physics and Simulation](http://homepage.univie.ac.at/franz.vesely/simsp/dx/dx.html)

#### Reduced Units

- [softmatter:Simulation Variables/Units](http://matdl.org/matdlwiki/index.php/softmatter:Reduced_units)
- [An MD Code for the Lennard-Jones Fluid](http://www.pages.drexel.edu/~cfa22/msim/node27.html)
- [2.4 Reduced Units](http://homepage.univie.ac.at/franz.vesely/simsp/dx/node11.html)
- [Understanding molecular simulation: from algorithms to applications](http://books.google.com/books?id=XmyO2oRUg0cC&pg=PA41&lpg=PA41&dq=Reduced+Units+Lennard-Jones&source=bl&ots=Zx0F10o1yR&sig=2UJ4C-W8LuASjrvkoTxPA63XBos&hl=en&sa=X&ei=R0AWT7fmNOn10gHKx4jxAg&ved=0CGIQ6AEwBw#v=onepage&q=Reduced%20Units%20Lennard-Jones&f=false)
- [Molecular Dynamics Simulation: Nneoma Ogbonna](http://users.aims.ac.za/~nneoma/theses/NneomaAimsEssay.pdf)

### JavaScript Library Runtime Dependencies

#### D3

[D3](http://mbostock.github.com/d3/): manipulating and visualizing documents based on data.

- [repo](https://github.com/mbostock/d3)
- [documentation](http://mbostock.github.com/d3/api/)
- [issues](https://github.com/mbostock/d3/issues)
- [google group](http://groups.google.com/group/d3-js)
- [API reference](https://github.com/mbostock/d3/wiki/API-Reference)
  - [Arrays](https://github.com/mbostock/d3/wiki/Arrays)

#### JQuery

[JQuery](http://jquery.com/): simplifies HTML document traversing, event handling, animating,
and Ajax interactions.

#### JQuery-UI

[JQuery-UI](http://jqueryui.com/): abstractions for low-level interaction and
animation, advanced effects and high-level, themeable widgets, built on top of the jQuery

#### Sizzle

[sizzle](http://sizzlejs.com/): CSS selector engine designed to be easily dropped in to a
host library.

#### Codemirror

[Codemirror2](https://github.com/marijnh/CodeMirror2): in-browser code editor.

#### science.js

[science.js](https://github.com/jasondavies/science.js): scientific and statistical
computing methods.

#### dsp.js

[dsp.js](https://github.com/corbanbrook/dsp.js): digital signal processing methods
including functions for signal analysis and generation, Oscillators(sine, saw, square, triangle),
Window functions (Hann, Hamming, etc), Envelopes(ADSR), IIR Filters(lowpass, highpass,
bandpass, notch), FFT and DFT transforms, Delays, Reverb.

#### Modernizr

[modernizr](https://github.com/Modernizr/Modernizr): detect HTML5 and CSS3 features in browsers.

Lab Example: [`index.html.haml`](https://github.com/concord-consortium/lab/blob/master/src/index.html.haml#L12)
uses Modernizer to check if the browser implents SVG and re-direct the user to an upgrade
page if the feature is not presnet.

#### MathJax

[MathJax](http://mathjax.com/) is a display engine for mathematics that works in all modern browsers.

Lab Example: [`lennard-jones-potential.html.haml`](https://github.com/concord-consortium/lab/blob/master/src/doc/models/md2d/lennard-jones-potential/lennard-jones-potential.html.haml#L23-30)
uses MathJax to display LaTeX formatted math equations.

#### OpenSans Font

[OpenSans Font](http://www.google.com/webfonts/specimen/Open+Sans): used for most text display

### Development Dependencies

#### node

- [node](http://nodejs.org/)
- [repo](https://github.com/joyent/node)
- [documentation](http://nodejs.org/docs/latest/api/index.html)
- [debugger](http://nodejs.org/docs/latest/api/debugger.html)
- [issues](https://github.com/joyent/node/issues)
- [google group](http://groups.google.com/group/nodejs)
- [How To Node](http://howtonode.org/)

**[node-inspector](https://github.com/dannycoates/node-inspector)**
- [npm package for node-inspector](http://search.npmjs.org/#/node-inspector)

#### npm

[npm](http://npmjs.org/), the Node Package Manager isnow bundled with Node and is
used to specify and manage external node pacage dependencies for a project.

- [repo](https://github.com/isaacs/npm)
- [faq](http://npmjs.org/doc/faq.html)
- [google group](https://groups.google.com/group/npm-)
- [issues](https://github.com/isaacs/npm/issues)

More about using npm for development:

- [Introduction to npm](http://howtonode.org/introduction-to-npm)
- [node_modules in git](http://www.mikealrogers.com/posts/nodemodules-in-git.html)
- [Managing module dependencies](http://howtonode.org/managing-module-dependencies)
- [What do people do for versioning node modules within git?](https://groups.google.com/group/nodejs/browse_thread/thread/9aa563f1fe3b3ff5)

Lab Example: [`package.json`](https://github.com/concord-consortium/lab/blob/master/package.json)
specifies node pakage dependencies for the Lab project.

#### RequireJS

[RequireJS](http://requirejs.org) is a JavaScript file and module
loader. It is optimized for in-browser use, but it can be used in other
JavaScript environments, like Rhino and Node.

- [homepage](http://requirejs.org)
- [repo](https://github.com/jrburke/requirejs)
- [RequireJS Google Group](https://groups.google.com/forum/?fromgroups#!forum/requirejs)

Lab Example:


All Lab's modules use RequireJS for dependency management and build process. Its application is widely
described in [this section](#javascript-dependency-management-and-build-process---requrejs).

#### CoffeeScript

[CoffeeScript](http://coffeescript.org/) is a language the compiles to JavaScript. Many programmers
find it more expressive and productive. [js2cofee](http://js2coffee.org/) can be used to convert
JavaScript to CoffeeScript. RequireJS Optimizer also can convert CoffeeScript to JavaScrit. So
you don't have to manually do it when referencing CoffeeScript files using RequireJS.

- [repo](https://github.com/jashkenas/coffee-script)
- [issues](https://github.com/jashkenas/coffee-script/issues)

Lab Examples:

1.  [`get-md2d-data.coffee`](https://github.com/concord-consortium/lab/blob/master/node-bin/get-md2d-data.coffee)
    is a coffeescript program used to run the MD2D engine from the command line and generate data used
    for physics validation tests.
2.  [`PlaybackComponentSVG`](https://github.com/concord-consortium/lab/blob/master/src/lab/common/components/playback_svg.coffee)
    is an object written in CoffeeScript that creates and manages the SVG-based Playback control widget
    for the Molecule Container.
3.  [`InteractivesController`](https://github.com/concord-consortium/lab/blob/master/src/lab/md2d/controllers/interactives-controller.js)
    is an object written in plain JavaScript which references directly CoffeeScript file using RequireJS
    (`Thermometer = require('cs!common/components/thermometer')`).

[This section](#coffeescript-files-support) covers RequireJS support of CoffeeScript files.

### RubyGems

#### Bundler

[Bundler](http://gembundler.com/) is a Ruby Gem used to express and manage Ruby Gem dependencies.

- [rationale](http://gembundler.com/rationale.html)
- [documentation: Gemfile](http://gembundler.com/man/gemfile.5.html)
- [documentation: CLI](http://gembundler.com/man/bundle.1.html)

Lab Example: [`Gemfile`](https://github.com/concord-consortium/lab/blob/master/Gemfile)
is used to specify all the Ruby Gem dependencies to build and test the Lab project.

#### Haml

[Haml](http://haml-lang.com/) is a Ruby Gem that processes HTML expressed in HAML markup into HTML.

- [documentation](http://haml-lang.com/docs.html)
- [reference](http://haml-lang.com/docs/yardoc/file.HAML_REFERENCE.html)

Lab Example: [`index.html.haml`](https://github.com/concord-consortium/lab/blob/master/src/index.html.haml)
is used to generate the main [`index.html`](https://github.com/concord-consortium/lab/blob/gh-pages/index.html) page.

#### Sass

[Sass](http://sass-lang.com/) is a Ruby Gem that provides many powerful extensions to CSS3 and works
by processing files in either [SASS-indented-syntax](http://sass-lang.com/docs/yardoc/file.INDENTED_SYNTAX.html)
or SCSS format (a su[erset of standard CSS3) and generating CSS stylesheets.

- [documentation](http://sass-lang.com/docs.html)
- [reference](http://sass-lang.com/docs/yardoc/file.SASS_REFERENCE.html)

Lab Examples:

1.  [`index.sass`](https://github.com/concord-consortium/lab/blob/master/src/index.sass)
    is used to generate: [`index.css`](https://github.com/concord-consortium/lab/blob/gh-pages/index.css)
2.  [`readme.scss`](https://github.com/concord-consortium/lab/blob/master/src/readme.scss)
    is used to generate: [`readme.css`](https://github.com/concord-consortium/lab/blob/gh-pages/readme.css)

#### Guard

[Guard](https://github.com/guard/guard) is a Ruby Gem that can efficiently watch for changes on the file system and
automatically start the build process when needed.

- [guard-shell](https://github.com/hawx/guard-shell)
- [guard-haml](https://github.com/manufaktor/guard-haml)
- [guard-sass](https://github.com/hawx/guard-sass)
- [guard-coffeescript](https://github.com/guard/guard-coffeescript)
- [guard-markdown](https://github.com/darwalenator/guard-markdown)
- [guard-livereload](https://github.com/guard/guard-livereload)

Lab Example: Starting Guard with `bin/guard` loads and runs the configuration in [`Guardfile`](https://github.com/concord-consortium/lab/blob/master/Guardfile).

#### Thor

[thor](https://github.com/wycats/thor) is a Ruby Gem for building self-documenting command line utilities.

- [documentation](https://github.com/wycats/thor/wiki)

Lab Example: [`cloud.thor`](https://github.com/concord-consortium/lab/blob/master/cloud.thor) are the
Ruby command-line interface scripts for providing access to the
[`AwsLabServer`](https://github.com/concord-consortium/lab/blob/master/script/aws-lab-server.rb)
library for creating and managing AWS cloud servers.

#### Fog

[fog](http://fog.io/) is a Ruby Gem for working with many different cloud service providers.

- [documentation](http://fog.io/)
- [repo](https://github.com/fog/fog)

Lab Example: [`AwsLabServer`](https://github.com/concord-consortium/lab/blob/master/script/aws-lab-server.rb)
is a library built on top of fog for creating and managing Lab server instances on AWS.

### Additional Testing Dependencies

#### Vows

[Vows](http://vowsjs.org) is an asynchronous behaviour driven testing framework for Node.

- [repo](https://github.com/cloudhead/vows)

Lab Examples:

1.  [`axis-test.js`](https://github.com/concord-consortium/lab/blob/master/test/lab/grapher/core/axis-test.js)
    is used to test the drag UI logic for interactively re-scaling Graph axes.
2.  [`arrays-test.js`](https://github.com/concord-consortium/lab/blob/master/test/lab/arrays/arrays-test.js)
    is used to test the utility class for working with regular or Typed Arrays.

#### jsdom

- [jsdom](http://jsdom.org)
- [repo](https://github.com/tmpvar/jsdom)
- [issues](https://github.com/tmpvar/jsdom/issues)

### Miscellaneous

#### livereload

[livereload](https://github.com/mockko/livereload) is project that has created extensions
for Chrome FireFox, and Safari to provide automatic browser reloading when the HTML,
CSS and JavaScript files are changed on the server. The older version 1 extensions
work with the guard-livereload gem.

- [livereload v1 readme](https://github.com/mockko/livereload/blob/master/README-old.md)

### Full Screen API

- [JavaScript Full Screen API, Navigation Timing and repeating CSS Gradients](http://peter.sh/2011/01/javascript-full-screen-api-navigation-timing-and-repeating-css-gradients/)
- [Fullscreen API, enhanced Element Highlighting and progress on Flexbox](http://peter.sh/2011/08/fullscreen-api-enhanced-element-highlighting-and-progress-on-flexbox/)
- [Native Fullscreen JavaScript API (plus jQuery plugin)](http://johndyer.name/native-fullscreen-javascript-api-plus-jquery-plugin/)
- [Gecko:FullScreenAPI](https://wiki.mozilla.org/Gecko:FullScreenAPI)
- [Mozilla full-screen API progress update](http://blog.pearce.org.nz/2011/09/mozilla-full-screen-api-progress-update.html)
- [fullscreen API coming to browsers near you?](http://ajaxian.com/archives/fullscreen-api-coming-to-browsers-near-you)
- [Full Screen Demos](http://html5-demos.appspot.com/static/fullscreen.html)
- [stackoverflow: Chrome Fullscreen API](http://stackoverflow.com/questions/7836204/chrome-fullscreen-api)
