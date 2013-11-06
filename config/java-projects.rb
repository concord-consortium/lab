#!/usr/bin/env ruby

require 'fileutils'
require 'yaml'

PROJECT_ROOT = File.expand_path('../..',  __FILE__) if !defined? PROJECT_ROOT

JAVA_ROOT    = File.join(PROJECT_ROOT, 'java')
PUBLIC_ROOT  = File.join(PROJECT_ROOT, 'public')

JNLP_ROOT    = File.join(PUBLIC_ROOT, 'jnlp')

TIMESTAMP = Time.now.strftime("%Y%m%d.%H%M%S")

MAVEN_CLEAN = "mvn clean"

MAVEN_STD_BUILD = "mvn -Dmaven.compiler.source=1.5 -Dmaven.test.skip=true package install"
MAVEN_STD_CLEAN_BUILD = MAVEN_CLEAN + ';' + MAVEN_STD_BUILD

MAVEN_SMALL_BUILD = "mvn -Dmaven.compiler.source=1.5 -Dmaven.compiler.debuglevel=none -Dmaven.test.skip=true package"
MAVEN_SMALL_CLEAN_BUILD = MAVEN_CLEAN + ';' + MAVEN_SMALL_BUILD

MANUAL_JAR_BUILD = "rm -rf bin; mkdir bin; find src -name *.java | xargs javac -target 5 -sourcepath src -d bin; find src -type f ! -name '*.java' | xargs tar -c | tar --strip-components 1 -xC bin"

MANUAL_JAR_ISO_8859_1_BUILD = "rm -rf bin; mkdir bin; find src -name *.java | xargs javac -encoding ISO-8859-1 -target 5 -sourcepath src -d bin; find src -type f ! -name '*.java' | xargs tar -c | tar --strip-components 1 -xC bin"

MW_ANT_BUILD = "ant clean; ant dist2"

# Compiling with -Dmaven.compiler.debuglevel=none can produce jars 25% smaller
# however stack traces will not have nearly as much useful information.
#
# For this to work properly maven.compiler.debug must also be true. This is the
# default value -- but it can also be set like this: -Dmaven.compiler.debug=true
#
# Compiling MW this way drops the size from 7.2 to 5.4 MB

PROJECT_LIST = {
  'sensor'         => { :build_type => :download,
                        :url => 'http://jnlp.concord.org/dev3/org/concord/sensor/sensor/sensor-1.0-20130909.215301-41.jar',
                        :version => '1.0-20130909.215301-41',
                        :path => 'org/concord/sensor',
                        :sign => true },

  'sensor-applets' => { :build_type => :maven,
                        :build => MAVEN_STD_CLEAN_BUILD,
                        :repository => 'git://github.com/concord-consortium/sensor-applets.git',
                        :branch => 'master',
                        :commit => 'v2.0.2',
                        :path => 'org/concord/sensor/sensor-applets',
                        :has_applet_class => true,
                        :sign => true },

  'sensor-vernier' => { :build_type => :download,
                        :url => 'http://jnlp.concord.org/dev3/org/concord/sensor/sensor-vernier/sensor-vernier-1.0-20130909.215301-42.jar',
                        :version => '1.0-20130909.215301-42',
                        :path => 'org/concord/sensor/sensor-vernier',
                        :sign => true },

  'goio-jna'       => { :build_type => :download,
                        :url => 'http://jnlp.concord.org/dev3/org/concord/sensor/goio-jna/goio-jna-1.0-20130314.171142-34.jar',
                        :version => '1.0-20130314.171142-34',
                        :path => 'org/concord/sensor/goio-jna',
                        :sign => true },

  'labquest-jna'   => { :build_type => :download,
                        :url => 'http://jnlp.concord.org/dev3/org/concord/sensor/labquest-jna/labquest-jna-1.0-20130909.215301-42.jar',
                        :version => '1.0-20130909.215301-42',
                        :path => 'org/concord/sensor/labquest-jna',
                        :sign => true },

  'jna'            => { :build_type => :download,
                        :url => 'http://search.maven.org/remotecontent?filepath=net/java/dev/jna/jna/3.5.1/jna-3.5.1.jar',
                        :version => '3.5.1',
                        :path => 'com/sun/jna',
                        :sign => true },

  'energy2d'       => { :build_type => :custom,
                        :build => MANUAL_JAR_ISO_8859_1_BUILD,
                        :version => '0.1.0',
                        :repository => 'git://github.com/concord-consortium/energy2d.git',
                        :branch => 'trunk',
                        :path => 'org/concord/energy2d',
                        :main_class => "org.concord.energy2d.system.System2D",
                        :has_applet_class => true,
                        :sign => false },

  'mw'             => { :build_type => :maven,
                        :build => MAVEN_STD_CLEAN_BUILD,
                        :repository => 'git://github.com/concord-consortium/mw.git',
                        :branch => 'master',
                        :path => 'org/concord/modeler',
                        :main_class => "org.concord.modeler.ModelerLauncher",
                        :has_applet_class => true,
                        :sign => true,
                        :also_unsigned => true }

}
