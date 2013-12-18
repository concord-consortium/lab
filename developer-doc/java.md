## Java Resources

The Lab repository can build the legacy Java applications Molecular Workbench and Energy2D we
are converting to HTML5.

Building these Java applications allows developers to more easily compare the operation
of the HTML5 versions of these applications to the Java versions running in the browser as applets.

Additionally the Lab framework uses a sensor applet to connect with USB sensors from Vernier.
The jars for this applet and a javascript library for communicating with the applet come from
the [Lab Sensor Applet Interface](https://github.com/concord-consortium/lab-sensor-applet-interface)
project. The Lab framework pulls in the
[distribution repository](https://github.com/concord-consortium/lab-sensor-applet-interface-dist)
through a submodule. This distribution repository provides the built and signed jars.

### Running the Classic Java Molecular Workbench and Energy2D as Applications

After building the Java resources the Java applications Molecular Workbench and Energy2D can be
run as applications from the command line:

1. Molecular Workbench

        bin/mw

2. Energy2D

        bin/energy2d

### Java Code-Signing Certificate and Keystore

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

### Building the Java Resources

Run `make jnlp-all` to erase, build, package, sign and deploy all the Java resources.

The first time this task is run it:

1.  Creates a `java/` top-level directory and checks out the required Java projects into this directory.
2.  Builds each of the projects
3.  Copies the jar resources into the `public/jnlp/` directory packing and signing them as needed.

Later if you have made updates in the Java source code or need to re-build and deploy for any reason you
can run:

    script/build-and-deploy-jars.rb --maven-update

If one of the maven projects fails to build because a dependency could not be found try running
the command again with the `--maven-update` argument:

    script/build-and-deploy-jars.rb --maven-update

Details about each Java project, where the repository is located, what branch is compiled, the specific
compilation details are all contained in this Ruby file:
[`config/java-projects.rb`](https://github.com/concord-consortium/lab/blob/master/config/java-projects.rb)

The specification indicates whether the Java Jar resource will be directly downloaded or whether the
source code will be checked-out and compiled to create the Jar.

#### Java Projects Build Strategies

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

    An example that has been removed from the java-projects.rb:

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

    An example that has been removed from java-projects.rb

        'goio-jna'       => { :build_type => :download,
                              :url => 'http://source.concord.org/nexus/content/repositories/cc-repo-internal-snapshot/org/concord/sensor/goio-jna/1.0-SNAPSHOT/goio-jna-1.0-20121109.222028-22.jar',
                              :version => '1.0-20121109.222028-22',
                              :path => 'org/concord/sensor/goio-jna',
                              :sign => true }

The script that runs the checkout-build-pack-sign-deploy can either operate on ALL projects specified or on a smaller number.

Running `script/build-and-deploy-jars.rb` with no arguments operates on all projects listed in config/java-projects.rb.

Optionally you can specify one or more projects to operate on. This builds just mw:

    script/build-and-deploy-jars.rb mw

The Jar resources deployed to the `public/jnlp` directory include a timestamp in the deployed artifact so unless you specifically
request an earlier version you will always get the latest version deployed.
