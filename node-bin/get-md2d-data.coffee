#!/usr/bin/env coffee

fs         = require 'fs'
path       = require 'path'

mw_helpers = path.normalize(path.dirname(require.main.filename) + "/../src/helpers/md2d")

md2dLoader = require mw_helpers  + '/md2d-loader'

totalTime = 41000  #

format = (n, width) ->
  str = "" + n
  i = str.length

  while i < width
    str += "0"
    i++
  str.slice 0, width

decimal_format = (num, digits) ->
  s = "" + num
  parts = s.split(".")
  digits = 8  if digits is "undefined"
  parts.push "0"  if parts.length is 1
  if digits is 0
    parts[0]
  else
    parts[1] = "." + format(+parts[1], digits)
    parts[0] + parts[1]

runModel = (inFileName, outFileName, modifyModel) ->
  hash  = JSON.parse fs.readFileSync(inFileName).toString()
  model = md2dLoader.fromHash hash

  modifyModel?(model)
  state = model.outputState
  model.setTime 0

  console.log "\ninfile: #{inFileName}\noutfile: #{outFile }\n\ntime\tKE\tTE"

  out = fs.openSync outFileName, 'w'
  while (state.time <= totalTime)
    str = "#{state.time}\t#{decimal_format(state.KE, 4)}\t#{decimal_format(state.KE + state.PE, 4)}"
    fs.writeSync out, str+"\n"
    console.log str
    model.integrate()
  fs.closeSync out


# begin script

# coffee get-md2d-data.coffee path/to/md2d_model_path path/to/outputfile

md2d_model_path = process.argv[2]
outFile = process.argv[3]
runModel md2d_model_path, outFile
