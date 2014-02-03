/*jshint eqnull:true */

/**
  This script goes through all the interactives, runs the processInteractive
  function on each, and saves back to the original filename.

  To use this script in the future to refactor interactives, simply change
  the contents of the processInteractive function.

  To run this script
    $ cd lab
    $ node
    > processor = require('./script/interactives-processor.js')
    > processor.processInteractives()
**/
require('coffee-script/register');

var mkdirp = require('mkdirp'),
    fs = require('fs'),
    path = require('path'),
    sys = require('sys'),

    rootPath = require.main ? path.dirname(require.main.filename) : process.cwd(),
    interactivesFolderPath = path.normalize(rootPath + '/src/examples/interactives/interactives/');

function processInteractives() {
  var interactiveFiles = findInteractives(interactivesFolderPath);

  for (i=0; i < interactiveFiles.length; i++) {
    interactivePath = path.normalize( path.join(interactivesFolderPath, interactiveFiles[i]) )
    json = fs.readFileSync(interactivePath).toString();
    interactive = JSON.parse(json);

    interactive = processInteractive(interactive);

    json = JSON.stringify(interactive, null, 2);
    mkdirp.sync( path.dirname(interactivePath) );
    fs.writeFileSync( interactivePath, json );
  }

  console.log("Processed: ");
  console.log(interactiveFiles);
}

function findInteractives(searchPath, baseDir) {

  // Search relative to the input path if baseDir is not specified
  if (baseDir == null) baseDir = searchPath;

  var interactiveFiles = [],
      stat,
      files,
      i;

  // statSync follows symlinks, unlike lstatSync
  stat = fs.statSync(searchPath);

  if (stat.isFile() && path.extname(searchPath) === '.json') {
    return [path.relative(baseDir, searchPath)];
  }

  if (stat.isDirectory()) {
    files = fs.readdirSync(searchPath);
    for (i=0; i<files.length; i++) {
      if (files[i]) {
        interactiveFiles = interactiveFiles.concat( findInteractives(path.join(searchPath, files[i]), baseDir) );
      }
    }
  }

  return interactiveFiles;
}

/**
  In the future, this function can be replaced with something else
  to process interactives.
**/
function processInteractive(interactive) {
  var pageName,
      component,
      modelIds = [],
      i, ii;


  if (interactive.models) {
    // this file must already have been processed
    return;
  }

  // create new models array
  interactive.models = [];

  // first put the main model in the models array
  if (interactive.model) {
    pageName = /([^\/]*)\.json/.exec(interactive.model.url)[1];
    interactive.model.id = pageName;
    modelIds.push(pageName);
    // create a new object so we can re-order keys
    interactive.models.push({
      id:           interactive.model.id,
      url:          interactive.model.url,
      viewOptions:  interactive.model.viewOptions,
      onLoad:       interactive.model.onLoad
    });
    delete interactive.model;
  }

  function createModelFromURL(url) {
    var model = {},
        modelUrl,
        newModelId,
        option,
        i, ii, j, jj;

    model.id = /([^\/]*)\.json/.exec(url)[1];
    if (~modelIds.indexOf(model.id)) {
      // we already have this one
      return model.id;
    }

    if (interactive)
    model.url = url;
    if (interactive.models[0] && interactive.models[0].viewOptions) {
      model.viewOptions = interactive.models[0].viewOptions;
    }
    interactive.models.push(model);
    modelIds.push(model.id);
    return model.id;
  }

  function processElementAction(element) {
    if (element.action) {
      modelUrl = /.*loadModel\(['"](.*)['"].*\)/.exec(element.action);
      if (modelUrl && modelUrl[1]) {
        newModelId = createModelFromURL(modelUrl[1]);
        element.action = element.action.replace(modelUrl[1], newModelId);
      }
    }

    if (element.loadModel) {
      newModelId = createModelFromURL(element.loadModel);
      element.loadModel = newModelId;
    }
  }

  // then go through each component and see if it loads a model
  // if so, create a new model and add it to the models array
  if (interactive.components) {
    for (i=0, ii=interactive.components.length; i<ii; i++) {
      component = interactive.components[i];
      if (component.action) {
        processElementAction(component);
      }

      if (component.options) {
        for (j=0, jj=component.options.length; j<jj; j++) {
          processElementAction(component.options[j]);
        }
      }
    }
  }

  // re-order keys
  orderedInteractive = {};
  orderedInteractive.title      = interactive.title;
  orderedInteractive.about      = interactive.about;
  orderedInteractive.models     = interactive.models;
  orderedInteractive.components = interactive.components;
  orderedInteractive.layout     = interactive.layout;

  return orderedInteractive;
}


exports.processInteractives     = processInteractives;