/**
For the moment, to run these scripts
  $ cd lab
  $ node
  > require('./src/mw-helpers/mw-batch-converter.js')
  > convertMMLFolder()
**/
require('coffee-script');

var parseMML = require('./mml-parser'),
    fs = require('fs'),
    path = require('path'),
    legacyFolderPath = './imports/legacy-mw-content/';

// example mmlFileName:
// 'sam-activities/chemical-reactions/original-interactives-in-pages/page1/page1$0.mml'
convertMMLFile = function(mmlFileName){
  var mml = fs.readFileSync(legacyFolderPath + mmlFileName).toString(),
      modelName = /\/?([^\/]*)\.mml/.exec(mmlFileName)[1],

      // convert model
      conversion = parseMML.parseMML(mml),

      folders = mmlFileName.split('/'),
      outputPath = legacyFolderPath + "converted/";

  if (conversion.json) {
    // create output folders. Will not overwrite anything if it already exists
    fs.mkdir(outputPath);
    for (var i=0, ii=folders.length-1; i<ii; i++){
      outputPath = outputPath + folders[i] + '/';
      fs.mkdir(outputPath);
    }

    // write model out to file. Overwrites any existing file with the same name
    var outputFile = outputPath+modelName+'.json';
    fs.writeFile(outputFile, conversion.json);

    return (outputFile);
  } else {
    console.log("Error converting "+mmlFileName);
    console.log(conversion.error);
    return false;
  }
};

// recursively finds and collects all mml files in a directory
// @param directory e.g. './imports/legacy-mw-content/'
collectAllMMLFiles = function(directory) {
  function addFiles(dir) {
    var mmlFiles = [];
    try {
      var stat = fs.lstatSync(dir);
      if (stat.isFile() && ~dir.indexOf(".mml")) {
        mmlFiles.push(dir);
      } else if (stat.isDirectory()) {
        var files = fs.readdirSync(dir);
        for (var i=0, ii=files.length; i<ii; i++) {
          var file = files[i];
          if (file) {
            mmlFiles = mmlFiles.concat(addFiles(path.join(dir, file)));
          }
        }
      }
    }
    catch (e) {

    }
    return mmlFiles;
  }

  return addFiles(directory);
};

// Batch comverts the entire legacy MML folder
convertMMLFolder = function(){
  var mmlFiles = collectAllMMLFiles(legacyFolderPath),
      successes = 0;
  for (var i=0, ii=mmlFiles.length; i<ii; i++) {
    var relFileName = mmlFiles[i].replace(legacyFolderPath.replace('./',''), '');
    var success = convertMMLFile(relFileName);
    if (success) {
      successes++;
    }
  }

  console.log("");
  console.log("Converted "+successes+" files, failed to convert "+(mmlFiles.length - successes)+" files.");
}

exports.convertMMLFile = convertMMLFile;
exports.convertMMLFolder = convertMMLFolder;