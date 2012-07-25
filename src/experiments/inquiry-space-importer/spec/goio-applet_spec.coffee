describe "GoIOApplet class", ->

  it "should exist"

  it "should be a subclass of SensorApplet"

  describe "getHTML method", ->
    # set appropriate otml file first!
    it "should construct an appropriate applet tag"

  describe "testAppletReady method", ->
    it "should call initSensorInterface method of the applet instance"
    it "should send the 'listenerPath' property to initSensorInterface"

    describe "if initSensorInterface throws an error", ->
      it "should return false"

    describe "if initSensorInterface does not throw an error", ->
      it "should return true"

  describe "sensorsReadyWhenAppletReady property", ->
    it "should be false"

  describe "sensorsReady method", ->
    it "should call startAppletCallback"

    it "should call sensorIsReady method while inAppletCallback is true"

    it "should call endAppletCallback"

  describe "The dataReceived method", ->

    it "should call startAppletCallback"

    it "should call newData callback while inAppletCallback is true"

    it "should call endAppletCallback"

  describe "_stopSensor method", ->
    describe "if inAppletCallback is true", ->
      it "should set a timer"
      describe "when the timer expires", ->
        it "should call the _stopSensor method again"

    describe "if inAppletCallack is false", ->
      it "should call the applet method stopCollecting"

  describe "_startSensor method", ->
    describe "if inAppletCallback is true", ->
      it "should set a timer"

      describe "when the timer expires", ->
        it "should call the _startSensor method again"

    describe "if inAppletCallack is false", ->
      it "should call the applet method startCollecting"


###

responsibilities of SensorApplet

  # SHOULD THERE BE a division of responsibility between SensorApplet and GoIOApplet?

  appends applet tag to DOM
  waits for applet startup
  records start and end of applet callback (should never call applet method within applet callback, apparently)
  removes applet tag from DOM when requested
reacords lifecycle of applet (not appended, appended, applet ready, sensors ready, removed)

responsibilities of GoIOApplet
  constructs appropriate applet tag



  forwards sensor ready event to callback
  forwards data received events to callback
  forwards metadata events to callback (if ever implemented)

###

