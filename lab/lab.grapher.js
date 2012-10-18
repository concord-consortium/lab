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
    var emsize,
        $buttons = $('button.component'),
        minButtonFontSize;
    if (!layout.display) {
      layout.display = layout.getDisplayProperties();
    }
    emsize = Math.min(layout.display.screen_factor_width * 1.2, layout.display.screen_factor_height * 1.2);
    $('body').css('font-size', emsize + 'em');
    if (emsize <= 0.5) {
      minButtonFontSize = 1.4 * 0.5/emsize;
      $buttons.css('font-size', minButtonFontSize + 'em');
      // $buttons.css('height', minButtonFontSize 'em');
    } else {
      $buttons.css('font-size', '');
      // $buttons.css('height', '');
    }
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
          bottomFactor = 0.0025;
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

      // account for proportionally larger buttons when embeddable size gets very small
      if (emsize <= 0.5) {
        bottomFactor *= 0.5/emsize;
      }

      viewLists.bottomItems = $('#bottom').children().length;
      if (viewLists.bottomItems) {
        modelHeightFactor -= ($('#bottom').height() * bottomFactor);
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
require(['grapher/public-api'], undefined, undefined, true); }());