# Java

Java is needed for the legacy Java applications we are porting to HTML5.

Test to see if Java is installed and available:

    $ java -version
	java version "1.6.0_33"
	Java(TM) SE Runtime Environment (build 1.6.0_33-b03-424-11M3720)
	Java HotSpot(TM) 64-Bit Server VM (build 20.8-b03-424, mixed mode)

## Mac OS X

On Mac OS X 10.7 and later Java is not automatically installed. However running the command
`java -version` when Java is not installed will bring up an operating system dialog enabling
Java to be installed.

On OS X 10.6 Java should be installed by default

## Linux (Ubuntu)

Neither the Java run time environment nor the Java development kit are installed by
default, both of which are needed by the java projects.

    sudo apt-get install  default-jre openjdk-6-jdk

