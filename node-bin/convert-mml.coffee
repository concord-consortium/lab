#!/usr/bin/env coffee

###
  Converts a single MML file to a json file, optionally with an _id attribute for
  inserting into CouchDB.
###

parseMML = require '../src/mw-helpers/mml-parser'
fs       = require 'fs'
mkdirp   = require 'mkdirp'

inFile = process.argv[2]
outFile = process.argv[3]
id = process.argv[4]

mml = fs.readFileSync(inFile).toString()
conversion = parseMML.parseMML(mml)

if conversion.json
  if id? then conversion.json._id = id
  fs.writeFileSync outFile, JSON.stringify(conversion.json, null, 2)
else
  console.error "Error converting file #{inFile}:\n#{conversion.error}"
  process.exit(1)
