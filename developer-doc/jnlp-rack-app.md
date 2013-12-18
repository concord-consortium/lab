## JnlpApp Rack Application Service

The Lab Rack server also uses the [Rack::Jnlp](https://github.com/concord-consortium/lab/tree/master/lib/rack/jnlp.rb) for 
servicing requests for Java Web Start JNLPs and versioned jar resources.

Normally versions for jars can only be specified by using a jnlp form. A jnlp form of specification can be used for webstart and also for applets.

The older form of applet invocation that uses the <applet> html element normally can't specify version numbers for jar dependencies, however the Jnlp::Rack application included with Lab does allow version specification.

Example: right now on my local system there are two different versions of the vernier-goio-macosx-x86_64-nar.jar:

    $ ls -l public/jnlp/org/concord/sensor/vernier/vernier-goio/vernier-goio-macosx-x86_64-nar*
      98396 May 28 01:55 ../org/concord/sensor/vernier/vernier-goio/vernier-goio-macosx-x86_64-nar__V1.5.0-20101012.203835-2.jar
      99103 May 28 16:40 ../org/concord/sensor/vernier/vernier-goio/vernier-goio-macosx-x86_64-nar__V1.5.0-20120528.164030-3.jar

Note the different lengths for the two different versions.

If a request comes in from Java for vernier-goio-macosx-x86_64-nar.jar the most recent version is returned:

    $ curl --user-agent java -I http://localhost:9292/jnlp/org/concord/sensor/vernier/vernier-goio/vernier-goio-macosx-x86_64-nar.jar
    HTTP/1.1 200 OK
    Last-Modified: Mon, 28 May 2012 20:40:34 GMT
    Content-Type: application/java-archive
    Content-Length: 99103

However the version number can be added as a http query parameter.

    $ curl --user-agent java -I http://localhost:9292/jnlp/org/concord/sensor/vernier/vernier-goio/vernier-goio-macosx-x86_64-nar.jar?version-id=1.5.0-20101012.203835-2
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

    $ curl --user-agent java -I http://localhost:9292/jnlp/org/concord/sensor-native/sensor-native.jar
    HTTP/1.1 500 Internal Server Error

Restart the server and the request should now succeed:

    $ curl --user-agent java -I http://localhost:9292/jnlp/org/concord/sensor-native/sensor-native.jar
    HTTP/1.1 200 OK
    Last-Modified: Thu, 07 Jun 2012 16:44:28 GMT
    Content-Type: application/java-archive
    Content-Length: 34632
    content-encoding: pack200-gzip
