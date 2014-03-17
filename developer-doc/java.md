## Java Resources

The Lab framework uses a sensor applet to connect with USB sensors from Vernier.
The jars for this applet and a javascript library for communicating with the applet come from
the [Lab Sensor Applet Interface](https://github.com/concord-consortium/lab-sensor-applet-interface)
project. The Lab framework pulls in the
[distribution repository](https://github.com/concord-consortium/lab-sensor-applet-interface-dist)
through a submodule. This distribution repository provides the built and signed jars.

### Working with sensor applet Java code within local Lab build

1.  Clone lab-sensor-applet-interace https://github.com/concord-consortium/lab-sensor-applet-interface
2.  Build it (see the readme of that project)
3.  delete submodule folder `lab/vendor/lab-sensor-applet-interface-dist`
4.  create a symlink `ln -s lab-sensor-applet-interface/dist lab/vendor/lab-sensor-applet-interface-dist`

Now everytime you rebuild the sensor applet jars or javascript, and then make is run on the Lab project
you local Lab server should include the new jars and new javascript.
