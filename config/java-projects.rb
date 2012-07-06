#!/usr/bin/env ruby

require 'fileutils'
require 'yaml'

PROJECT_ROOT = File.expand_path('../..',  __FILE__) if !defined? PROJECT_ROOT

JAVA_ROOT    = File.join(PROJECT_ROOT, 'java')
PUBLIC_ROOT  = File.join(PROJECT_ROOT, 'server', 'public')

JNLP_ROOT    = File.join(PUBLIC_ROOT, 'jnlp')

TIMESTAMP = Time.now.strftime("%Y%m%d.%H%M%S")

MAVEN_CLEAN = "mvn clean"

MAVEN_STD_BUILD = "mvn -Dmaven.compiler.source=1.5 -Dmaven.test.skip=true package"
MAVEN_STD_CLEAN_BUILD = MAVEN_CLEAN + ';' + MAVEN_STD_BUILD

MAVEN_SMALL_BUILD = "mvn -Dmaven.compiler.source=1.5 -Dmaven.compiler.debuglevel=none -Dmaven.test.skip=true package"
MAVEN_SMALL_CLEAN_BUILD = MAVEN_CLEAN + ';' + MAVEN_SMALL_BUILD

MANUAL_JAR_BUILD = "rm -rf bin; mkdir bin; find src -name *.java | xargs javac -target 5 -sourcepath src -d bin"

MW_ANT_BUILD = "ant clean; ant dist2"

# Compiling with -Dmaven.compiler.debuglevel=none can produce jars 25% smaller
# however stack traces will not have nearly as much useful information.
#
# For this to work properly maven.compiler.debug must also be true. This is the
# default value -- but it can also be set like this: -Dmaven.compiler.debug=true
#
# Compiling MW this way drops the size from 7.2 to 5.4 MB

PROJECT_LIST = {
  'otrunk'         => { :build_type => :maven,
                        :build => MAVEN_STD_CLEAN_BUILD,
                        :repository => 'git://github.com/concord-consortium/otrunk.git',
                        :branch => 'trunk',
                        :path => 'org/concord/otrunk',
                        :has_applet_class => true,
                        :sign => true },

  'framework'      => { :build_type => :maven,
                        :build => MAVEN_STD_CLEAN_BUILD,
                        :repository => 'git://github.com/concord-consortium/framework.git',
                        :branch => 'trunk',
                        :path => 'org/concord/framework',
                        :sign => true },

  'data'           => { :build_type => :maven,
                        :build => MAVEN_STD_CLEAN_BUILD,
                        :repository => 'git://github.com/concord-consortium/data.git',
                        :branch => 'trunk',
                        :path => 'org/concord/data',
                        :sign => true },

  'sensor'         => { :build_type => :maven,
                        :build => MAVEN_STD_CLEAN_BUILD,
                        :repository => 'git://github.com/concord-consortium/sensor.git',
                        :branch => 'before-trunk-sensor-split',
                        :path => 'org/concord/sensor',
                        :sign => true },

  'sensor-applets' => { :build_type => :maven,
                        :build => MAVEN_STD_CLEAN_BUILD,
                        :repository => 'git://github.com/concord-consortium/sensor-applets.git',
                        :branch => 'master',
                        :path => 'org/concord/sensor/sensor-applets',
                        :has_applet_class => true,
                        :sign => true },

  'sensor-native'  => { :build_type => :maven,
                        :build => MAVEN_STD_CLEAN_BUILD,
                        :repository => 'git://github.com/concord-consortium/sensor-native.git',
                        :branch => 'new-master-merge-with-trunk',
                        :path => 'org/concord/sensor-native',
                        :sign => true },

  'frameworkview'  => { :build_type => :maven,
                        :build => MAVEN_STD_CLEAN_BUILD,
                        :repository => 'git://github.com/concord-consortium/frameworkview.git',
                        :branch => 'trunk',
                        :path => 'org/concord/frameworkview',
                        :sign => true },

  'jdom'           => { :build_type => :download,
                        :url => 'http://repo1.maven.org/maven2/jdom/jdom/1.0/jdom-1.0.jar',
                        :path => 'jdom/jdom',
                        :version => '1.0',
                        :sign => true },

  'jug'            => { :build_type => :download,
                        :url => 'http://repo1.maven.org/maven2/jug/jug/1.1.2/jug-1.1.2.jar',
                        :path => 'jug/jug',
                        :version => '1.1.2',
                        :sign => true },

  'energy2d'       => { :build_type => :custom,
                        :build => MANUAL_JAR_BUILD,
                        :version => '0.1.0',
                        :repository => 'git://github.com/concord-consortium/energy2d.git',
                        :branch => 'trunk',
                        :path => 'org/concord/energy2d',
                        :has_applet_class => true,
                        :sign => false },

  'mw'             => { :build_type => :maven,
                        :build => MAVEN_STD_CLEAN_BUILD,
                        :repository => 'git://github.com/concord-consortium/mw.git',
                        :branch => 'master',
                        :path => 'org/concord/modeler',
                        :has_applet_class => true,
                        :sign => false },

  'NetLogoLite'         => { :build_type => :download,
                        :url => 'http://ccl.northwestern.edu/netlogo/5.0.1/NetLogoLite.jar',
                        :path => 'org/nlogo',
                        :version => '5.0.1',
                        :sign => false },

}
