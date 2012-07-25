describe "GoIOApplet class", ->

  goio = null

  beforeEach ->
    goio = new ISImporter.GoIOApplet()

  it "should exist", ->
    expect( goio ).toBeDefined()

  it "should be a subclass of SensorApplet", ->
    expect( goio.constructor.__super__ ).toBe ISImporter.SensorApplet.prototype

  describe "when listenerPath and otmlPath properties are set appropriately", ->
    beforeEach ->
      goio.listenerPath = '(dummy listener path)'
      goio.otmlPath = '(dummy otml path)'

    describe "getHTML method", ->
      it "should construct the appropriate applet tag", ->
        expect( goio.getHTML() ).toBe [
          '<applet ',
              'id="goio-applet" ',
              'class="applet sensor-applet" ',
              'archive="org/concord/sensor-native/sensor-native.jar, ',
                       'org/concord/otrunk/otrunk.jar, ',
                       'org/concord/framework/framework.jar, ',
                       'org/concord/frameworkview/frameworkview.jar, ',
                       'jug/jug/jug.jar, ',
                       'jdom/jdom/jdom.jar, ',
                       'org/concord/sensor/sensor.jar, ',
                       'org/concord/data/data.jar, ',
                       'org/concord/sensor/sensor-applets/sensor-applets.jar" ',
              'code="org.concord.sensor.applet.OTSensorApplet" ',
              'codebase="/jnlp" ',
              'width="1px" ',
              'height="1px" ',
              'MAYSCRIPT="true" >',
            '<param name="resource" value="(dummy otml path)" />',
            '<param name="listenerPath" value="(dummy listener path)" />',
            '<param name="name" value="goio-applet" />',
          '</applet>'].join('')

    describe "testAppletReady method", ->

      beforeEach ->
        goio.appletInstance =
          initSensorInterface: ->
        spyOn goio.appletInstance, 'initSensorInterface'

      it "should pass the listenerPath to the initSensorInterface method of the applet instance", ->
        goio.testAppletReady()
        expect( goio.appletInstance.initSensorInterface ).toHaveBeenCalledWith '(dummy listener path)'

      describe "if initSensorInterface does not throw an error", ->

        it "should return true", ->
          expect( goio.testAppletReady() ).toBe true

      describe "if initSensorInterface throws an error", ->

        beforeEach ->
          goio.appletInstance.initSensorInterface.andThrow new Error()

        it "should return false", ->
          expect( goio.testAppletReady() ).toBe false

  describe "sensorsReady applet callback", ->

    it "should call sensorIsReady parent method", ->
      spyOn goio, 'sensorIsReady'
      goio.sensorsReady()
      expect( goio.sensorIsReady ).toHaveBeenCalled()

    describe "return value of getIsInAppletCallback method", ->

      describe "during sensorIsReady method", ->

        returnValueDuring = null
        beforeEach ->
          returnValueDuring = null
          spyOn( goio, 'sensorIsReady' ).andCallFake ->
            returnValueDuring = goio.getIsInAppletCallback()

        it "should be true", ->
          goio.sensorsReady()
          expect( returnValueDuring ).toBe true

    describe "after sensorsReady returns", ->

      it "should be false", ->
        goio.sensorsReady()
        expect( goio.getIsInAppletCallback() ).toBe false

  describe "The dataReceived applet callback", ->

    dataCb = null

    beforeEach ->
      dataCb = jasmine.createSpy 'dataCb'
      goio.on 'data', dataCb

    it "should emit the 'data' event", ->
      goio.dataReceived()
      expect( dataCb ).toHaveBeenCalled()

    describe "the data callback", ->

      it "should be called with the data received from the applet callback", ->
        goio.dataReceived null, 2, [1.0, 2.0]
        expect( dataCb ).toHaveBeenCalledWith [1.0, 2.0]

      it "should be called while getIsInAppletCallback() returns true", ->
          wasIn = null
          dataCb.andCallFake -> wasIn = goio.getIsInAppletCallback()

          goio.dataReceived()
          expect( wasIn ).toBe true

    describe "after dataReceived returns", ->

      beforeEach ->
        goio.dataReceived()

      describe "getIsInAppletCallback method", ->
        it "should return false", ->
          expect( goio.getIsInAppletCallback() ).toBe false


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

