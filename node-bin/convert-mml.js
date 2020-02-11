#!/usr/bin/env node
/*
 * decaffeinate suggestions:
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */

/*
  Converts a single MML file to a json file, optionally with an _id attribute for
  inserting into CouchDB.
*/

const parseMML = require("../src/helpers/md2d/mml-parser");
const fs = require("fs");
const mkdirp = require("mkdirp");

const inFile = process.argv[2];
const outFile = process.argv[3];
const id = process.argv[4];

const mml = fs.readFileSync(inFile).toString();
const conversion = parseMML.parseMML(mml);

if (conversion.json) {
  if (id != null) {
    conversion.json._id = id;
  }
  fs.writeFileSync(outFile, JSON.stringify(conversion.json, null, 2));
} else {
  console.error(`Error converting file ${inFile}:\n${conversion.error}`);
  process.exit(1);
}
