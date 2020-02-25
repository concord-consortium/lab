/**
For the moment, to run these scripts
  $ cd lab
  $ node
  > require('./src/helpers/md2d/mw-batch-converter.js')
  > convertMMLFolder()
  > createCmlJsonIndex(outputHtmlFile)
**/
var parseMML = require('./md2d-node-api').parseMML,
    mkdirp = require('mkdirp'),
    fs = require('fs'),
    path = require('path'),
    jade = require('jade'),

    rootPath = require.main ? path.dirname(require.main.filename) : process.cwd(),
    legacyFolderPath = path.normalize(rootPath + '../../imports/legacy-mw-content/'),
    convertedFolderPath = path.normalize(rootPath + '../../public/imports/legacy-mw-content/converted/'),
    templatePath = legacyFolderPath + 'legacyMMLRunnables.jade';

/**
  Converts one MML file, assuming a directory tree approach.

  @param inputBaseDir  name of root of the directory tree where mml files are found
  @param mmlPath       path to mml file to convert, relative to inputBaseDir
  @param outputBaseDir root of directory tree to which mml files are to be put
  @param onlyOutdated  if true, check mtimes: conversion proceeds only if the output file is not
                          older than the input file. Default is false.

  Reads .mml file at path inputBaseDir/mmlPath
  Writes .json file at outputBaseDir/mmlPath (with '.json' substituted for '.mml')

  @returns true if a conversion was made, false otherwise
  @throws Error if the input file could not be found, or could not be converted.
*/
function convertMMLFile(inputBaseDir, mmlPath, outputBaseDir, onlyOutdated, verbose) {

  var inputPath  = path.normalize( path.join(inputBaseDir, mmlPath) ),
      outputPath = path.normalize( path.join(outputBaseDir, mmlPath) ).replace(/mml$/, 'json'),

      inputMtime,
      outputMtime,
      mml,
      conversion;

  if ( !fs.existsSync(inputPath) ) {
    throw new Error("convertMMLFile: could not find input file \"" + inputPath + "\"");
  }

  // check existence and mtimes
  if (onlyOutdated) {
    if (fs.existsSync(outputPath)) {
      inputMtime  = fs.statSync(inputPath).mtime,
      outputMtime = fs.statSync(outputPath).mtime;

      if (inputMtime.getTime() < outputMtime.getTime()) {
        return false;
      }
    }
  }

  // if we got this far, convert the mml file
  if (verbose) { process.stdout.write(inputPath) }

  mml = fs.readFileSync(inputPath).toString();
  conversion = parseMML(mml);

  if ( conversion.error ) {
    throw new Error("convertMMLFile: could not convert input file \"" + inputPath + "\"; error = " + conversion.error);
  }

  // and write the ouptut
  if (verbose) { process.stdout.write(outputPath + "\n") }

  mkdirp.sync( path.dirname(outputPath) );
  fs.writeFileSync( outputPath, JSON.stringify(conversion.json, null, 2) );
  return true;
}


/**
   Recursively collects all mml files in a directory.

   @param searchPath The path to search. May be a directory or regular file.
   @param baseDir    Base directory name relative to which all paths will be normalized.

   if baseDir is null, assumes 'searchPath' is the baseDir

   @returns Array of mml file paths found starting at searchPath, named relative to baseDir.
*/
function collectAllMMLFiles(searchPath, baseDir) {

  // Search relative to the input path if baseDir is not specified
  if (baseDir == null) baseDir = searchPath;

  var mmlFiles = [],
      stat,
      files,
      i;

  // statSync follows symlinks, unlike lstatSync
  stat = fs.statSync(searchPath);

  if (stat.isFile() && path.extname(searchPath) === '.mml') {
    return [path.relative(baseDir, searchPath)];
  }

  if (stat.isDirectory()) {
    files = fs.readdirSync(searchPath);
    for (i=0; i<files.length; i++) {
      if (files[i]) {
        mmlFiles = mmlFiles.concat( collectAllMMLFiles(path.join(searchPath, files[i]), baseDir) );
      }
    }
  }

  return mmlFiles;
}


/**
  Batch converts the entire legacy MML folder.

  @param onlyOutdated
    Whether to only convert outdated MML files, or convert them all

  @param showProgress
    Whether to print a '.' as each group of 10 files are processed

  @param folderPath
    optional: alternate folder path for processing MML files

  @param verbose
    optional: display input and out filenames as they are being processed

    example: imports/legacy-mw-content/conversion-and-physics-examples/

  @returns The number of files converted.
*/
function convertMMLFolder(onlyOutdated, showProgress, folderPath, verbose) {

  var mmlFiles,
      converted,
      nConverted = 0,
      i;

  if (folderPath) {
    legacyFolderPath = folderPath;
    convertedFolderPath = legacyFolderPath.replace(/imports\/legacy-mw-content/, 'public/imports/legacy-mw-content/converted');
  }

  mmlFiles = collectAllMMLFiles(legacyFolderPath);

  if (verbose) { process.stdout.write("\n"); }

  for (i=0; i < mmlFiles.length; i++) {
    converted = convertMMLFile(legacyFolderPath, mmlFiles[i], convertedFolderPath, !!onlyOutdated, verbose);
    if (converted) nConverted++;
    if (!verbose) {
      if (showProgress && nConverted > 0 && nConverted % 10 === 0) process.stdout.write('.');
    }
  }

  process.stdout.write("\n");

  return nConverted;
}


/**
  This assumes that convertMMLFolder() has already run. It searches for all the cml files,
  finds all the related json model files, and creates a web page that has runnable links
  for both of them
  @param outputFile = e.g. './public/imports/legacy-mw-content/legacyMMLRunnables.html'
*/
function createCmlJsonIndex(outputFile) {

  var mmlFiles = collectAllMMLFiles(legacyFolderPath),
      cmlToJsonHash = {},
      template, jadeFn, html,
      i,
      j;

  for (i = 0; i < mmlFiles.length; i++) {

    var mmlFolderPath = path.normalize( path.join( legacyFolderPath, path.dirname( mmlFiles[i] ) ) ),
        files = fs.readdirSync(mmlFolderPath),
        cmlFiles = [],
        cmlFilePath;

    for (j = 0; j < files.length; j++) {
      if (path.extname( files[j] ) === '.cml') {
        cmlFiles.push( files[j] );
      }
    }

    // for now ignore folders that have more than one cml file
    if (cmlFiles.length === 1) {
      cmlFilePath = mmlFolderPath.match(path.normalize(legacyFolderPath) + '(.+)')[1] + '/' + cmlFiles[0];
      cmlToJsonHash[cmlFilePath] = [];
      // find all the JSON files in the equivalent converted folder
      var relFolderName = mmlFolderPath.replace(legacyFolderPath.replace('./',''), ''),
          convertedFolderName = convertedFolderPath + relFolderName,
          jsonFiles;
      try {
        jsonFiles = fs.readdirSync(convertedFolderName);
        for (var k=0, kk=jsonFiles.length; k<kk; k++) {
          cmlToJsonHash[cmlFilePath].push('converted/' + relFolderName + '/' +jsonFiles[k]);
        }
      } catch (e) {
        // no converted json files could be found, that's ok
      }
    }
  }

  template = fs.readFileSync(templatePath);
  jadeFn = jade.compile(template, { pretty: true });
  html = jadeFn({cmlToJsonHash: cmlToJsonHash});

  fs.writeFileSync(outputFile, html);

  console.log("Created index at "+outputFile);
  return cmlToJsonHash;
}

exports.convertMMLFile     = convertMMLFile;
exports.convertMMLFolder   = convertMMLFolder;
exports.createCmlJsonIndex = createCmlJsonIndex;
exports.collectAllMMLFiles = collectAllMMLFiles;
