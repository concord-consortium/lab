#!/usr/bin/env coffee

md2dLoader = require './lib/md2d-loader'
fs         = require 'fs'

totalTime = 41000  #

runModel = (inFileName, outFileName, modifyModel) ->
  hash  = JSON.parse fs.readFileSync(inFileName).toString()
  model = md2dLoader.fromHash hash

  modifyModel?(model)
  state = model.outputState
  model.setTime 0

  console.log "\n\ninfile: #{inFileName}\noutfile: #{outFile }\n\ntime\tKE\tTE"

  out = fs.openSync outFileName, 'w'
  while (state.time <= totalTime)
    str = "#{state.time}\t#{state.KE}\t#{state.KE + state.PE}"
    fs.writeSync out, str+"\n"
    console.log str
    model.integrate()
  fs.closeSync out


# begin script

# coffee get-md2d-data.coffee path/to/md2d_model_path path/to/outputfile

md2d_model_path = process.argv[2]
outFile = process.argv[3]
runModel md2d_model_path, outFile
