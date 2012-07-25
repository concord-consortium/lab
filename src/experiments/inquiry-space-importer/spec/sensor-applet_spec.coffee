describe "SensorApplet class", ->

  applet = null

  beforeEach ->
    applet = new ISImporter.SensorApplet()

  it "should exist", ->
    expect( applet ).toBeDefined()

  describe "testAppletReady method", ->
    it "should defer to child class implementation", ->
      expect( applet.testAppletReady ).toThrow()

  describe "getHTML method", ->
    it "should defer to child class implementation", ->
      expect( applet.getHTML ).toThrow()

  describe "_startSensor method", ->
    it "should defer to child class implementation", ->
      expect( applet._startSensor ).toThrow()

  describe "_startSensor method", ->
    it "should defer to child class implementation", ->
      expect( applet._stopSensor ).toThrow()

  describe "_appendHTML method", ->
    it "should exist and be callable", ->
      expect( typeof applet._appendHTML ).toBe 'function'

  describe "getState method", ->
    describe "initially", ->
      it "should return 'not appended'", ->
        expect( applet.getState() ).toBe 'not appended'

  describe "append method", ->

    beforeEach ->
      spyOn( applet, 'getHTML' ).andReturn '<applet> tag from getHTML method'
      spyOn( applet, '_appendHTML' )
      applet.testAppletReady = ->

    it "should call the getHTML method to request the applet HTML", ->
      applet.append()
      expect( applet.getHTML ).toHaveBeenCalled()

    it "should append the applet HTML to the DOM", ->
      applet.append()
      expect( applet._appendHTML ).toHaveBeenCalledWith '<applet> tag from getHTML method'

    it "should go into 'appended' state", ->
      applet.append()
      expect( applet.getState() ).toBe 'appended'

    describe "when the applet is in the 'not appended' state", ->

      beforeEach ->
        applet.getState = -> 'not appended'

      it "should not throw an error", ->
        expect( -> applet.append() ).not.toThrow()

    describe "when the applet is not in the 'not appended' state", ->

      beforeEach ->
        applet.getState = -> 'appended'

      it "should throw an error", ->
        expect( -> applet.append() ).toThrow()

  describe "after appending", ->

    beforeEach ->
      applet.getHTML = -> 'dummy <applet>'
      applet._appendHTML = ->
      applet.testAppletReady = ->
      applet.testAppletReadyInterval = 50

      spyOn applet, 'testAppletReady'
      runs -> applet.append()

    describe "immediately", ->
      it "should not have called testAppletReady", ->
        runs -> expect( applet.testAppletReady ).not.toHaveBeenCalled()

    describe "and the applet is not yet ready", ->

      beforeEach ->
        runs -> applet.testAppletReady.andReturn false

      describe "after waiting", ->

        beforeEach ->
          waits 100

        it "should call testAppletReady additional times", ->
          runs -> applet.testAppletReady.reset()
          waits 100
          runs -> expect( applet.testAppletReady ).toHaveBeenCalled()

        describe "and the applet becomes ready", ->
          appletReadyCallback = null

          beforeEach ->
            runs ->
              appletReadyCallback = jasmine.createSpy 'appletReadyCallback'
              applet.on 'appletReady', appletReadyCallback
              applet.testAppletReady.andReturn true

          describe "initially", ->
            it "should be in the 'appended' state", ->
              runs -> expect( applet.getState() ).toBe 'appended'

            it "should not have fired the appletReady event", ->
              runs -> expect( appletReadyCallback ).not.toHaveBeenCalled()

          describe "and the sensorIsReady method is not called", ->

            describe "after waiting", ->

              beforeEach ->
                waits 100

              it "should have stopped calling testAppletReady", ->
                runs -> applet.testAppletReady.reset()
                waits 100
                runs -> expect( applet.testAppletReady ).not.toHaveBeenCalled()

              it "should be in the 'applet ready' state", ->
                runs -> expect( applet.getState() ).toBe 'applet ready'

              it "should have fired the appletReady event", ->
                runs -> expect( appletReadyCallback ).toHaveBeenCalled()

          describe "and the sensorIsReady method is called", ->

            beforeEach ->
              runs -> applet.sensorIsReady()

            describe "after waiting", ->

              beforeEach ->
                waits 100

              it "should be in the 'stopped' state", ->
                runs -> expect( applet.getState() ).toBe 'stopped'

              it "should still have fired the appletReady event", ->
                runs -> expect( appletReadyCallback ).toHaveBeenCalled()


  describe "the sensorIsReady method", ->

    beforeEach ->
      applet._state = 'applet ready'

    it "should go to the 'stopped' state", ->
      expect( applet.getState() ).toBe 'applet ready'
      applet.sensorIsReady()
      expect( applet.getState() ).toBe 'stopped'

    it "should fire the 'sensorReady' event", ->
      sensorReady = jasmine.createSpy 'sensorReady'
      applet.on 'sensorReady', sensorReady
      applet.sensorIsReady()
      expect( sensorReady ).toHaveBeenCalled()

    describe "the 'start' method", ->

      beforeEach ->
        spyOn applet, '_startSensor'

      describe "in the 'stopped' state", ->

        beforeEach ->
          applet._state = 'stopped'
          applet.start()

        it "should call the _startSensor method", ->
          expect( applet._startSensor ).toHaveBeenCalled()

        it "should call go to the 'started' state", ->
          expect( applet.getState() ).toBe 'started'

      describe "not in the 'stopped' state", ->

        beforeEach ->
          applet._state = 'not stopped'
          applet.start()

        it "should not call the _startSensor method", ->
          expect( applet._startSensor ).not.toHaveBeenCalled()

        it "should not change state", ->
          expect( applet.getState() ).toBe 'not stopped'

    describe "the 'stop' method", ->

      beforeEach ->
        spyOn applet, '_stopSensor'

      describe "when in the 'started' state", ->

        beforeEach ->
          applet._state = 'started'
          applet.stop()

        it "should call the _stopSensor method", ->
          expect( applet._stopSensor ).toHaveBeenCalled()

        it "should go the the 'stopped' state", ->
          expect( applet.getState() ).toBe 'stopped'

      describe "when not in the 'started' state", ->

        beforeEach ->
          applet._state = 'not started'
          applet.stop()

        it "should not call the _stopSensor method", ->
          expect( applet._stopSensor ).not.toHaveBeenCalled()

        it "should not change state", ->
          expect( applet.getState() ).toBe 'not started'


  describe "initially", ->

    describe "getIsInAppletCallback method", ->
      it "should return false", ->
        expect( applet.getIsInAppletCallback() ).toBe false

    describe "endAppletCallback method", ->
      it "should throw an error", ->
        expect( applet.endAppletCallback ).toThrow()

    describe "after startAppletCallback method is called", ->

      beforeEach ->
        applet.startAppletCallback()

      describe "getIsInAppletCallback method", ->
        it "should return true", ->
          expect( applet.getIsInAppletCallback() ).toBe true

      describe "startAppletCallback method", ->
        it "should throw an error", ->
          expect( applet.startAppletCallback ).toThrow()

      describe "after endAppletCallback method is called", ->

        beforeEach ->
          applet.endAppletCallback()

        describe "getIsInAppletCallback method", ->
          it "should return false", ->
            expect( applet.getIsInAppletCallback() ).toBe false

        describe "endAppletCallback method", ->
          it "should throw an error", ->
            expect( applet.endAppletCallback ).toThrow()
