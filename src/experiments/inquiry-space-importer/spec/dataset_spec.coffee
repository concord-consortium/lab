beforeEach ->
  this.addMatchers

    toHaveData: (expected) ->
      # 1. check getDataPoints value
      points = @actual.getDataPoints()
      return false if points.length isnt expected.length
      for point, i in points
        for p, j in point
          return false if points[i][j] isnt expected[i][j]

      # 2. check copyDataInto value
      nFields = expected[0]?.length ? 2
      arrays = ([] for x in [0...nFields])
      @actual.copyDataInto arrays...
      for array, i in arrays
        return false if array.length isnt expected.length
        for a, j in array
          return false if arrays[i][j] isnt expected[j][i]

      true

    toHaveLength: (expected) ->
      return @actual.getLength() is expected

describe "ISImporter.Dataset", ->

  describe "the Dataset class", ->

    it "should exist", ->
      expect( ISImporter.Dataset ).toBeDefined()

    it "should create instances with the new operator", ->
      expect( typeof new ISImporter.Dataset() ).toBe 'object'

  describe "a Dataset instance", ->
    dataset = null
    beforeEach ->
      dataset = new ISImporter.Dataset()

    describe "when created", ->

      it "should have length 0", ->
        expect( dataset ).toHaveLength 0

      it "should have data []", ->
        expect( dataset ).toHaveData []

      describe "its selection domain", ->
        it "should be null", ->
          expect( dataset.getSelectionDomain() ).toBeNull()

      describe "its next x", ->
        it "should be 0", ->
          expect( dataset.getNextX() ).toBe 0

      describe "its x increment", ->
        it "should be 1", ->
          expect( dataset.getXIncrement() ).toBe 1

    describe "its setDataPoints method", ->
      describe "when called with arguments [1,2] and [3,4]", ->
        dataResetSpy = null
        dataLengthInListener = null

        beforeEach ->
          dataResetSpy = jasmine.createSpy 'dataReset'
          dataset.on 'dataReset', ->
            dataResetSpy()
            dataLengthInListener = dataset.getDataPoints().length

          dataset.setDataPoints [1,2], [3,4]

        it "should set the data to [[1,2], [3,4]]", ->
          expect( dataset ).toHaveData [[1,2], [3,4]]

        it "should fire the 'dataReset' event", ->
          expect( dataResetSpy ).toHaveBeenCalled()

        describe "at the time the dataReset handler is called", ->
          it "should already have updated the dataset's data", ->
            expect( dataLengthInListener ).toBe 2

    describe "when initialized with data [[1,2], [3,4]]", ->
      beforeEach ->
        dataset.setDataPoints [1,2], [3,4]

      it "should have length 2", ->
        expect( dataset ).toHaveLength 2

      describe "and x increment is set to 2", ->
        beforeEach ->
          dataset.setXIncrement 2

        describe "and next x is set to 5", ->
          beforeEach ->
            dataset.setNextX 5

          describe "after a datapoint is added by calling add(6)", ->
            dataSpy = null
            dataResetSpy = null
            dataLengthInListener = null

            beforeEach ->
              dataSpy = jasmine.createSpy 'data'
              dataset.on 'data', (args...) ->
                dataSpy args...
                dataLengthInListener = dataset.getDataPoints().length

              dataResetSpy = jasmine.createSpy 'dataReset'
              dataset.on 'dataReset', dataResetSpy
              dataset.add 6

            it "should now have the point [5, 6]", ->
              expect( dataset ).toHaveData [[1,2], [3,4], [5,6]]

            it "should have length 3", ->
              expect( dataset ).toHaveLength 3

            describe "its next x", ->
              it "should be 7", ->
                expect( dataset.getNextX() ).toBe 7

            it "should not fire the 'dataReset' event", ->
              expect( dataResetSpy ).not.toHaveBeenCalled()

            it "should fire the 'data' event", ->
              expect( dataSpy ).toHaveBeenCalled()

            describe "the 'data' event handler", ->
              it "should be called with the new data value [5, 6]", ->
                expect( dataSpy ).toHaveBeenCalledWith [5,6]

              it "should be called after the dataset has been updated with the new data", ->
                expect( dataLengthInListener ).toBe 3

            describe "and another datapoint is added by calling add(8)", ->
              beforeEach ->
                dataset.add 8

              it "should respect the updated next x value of 7", ->
                expect( dataset ).toHaveData [[1,2], [3,4], [5,6], [7,8]]

    describe "its copyDataInto method", ->

      describe "when it is passed two nonempty arrays, 'x' and 'y'", ->
        x = null
        y = null

        beforeEach ->
          x = ['stuff']
          y = ['additional', 'stuff']

        describe "and the data is []", ->
          beforeEach ->
            dataset.setDataPoints()
            dataset.copyDataInto x, y

          it "should set the first array to []", ->
            expect( x ).toEqual []

          it "should set the second array to []", ->
            expect( y ).toEqual []

        describe "and the data is [[1,2], [3,4]]", ->
          beforeEach ->
            dataset.setDataPoints [1,2], [3,4]
            dataset.copyDataInto x, y

          it "should set the first, 'x' array to [1,3]", ->
            expect( x ).toEqual [1, 3]

          it "should set the second, 'y' array to [2,4]", ->
            expect( y ).toEqual [2, 4]

    describe "its getDataPoints method", ->

      describe "when the data is []", ->
        beforeEach ->
          dataset.setDataPoints()

        it "should return []", ->
          expect( dataset.getDataPoints() ).toEqual []

      describe "when the data is [[1,2], [3,4]]", ->
        beforeEach ->
          dataset.setDataPoints [1,2], [3,4]

        it "should return [[1,2], [3,4]]", ->
          expect( dataset.getDataPoints() ).toEqual [[1,2], [3,4]]

    describe "copying behavior", ->
      describe "when setDataPoints is called with [1,2]", ->
        p1 = null
        beforeEach ->
          p1 = [1,2]
          dataset.setDataPoints p1

        describe "and the datapoint is subsequently mutated", ->
          beforeEach ->
            p1[0] = 5

          it "should not change the data in the dataset", ->
            expect( p1 ).toEqual [5,2]
            expect( dataset ).toHaveData [[1,2]]

    describe "selection support", ->

      describe "when data is [[1,2], [3,4], [5,6], [7, 8]", ->
        beforeEach ->
          dataset.setDataPoints [1,2], [3,4], [5,6], [7,8]

        describe "after selecting null", ->
          beforeEach ->
            dataset.select null

          describe "the selection domain", ->
            it "should be null", ->
              expect( dataset.getSelectionDomain() ).toBeNull()

          describe "the selected data", ->
            it "should be null", ->
              expect( dataset.getSelectedDataPoints() ).toBeNull()


        describe "after selecting []", ->
          beforeEach ->
            dataset.select []

          describe "the selection domain", ->
            it "should be []", ->
              expect( dataset.getSelectionDomain() ).toEqual []

          describe "the selected data", ->
            it "should be []", ->
              expect( dataset.getSelectedDataPoints() ).toEqual []


        describe "after selecting the region [2,6]", ->
          beforeEach ->
            dataset.select [2, 6]

          describe "the selection domain", ->
            it "should be [2, 6]", ->
              expect( dataset.getSelectionDomain() ).toEqual [2, 6]

          describe "the selected data", ->
            it "should be [[3,4], [5,6]]", ->
              expect( dataset.getSelectedDataPoints() ).toEqual [[3, 4], [5, 6]]

          describe "when the selection domain lower boundary equals a data point x value (select([1,6]))", ->
            beforeEach ->
              dataset.select [1, 6]

            describe "the selected data", ->
              it "should include the intersecting point ([1,2])", ->
                expect( dataset.getSelectedDataPoints() ).toEqual [[1,2], [3,4], [5,6]]

          describe "when the selection domain upper boundary equals a data point x value (select([2,7]))", ->
            beforeEach ->
              dataset.select [2, 7]

            describe "the selected data", ->
              it "should include the intersecting point ([7, 8])", ->
                expect( dataset.getSelectedDataPoints() ).toEqual [[3,4], [5,6], [7,8]]

          describe "when the select method is called with [xmax, xmin] with xmax > xmin: select([6,2])", ->
            beforeEach ->
              dataset.select [6,2]

            describe "the selection domain", ->
              it "should be reported as [xmin, xmax]", ->
                expect( dataset.getSelectionDomain() ).toEqual [2, 6]

            describe "the selected data", ->
              it "should still contain the data with x values between xmin and xmax", ->
                expect( dataset.getSelectedDataPoints() ).toEqual [[3, 4], [5, 6]]
