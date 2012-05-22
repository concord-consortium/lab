/**
For the moment, to run these scripts
  $ cd lab
  $ node
  > require('./src/mw-helpers/mw-batch-converter.js')
  > convertMMLFolder()
  > createCmlJsonIndex(outputHtmlFile)
**/
require('coffee-script');

var parseMML = require('./mml-parser'),
    fs = require('fs'),
    path = require('path'),
    jade = require('jade'),
    legacyFolderPath = './imports/legacy-mw-content/',
    convertedFolderPath = './imports/legacy-mw-content/converted/',
    templatePath = './imports/legacy-mw-content/legacyMMLRunnables.jade';

// example mmlFileName:
// 'sam-activities/chemical-reactions/original-interactives-in-pages/page1/page1$0.mml'
convertMMLFile = function(mmlFileName){
  var mml = fs.readFileSync(legacyFolderPath + mmlFileName).toString(),
      modelName = /\/?([^\/]*)\.mml/.exec(mmlFileName)[1],

      // convert model
      conversion = parseMML.parseMML(mml),

      folders = mmlFileName.split('/'),
      outputPath = convertedFolderPath;

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
  return mmlFiles;
};

// This assumes that convertMMLFolder() has already run. It searches for all the cml files,
// finds all the related json model files, and creates a web page that has runnable links
// for both of them
// @param outputFile = e.g. './dist/imports/legacy-mw-content/legacyMMLRunnables.html'
createCmlJsonIndex = function(outputFile) {
  var mmlFiles = collectAllMMLFiles(legacyFolderPath),
      cmlToJsonHash = {},
      template, jadeFn, html;

  for (var i=0, ii=mmlFiles.length; i<ii; i++) {
    var mmlFolderPath = path.dirname(mmlFiles[i]),
        files = fs.readdirSync(mmlFolderPath),
        cmlFiles = [],
        cmlFile, cmlFilePath;
    for (var j=0, jj=files.length; j<jj; j++) {
      if (~files[j].indexOf('.cml')) {
        cmlFiles.push(files[j]);
      }
    }

    // for now ignore folders that have more than one cml file
    if (cmlFiles.length === 1) {
      cmlFilePath = mmlFolderPath + '/' + cmlFiles[0];
      cmlToJsonHash[cmlFilePath] = [];
      // find all the JSON files in the equivalent converted folder
      var relFolderName = mmlFolderPath.replace(legacyFolderPath.replace('./',''), ''),
          convertedFolderName = convertedFolderPath + relFolderName,
          jsonFiles;
      try {
        jsonFiles = fs.readdirSync(convertedFolderName);
        for (var k=0, kk=jsonFiles.length; k<kk; k++) {
          cmlToJsonHash[cmlFilePath].push(convertedFolderName + '/' +jsonFiles[k]);
        }
      } catch (e) {
        // no converted json files could be found, that's ok
      }
    }
  }

  template = fs.readFileSync(templatePath);
  jadeFn = jade.compile(template, { pretty: true });
  html = jadeFn({cmlToJsonHash: cmlToJsonHash});

  fs.writeFile(outputFile, html);

  console.log("Created index at "+outputFile);
  return cmlToJsonHash;
};

exports.convertMMLFile = convertMMLFile;
exports.convertMMLFolder = convertMMLFolder;
exports.createCmlJsonIndex = createCmlJsonIndex;