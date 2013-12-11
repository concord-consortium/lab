fs      = require 'fs'
helpers = require '../../helpers'
helpers.setupBrowserEnvironment()

helpers.withIsolatedRequireJSAndViewsMocked (requirejs) ->
  interactivesController = requirejs 'common/controllers/interactives-controller'
  arrayTypes             = requirejs 'common/array-types'

  # A tiny helper function.
  endsWith = (str, suffix) ->
    str.indexOf(suffix, str.length - suffix.length) != -1

  describe "Lab interactives: serialization", ->
    controller = null

    before ->
      # Overwrite default float arrays type. It's required, as when Float32Array is used,
      # there are some numerical errors involved, which cause that serialize-deserialize
      # tests fail.
      arrayTypes.floatType = "Float64Array"

    describe "serialization right after initialization should return object equal to original JSON input", ->
      # Limit test only to interactives from 'conversion-test' directory.
      # However, you can change path to e.g. './src/examples/interactives/interactives'
      # and perform a really comprehensive, slow tests of all interactives serialization.
      # Nested directories are supported.
      # TODO: change path to (...)/interactives directory, when the slow mocha tests problem is fixed.
      path = './src/interactives/conversion-tests'
      queue = fs.readdirSync path
      # Use only absolute paths.
      queue = queue.map (file) -> "#{path}/#{file}"

      while queue.length > 0
        inputFile = queue.pop()

        if fs.statSync(inputFile).isDirectory()
          # Process directory.
          subdir = fs.readdirSync inputFile
          subdir = subdir.map (file) -> "#{inputFile}/#{file}"
          queue = queue.concat subdir

        else if endsWith inputFile, ".json"
          do (inputFile) ->
            console.log inputFile
            # Process JSON file.
            it "testing: #{inputFile}", ->
              interactiveJSON = fs.readFileSync(inputFile).toString()
              interactive = JSON.parse interactiveJSON

              if interactive.models[0].url
                try
                  modelObject = helpers.getModel "../../../public/#{interactive.models[0].url}"
                catch
                  # In some cases model can be unavailable (there is one such test interactive)
                  modelObject = {}
                helpers.withModel modelObject, ->
                  controller = interactivesController interactive, 'body'
              else
                # model definition is inside interactive JSON, no need to use helper.withModel
                controller = interactivesController interactive, 'body'

              # This direct call to validate is necessary to provide all default values
              # and allow to compare this object with serialized version using simple 'should.eql'.
              validatedInteractive = controller.validateInteractive(interactive)
              serializedInteractive = controller.serialize()

              # Helper.
              deleteProp = (i, name) ->
                delete serializedInteractive.components[i][name]
                delete validatedInteractive.components[i][name]

              # Sliders initial values need a special way to check their correctness.
              # Due to min, max and step properties, initialValue provided by author / user
              # is very often adjusted to fit stepping of the slider.
              compareSliders = (i) ->
                sliderA = validatedInteractive.components[i]
                if sliderA.initialValue?
                  sliderB = serializedInteractive.components[i]
                  stepLen = (sliderA.max - sliderA.min) / sliderA.steps

                  min = sliderA.initialValue - stepLen
                  max = sliderA.initialValue + stepLen
                  sliderB.initialValue.should.be.within min, max

              # Handle special cases for sliders and graphs.
              for comp, i in serializedInteractive.components
                if comp.type == "slider"
                  # Compare initial values of sliders.
                  compareSliders i
                  # Now delete these property, as otherwise should.eql call will fail.
                  deleteProp i, "initialValue"
                if comp.type == "graph"
                  # Graph options are now strongly connected with SVG and D3 internals.
                  # This is not supported in JSDOM environment. Because of that, do not
                  # test serialization of some graph properties.
                  # TODO: prepare special test for graphs.
                  deleteProp i, "xmin"
                  deleteProp i, "xmax"
                  deleteProp i, "ymin"
                  deleteProp i, "ymax"

              # Standard comparison of two objects.
              # Note that initial values of sliders and some properties
              # or graphs are deleted above.
              serializedInteractive.should.eql validatedInteractive
