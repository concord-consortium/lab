describe "VernierSensorApplet class", ->

  applet = null

  beforeEach ->
    applet = new ISImporter.VernierSensorApplet()

  it "should exist", ->
    expect( applet ).toBeDefined()

  it "should be a subclass of SensorApplet", ->
    expect( applet.constructor.__super__ ).toBe ISImporter.SensorApplet.prototype

  describe "getCodebase method", ->
    describe "given no pathname", ->
      it "should return \"/jnlp\"", ->
        pathname = null
        expect( applet.getCodebase(pathname) ).toEqual "/jnlp"

    describe "given a pathname with no prefix: \"/experiments/inquiry-space-importer/\"", ->
      it "should return \"/jnlp\"", ->
        pathname = null
        expect( applet.getCodebase(pathname) ).toEqual "/jnlp"

    describe "given a pathname with a prefix: \"/DataGames/Games/concord/lab.dev/experiments/inquiry-space-importer/\"", ->
      it "should return the prefix (\"/DataGames/Games/concord/lab.dev\")  plus \"/jnlp\"", ->
        pathname = "/DataGames/Games/concord/lab.dev/experiments/inquiry-space-importer/"
        expect( applet.getCodebase(pathname) ).toEqual "/DataGames/Games/concord/lab.dev/jnlp"

  describe "when instance properties are set appropriately", ->
    beforeEach ->
      applet.listenerPath = '(dummy listener path)'
      applet.sensorType = '(dummy sensor type)'
      applet.deviceType = '(dummy device type)'
      applet.deviceSpecificJarUrls = [
        'dummy-device-specific-jar1.jar',
        'dummy-device-specific-jar2.jar'
      ]

    describe "getHTML method", ->
      it "should construct the appropriate applet tag", ->
        expect( applet.getHTML() ).toBe [
          '<applet ',
              'id="sensor-applet" ',
              'class="applet sensor-applet" ',
              'archive="com/sun/jna/jna.jar, ',
                       'org/concord/sensor/sensor.jar, ',
                       'org/concord/sensor/sensor-vernier/sensor-vernier.jar, ',
                       'org/concord/sensor/sensor-applets/sensor-applets.jar, ',
                       'dummy-device-specific-jar1.jar, ',
                       'dummy-device-specific-jar2.jar" ',
              'code="org.concord.sensor.applet.SensorApplet" ',
              'codebase="/jnlp" ',
              'width="1px" ',
              'height="1px" ',
              'MAYSCRIPT="true" >',
            '<param name="MAYSCRIPT" value="true" />',
          '</applet>'].join('')

    describe "testAppletReady method", ->

      beforeEach ->
        applet.appletInstance =
          getSensorRequest: ->
          initSensorInterface: ->
        spyOn(applet.appletInstance, 'getSensorRequest').andReturn '(new SensorRequest)'
        spyOn applet.appletInstance, 'initSensorInterface'

      it "should pass the sensorType to the getSensorRequest method of the applet instance", ->
        applet.testAppletReady()
        expect( applet.appletInstance.getSensorRequest ).toHaveBeenCalledWith '(dummy sensor type)'

      it "should pass the listenerPath to the initSensorInterface method of the applet instance", ->
        applet.testAppletReady()
        expect( applet.appletInstance.initSensorInterface ).toHaveBeenCalledWith '(dummy listener path)', '(dummy device type)', ['(new SensorRequest)']

      describe "if getSensorRequest does not throw an error", ->
        it "should return true", ->
          expect( applet.testAppletReady() ).toBe true

      describe "if getSensorRequest throws an error", ->
        beforeEach ->
          applet.appletInstance.getSensorRequest.andThrow new Error()

        it "should return false", ->
          expect( applet.testAppletReady() ).toBe false

  describe "sensorsReady applet callback", ->

    it "should call sensorIsReady parent method", ->
      spyOn applet, 'sensorIsReady'
      applet.sensorsReady()
      expect( applet.sensorIsReady ).toHaveBeenCalled()

    describe "return value of getIsInAppletCallback method", ->

      describe "during sensorIsReady method", ->

        returnValueDuring = null
        beforeEach ->
          returnValueDuring = null
          spyOn( applet, 'sensorIsReady' ).andCallFake ->
            returnValueDuring = applet.getIsInAppletCallback()

        it "should be true", ->
          applet.sensorsReady()
          expect( returnValueDuring ).toBe true

    describe "after sensorsReady returns", ->

      it "should be false", ->
        applet.sensorsReady()
        expect( applet.getIsInAppletCallback() ).toBe false

  describe "The dataReceived applet callback", ->

    dataCb = null

    beforeEach ->
      dataCb = jasmine.createSpy 'dataCb'
      applet.on 'data', dataCb

    it "should emit the 'data' event", ->
      applet.dataReceived null, 1, [1.0]
      expect( dataCb ).toHaveBeenCalled()

    describe "the data callback", ->

      it "should be called while getIsInAppletCallback() returns true", ->
          wasIn = null
          dataCb.andCallFake -> wasIn = applet.getIsInAppletCallback()

          applet.dataReceived null, 1, [1.0]
          expect( wasIn ).toBe true

      describe "when dataReceived is sent an array with a single datum", ->
        it "should be called with the datum received from the applet callback", ->
          applet.dataReceived null, 1, [1.0]
          expect( dataCb ).toHaveBeenCalledWith 1.0

      describe "when dataReceived is sent an array with more than one datum", ->
        it "should be called once with each datum", ->
          applet.dataReceived null, 2, [1.0, 2.0]
          expect( dataCb.callCount ).toBe 2
          expect( dataCb.argsForCall[0] ).toEqual [1.0]
          expect( dataCb.argsForCall[1] ).toEqual [2.0]

    describe "after dataReceived returns", ->

      beforeEach ->
        applet.dataReceived()

      describe "getIsInAppletCallback method", ->
        it "should return false", ->
          expect( applet.getIsInAppletCallback() ).toBe false

  describe "The dataStreamEvent applet callback", ->

    it "should exist and be callable", ->
      expect( typeof applet.dataStreamEvent ).toBe 'function'

    it "should not throw an error", ->
      expect( applet.dataStreamEvent ).not.toThrow()

  describe "_stopSensor method", ->

    beforeEach ->
      applet.appletInstance =
        stopCollecting: ->
      spyOn applet.appletInstance, 'stopCollecting'

    describe "when called from outside an applet callback", ->
      it "should call the applet stopCollecting method", ->
        applet._stopSensor();
        expect( applet.appletInstance.stopCollecting ).toHaveBeenCalled()

    describe "when called from within an applet callback", ->

      beforeEach ->
        applet.startAppletCallback()
        runs -> applet._stopSensor()

      describe "immediately", ->
        it "should not have called the applet stopCollecting method", ->
          runs -> expect( applet.appletInstance.stopCollecting ).not.toHaveBeenCalled()

      describe "after waiting", ->
        beforeEach ->
          waits 100

        it "should have called the applet stopCollecting method", ->
          runs -> expect( applet.appletInstance.stopCollecting ).toHaveBeenCalled()

  describe "_startSensor method", ->

    beforeEach ->
      applet.appletInstance =
        startCollecting: ->
      spyOn applet.appletInstance, 'startCollecting'

    describe "when called from outside an applet callback", ->
      it "should call the applet startCollecting method", ->
        applet._startSensor();
        expect( applet.appletInstance.startCollecting ).toHaveBeenCalled()

    describe "when called from within an applet callback", ->

      beforeEach ->
        applet.startAppletCallback()
        runs -> applet._startSensor()

      describe "immediately", ->
        it "should not have called the applet startCollecting method", ->
          runs -> expect( applet.appletInstance.startCollecting ).not.toHaveBeenCalled()

      describe "after waiting", ->
        beforeEach ->
          waits 100

        it "should have called the applet stopCollecting method", ->
          runs -> expect( applet.appletInstance.startCollecting ).toHaveBeenCalled()


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

