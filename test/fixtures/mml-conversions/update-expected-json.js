#!/usr/bin/env node
var fs = require('fs');
var parseMML = require('../../../src/helpers/md2d/md2d-node-api').parseMML;
var mmlFileNames = fs.readdirSync('input-mml');

mmlFileNames.forEach(function(mmlFileName) {
  var mml = fs.readFileSync('input-mml/'+mmlFileName).toString();
  var conversion = parseMML(mml);
  var jsonFileName = mmlFileName.replace(/mml$/, 'json');

  if (conversion.error) {
    throw new Error("could not convert input file \"" + mmlFileName + "\"; error = " + conversion.error);
  }
  fs.writeFileSync('expected-json/' + jsonFileName, JSON.stringify(conversion.json, null, 2));
});
