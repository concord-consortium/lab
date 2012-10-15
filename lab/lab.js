(function() {
/**
 * almond 0.1.2 Copyright (c) 2011, The Dojo Foundation All Rights Reserved.
 * Available via the MIT or new BSD license.
 * see: http://github.com/jrburke/almond for details
 */
//Going sloppy to avoid 'use strict' string cost, but strict practices should
//be followed.
/*jslint sloppy: true */
/*global setTimeout: false */

var requirejs, require, define;
(function (undef) {
    var defined = {},
        waiting = {},
        config = {},
        defining = {},
        aps = [].slice,
        main, req;

    /**
     * Given a relative module name, like ./something, normalize it to
     * a real name that can be mapped to a path.
     * @param {String} name the relative name
     * @param {String} baseName a real name that the name arg is relative
     * to.
     * @returns {String} normalized name
     */
    function normalize(name, baseName) {
        var baseParts = baseName && baseName.split("/"),
            map = config.map,
            starMap = (map && map['*']) || {},
            nameParts, nameSegment, mapValue, foundMap,
            foundI, foundStarMap, starI, i, j, part;

        //Adjust any relative paths.
        if (name && name.charAt(0) === ".") {
            //If have a base name, try to normalize against it,
            //otherwise, assume it is a top-level require that will
            //be relative to baseUrl in the end.
            if (baseName) {
                //Convert baseName to array, and lop off the last part,
                //so that . matches that "directory" and not name of the baseName's
                //module. For instance, baseName of "one/two/three", maps to
                //"one/two/three.js", but we want the directory, "one/two" for
                //this normalization.
                baseParts = baseParts.slice(0, baseParts.length - 1);

                name = baseParts.concat(name.split("/"));

                //start trimDots
                for (i = 0; (part = name[i]); i++) {
                    if (part === ".") {
                        name.splice(i, 1);
                        i -= 1;
                    } else if (part === "..") {
                        if (i === 1 && (name[2] === '..' || name[0] === '..')) {
                            //End of the line. Keep at least one non-dot
                            //path segment at the front so it can be mapped
                            //correctly to disk. Otherwise, there is likely
                            //no path mapping for a path starting with '..'.
                            //This can still fail, but catches the most reasonable
                            //uses of ..
                            return true;
                        } else if (i > 0) {
                            name.splice(i - 1, 2);
                            i -= 2;
                        }
                    }
                }
                //end trimDots

                name = name.join("/");
            }
        }

        //Apply map config if available.
        if ((baseParts || starMap) && map) {
            nameParts = name.split('/');

            for (i = nameParts.length; i > 0; i -= 1) {
                nameSegment = nameParts.slice(0, i).join("/");

                if (baseParts) {
                    //Find the longest baseName segment match in the config.
                    //So, do joins on the biggest to smallest lengths of baseParts.
                    for (j = baseParts.length; j > 0; j -= 1) {
                        mapValue = map[baseParts.slice(0, j).join('/')];

                        //baseName segment has  config, find if it has one for
                        //this name.
                        if (mapValue) {
                            mapValue = mapValue[nameSegment];
                            if (mapValue) {
                                //Match, update name to the new value.
                                foundMap = mapValue;
                                foundI = i;
                                break;
                            }
                        }
                    }
                }

                if (foundMap) {
                    break;
                }

                //Check for a star map match, but just hold on to it,
                //if there is a shorter segment match later in a matching
                //config, then favor over this star map.
                if (!foundStarMap && starMap && starMap[nameSegment]) {
                    foundStarMap = starMap[nameSegment];
                    starI = i;
                }
            }

            if (!foundMap && foundStarMap) {
                foundMap = foundStarMap;
                foundI = starI;
            }

            if (foundMap) {
                nameParts.splice(0, foundI, foundMap);
                name = nameParts.join('/');
            }
        }

        return name;
    }

    function makeRequire(relName, forceSync) {
        return function () {
            //A version of a require function that passes a moduleName
            //value for items that may need to
            //look up paths relative to the moduleName
            return req.apply(undef, aps.call(arguments, 0).concat([relName, forceSync]));
        };
    }

    function makeNormalize(relName) {
        return function (name) {
            return normalize(name, relName);
        };
    }

    function makeLoad(depName) {
        return function (value) {
            defined[depName] = value;
        };
    }

    function callDep(name) {
        if (waiting.hasOwnProperty(name)) {
            var args = waiting[name];
            delete waiting[name];
            defining[name] = true;
            main.apply(undef, args);
        }

        if (!defined.hasOwnProperty(name)) {
            throw new Error('No ' + name);
        }
        return defined[name];
    }

    /**
     * Makes a name map, normalizing the name, and using a plugin
     * for normalization if necessary. Grabs a ref to plugin
     * too, as an optimization.
     */
    function makeMap(name, relName) {
        var prefix, plugin,
            index = name.indexOf('!');

        if (index !== -1) {
            prefix = normalize(name.slice(0, index), relName);
            name = name.slice(index + 1);
            plugin = callDep(prefix);

            //Normalize according
            if (plugin && plugin.normalize) {
                name = plugin.normalize(name, makeNormalize(relName));
            } else {
                name = normalize(name, relName);
            }
        } else {
            name = normalize(name, relName);
        }

        //Using ridiculous property names for space reasons
        return {
            f: prefix ? prefix + '!' + name : name, //fullName
            n: name,
            p: plugin
        };
    }

    function makeConfig(name) {
        return function () {
            return (config && config.config && config.config[name]) || {};
        };
    }

    main = function (name, deps, callback, relName) {
        var args = [],
            usingExports,
            cjsModule, depName, ret, map, i;

        //Use name if no relName
        relName = relName || name;

        //Call the callback to define the module, if necessary.
        if (typeof callback === 'function') {

            //Pull out the defined dependencies and pass the ordered
            //values to the callback.
            //Default to [require, exports, module] if no deps
            deps = !deps.length && callback.length ? ['require', 'exports', 'module'] : deps;
            for (i = 0; i < deps.length; i++) {
                map = makeMap(deps[i], relName);
                depName = map.f;

                //Fast path CommonJS standard dependencies.
                if (depName === "require") {
                    args[i] = makeRequire(name);
                } else if (depName === "exports") {
                    //CommonJS module spec 1.1
                    args[i] = defined[name] = {};
                    usingExports = true;
                } else if (depName === "module") {
                    //CommonJS module spec 1.1
                    cjsModule = args[i] = {
                        id: name,
                        uri: '',
                        exports: defined[name],
                        config: makeConfig(name)
                    };
                } else if (defined.hasOwnProperty(depName) || waiting.hasOwnProperty(depName)) {
                    args[i] = callDep(depName);
                } else if (map.p) {
                    map.p.load(map.n, makeRequire(relName, true), makeLoad(depName), {});
                    args[i] = defined[depName];
                } else if (!defining[depName]) {
                    throw new Error(name + ' missing ' + depName);
                }
            }

            ret = callback.apply(defined[name], args);

            if (name) {
                //If setting exports via "module" is in play,
                //favor that over return value and exports. After that,
                //favor a non-undefined return value over exports use.
                if (cjsModule && cjsModule.exports !== undef &&
                    cjsModule.exports !== defined[name]) {
                    defined[name] = cjsModule.exports;
                } else if (ret !== undef || !usingExports) {
                    //Use the return value from the function.
                    defined[name] = ret;
                }
            }
        } else if (name) {
            //May just be an object definition for the module. Only
            //worry about defining if have a module name.
            defined[name] = callback;
        }
    };

    requirejs = require = req = function (deps, callback, relName, forceSync) {
        if (typeof deps === "string") {
            //Just return the module wanted. In this scenario, the
            //deps arg is the module name, and second arg (if passed)
            //is just the relName.
            //Normalize module name, if it contains . or ..
            return callDep(makeMap(deps, callback).f);
        } else if (!deps.splice) {
            //deps is a config object, not an array.
            config = deps;
            if (callback.splice) {
                //callback is an array, which means it is a dependency list.
                //Adjust args if there are dependencies
                deps = callback;
                callback = relName;
                relName = null;
            } else {
                deps = undef;
            }
        }

        //Support require(['a'])
        callback = callback || function () {};

        //Simulate async callback;
        if (forceSync) {
            main(undef, deps, callback, relName);
        } else {
            setTimeout(function () {
                main(undef, deps, callback, relName);
            }, 15);
        }

        return req;
    };

    /**
     * Just drops the config on the floor, but returns req in case
     * the config return value is used.
     */
    req.config = function (cfg) {
        config = cfg;
        return req;
    };

    define = function (name, deps, callback) {

        //This module may not have dependencies
        if (!deps.splice) {
            //deps is not an array, so probably means
            //an object literal or factory function for
            //the value. Adjust args.
            callback = deps;
            deps = [];
        }

        waiting[name] = [name, deps, callback];
    };

    define.amd = {
        jQuery: true
    };
}());

define("../vendor/almond/almond", function(){});

/*globals define */
//TODO: Should change and newdomain be global variables?

define('grapher/core/axis',['require'],function (require) {
  return {
    axisProcessDrag: function(dragstart, currentdrag, domain) {
      var originExtent, maxDragIn,
          newdomain = domain,
          origin = 0,
          axis1 = domain[0],
          axis2 = domain[1],
          extent = axis2 - axis1;
      if (currentdrag !== 0) {
        if  ((axis1 >= 0) && (axis2 > axis1)) {                 // example: (20, 10, [0, 40]) => [0, 80]
          origin = axis1;
          originExtent = dragstart-origin;
          maxDragIn = originExtent * 0.2 + origin;
          if (currentdrag > maxDragIn) {
            change = originExtent / (currentdrag-origin);
            extent = axis2 - origin;
            newdomain = [axis1, axis1 + (extent * change)];
          }
        } else if ((axis1 < 0) && (axis2 > 0)) {                // example: (20, 10, [-40, 40])       => [-80, 80]
          origin = 0;                                           //          (-0.4, -0.2, [-1.0, 0.4]) => [-1.0, 0.4]
          originExtent = dragstart-origin;
          maxDragIn = originExtent * 0.2 + origin;
          if ((dragstart >= 0 && currentdrag > maxDragIn) || (dragstart  < 0  && currentdrag < maxDragIn)) {
            change = originExtent / (currentdrag-origin);
            newdomain = [axis1 * change, axis2 * change];
          }
        } else if ((axis1 < 0) && (axis2 < 0)) {                // example: (-60, -50, [-80, -40]) => [-120, -40]
          origin = axis2;
          originExtent = dragstart-origin;
          maxDragIn = originExtent * 0.2 + origin;
          if (currentdrag < maxDragIn) {
            change = originExtent / (currentdrag-origin);
            extent = axis1 - origin;
            newdomain = [axis2 + (extent * change), axis2];
          }
        }
      }
      return newdomain;
    }
  };
});

/*globals define, d3 */

define('grapher/core/register-keyboard-handler',['require'],function (require) {
  return function registerKeyboardHandler(callback) {
    d3.select(window).on("keydown", callback);
  };
});

/*globals define: false, $: false, model: false */
// ------------------------------------------------------------
//
//   Screen Layout
//
// ------------------------------------------------------------

define('common/layout/layout',['require'],function (require) {

  var layout = { version: "0.0.1" };

  layout.selection = "";

  layout.display = {};

  layout.canonical = {
    width:  1280,
    height: 800
  };

  layout.regular_display = false;

  layout.not_rendered = true;
  layout.fontsize = false;
  layout.cancelFullScreen = false;
  layout.screen_factor = 1;
  layout.checkbox_factor = 1.1;
  layout.checkbox_scale = 1.1;
  layout.fullScreenRender = false;

  layout.canonical.width  = 1280;
  layout.canonical.height = 800;

  layout.getDisplayProperties = function(obj) {
    if (!arguments.length) {
      obj = {};
    }
    obj.screen = {
        width:  screen.width,
        height: screen.height
    };
    obj.client = {
        width:  document.body.clientWidth,
        height: document.body.clientHeight
    };
    obj.window = {
        width:  $(window).width(),
        height: $(window).height()
    };
    obj.page = {
        width: layout.getPageWidth(),
        height: layout.getPageHeight()
    };
    obj.screen_factor_width  = obj.window.width / layout.canonical.width;
    obj.screen_factor_height = obj.window.height / layout.canonical.height;
    obj.emsize = Math.max(obj.screen_factor_width * 1.1, obj.screen_factor_height);
    return obj;
  };

  layout.setBodyEmsize = function() {
    var emsize;
    if (!layout.display) {
      layout.display = layout.getDisplayProperties();
    }
    emsize = Math.min(layout.display.screen_factor_width * 1.2, layout.display.screen_factor_height * 1.2);
    $('body').css('font-size', emsize + 'em');
  };

  layout.getVizProperties = function(obj) {
    var $viz = $('#viz');

    if (!arguments.length) {
      obj = {};
    }
    obj.width = $viz.width();
    obj.height = $viz.height();
    obj.screen_factor_width  = obj.width / layout.canonical.width;
    obj.screen_factor_height = obj.height / layout.canonical.height;
    obj.emsize = Math.min(obj.screen_factor_width * 1.1, obj.screen_factor_height);
    return obj;
  };

  layout.setVizEmsize = function() {
    var emsize,
        $viz = $('#viz');

    if (!layout.vis) {
      layout.vis = layout.getVizProperties();
    }
    emsize = Math.min(layout.viz.screen_factor_width * 1.2, layout.viz.screen_factor_height * 1.2);
    $viz.css('font-size', emsize + 'em');
  };

  layout.screenEqualsPage = function() {
    return ((layout.display.screen.width  === layout.display.page.width) ||
            (layout.display.screen.height === layout.display.page.height));
  };

  layout.checkForResize = function() {
    if ((layout.display.screen.width  !== screen.width) ||
        (layout.display.screen.height !== screen.height) ||
        (layout.display.window.width  !== document.width) ||
        (layout.display.window.height !== document.height)) {
      layout.setupScreen();
    }
  };

  layout.views = {};

  layout.addView = function(type, view) {
    if (!layout.views[type]) {
      layout.views[type] = [];
    }
    layout.views[type].push(view);
  };

  layout.setView = function(type, viewArray) {
    layout.views[type] = viewArray;
  };

  layout.setupScreen = function(event) {
    var emsize,
        viewLists  = layout.views,
        fullscreen = document.fullScreen ||
                     document.webkitIsFullScreen ||
                     document.mozFullScreen;

    if (event && event.forceRender) {
      layout.not_rendered = true;
    }

    layout.display = layout.getDisplayProperties();
    layout.viz = layout.getVizProperties();

    if (!layout.regular_display) {
      layout.regular_display = layout.getDisplayProperties();
    }


    if(fullscreen || layout.fullScreenRender  || layout.screenEqualsPage()) {
      layout.fullScreenRender = true;
      layout.screen_factor_width  = layout.display.page.width / layout.canonical.width;
      layout.screen_factor_height = layout.display.page.height / layout.canonical.height;
      layout.screen_factor = layout.screen_factor_height;
      layout.checkbox_factor = Math.max(0.8, layout.checkbox_scale * layout.screen_factor);
      $('body').css('font-size', layout.screen_factor + "em");
      layout.not_rendered = true;
      switch (layout.selection) {

        // fluid layout
        case "simple-screen":
        if (layout.not_rendered) {
          setupSimpleFullScreenMoleculeContainer();
        }
        break;

        // only fluid on page load (and when resizing on trnasition to and from full-screen)
        case "simple-static-screen":
        if (layout.not_rendered) {
          setupSimpleFullScreenMoleculeContainer();
        }
        break;

        // fluid (but normally the iframe doesn't expose the full-screen action)
        case "simple-iframe":
        setupSimpleFullScreenMoleculeContainer();
        setupFullScreenDescriptionRight();
        break;

        // fluid layout
        case "compare-screen":
        emsize = Math.min(layout.screen_factor_width * 1.1, layout.screen_factor_height);
        $('body').css('font-size', emsize + "em");
        compareScreen();
        layout.not_rendered = false;
        break;

        // only fluid on page load (and when resizing on trnasition to and from full-screen)
        default:
        if (layout.not_rendered) {
          setupFullScreen();
        }
        break;
      }
    } else {
      if (layout.cancelFullScreen || layout.fullScreenRender) {
        layout.cancelFullScreen = false;
        layout.fullScreenRender = false;
        layout.not_rendered = true;
        layout.regular_display = layout.previous_display;
      } else {
        layout.regular_display = layout.getDisplayProperties();
      }
      layout.screen_factor_width  = layout.display.page.width / layout.canonical.width;
      layout.screen_factor_height = layout.display.page.height / layout.canonical.height;
      layout.screen_factor = layout.screen_factor_height;
      layout.checkbox_factor = Math.max(0.8, layout.checkbox_scale * layout.screen_factor);
      switch (layout.selection) {

        // fluid layout
        case "simple-screen":
        emsize = Math.min(layout.screen_factor_width * 1.1, layout.screen_factor_height);
        $('body').css('font-size', emsize + 'em');
        simpleScreen();
        break;

        // only fluid on page load (and when resizing on trnasition to and from full-screen)
        case "simple-static-screen":
        if (layout.not_rendered) {
          emsize = Math.min(layout.screen_factor_width * 1.1, layout.screen_factor_height);
          $('body').css('font-size', emsize + 'em');
          simpleStaticScreen();
          layout.not_rendered = false;
        }
        break;

        // fluid layout
        case "simple-iframe":
        emsize = Math.min(layout.screen_factor_width * 1.5, layout.screen_factor_height);
        $('body').css('font-size', emsize + 'em');
        setupSimpleIFrameScreen();
        break;

        // only fluid on page load (and when resizing on trnasition to and from full-screen)
        case "full-static-screen":
        if (layout.not_rendered) {
          emsize = Math.min(layout.screen_factor_width * 1.5, layout.screen_factor_height);
          $('body').css('font-size', emsize + 'em');
          regularScreen();
          layout.not_rendered = false;
        }
        break;

        // fluid layout
        case "compare-screen":
        emsize = Math.min(layout.screen_factor_width * 1.1, layout.screen_factor_height);
        $('body').css('font-size', emsize + 'em');
        compareScreen();
        break;

        // only fluid on page load (and when resizing on trnasition to and from full-screen)
        case "interactive":
        if (layout.not_rendered) {
          layout.setVizEmsize();
          setupInteractiveScreen();
          layout.not_rendered = false;
        }
        break;

        // like simple-iframe, but all component position definitions are set from properties
        case "interactive-iframe":
        layout.setBodyEmsize();
        setupInteractiveIFrameScreen();
        break;

        default:
        layout.setVizEmsize();
        setupRegularScreen();
        break;
      }
      layout.regular_display = layout.getDisplayProperties();
    }
    if (layout.transform) {
      $('input[type=checkbox]').css(layout.transform, 'scale(' + layout.checkbox_factor + ',' + layout.checkbox_factor + ')');
    }

    if (layout.temperature_control_checkbox) {
      model.addPropertiesListener(["temperature_control"], layout.temperatureControlUpdate);
      layout.temperatureControlUpdate();
    }

    var benchmarks_table = document.getElementById("benchmarks-table");
    if (benchmarks_table) {
      benchmarks_table.style.display = "none";
    }

    //
    // Regular Screen Layout
    //
    function setupRegularScreen() {
      var i, width, height, mcsize,
          rightHeight, rightHalfWidth, rightQuarterWidth,
          widthToPageRatio, modelAspectRatio,
          pageWidth = layout.display.page.width,
          pageHeight = layout.display.page.height;

      mcsize = viewLists.moleculeContainers[0].scale();
      modelAspectRatio = mcsize[0] / mcsize[1];
      widthToPageRatio = mcsize[0] / pageWidth;
      width = pageWidth * 0.40;
      height = width * 1/modelAspectRatio;
      if (height > pageHeight * 0.55) {
        height = pageHeight * 0.55;
        width = height * modelAspectRatio;
      }
      // HACK that will normally only work with one moleculeContainer
      // or if all the moleculeContainers end up the same width
      i = -1;  while(++i < viewLists.moleculeContainers.length) {
        viewLists.moleculeContainers[i].resize(width, height);
      }
      rightQuarterWidth = (pageWidth - width) * 0.35;
      rightHeight = height * 0.52;
      i = -1;  while(++i < viewLists.potentialCharts.length) {
        viewLists.potentialCharts[i].resize(rightQuarterWidth, rightHeight);
      }
      i = -1;  while(++i < viewLists.speedDistributionCharts.length) {
        viewLists.speedDistributionCharts[i].resize(rightQuarterWidth, rightHeight);
      }
      rightHalfWidth = (pageWidth - width) * 0.72;
      rightHeight = height * 0.76;
      i = -1;  while(++i < viewLists.energyCharts.length) {
        viewLists.energyCharts[i].resize(rightHalfWidth, rightHeight);
      }
    }

    //
    // Interactive Screen Layout
    //
    function setupInteractiveScreen() {
      var i, width, height, mcsize,
          modelWidth,
          modelHeight,
          modelDimensions,
          modelAspectRatio,
          modelWidthFactor,
          viewSizes = {},
          containerWidth = layout.viz.width,
          containerHeight = layout.viz.height;

      modelDimensions = viewLists.moleculeContainers[0].scale();
      modelAspectRatio = modelDimensions[0] / modelDimensions[1];
      modelWidthFactor = 0.70;
      if (viewLists.thermometers) {
        modelWidthFactor -= 0.10;
      }
      if (viewLists.energyGraphs) {
        modelWidthFactor -= 0.45;
      }
      modelWidth = containerWidth * modelWidthFactor;
      modelHeight = modelWidth / modelAspectRatio;
      if (modelHeight > containerHeight * 0.60) {
        modelHeight = containerHeight * 0.60;
        modelWidth = modelHeight * modelAspectRatio;
      }
      viewSizes.moleculeContainers = [modelWidth, modelHeight];
      if (viewLists.energyGraphs) {
        viewSizes.energyGraphs = [containerWidth * 0.40, modelHeight * 1.25];
      }
      for (viewType in viewLists) {
        if (viewLists.hasOwnProperty(viewType) && viewLists[viewType].length) {
          i = -1;  while(++i < viewLists[viewType].length) {
            if (viewSizes[viewType]) {
              viewLists[viewType][i].resize(viewSizes[viewType][0], viewSizes[viewType][1]);
            } else {
              viewLists[viewType][i].resize();
            }
          }
        }
      }
    }

    //
    // Interactive iframe Screen Layout
    //
    function setupInteractiveIFrameScreen() {
      var i,
          modelWidth,
          modelHeight,
          modelDimensions,
          modelAspectRatio,
          modelWidthFactor,
          modelPaddingFactor,
          modelHeightFactor = 0.85,
          viewSizes = {},
          containerWidth = $(window).width(),
          containerHeight = $(window).height(),
          mcWidth = $('#molecule-container').width();

      modelDimensions = viewLists.moleculeContainers[0].scale();
      modelAspectRatio = modelDimensions[2] / modelDimensions[3];
      modelWidthFactor = 0.85;

      modelWidthPaddingFactor = modelDimensions[0]/modelDimensions[2] - 1.05;
      modelWidthFactor -= modelWidthPaddingFactor;

      modelHeightPaddingFactor = modelDimensions[1]/modelDimensions[3] - 1.05;
      modelHeightFactor -= modelHeightPaddingFactor;
      if (viewLists.thermometers) {
        modelWidthFactor -= 0.05;
      }
      if (viewLists.energyGraphs) {
        modelWidthFactor -= 0.35;
      }
      viewLists.bottomItems = $('#bottom').children().length;
      if (viewLists.bottomItems) {
        modelHeightFactor -= ($('#bottom').height() * 0.0025);
      }
      modelWidth = containerWidth * modelWidthFactor;
      modelHeight = modelWidth / modelAspectRatio;
      if (modelHeight > containerHeight * modelHeightFactor) {
        modelHeight = containerHeight * modelHeightFactor;
        modelWidth = modelHeight * modelAspectRatio;
      }
      viewSizes.moleculeContainers = [modelWidth, modelHeight];
      if (viewLists.energyGraphs) {
        viewSizes.energyGraphs = [containerWidth * 0.40, modelHeight * 1.2];
      }
      for (viewType in viewLists) {
        if (viewLists.hasOwnProperty(viewType) && viewLists[viewType].length) {
          i = -1;  while(++i < viewLists[viewType].length) {
            if (viewSizes[viewType]) {
              viewLists[viewType][i].resize(viewSizes[viewType][0], viewSizes[viewType][1]);
            } else {
              viewLists[viewType][i].resize();
            }
          }
        }
      }
    }



    //
    // Compare Screen Layout
    //
    function compareScreen() {
      var i, width, height, mcsize, modelAspectRatio,
          pageWidth = layout.display.page.width,
          pageHeight = layout.display.page.height;

      mcsize = viewLists.moleculeContainers[0].scale();
      modelAspectRatio = mcsize[0] / mcsize[1];
      width = pageWidth * 0.40;
      height = width * 1/modelAspectRatio;
      // HACK that will normally only work with one moleculeContainer
      // or if all the moleculeContainers end up the same width
      i = -1;  while(++i < viewLists.moleculeContainers.length) {
        viewLists.moleculeContainers[i].resize(width, height);
      }
      if (viewLists.appletContainers) {
        i = -1;  while(++i < viewLists.appletContainers.length) {
          viewLists.appletContainers[i].resize(width, height);
        }
      }
    }

    //
    // Full Screen Layout
    //
    function setupFullScreen() {
      var i, width, height, mcsize,
          rightHeight, rightHalfWidth, rightQuarterWidth,
          widthToPageRatio, modelAspectRatio,
          pageWidth = layout.display.page.width,
          pageHeight = layout.display.page.height;

      mcsize = viewLists.moleculeContainers[0].scale();
      modelAspectRatio = mcsize[0] / mcsize[1];
      widthToPageRatio = mcsize[0] / pageWidth;
      width = pageWidth * 0.46;
      height = width * 1/modelAspectRatio;
      if (height > pageHeight*0.70) {
        height = pageHeight * 0.70;
        width = height * modelAspectRatio;
      }
      i = -1;  while(++i < viewLists.moleculeContainers.length) {
        viewLists.moleculeContainers[i].resize(width, height);
      }
      rightQuarterWidth = (pageWidth - width) * 0.41;
      rightHeight = height * 0.42;
      i = -1;  while(++i < viewLists.potentialCharts.length) {
        viewLists.potentialCharts[i].resize(rightQuarterWidth, rightHeight);
      }
      i = -1;  while(++i < viewLists.speedDistributionCharts.length) {
        viewLists.speedDistributionCharts[i].resize(rightQuarterWidth, rightHeight);
      }
      rightHalfWidth = (pageWidth - width) * 0.86;
      rightHeight = height * 0.57;
      i = -1;  while(++i < viewLists.energyCharts.length) {
        viewLists.energyCharts[i].resize(rightHalfWidth, rightHeight);
      }
    }

    //
    // Simple Screen Layout
    //
    function simpleScreen() {
      var i, width, height, mcsize, widthToPageRatio;

      height = Math.min(layout.display.page.height * 0.45, layout.display.page.width * 0.50);
      viewLists.moleculeContainers[0].resize(height, height);
      mcsize = viewLists.moleculeContainers[0].scale();
      widthToPageRatio = mcsize[0] / layout.display.page.width;
      if (widthToPageRatio > 0.50) {
        height *= (0.50 / widthToPageRatio);
        viewLists.moleculeContainers[0].resize(height, height);
      }
      viewLists.thermometers[0].resize();
    }

    //
    // Simple Static Screen Layout
    //
    function simpleStaticScreen() {
      var i, width, height, mcsize, widthToPageRatio,
          description_right = document.getElementById("description-right");

      height = Math.min(layout.display.page.height * 0.65, layout.display.page.width * 0.50);
      viewLists.moleculeContainers[0].resize(height, height);
      mcsize = viewLists.moleculeContainers[0].scale();
      widthToPageRatio = mcsize[0] / layout.display.page.width;
      if (widthToPageRatio > 0.50) {
        height *= (0.50 / widthToPageRatio);
        viewLists.moleculeContainers[0].resize(height, height);
        // if (description_right !== null) {
        //   description_right.style.width = (layout.display.page.width - mcsize[0]) * 0.50 + "px";
        // }
      }
      viewLists.thermometers[0].resize();
    }

    //
    // Simple iframe Screen Layout
    //
    function setupSimpleIFrameScreen() {
      var i, width, height, mcsize,
          rightHeight, rightHalfWidth, rightQuarterWidth,
          widthToPageRatio, modelAspectRatio,
          pageWidth = layout.display.page.width,
          pageHeight = layout.display.page.height;

      mcsize = viewLists.moleculeContainers[0].scale();
      modelAspectRatio = mcsize[0] / mcsize[1];
      widthToPageRatio = mcsize[0] / pageWidth;
      width = pageWidth * 0.70;
      height = width * 1/modelAspectRatio;
      if (height > pageHeight * 0.70) {
        height = pageHeight * 0.70;
        width = height * modelAspectRatio;
      }
      viewLists.moleculeContainers[0].resize(width, height);
      mcsize = viewLists.moleculeContainers[0].scale();
      viewLists.thermometers[0].resize();
    }

    //
    // Simple Full Screen Layout
    //
    function setupSimpleFullScreenMoleculeContainer() {
      var i, width, height, mcsize,
          rightHeight, rightHalfWidth, rightQuarterWidth,
          widthToPageRatio, modelAspectRatio,
          pageWidth = layout.display.page.width,
          pageHeight = layout.display.page.height;

      mcsize = viewLists.moleculeContainers[0].scale();
      modelAspectRatio = mcsize[0] / mcsize[1];
      widthToPageRatio = mcsize[0] / pageWidth;
      width = pageWidth * 0.60;
      height = width * 1/modelAspectRatio;
      if (height > pageHeight * 0.60) {
        height = pageHeight * 0.60;
        width = height * modelAspectRatio;
      }
      viewLists.moleculeContainers[0].resize(width, height);
    }

    function setupFullScreenDescriptionRight() {
      var description_right = document.getElementById("description-right");
      if (description_right !== null) {
        // description_right.style.width = layout.display.window.width * 0.30 +"px";
      }
    }
  };

  layout.getStyleForSelector = function(selector) {
    var rules, rule_lists = document.styleSheets;
    for(var i = 0; i < rule_lists.length; i++) {
      if (rule_lists[i]) {
        try {
           rules = rule_lists[i].rules || rule_lists[i].cssRules;
           if (rules) {
             for(var j = 0; j < rules.length; j++) {
               if (rules[j].selectorText == selector) {
                 return rules[j];
               }
             }
           }
        }
        catch (e) {
        }
      }
    }
    return false;
  };

  // Adapted from getPageSize() by quirksmode.com
  layout.getPageHeight = function() {
    var windowHeight;
    if (window.innerHeight) { // all except Explorer
      windowHeight = window.innerHeight;
    } else if (document.documentElement && document.documentElement.clientHeight) {
      windowHeight = document.documentElement.clientHeight;
    } else if (document.body) { // other Explorers
      windowHeight = layout.display.window.height;
    }
    return windowHeight;
  };

  layout.getPageWidth = function() {
    var windowWidth;
    if (window.innerWidth) { // all except Explorer
      windowWidth = window.innerWidth;
    } else if (document.documentElement && document.documentElement.clientWidth) {
      windowWidth = document.documentElement.clientWidth;
    } else if (document.body) { // other Explorers
      windowWidth = window.width;
    }
    return windowWidth;
  };

  // http://www.zachstronaut.com/posts/2009/02/17/animate-css-transforms-firefox-webkit.html
  layout.getTransformProperty = function(element) {
      // Note that in some versions of IE9 it is critical that
      // msTransform appear in this list before MozTransform
      var properties = [
          'transform',
          'WebkitTransform',
          'msTransform',
          'MozTransform',
          'OTransform'
      ];
      var p;
      if (element) {
        while (p = properties.shift()) {
            if (typeof element.style[p] != 'undefined') {
                return p;
            }
        }
      }
      return false;
  };

  var description_right = document.getElementById("description-right");
  if (description_right !== null) {
    layout.fontsize = parseInt(layout.getStyleForSelector("#description-right").style.fontSize);
  }

  layout.transform = layout.getTransformProperty(document.body);

  // Finally, return ready module.
  return layout;
});

/*globals define, d3 */

define('grapher/core/graph',['require','grapher/core/axis','grapher/core/register-keyboard-handler','common/layout/layout'],function (require) {
  // Dependencies.
  var axis                    = require('grapher/core/axis'),
      registerKeyboardHandler = require('grapher/core/register-keyboard-handler'),
      layout                  = require('common/layout/layout');

  return function Graph(elem, options, message) {
    var cx = 600, cy = 300,
        node;

    if (arguments.length) {
      elem = d3.select(elem);
      node = elem.node();
      cx = elem.property("clientWidth");
      cy = elem.property("clientHeight");
    }

    var svg, vis, plot, viewbox,
        title, xlabel, ylabel,
        points,
        notification,
        margin, padding, size,
        xScale, yScale, xValue, yValue, line,
        stroke, tx, ty, fx, fy,
        circleCursorStyle,
        displayProperties,
        emsize, strokeWidth,
        sizeType = {
          category: "medium",
          value: 3,
          icon: 120,
          tiny: 240,
          small: 480,
          medium: 960,
          large: 1920
        },
        downx, downy, dragged, selected,
        titles = [],
        default_options = {
          "title":          "Graph",
          "xlabel":         "X Axis",
          "ylabel":         "Y Axis",
          "xscale":         "linear",
          "yscale":         "linear",
          "xTicCount":       10,
          "yTicCount":        8,
          "xFormatter":     "3.3r",
          "yFormatter":     "3.3r",
          "xscaleExponent": 0.5,
          "yscaleExponent": 0.5,
          "xmax":            60,
          "xmin":             0,
          "ymax":            40,
          "ymin":             0,
          "circleRadius":    10.0,
          "strokeWidth":      2.0,
          "dataChange":      true,
          "addData":         true,
          "points":          false,
          "notification":    false
        },

        selection_region = {
          xmin: null,
          xmax: null,
          ymin: null,
          ymax: null
        },
        has_selection = false,
        selection_visible = false,
        selection_enabled = true,
        selection_listener,
        brush_element,
        brush_control;


    initialize(options);

    function setupOptions(options) {
      if (options) {
        for(var p in default_options) {
          if (options[p] === undefined) {
            options[p] = default_options[p];
          }
        }
      } else {
        options = default_options;
      }
      return options;
    }

    function calculateSizeType() {
      if(cx <= sizeType.icon) {
        sizeType.category = 'icon';
        sizeType.value = 0;
      } else if (cx <= sizeType.tiny) {
        sizeType.category = 'tiny';
        sizeType.value = 1;
      } else if (cx <= sizeType.small) {
        sizeType.category = 'small';
        sizeType.value = 2;
      } else if (cx <= sizeType.medium) {
        sizeType.category = 'medium';
        sizeType.value = 3;
      } else if (cx <= sizeType.large) {
        sizeType.category = 'large';
        sizeType.value = 4;
      } else {
        sizeType.category = 'extralarge';
        sizeType.value = 5;
      }
    }

    function scale(w, h) {
      if (!arguments.length) {
        cx = elem.property("clientWidth");
        cy = elem.property("clientHeight");
      } else {
        cx = w;
        cy = h;
        node.style.width =  cx +"px";
        node.style.height = cy +"px";
      }
      calculateSizeType();
      displayProperties = layout.getDisplayProperties();
      emsize = displayProperties.emsize;
    }

    function initialize(newOptions, mesg) {
      if (newOptions || !options) {
        options = setupOptions(newOptions);
      }

      if (svg !== undefined) {
        svg.remove();
        svg = undefined;
      }

      if (mesg) {
        message = mesg;
      }

      if (options.dataChange) {
        circleCursorStyle = "ns-resize";
      } else {
        circleCursorStyle = "crosshair";
      }

      scale();

      options.xrange = options.xmax - options.xmin;
      options.yrange = options.ymax - options.ymin;

      options.datacount = 2;

      strokeWidth = options.strokeWidth;

      switch(sizeType.value) {
        case 0:
        padding = {
         "top":    4,
         "right":  4,
         "bottom": 4,
         "left":   4
        };
        break;

        case 1:
        padding = {
         "top":    8,
         "right":  8,
         "bottom": 8,
         "left":   8
        };
        break;

        case 2:
        padding = {
         "top":    options.title  ? 25 : 15,
         "right":  15,
         "bottom": 20,
         "left":   60
        };
        break;

        case 3:
        padding = {
         "top":    options.title  ? 30 : 20,
         "right":                   30,
         "bottom": options.xlabel ? 60 : 10,
         "left":   options.ylabel ? 90 : 60
        };
        break;

        default:
        padding = {
         "top":    options.title  ? 40 : 20,
         "right":                   30,
         "bottom": options.xlabel ? 60 : 10,
         "left":   options.ylabel ? 90 : 60
        };
        break;
      }

      if (Object.prototype.toString.call(options.title) === "[object Array]") {
        titles = options.title;
      } else {
        titles = [options.title];
      }
      titles.reverse();

      if (sizeType.value > 2 ) {
        padding.top += (titles.length-1) * sizeType.value/3 * sizeType.value/3 * emsize * 22;
      } else {
        titles = [titles[0]];
      }

      size = {
        "width":  cx - padding.left - padding.right,
        "height": cy - padding.top  - padding.bottom
      };

      xValue = function(d) { return d[0]; };
      yValue = function(d) { return d[1]; };

      xScale = d3.scale[options.xscale]()
        .domain([options.xmin, options.xmax])
        .range([0, size.width]);

      if (options.xscale === "pow") {
        xScale.exponent(options.xscaleExponent);
      }

      yScale = d3.scale[options.yscale]()
        .domain([options.ymin, options.ymax])
        .range([size.height, 0]);

      if (options.yscale === "pow") {
        yScale.exponent(options.yscaleExponent);
      }

      tx = function(d) {
        return "translate(" + xScale(d) + ",0)";
      };

      ty = function(d) {
        return "translate(0," + yScale(d) + ")";
      };

      stroke = function(d) {
        return d ? "#ccc" : "#666";
      };

      fx = d3.format(options.xFormatter);
      fy = d3.format(options.yFormatter);

      line = d3.svg.line()
          .x(function(d, i) { return xScale(points[i][0]); })
          .y(function(d, i) { return yScale(points[i][1]); });

      // drag axis logic
      downx = NaN;
      downy = NaN;
      dragged = selected = null;
    }

    function graph(selection) {
      if (!selection) { selection = elem; }
      selection.each(function() {

        elem = d3.select(this);

        if (this.clientWidth && this.clientHeight) {
          cx = this.clientWidth;
          cy = this.clientHeight;
          size.width  = cx - padding.left - padding.right;
          size.height = cy - padding.top  - padding.bottom;
        }

        points = options.points;
        if (points === "fake") {
          points = fakeDataPoints();
        }

        updateXScale();
        updateYScale();

        if (svg === undefined) {

          svg = elem.append("svg")
              .attr("width",  cx)
              .attr("height", cy);

          vis = svg.append("g")
                .attr("transform", "translate(" + padding.left + "," + padding.top + ")");

          plot = vis.append("rect")
              .attr("class", "plot")
              .attr("width", size.width)
              .attr("height", size.height)
              .style("fill", "#EEEEEE")
              .attr("pointer-events", "all")
              .on("mousedown.drag", plot_drag)
              .on("touchstart.drag", plot_drag)
              .call(d3.behavior.zoom().x(xScale).y(yScale).on("zoom", redraw));

          viewbox = vis.append("svg")
              .attr("class", "viewbox")
              .attr("top", 0)
              .attr("left", 0)
              .attr("width", size.width)
              .attr("height", size.height)
              .attr("viewBox", "0 0 "+size.width+" "+size.height);

              // I *assume* this class is superflous -- RPK 7/29/2012
              //.attr("class", "line");

          viewbox.append("path")
              .attr("class", "line")
              .style("stroke-width", strokeWidth)
              .attr("d", line(points));

          brush_element = viewbox.append("g")
                .attr("class", "brush");

          // add Chart Title
          if (options.title && sizeType.value > 1) {
            title = vis.selectAll("text")
              .data(titles, function(d) { return d; });
            title.enter().append("text")
                .attr("class", "title")
                .style("font-size", sizeType.value/2.4 * 100 + "%")
                .text(function(d) { return d; })
                .attr("x", size.width/2)
                .attr("dy", function(d, i) { return -0.5 + -1 * sizeType.value/2.8 * i * emsize + "em"; })
                .style("text-anchor","middle");
          }

          // Add the x-axis label
          if (options.xlabel && sizeType.value > 2) {
            xlabel = vis.append("text")
                .attr("class", "axis")
                .style("font-size", sizeType.value/2.6 * 100 + "%")
                .text(options.xlabel)
                .attr("x", size.width/2)
                .attr("y", size.height)
                .attr("dy","2.4em")
                .style("text-anchor","middle");
          }

          // add y-axis label
          if (options.ylabel && sizeType.value > 2) {
            ylabel = vis.append("g").append("text")
                .attr("class", "axis")
                .style("font-size", sizeType.value/2.6 * 100 + "%")
                .text(options.ylabel)
                .style("text-anchor","middle")
                .attr("transform","translate(" + -50 + " " + size.height/2+") rotate(-90)");
          }

          d3.select(node)
              .on("mousemove.drag", mousemove)
              .on("touchmove.drag", mousemove)
              .on("mouseup.drag",   mouseup)
              .on("touchend.drag",  mouseup);

          notification = vis.append("text")
              .attr("class", "graph-notification")
              .text(message)
              .attr("x", size.width/2)
              .attr("y", size.height/2)
              .style("text-anchor","middle");

        } else {

          vis
            .attr("width",  cx)
            .attr("height", cy);

          plot
            .attr("width", size.width)
            .attr("height", size.height);

          viewbox
              .attr("top", 0)
              .attr("left", 0)
              .attr("width", size.width)
              .attr("height", size.height)
              .attr("viewBox", "0 0 "+size.width+" "+size.height);

          if (options.title && sizeType.value > 1) {
              title.each(function(d, i) {
                d3.select(this).attr("x", size.width/2);
                d3.select(this).attr("dy", function(d, i) { return 1.4 * i - titles.length + "em"; });
              });
          }

          if (options.xlabel && sizeType.value > 1) {
            xlabel
                .attr("x", size.width/2)
                .attr("y", size.height);
          }

          if (options.ylabel && sizeType.value > 1) {
            ylabel
                .attr("transform","translate(" + -40 + " " + size.height/2+") rotate(-90)");
          }

          notification
            .attr("x", size.width/2)
            .attr("y", size.height/2);
        }
        redraw();
      });

      function notify(mesg) {
        // add Chart Notification
        message = mesg;
        if (mesg) {
          notification.text(mesg);
        } else {
          notification.text('');
        }
      }

      function fakeDataPoints() {
        var yrange2 = options.yrange / 2,
            yrange4 = yrange2 / 2,
            pnts;

        options.datacount = size.width/30;
        options.xtic = options.xrange / options.datacount;
        options.ytic = options.yrange / options.datacount;

        pnts = d3.range(options.datacount).map(function(i) {
          return [i * options.xtic + options.xmin, options.ymin + yrange4 + Math.random() * yrange2 ];
        });
        return pnts;
      }

      function keydown() {
        if (!selected) return;
        switch (d3.event.keyCode) {
          case 8:   // backspace
          case 46:  // delete
          if (options.dataChange) {
            var i = points.indexOf(selected);
            points.splice(i, 1);
            selected = points.length ? points[i > 0 ? i - 1 : 0] : null;
            update();
          }
          if (d3.event && d3.event.keyCode) {
            d3.event.preventDefault();
            d3.event.stopPropagation();
          }
          break;
        }
      }

      // unused as of commit ef91f20b5abab1f063dc093d41e9dbd4712931f4
      // (7/27/2012):

      // // update the layout
      // function updateLayout() {
      //   padding = {
      //    "top":    options.title  ? 40 : 20,
      //    "right":                 30,
      //    "bottom": options.xlabel ? 60 : 10,
      //    "left":   options.ylabel ? 70 : 45
      //   };

      //   size.width  = cx - padding.left - padding.right;
      //   size.height = cy - padding.top  - padding.bottom;

      //   plot.attr("width", size.width)
      //       .attr("height", size.height);
      // }

      // Update the x-scale.
      function updateXScale() {
        xScale.domain([options.xmin, options.xmax])
              .range([0, size.width]);
      }

      // Update the y-scale.
      function updateYScale() {
        yScale.domain([options.ymin, options.ymax])
              .range([size.height, 0]);
      }

      function redraw() {

        // Regenerate x-ticks…
        var gx = vis.selectAll("g.x")
            .data(xScale.ticks(options.xTicCount), String)
            .attr("transform", tx);

        var gxe = gx.enter().insert("g", "a")
            .attr("class", "x")
            .attr("transform", tx);

        gxe.append("line")
            .attr("stroke", stroke)
            .attr("y1", 0)
            .attr("y2", size.height);

        if (sizeType.value > 1) {
          gxe.append("text")
              .attr("class", "axis")
              .style("font-size", sizeType.value/2.7 * 100 + "%")
              .attr("y", size.height)
              .attr("dy", "1em")
              .attr("text-anchor", "middle")
              .text(fx)
              .style("cursor", "ew-resize")
              .on("mouseover", function(d) { d3.select(this).style("font-weight", "bold");})
              .on("mouseout",  function(d) { d3.select(this).style("font-weight", "normal");})
              .on("mousedown.drag",  xaxis_drag)
              .on("touchstart.drag", xaxis_drag);
        }

        gx.exit().remove();

        // Regenerate y-ticks…
        var gy = vis.selectAll("g.y")
            .data(yScale.ticks(options.yTicCount), String)
            .attr("transform", ty);

        var gye = gy.enter().insert("g", "a")
            .attr("class", "y")
            .attr("transform", ty)
            .attr("background-fill", "#FFEEB6");

        gye.append("line")
            .attr("stroke", stroke)
            .attr("x1", 0)
            .attr("x2", size.width);

        if (sizeType.value > 1) {
          if (options.yscale === "log") {
            var gye_length = gye[0].length;
            if (gye_length > 100) {
              gye = gye.filter(function(d) { return !!d.toString().match(/(\.[0]*|^)[1]/);});
            } else if (gye_length > 50) {
              gye = gye.filter(function(d) { return !!d.toString().match(/(\.[0]*|^)[12]/);});
            } else {
              gye = gye.filter(function(d) {
                return !!d.toString().match(/(\.[0]*|^)[125]/);});
            }
          }
          gye.append("text")
              .attr("class", "axis")
              .style("font-size", sizeType.value/2.7 * 100 + "%")
              .attr("x", -3)
              .attr("dy", ".35em")
              .attr("text-anchor", "end")
              .text(fy)
              .style("cursor", "ns-resize")
              .on("mouseover", function(d) { d3.select(this).style("font-weight", "bold");})
              .on("mouseout",  function(d) { d3.select(this).style("font-weight", "normal");})
              .on("mousedown.drag",  yaxis_drag)
              .on("touchstart.drag", yaxis_drag);
        }

        gy.exit().remove();
        plot.call(d3.behavior.zoom().x(xScale).y(yScale).on("zoom", redraw));
        update();
      }

      function update() {

        update_brush_element();

        vis.select("path").attr("d", line(points));

        var circle = vis.select("svg").selectAll("circle")
            .data(points, function(d) { return d; });

        if (options.circleRadius && sizeType.value > 1) {
          if (!(options.circleRadius <= 4 && sizeType.value < 3)) {
            circle.enter().append("circle")
                .attr("class", function(d) { return d === selected ? "selected" : null; })
                .attr("cx",    function(d) { return xScale(d[0]); })
                .attr("cy",    function(d) { return yScale(d[1]); })
                .attr("r", options.circleRadius * (1 + sizeType.value) / 4)
                .style("stroke-width", options.circleRadius/6 * (sizeType.value - 1.5))
                .style("cursor", circleCursorStyle)
                .on("mousedown.drag",  datapoint_drag)
                .on("touchstart.drag", datapoint_drag);

            circle
                .attr("class", function(d) { return d === selected ? "selected" : null; })
                .attr("cx",    function(d) { return xScale(d[0]); })
                .attr("cy",    function(d) { return yScale(d[1]); })
                .attr("r", options.circleRadius * (1 + sizeType.value) / 4)
                .style("stroke-width", options.circleRadius/6 * (sizeType.value - 1.5));
          }
        }

        circle.exit().remove();

        if (d3.event && d3.event.keyCode) {
          d3.event.preventDefault();
          d3.event.stopPropagation();
        }
      }

      function plot_drag() {
        var p;
        d3.event.preventDefault();
        registerKeyboardHandler(keydown);
        d3.select('body').style("cursor", "move");
        if (d3.event.altKey) {
          if (d3.event.shiftKey && options.addData) {
            p = d3.svg.mouse(vis.node());
            var newpoint = [];
            newpoint[0] = xScale.invert(Math.max(0, Math.min(size.width,  p[0])));
            newpoint[1] = yScale.invert(Math.max(0, Math.min(size.height, p[1])));
            points.push(newpoint);
            points.sort(function(a, b) {
              if (a[0] < b[0]) { return -1; }
              if (a[0] > b[0]) { return  1; }
              return 0;
            });
            selected = newpoint;
            update();
          } else {
            p = d3.svg.mouse(vis[0][0]);
            downx = xScale.invert(p[0]);
            downy = yScale.invert(p[1]);
            dragged = false;
            d3.event.stopPropagation();
          }
          // d3.event.stopPropagation();
        }
      }

      function xaxis_drag(d) {
        document.onselectstart = function() { return false; };
        d3.event.preventDefault();
        var p = d3.svg.mouse(vis[0][0]);
        downx = xScale.invert(p[0]);
      }

      function yaxis_drag(d) {
        document.onselectstart = function() { return false; };
        d3.event.preventDefault();
        var p = d3.svg.mouse(vis[0][0]);
        downy = yScale.invert(p[1]);
      }

      function datapoint_drag(d) {
        registerKeyboardHandler(keydown);
        document.onselectstart = function() { return false; };
        selected = dragged = d;
        update();
      }

      function mousemove() {
        var p = d3.svg.mouse(vis[0][0]);

        d3.event.preventDefault();
        if (dragged && options.dataChange) {
          dragged[1] = yScale.invert(Math.max(0, Math.min(size.height, p[1])));
          update();
        }

        if (!isNaN(downx)) {
          d3.select('body').style("cursor", "ew-resize");
          xScale.domain(axis.axisProcessDrag(downx, xScale.invert(p[0]), xScale.domain()));
          redraw();
          d3.event.stopPropagation();
        }

        if (!isNaN(downy)) {
          d3.select('body').style("cursor", "ns-resize");
          yScale.domain(axis.axisProcessDrag(downy, yScale.invert(p[1]), yScale.domain()));
          redraw();
          d3.event.stopPropagation();
        }
      }

      function mouseup() {
        document.onselectstart = function() { return true; };
        d3.select('body').style("cursor", "auto");
        if (!isNaN(downx)) {
          downx = NaN;
          redraw();
        }
        if (!isNaN(downy)) {
          downy = NaN;
          redraw();
        }
        dragged = null;
      }

      // make these private variables and functions available
      graph.elem = elem;
      graph.redraw = redraw;
      graph.update = update;
      graph.notify = notify;
      graph.points = points;
      graph.initialize = initialize;
      graph.updateXScale = updateXScale;
      graph.updateYScale = updateYScale;
      graph.scale = scale;

    }

    // update the title
    function updateTitle() {
      if (options.title && title) {
        title.text(options.title);
      }
    }

    // update the x-axis label
    function updateXlabel() {
      if (options.xlabel && xlabel) {
        xlabel.text(options.xlabel);
      }
    }

    // update the y-axis label
    function updateYlabel() {
      if (options.ylabel && ylabel) {
        ylabel.text(options.ylabel);
      } else {
        ylabel.style("display", "none");
      }
    }

    // unused as of commit ef91f20b5abab1f063dc093d41e9dbd4712931f4
    // (7/27/2012)

    // // The x-accessor for the path generator
    // function X(d) {
    //   return xScale(d[0]);
    // }

    // // The y-accessor for the path generator
    // function Y(d) {
    //   return yScale(d[1]);
    // }

    graph.margin = function(_) {
      if (!arguments.length) return margin;
      margin = _;
      return graph;
    };

    graph.xmin = function(_) {
      if (!arguments.length) return options.xmin;
      options.xmin = _;
      options.xrange = options.xmax - options.xmin;
      if (graph.updateXScale) {
        graph.updateXScale();
        graph.redraw();
      }
      return graph;
    };

    graph.xmax = function(_) {
      if (!arguments.length) return options.xmax;
      options.xmax = _;
      options.xrange = options.xmax - options.xmin;
      if (graph.updateXScale) {
        graph.updateXScale();
        graph.redraw();
      }
      return graph;
    };

    graph.ymin = function(_) {
      if (!arguments.length) return options.ymin;
      options.ymin = _;
      options.yrange = options.ymax - options.ymin;
      if (graph.updateYScale) {
        graph.updateYScale();
        graph.redraw();
      }
      return graph;
    };

    graph.ymax = function(_) {
      if (!arguments.length) return options.ymax;
      options.ymax = _;
      options.yrange = options.ymax - options.ymin;
      if (graph.updateYScale) {
        graph.updateYScale();
        graph.redraw();
      }
      return graph;
    };

    graph.xLabel = function(_) {
      if (!arguments.length) return options.xlabel;
      options.xlabel = _;
      updateXlabel();
      return graph;
    };

    graph.yLabel = function(_) {
      if (!arguments.length) return options.ylabel;
      options.ylabel = _;
      updateYlabel();
      return graph;
    };

    graph.title = function(_) {
      if (!arguments.length) return options.title;
      options.title = _;
      updateTitle();
      return graph;
    };

    graph.width = function(_) {
      if (!arguments.length) return size.width;
      size.width = _;
      return graph;
    };

    graph.height = function(_) {
      if (!arguments.length) return size.height;
      size.height = _;
      return graph;
    };

    graph.x = function(_) {
      if (!arguments.length) return xValue;
      xValue = _;
      return graph;
    };

    graph.y = function(_) {
      if (!arguments.length) return yValue;
      yValue = _;
      return graph;
    };

    graph.elem = function(_) {
      if (!arguments.length) return elem;
      elem = d3.select(_);
      elem.call(graph);
      return graph;
    };

    graph.data = function(_) {
      if (!arguments.length) return points;
      var domain = xScale.domain(),
          xextent = domain[1] - domain[0],
          shift = xextent * 0.8;
      options.points = points = _;
      if (points.length > domain[1]) {
        domain[0] += shift;
        domain[1] += shift;
        xScale.domain(domain);
        graph.redraw();
      } else {
        graph.update();
      }
      return graph;
    };

    graph.add_data = function(newdata) {
      if (!arguments.length) return points;
      var domain = xScale.domain(),
          xextent = domain[1] - domain[0],
          shift = xextent * 0.8,
          i;
      if (newdata instanceof Array && newdata.length > 0) {
        if (newdata[0] instanceof Array) {
          for(i = 0; i < newdata.length; i++) {
            points.push(newdata[i]);
          }
        } else {
          if (newdata.length === 2) {
            points.push(newdata);
          } else {
            throw new Error("invalid argument to graph.add_data() " + newdata + " length should === 2.");
          }
        }
      }
      if (points[points.length-1][0] > domain[1]) {
        domain[0] += shift;
        domain[1] += shift;
        xScale.domain(domain);
        graph.redraw();
      } else {
        graph.update();
      }
      return graph;
    };

    /**
      Set or get the selection domain (i.e., the range of x values that are selected).

      Valid domain specifiers:
        null     no current selection (selection is turned off)
        []       a current selection exists but is empty (has_selection is true)
        [x1, x2] the region between x1 and x2 is selected. Any data points between
                 x1 and x2 (inclusive) would be considered to be selected.

      Default value is null.
    */
    graph.selection_domain = function(a) {

      if (!arguments.length) {
        if (!has_selection) {
          return null;
        }
        if (selection_region.xmax === Infinity && selection_region.xmin === Infinity ) {
          return [];
        }
        return [selection_region.xmin, selection_region.xmax];
      }

      // setter

      if (a === null) {
        has_selection = false;
      }
      else if (a.length === 0) {
        has_selection = true;
        selection_region.xmin = Infinity;
        selection_region.xmax = Infinity;
      }
      else {
        has_selection = true;
        selection_region.xmin = a[0];
        selection_region.xmax = a[1];
      }

      update_brush_element();

      if (selection_listener) {
        selection_listener(graph.selection_domain());
      }
      return graph;
    };

    /**
      Get whether the graph currently has a selection region. Default value is false.

      If true, it would be valid to filter the data points to return a subset within the selection
      region, although this region may be empty!

      If false the graph is not considered to have a selection region.

      Note that even if has_selection is true, the selection region may not be currently shown,
      and if shown, it may be empty.
    */
    graph.has_selection = function() {
      return has_selection;
    };

    /**
      Set or get the visibility of the selection region. Default value is false.

      Has no effect if the graph does not currently have a selection region
      (selection_domain is null).

      If the selection_enabled property is true, the user will also be able to interact
      with the selection region.
    */
    graph.selection_visible = function(val) {
      if (!arguments.length) {
        return selection_visible;
      }

      // setter
      val = !!val;
      if (selection_visible !== val) {
        selection_visible = val;
        update_brush_element();
      }
      return graph;
    };

    /**
      Set or get whether user manipulation of the selection region should be enabled
      when a selection region exists and is visible. Default value is true.

      Setting the value to true has no effect unless the graph has a selection region
      (selection_domain is non-null) and the region is visible (selection_visible is true).
      However, the selection_enabled setting is honored whenever those properties are
      subsequently updated.

      Setting the value to false does not affect the visibility of the selection region,
      and does not affect the ability to change the region by calling selection_domain().

      Note that graph panning and zooming are disabled while selection manipulation is enabled.
    */
    graph.selection_enabled = function(val) {
      if (!arguments.length) {
        return selection_enabled;
      }

      // setter
      val = !!val;
      if (selection_enabled !== val) {
        selection_enabled = val;
        update_brush_element();
      }
      return graph;
    };

    /**
      Set or get the listener to be called when the selection_domain changes.

      Both programatic and interactive updates of the selection region result in
      notification of the listener.

      The listener is called with the new selection_domain value in the first argument.
    */
    graph.selection_listener = function(cb) {
      if (!arguments.length) {
        return selection_listener;
      }
      // setter
      selection_listener = cb;
      return graph;
    };

    /**
      Read only getter for the d3 selection referencing the DOM elements containing the d3
      brush used to implement selection region manipulation.
    */
    graph.brush_element = function() {
      return brush_element;
    };

    /**
      Read-only getter for the d3 brush control (d3.svg.brush() function) used to implement
      selection region manipulation.
    */
    graph.brush_control = function() {
      return brush_control;
    };

    /**
      Read-only getter for the internal listener to the d3 'brush' event.
    */
    graph.brush_listener = function() {
      return brush_listener;
    };

    function brush_listener() {
      var extent;
      if (selection_enabled) {
        // Note there is a brush.empty() method, but it still reports true after the
        // brush extent has been programatically updated.
        extent = brush_control.extent();
        graph.selection_domain( extent[0] !== extent[1] ? extent : [] );
      }
    }

    function update_brush_element() {
      if (has_selection && selection_visible) {
        brush_control = brush_control || d3.svg.brush()
          .x(xScale)
          .extent([selection_region.xmin || 0, selection_region.xmax || 0])
          .on("brush", brush_listener);

        brush_element
          .call(brush_control.extent([selection_region.xmin || 0, selection_region.xmax || 0]))
          .style('display', 'inline')
          .style('pointer-events', selection_enabled ? 'all' : 'none')
          .selectAll("rect")
            .attr("height", size.height);

      } else {
        brush_element.style('display', 'none');
      }
    }

    graph.reset = function(options, message) {
      if (arguments.length) {
        graph.initialize(options, message);
      } else {
        graph.initialize();
      }
      graph();
      return graph;
    };

    graph.resize = function(w, h) {
      graph.scale(w, h);
      graph.initialize();
      graph();
      return graph;
    };

    if (elem) {
      elem.call(graph);
    }

    return graph;
  };
});

/*globals define, d3, $ */

define('grapher/core/real-time-graph',['require','grapher/core/axis'],function (require) {
  // Dependencies.
  var axis = require('grapher/core/axis');

  return function RealTimeGraph(id, options, message) {
    var elem,
        node,
        cx,
        cy,

        stroke = function(d) { return d ? "#ccc" : "#666"; },
        tx = function(d) { return "translate(" + xScale(d) + ",0)"; },
        ty = function(d) { return "translate(0," + yScale(d) + ")"; },
        fx, fy,
        svg, vis, plot, viewbox,
        title, xlabel, ylabel, xtic, ytic,
        notification,
        padding, size,
        xScale, yScale, line,
        circleCursorStyle,
        displayProperties,
        emsize, strokeWidth,
        scaleFactor,
        sizeType = {
          category: "medium",
          value: 3,
          icon: 120,
          tiny: 240,
          small: 480,
          medium: 960,
          large: 1920
        },
        downx = Math.NaN,
        downy = Math.NaN,
        dragged = null,
        selected = null,
        titles = [],

        points, pointArray,
        markedPoint, marker,
        sample,
        gcanvas, gctx,
        cplot = {},

        default_options = {
          title   : "graph",
          xlabel  : "x-axis",
          ylabel  : "y-axis",
          xscale  : 'linear',
          yscale  : 'linear',
          xTicCount: 10,
          yTicCount: 10,
          xscaleExponent: 0.5,
          yscaleExponent: 0.5,
          xFormatter: "3.2r",
          yFormatter: "3.2r",
          xmax:       10,
          xmin:       0,
          ymax:       10,
          ymin:       0,
          dataset:    [0],
          selectable_points: true,
          circleRadius: false,
          dataChange: false,
          points: false,
          sample: 1,
          lines: true,
          bars: false
        };

    initialize(id, options, message);

    function setupOptions(options) {
      if (options) {
        for(var p in default_options) {
          if (options[p] === undefined) {
            options[p] = default_options[p];
          }
        }
      } else {
        options = default_options;
      }
      return options;
    }

    function calculateSizeType() {
      if(cx <= sizeType.icon) {
        sizeType.category = 'icon';
        sizeType.value = 0;
      } else if (cx <= sizeType.tiny) {
        sizeType.category = 'tiny';
        sizeType.value = 1;
      } else if (cx <= sizeType.small) {
        sizeType.category = 'small';
        sizeType.value = 2;
      } else if (cx <= sizeType.medium) {
        sizeType.category = 'medium';
        sizeType.value = 3;
      } else if (cx <= sizeType.large) {
        sizeType.category = 'large';
        sizeType.value = 4;
      } else {
        sizeType.category = 'extralarge';
        sizeType.value = 5;
      }
    }

    function scale(w, h) {
      if (!arguments.length) {
        cx = elem.property("clientWidth");
        cy = elem.property("clientHeight");
      } else {
        cx = w;
        cy = h;
        node.style.width =  cx +"px";
        node.style.height = cy +"px";
      }
      calculateSizeType();
      // displayProperties = layout.getDisplayProperties();
      emsize = parseFloat($('#viz').css('font-size') || $('body').css('font-size'))/12;
      // emsize = displayProperties.emsize;
    }

    function initialize(id, opts, message) {
      if (id) {
        elem = d3.select(id);
        node = elem.node();
        cx = elem.property("clientWidth");
        cy = elem.property("clientHeight");
      }

      if (opts || !options) {
        options = setupOptions(opts);
        newOptions = undefined;
      }

      if (svg !== undefined) {
        svg.remove();
        svg = undefined;
      }

      if (gcanvas !== undefined) {
        $(gcanvas).remove();
        gcanvas = undefined;
      }

      // use local variable for access speed in add_point()
      sample = options.sample;

      if (options.dataChange) {
        circleCursorStyle = "ns-resize";
      } else {
        circleCursorStyle = "crosshair";
      }

      scale();

      options.xrange = options.xmax - options.xmin;
      options.yrange = options.ymax - options.ymin;

      pointArray = [];

      switch(sizeType.value) {
        case 0:
        padding = {
         "top":    4,
         "right":  4,
         "bottom": 4,
         "left":   4
        };
        break;

        case 1:
        padding = {
         "top":    8,
         "right":  8,
         "bottom": 8,
         "left":   8
        };
        break;

        case 2:
        padding = {
         "top":    options.title  ? 25 : 15,
         "right":  15,
         "bottom": 20,
         "left":   30
        };
        break;

        case 3:
        padding = {
         "top":    options.title  ? 30 : 20,
         "right":                   30,
         "bottom": options.xlabel ? 60 : 10,
         "left":   options.ylabel ? 70 : 45
        };
        break;

        default:
        padding = {
         "top":    options.title  ? 40 : 20,
         "right":                   30,
         "bottom": options.xlabel ? 60 : 10,
         "left":   options.ylabel ? 70 : 45
        };
        break;
      }

      if (Object.prototype.toString.call(options.dataset[0]) === "[object Array]") {
        for (var i = 0; i < options.dataset.length; i++) {
          pointArray.push(indexedData(options.dataset[i], 0, sample));
        }
        points = pointArray[0];
      } else {
        points = indexedData(options.dataset, 0);
        pointArray = [points];
      }

      if (Object.prototype.toString.call(options.title) === "[object Array]") {
        titles = options.title;
      } else {
        titles = [options.title];
      }
      titles.reverse();

      if (sizeType.value > 2 ) {
        padding.top += (titles.length-1) * sizeType.value/3 * sizeType.value/3 * emsize * 22;
      } else {
        titles = [titles[0]];
      }

      size = {
        "width":  cx - padding.left - padding.right,
        "height": cy - padding.top  - padding.bottom
      };

      xScale = d3.scale[options.xscale]()
        .domain([options.xmin, options.xmax])
        .range([0, size.width]);

      if (options.xscale === "pow") {
        xScale.exponent(options.xscaleExponent);
      }

      yScale = d3.scale[options.yscale]()
        .domain([options.ymin, options.ymax]).nice()
        .range([size.height, 0]).nice();

      if (options.yscale === "pow") {
        yScale.exponent(options.yscaleExponent);
      }

      fx = d3.format(options.xFormatter);
      fy = d3.format(options.yFormatter);

      line = d3.svg.line()
            .x(function(d, i) { return xScale(points[i].x ); })
            .y(function(d, i) { return yScale(points[i].y); });

      // drag axis logic
      downx = Math.NaN;
      downy = Math.NaN;
      dragged = null;
    }


    function indexedData(dataset, initial_index, sample) {
      var i = 0,
          start_index = initial_index || 0,
          n = dataset.length,
          points = [];
      sample = sample || 1;
      for (i = 0; i < n;  i++) {
        points.push({ x: (i + start_index) * sample, y: dataset[i] });
      }
      return points;
    }

    function number_of_points() {
      if (points) {
        return points.length;
      } else {
        return false;
      }
    }

    function graph() {
      scale();

      if (svg === undefined) {

        svg = elem.append("svg")
            .attr("width",  cx)
            .attr("height", cy);

        vis = svg.append("g")
              .attr("transform", "translate(" + padding.left + "," + padding.top + ")");

        plot = vis.append("rect")
          .attr("class", "plot")
          .attr("width", size.width)
          .attr("height", size.height)
          .style("fill", "#EEEEEE")
          // .attr("fill-opacity", 0.0)
          .attr("pointer-events", "all")
          .on("mousedown", plot_drag)
          .on("touchstart", plot_drag);

        plot.call(d3.behavior.zoom().x(xScale).y(yScale).on("zoom", redraw));

        viewbox = vis.append("svg")
          .attr("class", "viewbox")
          .attr("top", 0)
          .attr("left", 0)
          .attr("width", size.width)
          .attr("height", size.height)
          .attr("viewBox", "0 0 "+size.width+" "+size.height)
          .append("path")
              .attr("class", "line")
              .attr("d", line(points));

        marker = viewbox.append("path").attr("class", "marker");
        // path without attributes cause SVG parse problem in IE9
        //     .attr("d", []);

        // add Chart Title
        if (options.title && sizeType.value > 1) {
          title = vis.selectAll("text")
            .data(titles, function(d) { return d; });
          title.enter().append("text")
              .attr("class", "title")
              .style("font-size", sizeType.value/3.2 * 100 + "%")
              .text(function(d) { return d; })
              .attr("x", size.width/2)
              .attr("dy", function(d, i) { return -0.5 + -1 * sizeType.value/2.8 * i * emsize + "em"; })
              .style("text-anchor","middle");
        }

        // Add the x-axis label
       if (options.xlabel && sizeType.value > 2) {
          xlabel = vis.append("text")
              .attr("class", "axis")
              .style("font-size", sizeType.value/2.6 * 100 + "%")
              .attr("class", "xlabel")
              .text(options.xlabel)
              .attr("x", size.width/2)
              .attr("y", size.height)
              .attr("dy","2.4em")
              .style("text-anchor","middle");
        }

        // add y-axis label
        if (options.ylabel && sizeType.value > 2) {
          ylabel = vis.append("g").append("text")
              .attr("class", "axis")
              .style("font-size", sizeType.value/2.6 * 100 + "%")
              .attr("class", "ylabel")
              .text( options.ylabel)
              .style("text-anchor","middle")
              .attr("transform","translate(" + -40 + " " + size.height/2+") rotate(-90)");
        }

        notification = vis.append("text")
            .attr("class", "graph-notification")
            .text(message)
            .attr("x", size.width/2)
            .attr("y", size.height/2)
            .style("text-anchor","middle");

        d3.select(node)
            .on("mousemove.drag", mousemove)
            .on("touchmove.drag", mousemove)
            .on("mouseup.drag",   mouseup)
            .on("touchend.drag",  mouseup);

        initialize_canvas();
        show_canvas();

      } else {

        vis
          .attr("width",  cx)
          .attr("height", cy);

        plot
          .attr("width", size.width)
          .attr("height", size.height)
          .style("fill", "#EEEEEE");

        viewbox
            .attr("top", 0)
            .attr("left", 0)
            .attr("width", size.width)
            .attr("height", size.height)
            .attr("viewBox", "0 0 "+size.width+" "+size.height);

        if (options.title && sizeType.value > 1) {
            title.each(function(d, i) {
              d3.select(this).attr("x", size.width/2);
              d3.select(this).attr("dy", function(d, i) { return 1.4 * i - titles.length + "em"; });
            });
        }

        if (options.xlabel && sizeType.value > 1) {
          xlabel
              .attr("x", size.width/2)
              .attr("y", size.height);
        }

        if (options.ylabel && sizeType.value > 1) {
          ylabel
              .attr("transform","translate(" + -40 + " " + size.height/2+") rotate(-90)");
        }

        notification
          .attr("x", size.width/2)
          .attr("y", size.height/2);

        vis.selectAll("g.x").remove();
        vis.selectAll("g.y").remove();

        resize_canvas();
      }

      redraw();

      // ------------------------------------------------------------
      //
      // Chart Notification
      //
      // ------------------------------------------------------------

      function notify(mesg) {
        message = mesg;
        if (mesg) {
          notification.text(mesg);
        } else {
          notification.text('');
        }
      }

      // ------------------------------------------------------------
      //
      // Redraw the plot canvas when it is translated or axes are re-scaled
      //
      // ------------------------------------------------------------

      function redraw() {

        // Regenerate x-ticks
        var gx = vis.selectAll("g.x")
            .data(xScale.ticks(options.xTicCount), String)
            .attr("transform", tx);

        var gxe = gx.enter().insert("g", "a")
            .attr("class", "x")
            .attr("transform", tx);

        gxe.append("line")
            .attr("stroke", stroke)
            .attr("y1", 0)
            .attr("y2", size.height);

        if (sizeType.value > 1) {
          gxe.append("text")
              .attr("class", "axis")
              .style("font-size", sizeType.value/2.7 * 100 + "%")
              .attr("y", size.height)
              .attr("dy", "1em")
              .attr("text-anchor", "middle")
              .style("cursor", "ew-resize")
              .text(fx)
              .on("mouseover", function(d) { d3.select(this).style("font-weight", "bold");})
              .on("mouseout",  function(d) { d3.select(this).style("font-weight", "normal");})
              .on("mousedown.drag",  xaxis_drag)
              .on("touchstart.drag", xaxis_drag);
        }

        gx.exit().remove();

        // Regenerate y-ticks
        var gy = vis.selectAll("g.y")
            .data(yScale.ticks(options.yTicCount), String)
            .attr("transform", ty);

        var gye = gy.enter().insert("g", "a")
            .attr("class", "y")
            .attr("transform", ty)
            .attr("background-fill", "#FFEEB6");

        gye.append("line")
            .attr("stroke", stroke)
            .attr("x1", 0)
            .attr("x2", size.width);

        if (sizeType.value > 1) {
          gye.append("text")
              .attr("class", "axis")
              .style("font-size", sizeType.value/2.7 * 100 + "%")
              .attr("x", -3)
              .attr("dy", ".35em")
              .attr("text-anchor", "end")
              .style("cursor", "ns-resize")
              .text(fy)
              .on("mouseover", function(d) { d3.select(this).style("font-weight", "bold");})
              .on("mouseout",  function(d) { d3.select(this).style("font-weight", "normal");})
              .on("mousedown.drag",  yaxis_drag)
              .on("touchstart.drag", yaxis_drag);
        }

        gy.exit().remove();
        plot.call(d3.behavior.zoom().x(xScale).y(yScale).on("zoom", redraw));
        update();
      }

      // ------------------------------------------------------------
      //
      // Draw the data
      //
      // ------------------------------------------------------------

      function update(currentSample) {
        update_canvas(currentSample);

        if (graph.selectable_points) {
          var circle = vis.selectAll("circle")
              .data(points, function(d) { return d; });

          circle.enter().append("circle")
              .attr("class", function(d) { return d === selected ? "selected" : null; })
              .attr("cx",    function(d) { return x(d.x); })
              .attr("cy",    function(d) { return y(d.y); })
              .attr("r", 1.0)
              .on("mousedown", function(d) {
                selected = dragged = d;
                update();
              });

          circle
              .attr("class", function(d) { return d === selected ? "selected" : null; })
              .attr("cx",    function(d) { return x(d.x); })
              .attr("cy",    function(d) { return y(d.y); });

          circle.exit().remove();
        }

        if (d3.event && d3.event.keyCode) {
          d3.event.preventDefault();
          d3.event.stopPropagation();
        }
      }

      function plot_drag() {
        d3.event.preventDefault();
        plot.style("cursor", "move");
        if (d3.event.altKey) {
          var p = d3.svg.mouse(vis[0][0]);
          downx = xScale.invert(p[0]);
          downy = yScale.invert(p[1]);
          dragged = false;
          d3.event.stopPropagation();
        }
      }

      function xaxis_drag(d) {
        document.onselectstart = function() { return false; };
        d3.event.preventDefault();
        var p = d3.svg.mouse(vis[0][0]);
        downx = xScale.invert(p[0]);
      }

      function yaxis_drag(d) {
        document.onselectstart = function() { return false; };
        d3.event.preventDefault();
        var p = d3.svg.mouse(vis[0][0]);
        downy = yScale.invert(p[1]);
      }

      // ------------------------------------------------------------
      //
      // Axis scaling
      //
      // attach the mousemove and mouseup to the body
      // in case one wanders off the axis line
      // ------------------------------------------------------------

      function mousemove() {
        var p = d3.svg.mouse(vis[0][0]),
            changex, changey, new_domain,
            t = d3.event.changedTouches;

        document.onselectstart = function() { return true; };
        d3.event.preventDefault();
        if (!isNaN(downx)) {
          d3.select('body').style("cursor", "ew-resize");
          xScale.domain(axis.axisProcessDrag(downx, xScale.invert(p[0]), xScale.domain()));
          redraw();
          d3.event.stopPropagation();
        }
        if (!isNaN(downy)) {
          d3.select('body').style("cursor", "ns-resize");
          yScale.domain(axis.axisProcessDrag(downy, yScale.invert(p[1]), yScale.domain()));
          redraw();
          d3.event.stopPropagation();
        }
      }

      function mouseup() {
        d3.select('body').style("cursor", "auto");
        document.onselectstart = function() { return true; };
        if (!isNaN(downx)) {
          redraw();
          downx = Math.NaN;
        }
        if (!isNaN(downy)) {
          redraw();
          downy = Math.NaN;
        }
        dragged = null;
      }

      function showMarker(index) {
        markedPoint = { x: points[index].x, y: points[index].y };
      }

      function updateOrRescale() {
        var i,
            domain = xScale.domain(),
            xextent = domain[1] - domain[0],
            maxExtent = (points.length) * sample,
            shift = xextent * 0.9;

        if (maxExtent > domain[1]) {
          domain[0] += shift;
          domain[1] += shift;
          xScale.domain(domain);
          redraw();
        } else {
          update();
        }
      }

      function _add_point(p) {
        if (points.length === 0) { return; }
        markedPoint = false;
        var index = points.length,
            lengthX = index * sample,
            point = { x: lengthX, y: p },
            newx, newy;
        points.push(point);
        updateOrRescale();
      }

      function add_point(p) {
        if (points.length === 0) { return; }
        _add_point(p);
        updateOrRescale();
      }

      function add_canvas_point(p) {
        if (points.length === 0) { return; }
        markedPoint = false;
        var index = points.length,
            lengthX = index * sample,
            previousX = lengthX - sample,
            point = { x: lengthX, y: p },
            oldx = xScale.call(self, previousX, previousX),
            oldy = yScale.call(self, points[index-1].y, index-1),
            newx, newy;

        points.push(point);
        newx = xScale.call(self, lengthX, lengthX);
        newy = yScale.call(self, p, lengthX);
        gctx.beginPath();
        gctx.moveTo(oldx, oldy);
        gctx.lineTo(newx, newy);
        gctx.stroke();
      }

      function add_points(pnts) {
        for (var i = 0; i < pointArray.length; i++) {
          points = pointArray[i];
          _add_point(pnts[i]);
        }
        updateOrRescale();
      }


      function add_canvas_points(pnts) {
        for (var i = 0; i < pointArray.length; i++) {
          points = pointArray[i];
          setStrokeColor(i);
          add_canvas_point(pnts[i]);
        }
      }

      function setStrokeColor(i, afterSamplePoint) {
        var opacity = afterSamplePoint ? 0.4 : 1.0;
        switch(i) {
          case 0:
            gctx.strokeStyle = "rgba(160,00,0," + opacity + ")";
            break;
          case 1:
            gctx.strokeStyle = "rgba(44,160,0," + opacity + ")";
            break;
          case 2:
            gctx.strokeStyle = "rgba(44,0,160," + opacity + ")";
            break;
        }
      }

      function setFillColor(i, afterSamplePoint) {
        var opacity = afterSamplePoint ? 0.4 : 1.0;
        switch(i) {
          case 0:
            gctx.fillStyle = "rgba(160,00,0," + opacity + ")";
            break;
          case 1:
            gctx.fillStyle = "rgba(44,160,0," + opacity + ")";
            break;
          case 2:
            gctx.fillStyle = "rgba(44,0,160," + opacity + ")";
            break;
        }
      }

      function new_data(d) {
        var i;
        pointArray = [];
        if (Object.prototype.toString.call(d) === "[object Array]") {
          for (i = 0; i < d.length; i++) {
            points = indexedData(d[i], 0, sample);
            pointArray.push(points);
          }
        } else {
          points = indexedData(options.dataset, 0, sample);
          pointArray = [points];
        }
        updateOrRescale();
      }

      function change_xaxis(xmax) {
        x = d3.scale[options.xscale]()
            .domain([0, xmax])
            .range([0, size.width]);
        graph.xmax = xmax;
        x_tics_scale = d3.scale[options.xscale]()
            .domain([graph.xmin*graph.sample, graph.xmax*graph.sample])
            .range([0, size.width]);
        update();
        redraw();
      }

      function change_yaxis(ymax) {
        y = d3.scale[options.yscale]()
            .domain([ymax, 0])
            .range([0, size.height]);
        graph.ymax = ymax;
        update();
        redraw();
      }

      function clear_canvas() {
        gcanvas.width = gcanvas.width;
        gctx.fillStyle = "rgba(0,255,0, 0.05)";
        gctx.fillRect(0, 0, gcanvas.width, gcanvas.height);
        gctx.strokeStyle = "rgba(255,65,0, 1.0)";
      }

      function show_canvas() {
        vis.select("path.line").remove();
        gcanvas.style.zIndex = 100;
      }

      function hide_canvas() {
        gcanvas.style.zIndex = -100;
        update();
      }

      // update real-time canvas line graph
      function update_canvas(currentSample) {
        var i, index, py, samplePoint, pointStop,
            yOrigin = yScale(0.00001),
            lines = options.lines,
            bars = options.bars,
            twopi = 2 * Math.PI;

        if (typeof currentSample === 'undefined') {
          samplePoint = pointArray[0].length;
        } else {
          samplePoint = currentSample;
        }
        if (points.length === 0) { return; }
        clear_canvas();
        gctx.fillRect(0, 0, gcanvas.width, gcanvas.height);
        if (lines) {
          for (i = 0; i < pointArray.length; i++) {
            points = pointArray[i];
            px = xScale(0);
            py = yScale(points[0].y);
            index = 0;
            lengthX = 0;
            setStrokeColor(i);
            gctx.beginPath();
            gctx.moveTo(px, py);
            pointStop = samplePoint - 1;
            for (index=1; index < pointStop; index++) {
              lengthX += sample;
              px = xScale(lengthX);
              py = yScale(points[index].y);
              gctx.lineTo(px, py);
            }
            gctx.stroke();
            pointStop = points.length-1;
            if (index < pointStop) {
              setStrokeColor(i, true);
              for (;index < pointStop; index++) {
                lengthX += sample;
                px = xScale(lengthX);
                py = yScale(points[index].y);
                gctx.lineTo(px, py);
              }
              gctx.stroke();
            }
          }
        } else if (bars) {
          for (i = 0; i < pointArray.length; i++) {
            points = pointArray[i];
            lengthX = 0;
            setStrokeColor(i);
            pointStop = samplePoint - 1;
            for (index=0; index < pointStop; index++) {
              px = xScale(lengthX);
              py = yScale(points[index].y);
              if (py === 0) {
                continue;
              }
              gctx.beginPath();
              gctx.moveTo(px, yOrigin);
              gctx.lineTo(px, py);
              gctx.stroke();
              lengthX += sample;
            }
            pointStop = points.length-1;
            if (index < pointStop) {
              setStrokeColor(i, true);
              for (;index < pointStop; index++) {
                px = xScale(lengthX);
                py = yScale(points[index].y);
                gctx.beginPath();
                gctx.moveTo(px, yOrigin);
                gctx.lineTo(px, py);
                gctx.stroke();
                lengthX += sample;
              }
            }
          }
        } else {
          for (i = 0; i < pointArray.length; i++) {
            points = pointArray[i];
            lengthX = 0;
            setFillColor(i);
            setStrokeColor(i, true);
            pointStop = samplePoint - 1;
            for (index=0; index < pointStop; index++) {
              px = xScale(lengthX);
              py = yScale(points[index].y);

              // gctx.beginPath();
              // gctx.moveTo(px, py);
              // gctx.lineTo(px, py);
              // gctx.stroke();

              gctx.arc(px, py, 1, 0, twopi, false);
              gctx.fill();

              lengthX += sample;
            }
            pointStop = points.length-1;
            if (index < pointStop) {
              setFillColor(i, true);
              setStrokeColor(i, true);
              for (;index < pointStop; index++) {
                px = xScale(lengthX);
                py = yScale(points[index].y);

                // gctx.beginPath();
                // gctx.moveTo(px, py);
                // gctx.lineTo(px, py);
                // gctx.stroke();

                gctx.arc(px, py, 1, 0, twopi, false);
                gctx.fill();

                lengthX += sample;
              }
            }
          }
        }
      }

      function initialize_canvas() {
        if (!gcanvas) {
          gcanvas = gcanvas || document.createElement('canvas');
          node.appendChild(gcanvas);
        }
        gcanvas.style.zIndex = -100;
        setupCanvasProperties(gcanvas);
      }

      function resize_canvas() {
        setupCanvasProperties(gcanvas);
        update_canvas();
      }

      function setupCanvasProperties(canvas) {
        cplot.rect = plot.node();
        cplot.width = cplot.rect.width['baseVal'].value;
        cplot.height = cplot.rect.height['baseVal'].value;
        cplot.left = cplot.rect.getCTM().e;
        cplot.top = cplot.rect.getCTM().f;
        canvas.style.position = 'absolute';
        canvas.width = cplot.width;
        canvas.height = cplot.height;
        canvas.style.width = cplot.width  + 'px';
        canvas.style.height = cplot.height  + 'px';
        canvas.offsetLeft = cplot.left;
        canvas.offsetTop = cplot.top;
        canvas.style.left = cplot.left + 'px';
        canvas.style.top = cplot.top + 'px';
        canvas.style.border = 'solid 1px red';
        canvas.style.pointerEvents = "none";
        canvas.className += "canvas-overlay";
        gctx = gcanvas.getContext( '2d' );
        gctx.globalCompositeOperation = "source-over";
        gctx.lineWidth = 1;
        gctx.fillStyle = "rgba(0,255,0, 0.05)";
        gctx.fillRect(0, 0, canvas.width, gcanvas.height);
        gctx.strokeStyle = "rgba(255,65,0, 1.0)";
        gcanvas.style.border = 'solid 1px red';
      }

      // make these private variables and functions available
      graph.node = node;
      graph.scale = scale;
      graph.update = update;
      graph.redraw = redraw;
      graph.initialize = initialize;
      graph.notify = notify;

      graph.number_of_points = number_of_points;
      graph.new_data = new_data;
      graph.add_point = add_point;
      graph.add_points = add_points;
      graph.add_canvas_point = add_canvas_point;
      graph.add_canvas_points = add_canvas_points;
      graph.initialize_canvas = initialize_canvas;
      graph.show_canvas = show_canvas;
      graph.hide_canvas = hide_canvas;
      graph.clear_canvas = clear_canvas;
      graph.update_canvas = update_canvas;
      graph.showMarker = showMarker;

      graph.change_xaxis = change_xaxis;
      graph.change_yaxis = change_yaxis;
    }

    graph.add_data = function(newdata) {
      if (!arguments.length) return points;
      var domain = xScale.domain(),
          xextent = domain[1] - domain[0],
          shift = xextent * 0.8,
          i;
      if (newdata instanceof Array && newdata.length > 0) {
        if (newdata[0] instanceof Array) {
          for(i = 0; i < newdata.length; i++) {
            points.push(newdata[i]);
          }
        } else {
          if (newdata.length === 2) {
            points.push(newdata);
          } else {
            throw new Error("invalid argument to graph.add_data() " + newdata + " length should === 2.");
          }
        }
      }
      if (points[points.length-1][0] > domain[1]) {
        domain[0] += shift;
        domain[1] += shift;
        xScale.domain(domain);
        graph.redraw();
      } else {
        graph.update();
      }
      return graph;
    };

    graph.reset = function(id, options, message) {
      if (arguments.length) {
        graph.initialize(id, options, message);
      } else {
        graph.initialize();
      }
      graph();
      return graph;
    };

    graph.resize = function(w, h) {
      graph.scale(w, h);
      graph.initialize();
      graph();
      return graph;
    };

    if (node) { graph(); }

    return graph;
  };
});

/*globals define */

define('grapher/core/colors',['require'],function (require) {
  return function colors(color) {
    var colorsList = {
      bright_red:       '#ff0000',
      dark_red:         '#990000',
      bright_blue:      '#4444ff',
      dark_blue:        '#110077',
      bright_green:     '#00dd00',
      dark_green:       '#118800',
      bright_purple:    '#cc00cc',
      dark_purple:      '#770099',
      bright_orange:    '#ee6600',
      dark_orange:      '#aa4400',
      bright_turquoise: '#00ccbb',
      dark_turquoise:   '#008877'
    };
    return colorsList[color];
  };
});

/*globals define */

define('grapher/core/data',['require'],function (require) {
  return function data(array) {
    var i = 0,
        n = array.length,
        points = [];
    for (i = 0; i < n;  i = i + 2) {
      points.push( { x: array[i], y: array[i+1] } );
    }
    return points;
  };
});

/*globals define */

define('grapher/core/indexed-data',['require'],function (require) {
  return function indexedData(array, initial_index) {
    var i = 0,
        start_index = initial_index || 0,
        n = array.length,
        points = [];
    for (i = 0; i < n;  i++) {
      points.push( { x: i+start_index, y: array[i] } );
    }
    return points;
  };
});

/*globals define: false, window: false */

define('grapher/public-api',['require','grapher/core/graph','grapher/core/real-time-graph','grapher/core/axis','grapher/core/colors','grapher/core/data','grapher/core/indexed-data','grapher/core/register-keyboard-handler'],function (require) {
  'use strict';
  var
    graph                   = require('grapher/core/graph'),
    realTimeGraph           = require('grapher/core/real-time-graph'),
    axis                    = require('grapher/core/axis'),
    colors                  = require('grapher/core/colors'),
    data                    = require('grapher/core/data'),
    indexedData             = require('grapher/core/indexed-data'),
    registerKeyboardHandler = require('grapher/core/register-keyboard-handler'),
    // Object to be returned.
    publicAPI;

  publicAPI = {
    version: "0.0.1",
    // ==========================================================================
    // Add functions and modules which should belong to this API:
    // - graph constructor,
    graph: graph,
    // - realTimeGraph constructor,
    realTimeGraph: realTimeGraph,
    // - axis module,
    axis: axis,
    // - colors function,
    colors: colors,
    // - data function,
    data: data,
    // - indexedData function,
    indexedData: indexedData,
    // - registerKeyboardHandler function,
    registerKeyboardHandler: registerKeyboardHandler
    // ==========================================================================
  };

  // Finally, export API to global namespace.
  // Export this API under 'grapher' name.
  window.grapher = publicAPI;

  // Also return publicAPI as module.
  return publicAPI;
});
require(['grapher/public-api'], undefined, undefined, true); }());(function() {
/**
 * almond 0.1.2 Copyright (c) 2011, The Dojo Foundation All Rights Reserved.
 * Available via the MIT or new BSD license.
 * see: http://github.com/jrburke/almond for details
 */
//Going sloppy to avoid 'use strict' string cost, but strict practices should
//be followed.
/*jslint sloppy: true */
/*global setTimeout: false */

var requirejs, require, define;
(function (undef) {
    var defined = {},
        waiting = {},
        config = {},
        defining = {},
        aps = [].slice,
        main, req;

    /**
     * Given a relative module name, like ./something, normalize it to
     * a real name that can be mapped to a path.
     * @param {String} name the relative name
     * @param {String} baseName a real name that the name arg is relative
     * to.
     * @returns {String} normalized name
     */
    function normalize(name, baseName) {
        var baseParts = baseName && baseName.split("/"),
            map = config.map,
            starMap = (map && map['*']) || {},
            nameParts, nameSegment, mapValue, foundMap,
            foundI, foundStarMap, starI, i, j, part;

        //Adjust any relative paths.
        if (name && name.charAt(0) === ".") {
            //If have a base name, try to normalize against it,
            //otherwise, assume it is a top-level require that will
            //be relative to baseUrl in the end.
            if (baseName) {
                //Convert baseName to array, and lop off the last part,
                //so that . matches that "directory" and not name of the baseName's
                //module. For instance, baseName of "one/two/three", maps to
                //"one/two/three.js", but we want the directory, "one/two" for
                //this normalization.
                baseParts = baseParts.slice(0, baseParts.length - 1);

                name = baseParts.concat(name.split("/"));

                //start trimDots
                for (i = 0; (part = name[i]); i++) {
                    if (part === ".") {
                        name.splice(i, 1);
                        i -= 1;
                    } else if (part === "..") {
                        if (i === 1 && (name[2] === '..' || name[0] === '..')) {
                            //End of the line. Keep at least one non-dot
                            //path segment at the front so it can be mapped
                            //correctly to disk. Otherwise, there is likely
                            //no path mapping for a path starting with '..'.
                            //This can still fail, but catches the most reasonable
                            //uses of ..
                            return true;
                        } else if (i > 0) {
                            name.splice(i - 1, 2);
                            i -= 2;
                        }
                    }
                }
                //end trimDots

                name = name.join("/");
            }
        }

        //Apply map config if available.
        if ((baseParts || starMap) && map) {
            nameParts = name.split('/');

            for (i = nameParts.length; i > 0; i -= 1) {
                nameSegment = nameParts.slice(0, i).join("/");

                if (baseParts) {
                    //Find the longest baseName segment match in the config.
                    //So, do joins on the biggest to smallest lengths of baseParts.
                    for (j = baseParts.length; j > 0; j -= 1) {
                        mapValue = map[baseParts.slice(0, j).join('/')];

                        //baseName segment has  config, find if it has one for
                        //this name.
                        if (mapValue) {
                            mapValue = mapValue[nameSegment];
                            if (mapValue) {
                                //Match, update name to the new value.
                                foundMap = mapValue;
                                foundI = i;
                                break;
                            }
                        }
                    }
                }

                if (foundMap) {
                    break;
                }

                //Check for a star map match, but just hold on to it,
                //if there is a shorter segment match later in a matching
                //config, then favor over this star map.
                if (!foundStarMap && starMap && starMap[nameSegment]) {
                    foundStarMap = starMap[nameSegment];
                    starI = i;
                }
            }

            if (!foundMap && foundStarMap) {
                foundMap = foundStarMap;
                foundI = starI;
            }

            if (foundMap) {
                nameParts.splice(0, foundI, foundMap);
                name = nameParts.join('/');
            }
        }

        return name;
    }

    function makeRequire(relName, forceSync) {
        return function () {
            //A version of a require function that passes a moduleName
            //value for items that may need to
            //look up paths relative to the moduleName
            return req.apply(undef, aps.call(arguments, 0).concat([relName, forceSync]));
        };
    }

    function makeNormalize(relName) {
        return function (name) {
            return normalize(name, relName);
        };
    }

    function makeLoad(depName) {
        return function (value) {
            defined[depName] = value;
        };
    }

    function callDep(name) {
        if (waiting.hasOwnProperty(name)) {
            var args = waiting[name];
            delete waiting[name];
            defining[name] = true;
            main.apply(undef, args);
        }

        if (!defined.hasOwnProperty(name)) {
            throw new Error('No ' + name);
        }
        return defined[name];
    }

    /**
     * Makes a name map, normalizing the name, and using a plugin
     * for normalization if necessary. Grabs a ref to plugin
     * too, as an optimization.
     */
    function makeMap(name, relName) {
        var prefix, plugin,
            index = name.indexOf('!');

        if (index !== -1) {
            prefix = normalize(name.slice(0, index), relName);
            name = name.slice(index + 1);
            plugin = callDep(prefix);

            //Normalize according
            if (plugin && plugin.normalize) {
                name = plugin.normalize(name, makeNormalize(relName));
            } else {
                name = normalize(name, relName);
            }
        } else {
            name = normalize(name, relName);
        }

        //Using ridiculous property names for space reasons
        return {
            f: prefix ? prefix + '!' + name : name, //fullName
            n: name,
            p: plugin
        };
    }

    function makeConfig(name) {
        return function () {
            return (config && config.config && config.config[name]) || {};
        };
    }

    main = function (name, deps, callback, relName) {
        var args = [],
            usingExports,
            cjsModule, depName, ret, map, i;

        //Use name if no relName
        relName = relName || name;

        //Call the callback to define the module, if necessary.
        if (typeof callback === 'function') {

            //Pull out the defined dependencies and pass the ordered
            //values to the callback.
            //Default to [require, exports, module] if no deps
            deps = !deps.length && callback.length ? ['require', 'exports', 'module'] : deps;
            for (i = 0; i < deps.length; i++) {
                map = makeMap(deps[i], relName);
                depName = map.f;

                //Fast path CommonJS standard dependencies.
                if (depName === "require") {
                    args[i] = makeRequire(name);
                } else if (depName === "exports") {
                    //CommonJS module spec 1.1
                    args[i] = defined[name] = {};
                    usingExports = true;
                } else if (depName === "module") {
                    //CommonJS module spec 1.1
                    cjsModule = args[i] = {
                        id: name,
                        uri: '',
                        exports: defined[name],
                        config: makeConfig(name)
                    };
                } else if (defined.hasOwnProperty(depName) || waiting.hasOwnProperty(depName)) {
                    args[i] = callDep(depName);
                } else if (map.p) {
                    map.p.load(map.n, makeRequire(relName, true), makeLoad(depName), {});
                    args[i] = defined[depName];
                } else if (!defining[depName]) {
                    throw new Error(name + ' missing ' + depName);
                }
            }

            ret = callback.apply(defined[name], args);

            if (name) {
                //If setting exports via "module" is in play,
                //favor that over return value and exports. After that,
                //favor a non-undefined return value over exports use.
                if (cjsModule && cjsModule.exports !== undef &&
                    cjsModule.exports !== defined[name]) {
                    defined[name] = cjsModule.exports;
                } else if (ret !== undef || !usingExports) {
                    //Use the return value from the function.
                    defined[name] = ret;
                }
            }
        } else if (name) {
            //May just be an object definition for the module. Only
            //worry about defining if have a module name.
            defined[name] = callback;
        }
    };

    requirejs = require = req = function (deps, callback, relName, forceSync) {
        if (typeof deps === "string") {
            //Just return the module wanted. In this scenario, the
            //deps arg is the module name, and second arg (if passed)
            //is just the relName.
            //Normalize module name, if it contains . or ..
            return callDep(makeMap(deps, callback).f);
        } else if (!deps.splice) {
            //deps is a config object, not an array.
            config = deps;
            if (callback.splice) {
                //callback is an array, which means it is a dependency list.
                //Adjust args if there are dependencies
                deps = callback;
                callback = relName;
                relName = null;
            } else {
                deps = undef;
            }
        }

        //Support require(['a'])
        callback = callback || function () {};

        //Simulate async callback;
        if (forceSync) {
            main(undef, deps, callback, relName);
        } else {
            setTimeout(function () {
                main(undef, deps, callback, relName);
            }, 15);
        }

        return req;
    };

    /**
     * Just drops the config on the floor, but returns req in case
     * the config return value is used.
     */
    req.config = function (cfg) {
        config = cfg;
        return req;
    };

    define = function (name, deps, callback) {

        //This module may not have dependencies
        if (!deps.splice) {
            //deps is not an array, so probably means
            //an object literal or factory function for
            //the value. Adjust args.
            callback = deps;
            deps = [];
        }

        waiting[name] = [name, deps, callback];
    };

    define.amd = {
        jQuery: true
    };
}());

define("../vendor/almond/almond", function(){});

define('common/console',['require'],function (require) {

  // prevent a console.log from blowing things up if we are on a browser that
  // does not support it ... like IE9
  if (typeof console === 'undefined') {
    window.console = {} ;
    console.log = console.info = console.warn = console.error = function(){};
  }

});

/*globals window Uint8Array Uint8ClampedArray Int8Array Uint16Array Int16Array Uint32Array Int32Array Float32Array Float64Array */
/*jshint newcap: false */

// Module can be used both in Node.js environment and in Web browser
// using RequireJS. R.JS Optimizer will strip out this if statement.


define('arrays/index',['require','exports','module'],function (require, exports, module) {
  var arrays = {},

      // Check for Safari. Typed arrays are faster almost everywhere
      // ... except Safari.
      notSafari = (function() {
        var safarimatch  = / AppleWebKit\/([0123456789.+]+) \(KHTML, like Gecko\) Version\/([0123456789.]+) (Safari)\/([0123456789.]+)/,
            match = navigator.userAgent.match(safarimatch);
        return (match && match[3]) ? false: true;
      }());

  arrays.version = '0.0.1';

  arrays.webgl = (typeof window !== 'undefined') && !!window.WebGLRenderingContext;

  arrays.typed = (function() {
    try {
      new Float64Array(0);
      return true;
    } catch(e) {
      return false;
    }
  }());

  // http://www.khronos.org/registry/typedarray/specs/latest/#TYPEDARRAYS
  // regular
  // Uint8Array
  // Uint8ClampedArray
  // Uint16Array
  // Uint32Array
  // Int8Array
  // Int16Array
  // Int32Array
  // Float32Array
  // Float64Array

  arrays.create = function(size, fill, array_type) {
    if (!array_type) {
      if (arrays.webgl || arrays.typed) {
        array_type = "Float32Array";
      } else {
        array_type = "regular";
      }
    }
    if (fill === undefined) {
      fill = 0;
    }
    var a, i;
    if (array_type === "regular") {
      a = new Array(size);
    } else {
      switch(array_type) {
        case "Float64Array":
          a = new Float64Array(size);
          break;
        case "Float32Array":
          a = new Float32Array(size);
          break;
        case "Int32Array":
          a = new Int32Array(size);
          break;
        case "Int16Array":
          a = new Int16Array(size);
          break;
        case "Int8Array":
          a = new Int8Array(size);
          break;
        case "Uint32Array":
          a = new Uint32Array(size);
          break;
        case "Uint16Array":
          a = new Uint16Array(size);
          break;
        case "Uint8Array":
          a = new Uint8Array(size);
          break;
        case "Uint8ClampedArray":
          a = new Uint8ClampedArray(size);
          break;
        default:
          throw new Error("arrays: couldn't understand array type \"" + array_type + "\".");
      }
    }
    i=-1; while(++i < size) { a[i] = fill; }
    return a;
  };

  arrays.constructor_function = function(source) {
    if (source.buffer && source.buffer.__proto__ && source.buffer.__proto__.constructor) {
      return source.__proto__.constructor;
    }
    switch(source.constructor) {
      case Array: return Array;
      case Float32Array: return Float32Array;
      case Uint8Array: return Uint8Array;
      case Float64Array: return Float64Array;
      case Int32Array: return Int32Array;
      case Int16Array: return Int16Array;
      case Int8Array: return Int8Array;
      case Uint32Array: return Uint32Array;
      case Uint16Array: return Uint16Array;
      case Uint8ClampedArray: return Uint8ClampedArray;
      default:
        throw new Error(
            "arrays.constructor_function: must be an Array or Typed Array: " + "  source: " + source);
            // ", source.constructor: " + source.constructor +
            // ", source.buffer: " + source.buffer +
            // ", source.buffer.slice: " + source.buffer.slice +
            // ", source.buffer.__proto__: " + source.buffer.__proto__ +
            // ", source.buffer.__proto__.constructor: " + source.buffer.__proto__.constructor
      }
  };

  arrays.copy = function(source, dest) {
    var len = source.length,
        i = -1;
    while(++i < len) { dest[i] = source[i]; }
    if (arrays.constructor_function(dest) === Array) dest.length = len;
    return dest;
  };

  arrays.clone = function(source) {
    var i, len = source.length, clone, constructor;
    constructor = arrays.constructor_function(source);
    if (constructor === Array) {
      clone = new constructor(len);
      for (i = 0; i < len; i++) { clone[i] = source[i]; }
      return clone;
    }
    if (source.buffer.slice) {
      clone = new constructor(source.buffer.slice(0));
      return clone;
    }
    clone = new constructor(len);
    for (i = 0; i < len; i++) { clone[i] = source[i]; }
    return clone;
  };

  /** @return true if x is between a and b. */
  // float a, float b, float x
  arrays.between = function(a, b, x) {
    return x < Math.max(a, b) && x > Math.min(a, b);
  };

  // float[] array
  arrays.max = function(array) {
    return Math.max.apply( Math, array );
  };

  // float[] array
  arrays.min = function(array) {
    return Math.min.apply( Math, array );
  };

  // FloatxxArray[] array
  arrays.maxTypedArray = function(array) {
    var test, i,
    max = Number.MIN_VALUE,
    length = array.length;
    for(i = 0; i < length; i++) {
      test = array[i];
      max = test > max ? test : max;
    }
    return max;
  };

  // FloatxxArray[] array
  arrays.minTypedArray = function(array) {
    var test, i,
    min = Number.MAX_VALUE,
    length = array.length;
    for(i = 0; i < length; i++) {
      test = array[i];
      min = test < min ? test : min;
    }
    return min;
  };

  // float[] array
  arrays.maxAnyArray = function(array) {
    try {
      return Math.max.apply( Math, array );
    }
    catch (e) {
      if (e instanceof TypeError) {
        var test, i,
        max = Number.MIN_VALUE,
        length = array.length;
        for(i = 0; i < length; i++) {
          test = array[i];
          max = test > max ? test : max;
        }
        return max;
      }
    }
  };

  // float[] array
  arrays.minAnyArray = function(array) {
    try {
      return Math.min.apply( Math, array );
    }
    catch (e) {
      if (e instanceof TypeError) {
        var test, i,
        min = Number.MAX_VALUE,
        length = array.length;
        for(i = 0; i < length; i++) {
          test = array[i];
          min = test < min ? test : min;
        }
        return min;
      }
    }
  };

  arrays.average = function(array) {
    var i, acc = 0,
    length = array.length;
    for (i = 0; i < length; i++) {
      acc += array[i];
    }
    return acc / length;
  };

  /**
    Create a new array of the same type as 'array' and of length 'newLength', and copies as many
    elements from 'array' to the new array as is possible.

    If 'newLength' is less than 'array.length', and 'array' is  a typed array, we still allocate a
    new, shorter array in order to allow GC to work.

    The returned array should always take the place of the passed-in 'array' in client code, and this
    method should not be counted on to always return a copy. If 'array' is non-typed, we manipulate
    its length instead of copying it. But if 'array' is typed, we cannot increase its size in-place,
    therefore must pas a *new* object reference back to client code.
  */
  arrays.extend = function(array, newLength) {
    var i,
        len,
        extendedArray,
        Constructor;

    Constructor = arrays.constructor_function(array);

    if (Constructor === Array) {
      array.length = newLength;
      return array;
    }

    extendedArray = new Constructor(newLength);

    // prevent 'set' method from erroring when array.length > newLength, by using the (no-copy) method
    // 'subarray' to get an array view that is clamped to length = min(array.length, newLength)
    extendedArray.set(array.subarray(0, newLength));

    return extendedArray;
  };


  // publish everything to exports
  for (var key in arrays) {
    if (arrays.hasOwnProperty(key)) exports[key] = arrays[key];
  }
});

define('arrays', ['arrays/index'], function (main) { return main; });

/*globals define: true */
/** Provides a few simple helper functions for converting related unit types.

    This sub-module doesn't do unit conversion between compound unit types (e.g., knowing that kg*m/s^2 = N)
    only simple scaling between units measuring the same type of quantity.
*/

// Prefer the "per" formulation to the "in" formulation.
//
// If KILOGRAMS_PER_AMU is 1.660540e-27 we know the math is:
// "1 amu * 1.660540e-27 kg/amu = 1.660540e-27 kg"
// (Whereas the "in" forumulation might be slighty more error prone:
// given 1 amu and 6.022e-26 kg in an amu, how do you get kg again?)

// These you might have to look up...

// Module can be used both in Node.js environment and in Web browser
// using RequireJS. RequireJS Optimizer will strip out this if statement.


define('md2d/models/engine/constants/units',['require','exports','module'],function (require, exports, module) {

  var KILOGRAMS_PER_DALTON  = 1.660540e-27,
      COULOMBS_PER_ELEMENTARY_CHARGE = 1.602177e-19,

      // 1 eV = 1 e * 1 V = (COULOMBS_PER_ELEMENTARY_CHARGE) C * 1 J/C
      JOULES_PER_EV = COULOMBS_PER_ELEMENTARY_CHARGE,

      // though these are equally important!
      SECONDS_PER_FEMTOSECOND = 1e-15,
      METERS_PER_NANOMETER    = 1e-9,
      ANGSTROMS_PER_NANOMETER = 10,
      GRAMS_PER_KILOGRAM      = 1000,

      types = {
        TIME: "time",
        LENGTH: "length",
        MASS: "mass",
        ENERGY: "energy",
        ENTROPY: "entropy",
        CHARGE: "charge",
        INVERSE_QUANTITY: "inverse quantity",

        FARADS_PER_METER: "farads per meter",
        METERS_PER_FARAD: "meters per farad",

        FORCE: "force",
        VELOCITY: "velocity",

        // unused as of yet
        AREA: "area",
        PRESSURE: "pressure"
      },

    unit,
    ratio,
    convert;

  /**
    In each of these units, the reference type we actually use has value 1, and conversion
    ratios for the others are listed.
  */
  exports.unit = unit = {

    FEMTOSECOND: { name: "femtosecond", value: 1,                       type: types.TIME },
    SECOND:      { name: "second",      value: SECONDS_PER_FEMTOSECOND, type: types.TIME },

    NANOMETER:   { name: "nanometer", value: 1,                           type: types.LENGTH },
    ANGSTROM:    { name: "Angstrom",  value: 1 * ANGSTROMS_PER_NANOMETER, type: types.LENGTH },
    METER:       { name: "meter",     value: 1 * METERS_PER_NANOMETER,    type: types.LENGTH },

    DALTON:   { name: "Dalton",   value: 1,                                             type: types.MASS },
    GRAM:     { name: "gram",     value: 1 * KILOGRAMS_PER_DALTON * GRAMS_PER_KILOGRAM, type: types.MASS },
    KILOGRAM: { name: "kilogram", value: 1 * KILOGRAMS_PER_DALTON,                      type: types.MASS },

    MW_ENERGY_UNIT: {
      name: "MW Energy Unit (Dalton * nm^2 / fs^2)",
      value: 1,
      type: types.ENERGY
    },

    JOULE: {
      name: "Joule",
      value: KILOGRAMS_PER_DALTON *
             METERS_PER_NANOMETER * METERS_PER_NANOMETER *
             (1/SECONDS_PER_FEMTOSECOND) * (1/SECONDS_PER_FEMTOSECOND),
      type: types.ENERGY
    },

    EV: {
      name: "electron volt",
      value: KILOGRAMS_PER_DALTON *
              METERS_PER_NANOMETER * METERS_PER_NANOMETER *
              (1/SECONDS_PER_FEMTOSECOND) * (1/SECONDS_PER_FEMTOSECOND) *
              (1/JOULES_PER_EV),
      type: types.ENERGY
    },

    EV_PER_KELVIN:     { name: "electron volts per Kelvin", value: 1,                 type: types.ENTROPY },
    JOULES_PER_KELVIN: { name: "Joules per Kelvin",         value: 1 * JOULES_PER_EV, type: types.ENTROPY },

    ELEMENTARY_CHARGE: { name: "elementary charge", value: 1,                             type: types.CHARGE },
    COULOMB:           { name: "Coulomb",           value: COULOMBS_PER_ELEMENTARY_CHARGE, type: types.CHARGE },

    INVERSE_MOLE: { name: "inverse moles", value: 1, type: types.INVERSE_QUANTITY },

    FARADS_PER_METER: { name: "Farads per meter", value: 1, type: types.FARADS_PER_METER },

    METERS_PER_FARAD: { name: "meters per Farad", value: 1, type: types.METERS_PER_FARAD },

    MW_FORCE_UNIT: {
      name: "MW force units (Dalton * nm / fs^2)",
      value: 1,
      type: types.FORCE
    },

    NEWTON: {
      name: "Newton",
      value: 1 * KILOGRAMS_PER_DALTON * METERS_PER_NANOMETER * (1/SECONDS_PER_FEMTOSECOND) * (1/SECONDS_PER_FEMTOSECOND),
      type: types.FORCE
    },

    EV_PER_NM: {
      name: "electron volts per nanometer",
      value: 1 * KILOGRAMS_PER_DALTON * METERS_PER_NANOMETER * METERS_PER_NANOMETER *
             (1/SECONDS_PER_FEMTOSECOND) * (1/SECONDS_PER_FEMTOSECOND) *
             (1/JOULES_PER_EV),
      type: types.FORCE
    },

    MW_VELOCITY_UNIT: {
      name: "MW velocity units (nm / fs)",
      value: 1,
      type: types.VELOCITY
    },

    METERS_PER_SECOND: {
      name: "meters per second",
      value: 1 * METERS_PER_NANOMETER * (1 / SECONDS_PER_FEMTOSECOND),
      type: types.VELOCITY
    }

  };


  /** Provide ratios for conversion of one unit to an equivalent unit type.

     Usage: ratio(units.GRAM, { per: units.KILOGRAM }) === 1000
            ratio(units.GRAM, { as: units.KILOGRAM }) === 0.001
  */
  exports.ratio = ratio = function(from, to) {
    var checkCompatibility = function(fromUnit, toUnit) {
      if (fromUnit.type !== toUnit.type) {
        throw new Error("Attempt to convert incompatible type '" + fromUnit.name + "'' to '" + toUnit.name + "'");
      }
    };

    if (to.per) {
      checkCompatibility(from, to.per);
      return from.value / to.per.value;
    } else if (to.as) {
      checkCompatibility(from, to.as);
      return to.as.value / from.value;
    } else {
      throw new Error("units.ratio() received arguments it couldn't understand.");
    }
  };

  /** Scale 'val' to a different unit of the same type.

    Usage: convert(1, { from: unit.KILOGRAM, to: unit.GRAM }) === 1000
  */
  exports.convert = convert = function(val, fromTo) {
    var from = fromTo && fromTo.from,
        to   = fromTo && fromTo.to;

    if (!from) {
      throw new Error("units.convert() did not receive a \"from\" argument");
    }
    if (!to) {
      throw new Error("units.convert() did not receive a \"to\" argument");
    }

    return val * ratio(to, { per: from });
  };
});

/*globals define: true */
/*jslint loopfunc: true */

/** A list of physical constants. To access any given constant, require() this module
    and call the 'as' method of the desired constant to get the constant in the desired unit.

    This module also provides a few helper functions for unit conversion.

    Usage:
      var constants = require('./constants'),

          ATOMIC_MASS_IN_GRAMS = constants.ATOMIC_MASS.as(constants.unit.GRAM),

          GRAMS_PER_KILOGRAM = constants.ratio(constants.unit.GRAM, { per: constants.unit.KILOGRAM }),

          // this works for illustration purposes, although the preferred method would be to pass
          // constants.unit.KILOGRAM to the 'as' method:

          ATOMIC_MASS_IN_KILOGRAMS = constants.convert(ATOMIC_MASS_IN_GRAMS, {
            from: constants.unit.GRAM,
            to:   constants.unit.KILOGRAM
          });
*/

// Module can be used both in Node.js environment and in Web browser
// using RequireJS. RequireJS Optimizer will strip out this if statement.


define('md2d/models/engine/constants/index',['require','exports','module','./units'],function (require, exports, module) {

  var units = require('./units'),
      unit  = units.unit,
      ratio = units.ratio,
      convert = units.convert,

      constants = {

        ELEMENTARY_CHARGE: {
          value: 1,
          unit: unit.ELEMENTARY_CHARGE
        },

        ATOMIC_MASS: {
          value: 1,
          unit: unit.DALTON
        },

        BOLTZMANN_CONSTANT: {
          value: 1.380658e-23,
          unit: unit.JOULES_PER_KELVIN
        },

        AVAGADRO_CONSTANT: {
          // N_A is numerically equal to Dalton per gram
          value: ratio( unit.DALTON, { per: unit.GRAM }),
          unit: unit.INVERSE_MOLE
        },

        PERMITTIVITY_OF_FREE_SPACE: {
          value: 8.854187e-12,
          unit: unit.FARADS_PER_METER
        }
      },

      constantName, constant;


  // Derived units
  constants.COULOMB_CONSTANT = {
    value: 1 / (4 * Math.PI * constants.PERMITTIVITY_OF_FREE_SPACE.value),
    unit: unit.METERS_PER_FARAD
  };

  // Exports

  exports.unit = unit;
  exports.ratio = ratio;
  exports.convert = convert;

  // Require explicitness about units by publishing constants as a set of objects with only an 'as' property,
  // which will return the constant in the specified unit.

  for (constantName in constants) {
    if (constants.hasOwnProperty(constantName)) {
      constant = constants[constantName];

      exports[constantName] = (function(constant) {
        return {
          as: function(toUnit) {
            return units.convert(constant.value, { from: constant.unit, to: toUnit });
          }
        };
      }(constant));
    }
  }
});

/*globals define: true */
/*jslint eqnull: true */

// Simple (Box-Muller) univariate-normal random number generator.
//
// The 'science.js' library includes a Box-Muller implementation which is likely to be slower, especially in a
// modern Javascript engine, because it uses a rejection method to pick the random point in the unit circle.
// See discussion on pp. 1-3 of:
// http://www.math.nyu.edu/faculty/goodman/teaching/MonteCarlo2005/notes/GaussianSampling.pdf
//

// Module can be used both in Node.js environment and in Web browser
// using RequireJS. RequireJS Optimizer will strip out this if statement.


define('md2d/models/engine/math/distributions',['require','exports','module'],function (require, exports, module) {

  exports.normal = (function() {
    var next = null;

    return function(mean, sd) {
      if (mean == null) mean = 0;
      if (sd == null)   sd = 1;

      var r, ret, theta, u1, u2;

      if (next) {
        ret  = next;
        next = null;
        return ret;
      }

      u1    = Math.random();
      u2    = Math.random();
      theta = 2 * Math.PI * u1;
      r     = Math.sqrt(-2 * Math.log(u2));

      next = mean + sd * (r * Math.sin(theta));
      return mean + sd * (r * Math.cos(theta));
    };
  }());
});

/*globals define: true */
/*jslint eqnull: true */
/**
  Returns a function which accepts a single numeric argument and returns:

   * the arithmetic mean of the windowSize most recent inputs, including the current input
   * NaN if there have not been windowSize inputs yet.

  The default windowSize is 1000.

*/

// Module can be used both in Node.js environment and in Web browser
// using RequireJS. RequireJS Optimizer will strip out this if statement.


define('md2d/models/engine/math/utils',['require','exports','module'],function (require, exports, module) {

  exports.getWindowedAverager = function(windowSize) {

    if (windowSize == null) windowSize = 1000;      // default window size

    var i = 0,
        vals = [],
        sum_vals = 0;

    return function(val) {
      sum_vals -= (vals[i] || 0);
      sum_vals += val;
      vals[i] = val;

      if (++i === windowSize) i = 0;

      if (vals.length === windowSize) {
        return sum_vals / windowSize;
      }
      else {
        // don't allow any numerical comparisons with result to be true
        return NaN;
      }
    };
  };
});

/*globals define: true */
/*jshint eqnull:true */
/**
  Simple, good-enough minimization via gradient descent.
*/

// Module can be used both in Node.js environment and in Web browser
// using RequireJS. RequireJS Optimizer will strip out this if statement.


define('md2d/models/engine/math/minimizer',['require','exports','module'],function (require, exports, module) {

  exports.minimize = function(f, x0, opts) {
    opts = opts || {};

    if (opts.precision == null) opts.precision = 0.01;

    var // stop when the absolute difference between successive values of f is this much or less
        precision = opts.precision,

        // array of [min, max] boundaries for each component of x
        bounds    = opts.bounds,

        // maximum number of iterations
        maxiter   = opts.maxiter   || 1000,

        // optionally, stop when f is less than or equal to this value
        stopval   = opts.stopval   || -Infinity,

        // maximum distance to move x between steps
        maxstep   = opts.maxstep   || 0.01,

        // multiplied by the gradient
        eps       = opts.eps       || 0.01,
        dim       = x0.length,
        x,
        res,
        f_cur,
        f_prev,
        grad,
        maxstepsq,
        gradnormsq,
        iter,
        i,
        a;

    maxstepsq = maxstep*maxstep;

    // copy x0 into x (which we will mutate)
    x = [];
    for (i = 0; i < dim; i++) {
      x[i] = x0[i];
    }

    // evaluate f and get the gradient
    res = f.apply(null, x);
    f_cur = res[0];
    grad = res[1];

    iter = 0;
    do {
      if (f_cur <= stopval) {
        break;
      }

      if (iter > maxiter) {
        console.log("maxiter reached");
        // don't throw on error, but return some diagnostic information
        return { error: "maxiter reached", f: f_cur, iter: maxiter, x: x };
      }

      // Limit gradient descent step size to maxstep
      gradnormsq = 0;
      for (i = 0; i < dim; i++) {
        gradnormsq += grad[i]*grad[i];
      }
      if (eps*eps*gradnormsq > maxstepsq) {
        a = Math.sqrt(maxstepsq / gradnormsq) / eps;
        for (i = 0; i < dim; i++) {
          grad[i] = a * grad[i];
        }
      }

      // Take a step in the direction opposite the gradient
      for (i = 0; i < dim; i++) {
        x[i] -= eps * grad[i];

        // check bounds
        if (bounds && x[i] < bounds[i][0]) {
          x[i] = bounds[i][0];
        }
        if (bounds && x[i] > bounds[i][1]) {
          x[i] = bounds[i][1];
        }
      }

      f_prev = f_cur;

      res = f.apply(null, x);
      f_cur = res[0];
      grad = res[1];

      iter++;
    } while ( Math.abs(f_cur-f_prev) > precision );

    return [f_cur, x];
  };
});

/*globals define: true */

// Module can be used both in Node.js environment and in Web browser
// using RequireJS. RequireJS Optimizer will strip out this if statement.


define('md2d/models/engine/math/index',['require','exports','module','./distributions','./utils','./minimizer'],function (require, exports, module) {
  exports.normal              = require('./distributions').normal;
  exports.getWindowedAverager = require('./utils').getWindowedAverager;
  exports.minimize            = require('./minimizer').minimize;
});

/*globals define: true */

// Module can be used both in Node.js environment and in Web browser
// using RequireJS. RequireJS Optimizer will strip out this if statement.


define('md2d/models/engine/potentials/coulomb',['require','exports','module','../constants/index'],function (require, exports, module) {

  var
  constants = require('../constants/index'),
  unit      = constants.unit,

  // Classic MW uses a value for Coulomb's constant that is effectively 0.346 of the real value
  CLASSIC_MW_FUDGE_FACTOR = 0.346,

  COULOMB_CONSTANT_IN_METERS_PER_FARAD = constants.COULOMB_CONSTANT.as( constants.unit.METERS_PER_FARAD ),

  NANOMETERS_PER_METER = constants.ratio(unit.NANOMETER, { per: unit.METER }),
  COULOMBS_SQ_PER_ELEMENTARY_CHARGE_SQ = Math.pow( constants.ratio(unit.COULOMB, { per: unit.ELEMENTARY_CHARGE }), 2),

  EV_PER_JOULE = constants.ratio(unit.EV, { per: unit.JOULE }),
  MW_FORCE_UNITS_PER_NEWTON = constants.ratio(unit.MW_FORCE_UNIT, { per: unit.NEWTON }),

  // Coulomb constant for expressing potential in eV given elementary charges, nanometers
  k_ePotential = CLASSIC_MW_FUDGE_FACTOR *
                 COULOMB_CONSTANT_IN_METERS_PER_FARAD *
                 COULOMBS_SQ_PER_ELEMENTARY_CHARGE_SQ *
                 NANOMETERS_PER_METER *
                 EV_PER_JOULE,

  // Coulomb constant for expressing force in Dalton*nm/fs^2 given elementary charges, nanometers
  k_eForce = CLASSIC_MW_FUDGE_FACTOR *
             COULOMB_CONSTANT_IN_METERS_PER_FARAD *
             COULOMBS_SQ_PER_ELEMENTARY_CHARGE_SQ *
             NANOMETERS_PER_METER *
             NANOMETERS_PER_METER *
             MW_FORCE_UNITS_PER_NEWTON,


  // Exports

  /** Input units:
       r: nanometers,
       q1, q2: elementary charges

      Output units: eV
  */
  potential = exports.potential = function(r, q1, q2) {
    return k_ePotential * ((q1 * q2) / r);
  },


  /** Input units:
      r_sq: nanometers^2
      q1, q2: elementary charges

      Output units: "MW Force Units" (Dalton * nm / fs^2)
  */
  forceFromSquaredDistance = exports.forceFromSquaredDistance = function(r_sq, q1, q2) {
    return -k_eForce * ((q1 * q2) / r_sq);
  },


  forceOverDistanceFromSquaredDistance = exports.forceOverDistanceFromSquaredDistance = function(r_sq, q1, q2) {
    return forceFromSquaredDistance(r_sq, q1, q2) / Math.sqrt(r_sq);
  },

  /** Input units:
       r: nanometers,
       q1, q2: elementary charges

      Output units: "MW Force Units" (Dalton * nm / fs^2)
  */
  force = exports.force = function(r, q1, q2) {
    return forceFromSquaredDistance(r*r, q1, q2);
  };
});

/*globals define: true */
/*jshint eqnull:true boss:true */

// Module can be used both in Node.js environment and in Web browser
// using RequireJS. RequireJS Optimizer will strip out this if statement.


define('md2d/models/engine/potentials/lennard-jones',['require','exports','module','../constants/index'],function (require, exports, module) {

  var constants = require('../constants/index'),
      unit      = constants.unit,

      NANOMETERS_PER_METER = constants.ratio( unit.NANOMETER, { per: unit.METER }),
      MW_FORCE_UNITS_PER_NEWTON = constants.ratio( unit.MW_FORCE_UNIT, { per: unit.NEWTON });

  /**
    Helper function that returns the correct pairwise epsilon value to be used
    when elements each have epsilon values epsilon1, epsilon2
  */
  exports.pairwiseEpsilon = function(epsilon1, epsilon2) {
    return 0.5 * (epsilon1 + epsilon2);
  },

  /**
    Helper function that returns the correct pairwise sigma value to be used
    when elements each have sigma values sigma1, sigma2
  */
  exports.pairwiseSigma = function(sigma1, sigma2) {
    return Math.sqrt(sigma1 * sigma2);
  },

  /**
    Helper function that returns the correct rmin value for a given sigma
  */
  exports.rmin = function(sigma) {
    return Math.pow(2, 1/6) * sigma;
  };

  /**
    Helper function that returns the correct atomic radius for a given sigma
  */
  exports.radius = function(sigma) {
    // See line 637 of Atom.java (org.concord.mw2d.models.Atom)
    // This assumes the "VdW percentage" is 100%. In classic MW the VdW percentage is settable.
    return 0.5 * sigma;
  };

  /**
    Returns a new object with methods for calculating the force and potential for a Lennard-Jones
    potential with particular values of its parameters epsilon and sigma. These can be adjusted.

    To avoid the needing to take square roots during calculation of pairwise forces, there are
    also methods which calculate the inter-particle potential directly from a squared distance, and
    which calculate the quantity (force/distance) directly from a squared distance.

    This function also accepts a callback function which will be called with a hash representing
    the new coefficients, whenever the LJ coefficients are changed for the returned calculator.
  */
  exports.newLJCalculator = function(params, cb) {

    var epsilon,          // parameter; depth of the potential well, in eV
        sigma,            // parameter: characteristic distance from particle, in nm

        rmin,             // distance from particle at which the potential is at its minimum
        alpha_Potential,  // precalculated; units are eV * nm^12
        beta_Potential,   // precalculated; units are eV * nm^6
        alpha_Force,      // units are "MW Force Units" * nm^13
        beta_Force,       // units are "MW Force Units" * nm^7

        initialized = false, // skip callback during initialization

        setCoefficients = function(e, s) {
          // Input units:
          //  epsilon: eV
          //  sigma:   nm

          epsilon = e;
          sigma   = s;
          rmin    = exports.rmin(sigma);

          if (epsilon != null && sigma != null) {
            alpha_Potential = 4 * epsilon * Math.pow(sigma, 12);
            beta_Potential  = 4 * epsilon * Math.pow(sigma, 6);

            // (1 J * nm^12) = (1 N * m * nm^12)
            // (1 N * m * nm^12) * (b nm / m) * (c MWUnits / N) = (abc MWUnits nm^13)
            alpha_Force = 12 * constants.convert(alpha_Potential, { from: unit.EV, to: unit.JOULE }) * NANOMETERS_PER_METER * MW_FORCE_UNITS_PER_NEWTON;
            beta_Force =  6 * constants.convert(beta_Potential,  { from: unit.EV, to: unit.JOULE }) * NANOMETERS_PER_METER * MW_FORCE_UNITS_PER_NEWTON;
          }

          if (initialized && typeof cb === 'function') cb(getCoefficients(), this);
        },

        getCoefficients = function() {
          return {
            epsilon: epsilon,
            sigma  : sigma,
            rmin   : rmin
          };
        },

        validateEpsilon = function(e) {
          if (e == null || parseFloat(e) !== e) {
            throw new Error("lennardJones: epsilon value " + e + " is invalid");
          }
        },

        validateSigma = function(s) {
          if (s == null || parseFloat(s) !== s || s <= 0) {
            throw new Error("lennardJones: sigma value " + s + " is invalid");
          }
        },

        // this object
        calculator;

        // At creation time, there must be a valid epsilon and sigma ... we're not gonna check during
        // inner-loop force calculations!
        validateEpsilon(params.epsilon);
        validateSigma(params.sigma);

        // Initialize coefficients to passed-in values, skipping setCoefficients callback
        setCoefficients(params.epsilon, params.sigma);
        initialized = true;

    return calculator = {

      getCoefficients: getCoefficients,

      setEpsilon: function(e) {
        validateEpsilon(e);
        setCoefficients(e, sigma);
      },

      setSigma: function(s) {
        validateSigma(s);
        setCoefficients(epsilon, s);
      },

      /**
        Input units: r_sq: nm^2
        Output units: eV

        minimum is at r=rmin, V(rmin) = 0
      */
      potentialFromSquaredDistance: function(r_sq) {
        if (!r_sq) return -Infinity;
        return alpha_Potential*Math.pow(r_sq, -6) - beta_Potential*Math.pow(r_sq, -3);
      },

      /**
        Input units: r: nm
        Output units: eV
      */
      potential: function(r) {
        return calculator.potentialFromSquaredDistance(r*r);
      },

      /**
        Input units: r_sq: nm^2
        Output units: MW Force Units / nm (= Dalton / fs^2)
      */
      forceOverDistanceFromSquaredDistance: function(r_sq) {
        // optimizing divisions actually does appear to be *slightly* faster
        var r_minus2nd  = 1 / r_sq,
            r_minus6th  = r_minus2nd * r_minus2nd * r_minus2nd,
            r_minus8th  = r_minus6th * r_minus2nd,
            r_minus14th = r_minus8th * r_minus6th;

        return alpha_Force*r_minus14th - beta_Force*r_minus8th;
      },

      /**
        Input units: r: nm
        Output units: MW Force Units (= Dalton * nm / fs^2)
      */
      force: function(r) {
        return r * calculator.forceOverDistanceFromSquaredDistance(r*r);
      }
    };
  };
});

/*globals define: true */

// Module can be used both in Node.js environment and in Web browser
// using RequireJS. RequireJS Optimizer will strip out this if statement.


define('md2d/models/engine/potentials/index',['require','exports','module','./coulomb','./lennard-jones'],function (require, exports, module) {

  var potentials = exports.potentials = {};

  exports.coulomb = require('./coulomb');
  exports.lennardJones = require('./lennard-jones');
});

/*global define: true */
/*jslint eqnull: true, boss: true, loopfunc: true*/

// Module can be used both in Node.js environment and in Web browser
// using RequireJS. RequireJS Optimizer will strip out this if statement.


define('md2d/models/engine/md2d',['require','exports','module','common/console','arrays','./constants/index','./math/index','./potentials/index','./potentials/index'],function (require, exports, module) {

  require('common/console');
  var arrays       = require('arrays'),
      constants    = require('./constants/index'),
      unit         = constants.unit,
      math         = require('./math/index'),
      coulomb      = require('./potentials/index').coulomb,
      lennardJones = require('./potentials/index').lennardJones,

      // Check for Safari. Typed arrays are faster almost everywhere ... except Safari.
      notSafari = (function() {
        var safarimatch  = / AppleWebKit\/([0123456789.+]+) \(KHTML, like Gecko\) Version\/([0123456789.]+) (Safari)\/([0123456789.]+)/,
            match = navigator.userAgent.match(safarimatch);
        return !match || !match[3];
      }()),

      float32 = (arrays.typed && notSafari) ? 'Float32Array' : 'regular',
      uint16  = (arrays.typed && notSafari) ? 'Uint16Array'  : 'regular',
      uint8   = (arrays.typed && notSafari) ? 'Uint8Array'   : 'regular',

      // make at least 1 atom
      N_MIN = 1,

      // make no more than this many atoms:
      N_MAX = 1000,

      // from A. Rahman "Correlations in the Motion of Atoms in Liquid Argon", Physical Review 136 pp. A405–A411 (1964)
      ARGON_LJ_EPSILON_IN_EV = -120 * constants.BOLTZMANN_CONSTANT.as(unit.EV_PER_KELVIN),
      ARGON_LJ_SIGMA_IN_NM   = 0.34,

      ARGON_MASS_IN_DALTON = 39.95,
      ARGON_MASS_IN_KG = constants.convert(ARGON_MASS_IN_DALTON, { from: unit.DALTON, to: unit.KILOGRAM }),

      BOLTZMANN_CONSTANT_IN_JOULES = constants.BOLTZMANN_CONSTANT.as( unit.JOULES_PER_KELVIN ),

      DEFAULT_VALUES,

      ATOM_PROPERTY_LIST,
      ATOM_INDICES,

      ELEMENT_PROPERTY_LIST,
      ELEMENT_INDICES,

      RADIAL_BOND_PROPERTY_LIST,
      RADIAL_BOND_INDICES,

      ANGULAR_BOND_PROPERTY_LIST,
      ANGULAR_BOND_INDICES,

      OBSTACLE_INDICES,

      VDW_INDICES,

      cross = function(a0, a1, b0, b1) {
        return a0*b1 - a1*b0;
      },

      sumSquare = function(a,b) {
        return a*a + b*b;
      },

      /**
        Convert total kinetic energy in the container of N atoms to a temperature in Kelvin.

        Input units:
          KE: "MW Energy Units" (Dalton * nm^2 / fs^2)
        Output units:
          T: K
      */
      KE_to_T = function(totalKEinMWUnits, N) {
        // In 2 dimensions, kT = (2/N_df) * KE

        var N_df = 2 * N,
            averageKEinMWUnits = (2 / N_df) * totalKEinMWUnits,
            averageKEinJoules = constants.convert(averageKEinMWUnits, { from: unit.MW_ENERGY_UNIT, to: unit.JOULE });

        return averageKEinJoules / BOLTZMANN_CONSTANT_IN_JOULES;
      },

      /**
        Convert a temperature in Kelvin to the total kinetic energy in the container of N atoms.

        Input units:
          T: K
        Output units:
          KE: "MW Energy Units" (Dalton * nm^2 / fs^2)
      */
      T_to_KE = function(T, N) {
        var N_df = 2 * N,
            averageKEinJoules  = T * BOLTZMANN_CONSTANT_IN_JOULES,
            averageKEinMWUnits = constants.convert(averageKEinJoules, { from: unit.JOULE, to: unit.MW_ENERGY_UNIT }),
            totalKEinMWUnits = averageKEinMWUnits * N_df / 2;

        return totalKEinMWUnits;
      },

      validateTemperature = function(t) {
        var temperature = parseFloat(t);

        if (isNaN(temperature)) {
          throw new Error("md2d: requested temperature " + t + " could not be understood.");
        }
        if (temperature < 0) {
          throw new Error("md2d: requested temperature " + temperature + " was less than zero");
        }
        if (temperature === Infinity) {
          throw new Error("md2d: requested temperature was Infinity!");
        }
      };

  // Atoms
  exports.ATOM_PROPERTY_LIST = ATOM_PROPERTY_LIST = [
    "RADIUS",
    "PX",
    "PY",
    "X",
    "Y",
    "VX",
    "VY",
    "SPEED",
    "AX",
    "AY",
    "CHARGE",
    "ELEMENT",
    "PINNED",
    "FRICTION",
    "MASS"
  ];

  exports.ATOM_INDICES = ATOM_INDICES = {};

  (function() {
    for (var i = 0; i < ATOM_PROPERTY_LIST.length; i++) {
      exports.ATOM_INDICES[ ATOM_PROPERTY_LIST[i] ] = i;
    }
  }());

  // Radial Bonds
  exports.RADIAL_BOND_PROPERTY_LIST = RADIAL_BOND_PROPERTY_LIST = [
    "ATOM1",
    "ATOM2",
    "LENGTH",
    "STRENGTH",
    "STYLE"
  ];

  exports.RADIAL_BOND_INDICES = RADIAL_BOND_INDICES = {};

  (function() {
    for (var i = 0; i < RADIAL_BOND_PROPERTY_LIST.length; i++) {
      exports.RADIAL_BOND_INDICES[ RADIAL_BOND_PROPERTY_LIST[i] ] = i;
    }
  }());

  // Angular Bonds
  exports.ANGULAR_BOND_PROPERTY_LIST = ANGULAR_BOND_PROPERTY_LIST = [
    "ATOM1",
    "ATOM2",
    "ATOM3",
    "ANGLE",
    "STRENGTH"
  ];

  exports.ANGULAR_BOND_INDICES = ANGULAR_BOND_INDICES = {};
  (function() {
    for (var i = 0; i < ANGULAR_BOND_PROPERTY_LIST.length; i++) {
      exports.ANGULAR_BOND_INDICES[ ANGULAR_BOND_PROPERTY_LIST[i] ] = i;
    }
  }());

  exports.RADIAL_BOND_STYLES = RADIAL_BOND_STYLES = {
    RADIAL_BOND_STANDARD_STICK_STYLE : 101,
    RADIAL_BOND_LONG_SPRING_STYLE    : 102,
    RADIAL_BOND_SOLID_LINE_STYLE     : 103,
    RADIAL_BOND_GHOST_STYLE          : 104,
    RADIAL_BOND_UNICOLOR_STICK_STYLE : 105,
    RADIAL_BOND_SHORT_SPRING_STYLE   : 106,
    RADIAL_BOND_DOUBLE_BOND_STYLE    : 107,
    RADIAL_BOND_TRIPLE_BOND_STYLE    : 108
  };

  // Elements
  exports.ELEMENT_PROPERTY_LIST = ELEMENT_PROPERTY_LIST = [
    "MASS",
    "EPSILON",
    "SIGMA",
    "RADIUS"
  ];

  exports.ELEMENT_INDICES = ELEMENT_INDICES = {};

  (function() {
    for (var i = 0; i < ELEMENT_PROPERTY_LIST.length; i++) {
      exports.ELEMENT_INDICES[ ELEMENT_PROPERTY_LIST[i] ] = i;
    }
  }());

  // Obstacles
  exports.OBSTACLE_INDICES = OBSTACLE_INDICES = {
    X       :  0,
    Y       :  1,
    WIDTH   :  2,
    HEIGHT  :  3,
    MASS    :  4,
    VX      :  5,
    VY      :  6,
    X_PREV  :  7,
    Y_PREV  :  8,
    COLOR_R :  9,
    COLOR_G :  10,
    COLOR_B :  11,
    VISIBLE :  12
  };

  // VDW pairs
  exports.VDW_INDICES = VDW_INDICES = {
    COUNT : 0,
    ATOM1 : 1,
    ATOM2 : 2
  };

  exports.DEFAULT_VALUES = DEFAULT_VALUES = {
    CHARGE            : 0,
    FRICTION          : 0,
    PINNED            : 0,
    RADIAL_BOND_STYLE : RADIAL_BOND_STYLES.RADIAL_BOND_STANDARD_STICK_STYLE
  };

  exports.createEngine = function() {

    var // the object to be returned
        engine,

        // Whether system dimensions have been set. This is only allowed to happen once.
        sizeHasBeenInitialized = false,

        // Whether "atoms" (particles) have been created & initialized. This is only allowed to happen once.
        atomsHaveBeenCreated = false,

        // Whether "elements" (properties for groups of particles) have been created & initialized. This is only allowed to happen once.
        elementsHaveBeenCreated = false,

        // Whether to simulate Coulomb forces between particles.
        useCoulombInteraction = false,

        // Whether any atoms actually have charges
        hasChargedAtoms = false,

        // Whether to simulate Lennard Jones forces between particles.
        useLennardJonesInteraction = true,

        // Whether to use the thermostat to maintain the system temperature near T_target.
        useThermostat = false,

        // If a numeric value include gravitational field in force calculations,
        // otherwise value should be false
        gravitationalField = false,

        // Whether a transient temperature change is in progress.
        temperatureChangeInProgress = false,

        // Desired system temperature, in Kelvin.
        T_target,

        // Tolerance for (T_actual - T_target) relative to T_target
        tempTolerance = 0.001,

        // System dimensions as [x, y] in nanometers. Default value can be changed until particles are created.
        size = [10, 10],

        // Viscosity of the medium of the model
        viscosity,

        // default integration duration, in femtoseconds.
        integrationDuration = 50,

        // The current model time, in femtoseconds.
        time = 0,

        // The current integration time step, in femtoseconds.
        dt = 1,

        // Square of integration time step, in fs^2.
        dt_sq,

        // The number of molecules in the system.
        N,

        // Total mass of all particles in the system, in Dalton (atomic mass units).
        totalMass,

        // Element properties
        // elements is an array of elements, each one an array of properties
        // For now properties are just defined by index, with no additional lookup for
        // the index (e.g. elements[0][ELEM_MASS_INDEX] for the mass of elem 0). We
        // have few enough properties that we currently don't need this additional lookup.
        // element definition: [ MASS_IN_DALTONS, EPSILON, SIGMA ]
        elements,

        // Individual property arrays for the atoms, indexed by atom number
        radius, px, py, x, y, vx, vy, speed, ax, ay, charge, element, friction, pinned, mass,

        // An array of length ATOM_PROPERTY_LIST.length which contains the above property arrays
        atoms,

        // ####################################################################
        //                      Radial Bonds Properties
        // Individual property arrays for the "radial" bonds, indexed by bond number
        radialBondAtom1Index,
        radialBondAtom2Index,
        radialBondLength,
        radialBondStrength,
        radialBondStyle,

        // count of radial bond properties
        numRadialBondIndices = (function() {
          var n = 0, index;
          for (index in RADIAL_BOND_INDICES) {
            if (RADIAL_BOND_INDICES.hasOwnProperty(index)) n++;
          }
          return n;
        }()),

        // An array of individual radial bond index values and properties.
        radialBondResults,

        // An array of length 5 which contains the above 5 property arrays.
        // Left undefined if no radial bonds are defined.
        radialBonds,

        // radialBondMatrix[i][j] === true when atoms i and j are "radially bonded"
        // radialBondMatrix[i][j] === undefined otherwise
        radialBondMatrix,

        // Number of actual radial bonds (may be smaller than the length of the property arrays).
        N_radialBonds = 0,
        // ####################################################################

        // ####################################################################
        //                      Angular Bonds Properties
        // Individual property arrays for the "angular" bonds, indexed by bond number.
        angularBondAtom1Index,
        angularBondAtom2Index,
        angularBondAtom3Index,
        angularBondAngle,
        angularBondStrength,

        // Count of angular bond properties.
        numAngularBondIndices = (function() {
          var n = 0, index;
          for (index in ANGULAR_BOND_INDICES) {
            if (ANGULAR_BOND_INDICES.hasOwnProperty(index)) n++;
          }
          return n;
        }()),

        // An array of length 5 which contains the above 5 property arrays.
        // Left undefined if no angular bonds are defined.
        angularBonds,

        // Number of actual angular bonds (may be smaller than the length of the property arrays).
        N_angularBonds = 0,
        // ####################################################################

        // Array of arrays containing VdW pairs
        vdwPairs,

        // Number of VdW pairs
        N_vdwPairs,

        // Arrays of VdW pair atom #1 and atom #2 indices
        vdwPairAtom1Index,
        vdwPairAtom2Index,

        // Arrays for spring forces, which are forces defined between an atom and a point in space
        springForceAtomIndex,
        springForceX,
        springForceY,
        springForceStrength,

        springForces,

        N_springForces = 0,

        // Individual properties for the obstacles
        obstacleX,
        obstacleY,
        obstacleWidth,
        obstacleHeight,
        obstacleVX,
        obstacleVY,
        obstacleMass,
        obstacleXPrev,
        obstacleYPrev,
        obstacleColorR,
        obstacleColorG,
        obstacleColorB,
        obstacleVisible,

        // An array of length 12 which contains obstacles information
        obstacles,

        // Number of actual obstacles
        N_obstacles = 0,

        // The location of the center of mass, in nanometers.
        x_CM, y_CM,

        // Linear momentum of the system, in Dalton * nm / fs.
        px_CM, py_CM,

        // Velocity of the center of mass, in nm / fs.
        vx_CM, vy_CM,

        // Angular momentum of the system wrt its center of mass
        L_CM,

        // (Instantaneous) moment of inertia of the system wrt its center of mass
        I_CM,

        // Angular velocity of the system about the center of mass, in radians / fs.
        // (= angular momentum about CM / instantaneous moment of inertia about CM)
        omega_CM,

        // instantaneous system temperature, in Kelvin
        T,

        // The following are the pairwise values for elements i and j, indexed
        // like [i][j]
        epsilon = [],
        sigma = [],

        // cutoff for force calculations, as a factor of sigma
        cutoff = 5.0,
        cutoffDistance_LJ_sq = [],

        // Each object at ljCalculator[i,j] can calculate the magnitude of the Lennard-Jones force and
        // potential between elements i and j
        ljCalculator = [],

        // Throws an informative error if a developer tries to use the setCoefficients method of an
        // in-use LJ calculator. (Hint: for an interactive LJ chart, create a new LJ calculator with
        // the desired coefficients; call setElementProperties to change the LJ properties in use.)
        ljCoefficientChangeError = function() {
          throw new Error("md2d: Don't change the epsilon or sigma parameters of the LJ calculator being used by MD2D. Use the setElementProperties method instead.");
        },

        // Initialize epsilon, sigma, cutoffDistance_LJ_sq, and ljCalculator array elements for
        // element pair i and j
        setPairwiseLJProperties = function(i, j) {
          var epsilon_i = elements[i][ELEMENT_INDICES.EPSILON],
              epsilon_j = elements[j][ELEMENT_INDICES.EPSILON],
              sigma_i   = elements[i][ELEMENT_INDICES.SIGMA],
              sigma_j   = elements[j][ELEMENT_INDICES.SIGMA],
              e,
              s;

          e = epsilon[i][j] = epsilon[j][i] = lennardJones.pairwiseEpsilon(epsilon_i, epsilon_j);
          s = sigma[i][j]   = sigma[j][i]   = lennardJones.pairwiseSigma(sigma_i, sigma_j);

          cutoffDistance_LJ_sq[i][j] = cutoffDistance_LJ_sq[j][i] = (cutoff * s) * (cutoff * s);

          ljCalculator[i][j] = ljCalculator[j][i] = lennardJones.newLJCalculator({
            epsilon: e,
            sigma:   s
          }, ljCoefficientChangeError);
        },

        /**
          Extend all arrays in `arrayList` to `newLength`. Here, arrayList is expected to be `atoms`
          `elements`, `radialBonds`, etc.
        */
        extendArrays = function(arrayList, newLength) {
          for (var i = 0, len = arrayList.length; i < len; i++) {
            arrayList[i] = arrays.extend(arrayList[i], newLength);
          }
        },

        /**
          Set up "shortcut" references, e.g., x = atoms[ATOM_INDICES.X]
        */
        assignShortcutReferences = {

          atoms: function() {
            radius    = engine.radius      = atoms[ATOM_INDICES.RADIUS];
            px        = engine.px          = atoms[ATOM_INDICES.PX];
            py        = engine.py          = atoms[ATOM_INDICES.PY];
            x         = engine.x           = atoms[ATOM_INDICES.X];
            y         = engine.y           = atoms[ATOM_INDICES.Y];
            vx        = engine.vx          = atoms[ATOM_INDICES.VX];
            vy        = engine.vy          = atoms[ATOM_INDICES.VY];
            speed     = engine.speed       = atoms[ATOM_INDICES.SPEED];
            ax        = engine.ax          = atoms[ATOM_INDICES.AX];
            ay        = engine.ay          = atoms[ATOM_INDICES.AY];
            charge    = engine.charge      = atoms[ATOM_INDICES.CHARGE];
            friction  = engine.friction    = atoms[ATOM_INDICES.FRICTION];
            element   = engine.element     = atoms[ATOM_INDICES.ELEMENT];
            pinned    = engine.pinned      = atoms[ATOM_INDICES.PINNED];
            mass      = engine.mass        = atoms[ATOM_INDICES.MASS];
          },

          radialBonds: function() {
            radialBondAtom1Index  = radialBonds[RADIAL_BOND_INDICES.ATOM1];
            radialBondAtom2Index  = radialBonds[RADIAL_BOND_INDICES.ATOM2];
            radialBondLength      = radialBonds[RADIAL_BOND_INDICES.LENGTH];
            radialBondStrength    = radialBonds[RADIAL_BOND_INDICES.STRENGTH];
            radialBondStyle       = radialBonds[RADIAL_BOND_INDICES.STYLE];
          },

          angularBonds: function() {
            angularBondAtom1Index = angularBonds[ANGULAR_BOND_INDICES.ATOM1];
            angularBondAtom2Index = angularBonds[ANGULAR_BOND_INDICES.ATOM2];
            angularBondAtom3Index = angularBonds[ANGULAR_BOND_INDICES.ATOM3];
            angularBondAngle      = angularBonds[ANGULAR_BOND_INDICES.ANGLE];
            angularBondStrength   = angularBonds[ANGULAR_BOND_INDICES.STRENGTH];
          },

          springForces: function() {
            springForceAtomIndex = springForces[0];
            springForceX         = springForces[1];
            springForceY         = springForces[2];
            springForceStrength  = springForces[3];
          }

        },

        createRadialBondsArray = function(num) {
          var i;

          radialBonds = engine.radialBonds = [];

          radialBonds[RADIAL_BOND_INDICES.ATOM1]    = arrays.create(num, 0, uint16);
          radialBonds[RADIAL_BOND_INDICES.ATOM2]    = arrays.create(num, 0, uint16);
          radialBonds[RADIAL_BOND_INDICES.LENGTH]   = arrays.create(num, 0, float32);
          radialBonds[RADIAL_BOND_INDICES.STRENGTH] = arrays.create(num, 0, float32);
          radialBonds[RADIAL_BOND_INDICES.STYLE]    = arrays.create(num, 0, uint8);

          assignShortcutReferences.radialBonds();
          /**
            Initialize radialBondResults[] arrays consisting of arrays of radial bond
            index numbers and space to later contain transposed radial bond properties
          */
          radialBondResults = engine.radialBondResults = [];
          for (i = 0; i < num; i++) {
            radialBondResults[i] = arrays.create(numRadialBondIndices+5,  0, float32);
            radialBondResults[i][0] = i;
          }
        },

        createAngularBondsArray = function(num) {
          var i;

          angularBonds = engine.angularBonds = [];

          angularBonds[ANGULAR_BOND_INDICES.ATOM1]    = arrays.create(num, 0, uint16);
          angularBonds[ANGULAR_BOND_INDICES.ATOM2]    = arrays.create(num, 0, uint16);
          angularBonds[ANGULAR_BOND_INDICES.ATOM3]    = arrays.create(num, 0, uint16);
          angularBonds[ANGULAR_BOND_INDICES.ANGLE]    = arrays.create(num, 0, float32);
          angularBonds[ANGULAR_BOND_INDICES.STRENGTH] = arrays.create(num, 0, float32);

          assignShortcutReferences.angularBonds();
        },

        createSpringForcesArray = function(num) {
          springForces = engine.springForces = [];

          springForces[0] = arrays.create(num, 0, uint16);
          springForces[1] = arrays.create(num, 0, float32);
          springForces[2] = arrays.create(num, 0, float32);
          springForces[3] = arrays.create(num, 0, float32);

          assignShortcutReferences.springForces();
        },

        createObstaclesArray = function(num) {
          var ind = OBSTACLE_INDICES;

          obstacles = engine.obstacles = [];

          obstacles[ind.X]        = obstacleX      = arrays.create(num, 0, float32);
          obstacles[ind.Y]        = obstacleY      = arrays.create(num, 0, float32);
          obstacles[ind.WIDTH]    = obstacleWidth  = arrays.create(num, 0, float32);
          obstacles[ind.HEIGHT]   = obstacleHeight = arrays.create(num, 0, float32);
          obstacles[ind.MASS]     = obstacleMass   = arrays.create(num, 0, float32);
          obstacles[ind.VX]       = obstacleVX     = arrays.create(num, 0, float32);
          obstacles[ind.VY]       = obstacleVY     = arrays.create(num, 0, float32);
          obstacles[ind.X_PREV]   = obstacleXPrev  = arrays.create(num, 0, float32);
          obstacles[ind.Y_PREV]   = obstacleYPrev  = arrays.create(num, 0, float32);
          obstacles[ind.COLOR_R]  = obstacleColorR = arrays.create(num, 0, float32);
          obstacles[ind.COLOR_G]  = obstacleColorG = arrays.create(num, 0, float32);
          obstacles[ind.COLOR_B]  = obstacleColorB = arrays.create(num, 0, float32);
          obstacles[ind.VISIBLE]  = obstacleVisible = arrays.create(num, 0, uint8);
        },

        // Function that accepts a value T and returns an average of the last n values of T (for some n).
        T_windowed,

        // Dynamically determine an appropriate window size for use when measuring a windowed average of the temperature.
        getWindowSize = function() {
          return useCoulombInteraction && hasChargedAtoms ? 1000 : 1000;
        },

        // Whether or not the thermostat is not being used, begins transiently adjusting the system temperature; this
        // causes the adjustTemperature portion of the integration loop to rescale velocities until a windowed average of
        // the temperature comes within `tempTolerance` of `T_target`.
        beginTransientTemperatureChange = function()  {
          temperatureChangeInProgress = true;
          T_windowed = math.getWindowedAverager( getWindowSize() );
        },

        // Calculates & returns instantaneous temperature of the system.
        computeTemperature = function() {
          var twoKE = 0,
              i;

          // Particles.
          for (i = 0; i < N; i++) {
            twoKE += mass[i] * (vx[i] * vx[i] + vy[i] * vy[i]);
          }
          // Obstacles.
          for (i = 0; i < N_obstacles; i++) {
            if (obstacleMass[i] !== Infinity) {
              twoKE += obstacleMass[i] *
                  (obstacleVX[i] * obstacleVX[i] + obstacleVY[i] * obstacleVY[i]);
            }
          }

          return KE_to_T( twoKE/2, N );
        },

        // Scales the velocity vector of particle i by `factor`.
        scaleParticleVelocity = function(i, factor) {
          vx[i] *= factor;
          vy[i] *= factor;

          // scale momentum too
          px[i] *= factor;
          py[i] *= factor;
        },

        // Scales the velocity vector of obstacle i by `factor`.
        scaleObstacleVelocity = function(i, factor) {
          obstacleVX[i] *= factor;
          obstacleVY[i] *= factor;
          // Obstacles don't store momentum, nothing else to update.
        },

        // Adds the velocity vector (vx_t, vy_t) to the velocity vector of particle i
        addVelocity = function(i, vx_t, vy_t) {
          vx[i] += vx_t;
          vy[i] += vy_t;

          px[i] = vx[i]*mass[i];
          py[i] = vy[i]*mass[i];
        },

        // Adds effect of angular velocity omega, relative to (x_CM, y_CM), to the velocity vector of particle i
        addAngularVelocity = function(i, omega) {
          vx[i] -= omega * (y[i] - y_CM);
          vy[i] += omega * (x[i] - x_CM);

          px[i] = vx[i]*mass[i];
          py[i] = vy[i]*mass[i];
        },

        // Subtracts the center-of-mass linear velocity and the system angular velocity from the velocity vectors
        removeTranslationAndRotationFromVelocities = function() {
          for (var i = 0; i < N; i++) {
            addVelocity(i, -vx_CM, -vy_CM);
            addAngularVelocity(i, -omega_CM);
          }
        },

        // currently unused, implementation saved here for future reference:

        // // Adds the center-of-mass linear velocity and the system angular velocity back into the velocity vectors
        // addTranslationAndRotationToVelocities = function() {
        //   for (var i = 0; i < N; i++) {
        //     addVelocity(i, vx_CM, vy_CM);
        //     addAngularVelocity(i, omega_CM);
        //   }
        // },

        // Subroutine that calculates the position and velocity of the center of mass, leaving these in x_CM, y_CM,
        // vx_CM, and vy_CM, and that then computes the system angular velocity around the center of mass, leaving it
        // in omega_CM.
        computeSystemTranslation = function() {
          var x_sum = 0,
              y_sum = 0,
              px_sum = 0,
              py_sum = 0,
              i;

          for (i = 0; i < N; i++) {
            x_sum += x[i];
            y_sum += y[i];
            px_sum += px[i];
            py_sum += py[i];
          }

          x_CM = x_sum / N;
          y_CM = y_sum / N;
          px_CM = px_sum;
          py_CM = py_sum;
          vx_CM = px_sum / totalMass;
          vy_CM = py_sum / totalMass;
        },

        // Subroutine that calculates the angular momentum and moment of inertia around the center of mass, and then
        // uses these to calculate the weighted angular velocity around the center of mass.
        // Updates I_CM, L_CM, and omega_CM.
        // Requires x_CM, y_CM, vx_CM, vy_CM to have been calculated.
        computeSystemRotation = function() {
          var L = 0,
              I = 0,
              m,
              i;

          for (i = 0; i < N; i++) {
            m = mass[i];
            // L_CM = sum over N of of mr_i x p_i (where r_i and p_i are position & momentum vectors relative to the CM)
            L += m * cross( x[i]-x_CM, y[i]-y_CM, vx[i]-vx_CM, vy[i]-vy_CM);
            I += m * sumSquare( x[i]-x_CM, y[i]-y_CM );
          }

          L_CM = L;
          I_CM = I;
          omega_CM = L_CM / I_CM;
        },

        computeCMMotion = function() {
          computeSystemTranslation();
          computeSystemRotation();
        },

        // Calculate x(t+dt, i) from v(t) and a(t)
        updatePosition = function(i) {
          x[i] += vx[i]*dt + 0.5*ax[i]*dt_sq;
          y[i] += vy[i]*dt + 0.5*ay[i]*dt_sq;
        },

        updateObstaclePosition = function(i) {
          var ob_vx = obstacleVX[i],
              ob_vy = obstacleVY[i];
          if (ob_vx || ob_vy) {
            obstacleXPrev[i] = obstacleX[i];
            obstacleYPrev[i] = obstacleY[i];
            obstacleX[i] += ob_vx*dt;
            obstacleY[i] += ob_vy*dt;
          }
        },

        // Constrain particle i to the area between the walls by simulating perfectly elastic collisions with the walls.
        // Note this may change the linear and angular momentum.
        bounceOffWalls = function(i) {
          var r = radius[i],
              leftwall = r,
              bottomwall = r,
              width = size[0],
              height = size[1],
              rightwall = width - r,
              topwall = height - r;

          // Bounce off vertical walls.
          if (x[i] < leftwall) {
            while (x[i] < leftwall - width) {
              x[i] += width;
            }
            x[i]  = leftwall + (leftwall - x[i]);
            vx[i] *= -1;
            px[i] *= -1;
          } else if (x[i] > rightwall) {
            while (x[i] > rightwall + width) {
              x[i] -= width;
            }
            x[i]  = rightwall - (x[i] - rightwall);
            vx[i] *= -1;
            px[i] *= -1;
          }

          // Bounce off horizontal walls
          if (y[i] < bottomwall) {
            while (y[i] < bottomwall - height) {
              y[i] += height;
            }
            y[i]  = bottomwall + (bottomwall - y[i]);
            vy[i] *= -1;
            py[i] *= -1;
          } else if (y[i] > topwall) {
            while (y[i] > topwall + width) {
              y[i] -= width;
            }
            y[i]  = topwall - (y[i] - topwall);
            vy[i] *= -1;
            py[i] *= -1;
          }
        },

        bounceOffObstacles = function(i, x_prev, y_prev) {
          // fast path if no obstacles
          if (N_obstacles < 1) return;

          var r,
              xi,
              yi,

              j,

              x_left,
              x_right,
              y_top,
              y_bottom,
              x_left_prev,
              x_right_prev,
              y_top_prev,
              y_bottom_prev,
              vxPrev,
              vyPrev,
              obs_vxPrev,
              obs_vyPrev,
              atom_mass,
              obs_mass,
              totalMass,
              bounceDirection = 0; // if we bounce horz: 1, vert: -1

          r = radius[i];
          xi = x[i];
          yi = y[i];

          for (j = 0; j < N_obstacles; j++) {

            x_left = obstacleX[j] - r;
            x_right = obstacleX[j] + obstacleWidth[j] + r;
            y_top = obstacleY[j] + obstacleHeight[j] + r;
            y_bottom = obstacleY[j] - r;

            x_left_prev = obstacleXPrev[j] - r;
            x_right_prev = obstacleXPrev[j] + obstacleWidth[j] + r;
            y_top_prev = obstacleYPrev[j] + obstacleHeight[j] + r;
            y_bottom_prev = obstacleYPrev[j] - r;


            if (xi > x_left && xi < x_right && yi > y_bottom && yi < y_top) {
              if (x_prev <= x_left_prev) {
                x[i] = x_left - (xi - x_left);
                bounceDirection = 1;
              } else if (x_prev >= x_right_prev) {
                x[i] = x_right + (x_right - xi);
                bounceDirection = 1;
              } else if (y_prev <= y_top_prev) {
                y[i] = y_bottom - (yi - y_bottom);
                bounceDirection = -1;
              } else if (y_prev >= y_bottom_prev) {
                y[i] = y_top  + (y_top - yi);
                bounceDirection = -1;
              }
            }

            obs_mass = obstacleMass[j];

            if (bounceDirection) {
              if (obs_mass !== Infinity) {
                // if we have real mass, perform a perfectly-elastic collision
                atom_mass = mass[i];
                totalMass = obs_mass + atom_mass;
                if (bounceDirection === 1) {
                  vxPrev = vx[i];
                  obs_vxPrev = obstacleVX[j];

                  vx[i] = (vxPrev * (atom_mass - obs_mass) + (2 * obs_mass * obs_vxPrev)) / totalMass;
                  obstacleVX[j] = (obs_vxPrev * (obs_mass - atom_mass) + (2 * px[i])) / totalMass;
                } else {
                  vyPrev = vy[i];
                  obs_vyPrev = obstacleVY[j];

                  vy[i] = (vyPrev * (atom_mass - obs_mass) + (2 * obs_mass * obs_vyPrev)) / totalMass;
                  obstacleVY[j] = (obs_vyPrev * (obs_mass - atom_mass) + (2 * py[i])) / totalMass;
                }
              } else {
                // if we have infinite mass, just reflect (like a wall)
                if (bounceDirection === 1) {
                  vx[i] *= -1;
                } else {
                  vy[i] *= -1;
                }
              }
            }
          }
        },


        // Half of the update of v(t+dt, i) and p(t+dt, i) using a; during a single integration loop,
        // call once when a = a(t) and once when a = a(t+dt)
        halfUpdateVelocity = function(i) {
          var m = mass[i];
          vx[i] += 0.5*ax[i]*dt;
          px[i] = m * vx[i];
          vy[i] += 0.5*ay[i]*dt;
          py[i] = m * vy[i];
        },

        // Removes velocity and acceleration from atom i
        pinAtom = function(i) {
          vx[i] = vy[i] = ax[i] = ay[i] = 0;
        },

        // Accumulate forces into a(t+dt, i) and a(t+dt, j) for all pairwise interactions between
        // particles i and j where j < i. Note that data from the previous time step should be cleared
        // from arrays ax and ay before calling this function.
        updatePairwiseForces = function(i) {
          var j, dx, dy, r_sq, f_over_r, fx, fy,
              el_i = element[i],
              el_j,
              q_i = charge[i],
              bondingPartners = radialBondMatrix && radialBondMatrix[i];

          for (j = 0; j < i; j++) {
            if (bondingPartners && bondingPartners[j]) continue;

            el_j = element[j];

            dx = x[j] - x[i];
            dy = y[j] - y[i];
            r_sq = dx*dx + dy*dy;

            f_over_r = 0;

            if (useLennardJonesInteraction && r_sq < cutoffDistance_LJ_sq[el_i][el_j]) {
              f_over_r += ljCalculator[el_i][el_j].forceOverDistanceFromSquaredDistance(r_sq);
            }

            if (useCoulombInteraction && hasChargedAtoms) {
              f_over_r += coulomb.forceOverDistanceFromSquaredDistance(r_sq, q_i, charge[j]);
            }

            if (f_over_r) {
              fx = f_over_r * dx;
              fy = f_over_r * dy;
              ax[i] += fx;
              ay[i] += fy;
              ax[j] -= fx;
              ay[j] -= fy;
            }
          }
        },

        updateGravitationalAccelerations = function() {
          // fast path if there is no gravitationalField
          if (!gravitationalField) return;
          var i;

          for (i = 0; i < N; i++) {
            ay[i] -= gravitationalField;
          }
        },

        updateFrictionForces = function() {
          if (!viscosity) return;

          var i,
              drag;

          for (i = 0; i < N; i++) {
            drag = viscosity * friction[i];

            ax[i] += (-vx[i] * drag);
            ay[i] += (-vy[i] * drag);
          }
        },

        updateRadialBondForces = function() {
          // fast path if no radial bonds have been defined
          if (N_radialBonds < 1) return;

          var i,
              len,
              i1,
              i2,
              dx,
              dy,
              r_sq,
              r,
              k,
              r0,
              f_over_r,
              fx,
              fy;

          for (i = 0, len = radialBonds[0].length; i < len; i++) {
            i1 = radialBondAtom1Index[i];
            i2 = radialBondAtom2Index[i];

            dx = x[i2] - x[i1];
            dy = y[i2] - y[i1];
            r_sq = dx*dx + dy*dy;
            r = Math.sqrt(r_sq);

            // eV/nm^2
            k = radialBondStrength[i];

            // nm
            r0 = radialBondLength[i];

            // "natural" Next Gen MW force units / nm
            f_over_r = constants.convert(k*(r-r0), { from: unit.EV_PER_NM, to: unit.MW_FORCE_UNIT }) / r;

            fx = f_over_r * dx;
            fy = f_over_r * dy;

            ax[i1] += fx;
            ay[i1] += fy;
            ax[i2] -= fx;
            ay[i2] -= fy;
          }
        },

        updateAngularBondForces = function() {
          // Fast path if no angular bonds have been defined.
          if (N_angularBonds < 1) return;

          var i, len,
              i1, i2, i3,
              dxij, dyij, dxkj, dykj, rijSquared, rkjSquared, rij, rkj,
              k, angle, theta, cosTheta, sinTheta,
              forceInXForI, forceInYForI, forceInXForK, forceInYForK,
              commonPrefactor, temp;

          for (i = 0, len = angularBonds[0].length; i < len; i++) {
            i1 = angularBondAtom1Index[i];
            i2 = angularBondAtom2Index[i];
            i3 = angularBondAtom3Index[i];

            // radian
            angle = angularBondAngle[i];

            // eV/radian^2
            k = angularBondStrength[i];

            // Calculate angle (theta) between two vectors:
            // Atom1-Atom3 and Atom2-Atom3
            // Atom1 -> i, Atom2 -> k, Atom3 -> j
            dxij = x[i1] - x[i3];
            dxkj = x[i2] - x[i3];
            dyij = y[i1] - y[i3];
            dykj = y[i2] - y[i3];
            rijSquared = dxij * dxij + dyij * dyij;
            rkjSquared = dxkj * dxkj + dykj * dykj;
            rij = Math.sqrt(rijSquared);
            rkj = Math.sqrt(rkjSquared);
            // Calculate cos using dot product definition.
            cosTheta = (dxij * dxkj + dyij * dykj) / (rij * rkj);
            if (cosTheta > 1.0) cosTheta = 1.0;
            else if (cosTheta < -1.0) cosTheta = -1.0;
            // Pythagorean trigonometric identity.
            sinTheta = Math.sqrt(1.0 - cosTheta * cosTheta);
            // Finally:
            theta = Math.acos(cosTheta);

            if (sinTheta < 0.0001) sinTheta = 0.0001;

            // Calculate force.
            // "natural" Next Gen MW force units / nm
            commonPrefactor = constants.convert(k * (theta - angle) / (sinTheta * rij),
                { from: unit.EV_PER_NM, to: unit.MW_FORCE_UNIT }) / rkj;

            // nm^2
            temp = dxij * dxkj + dyij * dykj;
            // Terms in brackets end up with nm unit.
            // commonPrefactor is in "natural" Next Gen MW force units / nm,
            // so everything is correct.
            forceInXForI = commonPrefactor * (dxkj - temp * dxij / rijSquared);
            forceInYForI = commonPrefactor * (dykj - temp * dyij / rijSquared);
            forceInXForK = commonPrefactor * (dxij - temp * dxkj / rkjSquared);
            forceInYForK = commonPrefactor * (dyij - temp * dykj / rkjSquared);

            ax[i1] += forceInXForI;
            ay[i1] += forceInYForI;
            ax[i2] += forceInXForK;
            ay[i2] += forceInYForK;
            ax[i3] -= (forceInXForI + forceInXForK);
            ay[i3] -= (forceInYForI + forceInYForK);
          }
        },

        updateSpringForces = function() {
          if (N_springForces < 1) return;

          var i,
              dx, dy,
              r, r_sq,
              k,
              f_over_r,
              fx, fy,
              a;

          for (i = 0; i < N_springForces; i++) {
            a = springForceAtomIndex[i];

            dx = springForceX[i] - x[a];
            dy = springForceY[i] - y[a];

            if (dx === 0 && dy === 0) continue;   // force will be zero

            r_sq = dx*dx + dy*dy;
            r = Math.sqrt(r_sq);

            // eV/nm^2
            k = springForceStrength[i];

            f_over_r = constants.convert(k*r, { from: unit.EV_PER_NM, to: unit.MW_FORCE_UNIT }) / r;

            fx = f_over_r * dx;
            fy = f_over_r * dy;

            ax[a] += fx;
            ay[a] += fy;
          }
        },

        adjustTemperature = function(target, forceAdjustment) {
          var rescalingFactor,
              i;

          if (target == null) target = T_target;

          T = computeTemperature();

          if (temperatureChangeInProgress && Math.abs(T_windowed(T) - target) <= target * tempTolerance) {
            temperatureChangeInProgress = false;
          }

          if (forceAdjustment || useThermostat || temperatureChangeInProgress && T > 0) {
            rescalingFactor = Math.sqrt(target / T);
            // Scale particles velocity.
            for (i = 0; i < N; i++) {
              scaleParticleVelocity(i, rescalingFactor);
            }
            // Scale obstacles velocity.
            for (i = 0; i < N_obstacles; i++) {
              scaleObstacleVelocity(i, rescalingFactor);
            }
            T = target;
          }
        };


    return engine = {

      useCoulombInteraction: function(v) {
        useCoulombInteraction = !!v;
      },

      useLennardJonesInteraction: function(v) {
        useLennardJonesInteraction = !!v;
      },

      useThermostat: function(v) {
        useThermostat = !!v;
      },

      setGravitationalField: function(gf) {
        if (typeof gf === "number" && gf !== 0) {
          gravitationalField = gf;
        } else {
          gravitationalField = false;
        }
      },

      setIntegrationDuration: function(duration) {
        if (typeof duration === "number" && duration >= 0) {
          integrationDuration = duration;
        } else {
          throw new Error("The integrationDuration must be a number greater than or equal to 1");
        }
      },

      setTimeStep: function(ts) {
        if (typeof ts === "number" && ts >= 0) {
          dt = ts;
        } else {
          throw new Error("The timeStep must be a time in fs greater than 0");
        }
      },

      setTargetTemperature: function(v) {
        validateTemperature(v);
        T_target = v;
      },

      // Our timekeeping is really a convenience for users of this lib, so let them reset time at will
      setTime: function(t) {
        time = t;
      },

      setSize: function(v) {
        // NB. We may want to create a simple state diagram for the md engine (as well as for the 'modeler' defined in
        // lab.molecules.js)
        if (sizeHasBeenInitialized) {
          throw new Error("The molecular model's size has already been set, and cannot be reset.");
        }
        var width  = (v[0] && v[0] > 0) ? v[0] : 10,
            height = (v[1] && v[1] > 0) ? v[1] : 10;
        size = [width, height];
      },

      getSize: function() {
        return [size[0], size[1]];
      },

      getLJCalculator: function() {
        return ljCalculator;
      },

      /*
        Expects an array of element properties such as
        [
          [ mass_of_elem_0 ],
          [ mass_of_elem_1 ]
        ]
      */
      setElements: function(elems) {
        var i, j;

        if (atomsHaveBeenCreated) {
          throw new Error("md2d: setElements cannot be called after atoms have been created");
        }
        elements = elems;

        for (i = 0; i < elements.length; i++) {
          epsilon[i] = [];
          sigma[i] = [];
          ljCalculator[i] = [];
          cutoffDistance_LJ_sq[i] = [];
        }

        for (i = 0; i < elements.length; i++) {
          // the radius is derived from sigma
          elements[i][ELEMENT_INDICES.RADIUS] = lennardJones.radius( elements[i][ELEMENT_INDICES.SIGMA] );

          for (j = i; j < elements.length; j++) {
            setPairwiseLJProperties(i,j);
          }
        }
        elementsHaveBeenCreated = true;
        engine.elements = elements;
      },

      setElementProperties: function(i, properties) {
        var j, newRadius;


        // FIXME we cached mass into its own array, which is now probably unnecessary (position-update
        // calculations have since been speeded up by batching the computation of accelerations from
        // forces.) If we remove the mass[] array we also remove the need for the loop below:

        if (properties.mass != null && properties.mass !== elements[i][ELEMENT_INDICES.MASS]) {
          elements[i][ELEMENT_INDICES.MASS] = properties.mass;
          for (j = 0; j < N; j++) {
            if (element[j] === i) mass[j] = properties.mass;
          }
        }

        if (properties.sigma != null) {
          elements[i][ELEMENT_INDICES.SIGMA] = properties.sigma;
          newRadius = lennardJones.radius(properties.sigma);

          if (elements[i][ELEMENT_INDICES.RADIUS] !== newRadius) {
            elements[i][ELEMENT_INDICES.RADIUS] = newRadius;
            for (j = 0; j < N; j++) {
              if (element[j] === i) radius[j] = newRadius;
            }
          }
        }

        if (properties.epsilon != null) elements[i][ELEMENT_INDICES.EPSILON] = properties.epsilon;

        for (j = 0; j < elements.length; j++) {
          setPairwiseLJProperties(i, j);
        }
      },

      /**
        Allocates 'atoms' array of arrays, sets number of atoms.

        options:
          num: the number of atoms to create
      */
      createAtoms: function(options) {
        var num;

        if (!elementsHaveBeenCreated) {
          throw new Error("md2d: createAtoms was called before setElements.");
        }

        if (atomsHaveBeenCreated) {
          throw new Error("md2d: createAtoms was called even though the particles have already been created for this model instance.");
        }
        atomsHaveBeenCreated = true;
        sizeHasBeenInitialized = true;

        if (typeof options === 'undefined') {
          throw new Error("md2d: createAtoms was called without options specifying the atoms to create.");
        }

        //  number of atoms
        num = options.num;

        if (typeof num === 'undefined') {
          throw new Error("md2d: createAtoms was called without the required 'num' option specifying the number of atoms to create.");
        }
        if (num !== Math.floor(num)) {
          throw new Error("md2d: createAtoms was passed a non-integral 'num' option.");
        }
        if (num < N_MIN) {
          throw new Error("md2d: create Atoms was passed an 'num' option equal to: " + num + " which is less than the minimum allowable value: N_MIN = " + N_MIN + ".");
        }
        if (num > N_MAX) {
          throw new Error("md2d: create Atoms was passed an 'N' option equal to: " + num + " which is greater than the minimum allowable value: N_MAX = " + N_MAX + ".");
        }

        atoms  = engine.atoms  = arrays.create(ATOM_PROPERTY_LIST.length, null, 'regular');

        // TODO. DRY this up by letting the property list say what type each array is
        atoms[ATOM_INDICES.RADIUS]    = arrays.create(num, 0, float32);
        atoms[ATOM_INDICES.PX]        = arrays.create(num, 0, float32);
        atoms[ATOM_INDICES.PY]        = arrays.create(num, 0, float32);
        atoms[ATOM_INDICES.X]         = arrays.create(num, 0, float32);
        atoms[ATOM_INDICES.Y]         = arrays.create(num, 0, float32);
        atoms[ATOM_INDICES.VX]        = arrays.create(num, 0, float32);
        atoms[ATOM_INDICES.VY]        = arrays.create(num, 0, float32);
        atoms[ATOM_INDICES.SPEED]     = arrays.create(num, 0, float32);
        atoms[ATOM_INDICES.AX]        = arrays.create(num, 0, float32);
        atoms[ATOM_INDICES.AY]        = arrays.create(num, 0, float32);
        atoms[ATOM_INDICES.CHARGE]    = arrays.create(num, 0, float32);
        atoms[ATOM_INDICES.FRICTION]  = arrays.create(num, 0, float32);
        atoms[ATOM_INDICES.ELEMENT]   = arrays.create(num, 0, uint8);
        atoms[ATOM_INDICES.PINNED]    = arrays.create(num, 0, uint8);
        atoms[ATOM_INDICES.MASS]      = arrays.create(num, 0, float32);

        assignShortcutReferences.atoms();

        N = 0;
        totalMass = 0;
      },

      /**
        The canonical method for adding an atom to the collections of atoms.

        If there isn't enough room in the 'atoms' array, it (somewhat inefficiently)
        extends the length of the typed arrays by ten to have room for more atoms.

        @returns the index of the new atom
      */
      addAtom: function(atom_element, atom_x, atom_y, atom_vx, atom_vy, atom_charge, atom_friction, atom_pinned) {
        var el, atom_mass;

        if (N + 1 > atoms[0].length) {
          extendArrays(atoms, N + 10);
          assignShortcutReferences.atoms();
        }

        // Allow these values to be optional, and use the default if not defined:

        if (atom_charge == null)   atom_charge   = DEFAULT_VALUES.CHARGE;
        if (atom_friction == null) atom_friction = DEFAULT_VALUES.FRICTION;
        if (atom_pinned == null )  atom_pinned   = DEFAULT_VALUES.PINNED;

        el = elements[atom_element];
        atom_mass = el[ELEMENT_INDICES.MASS];

        element[N]   = atom_element;
        radius[N]    = elements[atom_element][ELEMENT_INDICES.RADIUS];
        x[N]         = atom_x;
        y[N]         = atom_y;
        vx[N]        = atom_vx;
        vy[N]        = atom_vy;
        px[N]        = atom_vx * atom_mass;
        py[N]        = atom_vy * atom_mass;
        ax[N]        = 0;
        ay[N]        = 0;
        speed[N]     = Math.sqrt(atom_vx*atom_vx + atom_vy*atom_vy);
        charge[N]    = atom_charge;
        friction[N]  = atom_friction;
        pinned[N]    = atom_pinned;
        mass[N]      = atom_mass;

        if (atom_charge) hasChargedAtoms = true;

        totalMass += atom_mass;

        return N++;
      },

      /**
        The canonical method for adding a radial bond to the collection of radial bonds.

        If there isn't enough room in the 'radialBonds' array, it (somewhat inefficiently)
        extends the length of the typed arrays by one to contain one more atom with listed properties.
      */
      addRadialBond: function(atom1Index, atom2Index, bondLength, bondStrength, bondStyle) {
        if (bondStyle == null )  bondStyle   = DEFAULT_VALUES.RADIAL_BOND_STYLE;
        if (N_radialBonds + 1 > radialBonds[0].length) {
          extendArrays(radialBonds, N_radialBonds + 10);
          assignShortcutReferences.radialBonds();
        }

        radialBondResults[N_radialBonds][1] = radialBondAtom1Index[N_radialBonds] = atom1Index;
        radialBondResults[N_radialBonds][2] = radialBondAtom2Index[N_radialBonds] = atom2Index;
        radialBondResults[N_radialBonds][3] = radialBondLength[N_radialBonds]     = bondLength;
        radialBondResults[N_radialBonds][4] = radialBondStrength[N_radialBonds]   = bondStrength;
        radialBondResults[N_radialBonds][5] = radialBondStyle[N_radialBonds]      = bondStyle;

        if ( ! radialBondMatrix[atom1Index] ) radialBondMatrix[atom1Index] = [];
        radialBondMatrix[atom1Index][atom2Index] = true;

        if ( ! radialBondMatrix[atom2Index] ) radialBondMatrix[atom2Index] = [];
        radialBondMatrix[atom2Index][atom1Index] = true;

        N_radialBonds++;
      },

      /**
        The canonical method for adding an angular bond to the collection of angular bonds.

        If there isn't enough room in the 'angularBonds' array, it (somewhat inefficiently)
        extends the length of the typed arrays by ten to have room for more bonds.
      */
      addAngularBond: function(atom1Index, atom2Index, atom3Index, bondAngle, bondStrength) {
        if (N_angularBonds + 1 > angularBonds[0].length) {
          extendArrays(angularBonds, N_angularBonds + 10);
          assignShortcutReferences.angularBonds();
        }

        angularBondAtom1Index[N_angularBonds] = atom1Index;
        angularBondAtom2Index[N_angularBonds] = atom2Index;
        angularBondAtom3Index[N_angularBonds] = atom3Index;
        angularBondAngle[N_angularBonds]      = bondAngle;
        angularBondStrength[N_angularBonds]   = bondStrength;

        N_angularBonds++;
      },

      /**
        Adds a spring force between an atom and an x, y location.

        @returns the index of the new spring force.
      */
      addSpringForce: function(atomIndex, x, y, strength) {

        if (!springForces) createSpringForcesArray(1);

        // conservatively just add one spring force
        if (N_springForces > springForces[0].length) {
          extendArrays(springForces, N_springForces + 1);
          assignShortcutReferences.springForces();
        }

        springForceAtomIndex[N_springForces]  = atomIndex;
        springForceX[N_springForces]          = x;
        springForceY[N_springForces]          = y;
        springForceStrength[N_springForces]   = strength;

        return N_springForces++;
      },

      updateSpringForce: function(i, x, y) {
        springForceX[i] = x;
        springForceY[i] = y;
      },

      removeSpringForce: function(i) {
        if (i >= N_springForces) return;
        N_springForces--;
      },

      springForceAtomIndex: function(i) {
        return springForceAtomIndex[i];
      },

      addObstacle: function(x, y, vx, vy, width, height, density, color, visible) {
        var obstaclemass;

        if (N_obstacles + 1 > obstacles[0].length) {
          extendArrays(obstacles, N_obstacles + 10);
        }

        obstacleX[N_obstacles] = x;
        obstacleY[N_obstacles] = y;
        obstacleXPrev[N_obstacles] = x;
        obstacleYPrev[N_obstacles] = y;

        obstacleWidth[N_obstacles]  = width;
        obstacleHeight[N_obstacles] = height;

        obstacleVX[N_obstacles] = vx;
        obstacleVY[N_obstacles] = vy;

        density = parseFloat(density);      // may be string "Infinity"
        obstaclemass = density * width * height;

        obstacleMass[N_obstacles] = obstaclemass;

        obstacleColorR[N_obstacles] = color[0];
        obstacleColorG[N_obstacles] = color[1];
        obstacleColorB[N_obstacles] = color[2];

        obstacleVisible[N_obstacles] = visible;

        N_obstacles++;
      },

      atomInBounds: function(_x, _y, i) {
        var r = radius[i], j;

        if (_x < r || _x > size[0] - r || _y < r || _y > size[1] - r) {
          return false;
        }
        for (j = 0; j < N_obstacles; j++) {
          if (_x > (obstacleX[j] - r) && _x < (obstacleX[j] + obstacleWidth[j] + r) &&
              _y > (obstacleY[j] - r) && _y < (obstacleY[j] + obstacleHeight[j] + r)) {
            return false;
          }
        }
        return true;
      },

      /**
        Checks to see if an uncharged atom could be placed at location x,y
        without increasing the PE (i.e. overlapping with another atom), and
        without being on an obstacle or past a wall.

        Optionally, an atom index i can be included which will tell the function
        to ignore the existance of atom i. (Used when moving i around.)
      */
      canPlaceAtom: function(element, _x, _y, i) {
        var orig_x,
            orig_y,
            PEAtLocation;

        // first do the simpler check to see if we're outside the walls or intersect an obstacle
        if ( !engine.atomInBounds(_x, _y, i) ) {
          return false;
        }

        // then check PE at location
        if (typeof i === "number") {
          orig_x = x[i];
          orig_y = y[i];
          x[i] = y[i] = Infinity;   // move i atom away
        }

        PEAtLocation = engine.newPotentialCalculator(element, 0, false)(_x, _y);

        if (typeof i === "number") {
          x[i] = orig_x;
          y[i] = orig_y;
        }

        return PEAtLocation <= 0;
      },

      // Sets the X, Y, VX, VY and ELEMENT properties of the atoms
      initializeAtomsFromProperties: function(props) {
        var x, y, vx, vy, charge, element, friction, pinned,
            i, ii;

        if (!(props.X && props.Y)) {
          throw new Error("md2d: initializeAtomsFromProperties must specify at minimum X and Y locations.");
        }

        if (!(props.VX && props.VY)) {
          // We may way to support authored locations with random velocities in the future
          throw new Error("md2d: For now, velocities must be set when locations are set.");
        }

        for (i=0, ii=props.X.length; i<ii; i++){
          element = props.ELEMENT ? props.ELEMENT[i] : 0;
          x = props.X[i];
          y = props.Y[i];
          vx = props.VX[i];
          vy = props.VY[i];
          charge = props.CHARGE ? props.CHARGE[i] : 0;
          pinned = props.PINNED ? props.PINNED[i] : 0;
          friction = props.FRICTION ? props.FRICTION[i] : 0;

          engine.addAtom(element, x, y, vx, vy, charge, friction, pinned);
        }

        // Publish the current state
        T = computeTemperature();
      },

      initializeAtomsRandomly: function(options) {

        var // if a temperature is not explicitly requested, we just need any nonzero number
            temperature = options.temperature || 100,

            // fill up the entire 'atoms' array if not otherwise requested
            num         = options.num         || atoms[0].length,

            nrows = Math.floor(Math.sqrt(num)),
            ncols = Math.ceil(num/nrows),

            i, r, c, rowSpacing, colSpacing,
            vMagnitude, vDirection,
            x, y, vx, vy, charge, element;

        validateTemperature(temperature);

        colSpacing = size[0] / (1+ncols);
        rowSpacing = size[1] / (1+nrows);

        // Arrange molecules in a lattice. Not guaranteed to have CM exactly on center, and is an artificially low-energy
        // configuration. But it works OK for now.
        i = -1;

        for (r = 1; r <= nrows; r++) {
          for (c = 1; c <= ncols; c++) {
            i++;
            if (i === num) break;

            element    = Math.floor(Math.random() * elements.length);     // random element
            vMagnitude = math.normal(1, 1/4);
            vDirection = 2 * Math.random() * Math.PI;

            x = c*colSpacing;
            y = r*rowSpacing;
            vx = vMagnitude * Math.cos(vDirection);
            vy = vMagnitude * Math.sin(vDirection);

            charge = 2*(i%2)-1;      // alternate negative and positive charges

            engine.addAtom(element, x, y, vx, vy, charge, 0, 0, 1, 0);
          }
        }

        // now, remove all translation of the center of mass and rotation about the center of mass
        computeCMMotion();
        removeTranslationAndRotationFromVelocities();

        // Scale randomized velocities to match the desired initial temperature.
        //
        // Note that although the instantaneous temperature will be 'temperature' exactly, the temperature will quickly
        // settle to a lower value because we are initializing the atoms spaced far apart, in an artificially low-energy
        // configuration.
        //
        adjustTemperature(temperature, true);

        // Publish the current state
        T = computeTemperature();
      },

      initializeObstacles: function (props) {
        var num = props.x.length,
            i;

        createObstaclesArray(num);
        for (i = 0; i < num; i++) {
          engine.addObstacle(
            props.x[i],
            props.y[i],
            props.vx[i],
            props.vy[i],
            props.width[i],
            props.height[i],
            props.density[i],
            props.color[i],
            props.visible[i]
          );
        }
      },

      initializeRadialBonds: function(props) {
        var num = props.atom1Index.length,
            i;

        radialBondMatrix = [];
        createRadialBondsArray(num);

        for (i = 0; i < num; i++) {
          engine.addRadialBond(
            props.atom1Index[i],
            props.atom2Index[i],
            props.bondLength[i],
            props.bondStrength[i],
            props.bondStyle[i]
          );
        }
      },

      initializeAngularBonds: function(props) {
        var num = props.atom1Index.length,
            i;

        createAngularBondsArray(num);

        for (i = 0; i < num; i++) {
          engine.addAngularBond(
            props.atom1Index[i],
            props.atom2Index[i],
            props.atom3Index[i],
            props.bondAngle[i],
            props.bondStrength[i]
          );
        }
      },

      createVdwPairsArray: function() {
        var maxNumPairs = N * (N-1) / 2;

        vdwPairs = engine.vdwPairs = [];

        vdwPairs[VDW_INDICES.COUNT] = N_vdwPairs;
        vdwPairs[VDW_INDICES.ATOM1] = vdwPairAtom1Index = arrays.create(maxNumPairs, 0, uint16);
        vdwPairs[VDW_INDICES.ATOM2] = vdwPairAtom2Index = arrays.create(maxNumPairs, 0, uint16);

        engine.updateVdwPairsArray();
      },

      updateVdwPairsArray: function() {
        var i,
            j,
            dx,
            dy,
            r_sq,
            x_i,
            y_i,
            element_i,
            element_j,
            sigma_i,
            epsilon_i,
            sigma_j,
            epsilon_j,
            sig,
            eps,
            distanceCutoff_sq = 4; // vdwLinesRatio * vdwLinesRatio : 2*2 for long distance cutoff

        N_vdwPairs = 0;

        for (i = 0; i < N; i++) {
          // pairwise interactions
          element_i = elements[element[i]];
          sigma_i   = element_i[ELEMENT_INDICES.SIGMA];
          epsilon_i = element_i[ELEMENT_INDICES.EPSILON];
          x_i = x[i];
          y_i = y[i];

          for (j = i+1; j < N; j++) {
            if (N_radialBonds !== 0 && (radialBondMatrix[i] && radialBondMatrix[i][j])) continue;

            element_j = elements[element[j]];
            if (charge[i]*charge[j] <= 0) {
              dx = x[j] - x_i;
              dy = y[j] - y_i;
              r_sq = dx*dx + dy*dy;

              sigma_j = element_j[ELEMENT_INDICES.SIGMA];
              epsilon_j = element_j[ELEMENT_INDICES.EPSILON];

              sig = 0.5 * (sigma_i+sigma_j);
              sig *= sig;
              eps = epsilon_i * epsilon_j;

              if (r_sq < sig * distanceCutoff_sq && eps > 0) {
                vdwPairAtom1Index[N_vdwPairs] = i;
                vdwPairAtom2Index[N_vdwPairs] = j;
                N_vdwPairs++;
              }
            }
          }
        }

        vdwPairs[VDW_INDICES.COUNT] = N_vdwPairs;
      },

      relaxToTemperature: function(T) {

        // FIXME this method needs to be modified. It should rescale velocities only periodically
        // and stop when the temperature approaches a steady state between rescalings.

        if (T != null) T_target = T;

        validateTemperature(T_target);

        beginTransientTemperatureChange();
        while (temperatureChangeInProgress) {
          engine.integrate();
        }
      },

      integrate: function(duration) {

        var radius,
            inverseMass;

        if (!atomsHaveBeenCreated) {
          throw new Error("md2d: integrate called before atoms created.");
        }

        if (duration == null)  duration = integrationDuration;  // how much time to integrate over, in fs

        dt_sq = dt*dt;                      // time step, squared

        // FIXME we still need to make bounceOffWalls respect each atom's actual radius, rather than
        // assuming just one radius as below
        radius = elements[element[0]][ELEMENT_INDICES.RADIUS];

        var t_start = time,
            n_steps = Math.floor(duration/dt),  // number of steps
            iloop,
            i,
            x_prev,
            y_prev;

        for (iloop = 1; iloop <= n_steps; iloop++) {
          time = t_start + iloop*dt;

          for (i = 0; i < N; i++) {
            x_prev = x[i];
            y_prev = y[i];

            // Update r(t+dt) using v(t) and a(t)
            updatePosition(i);
            bounceOffWalls(i);
            bounceOffObstacles(i, x_prev, y_prev);

            // First half of update of v(t+dt, i), using v(t, i) and a(t, i)
            halfUpdateVelocity(i);

            // Zero out a(t, i) for accumulation of forces into a(t+dt, i)
            ax[i] = ay[i] = 0;

            // Accumulate _forces_ for time t+dt into a(t+dt, k) for k <= i. Note that a(t+dt, i)
            // won't be usable until this loop completes; it won't have contributions from a(t+dt, k)
            // for k > i
            updatePairwiseForces(i);
          }

          //
          // ax and ay are FORCES below this point
          //

          // Move obstacles
          for (i = 0; i < N_obstacles; i++) {
            updateObstaclePosition(i);
          }

          // Accumulate forces from radially bonded interactions into a(t+dt)
          updateRadialBondForces();

          // Accumulate forces from angularly bonded interactions into a(t+dt)
          updateAngularBondForces();

          // Accumulate forces from spring forces into a(t+dt)
          updateSpringForces();

          // Accumulate drag forces into a(t+dt)
          updateFrictionForces();

          // Convert ax, ay from forces to accelerations
          for (i = 0; i < N; i++) {
            inverseMass = 1/mass[i];
            ax[i] *= inverseMass;
            ay[i] *= inverseMass;
          }

          //
          // ax and ay are ACCELERATIONS below this point
          //

          // Accumulate optional gravitational accelerations into a(t+dt)
          updateGravitationalAccelerations();

          for (i = 0; i < N; i++) {
            // Clearing the acceleration here from pinned atoms will cause the acceleration
            // to be zero for both halfUpdateVelocity methods and updatePosition, freezing the atom
            if (pinned[i]) pinAtom(i);

            // Second half of update of v(t+dt, i) using first half of update and a(t+dt, i)
            halfUpdateVelocity(i);

            // Now that we have velocity, update speed
            speed[i] = Math.sqrt(vx[i]*vx[i] + vy[i]*vy[i]);
          }

          adjustTemperature();
        } // end of integration loop
      },

      getTotalMass: function() {
        return totalMass;
      },

      getRadiusOfElement: function(el) {
        return elements[el][ELEMENT_INDICES.RADIUS];
      },

      getNumberOfAtoms: function() {
        return N;
      },

      /**
        Compute the model state and store into the passed-in 'state' object.
        (Avoids GC hit of throwaway object creation.)
      */
      // TODO: [refactoring] divide this function into smaller chunks?
      computeOutputState: function(state) {
        var i, j,
            i1, i2, i3,
            el1, el2,
            dx, dy,
            dxij, dyij, dxkj, dykj,
            cosTheta, theta,
            r_sq, rij, rkj,
            k, dr, angleDiff,
            gravPEInMWUnits,
            KEinMWUnits,       // total kinetic energy, in MW units
            PE;                // potential energy, in eV

        // Calculate potentials in eV. Note that we only want to do this once per call to integrate(), not once per
        // integration loop!
        PE = 0;
        KEinMWUnits = 0;

        for (i = 0; i < N; i++) {

          // gravitational PE
          if (gravitationalField) {
            gravPEInMWUnits = mass[i] * gravitationalField * y[i];
            PE += constants.convert(gravPEInMWUnits, { from: unit.MW_ENERGY_UNIT, to: unit.EV });
          }

          KEinMWUnits += 0.5 * mass[i] * (vx[i] * vx[i] + vy[i] * vy[i]);

          // pairwise interactions
          for (j = i+1; j < N; j++) {
            dx = x[j] - x[i];
            dy = y[j] - y[i];

            r_sq = dx*dx + dy*dy;

            // FIXME the signs here don't really make sense
            if (useLennardJonesInteraction) {
              PE -=ljCalculator[element[i]][element[j]].potentialFromSquaredDistance(r_sq);
            }
            if (useCoulombInteraction && hasChargedAtoms) {
              PE += coulomb.potential(Math.sqrt(r_sq), charge[i], charge[j]);
            }
          }
        }

        // radial bonds
        for (i = 0; i < N_radialBonds; i++) {
          i1 = radialBondAtom1Index[i];
          i2 = radialBondAtom2Index[i];
          el1 = element[i1];
          el2 = element[i2];

          dx = x[i2] - x[i1];
          dy = y[i2] - y[i1];
          r_sq = dx*dx + dy*dy;

          // eV/nm^2
          k = radialBondStrength[i];

          // nm
          dr = Math.sqrt(r_sq) - radialBondLength[i];

          PE += 0.5*k*dr*dr;

          // Remove the Lennard Jones potential for the bonded pair
          if (useLennardJonesInteraction) {
            PE += ljCalculator[el1][el2].potentialFromSquaredDistance(r_sq);
          }
          if (useCoulombInteraction && charge[i1] && charge[i2]) {
            PE -= coulomb.potential(Math.sqrt(r_sq), charge[i1], charge[i2]);
          }

          // Also save the updated position of the two bonded atoms
          // in a row in the radialBondResults array.
          radialBondResults[i][6] = x[i1];
          radialBondResults[i][7] = y[i1];
          radialBondResults[i][8] = x[i2];
          radialBondResults[i][9] = y[i2];
        }

        // Angular bonds.
        for (i = 0; i < N_angularBonds; i++) {
          i1 = angularBondAtom1Index[i];
          i2 = angularBondAtom2Index[i];
          i3 = angularBondAtom3Index[i];

          // Calculate angle (theta) between two vectors:
          // Atom1-Atom3 and Atom2-Atom3
          // Atom1 -> i, Atom2 -> k, Atom3 -> j
          dxij = x[i1] - x[i3];
          dxkj = x[i2] - x[i3];
          dyij = y[i1] - y[i3];
          dykj = y[i2] - y[i3];
          rij = Math.sqrt(dxij * dxij + dyij * dyij);
          rkj = Math.sqrt(dxkj * dxkj + dykj * dykj);
          // Calculate cos using dot product definition.
          cosTheta = (dxij * dxkj + dyij * dykj) / (rij * rkj);
          if (cosTheta > 1.0) cosTheta = 1.0;
          else if (cosTheta < -1.0) cosTheta = -1.0;
          theta = Math.acos(cosTheta);

          // Finally, update PE.
          // radian
          angleDiff = theta - angularBondAngle[i];
          // angularBondStrength unit: eV/radian^2
          PE += 0.5 * angularBondStrength[i] * angleDiff * angleDiff;
        }

        // Obstacles.
        for (i = 0; i < N_obstacles; i++) {
          if (obstacleMass[i] !== Infinity) {
            KEinMWUnits += 0.5 * obstacleMass[i] *
                (obstacleVX[i] * obstacleVX[i] + obstacleVY[i] * obstacleVY[i]);
          }
        }

        // State to be read by the rest of the system:
        state.time     = time;
        state.pressure = 0;// (time - t_start > 0) ? pressure / (time - t_start) : 0;
        state.PE       = PE;
        state.KE       = constants.convert(KEinMWUnits, { from: unit.MW_ENERGY_UNIT, to: unit.EV });
        state.temperature = T;
        state.pCM      = [px_CM, py_CM];
        state.CM       = [x_CM, y_CM];
        state.vCM      = [vx_CM, vy_CM];
        state.omega_CM = omega_CM;
      },


      /**
        Given a test element and charge, returns a function that returns for a location (x, y) in nm:
         * the potential energy, in eV, of an atom of that element and charge at location (x, y)
         * optionally, if calculateGradient is true, the gradient of the potential as an
           array [gradX, gradY]. (units: eV/nm)
      */
      newPotentialCalculator: function(testElement, testCharge, calculateGradient) {

        return function(testX, testY) {
          var PE = 0,
              fx = 0,
              fy = 0,
              gradX,
              gradY,
              ljTest = ljCalculator[testElement],
              i,
              dx,
              dy,
              r_sq,
              r,
              f_over_r,
              lj;

          for (i = 0; i < N; i++) {
            dx = testX - x[i];
            dy = testY - y[i];
            r_sq = dx*dx + dy*dy;
            f_over_r = 0;

            if (useLennardJonesInteraction) {
              lj = ljTest[element[i]];
              PE += -lj.potentialFromSquaredDistance(r_sq, testElement, element[i]);
              if (calculateGradient) {
                f_over_r += lj.forceOverDistanceFromSquaredDistance(r_sq);
              }
            }

            if (useCoulombInteraction && hasChargedAtoms && testCharge) {
              r = Math.sqrt(r_sq);
              PE += -coulomb.potential(r, testCharge, charge[i]);
              if (calculateGradient) {
                f_over_r += coulomb.forceOverDistanceFromSquaredDistance(r_sq, testCharge, charge[i]);
              }
            }

            if (f_over_r) {
              fx += f_over_r * dx;
              fy += f_over_r * dy;
            }
          }

          if (calculateGradient) {
            gradX = constants.convert(fx, { from: unit.MW_FORCE_UNIT, to: unit.EV_PER_NM });
            gradY = constants.convert(fy, { from: unit.MW_FORCE_UNIT, to: unit.EV_PER_NM });
            return [PE, [gradX, gradY]];
          }

          return PE;
        };
      },

      /**
        Starting at (x,y), try to find a position which minimizes the potential energy change caused
        by adding at atom of element el.
      */
      findMinimumPELocation: function(el, x, y, charge) {
        var pot    = engine.newPotentialCalculator(el, charge, true),
            radius = elements[el][ELEMENT_INDICES.RADIUS],

            res =  math.minimize(pot, [x, y], {
              bounds: [ [radius, size[0]-radius], [radius, size[1]-radius] ]
            });

        if (res.error) return false;
        return res[1];
      },

      /**
        Starting at (x,y), try to find a position which minimizes the square of the potential energy
        change caused by adding at atom of element el, i.e., find a "farthest from everything"
        position.
      */
      findMinimumPESquaredLocation: function(el, x, y, charge) {
        var pot = engine.newPotentialCalculator(el, charge, true),

            // squared potential energy, with gradient
            potsq = function(x,y) {
              var res, f, grad;

              res = pot(x,y);
              f = res[0];
              grad = res[1];

              // chain rule
              grad[0] *= (2*f);
              grad[1] *= (2*f);

              return [f*f, grad];
            },

            radius = elements[el][ELEMENT_INDICES.RADIUS],

            res = math.minimize(potsq, [x, y], {
              bounds: [ [radius, size[0]-radius], [radius, size[1]-radius] ],
              stopval: 1e-4,
              precision: 1e-6
            });

        if (res.error) return false;
        return res[1];
      },

      atomsInMolecule: [],
      depth: 0,

      /**
        Returns all atoms in the same molecule as atom i
        (not including i itself)
      */
      getMoleculeAtoms: function(i) {
        this.atomsInMolecule.push(i);

        var moleculeAtoms = [],
            bondedAtoms = this.getBondedAtoms(i),
            depth = this.depth,
            j, jj,
            atomNo;

        this.depth++;

        for (j=0, jj=bondedAtoms.length; j<jj; j++) {
          atomNo = bondedAtoms[j];
          if (!~this.atomsInMolecule.indexOf(atomNo)) {
            moleculeAtoms = moleculeAtoms.concat(this.getMoleculeAtoms(atomNo)); // recurse
          }
        }
        if (depth === 0) {
          this.depth = 0;
          this.atomsInMolecule = [];
        } else {
          moleculeAtoms.push(i);
        }
        return moleculeAtoms;
      },

      /**
        Returns all atoms directly bonded to atom i
      */
      getBondedAtoms: function(i) {
        var bondedAtoms = [],
            j, jj;
        if (radialBonds) {
          for (j = 0, jj = radialBonds[0].length; j < jj; j++) {
            // console.log("looking at bond from "+radialBonds)
            if (radialBondAtom1Index[j] === i) {
              bondedAtoms.push(radialBondAtom2Index[j]);
            }
            if (radialBondAtom2Index[j] === i) {
              bondedAtoms.push(radialBondAtom1Index[j]);
            }
          }
        }
        return bondedAtoms;
      },

      /**
        Returns Kinetic Energy of single atom i, in eV.
      */
      getAtomKineticEnergy: function(i) {
        var KEinMWUnits = 0.5 * mass[i] * (vx[i] * vx[i] + vy[i] * vy[i]);
        return constants.convert(KEinMWUnits, { from: unit.MW_ENERGY_UNIT, to: unit.EV });
      },

      setViscosity: function(v) {
        viscosity = v;
      }
    };
  };
});

/*global define: false, d3: false, $: false */
/*jslint onevar: true devel:true eqnull: true */

define('md2d/models/modeler',['require','common/console','arrays','md2d/models/engine/md2d'],function(require) {
  // Dependencies.
  require('common/console');
  var arrays  = require('arrays'),
      md2d    = require('md2d/models/engine/md2d'),

      engine;

  return function Model(initialProperties) {
    var model = {},
        elements = initialProperties.elements || [{id: 0, mass: 39.95, epsilon: -0.1, sigma: 0.34}],
        dispatch = d3.dispatch("tick", "play", "stop", "reset", "stepForward", "stepBack", "seek", "addAtom"),
        temperature_control,
        keShading, chargeShading, showVDWLines,VDWLinesRatio,
        showClock,
        lennard_jones_forces, coulomb_forces,
        gravitationalField = false,
        viewRefreshInterval = 50,
        timeStep = 1,
        stopped = true,
        tick_history_list = [],
        tick_history_list_index = 0,
        tick_counter = 0,
        new_step = false,
        pressure, pressures = [0],
        modelSampleRate = 60,
        lastSampleTime,
        sampleTimes = [],

        // N.B. this is the thermostat (temperature control) setting
        temperature,

        // current model time, in fs
        time,

        // potential energy
        pe,

        // kinetic energy
        ke,

        modelOutputState,
        model_listener,

        width = initialProperties.width,
        height = initialProperties.height,

        //
        // A two dimensional array consisting of arrays of atom property values
        //
        atoms,

        //
        // A two dimensional array consisting of atom index numbers and atom
        // property values - in effect transposed from the atom property arrays.
        //
        results,

        // A two dimensional array consisting of radial bond index numbers, radial bond
        // properties, and the postions of the two bonded atoms.
        radialBondResults,

        // list of obstacles
        obstacles,
        // Radial Bonds
        radialBonds,
        // Angular Bonds
        angularBonds,
        // VDW Pairs
        vdwPairs,

        viscosity,

        // The index of the "spring force" used to implement dragging of atoms in a running model
        liveDragSpringForceIndex,

        // Cached value of the 'friction' property of the atom being dragged in a running model
        liveDragSavedFriction,

        default_obstacle_properties = {
          vx: 0,
          vy: 0,
          density: Infinity,
          color: [128, 128, 128]
        },

        listeners = {},

        properties = {
          temperature           : 300,
          modelSampleRate       : 60,
          coulomb_forces        : true,
          lennard_jones_forces  : true,
          temperature_control   : true,
          gravitationalField    : false,
          keShading             : false,
          chargeShading         : false,
          showVDWLines          : false,
          showClock             : true,
          viewRefreshInterval   : 50,
          timeStep              : 1,
          VDWLinesRatio         : 1.99,
          viscosity             : 0,

          /**
            These functions are optional setters that will be called *instead* of simply setting
            a value when 'model.set({property: value})' is called, and are currently needed if you
            want to pass a value through to the engine.  The function names are automatically
            determined from the property name. If you define one of these custom functions, you
            must remember to also set the property explicitly (if appropriate) as this won't be
            done automatically
          */

          set_temperature: function(t) {
            this.temperature = t;
            if (engine) {
              engine.setTargetTemperature(t);
            }
          },

          set_temperature_control: function(tc) {
            this.temperature_control = tc;
            if (engine) {
              engine.useThermostat(tc);
            }
          },

          set_coulomb_forces: function(cf) {
            this.coulomb_forces = cf;
            if (engine) {
              engine.useCoulombInteraction(cf);
            }
          },

          set_epsilon: function(e) {
            console.log("set_epsilon: This method is temporarily deprecated");
          },

          set_sigma: function(s) {
            console.log("set_sigma: This method is temporarily deprecated");
          },

          set_gravitationalField: function(gf) {
            this.gravitationalField = gf;
            if (engine) {
              engine.setGravitationalField(gf);
            }
          },

          set_viewRefreshInterval: function(vri) {
            this.viewRefreshInterval = vri;
            if (engine) {
              engine.setIntegrationDuration(vri);
            }
          },

          set_timeStep: function(ts) {
            this.timeStep = ts;
            if (engine) {
              engine.setTimeStep(ts);
            }
          },

          set_viscosity: function(v) {
            this.viscosity = v;
            if (engine) {
              engine.setViscosity(v);
            }
          }
        },

        // TODO: notSafari and hasTypedArrays belong in the arrays module
        // Check for Safari. Typed arrays are faster almost everywhere
        // ... except Safari.
        notSafari = (function() {
          var safarimatch  = / AppleWebKit\/([0123456789.+]+) \(KHTML, like Gecko\) Version\/([0123456789.]+) (Safari)\/([0123456789.]+)/,
              match = navigator.userAgent.match(safarimatch);
          return (match && match[3]) ? false: true;
        }()),

        hasTypedArrays = (function() {
          try {
            new Float32Array();
          }
          catch(e) {
            return false;
          }
          return true;
        }()),

        arrayType = (hasTypedArrays && notSafari) ? 'Float32Array' : 'regular';

    function setupIndices() {
      var prop,
          i,
          offset,
          shortName;
      //
      // Indexes into the atoms array for the individual node property arrays
      //
      model.INDICES = {};
      model.ATOM_PROPERTY_LIST = [];
      model.ATOM_PROPERTY_SHORT_NAMES = {};

      // Copy ATOM property indices and names from md2d
      offset = 0;
      for (i = 0; i < md2d.ATOM_PROPERTY_LIST.length; i++) {
        prop = md2d.ATOM_PROPERTY_LIST[i];

        model.ATOM_PROPERTY_LIST[i] = prop;
        model.INDICES[prop]         = md2d.ATOM_INDICES[prop] + offset;
      }

      model.RADIAL_BOND_INDICES = {};
      model.RADIAL_BOND_PROPERTY_LIST = [];

      // Copy RADIAL_BOND property indices and names from md2d
      offset = 0;
      for (i = 0; i < md2d.RADIAL_BOND_PROPERTY_LIST.length; i++) {
        prop = md2d.RADIAL_BOND_PROPERTY_LIST[i];
        model.RADIAL_BOND_PROPERTY_LIST[i] = prop;
        model.RADIAL_BOND_INDICES[prop]    = md2d.RADIAL_BOND_INDICES[prop] + offset;
      }

      model.ANGULAR_BOND_INDICES = {};
      model.ANGULAR_BOND_PROPERTY_LIST = [];

      // Copy ANGULAR_BOND property indices and names from md2d
      offset = 0;
      for (i = 0; i < md2d.ANGULAR_BOND_PROPERTY_LIST.length; i++) {
        prop = md2d.ANGULAR_BOND_PROPERTY_LIST[i];
        model.ANGULAR_BOND_PROPERTY_LIST[i] = prop;
        model.ANGULAR_BOND_INDICES[prop]    = md2d.ANGULAR_BOND_INDICES[prop] + offset;
      }

      model.ELEMENT_INDICES = {};
      model.ELEMENT_PROPERTY_LIST = [];

      // Copy ELEMENT property indices and names from md2d
      for (i = 0; i < md2d.ELEMENT_PROPERTY_LIST.length; i++) {
        prop = md2d.ELEMENT_PROPERTY_LIST[i];
        model.ELEMENT_PROPERTY_LIST[i] = prop;
        model.ELEMENT_INDICES[prop]    = md2d.ELEMENT_INDICES[prop];
      }

      model.NON_ENGINE_PROPERTY_LIST = [
        "VISIBLE",
        "MARKED",
        "DRAGGABLE"
      ];

      model.NON_ENGINE_PROPERTY_SHORT_NAMES = {
        VISIBLE: "visible",
        MARKED: "marked",
        DRAGGABLE: "draggable"
      };

      model.RADIAL_BOND_STYLES = {
        RADIAL_BOND_STANDARD_STICK_STYLE: 101,
        RADIAL_BOND_LONG_SPRING_STYLE:    102,
        RADIAL_BOND_SOLID_LINE_STYLE:     103,
        RADIAL_BOND_GHOST_STYLE:          104,
        RADIAL_BOND_UNICOLOR_STICK_STYLE: 105,
        RADIAL_BOND_SHORT_SPRING_STYLE:   106,
        RADIAL_BOND_DOUBLE_BOND_STYLE:    107,
        RADIAL_BOND_TRIPLE_BOND_STYLE:    108
      };

      model.NON_ENGINE_DEFAULT_VALUES = {
        VISIBLE: 1,
        MARKED: 0,
        DRAGGABLE: 0
      };

      // Add non-engine properties to the end of the list of property indices and names
      offset = model.ATOM_PROPERTY_LIST.length;
      for (i = 0; i < model.NON_ENGINE_PROPERTY_LIST.length; i++) {
        prop = model.NON_ENGINE_PROPERTY_LIST[i];

        model.ATOM_PROPERTY_LIST.push(prop);
        model.INDICES[prop]             = i + offset;
        model.ATOM_PROPERTY_SHORT_NAMES[prop] = model.NON_ENGINE_PROPERTY_SHORT_NAMES[prop];
      }

      // Inverse of ATOM_PROPERTY_SHORT_NAMES...
      model.ATOM_PROPERTY_LONG_NAMES = {};

      for (prop in model.ATOM_PROPERTY_SHORT_NAMES) {
        if (model.ATOM_PROPERTY_SHORT_NAMES.hasOwnProperty(prop)) {
          shortName = model.ATOM_PROPERTY_SHORT_NAMES[prop];
          model.ATOM_PROPERTY_LONG_NAMES[shortName] = prop;
        }
      }

      // TODO. probably save everything *except* a list of "non-saveable properties"
      model.SAVEABLE_PROPERTIES =  [
        "X",
        "Y",
        "VX",
        "VY",
        "CHARGE",
        "ELEMENT",
        "PINNED",
        "FRICTION",
        "VISIBLE",
        "MARKED",
        "DRAGGABLE"
      ];

      model.OBSTACLE_INDICES = {
        X        : md2d.OBSTACLE_INDICES.X,
        Y        : md2d.OBSTACLE_INDICES.Y,
        WIDTH    : md2d.OBSTACLE_INDICES.WIDTH,
        HEIGHT   : md2d.OBSTACLE_INDICES.HEIGHT,
        COLOR_R  : md2d.OBSTACLE_INDICES.COLOR_R,
        COLOR_G  : md2d.OBSTACLE_INDICES.COLOR_G,
        COLOR_B  : md2d.OBSTACLE_INDICES.COLOR_B,
        VISIBLE  : md2d.OBSTACLE_INDICES.VISIBLE
      };

      model.VDW_INDICES = md2d.VDW_INDICES;

    }

    function notifyPropertyListeners(listeners) {
      $.unique(listeners);
      for (var i=0, ii=listeners.length; i<ii; i++){
        listeners[i]();
      }
    }

    function notifyPropertyListenersOfEvents(events) {
      var evt,
          evts,
          waitingToBeNotified = [],
          i, ii;

      if (typeof events === "string") {
        evts = [events];
      } else {
        evts = events;
      }
      for (i=0, ii=evts.length; i<ii; i++){
        evt = evts[i];
        if (listeners[evt]) {
          waitingToBeNotified = waitingToBeNotified.concat(listeners[evt]);
        }
      }
      if (listeners["all"]){      // listeners that want to be notified on any change
        waitingToBeNotified = waitingToBeNotified.concat(listeners["all"]);
      }
      notifyPropertyListeners(waitingToBeNotified);
    }

    function average_speed() {
      var i, s = 0, n = model.get_num_atoms();
      i = -1; while (++i < n) { s += engine.speed[i]; }
      return s/n;
    }



    function tick(elapsedTime, dontDispatchTickEvent) {
      var t,
          sampleTime,
          doIntegration;

      if (stopped) {
        doIntegration = true;
      } else {
        t = Date.now();
        if (lastSampleTime) {
          sampleTime  = t - lastSampleTime;
          if (1000/sampleTime < modelSampleRate) {
            doIntegration = true;
            lastSampleTime = t;
            sampleTimes.push(sampleTime);
            sampleTimes.splice(0, sampleTimes.length - 128);
          } else {
            doIntegration = false;
          }
        } else {
          lastSampleTime = t;
          doIntegration = true;
        }
      }

      if (doIntegration) {
        engine.integrate();
        readModelState();

        pressures.push(pressure);
        pressures.splice(0, pressures.length - 16); // limit the pressures array to the most recent 16 entries

        tick_history_list_push();

        if (!dontDispatchTickEvent) {
          dispatch.tick();
        }
      }

      return stopped;
    }

    function tick_history_list_is_empty() {
      return tick_history_list_index === 0;
    }

    function tick_history_list_push() {
      var i,
          newAtoms = [],
          n = atoms.length;

      i = -1; while (++i < n) {
        newAtoms[i] = arrays.clone(atoms[i]);
      }
      tick_history_list.length = tick_history_list_index;
      tick_history_list_index++;
      tick_counter++;
      new_step = true;
      tick_history_list.push({
        atoms:    newAtoms,
        pressure: modelOutputState.pressure,
        pe:       modelOutputState.PE,
        ke:       modelOutputState.KE,
        time:     modelOutputState.time
      });
      if (tick_history_list_index > 1000) {
        tick_history_list.splice(1,1);
        tick_history_list_index = 1000;
      }
    }

    function restoreFirstStateinTickHistory() {
      tick_history_list_index = 0;
      tick_counter = 0;
      tick_history_list.length = 1;
      tick_history_list_extract(tick_history_list_index);
    }

    function reset_tick_history_list() {
      tick_history_list = [];
      tick_history_list_index = 0;
      tick_counter = 0;
    }

    function tick_history_list_reset_to_ptr() {
      tick_history_list.length = tick_history_list_index + 1;
    }

    function tick_history_list_extract(index) {
      var i, n=atoms.length;
      if (index < 0) {
        throw new Error("modeler: request for tick_history_list[" + index + "]");
      }
      if (index >= tick_history_list.length) {
        throw new Error("modeler: request for tick_history_list[" + index + "], tick_history_list.length=" + tick_history_list.length);
      }
      i = -1; while(++i < n) {
        arrays.copy(tick_history_list[index].atoms[i], atoms[i]);
      }
      ke = tick_history_list[index].ke;
      time = tick_history_list[index].time;
      engine.setTime(time);
    }

    function container_pressure() {
      return pressures.reduce(function(j,k) { return j+k; })/pressures.length;
    }

    function average_rate() {
      var i, ave, s = 0, n = sampleTimes.length;
      i = -1; while (++i < n) { s += sampleTimes[i]; }
      ave = s/n;
      return (ave ? 1/ave*1000: 0);
    }

    function set_temperature(t) {
      temperature = t;
      engine.setTargetTemperature(t);
    }

    function set_properties(hash) {
      var property, propsChanged = [];
      for (property in hash) {
        if (hash.hasOwnProperty(property) && hash[property] !== undefined && hash[property] !== null) {
          // look for set method first, otherwise just set the property
          if (properties["set_"+property]) {
            properties["set_"+property](hash[property]);
          // why was the property not set if the default value property is false ??
          // } else if (properties[property]) {
          } else {
            properties[property] = hash[property];
          }
          propsChanged.push(property);
        }
      }
      notifyPropertyListenersOfEvents(propsChanged);
    }

    /**
      Use this method to refresh the results array and macrostate variables (KE, PE, temperature)
      whenever an engine integration occurs or the model state is otherwise changed.
    */
    function readModelState() {
      var i,
          len,
          j,
          n;

      engine.computeOutputState(modelOutputState);

      extendResultsArray();

      // Transpose 'atoms' array into 'results' for easier consumption by view code
      for (j = 0, len = atoms.length; j < len; j++) {
        for (i = 0, n = model.get_num_atoms(); i < n; i++) {
          results[i][j+1] = atoms[j][i];
        }
      }

      pressure = modelOutputState.pressure;
      pe       = modelOutputState.PE;
      ke       = modelOutputState.KE;
      time     = modelOutputState.time;
    }

    /**
      Ensure that the 'results' array of arrays is defined and contains one typed array per atom
      for containing the atom properties.
    */
    function extendResultsArray() {
      var i,
          n;

      if (!results) results = [];

      for (i = results.length, n = model.get_num_atoms(); i < n; i++) {
        if (!results[i]) {
          results[i] = arrays.create(1 + model.ATOM_PROPERTY_LIST.length,  0, arrayType);
          results[i][0] = i;
        }
      }
    }

    function setToDefaultValue(prop) {
      for (var i = 0; i < model.get_num_atoms(); i++) {
        atoms[model.INDICES[prop]][i] = model.NON_ENGINE_DEFAULT_VALUES[prop];
      }
    }

    function setFromSerializedArray(prop, serializedArray) {
      for (var i = 0; i < model.get_num_atoms(); i++) {
        atoms[model.INDICES[prop]][i] = serializedArray[i];
      }
    }

    function initializeNonEngineProperties(serializedAtomProps) {
      var prop,
          i;

      for (i = 0; i < model.NON_ENGINE_PROPERTY_LIST.length; i++) {
        prop = model.NON_ENGINE_PROPERTY_LIST[i];
        atoms[model.INDICES[prop]] = arrays.create(model.get_num_atoms(), 0, arrayType);

        if (serializedAtomProps[prop]) {
          setFromSerializedArray(prop, serializedAtomProps[prop]);
        }
        else {
          setToDefaultValue(prop);
        }
      }
    }

    /**
      Each entry in engine.atoms is a reference to a typed array. When the engine needs to create
      a larger typed array, it must create a new object. Therefore, this function exists to copy
      over any references to newly created typed arrays from engine.atoms to our atoms array.
    */
    function copyEngineAtomReferences() {
      var prop;
      // Note that the indirection below allows us to correctly account for arbitrary differences
      // between the ordering of indices in model and the ordering in the engine.

      for (var i = 0; i < md2d.ATOM_PROPERTY_LIST.length; i++) {
        prop = md2d.ATOM_PROPERTY_LIST[i];
        atoms[ model.INDICES[prop] ] = engine.atoms[ md2d.ATOM_INDICES[prop] ];
      }
    }

    function copyTypedArray(arr) {
      var copy = [];
      for (var i=0,ii=arr.length; i<ii; i++){
        copy[i] = arr[i];
      }
      return copy;
    }


    function serializeAtoms() {
      var serializedData = {},
          prop,
          array,
          i,
          len;

      for (i=0, len = model.SAVEABLE_PROPERTIES.length; i < len; i++) {
        prop = model.SAVEABLE_PROPERTIES[i];
        array = atoms[model.INDICES[prop]];
        serializedData[prop] = array.slice ? array.slice() : copyTypedArray(array);
      }

      return serializedData;
    }

    // ------------------------------
    // finish setting up the model
    // ------------------------------

    setupIndices();

    // Friction parameter temporarily applied to the live-dragged atom.
    model.LIVE_DRAG_FRICTION = 10;

    // who is listening to model tick completions
    model_listener = initialProperties.model_listener;

    // set the rest of the regular properties
    set_properties(initialProperties);



    // ------------------------------------------------------------
    //
    // Public functions
    //
    // ------------------------------------------------------------

    model.getStats = function() {
      return {
        speed       : average_speed(),
        ke          : ke,
        temperature : temperature,
        pressure    : container_pressure(),
        current_step: tick_counter,
        steps       : tick_history_list.length-1
      };
    };

    // A convenience for interactively getting energy averages
    model.getStatsHistory = function() {
      var i, len,
          tick,
          ret = [];

      ret.push("time (fs)\ttotal PE (eV)\ttotal KE (eV)\ttotal energy (eV)");

      for (i = 0, len = tick_history_list.length; i < len; i++) {
        tick = tick_history_list[i];
        ret.push(tick.time + "\t" + tick.pe + "\t" + tick.ke + "\t" + (tick.pe+tick.ke));
      }
      return ret.join('\n');
    };

    /**
      Current seek position
    */
    model.stepCounter = function() {
      return tick_counter;
    };

    /** Total number of ticks that have been run & are stored, regardless of seek
        position
    */
    model.steps = function() {
      return tick_history_list.length - 1;
    };

    model.isNewStep = function() {
      return new_step;
    };

    model.seek = function(location) {
      if (!arguments.length) { location = 0; }
      stopped = true;
      new_step = false;
      tick_history_list_index = location;
      tick_counter = location;
      tick_history_list_extract(tick_history_list_index);
      dispatch.seek();
      if (model_listener) { model_listener(); }
      return tick_counter;
    };

    model.stepBack = function(num) {
      if (!arguments.length) { num = 1; }
      var i = -1;
      stopped = true;
      new_step = false;
      while(++i < num) {
        if (tick_history_list_index > 1) {
          tick_history_list_index--;
          tick_counter--;
          tick_history_list_extract(tick_history_list_index-1);
          if (model_listener) { model_listener(); }
        }
      }
      return tick_counter;
    };

    model.stepForward = function(num) {
      if (!arguments.length) { num = 1; }
      var i = -1;
      stopped = true;
      while(++i < num) {
        if (tick_history_list_index < tick_history_list.length) {
          tick_history_list_extract(tick_history_list_index);
          tick_history_list_index++;
          tick_counter++;
          if (model_listener) { model_listener(); }
        } else {
          tick();
        }
      }
      return tick_counter;
    };

    /**
      Creates a new md2d model with a new set of atoms and leaves it in 'engine'

      @config: either the number of atoms (for a random setup) or
               a hash specifying the x,y,vx,vy properties of the atoms
      When random setup is used, the option 'relax' determines whether the model is requested to
      relax to a steady-state temperature (and in effect gets thermalized). If false, the atoms are
      left in whatever grid the engine's initialization leaves them in.
    */
    model.createNewAtoms = function(config) {
      var elemsArray, element, i, ii, num;

      if (typeof config === 'number') {
        num = config;
      } else if (config.num != null) {
        num = config.num;
      } else if (config.X) {
        num = config.X.length;
      }

      // convert from easily-readble json format to simplified array format
      elemsArray = [];
      for (i=0, ii=elements.length; i<ii; i++){
        element = elements[i];
        elemsArray[element.id] = [element.mass, element.epsilon, element.sigma];
      }

      // get a fresh model
      engine = md2d.createEngine();
      engine.setSize([width,height]);
      engine.setElements(elemsArray);
      engine.createAtoms({
        num: num
      });

      // Initialize properties
      temperature_control = properties.temperature_control;
      temperature         = properties.temperature;
      modelSampleRate     = properties.modelSampleRate,
      keShading           = properties.keShading,
      chargeShading       = properties.chargeShading;
      showVDWLines        = properties.showVDWLines;
      VDWLinesRatio       = properties.VDWLinesRatio;
      showClock           = properties.showClock;
      viewRefreshInterval = properties.viewRefreshInterval;
      timeStep            = properties.timeStep;
      viscosity           = properties.viscosity;
      gravitationalField  = properties.gravitationalField;

      engine.useLennardJonesInteraction(properties.lennard_jones_forces);
      engine.useCoulombInteraction(properties.coulomb_forces);
      engine.useThermostat(temperature_control);
      engine.setViscosity(viscosity);
      engine.setGravitationalField(gravitationalField);
      engine.setIntegrationDuration(viewRefreshInterval*timeStep);
      engine.setTimeStep(timeStep);

      engine.setTargetTemperature(temperature);

      if (config.X && config.Y) {
        engine.initializeAtomsFromProperties(config);
      } else {
        engine.initializeAtomsRandomly({
          temperature: temperature
        });
        if (config.relax) engine.relaxToTemperature();
      }

      atoms = [];
      copyEngineAtomReferences(engine.atoms);
      initializeNonEngineProperties(config);

      window.state = modelOutputState = {};
      readModelState();

      // tick history stuff
      reset_tick_history_list();
      tick_history_list_push();
      tick_counter = 0;
      new_step = true;

      // Listeners should consider resetting the atoms a 'reset' event
      dispatch.reset();

      // return model, for chaining (if used)
      return model;
    };

    model.createRadialBonds = function(_radialBonds) {
      engine.initializeRadialBonds(_radialBonds);
      radialBonds = engine.radialBonds;
      radialBondResults = engine.radialBondResults;
      readModelState();
      return model;
    };

    model.createAngularBonds = function(_angularBonds) {
      engine.initializeAngularBonds(_angularBonds);
      angularBonds = engine.angularBonds;
      readModelState();
      return model;
    };

    model.createVdwPairs = function(_atoms) {
      engine.createVdwPairsArray(_atoms);
      vdwPairs = engine.vdwPairs;
      readModelState();
      return model;
    };

    model.createObstacles = function(_obstacles) {
      var numObstacles = _obstacles.x.length,
          i, prop;

      // ensure that every property either has a value or the default value
      for (i = 0; i < numObstacles; i++) {
        for (prop in default_obstacle_properties) {
          if (!default_obstacle_properties.hasOwnProperty(prop)) continue;
          if (!_obstacles[prop]) {
            _obstacles[prop] = [];
          }
          if (typeof _obstacles[prop][i] === "undefined") {
            _obstacles[prop][i] = default_obstacle_properties[prop];
          }
        }
      }

      engine.initializeObstacles(_obstacles);
      obstacles = engine.obstacles;
      return model;
    };

    model.reset = function() {
      model.resetTime();
      restoreFirstStateinTickHistory();
      dispatch.reset();
    };

    model.resetTime = function() {
      engine.setTime(0);
    };

    model.getTime = function() {
      return modelOutputState ? modelOutputState.time : undefined;
    };

    model.getTotalMass = function() {
      return engine.getTotalMass();
    };

    model.getAtomKineticEnergy = function(i) {
      return engine.getAtomKineticEnergy(i);
    };

    /**
      Attempts to add an 0-velocity atom to a random location. Returns false if after 10 tries it
      can't find a location. (Intended to be exposed as a script API method.)

      Optionally allows specifying the element (default is to randomly select from all elements) and
      charge (default is neutral).
    */
    model.addRandomAtom = function(el, charge) {
      if (el == null) el = Math.floor( Math.random() * elements.length );
      if (charge == null) charge = 0;

      var size   = model.size(),
          radius = engine.getRadiusOfElement(el),
          x,
          y,
          loc,
          numTries = 0,
          // try at most ten times.
          maxTries = 10;

      do {
        x = Math.random() * size[0] - 2*radius;
        y = Math.random() * size[1] - 2*radius;

        // findMinimimuPELocation will return false if minimization doesn't converge, in which case
        // try again from a different x, y
        loc = engine.findMinimumPELocation(el, x, y, 0, 0, charge);
        if (loc && model.addAtom(el, loc[0], loc[1], 0, 0, charge, 0, 0)) return true;
      } while (++numTries < maxTries);

      return false;
    },

    /**
      Adds a new atom with element 'el', charge 'charge', and velocity '[vx, vy]' to the model
      at position [x, y]. (Intended to be exposed as a script API method.)

      Adjusts (x,y) if needed so that the whole atom is within the walls of the container.

      Returns false and does not add the atom if the potential energy change of adding an *uncharged*
      atom of the specified element to the specified location would be positive (i.e, if the atom
      intrudes into the repulsive region of another atom.)

      Otherwise, returns true.
    */
    model.addAtom = function(el, x, y, vx, vy, charge, friction, pinned, visible, draggable) {
      var size      = model.size(),
          radius    = engine.getRadiusOfElement(el),
          newLength,
          i;

      if (visible == null)   visible   = model.NON_ENGINE_DEFAULT_VALUES.VISIBLE;
      if (draggable == null) draggable = model.NON_ENGINE_DEFAULT_VALUES.DRAGGABLE;

      // As a convenience to script authors, bump the atom within bounds
      if (x < radius) x = radius;
      if (x > size[0]-radius) x = size[0]-radius;
      if (y < radius) y = radius;
      if (y > size[1]-radius) y = size[1]-radius;

      // check the potential energy change caused by adding an *uncharged* atom at (x,y)
      if (engine.canPlaceAtom(el, x, y)) {

        i = engine.addAtom(el, x, y, vx, vy, charge, friction, pinned);
        copyEngineAtomReferences();

        // Extend the atoms arrays which the engine doesn't know about. This may seem duplicative,
        // or something we could ask the engine to do on our behalf, but it may make more sense when
        // you realize this is a temporary step until we modify the code further in order to maintain
        // the 'visible', 'draggable' propeties *only* in what is now being called the 'results' array
        newLength = atoms[model.INDICES.ELEMENT].length;

        if (atoms[model.INDICES.VISIBLE].length < newLength) {
          atoms[model.INDICES.VISIBLE]   = arrays.extend(atoms[model.INDICES.VISIBLE], newLength);
          atoms[model.INDICES.DRAGGABLE] = arrays.extend(atoms[model.INDICES.DRAGGABLE], newLength);
        }

        atoms[model.INDICES.VISIBLE][i]   = visible;
        atoms[model.INDICES.DRAGGABLE][i] = draggable;

        readModelState();
        dispatch.addAtom();

        return true;
      }
      // return false on failure
      return false;
    },

    /** Return the bounding box of the molecule containing atom 'atomIndex', with atomic radii taken
        into account.

       @returns an object with properties 'left', 'right', 'top', and 'bottom'. These are translated
       relative to the center of atom 'atomIndex', so that 'left' represents (-) the distance in nm
       between the leftmost edge and the center of atom 'atomIndex'.
    */
    model.getMoleculeBoundingBox = function(atomIndex) {

      var moleculeAtoms,
          i,
          x,
          y,
          r,
          top = -Infinity,
          left = Infinity,
          bottom = Infinity,
          right = -Infinity,
          cx,
          cy;

      moleculeAtoms = engine.getMoleculeAtoms(atomIndex);
      moleculeAtoms.push(atomIndex);

      for (i = 0; i < moleculeAtoms.length; i++) {
        x = atoms[model.INDICES.X][moleculeAtoms[i]];
        y = atoms[model.INDICES.Y][moleculeAtoms[i]];
        r = atoms[model.INDICES.RADIUS][moleculeAtoms[i]];

        if (x-r < left  ) left   = x-r;
        if (x+r > right ) right  = x+r;
        if (y-r < bottom) bottom = y-r;
        if (y+r > top   ) top    = y+r;
      }

      cx = atoms[model.INDICES.X][atomIndex];
      cy = atoms[model.INDICES.Y][atomIndex];

      return { top: top-cy, left: left-cx, bottom: bottom-cy, right: right-cx };
    },

    /**
        A generic method to set properties on a single existing atom.

        Example: setAtomProperties(3, {x: 5, y: 8, px: 0.5, charge: -1})

        This can optionally check the new location of the atom to see if it would
        overlap with another another atom (i.e. if it would increase the PE).

        This can also optionally apply the same dx, dy to any atoms in the same
        molecule (if x and y are being changed), and check the location of all
        the bonded atoms together.
      */
    model.setAtomProperties = function(i, props, checkLocation, moveMolecule) {
      var moleculeAtoms,
          dx, dy,
          new_x, new_y,
          j, jj,
          key,
          propName;

      if (moveMolecule) {
        moleculeAtoms = engine.getMoleculeAtoms(i);
        if (moleculeAtoms.length > 0) {
          dx = typeof props.x === "number" ? props.x - atoms[model.INDICES.X][i] : 0;
          dy = typeof props.y === "number" ? props.y - atoms[model.INDICES.Y][i] : 0;
          for (j = 0, jj=moleculeAtoms.length; j<jj; j++) {
            new_x = atoms[model.INDICES.X][moleculeAtoms[j]] + dx;
            new_y = atoms[model.INDICES.Y][moleculeAtoms[j]] + dy;
            if (!model.setAtomProperties(moleculeAtoms[j], {x: new_x, y: new_y}, checkLocation, false)) {
              return false;
            }
          }
        }
      }

      if (checkLocation) {
        var x  = typeof props.x === "number" ? props.x : atoms[model.INDICES.X][i],
            y  = typeof props.y === "number" ? props.y : atoms[model.INDICES.Y][i],
            el = typeof props.element === "number" ? props.y : atoms[model.INDICES.ELEMENT][i];

        if (!engine.canPlaceAtom(el, x, y, i)) {
          return false;
        }
      }

      // Actually set properties
      for (key in props) {
        if (props.hasOwnProperty(key)) {
          propName = key.toUpperCase();
          if (propName) atoms[model.INDICES[propName]][i] = props[key];
        }
      }

      readModelState();
      return true;
    };

    model.getAtomProperties = function(i) {
      var p,
          props = {};
      for (p = 0; p < model.ATOM_PROPERTY_LIST.length; p++) {
        props[model.ATOM_PROPERTY_LIST[p].toLowerCase()] = atoms[p][i];
      }
      return props;
    };

    model.setElementProperties = function(i, props) {
      engine.setElementProperties(i, props);
      readModelState();
    };

    model.getElementProperties = function(i) {
      var p,
          props = {};
      for (p = 0; p < model.ELEMENT_PROPERTY_LIST.length; p++) {
        props[model.ELEMENT_PROPERTY_LIST[p].toLowerCase()] = engine.elements[p][i];
      }
      return props;
    };

    model.setRadialBondProperties = function(i, props) {
      var key, p;
      for (key in props) {
        if (props.hasOwnProperty(key)) {
          p = model.RADIAL_BOND_INDICES[key.toUpperCase()];
          radialBonds[p][i] = props[key];
        }
      }
      readModelState();
    };

    model.getRadialBondProperties = function(i) {
      var p,
          props = {};
      for (p = 0; p < model.RADIAL_BOND_PROPERTY_LIST.length; p++) {
        props[model.RADIAL_BOND_PROPERTY_LIST[p].toLowerCase()] = radialBonds[p][i];
      }
      return props;
    };

    model.setAngularBondProperties = function(i, props) {
      var key, p;
      for (key in props) {
        if (props.hasOwnProperty(key)) {
          p = model.ANGULAR_BOND_INDICES[key.toUpperCase()];
          angularBonds[p][i] = props[key];
        }
      }
      readModelState();
    };

    model.getAngularBondProperties = function(i) {
      var p,
          props = {};
      for (p = 0; p < model.ANGULAR_BOND_PROPERTY_LIST.length; p++) {
        props[model.ANGULAR_BOND_PROPERTY_LIST[p].toLowerCase()] = angularBonds[p][i];
      }
      return props;
    };

    /** A "spring force" is used to pull atom `atomIndex` towards (x, y). We expect this to be used
       to drag atoms interactively using the mouse cursor (in which case (x,y) is the mouse cursor
       location.) In these cases, use the liveDragStart, liveDrag, and liveDragEnd methods instead
       of this one.

       The optional springConstant parameter (measured in eV/nm^2) is used to adjust the strength
       of the "spring" pulling the atom toward (x, y)

       @returns ID (index) of the spring force among all spring forces
    */
    model.addSpringForce = function(atomIndex, x, y, springConstant) {
      if (springConstant == null) springConstant = 500;
      return engine.addSpringForce(atomIndex, x, y, springConstant);
    };

    /**
      Update the (x, y) position of a spring force.
    */
    model.updateSpringForce = function(springForceIndex, x, y) {
      engine.updateSpringForce(springForceIndex, x, y);
    };

    /**
      Remove a spring force.
    */
    model.removeSpringForce = function(springForceIndex) {
      engine.removeSpringForce(springForceIndex);
    };

    /**
      Implements dragging of an atom in a running model, by creating a spring force that pulls the
      atom towards the mouse cursor position (x, y) and damping the resulting motion by temporarily
      adjusting the friction of the dragged atom.
    */
    model.liveDragStart = function(atomIndex, x, y) {
      if (x == null) x = atoms[model.INDICES.X][atomIndex];
      if (y == null) y = atoms[model.INDICES.Y][atomIndex];

      liveDragSavedFriction = atoms[model.INDICES.FRICTION][atomIndex];
      atoms[model.INDICES.FRICTION][atomIndex] = model.LIVE_DRAG_FRICTION;

      liveDragSpringForceIndex = model.addSpringForce(atomIndex, x, y, 500);
    };

    /**
      Updates the drag location after liveDragStart
    */
    model.liveDrag = function(x, y) {
      model.updateSpringForce(liveDragSpringForceIndex, x, y);
    };

    /**
      Cancels a live drag by removing the spring force that is pulling the atom, and restoring its
      original friction property.
    */
    model.liveDragEnd = function() {
      var atomIndex = engine.springForceAtomIndex(liveDragSpringForceIndex);

      atoms[model.INDICES.FRICTION][atomIndex] = liveDragSavedFriction;
      model.removeSpringForce(liveDragSpringForceIndex);
    };

    // return a copy of the array of speeds
    model.get_speed = function() {
      return arrays.copy(engine.speed, []);
    };

    model.get_rate = function() {
      return average_rate();
    };

    model.is_stopped = function() {
      return stopped;
    };

    model.set_lennard_jones_forces = function(lj) {
     lennard_jones_forces = lj;
     engine.useLennardJonesInteraction(lj);
    };

    model.set_coulomb_forces = function(cf) {
     coulomb_forces = cf;
     engine.useCoulombInteraction(cf);
    };

    model.get_atoms = function() {
      return atoms;
    };

    model.get_results = function() {
      return results;
    };

    model.get_radial_bond_results = function() {
      return radialBondResults;
    };

    model.get_num_atoms = function() {
      return engine.getNumberOfAtoms();
    };

    model.get_obstacles = function() {
      return obstacles;
    };

    model.get_radial_bonds = function() {
      return radialBonds;
    };

    model.get_vdw_pairs = function() {
      if (vdwPairs) engine.updateVdwPairsArray();
      return vdwPairs;
    };

    model.on = function(type, listener) {
      dispatch.on(type, listener);
      return model;
    };

    model.tickInPlace = function() {
      dispatch.tick();
      return model;
    };

    model.tick = function(num, opts) {
      if (!arguments.length) num = 1;

      var dontDispatchTickEvent = opts && opts.dontDispatchTickEvent || false,
          i = -1;

      while(++i < num) {
        tick(null, dontDispatchTickEvent);
      }
      return model;
    };

    model.relax = function() {
      engine.relaxToTemperature();
      return model;
    };

    model.start = function() {
      return model.resume();
    };

    model.resume = function() {
      stopped = false;

      d3.timer(function timerTick(elapsedTime) {
        // Cancel the timer and refuse to to step the model, if the model is stopped.
        // This is necessary because there is no direct way to cancel a d3 timer.
        // See: https://github.com/mbostock/d3/wiki/Transitions#wiki-d3_timer)
        if (stopped) return true;

        tick(elapsedTime, false);
        return false;
      });

      dispatch.play();
      return model;
    };

    model.stop = function() {
      stopped = true;
      dispatch.stop();
      return model;
    };

    model.ke = function() {
      return modelOutputState.KE;
    };

    model.ave_ke = function() {
      return modelOutputState.KE / model.get_num_atoms();
    };

    model.pe = function() {
      return modelOutputState.PE;
    };

    model.ave_pe = function() {
      return modelOutputState.PE / model.get_num_atoms();
    };

    model.speed = function() {
      return average_speed();
    };

    model.pressure = function() {
      return container_pressure();
    };

    model.temperature = function(x) {
      if (!arguments.length) return temperature;
      set_temperature(x);
      return model;
    };

    model.size = function(x) {
      if (!arguments.length) return engine.getSize();
      engine.setSize(x);
      return model;
    };

    model.set = function(hash) {
      set_properties(hash);
    };

    model.get = function(property) {
      return properties[property];
    };

    /**
      Set the 'model_listener' function, which is called on tick events.
    */
    model.setModelListener = function(listener) {
      model_listener = listener;
      model.on('tick', model_listener);
      return model;
    };

    // Add a listener that will be notified any time any of the properties
    // in the passed-in array of properties is changed.
    // This is a simple way for views to update themselves in response to
    // properties being set on the model object.
    // Observer all properties with addPropertiesListener(["all"], callback);
    model.addPropertiesListener = function(properties, callback) {
      var i, ii, prop;
      for (i=0, ii=properties.length; i<ii; i++){
        prop = properties[i];
        if (!listeners[prop]) {
          listeners[prop] = [];
        }
        listeners[prop].push(callback);
      }
    };

    model.serialize = function(includeAtoms) {
      var propCopy = $.extend({}, properties);
      if (includeAtoms) {
        propCopy.atoms = serializeAtoms();
      }
      if (elements) {
        propCopy.elements = elements;
      }
      propCopy.width = width;
      propCopy.height = height;
      return propCopy;
    };

    return model;
  };
});

define('cs',{load: function(id){throw new Error("Dynamic load not allowed: " + id);}});
(function() {

  define('cs!common/components/model_controller_component',['require','common/console'],function(require) {
    var ModelControllerComponent;
    require('common/console');
    return ModelControllerComponent = (function() {

      function ModelControllerComponent(svg_element, playable, xpos, ypos, scale) {
        var _this = this;
        this.svg_element = svg_element;
        this.playable = playable != null ? playable : null;
        this.width = 200;
        this.height = 34;
        this.xpos = xpos;
        this.ypos = ypos;
        this.scale = scale || 1;
        this.unit_width = this.width / 9;
        this.vertical_padding = (this.height - this.unit_width) / 2;
        this.stroke_width = this.unit_width / 10;
        this.init_view();
        this.setup_buttons();
        if (this.playable.isPlaying()) {
          this.hide(this.play);
        } else {
          this.hide(this.stop);
        }
        model.on('play', function() {
          return _this.update_ui();
        });
        model.on('stop', function() {
          return _this.update_ui();
        });
      }

      ModelControllerComponent.prototype.offset = function(offset) {
        return offset * (this.unit_width * 2) + this.unit_width;
      };

      ModelControllerComponent.prototype.setup_buttons = function() {};

      ModelControllerComponent.prototype.make_button = function(_arg) {
        var action, art, art2, button_bg, button_group, button_highlight, offset, point, point_set, points, points_string, type, x, y, _i, _j, _len, _len1,
          _this = this;
        action = _arg.action, offset = _arg.offset, type = _arg.type, point_set = _arg.point_set;
        if (type == null) {
          type = "svg:polyline";
        }
        if (point_set == null) {
          point_set = this.icon_shapes[action];
        }
        offset = this.offset(offset);
        button_group = this.group.append('svg:g');
        button_group.attr("class", "component playbacksvgbutton").attr('x', offset).attr('y', this.vertical_padding).attr('width', this.unit_width).attr('height', this.unit_width * 2).attr('style', 'fill: #cccccc');
        button_bg = button_group.append('rect');
        button_bg.attr('class', 'bg').attr('x', offset).attr('y', this.vertical_padding / 3).attr('width', this.unit_width * 2).attr('height', this.unit_width * 1.5).attr('rx', '0');
        for (_i = 0, _len = point_set.length; _i < _len; _i++) {
          points = point_set[_i];
          art = button_group.append(type);
          art.attr('class', "" + action + " button-art");
          points_string = "";
          for (_j = 0, _len1 = points.length; _j < _len1; _j++) {
            point = points[_j];
            x = offset + 10 + point['x'] * this.unit_width;
            y = this.vertical_padding / .75 + point['y'] * this.unit_width;
            points_string = points_string + (" " + x + "," + y);
            art.attr('points', points_string);
          }
          if (action === 'stop') {
            art2 = button_group.append('rect');
            art2.attr('class', 'pause-center').attr('x', x + this.unit_width / 3).attr('y', this.vertical_padding / .75 - 1).attr('width', this.unit_width / 3).attr('height', this.unit_width + 2);
          }
        }
        button_highlight = button_group.append('rect');
        button_highlight.attr('class', 'highlight').attr('x', offset + 1).attr('y', this.vertical_padding / 1.85).attr('width', this.unit_width * 2 - 2).attr('height', this.unit_width / 1.4).attr('rx', '0');
        button_group.on('click', function() {
          return _this.action(action);
        });
        return button_group;
      };

      ModelControllerComponent.prototype.action = function(action) {
        console.log("running " + action + " ");
        if (this.playable) {
          switch (action) {
            case 'play':
              this.playable.play();
              break;
            case 'stop':
              this.playable.stop();
              break;
            case 'forward':
              this.playable.forward();
              break;
            case 'back':
              this.playable.back();
              break;
            case 'seek':
              this.playable.seek(1);
              break;
            case 'reset':
              this.playable.reset();
              break;
            default:
              console.log("cant find action for " + action);
          }
        } else {
          console.log("no @playable defined");
        }
        return this.update_ui();
      };

      ModelControllerComponent.prototype.init_view = function() {
        this.svg = this.svg_element.append("svg:svg").attr("class", "component model-controller playbacksvg").attr("x", this.xpos).attr("y", this.ypos);
        return this.group = this.svg.append("g").attr("transform", "scale(" + this.scale + "," + this.scale + ")").attr("width", this.width).attr("height", this.height);
      };

      ModelControllerComponent.prototype.position = function(xpos, ypos, scale) {
        this.xpos = xpos;
        this.ypos = ypos;
        this.scale = scale || 1;
        this.svg.attr("x", this.xpos).attr("y", this.ypos);
        return this.group.attr("transform", "scale(" + this.scale + "," + this.scale + ")").attr("width", this.width).attr("height", this.height);
      };

      ModelControllerComponent.prototype.update_ui = function() {
        if (this.playable) {
          if (this.playable.isPlaying()) {
            this.hide(this.play);
            return this.show(this.stop);
          } else {
            this.hide(this.stop);
            return this.show(this.play);
          }
        }
      };

      ModelControllerComponent.prototype.hide = function(thing) {
        return thing.style('visibility', 'hidden');
      };

      ModelControllerComponent.prototype.show = function(thing) {
        return thing.style('visibility', 'visible');
      };

      ModelControllerComponent.prototype.icon_shapes = {
        play: [
          [
            {
              x: 0,
              y: 0
            }, {
              x: 1,
              y: 0.5
            }, {
              x: 0,
              y: 1
            }
          ]
        ],
        stop: [
          [
            {
              x: 0,
              y: 0
            }, {
              x: 1,
              y: 0
            }, {
              x: 1,
              y: 1
            }, {
              x: 0,
              y: 1
            }, {
              x: 0,
              y: 0
            }
          ]
        ],
        reset: [
          [
            {
              x: 1,
              y: 0
            }, {
              x: 0.3,
              y: 0.5
            }, {
              x: 1,
              y: 1
            }
          ], [
            {
              x: 0,
              y: 0
            }, {
              x: 0.3,
              y: 0
            }, {
              x: 0.3,
              y: 1
            }, {
              x: 0,
              y: 1
            }, {
              x: 0,
              y: 0
            }
          ]
        ],
        back: [
          [
            {
              x: 0.5,
              y: 0
            }, {
              x: 0,
              y: 0.5
            }, {
              x: 0.5,
              y: 1
            }
          ], [
            {
              x: 1,
              y: 0
            }, {
              x: 0.5,
              y: 0.5
            }, {
              x: 1,
              y: 1
            }
          ]
        ],
        forward: [
          [
            {
              x: 0.5,
              y: 0
            }, {
              x: 1,
              y: 0.5
            }, {
              x: 0.5,
              y: 1
            }
          ], [
            {
              x: 0,
              y: 0
            }, {
              x: 0.5,
              y: 0.5
            }, {
              x: 0,
              y: 1
            }
          ]
        ]
      };

      return ModelControllerComponent;

    })();
  });

}).call(this);

(function() {
  var __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  define('cs!common/components/play_reset_svg',['require','cs!common/components/model_controller_component'],function(require) {
    var ModelControllerComponent, PlayResetComponentSVG;
    ModelControllerComponent = require('cs!common/components/model_controller_component');
    return PlayResetComponentSVG = (function(_super) {

      __extends(PlayResetComponentSVG, _super);

      function PlayResetComponentSVG() {
        return PlayResetComponentSVG.__super__.constructor.apply(this, arguments);
      }

      PlayResetComponentSVG.prototype.setup_buttons = function() {
        this.reset = this.make_button({
          action: 'reset',
          offset: 0
        });
        this.play = this.make_button({
          action: 'play',
          offset: 1
        });
        return this.stop = this.make_button({
          action: 'stop',
          offset: 1
        });
      };

      return PlayResetComponentSVG;

    })(ModelControllerComponent);
  });

}).call(this);

(function() {
  var __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  define('cs!common/components/play_only_svg',['require','cs!common/components/model_controller_component'],function(require) {
    var ModelControllerComponent, PlayOnlyComponentSVG;
    ModelControllerComponent = require('cs!common/components/model_controller_component');
    return PlayOnlyComponentSVG = (function(_super) {

      __extends(PlayOnlyComponentSVG, _super);

      function PlayOnlyComponentSVG() {
        return PlayOnlyComponentSVG.__super__.constructor.apply(this, arguments);
      }

      PlayOnlyComponentSVG.prototype.setup_buttons = function() {
        this.play = this.make_button({
          action: 'play',
          offset: 0
        });
        return this.stop = this.make_button({
          action: 'stop',
          offset: 0
        });
      };

      return PlayOnlyComponentSVG;

    })(ModelControllerComponent);
  });

}).call(this);

(function() {
  var __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  define('cs!common/components/playback_svg',['require','cs!common/components/model_controller_component'],function(require) {
    var ModelControllerComponent, PlaybackComponentSVG;
    ModelControllerComponent = require('cs!common/components/model_controller_component');
    return PlaybackComponentSVG = (function(_super) {

      __extends(PlaybackComponentSVG, _super);

      function PlaybackComponentSVG() {
        return PlaybackComponentSVG.__super__.constructor.apply(this, arguments);
      }

      PlaybackComponentSVG.prototype.setup_buttons = function() {
        this.reset = this.make_button({
          action: 'reset',
          offset: 0
        });
        this.back = this.make_button({
          action: 'back',
          offset: 1
        });
        this.play = this.make_button({
          action: 'play',
          offset: 2
        });
        this.stop = this.make_button({
          action: 'stop',
          offset: 2
        });
        return this.forward = this.make_button({
          action: 'forward',
          offset: 3
        });
      };

      return PlaybackComponentSVG;

    })(ModelControllerComponent);
  });

}).call(this);

/*globals define: false, $: false, model: false */
// ------------------------------------------------------------
//
//   Screen Layout
//
// ------------------------------------------------------------

define('common/layout/layout',['require'],function (require) {

  var layout = { version: "0.0.1" };

  layout.selection = "";

  layout.display = {};

  layout.canonical = {
    width:  1280,
    height: 800
  };

  layout.regular_display = false;

  layout.not_rendered = true;
  layout.fontsize = false;
  layout.cancelFullScreen = false;
  layout.screen_factor = 1;
  layout.checkbox_factor = 1.1;
  layout.checkbox_scale = 1.1;
  layout.fullScreenRender = false;

  layout.canonical.width  = 1280;
  layout.canonical.height = 800;

  layout.getDisplayProperties = function(obj) {
    if (!arguments.length) {
      obj = {};
    }
    obj.screen = {
        width:  screen.width,
        height: screen.height
    };
    obj.client = {
        width:  document.body.clientWidth,
        height: document.body.clientHeight
    };
    obj.window = {
        width:  $(window).width(),
        height: $(window).height()
    };
    obj.page = {
        width: layout.getPageWidth(),
        height: layout.getPageHeight()
    };
    obj.screen_factor_width  = obj.window.width / layout.canonical.width;
    obj.screen_factor_height = obj.window.height / layout.canonical.height;
    obj.emsize = Math.max(obj.screen_factor_width * 1.1, obj.screen_factor_height);
    return obj;
  };

  layout.setBodyEmsize = function() {
    var emsize;
    if (!layout.display) {
      layout.display = layout.getDisplayProperties();
    }
    emsize = Math.min(layout.display.screen_factor_width * 1.2, layout.display.screen_factor_height * 1.2);
    $('body').css('font-size', emsize + 'em');
  };

  layout.getVizProperties = function(obj) {
    var $viz = $('#viz');

    if (!arguments.length) {
      obj = {};
    }
    obj.width = $viz.width();
    obj.height = $viz.height();
    obj.screen_factor_width  = obj.width / layout.canonical.width;
    obj.screen_factor_height = obj.height / layout.canonical.height;
    obj.emsize = Math.min(obj.screen_factor_width * 1.1, obj.screen_factor_height);
    return obj;
  };

  layout.setVizEmsize = function() {
    var emsize,
        $viz = $('#viz');

    if (!layout.vis) {
      layout.vis = layout.getVizProperties();
    }
    emsize = Math.min(layout.viz.screen_factor_width * 1.2, layout.viz.screen_factor_height * 1.2);
    $viz.css('font-size', emsize + 'em');
  };

  layout.screenEqualsPage = function() {
    return ((layout.display.screen.width  === layout.display.page.width) ||
            (layout.display.screen.height === layout.display.page.height));
  };

  layout.checkForResize = function() {
    if ((layout.display.screen.width  !== screen.width) ||
        (layout.display.screen.height !== screen.height) ||
        (layout.display.window.width  !== document.width) ||
        (layout.display.window.height !== document.height)) {
      layout.setupScreen();
    }
  };

  layout.views = {};

  layout.addView = function(type, view) {
    if (!layout.views[type]) {
      layout.views[type] = [];
    }
    layout.views[type].push(view);
  };

  layout.setView = function(type, viewArray) {
    layout.views[type] = viewArray;
  };

  layout.setupScreen = function(event) {
    var emsize,
        viewLists  = layout.views,
        fullscreen = document.fullScreen ||
                     document.webkitIsFullScreen ||
                     document.mozFullScreen;

    if (event && event.forceRender) {
      layout.not_rendered = true;
    }

    layout.display = layout.getDisplayProperties();
    layout.viz = layout.getVizProperties();

    if (!layout.regular_display) {
      layout.regular_display = layout.getDisplayProperties();
    }


    if(fullscreen || layout.fullScreenRender  || layout.screenEqualsPage()) {
      layout.fullScreenRender = true;
      layout.screen_factor_width  = layout.display.page.width / layout.canonical.width;
      layout.screen_factor_height = layout.display.page.height / layout.canonical.height;
      layout.screen_factor = layout.screen_factor_height;
      layout.checkbox_factor = Math.max(0.8, layout.checkbox_scale * layout.screen_factor);
      $('body').css('font-size', layout.screen_factor + "em");
      layout.not_rendered = true;
      switch (layout.selection) {

        // fluid layout
        case "simple-screen":
        if (layout.not_rendered) {
          setupSimpleFullScreenMoleculeContainer();
        }
        break;

        // only fluid on page load (and when resizing on trnasition to and from full-screen)
        case "simple-static-screen":
        if (layout.not_rendered) {
          setupSimpleFullScreenMoleculeContainer();
        }
        break;

        // fluid (but normally the iframe doesn't expose the full-screen action)
        case "simple-iframe":
        setupSimpleFullScreenMoleculeContainer();
        setupFullScreenDescriptionRight();
        break;

        // fluid layout
        case "compare-screen":
        emsize = Math.min(layout.screen_factor_width * 1.1, layout.screen_factor_height);
        $('body').css('font-size', emsize + "em");
        compareScreen();
        layout.not_rendered = false;
        break;

        // only fluid on page load (and when resizing on trnasition to and from full-screen)
        default:
        if (layout.not_rendered) {
          setupFullScreen();
        }
        break;
      }
    } else {
      if (layout.cancelFullScreen || layout.fullScreenRender) {
        layout.cancelFullScreen = false;
        layout.fullScreenRender = false;
        layout.not_rendered = true;
        layout.regular_display = layout.previous_display;
      } else {
        layout.regular_display = layout.getDisplayProperties();
      }
      layout.screen_factor_width  = layout.display.page.width / layout.canonical.width;
      layout.screen_factor_height = layout.display.page.height / layout.canonical.height;
      layout.screen_factor = layout.screen_factor_height;
      layout.checkbox_factor = Math.max(0.8, layout.checkbox_scale * layout.screen_factor);
      switch (layout.selection) {

        // fluid layout
        case "simple-screen":
        emsize = Math.min(layout.screen_factor_width * 1.1, layout.screen_factor_height);
        $('body').css('font-size', emsize + 'em');
        simpleScreen();
        break;

        // only fluid on page load (and when resizing on trnasition to and from full-screen)
        case "simple-static-screen":
        if (layout.not_rendered) {
          emsize = Math.min(layout.screen_factor_width * 1.1, layout.screen_factor_height);
          $('body').css('font-size', emsize + 'em');
          simpleStaticScreen();
          layout.not_rendered = false;
        }
        break;

        // fluid layout
        case "simple-iframe":
        emsize = Math.min(layout.screen_factor_width * 1.5, layout.screen_factor_height);
        $('body').css('font-size', emsize + 'em');
        setupSimpleIFrameScreen();
        break;

        // only fluid on page load (and when resizing on trnasition to and from full-screen)
        case "full-static-screen":
        if (layout.not_rendered) {
          emsize = Math.min(layout.screen_factor_width * 1.5, layout.screen_factor_height);
          $('body').css('font-size', emsize + 'em');
          regularScreen();
          layout.not_rendered = false;
        }
        break;

        // fluid layout
        case "compare-screen":
        emsize = Math.min(layout.screen_factor_width * 1.1, layout.screen_factor_height);
        $('body').css('font-size', emsize + 'em');
        compareScreen();
        break;

        // only fluid on page load (and when resizing on trnasition to and from full-screen)
        case "interactive":
        if (layout.not_rendered) {
          layout.setVizEmsize();
          setupInteractiveScreen();
          layout.not_rendered = false;
        }
        break;

        // like simple-iframe, but all component position definitions are set from properties
        case "interactive-iframe":
        layout.setBodyEmsize();
        setupInteractiveIFrameScreen();
        break;

        default:
        layout.setVizEmsize();
        setupRegularScreen();
        break;
      }
      layout.regular_display = layout.getDisplayProperties();
    }
    if (layout.transform) {
      $('input[type=checkbox]').css(layout.transform, 'scale(' + layout.checkbox_factor + ',' + layout.checkbox_factor + ')');
    }

    if (layout.temperature_control_checkbox) {
      model.addPropertiesListener(["temperature_control"], layout.temperatureControlUpdate);
      layout.temperatureControlUpdate();
    }

    var benchmarks_table = document.getElementById("benchmarks-table");
    if (benchmarks_table) {
      benchmarks_table.style.display = "none";
    }

    //
    // Regular Screen Layout
    //
    function setupRegularScreen() {
      var i, width, height, mcsize,
          rightHeight, rightHalfWidth, rightQuarterWidth,
          widthToPageRatio, modelAspectRatio,
          pageWidth = layout.display.page.width,
          pageHeight = layout.display.page.height;

      mcsize = viewLists.moleculeContainers[0].scale();
      modelAspectRatio = mcsize[0] / mcsize[1];
      widthToPageRatio = mcsize[0] / pageWidth;
      width = pageWidth * 0.40;
      height = width * 1/modelAspectRatio;
      if (height > pageHeight * 0.55) {
        height = pageHeight * 0.55;
        width = height * modelAspectRatio;
      }
      // HACK that will normally only work with one moleculeContainer
      // or if all the moleculeContainers end up the same width
      i = -1;  while(++i < viewLists.moleculeContainers.length) {
        viewLists.moleculeContainers[i].resize(width, height);
      }
      rightQuarterWidth = (pageWidth - width) * 0.35;
      rightHeight = height * 0.52;
      i = -1;  while(++i < viewLists.potentialCharts.length) {
        viewLists.potentialCharts[i].resize(rightQuarterWidth, rightHeight);
      }
      i = -1;  while(++i < viewLists.speedDistributionCharts.length) {
        viewLists.speedDistributionCharts[i].resize(rightQuarterWidth, rightHeight);
      }
      rightHalfWidth = (pageWidth - width) * 0.72;
      rightHeight = height * 0.76;
      i = -1;  while(++i < viewLists.energyCharts.length) {
        viewLists.energyCharts[i].resize(rightHalfWidth, rightHeight);
      }
    }

    //
    // Interactive Screen Layout
    //
    function setupInteractiveScreen() {
      var i, width, height, mcsize,
          modelWidth,
          modelHeight,
          modelDimensions,
          modelAspectRatio,
          modelWidthFactor,
          viewSizes = {},
          containerWidth = layout.viz.width,
          containerHeight = layout.viz.height;

      modelDimensions = viewLists.moleculeContainers[0].scale();
      modelAspectRatio = modelDimensions[0] / modelDimensions[1];
      modelWidthFactor = 0.70;
      if (viewLists.thermometers) {
        modelWidthFactor -= 0.10;
      }
      if (viewLists.energyGraphs) {
        modelWidthFactor -= 0.45;
      }
      modelWidth = containerWidth * modelWidthFactor;
      modelHeight = modelWidth / modelAspectRatio;
      if (modelHeight > containerHeight * 0.60) {
        modelHeight = containerHeight * 0.60;
        modelWidth = modelHeight * modelAspectRatio;
      }
      viewSizes.moleculeContainers = [modelWidth, modelHeight];
      if (viewLists.energyGraphs) {
        viewSizes.energyGraphs = [containerWidth * 0.40, modelHeight * 1.25];
      }
      for (viewType in viewLists) {
        if (viewLists.hasOwnProperty(viewType) && viewLists[viewType].length) {
          i = -1;  while(++i < viewLists[viewType].length) {
            if (viewSizes[viewType]) {
              viewLists[viewType][i].resize(viewSizes[viewType][0], viewSizes[viewType][1]);
            } else {
              viewLists[viewType][i].resize();
            }
          }
        }
      }
    }

    //
    // Interactive iframe Screen Layout
    //
    function setupInteractiveIFrameScreen() {
      var i,
          modelWidth,
          modelHeight,
          modelDimensions,
          modelAspectRatio,
          modelWidthFactor,
          modelPaddingFactor,
          modelHeightFactor = 0.85,
          viewSizes = {},
          containerWidth = $(window).width(),
          containerHeight = $(window).height(),
          mcWidth = $('#molecule-container').width();

      modelDimensions = viewLists.moleculeContainers[0].scale();
      modelAspectRatio = modelDimensions[2] / modelDimensions[3];
      modelWidthFactor = 0.85;

      modelWidthPaddingFactor = modelDimensions[0]/modelDimensions[2] - 1.05;
      modelWidthFactor -= modelWidthPaddingFactor;

      modelHeightPaddingFactor = modelDimensions[1]/modelDimensions[3] - 1.05;
      modelHeightFactor -= modelHeightPaddingFactor;
      if (viewLists.thermometers) {
        modelWidthFactor -= 0.05;
      }
      if (viewLists.energyGraphs) {
        modelWidthFactor -= 0.35;
      }
      viewLists.bottomItems = $('#bottom').children().length;
      if (viewLists.bottomItems) {
        modelHeightFactor -= ($('#bottom').height() * 0.0025);
      }
      modelWidth = containerWidth * modelWidthFactor;
      modelHeight = modelWidth / modelAspectRatio;
      if (modelHeight > containerHeight * modelHeightFactor) {
        modelHeight = containerHeight * modelHeightFactor;
        modelWidth = modelHeight * modelAspectRatio;
      }
      viewSizes.moleculeContainers = [modelWidth, modelHeight];
      if (viewLists.energyGraphs) {
        viewSizes.energyGraphs = [containerWidth * 0.40, modelHeight * 1.2];
      }
      for (viewType in viewLists) {
        if (viewLists.hasOwnProperty(viewType) && viewLists[viewType].length) {
          i = -1;  while(++i < viewLists[viewType].length) {
            if (viewSizes[viewType]) {
              viewLists[viewType][i].resize(viewSizes[viewType][0], viewSizes[viewType][1]);
            } else {
              viewLists[viewType][i].resize();
            }
          }
        }
      }
    }



    //
    // Compare Screen Layout
    //
    function compareScreen() {
      var i, width, height, mcsize, modelAspectRatio,
          pageWidth = layout.display.page.width,
          pageHeight = layout.display.page.height;

      mcsize = viewLists.moleculeContainers[0].scale();
      modelAspectRatio = mcsize[0] / mcsize[1];
      width = pageWidth * 0.40;
      height = width * 1/modelAspectRatio;
      // HACK that will normally only work with one moleculeContainer
      // or if all the moleculeContainers end up the same width
      i = -1;  while(++i < viewLists.moleculeContainers.length) {
        viewLists.moleculeContainers[i].resize(width, height);
      }
      if (viewLists.appletContainers) {
        i = -1;  while(++i < viewLists.appletContainers.length) {
          viewLists.appletContainers[i].resize(width, height);
        }
      }
    }

    //
    // Full Screen Layout
    //
    function setupFullScreen() {
      var i, width, height, mcsize,
          rightHeight, rightHalfWidth, rightQuarterWidth,
          widthToPageRatio, modelAspectRatio,
          pageWidth = layout.display.page.width,
          pageHeight = layout.display.page.height;

      mcsize = viewLists.moleculeContainers[0].scale();
      modelAspectRatio = mcsize[0] / mcsize[1];
      widthToPageRatio = mcsize[0] / pageWidth;
      width = pageWidth * 0.46;
      height = width * 1/modelAspectRatio;
      if (height > pageHeight*0.70) {
        height = pageHeight * 0.70;
        width = height * modelAspectRatio;
      }
      i = -1;  while(++i < viewLists.moleculeContainers.length) {
        viewLists.moleculeContainers[i].resize(width, height);
      }
      rightQuarterWidth = (pageWidth - width) * 0.41;
      rightHeight = height * 0.42;
      i = -1;  while(++i < viewLists.potentialCharts.length) {
        viewLists.potentialCharts[i].resize(rightQuarterWidth, rightHeight);
      }
      i = -1;  while(++i < viewLists.speedDistributionCharts.length) {
        viewLists.speedDistributionCharts[i].resize(rightQuarterWidth, rightHeight);
      }
      rightHalfWidth = (pageWidth - width) * 0.86;
      rightHeight = height * 0.57;
      i = -1;  while(++i < viewLists.energyCharts.length) {
        viewLists.energyCharts[i].resize(rightHalfWidth, rightHeight);
      }
    }

    //
    // Simple Screen Layout
    //
    function simpleScreen() {
      var i, width, height, mcsize, widthToPageRatio;

      height = Math.min(layout.display.page.height * 0.45, layout.display.page.width * 0.50);
      viewLists.moleculeContainers[0].resize(height, height);
      mcsize = viewLists.moleculeContainers[0].scale();
      widthToPageRatio = mcsize[0] / layout.display.page.width;
      if (widthToPageRatio > 0.50) {
        height *= (0.50 / widthToPageRatio);
        viewLists.moleculeContainers[0].resize(height, height);
      }
      viewLists.thermometers[0].resize();
    }

    //
    // Simple Static Screen Layout
    //
    function simpleStaticScreen() {
      var i, width, height, mcsize, widthToPageRatio,
          description_right = document.getElementById("description-right");

      height = Math.min(layout.display.page.height * 0.65, layout.display.page.width * 0.50);
      viewLists.moleculeContainers[0].resize(height, height);
      mcsize = viewLists.moleculeContainers[0].scale();
      widthToPageRatio = mcsize[0] / layout.display.page.width;
      if (widthToPageRatio > 0.50) {
        height *= (0.50 / widthToPageRatio);
        viewLists.moleculeContainers[0].resize(height, height);
        // if (description_right !== null) {
        //   description_right.style.width = (layout.display.page.width - mcsize[0]) * 0.50 + "px";
        // }
      }
      viewLists.thermometers[0].resize();
    }

    //
    // Simple iframe Screen Layout
    //
    function setupSimpleIFrameScreen() {
      var i, width, height, mcsize,
          rightHeight, rightHalfWidth, rightQuarterWidth,
          widthToPageRatio, modelAspectRatio,
          pageWidth = layout.display.page.width,
          pageHeight = layout.display.page.height;

      mcsize = viewLists.moleculeContainers[0].scale();
      modelAspectRatio = mcsize[0] / mcsize[1];
      widthToPageRatio = mcsize[0] / pageWidth;
      width = pageWidth * 0.70;
      height = width * 1/modelAspectRatio;
      if (height > pageHeight * 0.70) {
        height = pageHeight * 0.70;
        width = height * modelAspectRatio;
      }
      viewLists.moleculeContainers[0].resize(width, height);
      mcsize = viewLists.moleculeContainers[0].scale();
      viewLists.thermometers[0].resize();
    }

    //
    // Simple Full Screen Layout
    //
    function setupSimpleFullScreenMoleculeContainer() {
      var i, width, height, mcsize,
          rightHeight, rightHalfWidth, rightQuarterWidth,
          widthToPageRatio, modelAspectRatio,
          pageWidth = layout.display.page.width,
          pageHeight = layout.display.page.height;

      mcsize = viewLists.moleculeContainers[0].scale();
      modelAspectRatio = mcsize[0] / mcsize[1];
      widthToPageRatio = mcsize[0] / pageWidth;
      width = pageWidth * 0.60;
      height = width * 1/modelAspectRatio;
      if (height > pageHeight * 0.60) {
        height = pageHeight * 0.60;
        width = height * modelAspectRatio;
      }
      viewLists.moleculeContainers[0].resize(width, height);
    }

    function setupFullScreenDescriptionRight() {
      var description_right = document.getElementById("description-right");
      if (description_right !== null) {
        // description_right.style.width = layout.display.window.width * 0.30 +"px";
      }
    }
  };

  layout.getStyleForSelector = function(selector) {
    var rules, rule_lists = document.styleSheets;
    for(var i = 0; i < rule_lists.length; i++) {
      if (rule_lists[i]) {
        try {
           rules = rule_lists[i].rules || rule_lists[i].cssRules;
           if (rules) {
             for(var j = 0; j < rules.length; j++) {
               if (rules[j].selectorText == selector) {
                 return rules[j];
               }
             }
           }
        }
        catch (e) {
        }
      }
    }
    return false;
  };

  // Adapted from getPageSize() by quirksmode.com
  layout.getPageHeight = function() {
    var windowHeight;
    if (window.innerHeight) { // all except Explorer
      windowHeight = window.innerHeight;
    } else if (document.documentElement && document.documentElement.clientHeight) {
      windowHeight = document.documentElement.clientHeight;
    } else if (document.body) { // other Explorers
      windowHeight = layout.display.window.height;
    }
    return windowHeight;
  };

  layout.getPageWidth = function() {
    var windowWidth;
    if (window.innerWidth) { // all except Explorer
      windowWidth = window.innerWidth;
    } else if (document.documentElement && document.documentElement.clientWidth) {
      windowWidth = document.documentElement.clientWidth;
    } else if (document.body) { // other Explorers
      windowWidth = window.width;
    }
    return windowWidth;
  };

  // http://www.zachstronaut.com/posts/2009/02/17/animate-css-transforms-firefox-webkit.html
  layout.getTransformProperty = function(element) {
      // Note that in some versions of IE9 it is critical that
      // msTransform appear in this list before MozTransform
      var properties = [
          'transform',
          'WebkitTransform',
          'msTransform',
          'MozTransform',
          'OTransform'
      ];
      var p;
      if (element) {
        while (p = properties.shift()) {
            if (typeof element.style[p] != 'undefined') {
                return p;
            }
        }
      }
      return false;
  };

  var description_right = document.getElementById("description-right");
  if (description_right !== null) {
    layout.fontsize = parseInt(layout.getStyleForSelector("#description-right").style.fontSize);
  }

  layout.transform = layout.getTransformProperty(document.body);

  // Finally, return ready module.
  return layout;
});

/*globals define: false, d3: false */
// ------------------------------------------------------------
//
//   Molecule Container
//
// ------------------------------------------------------------
define('md2d/views/molecule-container',['require','cs!common/components/play_reset_svg','cs!common/components/play_only_svg','cs!common/components/playback_svg','common/layout/layout'],function (require) {
  // Dependencies.
  var PlayResetComponentSVG = require('cs!common/components/play_reset_svg'),
      PlayOnlyComponentSVG  = require('cs!common/components/play_only_svg'),
      PlaybackComponentSVG  = require('cs!common/components/playback_svg'),
      layout                = require('common/layout/layout');

  return function moleculeContainer(e, options) {
    var elem = d3.select(e),
        node = elem.node(),
        // in fit-to-parent mode, the d3 selection containing outermost container
        outerElement,
        cx = elem.property("clientWidth"),
        cy = elem.property("clientHeight"),
        width, height,
        scale_factor,
        scaling_factor,
        vis1, vis, plot,
        playback_component, time_label,
        padding, size,
        mw, mh, tx, ty, stroke,
        x, downscalex, downx,
        y, downscaley, downy, y_flip,
        dragged,
        drag_origin,
        pc_xpos, pc_ypos,
        model_time_formatter = d3.format("5.0f"),
        time_prefix = "",
        time_suffix = " (fs)",
        gradient_container,
        VDWLines_container,
        image_container_below,
        image_container_top,
        red_gradient,
        blue_gradient,
        green_gradient,
        gradientNameForElement,
        // Set of gradients used for Kinetic Energy Shading.
        gradientNameForKELevel = [],
        // Number of gradients used for Kinetic Energy Shading.
        KE_SHADING_STEPS = 25,
        atom_tooltip_on,
        offset_left, offset_top,
        particle, label, labelEnter, tail,
        molRadius,
        molecule_div, molecule_div_pre,
        get_num_atoms,
        results,
        radialBondResults,
        set_atom_properties,
        is_stopped,
        obstacle,
        obstacles,
        get_obstacles,
        mock_obstacles_array = [],
        mock_radial_bond_array = [],
        radialBond1, radialBond2,
        vdwPairs,
        chargeShadingMode,
        chargeShadingChars = ["+", "-", ""],
        keShadingMode,
        drawVdwLines,
        getRadialBonds,
        imageProp,
        textBoxes,
        interactiveUrl,
        imagePath,
        getVdwPairs,
        bondColorArray,
        default_options = {
          fit_to_parent:        false,
          title:                false,
          xlabel:               false,
          ylabel:               false,
          controlButtons:      "play",
          grid_lines:           false,
          xunits:               false,
          yunits:               false,
          atom_mubers:          false,
          enableAtomTooltips:   false,
          xmin:                 0,
          xmax:                 10,
          ymin:                 0,
          ymax:                 10
        },

        model,
        model_md2d_results_RADIUS,
        model_md2d_results_PX,
        model_md2d_results_PY,
        model_md2d_results_X,
        model_md2d_results_Y,
        model_md2d_results_VX,
        model_md2d_results_VY,
        model_md2d_results_SPEED,
        model_md2d_results_AX,
        model_md2d_results_AY,
        model_md2d_results_CHARGE,
        model_md2d_results_FRICTION,
        model_md2d_results_VISIBLE,
        model_md2d_results_MARKED,
        model_md2d_results_DRAGGABLE,
        model_md2d_results_ELEMENT,
        model_md2d_results_MASS,

        RADIAL_BOND_STANDARD_STICK_STYLE,
        RADIAL_BOND_LONG_SPRING_STYLE,
        RADIAL_BOND_SOLID_LINE_STYLE,
        RADIAL_BOND_GHOST_STYLE,
        RADIAL_BOND_UNICOLOR_STICK_STYLE,
        RADIAL_BOND_SHORT_SPRING_STYLE,
        RADIAL_BOND_DOUBLE_BOND_STYLE,
        RADIAL_BOND_TRIPLE_BOND_STYLE;

    processOptions();

    if ( !options.fit_to_parent ) {
      scale(cx, cy);
    }

    tx = function(d, i) { return "translate(" + x(d) + ",0)"; };
    ty = function(d, i) { return "translate(0," + y(d) + ")"; };
    stroke = function(d, i) { return d ? "#ccc" : "#666"; };

    function processOptions(newOptions) {
      if (newOptions) {
        options = newOptions;
      }
      if (options) {
        for(var p in default_options) {
          if (options[p] === undefined) {
            options[p] = default_options[p];
          }
        }
      } else {
        options = default_options;
      }

      model = options.model;

      // The model function get_results() returns a 2 dimensional array
      // of atom indices and properties that is update everymodel tick.
      // This array is not garbage collected so the view can be assured that
      // the latest results will be in this array when the view is executing
      results = options.get_results();
      radialBondResults = options.get_radial_bond_results();
      get_obstacles = options.get_obstacles;
      getRadialBonds = options.get_radial_bonds;
      getVdwPairs = options.get_vdw_pairs;
      set_atom_properties = options.set_atom_properties;
      is_stopped = options.is_stopped;
      imageProp = options.images;
      textBoxes = options.textBoxes || [];
      if (options.interactiveUrl) {
        interactiveUrl = options.interactiveUrl;
        imagePath = interactiveUrl.slice(0,interactiveUrl.lastIndexOf("/")+1);
      }
      if (!options.showClock) {
        options.showClock = model.get("showClock");
      }

      model_md2d_results_RADIUS   = model.INDICES.RADIUS+1;
      model_md2d_results_PX       = model.INDICES.PX+1;
      model_md2d_results_PY       = model.INDICES.PY+1;
      model_md2d_results_X        = model.INDICES.X+1;
      model_md2d_results_Y        = model.INDICES.Y+1;
      model_md2d_results_VX       = model.INDICES.VX+1;
      model_md2d_results_VY       = model.INDICES.VY+1;
      model_md2d_results_SPEED    = model.INDICES.SPEED+1;
      model_md2d_results_AX       = model.INDICES.AX+1;
      model_md2d_results_AY       = model.INDICES.AY+1;
      model_md2d_results_CHARGE   = model.INDICES.CHARGE+1;
      model_md2d_results_FRICTION = model.INDICES.FRICTION+1;
      model_md2d_results_VISIBLE  = model.INDICES.VISIBLE+1;
      model_md2d_results_MARKED   = model.INDICES.MARKED+1;
      model_md2d_results_DRAGGABLE= model.INDICES.DRAGGABLE+1;
      model_md2d_results_ELEMENT  = model.INDICES.ELEMENT+1;
      model_md2d_results_MASS     = model.INDICES.MASS+1;

      RADIAL_BOND_STANDARD_STICK_STYLE = 101;
      RADIAL_BOND_LONG_SPRING_STYLE    = 102;
      RADIAL_BOND_SOLID_LINE_STYLE     = 103;
      RADIAL_BOND_GHOST_STYLE          = 104;
      RADIAL_BOND_UNICOLOR_STICK_STYLE = 105;
      RADIAL_BOND_SHORT_SPRING_STYLE   = 106;
      RADIAL_BOND_DOUBLE_BOND_STYLE    = 107;
      RADIAL_BOND_TRIPLE_BOND_STYLE    = 108;

    }

    function scale(w, h) {
      var modelSize = model.size(),
          aspectRatio = modelSize[0] / modelSize[1];
      scale_factor = layout.screen_factor;
      padding = {
         "top":    options.title  ? 40 * layout.screen_factor : 20,
         "right":                   25,
         "bottom": 10,
         "left":   options.ylabel ? 60  * layout.screen_factor : 25
      };

      if (options.xlabel) {
        padding.bottom += (35  * scale_factor);
      }

      if (options.controlButtons) {
        padding.bottom += (40  * scale_factor);
      } else {
        padding.bottom += (15  * scale_factor);
      }

      if (options.fit_to_parent) {

        // In 'fit-to-parent' mode, we allow the viewBox parameter to fit the svg
        // node into the containing element and allow the containing element to be
        // sized by CSS (or Javascript)
        cx = 500;
        width = cx - padding.left - padding.right;
        height = width / aspectRatio;
        cy = height + padding.top + padding.bottom;
      }
      else if (!arguments.length) {
        cy = elem.property("clientHeight");
        height = cy - padding.top  - padding.bottom;
        width = height * aspectRatio;
        cx = width + padding.left  + padding.right;
        node.style.width = cx +"px";
      } else {
        width  = w;
        height = h;
        cx = width + padding.left  + padding.right;
        cy = height + padding.top  + padding.bottom;
        node.style.height = cy +"px";
        node.style.width = cx +"px";
      }

      size = {
        "width":  width,
        "height": height
      };
      scaling_factor = (size.width/(modelSize[0]*100));
      offset_top  = node.offsetTop + padding.top;
      offset_left = node.offsetLeft + padding.left;

      switch (options.controlButtons) {
        case "play":
          pc_xpos = padding.left + (size.width - (75 * scale_factor))/2;
          break;
        case "play_reset":
          pc_xpos = padding.left + (size.width - (140 * scale_factor))/2;
          break;
        case "play_reset_step":
          pc_xpos = padding.left + (size.width - (230 * scale_factor))/2;
          break;
        default:
          pc_xpos = padding.left + (size.width - (230 * scale_factor))/2;
      }

      pc_ypos = cy - 42 * scale_factor;
      mw = size.width;
      mh = size.height;

      // x-scale
      x = d3.scale.linear()
          .domain([options.xmin, options.xmax])
          .range([0, mw]);

      // drag x-axis logic
      downscalex = x.copy();
      downx = Math.NaN;

      // y-scale (inverted domain)
      y = d3.scale.linear()
          .domain([options.ymax, options.ymin])
          .range([0, mh]);

      // y-scale for defining heights without inverting the domain
      y_flip = d3.scale.linear()
          .domain([options.ymin, options.ymax])
          .nice()
          .range([0, mh])
          .nice();

      // drag x-axis logic
      downscaley = y.copy();
      downy = Math.NaN;
      dragged = null;
      return [cx, cy, width, height];
    }

    function modelTimeLabel() {
      return time_prefix + model_time_formatter(model.getTime()) + time_suffix;
    }

    function set_position(i, xpos, ypos, checkPosition, moveMolecule) {
      return set_atom_properties(i, {x: xpos, y: ypos}, checkPosition, moveMolecule);
    }

    function get_obstacle_x(i) {
      return obstacles[model.OBSTACLE_INDICES.X][i];
    }

    function get_obstacle_y(i) {
      return obstacles[model.OBSTACLE_INDICES.Y][i];
    }

    function get_obstacle_width(i) {
      return obstacles[model.OBSTACLE_INDICES.WIDTH][i];
    }

    function get_obstacle_height(i) {
      return obstacles[model.OBSTACLE_INDICES.HEIGHT][i];
    }

    function get_obstacle_color(i) {
      return "rgb(" +
        obstacles[model.OBSTACLE_INDICES.COLOR_R][i] + "," +
        obstacles[model.OBSTACLE_INDICES.COLOR_G][i] + "," +
        obstacles[model.OBSTACLE_INDICES.COLOR_B][i] + ")";
    }

    function get_obstacle_visible(i) {
      return obstacles[model.OBSTACLE_INDICES.VISIBLE][i];
    }

    function get_radial_bond_atom_1(i) {
      return radialBonds[model.RADIAL_BOND_INDICES.ATOM1][i];
    }

    function get_radial_bond_atom_2(i) {
      return radialBonds[model.RADIAL_BOND_INDICES.ATOM2][i];
    }

    function get_radial_bond_length(i) {
      return radialBonds[model.RADIAL_BOND_INDICES.LENGTH][i];
    }

    function get_radial_bond_strength(i) {
      return radialBonds[model.RADIAL_BOND_INDICES.STRENGTH][i];
    }

    function get_vdw_line_atom_1(i) {
      return vdwPairs[model.VDW_INDICES.ATOM1][i];
    }

    function get_vdw_line_atom_2(i) {
      return vdwPairs[model.VDW_INDICES.ATOM2][i];
    }

    function container() {
      // if (node.clientWidth && node.clientHeight) {
      //   cx = node.clientWidth;
      //   cy = node.clientHeight;
      //   size.width  = cx - padding.left - padding.right;
      //   size.height = cy - padding.top  - padding.bottom;
      // }

      scale();

      // Subscribe for model events.
      model.addPropertiesListener(["temperature_control"], drawSymbolImages);
      // Redraw container each time when some visual-related property is changed.
      model.addPropertiesListener(["keShading", "chargeShading", "showVDWLines", "showClock"],
          setup_drawables);

      // create container, or update properties if it already exists
      if (vis === undefined) {

        if (options.fit_to_parent) {
          outerElement = d3.select(e);
          elem = outerElement
            .append('div').attr('class', 'positioning-container')
            .append('div').attr('class', 'molecules-view-aspect-container')
              .attr('style', 'padding-top: ' + Math.round(cy/cx * 100) + '%')
            .append('div').attr('class', 'molecules-view-svg-container');

          node = elem.node();

          vis1 = d3.select(node).append("svg")
            .attr('viewBox', '0 0 ' + cx + ' ' + cy)
            .attr('preserveAspectRatio', 'xMinYMin meet');

        } else {
          outerElement = elem;
          vis1 = d3.select(node).append("svg")
            .attr("width", cx)
            .attr("height", cy);
        }

        vis = vis1.append("g")
            .attr("transform", "translate(" + padding.left + "," + padding.top + ")");

        plot = vis.append("rect")
          .attr("class", "plot")
          .attr("width", size.width)
          .attr("height", size.height)
          .style("fill", "#EEEEEE");

        // add Chart Title
        if (options.title) {
          vis.append("text")
              .attr("class", "title")
              .text(options.title)
              .attr("x", size.width/2)
              .attr("dy","-1em")
              .style("text-anchor","middle");
        }

        // Add the x-axis label
        if (options.xlabel) {
          vis.append("text")
              .attr("class", "xlabel")
              .text(options.xlabel)
              .attr("x", size.width/2)
              .attr("y", size.height)
              .attr("dy","2.4em")
              .style("text-anchor","middle");
        }

        // add y-axis label
        if (options.ylabel) {
          vis.append("g")
              .append("text")
                  .attr("class", "ylabel")
                  .text(options.ylabel)
                  .style("text-anchor","middle")
                  .attr("transform","translate(" + -40 + " " + size.height/2+") rotate(-90)");
        }

        // Tooltip.
        molecule_div = d3.select("#viz").append("div")
            .attr("class", "tooltip")
            .style("opacity", 1e-6);

        molecule_div_pre = molecule_div.append("pre");

        d3.select(node)
          .attr("tabindex", 0)
          .on("mousedown", mousedown);

        registerKeyboardHandlers();

        redraw();
        create_gradients();
        createSymbolImages();
      } else {

        if ( !options.fit_to_parent ) {
          d3.select(node).select("svg")
              .attr("width", cx)
              .attr("height", cy);
        }

        vis.select("svg")
            .attr("width", cx)
            .attr("height", cy);

        vis.select("rect.plot")
          .attr("width", size.width)
          .attr("height", size.height)
          .style("fill", "#EEEEEE");

        vis.select("svg.container")
          .attr("top", 0)
          .attr("left", 0)
          .attr("width", size.width)
          .attr("height", size.height)
          .attr("viewBox", "0 0 "+size.width+" "+size.height);

        if (options.title) {
          vis.select("text.title")
              .attr("x", size.width/2)
              .attr("dy","-1em");
        }

        if (options.xlabel) {
          vis.select("text.xlabel")
              .attr("x", size.width/2)
              .attr("y", size.height);
        }

        if (options.ylabel) {
          vis.select("text.ylabel")
              .attr("transform","translate(" + -40 + " " + size.height/2+") rotate(-90)");
        }

        if (options.showClock) {
          time_label.text(modelTimeLabel())
              .attr("x", 10)
              .attr("y", size.height - 35);
        }

        vis.selectAll("g.x").remove();
        vis.selectAll("g.y").remove();

        if (options.playback_controller) {
          playback_component.position(pc_xpos, pc_ypos, scale_factor);
        }
        redraw();

      }

      // Process options that always have to be recreated when container is reloaded
      d3.select('.model-controller').remove();

      switch (options.controlButtons) {
        case "play":
          playback_component = new PlayOnlyComponentSVG(vis1, model_player, pc_xpos, pc_ypos, scale_factor);
          break;
        case "play_reset":
          playback_component = new PlayResetComponentSVG(vis1, model_player, pc_xpos, pc_ypos, scale_factor);
          break;
        case "play_reset_step":
          playback_component = new PlaybackComponentSVG(vis1, model_player, pc_xpos, pc_ypos, scale_factor);
          break;
        default:
          playback_component = null;
      }

      function redraw() {
        if (d3.event && d3.event.transform && isNaN(downx) && isNaN(downy)) {
            d3.event.transform(x, y);
        }

        var fx = x.tickFormat(10),
            fy = y.tickFormat(10);

        if (options.xunits) {
          // Regenerate x-ticks…
          var gx = vis.selectAll("g.x")
              .data(x.ticks(10), String)
              .attr("transform", tx);

          gx.select("text")
              .text(fx);

          var gxe = gx.enter().insert("svg:g", "a")
              .attr("class", "x")
              .attr("transform", tx);

          if (options.grid_lines) {
            gxe.append("svg:line")
                .attr("stroke", stroke)
                .attr("y1", 0)
                .attr("y2", size.height);
          }

          gxe.append("svg:text")
              .attr("y", size.height)
              .attr("dy", "1em")
              .attr("text-anchor", "middle")
              .text(fx);

          gx.exit().remove();
        }

        if (options.xunits) {
          // Regenerate y-ticks…
          var gy = vis.selectAll("g.y")
              .data(y.ticks(10), String)
              .attr("transform", ty);

          gy.select("text")
              .text(fy);

          var gye = gy.enter().insert("svg:g", "a")
              .attr("class", "y")
              .attr("transform", ty)
              .attr("background-fill", "#FFEEB6");

          if (options.grid_lines) {
            gye.append("svg:line")
                .attr("stroke", stroke)
                .attr("x1", 0)
                .attr("x2", size.width);
          }

          gye.append("svg:text")
              .attr("x", -3)
              .attr("dy", ".35em")
              .attr("text-anchor", "end")
              .text(fy);

          // update model time display
          if (options.showClock) {
            time_label.text(modelTimeLabel());
          }

          gy.exit().remove();
        }
      }

      function create_gradients() {
            // Scale used for Kinetic Energy Shading gradients.
        var medColorScale = d3.scale.linear()
              .interpolate(d3.interpolateRgb)
              .range(["#F2F2F2", "#FF8080"]),
            // Scale used for Kinetic Energy Shading gradients.
            darkColorScale = d3.scale.linear()
              .interpolate(d3.interpolateRgb)
              .range(["#A4A4A4", "#FF2020"]),
            gradientName,
            KELevel,
            i;

        image_container_below = vis.append("g");
        image_container_below.attr("class", "image_container_below");
        VDWLines_container = vis.append("g");
        VDWLines_container.attr("class", "VDWLines_container");

        gradient_container = vis.append("svg")
            .attr("class", "container")
            .attr("top", 0)
            .attr("left", 0)
            .attr("width", size.width)
            .attr("height", size.height)
            .attr("viewBox", "0 0 "+size.width+" "+size.height);

        // Charge gradients
        create_radial_gradient("neg-grad", "#ffefff", "#fdadad", "#e95e5e", gradient_container);
        create_radial_gradient("pos-grad", "#dfffff", "#9abeff", "#767fbf", gradient_container);
        create_radial_gradient("neutral-grad", "#FFFFFF", "#f2f2f2", "#A4A4A4", gradient_container);

        // "Marked" atom gradient
        create_radial_gradient("mark-grad", "#fceabb", "#fccd4d", "#f8b500", gradient_container);

        // Element gradients
        create_radial_gradient("green-grad", "#dfffef", "#75a643", "#2a7216", gradient_container);
        create_radial_gradient("purple-grad", "#EED3F0", "#D941E0", "#84198A", gradient_container);
        create_radial_gradient("aqua-grad", "#DCF5F4", "#41E0D8", "#12827C", gradient_container);
        create_radial_gradient("orange-grad", "#F0E6D1", "#E0A21B", "#AD7F1C", gradient_container);

        // Kinetic Energy Shading gradients
        for (i = 0; i < KE_SHADING_STEPS; i++) {
          gradientName = "ke-shading-" + i;
          KELevel = i / KE_SHADING_STEPS;
          create_radial_gradient(gradientName, "#FFFFFF", medColorScale(KELevel),
            darkColorScale(KELevel), gradient_container);
          // Different from gradientNameForElement names convention, but
          // it allows to avoid constructing final string during each update
          // of atom shading.
          gradientNameForKELevel[i] = "url('#" + gradientName + "')";
        }

        gradientNameForElement = ["green-grad", "purple-grad", "aqua-grad", "orange-grad"];
        bondColorArray = ["#538f2f", "#aa2bb1", "#2cb6af", "#b3831c", "#7781c2", "#ee7171"];
        image_container_top = vis.append("g");
        image_container_top.attr("class", "image_container_top");
      }

      function create_radial_gradient(id, lightColor, medColor, darkColor, gradient_container) {
        gradient = gradient_container.append("defs")
            .append("radialGradient")
            .attr("id", id)
            .attr("cx", "50%")
            .attr("cy", "47%")
            .attr("r", "53%")
            .attr("fx", "35%")
            .attr("fy", "30%");
        gradient.append("stop")
            .attr("stop-color", lightColor)
            .attr("offset", "0%");
        gradient.append("stop")
            .attr("stop-color", medColor)
            .attr("offset", "40%");
        gradient.append("stop")
            .attr("stop-color", darkColor)
            .attr("offset", "80%");
        gradient.append("stop")
            .attr("stop-color", medColor)
            .attr("offset", "100%");
      }

      // Returns gradient appropriate for a given atom.
      // d - atom data.
      function getParticleGradient(d) {
          var ke, keIndex, charge;

          if (d[model_md2d_results_MARKED]) return "url(#mark-grad)";

          if (keShadingMode) {
            ke  = model.getAtomKineticEnergy(d[0]),
            // Convert Kinetic Energy to [0, 1] range
            // using empirically tested transformations.
            // K.E. shading should be similar to the classic MW K.E. shading.
            keIndex = Math.min(5 * ke, 1);

            return gradientNameForKELevel[Math.round(keIndex * (KE_SHADING_STEPS - 1))];
          }

          if (chargeShadingMode) {
            charge = d[model_md2d_results_CHARGE];

            if (charge === 0) return "url(#neutral-grad)";
            return charge > 0 ? "url(#pos-grad)" : "url(#neg-grad)";
          }

          return "url('#"+gradientNameForElement[d[model_md2d_results_ELEMENT] % 4]+"')";
      }

      // Create key images which can be shown in the
      // upper left corner in different situations.
      // IMPORTANT: use percentage values whenever possible,
      // especially for *height* attribute!
      // It will allow to properly calculate images
      // placement in drawSymbolImages() function.
      function createSymbolImages() {
        var xMargin = "1%";
        // Heat bath key image.
        vis.append("image")
            .attr({
              "id": "heat-bath",
              "x": xMargin,
              "width": "3%",
              "height": "3%",
              "preserveAspectRatio": "xMinYMin",
              "xlink:href": "../../resources/heatbath.gif"
            });
        // Kinetic Energy Shading gradient image.
        vis.append("image")
            .attr({
              "id": "ke-gradient",
              "x": xMargin,
              "width": "12%",
              "height": "12%",
              "preserveAspectRatio": "xMinYMin",
              "xlink:href": "../../resources/ke-gradient.png"
            });
      }

      // Draw key images in the upper left corner.
      // Place them in one row, dynamically calculate
      // y position.
      function drawSymbolImages() {
          var heatBath = model.get('temperature_control'),
              imageSelect, imageHeight,
              // Variables used for calculating proper y positions.
              // The unit for these values is percentage points!
              yPos = 0,
              yMargin = 1;

          // Heat bath symbol.
          if (heatBath) {
              yPos += yMargin;
              imageSelect = d3.select("#heat-bath")
                .attr("y", yPos + "%")
                .style("display", "");

              imageHeight = imageSelect.attr("height");
              // Truncate % symbol and convert to Number.
              imageHeight = Number(imageHeight.substring(0, imageHeight.length - 1));
              yPos += imageHeight;
          } else {
              d3.select("#heat-bath").style("display","none");
          }

          // Kinetic Energy shading gradient.
          // Put it under heat bath symbol.
          if (keShadingMode) {
              yPos += yMargin;
              d3.select("#ke-gradient")
                .attr("y", yPos + "%")
                .style("display", "");
          } else {
              d3.select("#ke-gradient").style("display", "none");
          }
      }

      function updateMoleculeRadius() {
        vis.selectAll("circle").data(results).attr("r",  function(d) { return x(d[model_md2d_results_RADIUS]); });
        // vis.selectAll("text").attr("font-size", x(molRadius * 1.3) );
      }

      /**
        Call this wherever a d3 selection is being used to add circles for atoms
      */

      function particleEnter() {
        particle.enter().append("circle")
            .attr({
              "class": "draggable",
              "r":  function(d) { return x(d[model_md2d_results_RADIUS]); },
              "cx": function(d) { return x(d[model_md2d_results_X]); },
              "cy": function(d) { return y(d[model_md2d_results_Y]); }
            })
            .style({
              "fill-opacity": function(d) { return d[model_md2d_results_VISIBLE]; },
              "fill": getParticleGradient
            })
            .on("mousedown", molecule_mousedown)
            .on("mouseover", molecule_mouseover)
            .on("mouseout", molecule_mouseout)
            .call(d3.behavior.drag()
              .on("dragstart", node_dragstart)
              .on("drag", node_drag)
              .on("dragend", node_dragend)
            );
      }

      function obstacleEnter() {
        obstacle.enter().append("rect")
            .attr({
              "x": function(d, i) { return x(get_obstacle_x(i)); },
              "y": function(d, i) { return y(get_obstacle_y(i) + get_obstacle_height(i)); },
              "width": function(d, i) {return x(get_obstacle_width(i)); },
              "height": function(d, i) {return y_flip(get_obstacle_height(i)); }
            })
            .style({
              "fill": function(d, i) { return get_obstacle_visible(i) ? get_obstacle_color(i) : "rgba(128,128,128, 0)"; },
              "stroke-width": function(d, i) { return get_obstacle_visible(i) ? 0.2 : 0.0; },
              "stroke": function(d, i) { return get_obstacle_visible(i) ? get_obstacle_color(i) : "rgba(128,128,128, 0)"; }
            });
      }

      function radialBondEnter() {
        radialBond1.enter().append("path")
            .attr("d", function (d, i) {
              return findPoints(d,1);})
            .attr("class", "radialbond1")
            .style("stroke-width", function (d, i) {
              if (isSpringBond(d)) {
                return 0.3 * scaling_factor;
              } else {
                return x(Math.min(results[d[1]][model_md2d_results_RADIUS], results[d[2]][model_md2d_results_RADIUS])) * 0.75;
              }
            })
            .style("stroke", function(d, i) {
              var charge, element, grad;
              if (isSpringBond(d)) {
                return "#000000";
              } else {
                if (chargeShadingMode) {
                  charge = results[d[1]][model_md2d_results_CHARGE];
                  if (charge > 0) {
                      return  bondColorArray[4];
                  } else if (charge < 0){
                      return  bondColorArray[5];
                  } else {
                    return "#A4A4A4";
                  }
                } else {
                  element = results[d[1]][model_md2d_results_ELEMENT] % 4;
                  grad = bondColorArray[element];
                  return grad;
                }
              }
            })
            .style("fill", "none");

        radialBond2.enter().append("path")
            .attr("d", function (d) {
              return findPoints(d,2); })
            .attr("class", "radialbond2")
            .style("stroke-width", function (d, i) {
              if (isSpringBond(d)) {
                return 0.3 * scaling_factor;
              } else {
                return x(Math.min(results[d[1]][model_md2d_results_RADIUS], results[d[2]][model_md2d_results_RADIUS])) * 0.75;
              }
            })
            .style("stroke", function(d, i) {
              var charge, element, grad;
              if (isSpringBond(d)) {
                return "#000000";
              } else {
                if (chargeShadingMode) {
                  charge = results[d[2]][model_md2d_results_CHARGE];
                  if (charge > 0) {
                      return  bondColorArray[4];
                  } else if (charge < 0){
                      return  bondColorArray[5];
                  } else {
                    return "#A4A4A4";
                  }
                } else {
                  element = results[d[2]][model_md2d_results_ELEMENT] % 4;
                  grad = bondColorArray[element];
                  return grad;
                }
              }
            })
            .style("fill", "none");
      }

      function findPoints(d, num) {
        var pointX, pointY,
            j,
            dx, dy,
            x1, x2,
            y1, y2,
            radius_x1, radius_x2, radiusFactorX,
            radius_y1, radius_y2, radiusFactorY,
            lineTo,
            path,
            costheta,
            sintheta,
            length, numSpikes = 10;

        x1 = x(d[6]);
        y1 = y(d[7]);
        x2 = x(d[8]);
        y2 = y(d[9]);
        dx = x2 - x1;
        dy = y2 - y1;
        length = Math.sqrt(dx*dx + dy*dy)/scaling_factor;
        costheta = dx / length;
        sintheta = dy / length;

        radius_x1 = x(results[d[1]][model_md2d_results_RADIUS]) * costheta;
        radius_x2 = x(results[d[2]][model_md2d_results_RADIUS]) * costheta;
        radius_y1 = x(results[d[1]][model_md2d_results_RADIUS]) * sintheta;
        radius_y2 = x(results[d[2]][model_md2d_results_RADIUS]) * sintheta;
        radiusFactorX = radius_x1 - radius_x2;
        radiusFactorY = radius_y1 - radius_y2;

        if (isSpringBond(d)) {
          var delta = length / numSpikes;
          path = "M "+x1+","+y1+" " ;
          for (j = 0; j < numSpikes; j++) {
            if (j % 2 === 0) {
              pointX = x1 + (j + 0.5) * costheta * delta - 0.5 * sintheta * numSpikes;
              pointY = y1 + (j + 0.5) * sintheta * delta + 0.5 * costheta * numSpikes;
            }
            else {
              pointX = x1 + (j + 0.5) * costheta * delta + 0.5 * sintheta * numSpikes;
              pointY = y1 + (j + 0.5) * sintheta * delta - 0.5 * costheta * numSpikes;
            }
            lineTo = " L "+pointX+","+pointY;
            path += lineTo;
          }
          return path += " L "+x2+","+y2;
        } else {
          if (num === 1) {
            return "M "+x1+","+y1+" L "+((x2+x1+radiusFactorX)/2)+" , "+((y2+y1+radiusFactorY)/2);
          } else {
            return "M "+((x2+x1+radiusFactorX)/2)+" , "+((y2+y1+radiusFactorY)/2)+" L "+x2+","+y2;
          }
        }
      }

      function isSpringBond(d){
        return d[5] === model.RADIAL_BOND_STYLES.RADIAL_BOND_SHORT_SPRING_STYLE;
      }

      function drawAttractionForces() {
        // Remove old lines if there are any.
        VDWLines_container.selectAll("line.attractionforce").remove();
        if (!vdwPairs) return;

        var numVdwPairs = vdwPairs[model.VDW_INDICES.COUNT],
            atom1,
            atom2,
            i;

        for (i = 0; i < numVdwPairs; i++) {
          atom1 = get_vdw_line_atom_1(i);
          atom2 = get_vdw_line_atom_2(i);

          if (atom1 !== 0 || atom2 !== 0) {
            VDWLines_container.append("line")
              .attr("class", "attractionforce")
              .attr("x1", x(results[atom1][model_md2d_results_X]))
              .attr("y1", y(results[atom1][model_md2d_results_Y]))
              .attr("x2", x(results[atom2][model_md2d_results_X]))
              .attr("y2", y(results[atom2][model_md2d_results_Y]))
              .style("stroke-width", 2 * scaling_factor)
              .style("stroke-dasharray", 3 * scaling_factor + " " + 2 * scaling_factor);
          }
        }
      }

      function drawImageAttachment() {
        var img = [],
            img_height,
            img_width,
            imgHost,
            imgHostType,
            imglayer,
            imgX,
            i;

        image_container_top.selectAll("image").remove();
        image_container_below.selectAll("image").remove();

        if (!imageProp) return;

        for (i = 0; i < imageProp.length; i++) {
          img[i] = new Image();
          img[i].src = imagePath+imageProp[i].imageUri;
          img[i].onload = (function(i) {
            return function() {
              image_container_top.selectAll("image.image_attach"+i).remove();
              image_container_below.selectAll("image.image_attach"+i).remove();

              imgHost = results[imageProp[i].imageHostIndex];
              imgHostType = imageProp[i].imageHostType;
              imglayer = imageProp[i].imageLayer;
              imgX = imageProp[i].imageX;
              imgY = imageProp[i].imageY;
              img_width = img[i].width * scaling_factor;
              img_height = img[i].height * scaling_factor;

              if (imglayer === 1) {
                image_container_top.append("image")
                  .attr("x", function() { if (imgHostType === "") { return imgX; } else { return (x(imgHost[model_md2d_results_X])-img_width/2); } })
                  .attr("y", function() { if (imgHostType === "") { return imgY; } else { return (y(imgHost[model_md2d_results_Y])-img_height/2); } })
                  .attr("class", "image_attach"+i+" draggable")
                  .attr("xlink:href", img[i].src)
                  .attr("width", img_width)
                  .attr("height", img_height)
                  .attr("pointer-events", "none");
              } else {
                image_container_below.append("image")
                  .attr("x", function() { if (imgHostType === "") { return imgX; } else { return (x(imgHost[model_md2d_results_X])-img_width/2); } })
                  .attr("y", function() { if (imgHostType === "") { return imgY; } else { return (y(imgHost[model_md2d_results_Y])-img_height/2); } })
                  .attr("class", "image_attach"+i+" draggable")
                  .attr("xlink:href", img[i].src)
                  .attr("width", img_width)
                  .attr("height", img_height)
                  .attr("pointer-events", "none");
              }
            };
          })(i);
        }
      }

      function drawTextBoxes() {
        var htmlObjects, textBox, size;

        size = model.size();

        // Curiously, selector "foreignObject.textBox" doesn't return the foreignObjects
        htmlObjects = gradient_container.selectAll(".textBox").data(textBoxes);

        htmlObjects.enter().append("foreignObject")
          .attr("class", "textBox")
          .append("xhtml:body");

        htmlObjects.exit().remove();

        // For the time being, make all text boxes cover the screen
        htmlObjects.attr({
          width:  x(size[0]),
          height: y(-size[1])
        }).each(function(d) {
          d3.select(this).select("body")
            .attr("class", "textBoxBody")
            .html(d.text)
            // layout.js (used by embeddables) sets font-size of all 'body' elements.
            // The line below can be removed when layout is fiexed.
            // .style("font-size", "inherit");
        });
      }

      function setupClock() {
        // add model time display
        vis.selectAll('.modelTimeLabel').remove();
        // Update clock status.
        options.showClock = model.get("showClock");
        if (options.showClock) {
          time_label = vis.append("text")
            .attr("class", "modelTimeLabel")
            .text(modelTimeLabel())
            .attr("x", 10)
            .attr("y", size.height - 35)
            .attr("dy","2.4em")
            .style("text-anchor","start");
        }
      }

      function setup_drawables() {
        obstacles = get_obstacles();
        setup_obstacles();
        setupVdwPairs();
        setup_radial_bonds();
        setup_particles();
        setupClock();
        drawSymbolImages();
        drawImageAttachment();
        drawTextBoxes();
      }

      function setup_particles() {
        var textShrinkFactor = results.length <= 100 ? 1 : 0.9;

        chargeShadingMode = model.get("chargeShading");
        keShadingMode = model.get("keShading");

        gradient_container.selectAll("circle").remove();
        gradient_container.selectAll("g").remove();

        particle = gradient_container.selectAll("circle").data(results);

        particleEnter();

        label = gradient_container.selectAll("g.label")
            .data(results);

        labelEnter = label.enter().append("g")
            .attr("class", "label")
            .attr("transform", function(d) {
              return "translate(" + x(d[model_md2d_results_X]) + "," + y(d[model_md2d_results_Y]) + ")";
            });

        if (options.atom_mubers) {
          labelEnter.append("text")
              .attr("class", "index")
              .attr("font-size", function(d) { return 1.6 * textShrinkFactor * x(d[model_md2d_results_RADIUS]); })
              .attr("style", "font-weight: bold; opacity: .7")
              .attr("x", 0)
              .attr("y", "0.31em")
              .attr("pointer-events", "none")
              .text(d[0]);
        } else {
          labelEnter.append("text")
              .attr("class", "index")
              .attr("font-size", function(d) { return 1.6 * x(d[model_md2d_results_RADIUS]); })
              .attr("style", "font-weight: bold; opacity: .7")
              .attr("x", "-0.31em")
              .attr("y", "0.31em")
              .attr("pointer-events", "none")
              .text(function(d) {
                  var charge = d[model_md2d_results_CHARGE];
                  // Draw +/- signs also when KE shading is enabled.
                  if (chargeShadingMode || keShadingMode) {
                      if (charge > 0){
                          return  "+";
                      } else if (charge < 0){
                          return  "-";
                      } else {
                          return;
                      }
                  }
              });
        }
      }

      function setup_obstacles() {
        gradient_container.selectAll("rect").remove();
        if (obstacles) {
          mock_obstacles_array.length = obstacles[0].length;
          obstacle = gradient_container.selectAll("rect").data(mock_obstacles_array);
          obstacleEnter();
        }
      }

      function setup_radial_bonds() {
        gradient_container.selectAll("path.radialbond1").remove();
        gradient_container.selectAll("path.radialbond2").remove();
        radialBonds = getRadialBonds();
        radialBondResults = options.get_radial_bond_results();
        if (radialBondResults) {
          radialBond1 = gradient_container.selectAll("path.radialbond1").data(radialBondResults);
          radialBond2 = gradient_container.selectAll("path.radialbond2").data(radialBondResults);
          radialBondEnter();
        }
      }

      function setupVdwPairs() {
        VDWLines_container.selectAll("line.attractionforce").remove();
        drawVdwLines = model.get("showVDWLines");
        if (drawVdwLines) {
          updateVdwPairs();
        }
      }

      function updateVdwPairs() {
        // Get new set of pairs from model.
        vdwPairs = getVdwPairs();
        // And draw them.
        drawAttractionForces();
      }

      function mousedown() {
        node.focus();
      }

      function molecule_mouseover(d, i) {
        if (options.enableAtomTooltips) {
          render_atom_tooltip(i);
        }
      }

      function molecule_mousedown(d, i) {
        node.focus();
        if (options.enableAtomTooltips) {
          if (atom_tooltip_on !== false) {
            molecule_div.style("opacity", 1e-6);
            molecule_div.style("display", "none");
            atom_tooltip_on = false;
          } else {
            if (d3.event.shiftKey) {
              atom_tooltip_on = i;
            } else {
              atom_tooltip_on = false;
            }
            render_atom_tooltip(i);
          }
        }
      }

      function render_atom_tooltip(i) {
        molecule_div
              .style("opacity", 1.0)
              .style("display", "inline")
              .style("background", "rgba(100%, 100%, 100%, 0.7)")
              .style("left", x(results[i][model_md2d_results_X]) + offset_left + 60 + "px")
              .style("top",  y(results[i][model_md2d_results_Y]) + offset_top - 30 + "px")
              .style("zIndex", 100)
              .transition().duration(250);

        molecule_div_pre.text(
            "atom: " + i + "\n" +
            "time: " + modelTimeLabel() + "\n" +
            "speed: " + d3.format("+6.3e")(results[i][model_md2d_results_SPEED]) + "\n" +
            "vx:    " + d3.format("+6.3e")(results[i][model_md2d_results_VX])    + "\n" +
            "vy:    " + d3.format("+6.3e")(results[i][model_md2d_results_VY])    + "\n" +
            "ax:    " + d3.format("+6.3e")(results[i][model_md2d_results_AX])    + "\n" +
            "ay:    " + d3.format("+6.3e")(results[i][model_md2d_results_AY])    + "\n"
          );
      }

      function molecule_mousemove(d) {
      }

      function molecule_mouseout() {
        if (!atom_tooltip_on && atom_tooltip_on !== 0) {
          molecule_div.style("opacity", 1e-6).style("zIndex" -1);
        }
      }

      function update_drawable_positions() {
        if (obstacles) {
          obstacle
              .attr("x", function(d, i) { return x(get_obstacle_x(i)); })
              .attr("y", function(d, i) { return y(get_obstacle_y(i) + get_obstacle_height(i)); });
        }

        if (drawVdwLines) {
          updateVdwPairs();
        }
        if (radialBondResults) {
          update_radial_bonds();
        }
        update_molecule_positions();
        if(imageProp && imageProp.length !== 0) {
          updateImageAttachment();
        }
      }

      // TODO: this function name seems to be inappropriate to
      // its content.
      function update_molecule_positions() {
        // update model time display
        if (options.showClock) {
          time_label.text(modelTimeLabel());
        }

        particle.attr({
          "cx": function(d) { return x(d[model_md2d_results_X]); },
          "cy": function(d) { return y(d[model_md2d_results_Y]); }
        });

        // When Kinetic Energy Shading is enabled, update style of atoms
        // during each frame.
        if (keShadingMode) {
          particle.style("fill", getParticleGradient);
        }

        label.attr("transform", function(d, i) {
          return "translate(" + x(d[model_md2d_results_X]) + "," + y(d[model_md2d_results_Y]) + ")";
        });

        if (atom_tooltip_on === 0 || atom_tooltip_on > 0) {
          render_atom_tooltip(atom_tooltip_on);
        }
      }

      function update_radial_bonds() {
        radialBond1.attr("d", function (d) { return findPoints(d,1); });
        radialBond2.attr("d", function (d) { return findPoints(d,2); });
      }

      function updateImageAttachment(){
        var numImages, img, img_height, img_width, imgHost, imgHostType, imglayer, imgX, imgY;
        numImages= imageProp.length;
        for(var i = 0;i < numImages;i++) {
          imgHost =  results[imageProp[i].imageHostIndex];
          imgHostType =  imageProp[i].imageHostType;
          imgX =  imageProp[i].imageX;
          imgY =  imageProp[i].imageY;
          imglayer =  imageProp[i].imageLayer;
          img = new Image();
          img.src =   imagePath+imageProp[i].imageUri;
          img_width = img.width*scaling_factor;
          img_height = img.height*scaling_factor;
          if(imglayer == 1) {
            image_container_top.selectAll("image.image_attach"+i)
            .attr("x",  function() { if (imgHostType === "") { return imgX; } else { return (x(imgHost[model_md2d_results_X])-img_width/2); } })
            .attr("y",  function() { if (imgHostType === "") { return imgY; } else { return (y(imgHost[model_md2d_results_Y])-img_height/2); } });
          } else {
            image_container_below.selectAll("image.image_attach"+i)
              .attr("x",  function() { if (imgHostType === "") { return imgX; } else { return (x(imgHost[model_md2d_results_X])-img_width/2); } })
              .attr("y",  function() { if (imgHostType === "") { return imgY; } else { return (y(imgHost[model_md2d_results_Y])-img_height/2); } });
          }
        }
      }

      function node_dragstart(d, i) {
        if ( is_stopped() ) {
          // cache the *original* atom position so we can go back to it if drag is disallowed
          drag_origin = [d[model_md2d_results_X], d[model_md2d_results_Y]];
        }
        else if ( d[model_md2d_results_DRAGGABLE] ) {
          model.liveDragStart(i);
        }
      }

      /**
        Given x, y, and a bounding box (object with keys top, left, bottom, and right relative to
        (x, y), returns an (x, y) constrained to keep the bounding box within the molecule container.
      */
      function dragBoundingBox(x, y, bbox) {
        if (bbox.left + x < options.xmin)   x = options.xmin - bbox.left;
        if (bbox.right + x > options.xmax)  x = options.xmax - bbox.right;
        if (bbox.bottom + y < options.ymin) y = options.ymin - bbox.bottom;
        if (bbox.top + y > options.ymax)    y = options.ymax - bbox.top;

        return { x: x, y: y };
      }

      function clip(value, min, max) {
        if (value < min) return min;
        if (value > max) return max;
        return value;
      }

      /**
        Given x, y, make sure that x and y are clipped to remain within the model container's
        boundaries
      */
      function dragPoint(x, y) {
        return { x: clip(x, options.xmin, options.xmax), y: clip(y, options.ymin, options.ymax) };
      }

      function node_drag(d, i) {
        var dragX = x.invert(d3.event.x),
            dragY = y.invert(d3.event.y),
            drag;

        if ( is_stopped() ) {
          drag = dragBoundingBox(dragX, dragY, model.getMoleculeBoundingBox(i));
          set_position(i, drag.x, drag.y, false, true);
          update_drawable_positions();
        }
        else if ( d[model_md2d_results_DRAGGABLE] ) {
          drag = dragPoint(dragX, dragY);
          model.liveDrag(drag.x, drag.y);
        }
      }

      function node_dragend(d, i) {
        var dragX,
            dragY;

        if ( is_stopped() ) {

          if (!set_position(i, d[model_md2d_results_X], d[model_md2d_results_Y], true, true)) {
            alert("You can't drop the atom there");     // should be changed to a nice Lab alert box
            set_position(i, drag_origin[0], drag_origin[1], false, true);
          }
          update_drawable_positions();
        }
        else if ( d[model_md2d_results_DRAGGABLE] ) {
          // here we just assume we are removing the one and only spring force.
          // This assumption will have to change if we can have more than one.
          model.liveDragEnd();
        }
      }

      // ------------------------------------------------------------
      //
      // Handle keyboard shortcuts for model operation
      //
      // ------------------------------------------------------------

      function handleKeyboardForView(evt) {
        evt = (evt) ? evt : ((window.event) ? event : null);
        if (evt) {
          switch (evt.keyCode) {
            case 32:                // spacebar
              if (model.is_stopped()) {
                playback_component.action('play');
              } else {
                playback_component.action('stop');
              }
              evt.preventDefault();
            break;
            case 13:                // return
              playback_component.action('play');
              evt.preventDefault();
            break;
            // case 37:                // left-arrow
            //   if (!model.is_stopped()) {
            //     playback_component.action('stop');
            //   }
            //   modelStepBack();
            //   evt.preventDefault();
            // break;
            // case 39:                // right-arrow
            //   if (!model.is_stopped()) {
            //     playback_component.action('stop');
            //   }
            //   modelStepForward();
            //   evt.preventDefault();
            // break;
          }
        }
      }

      function registerKeyboardHandlers() {
        node.onkeydown = handleKeyboardForView;
      }

      // make these private variables and functions available
      container.node = node;
      container.outerNode = outerElement.node();
      container.updateMoleculeRadius = updateMoleculeRadius;
      container.setup_drawables = setup_drawables;
      container.update_drawable_positions = update_drawable_positions;
      container.scale = scale;
      container.playback_component = playback_component;
      container.options = options;
      container.processOptions = processOptions;
    }

    container.resize = function(w, h) {
      if (options.fit_to_parent) {
        outerElement.style('width', w+'px');
      } else {
        container.scale(w, h);
      }
      container.processOptions();
      container();
      container.setup_drawables();
    };

    container.reset = function(newOptions) {
      container.processOptions(newOptions);
      container();
      container.setup_drawables();
      container.updateMoleculeRadius();
    };

   if (node) { container(); }

    return container;
  };
});

(function() {

  define('cs!common/components/model_player',['require'],function(require) {
    var ModelPlayer;
    return ModelPlayer = (function() {

      function ModelPlayer(model) {
        this.model = model;
      }

      ModelPlayer.prototype.play = function() {
        return this.model.resume();
      };

      ModelPlayer.prototype.stop = function() {
        return this.model.stop();
      };

      ModelPlayer.prototype.forward = function() {
        this.stop();
        return this.model.stepForward();
      };

      ModelPlayer.prototype.back = function() {
        this.stop();
        return this.model.stepBack();
      };

      ModelPlayer.prototype.seek = function(float_index) {
        this.stop();
        return this.model.seek(float_index);
      };

      ModelPlayer.prototype.reset = function() {
        return this.model.reset();
      };

      ModelPlayer.prototype.isPlaying = function() {
        return !this.model.is_stopped();
      };

      return ModelPlayer;

    })();
  });

}).call(this);

/*global

  define
  DEVELOPMENT
  d3
  alert
  model: true
  model_player: true
*/
/*jslint onevar: true*/
define('md2d/controllers/model-controller',['require','md2d/models/modeler','md2d/views/molecule-container','cs!common/components/model_player'],function (require) {
  // Dependencies.
  var Model             = require('md2d/models/modeler'),
      MoleculeContainer = require('md2d/views/molecule-container'),
      ModelPlayer       = require('cs!common/components/model_player');

  return function modelController(moleculeViewId, modelConfig, playerConfig) {
    var controller = {},

        // event dispatcher
        dispatch = d3.dispatch('modelReset'),

        // properties read from the playerConfig hash
        controlButtons,
        modelTimeLabel,
        fit_to_parent,
        enableAtomTooltips,

        // properties read from the modelConfig hash
        elements,
        atoms,
        mol_number,
        temperature_control,
        temperature,
        width,
        height,
        keShading,
        chargeShading,
        showVDWLines,
        radialBonds,
        angularBonds,
        obstacles,
        viscosity,
        gravitationalField,
        images,
        textBoxes,
        interactiveUrl,
        showClock,
        viewRefreshInterval,
        timeStep,

        moleculeContainer,

        // We pass this object to the "ModelPlayer" to intercept messages for the model
        // instead of allowing the ModelPlayer to talk to the model directly.
        // This allows us, for example, to reload the model instead of trying to call a 'reset' event
        // on models which don't know how to reset themselves.

        modelProxy = {
          resume: function() {
            model.resume();
          },

          stop: function() {
            model.stop();
          },

          reset: function() {
            model.stop();
            // if the model has a reset function then call it so anything the application
            // sets up outside the interactive itself that is listening for a model.reset
            // event gets notified. Example the Energy Graph Extra Item.
            if (model.reset) {
              model.reset();
            }
            reload(modelConfig, playerConfig);
          },

          is_stopped: function() {
            return model.is_stopped();
          }
        };

      // ------------------------------------------------------------
      //
      // Main callback from model process
      //
      // Pass this function to be called by the model on every model step
      //
      // ------------------------------------------------------------
      function tickHandler() {
        moleculeContainer.update_drawable_positions();
      }


      // ------------------------------------------------------------
      //
      // Initialize (or update) local variables based on playerConfig and modelConfig objects
      //
      // ------------------------------------------------------------

      function initializeLocalVariables() {
        controlButtons      = playerConfig.controlButtons;
        modelTimeLabel      = playerConfig.modelTimeLabel;
        enableAtomTooltips  = playerConfig.enableAtomTooltips || false;
        fit_to_parent       = playerConfig.fit_to_parent;
        interactiveUrl      = playerConfig.interactiveUrl;

        elements            = modelConfig.elements;
        atoms               = modelConfig.atoms;
        mol_number          = modelConfig.mol_number;
        temperature_control = modelConfig.temperature_control;
        temperature         = modelConfig.temperature;
        width               = modelConfig.width;
        height              = modelConfig.height;
        keShading           = modelConfig.keShading;
        chargeShading       = modelConfig.chargeShading;
        showVDWLines        = modelConfig.showVDWLines;
        showClock           = modelConfig.showClock;
        viewRefreshInterval = modelConfig.viewRefreshInterval;
        timeStep            = modelConfig.timeStep;
        radialBonds         = modelConfig.radialBonds;
        angularBonds        = modelConfig.angularBonds;
        obstacles           = modelConfig.obstacles;
        viscosity           = modelConfig.viscosity;
        gravitationalField  = modelConfig.gravitationalField;
        images              = modelConfig.images;
        textBoxes           = modelConfig.textBoxes;
      }

      // ------------------------------------------------------------
      //
      //   Molecular Model Setup
      //

      function createModel() {
        initializeLocalVariables();
        model = Model({
            elements            : elements,
            temperature         : temperature,
            temperature_control : temperature_control,
            width               : width,
            height              : height,
            keShading           : keShading,
            chargeShading       : chargeShading,
            showVDWLines        : showVDWLines,
            showClock           : showClock,
            viewRefreshInterval : viewRefreshInterval,
            timeStep            : timeStep,
            viscosity           : viscosity,
            gravitationalField  : gravitationalField,
            images              : images
          });

        if (atoms) {
          model.createNewAtoms(atoms);
        } else if (mol_number) {
          model.createNewAtoms(mol_number);
          model.relax();
        } else {
          throw new Error("ModelController: tried to create a model without atoms or mol_number.");
        }

        if (radialBonds) model.createRadialBonds(radialBonds);
        if (angularBonds) model.createAngularBonds(angularBonds);
        if (showVDWLines) model.createVdwPairs(atoms);
        if (obstacles) model.createObstacles(obstacles);
      }

      function setupModel() {
        createModel();
        model.resetTime();
        model.on('tick', tickHandler);
        model.on('addAtom', resetModelPlayer);
      }

      /**
        Returns a customized interface to the model for use by the view
      */
      function getModelInterface() {
        return {
          model:                   model,
          fit_to_parent:           fit_to_parent,
          xmax:                    width,
          ymax:                    height,
          keShading:               keShading,
          chargeShading:           chargeShading,
          enableAtomTooltips:      enableAtomTooltips,
          images:                  images,
          interactiveUrl:          interactiveUrl,
          textBoxes:               textBoxes,
          get_results:             function() { return model.get_results(); },
          get_radial_bond_results: function() { return model.get_radial_bond_results(); },
          get_radial_bonds:        function() { return model.get_radial_bonds(); },
          get_obstacles:           function() { return model.get_obstacles(); },
          get_vdw_pairs:           function() { return model.get_vdw_pairs(); },
          set_atom_properties:     function() { return model.setAtomProperties.apply(model, arguments);  },
          is_stopped:              function() { return model.is_stopped(); },

          controlButtons:      controlButtons,
          modelTimeLabel:      modelTimeLabel
        };
      }

      // ------------------------------------------------------------
      //
      // Create Model Player
      //
      // ------------------------------------------------------------

      function setupModelPlayer() {

        // ------------------------------------------------------------
        //
        // Create player and container view for model
        //
        // ------------------------------------------------------------

        model_player = new ModelPlayer(modelProxy, false);
        // disable its 'forward' and 'back' actions:
        model_player.forward = function() {},
        model_player.back = function() {},

        moleculeContainer = MoleculeContainer(moleculeViewId, getModelInterface());

        moleculeContainer.updateMoleculeRadius();
        moleculeContainer.setup_drawables();
      }

      function resetModelPlayer() {

        // ------------------------------------------------------------
        //
        // reset player and container view for model
        //
        // ------------------------------------------------------------

        moleculeContainer.reset(getModelInterface());
        moleculeContainer.updateMoleculeRadius();
        moleculeContainer.setup_drawables();
      }

      /**
        Note: newModelConfig, newPlayerConfig are optional. Calling this without
        arguments will simply reload the current model.
      */
      function reload(newModelConfig, newPlayerConfig) {
        modelConfig = newModelConfig || modelConfig;
        playerConfig = newPlayerConfig || playerConfig;
        setupModel();
        resetModelPlayer();
        dispatch.modelReset();
      }

      function repaint() {
        moleculeContainer.setup_drawables();
      }

      // ------------------------------------------------------------
      //
      // Initial setup of this modelController:
      //
      // ------------------------------------------------------------

      if (typeof DEVELOPMENT === 'undefined') {
        try {
          setupModel();
        } catch(e) {
          alert(e);
          throw new Error(e);
        }
      } else {
        setupModel();
      }

      setupModelPlayer();
      dispatch.modelReset();

      // ------------------------------------------------------------
      //
      // Public methods
      //
      // ------------------------------------------------------------

      controller.on = function(type, listener) {
        dispatch.on(type, listener);
      };

      controller.reload = reload;
      controller.repaint = repaint;
      controller.moleculeContainer = moleculeContainer;

      return controller;
  };
});

(function() {
  var __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; };

  define('cs!common/components/thermometer',['require'],function(require) {
    var Thermometer;
    return Thermometer = (function() {

      function Thermometer(dom_selector, value, min, max) {
        this.dom_selector = dom_selector != null ? dom_selector : "#thermometer";
        this.value = value;
        this.min = min;
        this.max = max;
        this.resize = __bind(this.resize, this);

        this.dom_element = typeof this.dom_selector === "string" ? $(this.dom_selector) : this.dom_selector;
        this.dom_element.addClass('thermometer');
        this.thermometer_fill = $('<div>').addClass('thermometer_fill');
        this.dom_element.append(this.thermometer_fill);
        this.redraw();
      }

      Thermometer.prototype.add_value = function(value) {
        this.value = value;
        return this.redraw();
      };

      Thermometer.prototype.scaled_value = function() {
        return (this.value - this.min) / (this.max - this.min);
      };

      Thermometer.prototype.resize = function() {
        return this.redraw();
      };

      Thermometer.prototype.redraw = function() {
        return this.thermometer_fill.height("" + (this.scaled_value() * this.dom_element.height()) + "px");
      };

      return Thermometer;

    })();
  });

}).call(this);

/*global define $ */

//
// Layout for non-embedded 'interactives' page
//
define('common/layout/interactive-layout',['require','common/layout/layout'],function (require) {
  // Dependencies.
  var layout = require('common/layout/layout');

  function setThermometerHeight(thermometerComponent, h) {
    // get height of thermometer label, including margin:
    var labelHeight = $('.interactive-thermometer p.label').outerHeight(true);

    $('.interactive-thermometer').height(h);
    // allow for a min-height calculation to make the height larger than h
    h = $('.interactive-thermometer').height();
    $('.interactive-thermometer .thermometer').height(h - labelHeight);

    thermometerComponent.redraw();
  }

  return function setupInteractiveLayout() {
    var i,
        w,
        h,
        modelWidth,
        modelHeight,
        modelAspectRatio,
        modelWidthFactor,
        viewLists,
        viewSizes = {},
        viewType,
        containerWidth = $('#content').width(),
        containerHeight = $('#content').height(),
        emsize;

    // grab 'viewLists' from legacy layout system
    viewLists = layout.views;

    w = $(viewLists.moleculeContainers[0].outerNode).width();
    h = $(viewLists.moleculeContainers[0].outerNode).height();
    modelAspectRatio = w / h;

    // Model container should take up 60% of parent container width...
    modelWidthFactor = 0.60;

    // unless there needs to be room for energy graph *and* thermometer
    if (viewLists.energyGraphs) {
      modelWidthFactor = 0.50;
    }

    modelWidth = containerWidth * modelWidthFactor;
    modelHeight = modelWidth / modelAspectRatio;

    // width of moleculeContainer derives automatically from height
    viewSizes.moleculeContainers = [modelWidth, modelHeight];

    if (viewLists.energyGraphs) {
      viewSizes.energyGraphs = [containerWidth * 0.45, modelHeight];
    }

    for (viewType in viewLists) {
      if (viewLists.hasOwnProperty(viewType) && viewLists[viewType].length) {
        i = -1;  while(++i < viewLists[viewType].length) {
          if (viewSizes[viewType]) {
            viewLists[viewType][i].resize(viewSizes[viewType][0], viewSizes[viewType][1]);
          } else {
            viewLists[viewType][i].resize();
          }
        }
      }
    }

    // Get the actual molecule container height after resize (minimum width may have come into play)
    h = $(viewLists.moleculeContainers[0].outerNode).height();

    if (layout.views.thermometers) {
      setThermometerHeight(layout.views.thermometers[0], 0.8 * h);
    }

    // FIXME this is a temporary hack ... put in layout code instead of memorializing it in the CSS,
    // which doesn't tend to get reviewed as closely.

    // Push the molecule-container down so its top lines up with the energy graph's top exactly.
    // After brief investigation, couldn't tell for sure why the energyGraph container was being pushed down ~5px by the browser...
    if (viewLists.energyGraphs) {
      $(viewLists.moleculeContainers[0].outerNode).css('top', 5);
    }
  };
});

/*global define model layout $ alert ACTUAL_ROOT grapher */
/*jshint eqnull: true boss: true */
define('md2d/controllers/interactives-controller',['require','md2d/controllers/model-controller','cs!common/components/thermometer','common/layout/layout','common/layout/interactive-layout'],function (require) {
  // Dependencies.
  var ModelController        = require('md2d/controllers/model-controller'),
      Thermometer            = require('cs!common/components/thermometer'),
      layout                 = require('common/layout/layout'),
      setupInteractiveLayout = require('common/layout/interactive-layout');

  return function interactivesController(interactive, viewSelector, modelLoadedCallbacks, layoutStyle) {

    modelLoadedCallbacks = modelLoadedCallbacks || [];

    var controller = {},
        modelController,
        $interactiveContainer,
        propertiesListeners = [],
        playerConfig,
        componentCallbacks = [],
        onLoadScripts = [],
        thermometer,
        energyGraph,
        energyData = [[],[],[]],

        setupScreenCalledTwice = false,

        //
        // Define the scripting API used by 'action' scripts on interactive elements.
        //
        // The properties of the object below will be exposed to the interactive's
        // 'action' scripts as if they were local vars. All other names (including
        // all globals, but exluding Javascript builtins) will be unavailable in the
        // script context; and scripts are run in strict mode so they don't
        // accidentally expose or read globals.
        //
        // TODO: move construction of this object to its own file.
        //

        scriptingAPI = (function() {

          function isInteger(n) {
            // Exploits the facts that (1) NaN !== NaN, and (2) parseInt(Infinity, 10) is NaN
            return typeof n === "number" && (parseFloat(n) === parseInt(n, 10));
          }

          function isArray(obj) {
            return typeof obj === 'object' && obj.slice === Array.prototype.slice;
          }

          /** return an integer randomly chosen from the set of integers 0..n-1 */
          function randomInteger(n) {
            return Math.floor(Math.random() * n);
          }

          function swapElementsOfArray(array, i, j) {
            var tmp = array[i];
            array[i] = array[j];
            array[j] = tmp;
          }

          /** Return an array of n randomly chosen members of the set of integers 0..N-1 */
          function choose(n, N) {
            var values = [],
                i;

            for (i = 0; i < N; i++) { values[i] = i; }

            for (i = 0; i < n; i++) {
              swapElementsOfArray(values, i, i + randomInteger(N-i));
            }
            values.length = n;

            return values;
          }

          return {

            deg2rad: Math.PI/180,
            rad2deg: 180/Math.PI,

            addAtom: function addAtom() {
              return model.addAtom.apply(model, arguments);
            },

            addRandomAtom: function addRandomAtom() {
              return model.addRandomAtom.apply(model, arguments);
            },

            get: function get() {
              return model.get.apply(model, arguments);
            },

            set: function set() {
              return model.set.apply(model, arguments);
            },

            adjustTemperature: function adjustTemperature(fraction) {
              model.set({temperature: fraction * model.get('temperature')});
            },

            limitHighTemperature: function limitHighTemperature(t) {
              if (model.get('temperature') > t) model.set({temperature: t});
            },

            loadModel: function loadModel(modelUrl, cb) {
              model.stop();
              controller.loadModel(modelUrl);

              // Assume that existing onLoadScripts are only relevant to the previous model
              onLoadScripts = [];
              if (typeof cb === 'function') {
                onLoadScripts.push(cb);
              }
            },

            /** returns a list of integers corresponding to atoms in the system */
            randomAtoms: function randomAtoms(n) {
              var numAtoms = model.get_num_atoms();

              if (n == null) n = 1 + randomInteger(numAtoms-1);

              if (!isInteger(n)) throw new Error("randomAtoms: number of atoms requested, " + n + ", is not an integer.");
              if (n < 0) throw new Error("randomAtoms: number of atoms requested, " + n + ", was less be greater than zero.");

              if (n > numAtoms) n = numAtoms;
              return choose(n, numAtoms);
            },

            /**
              Accepts atom indices as arguments, or an array containing atom indices.
              Unmarks all atoms, then marks the requested atom indices.
              Repaints the screen to make the marks visible.
            */
            markAtoms: function markAtoms() {
              var i,
                  len;

              if (arguments.length === 0) return;

              // allow passing an array instead of a list of atom indices
              if (isArray(arguments[0])) {
                return markAtoms.apply(null, arguments[0]);
              }

              scriptingAPI.unmarkAllAtoms();

              // mark the requested atoms
              for (i = 0, len = arguments.length; i < len; i++) {
                model.setAtomProperties(arguments[i], {marked: 1});
              }
              scriptingAPI.repaint();
            },

            unmarkAllAtoms: function unmarkAllAtoms() {
              for (var i = 0, len = model.get_num_atoms(); i < len; i++) {
                model.setAtomProperties(i, {marked: 0});
              }
              scriptingAPI.repaint();
            },

            /**
              Sets individual atom properties using human-readable hash.
              e.g. setAtomProperties(5, {x: 1, y: 0.5, charge: 1})
            */
            setAtomProperties: function setAtomProperties(i, props, checkLocation, moveMolecule) {
              model.setAtomProperties(i, props, checkLocation, moveMolecule);
              scriptingAPI.repaint();
            },

            /**
              Returns atom properties as a human-readable hash.
              e.g. getAtomProperties(5) --> {x: 1, y: 0.5, charge: 1, ... }
            */
            getAtomProperties: function getAtomProperties(i) {
              return model.getAtomProperties(i);
            },

            /**
              Observe property `propertyName` on the model, and perform `action` when it changes.
              Pass property value to action.
            */
            onPropertyChange: function onPropertyChange(propertyName, action) {
              model.addPropertiesListener([propertyName], function() {
                action( model.get(propertyName) );
              });
            },

            setElementProperties: function setElementProperties(i, props) {
              model.setElementProperties(i, props);
              scriptingAPI.repaint();
            },

            getElementProperties: function getElementProperties(i) {
              return model.getElementProperties(i);
            },

            setRadialBondProperties: function setRadialBondProperties(i, props) {
              model.setRadialBondProperties(i, props);
              scriptingAPI.repaint();
            },

            getRadialBondProperties: function getRadialBondProperties(i) {
              return model.getRadialBondProperties(i);
            },

            setAngularBondProperties: function setAngularBondProperties(i, props) {
              model.setAngularBondProperties(i, props);
              scriptingAPI.repaint();
            },

            getAngularBondProperties: function getAngularBondProperties(i) {
              return model.getAngularBondProperties(i);
            },

            pe: function pe() {
              return model.pe();
            },

            ke: function ke() {
              return model.ke();
            },

            start: function start() {
              model.start();
            },

            stop: function stop() {
              model.stop();
            },

            reset: function reset() {
              model.stop();
              modelController.reload();
            },

            tick: function tick() {
              model.tick();
            },

            repaint: function repaint() {
              modelController.repaint();
            },

            // rudimentary debugging functionality
            alert: alert,

            console: window.console != null ? window.console : {
              log: function() {},
              error: function() {},
              warn: function() {},
              dir: function() {}
            }
          };
        }());

    /**
      Allow console users to try script actions
    */
    function exposeScriptingAPI() {
      window.script = $.extend({}, scriptingAPI);
      window.script.run = function(source, args) {
        var prop,
            argNames = [],
            argVals = [];

        for (prop in args) {
          if (args.hasOwnProperty(prop)) {
            argNames.push(prop);
            argVals.push(args[prop]);
          }
        }
        return makeFunctionInScriptContext.apply(null, argNames.concat(source)).apply(null, argVals);
      };
    }

    /**
      Load the model from the url specified in the 'model' key. 'modelLoaded' is called
      after the model loads.

      @param: modelUrl
    */
    function loadModel(modelUrl) {

      modelUrl = ACTUAL_ROOT + modelUrl;

      $.get(modelUrl).done(function(modelConfig) {

        // Deal with the servers that return the json as text/plain
        modelConfig = typeof modelConfig === 'string' ? JSON.parse(modelConfig) : modelConfig;

        if (modelController) {
          modelController.reload(modelConfig, playerConfig);
        } else {
          modelController = ModelController('#molecule-container', modelConfig, playerConfig);
          modelLoaded();
          // also be sure to get notified when the underlying model changes
          modelController.on('modelReset', modelLoaded);
          controller.modelController = modelController;
        }
      });
    }

    function createComponent(component) {
      switch (component.type) {
        case 'button':
          return createButton(component);
        case 'checkbox':
          return createCheckbox(component);
        case 'pulldown':
          return createPulldown(component);
        case 'thermometer':
          thermometer = createThermometer(component);
          return thermometer;
        case 'energyGraph':
          return createEnergyGraph(component);
        case 'slider':
          return createSlider(component);
      }
    }

    /**
      Given a script string, return a function that executes that script in a
      context containing *only* the bindings to names we supply.

      This isn't intended for XSS protection (in particular it relies on strict
      mode.) Rather, it's so script authors don't get too clever and start relying
      on accidentally exposed functionality, before we've made decisions about
      what scripting API and semantics we want to support.
    */
    function makeFunctionInScriptContext() {
      var prop,
          whitelistedNames,
          whitelistedObjectsArray,
          scriptFunctionMakerSource,

          // First n-1 arguments to this function are the names to bind to the arguments that are
          // passed to the function we make
          argumentsToScript = Array.prototype.slice.call(arguments, 0, arguments.length - 1),

          // Last argument is the function body of the script, as a string
          scriptSource = arguments[arguments.length - 1];

      // Construct parallel arrays of the keys and values of the scripting API
      whitelistedNames = [];
      whitelistedObjectsArray = [];

      for (prop in scriptingAPI) {
        if (scriptingAPI.hasOwnProperty(prop) && argumentsToScript.indexOf(prop) < 0) {
          whitelistedNames.push(prop);
          whitelistedObjectsArray.push( scriptingAPI[prop] );
        }
      }

      // Make sure the script runs in strict mode, so undeclared variables don't
      // escape to the toplevel scope.
      scriptFunctionMakerSource =  "return function(" + argumentsToScript.join(',') + ") { 'use " + "strict'; " + scriptSource + "};";

      // This function runs the script with all globals shadowed:
      return function() {
        var prop,
            blacklistedNames,
            scriptArgumentList,
            safedScript;

        // Blacklist all globals, except those we have whitelisted. (Don't move
        // the construction of 'blacklistedNames' to the enclosing scope, because
        // new globals -- in particular, 'model' -- are created in between the
        // time the enclosing function executes and the time this function
        // executes.)
        blacklistedNames = [];
        for (prop in window) {
          if (window.hasOwnProperty(prop) && !scriptingAPI.hasOwnProperty(prop)) {
            blacklistedNames.push(prop);
          }
        }

        // Here's the key. The Function constructor acccepts a list of argument
        // names followed by the source of the *body* of the function to
        // construct. We supply the whitelist names, followed by the "blacklist"
        // of globals, followed by the script source. But when we invoke the
        // function thus created, we will only provide values for the whitelisted
        // names -- all of the "blacklist" names will therefore have the value
        // 'undefined' inside the function body.
        //
        // (Additionally, remember that functions created by the Function
        // constructor execute in the global context -- they don't capture names
        // from the scope they were created in.)
        scriptArgumentList = whitelistedNames.concat(blacklistedNames).concat(scriptFunctionMakerSource);

        // TODO: obvious optimization: cache the result of the Function constructor
        // and don't reinvoke the Function constructor unless the blacklistedNames array
        // has changed. Create a unit test for this scenario.
        try {
          safedScript = Function.apply(null, scriptArgumentList).apply(null, whitelistedObjectsArray);
        } catch (e) {
          alert("Error compiling script: \"" + e.toString() + "\"\nScript:\n\n" + scriptSource);
        }

        try {
          // invoke the script, passing only enough arguments for the whitelisted names
          return safedScript.apply(null, Array.prototype.slice.call(arguments));
        } catch (e) {
          alert("Error running script: \"" + e.toString() + "\"\nScript:\n\n" + scriptSource);
        }
      };
    }

    /**
      Generic function that accepts either a string or an array of strings,
      and returns the complete string
    */
    function getStringFromArray(str) {
      if (typeof str === 'string') {
        return str;
      }
      return str.join('\n');
    }

    function createButton(component) {
      var $button, scriptStr;

      $button = $('<button>').attr('id', component.id).html(component.text);
      $button.addClass("component");

      scriptStr = getStringFromArray(component.action);

      $button.click(makeFunctionInScriptContext(scriptStr));

      return { elem: $button };
    }

    function createCheckbox(component) {
      var propertyName = component.property,
          action = component.action,
          $checkbox,
          $label;

      $checkbox = $('<input type="checkbox">').attr('id', component.id);
      $label = $('<label>').append($checkbox).append(component.text);
      // Append class to label, as it's the most outer container in this case.
      $label.addClass("component");

      // Process action script if it is defined.
      if (action) {
        action = getStringFromArray(action);
        // Create a function which assumes we pass it a parameter called 'value'.
        action = makeFunctionInScriptContext('value', action);
      }

      // Connect checkbox with model's property if its name is defined.
      if (propertyName !== undefined) {
        modelLoadedCallbacks.push(function () {
          var updateCheckbox = function () {
            var value = model.get(propertyName);
            if (value) {
              $checkbox.attr('checked', true);
            } else {
              $checkbox.attr('checked', false);
            }
          };
          // Register listener for 'propertyName'.
          model.addPropertiesListener([propertyName], updateCheckbox);
          // Perform initial checkbox setup.
          updateCheckbox();
        });
      }

      // Register handler for click event.
      $checkbox.click(function () {
        var value = false,
            propObj;
        // $(this) will contain a reference to the checkbox.
        if ($(this).is(':checked')) {
          value = true;
        }
        // Change property value if checkbox is connected
        // with model's property.
        if (propertyName !== undefined) {
          propObj = {};
          propObj[propertyName] = value;
          model.set(propObj);
        }
        // Finally, if checkbox has action script attached,
        // call it in script context with checkbox status passed.
        if (action !== undefined) {
          action(value);
        }
      });

      // Return label tag, as it contains checkbox anyway.
      return { elem: $label };
    }

    function createPulldown(component) {
      var $pulldown, $option,
          options = component.options || [],
          option,
          i, ii;

      $pulldown = $('<select>').attr('id', component.id);
      $pulldown.addClass("component");

      for (i=0, ii=options.length; i<ii; i++) {
        option = options[i];
        $option = $('<option>').html(option.text);
        if (option.disabled) {
          $option.attr("disabled", option.disabled);
        }
        if (option.selected) {
          $option.attr("selected", option.selected);
        }
        $pulldown.append($option);
      }

      $pulldown.change(function() {
        var index = $(this).prop('selectedIndex'),
            action = component.options[index].action,
            scriptStr;

        if (action){
          scriptStr = getStringFromArray(action);
          makeFunctionInScriptContext(scriptStr)();
        } else if (component.options[index].loadModel){
          model.stop();
          loadModel(component.options[index].loadModel);
        }
      });

      return { elem: $pulldown };
    }

    function createSlider(component) {
      var min = component.min,
          max = component.max,
          steps = component.steps,
          action = component.action,
          propertyName = component.property,
          initialValue = component.initialValue,
          title = component.title || "",
          labels = component.labels || [],
          i,
          $elem,
          $title,
          label,
          $label,
          $slider,
          $container;

      if (min == null) min = 0;
      if (max == null) max = 10;
      if (steps == null) steps = 10;

      $title = $('<p class="title">' + title + '</p>');
      // we pick up the SVG slider component CSS if we use the generic class name 'slider'
      $container = $('<div class="container">');
      $slider = $('<div class="html-slider">');
      $container.append($slider);

      $slider.slider({
        min: min,
        max: max,
        step: (max - min) / steps
      });

      $elem = $('<div class="interactive-slider">')
                .append($title)
                .append($container);

      for (i = 0; i < labels.length; i++) {
        label = labels[i];
        $label = $('<p class="label">' + label.label + '</p>');
        $label.css('left', (label.value-min) / (max-min) * 100 + '%');
        $container.append($label);
      }

      if (action) {
        // The 'action' property is a source of a function which assumes we pass it a parameter
        // called 'value'.
        action = makeFunctionInScriptContext('value', action);
        $slider.bind('slide', function(event, ui) {
          action(ui.value);
        });
      }

      if (propertyName) {
        $slider.bind('slide', function(event, ui) {
          // just ignore slide events that occur before the model is loaded
          var obj = {};
          obj[propertyName] = ui.value;
          if (model) model.set(obj);
        });

        modelLoadedCallbacks.push(function() {
          model.addPropertiesListener([propertyName], function() {
            $slider.slider('value', model.get(propertyName));
          });
        });
      }

      if (initialValue != null) {
        // Make sure to call the action with the startup value of slider. (The script action may
        // manipulate the model, so we have to make sure it runs after the model loads, by pushing
        // it onto 'modelLoadedCallbacks'.)
        if (action) {
          modelLoadedCallbacks.push(function() {
            $slider.slider('value', initialValue);
            action(initialValue);
          });
        }

        if (propertyName) {
          modelLoadedCallbacks.push(function() {
            var obj = {};
            obj.propertyName = initialValue;
            model.set(obj);
          });
        }
      } else if (propertyName) {
        modelLoadedCallbacks.push(function() {
          $slider.slider('value', model.get(propertyName));
        });
      }

      return { elem: $elem };
    }

    /**
      Returns an 'interactive thermometer' object, that wraps a base Thermometer with a label for use
      in Interactives.

      properties are:

       elem:      DOM element containing the Thermometer div and the label div
       component: base Thermometer object, with no label
       callback:  standard interactive component callback, called as soon as the display is ready
       update:    method to ask thermometer to update its display
    */
    function createThermometer(component) {
      var $thermometer = $('<div>').attr('id', component.id),

          reading,
          units = "K",
          offset = 0,
          scale = 1,
          digits = 0,

          labelIsReading = !!component.labelIsReading,
          labelText = labelIsReading ? "" : "Thermometer",
          $label = $('<p class="label">').text(labelText).width('6em'),
          $elem = $('<div class="interactive-thermometer">')
                  .append($thermometer)
                  .append($label),

          thermometerComponent = new Thermometer($thermometer, null, component.min, component.max),
          self;

      if (reading = component.reading) {
        if (reading.units != null)  units = reading.units;
        if (reading.offset != null) offset = reading.offset;
        if (reading.scale != null)  scale = reading.scale;
        if (reading.digits != null) digits = reading.digits;
      }

      function updateLabel(temperature) {
        temperature = scale*temperature + offset;
        $label.text(temperature.toFixed(digits) + " " + units);
      }

      queuePropertiesListener(['temperature'], function() { self.update(); });

      return self = {
        elem:      $elem,
        component: thermometerComponent,

        callback: function() {
          thermometerComponent.resize();
          self.update();
        },

        update: function() {
          var t = model.get('temperature');
          thermometerComponent.add_value(t);
          if (labelIsReading) updateLabel(t);
        }
      };
    }

    function queuePropertiesListener(properties, func) {
      if (typeof model !== 'undefined') {
        model.addPropertiesListener(properties, func);
      } else {
        propertiesListeners.push([properties, func]);
      }
    }

    function createEnergyGraph(component) {
      var elem = $('<div>').attr('id', component.id);
      return  {
        elem: elem,
        callback: function() {

          var thisComponent = component,
              $container = $('#' + thisComponent.id),
              sample = model.get("viewRefreshInterval")/1000,
              options = {
                title:     "Energy of the System (KE:red, PE:green, TE:blue)",
                xlabel:    "Model Time (ps)",
                xmin:      0,
                xmax:     20,
                sample:    sample,
                ylabel:    "eV",
                ymin:      -5.0,
                ymax:      5.0
              };

          resetEnergyData();

          model.addPropertiesListener(['viewRefreshInterval'], function() {
            options.sample = model.get("viewRefreshInterval")/1000;
            energyGraph.reset(options);
          });

          // Create energyGraph only if it hasn't been drawn before:
          if (!energyGraph) {
            $.extend(options, thisComponent.options || []);
            newEnergyGraph(thisComponent.id, options);
          } else {
            sample = model.get("viewRefreshInterval")/1000;
            options.sample = sample;
            $.extend(options, thisComponent.options || []);
            energyGraph.reset('#' + thisComponent.id, options, $container[0]);
          }

          if (thisComponent.dimensions) {
            energyGraph.resize(thisComponent.dimensions.width, component.dimensions.height);
          }

          // This method is called whenever a model loads (i.e., a new model object is created.)
          // Always request event notifications from the new model object.

          model.on('tick.energyGraph', updateEnergyGraph);

          model.on('play.energyGraph', function() {
            if (energyGraph.number_of_points() && model.stepCounter() < energyGraph.number_of_points()) {
              resetEnergyData(model.stepCounter());
              energyGraph.new_data(energyData);
            }
            energyGraph.show_canvas();
          });

          model.on('reset.energyGraph', function() {
            sample = model.get("viewRefreshInterval")/1000;
            options.sample = sample;
            resetEnergyData();
            energyGraph.reset('#' + thisComponent.id, options);
            energyGraph.new_data(energyData);
          });

          model.on('seek.energyGraph', function() {
            var modelsteps = model.stepCounter();
            if (modelsteps > 0) {
              resetEnergyData(modelsteps);
            } else {
              resetEnergyData();
            }
            energyGraph.new_data(energyData);
          });

        }
      };
    }

    function newEnergyGraph(id, options) {
      options = options || {};
      options.dataset = energyData;
      energyGraph = grapher.realTimeGraph('#' + id, options);
    }

    function updateEnergyGraph() {
      energyGraph.add_points(updateEnergyData());
    }

    // Add another sample of model KE, PE, and TE to the arrays in energyData
    function updateEnergyData() {
      var ke = model.ke(),
          pe = model.pe(),
          te = ke + pe;
      energyData[0].push(ke);
      energyData[1].push(pe);
      energyData[2].push(te);
      return [ke, pe, te];
    }

    // Reset the energyData arrays to a specific length by passing in an index value,
    // or empty the energyData arrays an initialize the first sample.
    function resetEnergyData(index) {
      var modelsteps = model.stepCounter(),
          i,
          len;

      if (index) {
        for (i = 0, len = energyData.length; i < len; i++) {
          energyData[i].length = modelsteps;
        }
        return index;
      } else {
        energyData = [[0],[0],[0]];
        return 0;
      }
    }

    /**
      Call this after the model loads, to process any queued resize and update events
      that depend on the model's properties, then draw the screen.
    */
    function modelLoaded() {
      var i, listener;

      for(i = 0; i < componentCallbacks.length; i++) {
        componentCallbacks[i]();
      }

      layout.addView('moleculeContainers', modelController.moleculeContainer);
      if (thermometer) layout.addView('thermometers', thermometer.component);
      if (energyGraph) layout.addView('energyGraphs', energyGraph);
      $(window).unbind('resize');

      if (layoutStyle) {
        // for compatibility with current implementation "embedded" interactive style
        layout.selection = layoutStyle;
        layout.setupScreen();

        // layout.setupScreen modifies the size of the molecule view's containing element based on
        // its current size. The first two times it is called, it sets the container to two different
        // sizes. After that, further calls do not change the size of the container. (For some reason,
        // when the screen resizes, only one call to setupScreen is required.)
        //
        // The following is therefore a dirty hack to pretend layout.setupScreen behaves more nicely.
        if (!setupScreenCalledTwice) {
          layout.setupScreen();
          setupScreenCalledTwice = true;
        }

        $(window).on('resize', layout.setupScreen);
      } else {
        // preferred path...
        setupInteractiveLayout();
        $(window).on('resize', setupInteractiveLayout);
      }

      for(i = 0; i < propertiesListeners.length; i++) {
        listener = propertiesListeners[i];
        model.addPropertiesListener(listener[0], listener[1]);
      }

      for(i = 0; i < onLoadScripts.length; i++) {
        onLoadScripts[i]();
      }

      for(i = 0; i < modelLoadedCallbacks.length; i++) {
        modelLoadedCallbacks[i]();
      }
    }

    /**
      The main method called when this controller is created.

      Populates the element pointed to by viewSelector with divs to contain the
      molecule container (view) and the various components specified in the interactive
      definition, and

      @param newInteractive
        hash representing the interactive specification
      @param viewSelector
        jQuery selector that finds the element to put the interactive view into
    */
    function loadInteractive(newInteractive, viewSelector) {
      var modelUrl,
          componentJsons,
          components = {},
          component,
          divArray,
          div,
          componentId,
          $top, $right, $rightwide, $bottom,
          i, ii;

      componentCallbacks = [];
      interactive = newInteractive;
      $interactiveContainer = $(viewSelector);
      if ($interactiveContainer.children().length === 0) {
        $top = $('<div class="interactive-top" id="top"/>');
        $top.append('<div class="interactive-top" id="molecule-container"/>');
        if (interactive.layout && interactive.layout.right) {
          $right = $('<div class="interactive-top" id="right"/>');
          $top.append($right);
        }
        if (interactive.layout && interactive.layout.rightwide) {
          $rightwide = $('<div class="interactive-top" id="rightwide"/>');
          $top.append($rightwide);
        }
        $interactiveContainer.append($top);
        $interactiveContainer.append('<div class="interactive-bottom" id="bottom"/>');
      } else {
        $bottom = $("#bottom");
        $right = $("#right");
        $rightwide = $("#rightwide");
        $bottom.html('');
        if ($right) {
          $right.empty();
        }
        if ($rightwide) {
          $rightwide.empty();
        }
      }

      if (interactive.model != null) {
        var onLoad = interactive.model.onLoad;

        modelUrl = interactive.model.url;
        if (interactive.model.viewOptions) {
          // make a deep copy of interactive.model.viewOptions, so we can freely mutate playerConfig
          // without the results being serialized or displayed in the interactives editor.
          playerConfig = $.extend(true, {}, interactive.model.viewOptions);
        } else {
          playerConfig = { controlButtons: 'play' };
        }
        playerConfig.fit_to_parent = !layoutStyle;
        playerConfig.interactiveUrl = modelUrl;

        if (onLoad != null) {
          onLoadScripts.push( makeFunctionInScriptContext( getStringFromArray(onLoad) ) );
        }
      }

      if (modelUrl) loadModel(modelUrl);

      componentJsons = interactive.components || [];

      for (i = 0, ii=componentJsons.length; i<ii; i++) {
        component = createComponent(componentJsons[i]);
        components[componentJsons[i].id] = component;
      }


      // look at each div defined in layout, and add any components in that
      // array to that div. Then rm the component from components so we can
      // add the remainder to #bottom at the end
      if (interactive.layout) {
        for (div in interactive.layout) {
          if (interactive.layout.hasOwnProperty(div)) {
            divArray = interactive.layout[div];
            for (i = 0, ii = divArray.length; i<ii; i++) {
              componentId = divArray[i];
              if (components[componentId]) {
                $('#'+div).append(components[componentId].elem);
                if (components[componentId].callback) {
                  componentCallbacks.push(components[componentId].callback);
                }
                delete components[componentId];
              }
            }
          }
        }
      }

      // add the remaining components to #bottom
      for (componentId in components) {
        if (components.hasOwnProperty(componentId)) {
          $('#bottom').append(components[componentId].elem);
        }
      }


    }

    // run this when controller is created
    loadInteractive(interactive, viewSelector);
    exposeScriptingAPI();

    // make these private variables and functions available
    controller.loadInteractive = loadInteractive;
    controller.loadModel = loadModel;

    return controller;
  };
});

/*globals define: false, d3: false */
// ------------------------------------------------------------
//
//   Applet Container
//
// ------------------------------------------------------------
define('md2d/views/applet-container',['require','common/layout/layout'],function (require) {
  var layout = require('common/layout/layout');

  return function appletContainer(e, options) {
    var elem = d3.select(e),
        node = elem.node(),
        cx = elem.property("clientWidth"),
        cy = elem.property("clientHeight"),
        applet, appletString,
        appletWidth, appletHeight, appletAspectRatio,
        width, height,
        scale_factor,
        padding, size,
        mw, mh, tx, ty, stroke,
        default_options = {
          appletID:             "mw-applet",
          codebase:             "/jnlp",
          code:                 "org.concord.modeler.MwApplet",
          width:                "100%",
          height:               "100%",
          archive:              "org/concord/modeler/unsigned/mw.jar",
          align:                "left",
          hspace:               "5",
          vspace:               "5",
          params: [
            ["script", "page:0:import /imports/legacy-mw-content/potential-tests/two-atoms-two-elements/two-atoms-two-elements.cml"]
          ]
        };

    if (options) {
      for(var p in default_options) {
        if (options[p] === undefined) {
          options[p] = default_options[p];
        }
      }
    } else {
      options = default_options;
    }

    scale(cx, cy);

    function scale(w, h) {
      if (!arguments.length) {
        cy = elem.property("clientHeight");
        cx = elem.property("clientWidth");
      } else {
        cy = h;
        cx = w;
      }
      if(applet) {
        appletWidth  = +applet.runMwScript("mw2d:1:get %width");
        appletHeight = +applet.runMwScript("mw2d:1:get %height");
        appletAspectRatio = appletWidth/appletHeight;
        cy = cx * 1/appletAspectRatio * 1.25;
      }
      node.style.width = cx +"px";
      node.style.height = cy +"px";
      scale_factor = layout.screen_factor;
      if (layout.screen_factor_width && layout.screen_factor_height) {
        scale_factor = Math.min(layout.screen_factor_width, layout.screen_factor_height);
      }
      scale_factor = cx/600;
      padding = {
         "top":    5,
         "right":  5,
         "bottom": 5,
         "left":   5
      };

      height = cy - padding.top  - padding.bottom;
      width  = cx - padding.left  - padding.right;
      size = { "width":  width, "height": height };

      return [cx, cy];
    }

    function container() {
      if (applet === undefined) {
        appletString = generateAppletString();
        node.innerHTML = appletString;
        applet = document.getElementById(options.appletID);
      } else {
        applet.style.width  = size.width;
        applet.style.height = size.height;
        applet.width  = size.width;
        applet.height = size.height;
      }

      function generateAppletString() {
        var i, param, strArray;
        strArray =
          ['<applet id="' + options.appletID + '", codebase="' + options.codebase + '", code="' + options.code + '"',
           '     width="' + options.width + '" height="' + options.height + '" MAYSCRIPT="true"',
           '     archive="' + options.archive + '">',
           '     MAYSCRIPT="true">'];
        for(i = 0; i < options.params.length; i++) {
          param = options.params[i];
          strArray.push('  <param name="' + param[0] + '" value="' + param[1] + '"/>');
        }
        strArray.push('  <param name="MAYSCRIPT" value="true"/>');
        strArray.push('  Your browser is completely ignoring the applet tag!');
        strArray.push('</applet>');
        return strArray.join('\n');
      }

      // make these private variables and functions available
      container.node = node;
      container.scale = scale;
      container.applet = applet;
    }

    container.resize = function(w, h) {
      container.scale(w, h);
    };

    if (node) { container(); }

    return container;
  };
});

(function() {

  define('cs!common/components/slider',['require'],function(require) {
    var SliderComponent;
    return SliderComponent = (function() {

      function SliderComponent(dom_id, value_changed_function, min, max, value) {
        this.dom_id = dom_id != null ? dom_id : "#slider";
        this.value_changed_function = value_changed_function;
        this.min = min;
        this.max = max;
        this.value = value;
        this.dom_element = $(this.dom_id);
        this.dom_element.addClass('component').addClass('slider');
        this.min = this.min || this.dom_element.attr('data-min') || 0;
        this.max = this.max || this.dom_element.attr('data-max') || 1;
        this.value = this.value || this.dom_element.attr('data-value') || 0.5;
        this.precision = this.dom_element.attr('data-precision') || 3;
        this.label = this.dom_element.attr('data-label');
        this.domain = this.max - this.min;
        this.mouse_down = false;
        this.width = this.dom_element.width();
        this.height = this.dom_element.height();
        this.init_view();
        this.init_mouse_handlers();
      }

      SliderComponent.prototype.horizontal_orientation = function() {
        if (this.width > this.height) {
          return true;
        }
      };

      SliderComponent.prototype.init_view = function() {
        var midpoint;
        this.slider_well = $('<div>').addClass('slider_well');
        this.dom_element.append(this.slider_well);
        midpoint = this.width / 2;
        this.y1 = this.height;
        this.y2 = 0;
        this.x1 = this.x2 = midpoint;
        this.handle_y = (this.y1 + this.y2) / 2;
        this.handle_x = (this.x1 + this.x2) / 2;
        if (this.horizontal_orientation()) {
          midpoint = this.height / 4;
          this.y1 = this.y2 = midpoint;
          this.x1 = 0;
          this.x2 = this.width;
          this.handle_y = (this.y1 + this.y2) / 2;
          this.handle_x = this.value / this.domain * this.width;
        }
        this.init_slider_fill();
        this.slider_well_height = this.slider_well.height();
        this.slider_well_width = this.slider_well.width();
        this.init_handle();
        return this.init_label();
      };

      SliderComponent.prototype.init_slider_fill = function() {
        this.slider_fill = $('<div>').addClass('slider_fill');
        this.slider_well.append(this.slider_fill);
        if (this.horizontal_orientation()) {
          this.slider_fill.addClass('horizontal');
        } else {
          this.slider_fill.addClass('vertical');
        }
        return this.update_slider_filled();
      };

      SliderComponent.prototype.update_slider_filled = function() {
        if (this.horizontal_orientation()) {
          return this.slider_fill.width("" + this.handle_x + "px");
        } else {
          return this.slider_fill.height("" + this.handle_y + "px");
        }
      };

      SliderComponent.prototype.init_handle = function() {
        this.handle = $('<div>').addClass('handle');
        this.slider_well.append(this.handle);
        this.handle_width = parseInt(this.handle.width());
        this.handle_height = parseInt(this.handle.height());
        this.handle_width_offset = (this.handle_width / 2) - (this.handle_width - this.slider_well_width) / 2;
        this.handle_height_offset = (this.handle_height / 2) - (this.handle_height - this.slider_well_height) / 4;
        return this.update_handle();
      };

      SliderComponent.prototype.update = function() {
        this.update_handle();
        this.update_slider_filled();
        return this.update_label();
      };

      SliderComponent.prototype.update_handle = function() {
        return this.handle.css('left', "" + (this.handle_x - (this.handle_width / 2)) + "px").css('top', "" + (this.handle_y - this.handle_height_offset) + "px");
      };

      SliderComponent.prototype.init_label = function() {
        this.text_label = $('<div/>').addClass('label');
        this.dom_element.append(this.text_label);
        return this.update_label();
      };

      SliderComponent.prototype.set_scaled_value = function(v) {
        this.value = (v - this.min) / this.domain;
        this.handle_x = v / this.domain * this.width;
        return this.update();
      };

      SliderComponent.prototype.scaled_value = function() {
        var results;
        results = this.value;
        results = results * (this.max - this.min);
        results = results + this.min;
        return results;
      };

      SliderComponent.prototype.update_label = function() {
        var fomatted_value;
        if (this.label) {
          fomatted_value = this.scaled_value().toFixed(this.precision);
          return this.text_label.text("" + this.label + ": " + fomatted_value);
        } else {
          return this.text_label.hide();
        }
      };

      SliderComponent.prototype.handle_mousedown = function(e) {
        var _this = this;
        this.dragging = true;
        $(document).bind("mouseup.drag", this.documentMouseUpDelegate = function(e) {
          return _this.handle_mouseup(e);
        });
        $(document).bind("mousemove.drag", this.documentMouseMoveDelegate = function(e) {
          return _this.handle_drag(e);
        });
        return this.handle_drag(e);
      };

      SliderComponent.prototype.handle_drag = function(e) {
        var max_x, min_x, x, y;
        if (this.dragging) {
          document.onselectstart = function() {
            return false;
          };
          x = e.pageX - this.slider_well.position().left;
          y = e.pageY - this.slider_well.position().top;
          if (this.horizontal_orientation()) {
            max_x = this.width - (this.handle_width / 4);
            min_x = this.handle_width / 4;
            this.handle_x = x;
            if (this.handle_x < min_x) {
              this.handle_x = min_x;
            }
            if (this.handle_x > max_x) {
              this.handle_x = max_x;
            }
            this.value = this.handle_x / this.width;
          } else {
            this.handle_y = e.y;
            this.handle.attr('cy', this.handle_y);
            this.slider_fill.attr("y", this.handle_y).attr("height", this.height - this.handle_y);
            this.value = this.handle_y / this.height;
          }
          if (typeof this.value_changed_function === 'function') {
            this.value_changed_function(this.scaled_value());
          }
          return this.update();
        } else {
          return false;
        }
      };

      SliderComponent.prototype.handle_mouseup = function() {
        document.onselectstart = function() {
          return true;
        };
        if (this.dragging) {
          $(document).unbind("mousemove", this.documentMouseMoveDelegate);
          $(document).unbind("mouseup", this.documentMouseUpDelegate);
          this.dragging = false;
        }
        return true;
      };

      SliderComponent.prototype.init_mouse_handlers = function() {
        var _this = this;
        return this.slider_well.bind("mousedown", this.documentMouseUpDelegate = function(e) {
          return _this.handle_mousedown(e);
        });
      };

      return SliderComponent;

    })();
  });

}).call(this);

/*globals

  define
  DEVELOPMENT
  $
  alert
  model: true
  model_player: true
*/
/*jslint onevar: true*/
define('md2d/controllers/compare-models-controller',['require','md2d/models/modeler','md2d/views/applet-container','md2d/views/molecule-container','cs!common/components/model_player','cs!common/components/thermometer','cs!common/components/slider','common/layout/layout'],function (require) {
  // Dependencies.
  var Model             = require('md2d/models/modeler'),
      AppletContainer   = require('md2d/views/applet-container'),
      MoleculeContainer = require('md2d/views/molecule-container'),
      ModelPlayer       = require('cs!common/components/model_player'),
      Thermometer       = require('cs!common/components/thermometer'),
      SliderComponent   = require('cs!common/components/slider'),
      layout            = require('common/layout/layout');

  return function compareModelsController(moleculeViewId, appletContainerID, modelSelectID, modelConfig, playerConfig) {

    var layoutStyle         = playerConfig.layoutStyle,
        autostart           = playerConfig.autostart,
        maximum_model_steps = playerConfig.maximum_model_steps,
        lj_epsilon_max      = playerConfig.lj_epsilon_max,
        lj_epsilon_min      = playerConfig.lj_epsilon_min,

        elements            = modelConfig.elements,
        atoms               = modelConfig.atoms,
        mol_number          = modelConfig.mol_number,
        temperature_control = modelConfig.temperature_control,
        temperature         = modelConfig.temperature,
        width               = modelConfig.width,
        height              = modelConfig.height,
        keShading           = modelConfig.keShading,
        chargeShading       = modelConfig.chargeShading,
        showVDWLines        = modelConfig.showVDWLines,
        showClock           = modelConfig.showClock,
        viewRefreshInterval = modelConfig.viewRefreshInterval,
        timeStep            = modelConfig.timeStep,
        radialBonds         = modelConfig.radialBonds,
        angularBonds        = modelConfig.angularBonds,
        obstacles           = modelConfig.obstacles,
        viscosity           = modelConfig.viscosity,
        gravitationalField  = modelConfig.gravitationalField,
        images              = modelConfig.images,
        textBoxes           = modelConfig.textBoxes,

        nodes,

        moleculeContainer,
        modelListener,
        step_counter,
        therm,
        epsilon_slider,
        jsonFullPath, cmlFullPath,
        appletString,
        appletContainer,
        appletOptions = {},
        applet, cmlPath,
        start, stop, reset,
        modelSelect, pathList, hash;

    function controller() {

      // ------------------------------------------------------------
      //
      // Main callback from model process
      //
      // Pass this function to be called by the model on every model step
      //
      // ------------------------------------------------------------

      function modelListener(e) {
        moleculeContainer.update_drawable_positions();
      }

      // ------------------------------------------------------------
      //
      // Initialize (or update) local variables based on playerConfig and modelConfig objects
      //
      // ------------------------------------------------------------

      function initializeLocalVariables() {
        controlButtons      = playerConfig.controlButtons;
        modelTimeLabel      = playerConfig.modelTimeLabel;
        enableAtomTooltips  = playerConfig.enableAtomTooltips || false;
        fit_to_parent       = playerConfig.fit_to_parent;
        interactiveUrl      = playerConfig.interactiveUrl;

        elements            = modelConfig.elements;
        atoms               = modelConfig.atoms;
        mol_number          = modelConfig.mol_number;
        temperature_control = modelConfig.temperature_control;
        temperature         = modelConfig.temperature;
        width               = modelConfig.width;
        height              = modelConfig.height;
        keShading           = modelConfig.keShading;
        chargeShading       = modelConfig.chargeShading;
        showVDWLines        = modelConfig.showVDWLines;
        showClock           = modelConfig.showClock;
        viewRefreshInterval = modelConfig.viewRefreshInterval;
        timeStep            = modelConfig.timeStep;
        radialBonds         = modelConfig.radialBonds;
        angularBonds        = modelConfig.angularBonds;
        obstacles           = modelConfig.obstacles;
        viscosity           = modelConfig.viscosity;
        gravitationalField  = modelConfig.gravitationalField;
        images              = modelConfig.images;
        textBoxes           = modelConfig.textBoxes;
      }

      // ------------------------------------------------------------
      //
      // Create model and pass in properties
      //
      // ------------------------------------------------------------

      function createModel() {
        initializeLocalVariables();
        model = Model({
            elements            : elements,
            temperature         : temperature,
            temperature_control : temperature_control,
            width               : width,
            height              : height,
            keShading           : keShading,
            chargeShading       : chargeShading,
            showVDWLines        : showVDWLines,
            showClock           : showClock,
            viewRefreshInterval : viewRefreshInterval,
            timeStep            : timeStep,
            viscosity           : viscosity,
            gravitationalField  : gravitationalField,
            images              : images
          });

        if (atoms) {
          model.createNewAtoms(atoms);
        } else if (mol_number) {
          model.createNewAtoms(mol_number);
          model.relax();
        } else {
          throw new Error("ModelController: tried to create a model without atoms or mol_number.");
        }

        if (radialBonds) model.createRadialBonds(radialBonds);
        if (angularBonds) model.createAngularBonds(angularBonds);
        if (showVDWLines) model.createVdwPairs(atoms);
        if (obstacles) model.createObstacles(obstacles);
      }

      /**
        Returns a customized interface to the model for use by the view
      */
      function getModelInterface() {
        return {
          model:                   model,
          fit_to_parent:           fit_to_parent,
          xmax:                    width,
          ymax:                    height,
          keShading:               keShading,
          chargeShading:           chargeShading,
          enableAtomTooltips:      enableAtomTooltips,
          images:                  images,
          interactiveUrl:          interactiveUrl,
          textBoxes:               textBoxes,
          get_results:             function() { return model.get_results(); },
          get_radial_bond_results: function() { return model.get_radial_bond_results(); },
          get_radial_bonds:        function() { return model.get_radial_bonds(); },
          get_obstacles:           function() { return model.get_obstacles(); },
          get_vdw_pairs:           function() { return model.get_vdw_pairs(); },
          set_atom_properties:     function() { return model.setAtomProperties.apply(model, arguments);  },
          is_stopped:              function() { return model.is_stopped(); },

          controlButtons:      controlButtons,
          modelTimeLabel:      modelTimeLabel
        };
      }

      // ------------------------------------------------------------
      //
      // Create Views
      //
      // ------------------------------------------------------------

      function setupViews() {

        // ------------------------------------------------------------
        //
        // Create player and container view for model
        //
        // ------------------------------------------------------------

        layout.selection = layoutStyle;

        model_player = new ModelPlayer(model, autostart);

        moleculeContainer = MoleculeContainer(moleculeViewId, getModelInterface());

        moleculeContainer.updateMoleculeRadius();
        moleculeContainer.setup_drawables();

        // ------------------------------------------------------------
        //
        // Setup Java MW applet
        //
        // ------------------------------------------------------------

        cmlPath = currentCMLPath();
        if (cmlPath) {
          appletOptions = {
            params: [["script", "page:0:import " + "/imports/legacy-mw-content/" + cmlPath]]
          };
        } else {
          appletOptions = {};
        }
        appletContainer = AppletContainer(appletContainerID, appletOptions);

        // ------------------------------------------------------------
        //
        // Setup list of views used by layout system
        //
        // ------------------------------------------------------------

        layout.addView('moleculeContainers', moleculeContainer);
        layout.addView('appletContainers', appletContainer);

        layout.setupScreen();

      }

      // ------------------------------------------------------------
      //
      // Model Controller
      //
      // ------------------------------------------------------------

      function modelStop() {
        model.stop();
      }

      function modelGo() {
        model.on("tick", modelListener);
        model.resume();
      }

      function modelStepBack() {
        model.stop();
        model.stepBack();
      }

      function modelStepForward() {
        model.stop();
        model.stepForward();
      }

      function modelReset() {
        model.stop();
        createModel();
        setupModel();
        modelListener();
      }

      // ------------------------------------------------------------
      //
      //   Molecular Model Setup
      //
      // ------------------------------------------------------------

      function setupModel() {
        nodes = model.get_atoms();

        model.resetTime();

        modelStop();
        model.on("tick", modelListener);
        step_counter = model.stepCounter();
      }

      // ------------------------------------------------------------
      //
      //   Model List Setup
      //
      // ------------------------------------------------------------

      function currentJsonPath() {
        hash = document.location.hash;
        if (hash.length > 0) {
          return hash.substr(1, hash.length);
        } else {
          return false;
        }
      }

      function currentCMLPath() {
        var path = currentJsonPath();
        if (path) {
          return pathList[path.replace("/imports/legacy-mw-content/", "")].cmlPath;
        } else {
          return false;
        }
      }

      modelSelect = document.getElementById(modelSelectID);

      function updateModelSelect() {
        var path = currentJsonPath();
        if (path) {
          modelSelect.value = path.replace("/imports/legacy-mw-content/", "");
        } else {
          modelSelect.value = "two-atoms-two-elements/two-atoms-two-elements$0.json";
        }
      }

      function createPathList() {
        var i, j, item, sectionList, sectionPath;
        pathList = {};
        for(i = 0; i < modelList.length; i++) {
          sectionList = modelList[i];
          sectionPath = sectionList.section;
          for(j = 0; j < sectionList.content.length; j++) {
            item = sectionList.content[j];
            pathList[item.json] = {
              "name": item.name,
              "jsonPath": item.json,
              "cmlPath":  item.cml
            };
          }
        }
      }

      function processModelList() {
        createPathList();
        d3.select(modelSelect).selectAll("optgroup")
            .data(modelList)
          .enter().append("optgroup")
            .attr("label", function(d) { return d.section; })
            .selectAll("option")
                .data(function(d) { return d.content; })
              .enter().append("option")
                .text(function(d) { return d.name; })
                .attr("value", function(d) { return d.json; })
                .attr("data-cml-path", function(d) { return d.cml; });
        updateModelSelect();
      }


      // ------------------------------------------------------------
      //
      //   Java MW Applet Setup
      //
      // ------------------------------------------------------------

      function runMWScript(script) {
        return appletContainer.applet.runMwScript(script);
      }

      start = document.getElementById("start");
      start.onclick = function() {
        runMWScript("mw2d:1:run");
        modelGo();
      };

      stop = document.getElementById("stop");
      stop.onclick = function() {
        runMWScript("mw2d:1:stop");
        modelStop();
      };

      reset = document.getElementById("reset");
      reset.onclick = function() {
        runMWScript("mw2d:1:reset");
        modelReset();
      };

      function modelSelectHandler() {
        var selection = $(modelSelect).find("option:selected"),
            initialPath = "/imports/legacy-mw-content/",
            jsonPath = selection.attr("value");

        jsonFullPath = initialPath + jsonPath;
        document.location.hash = "#" + jsonFullPath;
      }

      modelSelect.onchange = modelSelectHandler;

      function setupMWApplet() {
        if (currentCMLPath()) {
          appletOptions = { params: [["script", "page:0:import " + currentCMLPath()]] };
          appletContainer = AppletContainer(appletContainerID, appletOptions);
          runMWScript("page:0:set frank false");
          layout.setView('appletContainers', [appletContainer]);
          layout.setupScreen();
        }
      }

      // ------------------------------------------------------------
      //
      //  Wire up screen-resize handlers
      //
      // ------------------------------------------------------------

      function onresize() {
        layout.setupScreen();
      }

      document.onwebkitfullscreenchange = onresize;
      window.onresize = onresize;

      // ------------------------------------------------------------
      //
      // Reset the model after everything else ...
      //
      // ------------------------------------------------------------

      function finishSetup() {
        processModelList();
        createModel();
        setupModel();
        setupViews();
        updateModelSelect();
      }

      if (typeof DEVELOPMENT === 'undefined') {
        try {
          finishSetup()
        } catch(e) {
          alert(e);
          throw new Error(e);
        }
      } else {
        finishSetup()
      }
      controller.runMWScript = runMWScript;
    }

    controller();
    return controller;
  };
});

/*globals define: false, d3: false */
// ------------------------------------------------------------
//
// Simple benchmark runner and results generator
//
//   see: https://gist.github.com/1364172
//
// ------------------------------------------------------------
//
// Runs benchmarks and generates the results in a table.
//
// Setup benchmarks to run in an array of objects with two properties:
//
//   name: a title for the table column of results
//   run: a function that is called to run the benchmark and returns a value
//
// Start the benchmarks by passing the table element where the results are to
// be placed and an array of benchmarks to run.
//
// Example:
//
//   var benchmarks_table = document.getElementById("benchmarks-table");
//
//   var benchmarks_to_run = [
//     {
//       name: "molecules",
//       run: function() {
//         return mol_number
//       }
//     },
//     {
//       name: "100 Steps (steps/s)",
//       run: function() {
//         modelStop();
//         var start = +Date.now();
//         var i = -1;
//         while (i++ < 100) {
//           model.tick();
//         }
//         elapsed = Date.now() - start;
//         return d3.format("5.1f")(100/elapsed*1000)
//       }
//     },
//   ];
//
//   benchmark.run(benchmarks_table, benchmarks_to_run)
//
// The first four columns in the generated table consist of:
//
//   browser, version, cpu/os, date
//
// These columns are followed by a column for each benchmark passed in.
//
// Subsequent calls to: benchmark.run(benchmarks_table, benchmarks_to_run) will
// add additional rows to the table.
//
// Here are some css styles for the table:
//
//   table {
//     font: 11px/24px Verdana, Arial, Helvetica, sans-serif;
//     border-collapse: collapse; }
//   th {
//     padding: 0 1em;
//     text-align: left; }
//   td {
//     border-top: 1px solid #cccccc;
//     padding: 0 1em; }
//

define('common/benchmark/benchmark',['require'],function (require) {

  var version = "0.0.1",
      windows_platform_token = {
        "Windows NT 6.2": "Windows 8",
        "Windows NT 6.1": "Windows 7",
        "Windows NT 6.0": "Windows Vista",
        "Windows NT 5.2": "Windows Server 2003; Windows XP x64 Edition",
        "Windows NT 5.1": "Windows XP",
        "Windows NT 5.01": "Windows 2000, Service Pack 1 (SP1)",
        "Windows NT 5.0": "Windows 2000",
        "Windows NT 4.0": "Microsoft Windows NT 4.0"
      },
      windows_feature_token = {
        "WOW64":       "64/32",
        "Win64; IA64": "64",
        "Win64; x64":  "64"
      };

  function what_browser() {
    var chromematch  = / (Chrome)\/(.*?) /,
        ffmatch      = / (Firefox)\/([0123456789ab.]+)/,
        safarimatch  = / AppleWebKit\/([0123456789.+]+) \(KHTML, like Gecko\) Version\/([0123456789.]+) (Safari)\/([0123456789.]+)/,
        iematch      = / (MSIE) ([0123456789.]+);/,
        operamatch   = /^(Opera)\/.+? Version\/([0123456789.]+)$/,
        iphonematch  = /.+?\((iPhone); CPU.+?OS .+?Version\/([0123456789._]+)/,
        ipadmatch    = /.+?\((iPad); CPU.+?OS .+?Version\/([0123456789._]+)/,
        ipodmatch    = /.+?\((iPod); CPU (iPhone.+?) like.+?Version\/([0123456789ab._]+)/,
        androidchromematch = /.+?(Android) ([0123456789.]+).*?; (.+?)\).+? Chrome\/([0123456789.]+)/,
        androidfirefoxmatch = /.+?(Android.+?\)).+? Firefox\/([0123456789.]+)/,
        androidmatch = /.+?(Android) ([0123456789ab.]+).*?; (.+?)\)/,
        match;

    match = navigator.userAgent.match(chromematch);
    if (match && match[1]) {
      return {
        browser: match[1],
        version: match[2],
        oscpu: os_platform()
      };
    }
    match = navigator.userAgent.match(ffmatch);
    if (match && match[1]) {
      var buildID = navigator.buildID,
          buildDate = "";
      if (buildID && buildID.length >= 8) {
        buildDate = "(" + buildID.slice(0,4) + "-" + buildID.slice(4,6) + "-" + buildID.slice(6,8) + ")";
      }
      return {
        browser: match[1],
        version: match[2] + ' ' + buildDate,
        oscpu: os_platform()
      };
    }
    match = navigator.userAgent.match(androidchromematch);
    if (match && match[1]) {
      return {
        browser: "Chrome",
        version: match[4],
        oscpu: match[1] + "/" + match[2] + "/" + match[3]
      };
    }
    match = navigator.userAgent.match(androidfirefoxmatch);
    if (match && match[1]) {
      return {
        browser: "Firefox",
        version: match[2],
        oscpu: match[1]
      };
    }
    match = navigator.userAgent.match(androidmatch);
    if (match && match[1]) {
      return {
        browser: "Android",
        version: match[2],
        oscpu: match[1] + "/" + match[2] + "/" + match[3]
      };
    }
    match = navigator.userAgent.match(safarimatch);
    if (match && match[3]) {
      return {
        browser: match[3],
        version: match[2] + '/' + match[1],
        oscpu: os_platform()
      };
    }
    match = navigator.userAgent.match(iematch);
    if (match && match[1]) {
      var platform_match = navigator.userAgent.match(/\(.*?(Windows.+?); (.+?)[;)].*/);
      return {
        browser: match[1],
        version: match[2],
        oscpu: windows_platform_token[platform_match[1]] + "/" + navigator.cpuClass + "/" + navigator.platform
      };
    }
    match = navigator.userAgent.match(operamatch);
    if (match && match[1]) {
      return {
        browser: match[1],
        version: match[2],
        oscpu: os_platform()
      };
    }
    match = navigator.userAgent.match(iphonematch);
    if (match && match[1]) {
      return {
        browser: "Mobile Safari",
        version: match[2],
        oscpu: match[1] + "/" + "iOS" + "/" + match[2]
      };
    }
    match = navigator.userAgent.match(ipadmatch);
    if (match && match[1]) {
      return {
        browser: "Mobile Safari",
        version: match[2],
        oscpu: match[1] + "/" + "iOS" + "/" + match[2]
      };
    }
    match = navigator.userAgent.match(ipodmatch);
    if (match && match[1]) {
      return {
        browser: "Mobile Safari",
        version: match[3],
        oscpu: match[1] + "/" + "iOS" + "/" + match[2]
      };
    }
    return {
      browser: "",
      version: navigator.appVersion,
      oscpu:   ""
    };
  }

  function os_platform() {
    var match = navigator.userAgent.match(/\((.+?)[;)] (.+?)[;)].*/);
    if (!match) { return "na"; }
    if (match[1] === "Macintosh") {
      return match[2];
    } else if (match[1].match(/^Windows/)) {
      var arch  = windows_feature_token[match[2]] || "32",
          token = navigator.userAgent.match(/\(.*?(Windows NT.+?)[;)]/);
      return windows_platform_token[token[1]] + "/" + arch;
    }
  }

  function run(benchmarks_table, benchmarks_to_run) {
    var i = 0, b, browser_info, results = [];
    benchmarks_table.style.display = "";

    var empty_table = benchmarks_table.getElementsByTagName("tr").length === 0;
    function add_row() {
      return benchmarks_table.appendChild(document.createElement("tr"));
    }

    var title_row = add_row(),
        results_row = add_row();

    function add_data(row, content, el) {
      var cell;
      el = el || "td";
      cell = row.appendChild(document.createElement(el));
      if (typeof content === "string" && content.slice(0,1) === "<") {
        cell.innerHTML = content;
      } else {
        cell.textContent = content;
      }
    }

    function add_column(title, data) {
      if (empty_table) { add_data(title_row, title, "th"); }
      add_data(results_row, data);
    }

    browser_info = what_browser();
    add_column("browser", browser_info.browser);
    add_column("version", browser_info.version);
    add_column("cpu/os", browser_info.oscpu);

    var formatter = d3.time.format("%Y-%m-%d %H:%M");
    add_column("date", formatter(new Date()));

    for (i = 0; i < benchmarks_to_run.length; i++) {
      b = benchmarks_to_run[i];
      add_column(b.name, b.run());
    }
  }

  // Return Public API.
  return {
    version: version,
    what_browser: function() {
      return what_browser();
    },
    run: function(benchmarks_table, benchmarks_to_run) {
      run(benchmarks_table, benchmarks_to_run);
    }
  };
});

/*globals define: false, window: false */

// TODO: just temporary solution, refactor it.
define('md2d/public-api',['require','md2d/controllers/interactives-controller','md2d/controllers/compare-models-controller','common/layout/layout','common/benchmark/benchmark'],function (require) {
  var interactivesController  = require('md2d/controllers/interactives-controller'),
      compareModelsController = require('md2d/controllers/compare-models-controller'),
      layout                  = require('common/layout/layout'),
      benchmark               = require('common/benchmark/benchmark'),
      // Object to be returned.
      publicAPI;

  publicAPI = {
    version: "0.0.1",
    // ==========================================================================
    // Add functions and modules which should belong to this API:
    interactivesController: interactivesController,
    compareModelsController: compareModelsController
    // ==========================================================================
  };
  // Export this API under 'controllers' name.
  window.controllers = publicAPI;
  // Also export layout and benchmark.
  window.layout = layout;
  window.benchmark = benchmark;

  // Return public API as a module.
  return publicAPI;
});
require(['md2d/public-api'], undefined, undefined, true); }());(function(){
  if (typeof Lab === 'undefined') Lab = {};
  Lab.version = {
    "repo": {
      "branch": "master",
      "commit": {
        "sha":           "2e4b2ae7134aa67f0bf7557fe62f1fd6c6b802b8",
        "short_sha":      "2e4b2ae7",
        "url":            "https://github.com/concord-consortium/lab/commit/2e4b2ae7",
        "author":        "Stephen Bannasch",
        "email":         "stephen.bannasch@gmail.com",
        "date":          "2012-10-15 16:02:10 -0400",
        "short_message": "Link to Interactive at home location works w/distribution",
        "message":       "Link to Interactive at home location works w/distribution\n\n[#37801099]\n\nNeeded to be more explicit with paths to make sure the About\nbox link to the &#x27;Home&#x27; version of the Interactive worked\nwhen running from a downloaded distribution.\n\nSee: http://lab.dev.concord.org/readme.html#distribution-of-project-and-examples"
      },
      "dirty": false
    }
  };
})();
(function(){
if (typeof Lab === 'undefined') Lab = {};
Lab.config = {
  "sharing": false,
  "home": "http://lab.concord.org",
  "home_interactive_path": "/examples/interactives/interactive.html",
  "home_embeddable_path": "/examples/interactives/embeddable.html",
  "aboutContent": "<p>This interactive was created by the <a href='http://concord.org/' class='opens-in-new-window' target='_blank'>Concord Consortium</a> using our <a href='http://mw.concord.org/nextgen/' class='opens-in-new-window' target='_blank'>Next-Generation Molecular Workbench</a> software, with funding by a grant from <a href='http://www.google.org/' class='opens-in-new-window' target='_blank'>Google.org</a>.</p>"
}
})();
