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
      interactive = null
      controller = null
      model = null

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
                modelObject = interactive.models[0].model

