(function() {
/**
 * almond 0.2.5 Copyright (c) 2011-2012, The Dojo Foundation All Rights Reserved.
 * Available via the MIT or new BSD license.
 * see: http://github.com/jrburke/almond for details
 */
//Going sloppy to avoid 'use strict' string cost, but strict practices should
//be followed.
/*jslint sloppy: true */
/*global setTimeout: false */

var requirejs, require, define;
(function (undef) {
    var main, req, makeMap, handlers,
        defined = {},
        waiting = {},
        config = {},
        defining = {},
        hasOwn = Object.prototype.hasOwnProperty,
        aps = [].slice;

    function hasProp(obj, prop) {
        return hasOwn.call(obj, prop);
    }

    /**
     * Given a relative module name, like ./something, normalize it to
     * a real name that can be mapped to a path.
     * @param {String} name the relative name
     * @param {String} baseName a real name that the name arg is relative
     * to.
     * @returns {String} normalized name
     */
    function normalize(name, baseName) {
        var nameParts, nameSegment, mapValue, foundMap,
            foundI, foundStarMap, starI, i, j, part,
            baseParts = baseName && baseName.split("/"),
            map = config.map,
            starMap = (map && map['*']) || {};

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
                for (i = 0; i < name.length; i += 1) {
                    part = name[i];
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
                            break;
                        } else if (i > 0) {
                            name.splice(i - 1, 2);
                            i -= 2;
                        }
                    }
                }
                //end trimDots

                name = name.join("/");
            } else if (name.indexOf('./') === 0) {
                // No baseName, so this is ID is resolved relative
                // to baseUrl, pull off the leading dot.
                name = name.substring(2);
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
        if (hasProp(waiting, name)) {
            var args = waiting[name];
            delete waiting[name];
            defining[name] = true;
            main.apply(undef, args);
        }

        if (!hasProp(defined, name) && !hasProp(defining, name)) {
            throw new Error('No ' + name);
        }
        return defined[name];
    }

    //Turns a plugin!resource to [plugin, resource]
    //with the plugin being undefined if the name
    //did not have a plugin prefix.
    function splitPrefix(name) {
        var prefix,
            index = name ? name.indexOf('!') : -1;
        if (index > -1) {
            prefix = name.substring(0, index);
            name = name.substring(index + 1, name.length);
        }
        return [prefix, name];
    }

    /**
     * Makes a name map, normalizing the name, and using a plugin
     * for normalization if necessary. Grabs a ref to plugin
     * too, as an optimization.
     */
    makeMap = function (name, relName) {
        var plugin,
            parts = splitPrefix(name),
            prefix = parts[0];

        name = parts[1];

        if (prefix) {
            prefix = normalize(prefix, relName);
            plugin = callDep(prefix);
        }

        //Normalize according
        if (prefix) {
            if (plugin && plugin.normalize) {
                name = plugin.normalize(name, makeNormalize(relName));
            } else {
                name = normalize(name, relName);
            }
        } else {
            name = normalize(name, relName);
            parts = splitPrefix(name);
            prefix = parts[0];
            name = parts[1];
            if (prefix) {
                plugin = callDep(prefix);
            }
        }

        //Using ridiculous property names for space reasons
        return {
            f: prefix ? prefix + '!' + name : name, //fullName
            n: name,
            pr: prefix,
            p: plugin
        };
    };

    function makeConfig(name) {
        return function () {
            return (config && config.config && config.config[name]) || {};
        };
    }

    handlers = {
        require: function (name) {
            return makeRequire(name);
        },
        exports: function (name) {
            var e = defined[name];
            if (typeof e !== 'undefined') {
                return e;
            } else {
                return (defined[name] = {});
            }
        },
        module: function (name) {
            return {
                id: name,
                uri: '',
                exports: defined[name],
                config: makeConfig(name)
            };
        }
    };

    main = function (name, deps, callback, relName) {
        var cjsModule, depName, ret, map, i,
            args = [],
            usingExports;

        //Use name if no relName
        relName = relName || name;

        //Call the callback to define the module, if necessary.
        if (typeof callback === 'function') {

            //Pull out the defined dependencies and pass the ordered
            //values to the callback.
            //Default to [require, exports, module] if no deps
            deps = !deps.length && callback.length ? ['require', 'exports', 'module'] : deps;
            for (i = 0; i < deps.length; i += 1) {
                map = makeMap(deps[i], relName);
                depName = map.f;

                //Fast path CommonJS standard dependencies.
                if (depName === "require") {
                    args[i] = handlers.require(name);
                } else if (depName === "exports") {
                    //CommonJS module spec 1.1
                    args[i] = handlers.exports(name);
                    usingExports = true;
                } else if (depName === "module") {
                    //CommonJS module spec 1.1
                    cjsModule = args[i] = handlers.module(name);
                } else if (hasProp(defined, depName) ||
                           hasProp(waiting, depName) ||
                           hasProp(defining, depName)) {
                    args[i] = callDep(depName);
                } else if (map.p) {
                    map.p.load(map.n, makeRequire(relName, true), makeLoad(depName), {});
                    args[i] = defined[depName];
                } else {
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

    requirejs = require = req = function (deps, callback, relName, forceSync, alt) {
        if (typeof deps === "string") {
            if (handlers[deps]) {
                //callback in this case is really relName
                return handlers[deps](callback);
            }
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

        //If relName is a function, it is an errback handler,
        //so remove it.
        if (typeof relName === 'function') {
            relName = forceSync;
            forceSync = alt;
        }

        //Simulate async callback;
        if (forceSync) {
            main(undef, deps, callback, relName);
        } else {
            //Using a non-zero value because of concern for what old browsers
            //do, and latest browsers "upgrade" to 4 if lower value is used:
            //http://www.whatwg.org/specs/web-apps/current-work/multipage/timers.html#dom-windowtimers-settimeout:
            //If want a value immediately, use require('id') instead -- something
            //that works in almond on the global level, but not guaranteed and
            //unlikely to work in other AMD implementations.
            setTimeout(function () {
                main(undef, deps, callback, relName);
            }, 4);
        }

        return req;
    };

    /**
     * Just drops the config on the floor, but returns req in case
     * the config return value is used.
     */
    req.config = function (cfg) {
        config = cfg;
        if (config.deps) {
            req(config.deps, config.callback);
        }
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

        if (!hasProp(defined, name) && !hasProp(waiting, name)) {
            waiting[name] = [name, deps, callback];
        }
    };

    define.amd = {
        jQuery: true
    };
}());

define("../../vendor/almond/almond", function(){});

// this file is generated during build process by: ./script/generate-js-version.rb
define('lab.version',['require'],function (require) {
  return {
    "repo": {
      "branch": "master",
      "commit": {
        "sha":           "8a4732fb055118ff161d4b392c6fb7913058b031",
        "short_sha":      "8a4732fb",
        "url":            "https://github.com/concord-consortium/lab/commit/8a4732fb",
        "author":        "Stephen Bannasch",
        "email":         "stephen.bannasch@gmail.com",
        "date":          "2013-07-18 22:51:35 -0400",
        "short_message": "don&#39;t include Shutterbug in gh-pages branch",
        "message":       "don&#39;t include Shutterbug in gh-pages branch\n\nFIXME:\nThis should also be done when generating the versioned\ntar.gz archives  but since they are created from running\ncode on a server using Rack, Shutterbug can&#39;t be easily\nremoved ..."
      },
      "dirty": false
    }
  };
});

/*global define: false */

define('common/actual-root',[],function () {
  var newPattern = /^(\/.+?\/)(interactives|embeddable)\.html$/,

      // For legacy code, if any, that (a) uses actualRoot and (b) isn't in an interactive
      // (Not folded into the same regex as newPattern for the sake of readability. Note the regexes
      // are only matched against one time.)
      oldPattern = /(\/.+?\/)(doc|examples|experiments)(\/\w+)*?\/\w+\.html/,
      match;

  match = document.location.pathname.match(newPattern);
  if (match && match[1]) {
    return match[1];
  }

  match = document.location.pathname.match(oldPattern);
  return match && match[1] || "/";
});

// this file is generated during build process by: ./script/generate-js-config.rb
define('lab.config',['require','common/actual-root'],function (require) {
  var actualRoot = require('common/actual-root'),
      publicAPI;
  publicAPI = {
  "sharing": true,
  "home": "http://lab.concord.org",
  "homeForSharing": "http://lab.concord.org",
  "homeInteractivePath": "/interactive.html",
  "homeEmbeddablePath": "/embeddable.html",
  "utmCampaign": null,
  "fontface": "Lato",
  "hostName": "lab.dev.concord.org",
  "dataGamesProxyPrefix": "DataGames/Games/concord/lab/",
  "logging": true,
  "tracing": false,
  "authoring": false,
  "actualRoot": "",
  "environment": "development"
};
  publicAPI.actualRoot = actualRoot;
  return publicAPI;
});

/*globals define, d3 */
//TODO: Should change and newdomain be global variables?

define('grapher/core/axis',['require'],function (require) {
  return {
    numberWidthUsingFormatter: function (elem, cx, cy, fontSizeInPixels, numberStr) {
      var testSVG,
          testText,
          bbox,
          width,
          height,
          node;

      testSVG = elem.append("svg")
        .attr("width",  cx)
        .attr("height", cy)
        .attr("class", "graph");

      testText = testSVG.append('g')
        .append("text")
          .attr("class", "axis")
          .attr("x", -fontSizeInPixels/4 + "px")
          .attr("dy", ".35em")
          .attr("text-anchor", "end")
          .text(numberStr);

      node = testText.node();

      // This code is sometimes called by tests that use d3's jsdom-based mock SVG DOm, which
      // doesn't implement getBBox.
      if (node.getBBox) {
        bbox = testText.node().getBBox();
        width = bbox.width;
        height = bbox.height;
      } else {
        width = 0;
        height = 0;
      }

      testSVG.remove();
      return [width, height];
    },
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
          maxDragIn = originExtent * 0.4 + origin;
          if (currentdrag > maxDragIn) {
            change = originExtent / (currentdrag-origin);
            extent = axis2 - origin;
            newdomain = [axis1, axis1 + (extent * change)];
          }
        } else if ((axis1 < 0) && (axis2 > 0)) {                // example: (20, 10, [-40, 40])       => [-80, 80]
          origin = 0;                                           //          (-0.4, -0.2, [-1.0, 0.4]) => [-1.0, 0.4]
          originExtent = dragstart-origin;
          maxDragIn = originExtent * 0.4 + origin;
          if ((dragstart >= 0 && currentdrag > maxDragIn) || (dragstart  < 0  && currentdrag < maxDragIn)) {
            change = originExtent / (currentdrag-origin);
            newdomain = [axis1 * change, axis2 * change];
          }
        } else if ((axis1 < 0) && (axis2 < 0)) {                // example: (-60, -50, [-80, -40]) => [-120, -40]
          origin = axis2;
          originExtent = dragstart-origin;
          maxDragIn = originExtent * 0.4 + origin;
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

/*global define, d3, $ self */

define('grapher/core/graph',['require','grapher/core/axis'],function (require) {
  // Dependencies.
  var axis = require('grapher/core/axis'),
      tooltips = {
        autoscale: "Show all data (autoscale)"
      };

  return function Graph(idOrElement, options, message, tabindex) {
    var api = {},   // Public API object to be returned.

        // D3 selection of the containing DOM element the graph is placed in
        elem,

        // Regular representation of containing DOM element the graph is placed in
        node,

        // JQuerified version of DOM element
        $node,

        // Size of containing DOM element
        cx, cy,

        // Calculated padding between edges of DOM container and interior plot area of graph.
        padding,

        // Object containing width and height in pixels of interior plot area of graph
        size,

        // D3 objects representing SVG elements/containers in graph
        svg,
        vis,
        plot,
        viewbox,
        title,
        xlabel,
        ylabel,
        selectedRulerX,
        selectedRulerY,

        // Strings used as tooltips when labels are visible but are truncated because
        // they are too big to be rendered into the space the graph allocates
        titleTooltip,
        xlabelTooltip,
        ylabelTooltip,

        // Instantiated D3 scale functions
        // currently either d3.scale.linear, d3.scale.log, or d3.scale.pow
        xScale,
        yScale,

        // The approximate number of gridlines in the plot, passed to d3.scale.ticks() function
        xTickCount,
        yTickCount,

        // Instantiated D3 line function: d3.svg.line()
        line,

        // Instantiated D3 numeric format functions: d3.format()
        fx,
        fy,

        // Function for stroke styling of major and minor grid lines
        gridStroke = function(d) { return d ? "#ccc" : "#666"; },

        // Functions for translation of grid lines and associated numeric labels
        tx = function(d) { return "translate(" + xScale(d) + ",0)"; },
        ty = function(d) { return "translate(0," + yScale(d) + ")"; },

        // Div created and placed with z-index above all other graph layers that holds
        // graph action/mode buttons.
        buttonLayer,

        // Div created and placed with z-index under all other graph layers
        background,

        // Optional string which can be displayed in background of interior plot area of graph.
        notification,

        // An array of strings holding 0 or more lines for the title of the graph
        titles = [],

        // D3 selection containing canvas
        graphCanvas,

        // HTML5 Canvas object containing just plotted lines
        gcanvas,
        gctx,
        canvasFillStyle = "rgba(255,255,255, 0.0)",
        cplot = {},

        // Function dynamically created when X axis domain shift is in progress
        domainShift,
        // Boolean indicating X axis domain shif is in progress
        shiftingX = false,
        // Easing function used during X axis domain shift
        cubicEase = d3.ease('cubic'),
        // These are used to implement fluid X axis domain shifting.
        // This is used when plotting samples/points and extent of plotted
        // data approach extent of X axis.
        // Domain shifting can also occur when the current sample point is moved.
        // This most often occurs when using a graph to examine data from a model
        // and movingthe current sample point backwards and forwards in data that
        // have already been collected.

        // The style of the cursor when hovering over a sample.point marker.
        // The cursor changes depending on the operations that can be performed.
        markerCursorStyle,

        // Metrics calculated to support layout of titles, axes as
        // well as text and numeric labels for axes.
        fontSizeInPixels,
        halfFontSizeInPixels,
        quarterFontSizeInPixels,
        titleFontSizeInPixels,
        axisFontSizeInPixels,
        xlabelFontSizeInPixels,
        ylabelFontSizeInPixels,

        // Array objects containing width and height of X and Y axis labels
        xlabelMetrics,
        yLabelMetrics,

        // Width of widest numeric labels on X and Y axes
        xAxisNumberWidth,
        yAxisNumberWidth,

        // Height of numeric labels on X and Y axes
        xAxisNumberHeight,
        yAxisNumberHeight,

        // Padding necessary for X and Y axis labels to leave enough room for numeric labels
        xAxisVerticalPadding,
        yAxisHorizontalPadding,

        // Padding necessary between right side of interior plot and edge of graph so
        // make room for numeric lanel on right edge of X axis.
        xAxisLabelHorizontalPadding,

        // Baselines calculated for positioning of X and Y axis labels.
        xAxisLabelBaseline,
        yAxisLabelBaseline,

        // Thickness of draggable areas for rescaling axes, these surround numeric labels
        xAxisDraggableHeight,
        yAxisDraggableWidth,

        // D3 SVG rects used to implement axis dragging
        xAxisDraggable,
        yAxisDraggable,

        // Strings used as tooltips when numeric axis draggables are visible but responsive
        // layout system has removed the axis labels because of small size of graph.
        xAxisDraggableTooltip,
        yAxisDraggableTooltip,

        // Used to calculate styles for markers appearing on samples/points (normally circles)
        markerRadius,
        markerStrokeWidth,

        // Stroke width used for lines in graph
        strokeWidth,

        // Used to categorize size of graphs in responsive layout mode where
        // certain graph chrome is removed when graph is rendered smaller.
        sizeType = {
          category: "medium",
          value: 3,
          icon: 120,
          tiny: 240,
          small: 480,
          medium: 960,
          large: 1920
        },

        // State variables indicating whether an axis drag operation is in place.
        // NaN values are used to indicate operation not in progress and
        // checked like this: if (!isNaN(downx)) { resacle operation in progress }
        //
        // When drag/rescale operation is occuring values contain plot
        // coordinates of start of drag (0 is a valid value).
        downx = NaN,
        downy = NaN,

        // State variable indicating whether a data point is being dragged.
        // When data point drag operation is occuring value contain two element
        // array wiith plot coordinates of drag position.
        draggedPoint = null,

        // When a data point is selected contains two element array wiith plot coordinates
        // of selected data point.
        selected = null,

        // An array of data points in the plot which are near the cursor.
        // Normally used to temporarily display data point markers when cursor
        // is nearby when markAllDataPoints is disabled.
        selectable = [],

        // An array containing two-element arrays consisting of X and Y values for samples/points
        points = [],

        // An array containing 1 or more points arrays to be plotted.
        pointArray,

        // Index into points array for current sample/point.
        // Normally references data point last added.
        // Current sample can refer to earlier points. This is
        // represented in the view by using a desaturated styling for
        // plotted data after te currentSample.
        currentSample,

        // When graphing data samples as opposed to [x, y] data pairs contains
        // the fixed time interval between subsequent samples.
        sampleInterval,

        // The default options for a graph
        default_options = {
          // Enables the button layer with: AutoScale ...
          showButtons:    true,

          // Responsive Layout provides pregressive removal of
          // graph elements when size gets smaller
          responsiveLayout: false,

          // Font sizes for graphs are normally specified using ems.
          // When fontScaleRelativeToParent to true the font-size of the
          // containing element is set based on the size of the containing
          // element. hs means whn the containing element is smaller the
          // foint-size of the labels in thegraph will be smaller.
          fontScaleRelativeToParent: true,

          //
          // dataType can be either 'points or 'samples'
          //
          dataType: 'points',
          //
          // dataType: 'points'
          //
          // Arrays of two-element arrays of x, y data pairs, this is the internal
          // format the graphers uses to represent data.
          dataPoints:      [],
          //
          // dataType: 'samples'
          //
          // An array of samples (or an array or arrays of samples)
          dataSamples:     [],
          // The constant time interval between sample values
          sampleInterval:  1,
          // Normally data sent to graph as samples starts at an X value of 0
          // A different starting x value can be set
          dataSampleStart: 0,

          // title can be a string or an array of strings, if an
          // array of strings each element is on a separate line.
          title:          "graph",

          // The labels for the axes, these are separate from the numeric labels.
          xlabel:         "x-axis",
          ylabel:         "y-axis",

          // Initial extent of the X and Y axes.
          xmax:            10,
          xmin:            0,
          ymax:            10,
          ymin:            0,

          // Approximate values for how many gridlines should appear on the axes.
          xTickCount:      10,
          yTickCount:      10,

          // The formatter used to convert numbers into strings.
          // see: https://github.com/mbostock/d3/wiki/Formatting#wiki-d3_format
          xFormatter:      ".3s",
          yFormatter:      ".3r",

          // Scale type: options are:
          //   linear: https://github.com/mbostock/d3/wiki/Quantitative-Scales#wiki-linear
          //   log:    https://github.com/mbostock/d3/wiki/Quantitative-Scales#wiki-log
          //   pow:    https://github.com/mbostock/d3/wiki/Quantitative-Scales#wiki-pow
          xscale:         'linear',
          yscale:         'linear',

          // Used when scale type is set to "pow"
          xscaleExponent:  0.5,
          yscaleExponent:  0.5,

          // How many samples/points over which a graph shift should take place
          // when the data being plotted gets close to the edge of the X axis.
          axisShift:       10,

          // selectablePoints: false,

          // true if data points should be marked ... currently marked with a circle.
          markAllDataPoints:   false,

          // only show circles when hovering near them with the mouse or
          // tapping near then on a tablet
          markNearbyDataPoints: false,

          // number of circles to show on each side of the central point
          extraCirclesVisibleOnHover: 2,

          // true to show dashed horizontal and vertical rulers when a circle is selected
          showRulersOnSelection: false,

          // width of the line used for plotting
          strokeWidth:      2.0,

          // Enable values of data points to be changed by selecting and dragging.
          dataChange:      false,

          // Enables adding of data to a graph by option/alt clicking in the graph.
          addData:         false,

          // Set value to a string and it will be rendered in background of graph.
          notification:    false,

          // Render lines between samples/points
          lines:           true,

          // Render vertical bars extending up to samples/points
          bars:            false
        },

        // brush selection variables
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


    // ------------------------------------------------------------
    //
    // Initialization
    //
    // ------------------------------------------------------------

    function initialize(idOrElement, opts, mesg) {
      if (opts || !options) {
        options = setupOptions(opts);
      }

      initializeLayout(idOrElement, mesg);

      options.xrange = options.xmax - options.xmin;
      options.yrange = options.ymax - options.ymin;

      if (Object.prototype.toString.call(options.title) === "[object Array]") {
        titles = options.title;
      } else {
        titles = [options.title];
      }
      titles.reverse();

      fx = d3.format(options.xFormatter);
      fy = d3.format(options.yFormatter);

      // use local variables for both access speed and for responsive over-riding
      sampleInterval = options.sampleInterval;
      dataSampleStart = options.dataSampleStart;
      strokeWidth = options.strokeWidth;

      xTickCount = options.xTickCount;
      yTickCount = options.yTickCount;

      pointArray = [];
      switch(options.dataType) {
        case "fake":
        points = fakeDataPoints();
        pointArray = [points];
        break;

        case 'points':
        resetDataPoints(options.dataPoints);
        break;

        case 'samples':
        resetDataSamples(options.dataSamples, sampleInterval, dataSampleStart);
        break;
      }

      selectable = [];
      selected = null;

      setCurrentSample(points.length);
    }

    function initializeLayout(idOrElement, mesg) {
      if (idOrElement) {
        // d3.select works both for element ID (e.g. "#grapher")
        // and for DOM element.
        elem = d3.select(idOrElement);
        node = elem.node();
        $node = $(node);
        // cx = $node.width();
        // cy = $node.height();
        cx = elem.property("clientWidth");
        cy = elem.property("clientHeight");
      }

      if (mesg) {
        message = mesg;
      }

      if (svg !== undefined) {
        svg.remove();
        svg = undefined;
      }

      if (background !== undefined) {
        background.remove();
        background = undefined;
      }

      if (graphCanvas !== undefined) {
        graphCanvas.remove();
        graphCanvas = undefined;
      }

      if (options.dataChange) {
        markerCursorStyle = "ns-resize";
      } else {
        markerCursorStyle = "crosshair";
      }

      scale();

      // drag axis logic
      downx = NaN;
      downy = NaN;
      draggedPoint = null;
    }

    function scale(w, h) {
      if (!w && !h) {
        cx = Math.max(elem.property("clientWidth"), 60);
        cy = Math.max(elem.property("clientHeight"),60);
      } else {
        cx = w;
        node.style.width =  cx +"px";
        if (!h) {
          node.style.height = "100%";
          h = elem.property("clientHeight");
          cy = h;
          node.style.height = cy +"px";
        } else {
          cy = h;
          node.style.height = cy +"px";
        }
      }
      calculateSizeType();
    }

    function calculateLayout() {
      scale();

      fontSizeInPixels = parseFloat($node.css("font-size"));

      if (!options.fontScaleRelativeToParent) {
        $node.css("font-size", 0.5 + sizeType.value/6 + 'em');
      }

      fontSizeInPixels = parseFloat($node.css("font-size"));

      halfFontSizeInPixels = fontSizeInPixels/2;
      quarterFontSizeInPixels = fontSizeInPixels/4;

      if (svg === undefined) {
        titleFontSizeInPixels =  fontSizeInPixels;
        axisFontSizeInPixels =   fontSizeInPixels;
        xlabelFontSizeInPixels = fontSizeInPixels;
        ylabelFontSizeInPixels = fontSizeInPixels;
      } else {
        titleFontSizeInPixels =  parseFloat($("svg.graph text.title").css("font-size"));
        axisFontSizeInPixels =   parseFloat($("svg.graph text.axis").css("font-size"));
        xlabelFontSizeInPixels = parseFloat($("svg.graph text.xlabel").css("font-size"));
        ylabelFontSizeInPixels = parseFloat($("svg.graph text.ylabel").css("font-size"));
      }

      if (xScale === undefined) {
        xlabelMetrics = [fontSizeInPixels, fontSizeInPixels];
        ylabelMetrics = [fontSizeInPixels*2, fontSizeInPixels];
      } else {
        xlabelMetrics = axis.numberWidthUsingFormatter(elem, cx, cy, axisFontSizeInPixels,
          longestNumber(xScale.ticks(xTickCount), fx));

        ylabelMetrics = axis.numberWidthUsingFormatter(elem, cx, cy, axisFontSizeInPixels,
          longestNumber(yScale.ticks(yTickCount), fy));
      }

      xAxisNumberWidth  = xlabelMetrics[0];
      xAxisNumberHeight = xlabelMetrics[1];
      yAxisNumberWidth  = ylabelMetrics[0];
      yAxisNumberHeight = ylabelMetrics[0];

      xAxisLabelHorizontalPadding = xAxisNumberWidth * 0.6;
      xAxisDraggableHeight = xAxisNumberHeight * 1.1;
      xAxisVerticalPadding = xAxisDraggableHeight + xAxisNumberHeight*1.3;
      xAxisLabelBaseline = xAxisVerticalPadding-xAxisNumberHeight/3;

      yAxisDraggableWidth    = yAxisNumberWidth + xAxisNumberHeight/4;
      yAxisHorizontalPadding = yAxisDraggableWidth + yAxisNumberHeight;
      yAxisLabelBaseline     = -(yAxisDraggableWidth+yAxisNumberHeight/4);

      switch(sizeType.value) {
        case 0:         // icon
        padding = {
          "top":    halfFontSizeInPixels,
          "right":  halfFontSizeInPixels,
          "bottom": fontSizeInPixels,
          "left":   fontSizeInPixels
        };
        break;

        case 1:         // tiny
        padding = {
          "top":    options.title  ? titleFontSizeInPixels*1.8 : fontSizeInPixels,
          "right":  halfFontSizeInPixels,
          "bottom": fontSizeInPixels,
          "left":   fontSizeInPixels
        };
        break;

        case 2:         // small
        padding = {
          "top":    options.title  ? titleFontSizeInPixels*1.8 : fontSizeInPixels,
          "right":  xAxisLabelHorizontalPadding,
          "bottom": axisFontSizeInPixels*1.25,
          "left":   yAxisNumberWidth*1.25
        };
        xTickCount = Math.max(6, options.xTickCount/2);
        yTickCount = Math.max(6, options.yTickCount/2);
        break;

        case 3:         // medium
        padding = {
          "top":    options.title  ? titleFontSizeInPixels*1.8 : fontSizeInPixels,
          "right":  xAxisLabelHorizontalPadding,
          "bottom": options.xlabel ? xAxisVerticalPadding : axisFontSizeInPixels*1.25,
          "left":   options.ylabel ? yAxisHorizontalPadding : yAxisNumberWidth
        };
        break;

        default:         // large
        padding = {
          "top":    options.title  ? titleFontSizeInPixels*1.8 : fontSizeInPixels,
          "right":  xAxisLabelHorizontalPadding,
          "bottom": options.xlabel ? xAxisVerticalPadding : axisFontSizeInPixels*1.25,
          "left":   options.ylabel ? yAxisHorizontalPadding : yAxisNumberWidth
        };
        break;
      }

      if (sizeType.value > 2 ) {
        padding.top += (titles.length-1) * sizeType.value/3 * sizeType.value/3 * fontSizeInPixels;
      } else {
        titles = [titles[0]];
      }

      size = {
        "width":  Math.max(cx - padding.left - padding.right, 60),
        "height": Math.max(cy - padding.top  - padding.bottom, 60)
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

      updateXScale();
      updateYScale();

      line = d3.svg.line()
          .x(function(d, i) { return xScale(points[i][0]); })
          .y(function(d, i) { return yScale(points[i][1]); });

    }

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
      if (options.axisShift < 1) options.axisShift = 1;
      return options;
    }

    function calculateSizeType() {
      if (options.responsiveLayout) {
        if (cx <= sizeType.icon) {
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
        } else {
          sizeType.category = 'large';
          sizeType.value = 4;
        }
      } else {
        sizeType.category = 'large';
        sizeType.value = 4;
      }
    }

    function longestNumber(array, formatter, precision) {
      var longest = 0,
          index = 0,
          str,
          len,
          i;
      precision = precision || 5;
      for (i = 0; i < array.length; i++) {
        str = formatter(+array[i].toPrecision(precision));
        str = str.replace(/^\s\s*/, '').replace(/\s\s*$/, '');
        len = str.length;
        if (len > longest) {
          longest = len;
          index = i;
        }
      }
      return formatter(array[index]);
    }

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

    function persistScaleChangesToOptions() {
      var xdomain = xScale.domain(),
          ydomain = yScale.domain();
      options.xmax = xdomain[1];
      options.xmin = xdomain[0];
      options.ymax = ydomain[1];
      options.ymin = ydomain[0];
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

    function setCurrentSample(samplePoint) {
      if (typeof samplePoint === "number") {
        currentSample = samplePoint;
      }
      if (typeof currentSample !== "number") {
        currentSample = points.length-1;
      }
      return currentSample;
    }

    // converts data samples into an array of points
    function indexedData(samples, interval, start) {
      var i = 0,
          pnts = [];
      interval = interval || 1;
      start = start || 0;
      for (i = 0; i < samples.length;  i++) {
        pnts.push([i * interval + start, samples[i]]);
      }
      return pnts;
    }

    //
    // Update notification message
    //
    function notify(mesg) {
      message = mesg;
      if (mesg) {
        notification.text(mesg);
      } else {
        notification.text('');
      }
    }


    function createButtonLayer() {
      buttonLayer = elem.append("div");

      buttonLayer
        .attr("class", "button-layer")
        .style("z-index", 3)
        .append('a')
          .attr({
            "class": "autoscale-button",
            "title": tooltips.autoscale
          })
          .on("click", function() {
            autoscale();
          })
          .append("i")
            .attr("class", "icon-picture");

      resizeButtonLayer();
    }

    function resizeButtonLayer() {
      buttonLayer
        .style({
          "width":   fontSizeInPixels*1.75 + "px",
          "height":  fontSizeInPixels*1.25 + "px",
          "top":     padding.top + halfFontSizeInPixels + "px",
          "left":    padding.left + (size.width - fontSizeInPixels*2.0) + "px"
        });
    }

    // ------------------------------------------------------------
    //
    // Rendering
    //
    // ------------------------------------------------------------

    //
    // Render a new graph by creating the SVG and Canvas elements
    //
    function renderNewGraph() {
      svg = elem.append("svg")
          .attr("width",  cx)
          .attr("height", cy)
          .attr("class", "graph")
          .style('z-index', 2);
          // .attr("tabindex", tabindex || 0);

      vis = svg.append("g")
          .attr("transform", "translate(" + padding.left + "," + padding.top + ")");

      plot = vis.append("rect")
        .attr("class", "plot")
        .attr("width", size.width)
        .attr("height", size.height)
        .attr("pointer-events", "all")
        .attr("fill", "rgba(255,255,255,0)")
        .on("mousemove", plotMousemove)
        .on("mousedown", plotDrag)
        .on("touchstart", plotDrag);

      plot.call(d3.behavior.zoom().x(xScale).y(yScale).on("zoom", redraw));

      background = elem.append("div")
          .attr("class", "background")
          .style({
            "width":   size.width + "px",
            "height":  size.height + "px",
            "top":     padding.top + "px",
            "left":    padding.left + "px",
            "z-index": 0
          });

      createGraphCanvas();

      viewbox = vis.append("svg")
        .attr("class", "viewbox")
        .attr("top", 0)
        .attr("left", 0)
        .attr("width", size.width)
        .attr("height", size.height)
        .attr("viewBox", "0 0 "+size.width+" "+size.height);

      selectedRulerX = viewbox.append("line")
        .attr("stroke", gridStroke)
        .attr("stroke-dasharray", "2,2")
        .attr("y1", 0)
        .attr("y2", size.height)
        .attr("x1", function(d) { return selected === null ? 0 : selected[0]; } )
        .attr("x2", function(d) { return selected === null ? 0 : selected[0]; } )
        .attr("class", "ruler hidden");

      selectedRulerY = viewbox.append("line")
        .attr("stroke", gridStroke)
        .attr("stroke-dasharray", "2,2")
        .attr("x1", 0)
        .attr("x2", size.width)
        .attr("y1", function(d) { return selected === null ? 0 : selected[1]; } )
        .attr("y2", function(d) { return selected === null ? 0 : selected[1]; } )
        .attr("class", "ruler hidden");

      yAxisDraggable = svg.append("rect")
        .attr("class", "draggable-axis")
        .attr("x", padding.left-yAxisDraggableWidth)
        .attr("y", padding.top)
        .attr("rx", yAxisNumberHeight/6)
        .attr("width", yAxisDraggableWidth)
        .attr("height", size.height)
        .attr("pointer-events", "all")
        .style("cursor", "row-resize")
        .on("mousedown", yAxisDrag)
        .on("touchstart", yAxisDrag);

      yAxisDraggableTooltip = yAxisDraggable.append("title");

      xAxisDraggable = svg.append("rect")
        .attr("class", "draggable-axis")
        .attr("x", padding.left)
        .attr("y", size.height+padding.top)
        .attr("rx", yAxisNumberHeight/6)
        .attr("width", size.width)
        .attr("height", xAxisDraggableHeight)
        .attr("pointer-events", "all")
        .style("cursor", "col-resize")
        .on("mousedown", xAxisDrag)
        .on("touchstart", xAxisDrag);

      xAxisDraggableTooltip = xAxisDraggable.append("title");

      if (sizeType.value <= 2 && options.ylabel) {
        xAxisDraggableTooltip.text(options.xlabel);
      }

      if (sizeType.catefory && options.ylabel) {
        yAxisDraggableTooltip.text(options.ylabel);
      }

      adjustAxisDraggableFill();

      brush_element = viewbox.append("g")
            .attr("class", "brush");

      // add Chart Title
      if (options.title && sizeType.value > 0) {
        title = vis.selectAll("text")
          .data(titles, function(d) { return d; });
        title.enter().append("text")
            .attr("class", "title")
            .text(function(d) { return d; })
            .attr("x", function(d) { return size.width/2 - Math.min(size.width, getComputedTextLength(this))/2; })
            .attr("dy", function(d, i) { return -i * titleFontSizeInPixels - halfFontSizeInPixels + "px"; });
        titleTooltip = title.append("title")
            .text("");
      } else if (options.title) {
        titleTooltip = plot.append("title")
            .text(options.title);
      }

      // Add the x-axis label
      if (options.xlabel && sizeType.value > 2) {
        xlabel = vis.append("text")
            .attr("class", "axis")
            .attr("class", "xlabel")
            .text(options.xlabel)
            .attr("x", size.width/2)
            .attr("y", size.height)
            .attr("dy", xAxisLabelBaseline + "px")
            .style("text-anchor","middle");
      }

      // add y-axis label
      if (options.ylabel && sizeType.value > 2) {
        ylabel = vis.append("g").append("text")
            .attr("class", "axis")
            .attr("class", "ylabel")
            .text( options.ylabel)
            .style("text-anchor","middle")
            .attr("transform","translate(" + yAxisLabelBaseline + " " + size.height/2+") rotate(-90)");
        if (sizeType.category === "small") {
          yAxisDraggable.append("title")
            .text(options.ylabel);
        }
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

      updateMarkers();
      updateRulers();
    }

    //
    // Repaint an existing graph by rescaling/updating the SVG and Canvas elements
    //
    function repaintExistingGraph() {
      vis
        .attr("width",  cx)
        .attr("height", cy)
        .attr("transform", "translate(" + padding.left + "," + padding.top + ")");

      plot
        .attr("width", size.width)
        .attr("height", size.height);

      background
        .style({
          "width":   size.width + "px",
          "height":  size.height + "px",
          "top":     padding.top + "px",
          "left":    padding.left + "px",
          "z-index": 0
        });

      viewbox
          .attr("top", 0)
          .attr("left", 0)
          .attr("width", size.width)
          .attr("height", size.height)
          .attr("viewBox", "0 0 "+size.width+" "+size.height);

      yAxisDraggable
          .attr("x", padding.left-yAxisDraggableWidth)
          .attr("y", padding.top-yAxisNumberHeight/2)
          .attr("width", yAxisDraggableWidth)
          .attr("height", size.height+yAxisNumberHeight);

      xAxisDraggable
          .attr("x", padding.left)
          .attr("y", size.height+padding.top)
          .attr("width", size.width)
          .attr("height", xAxisDraggableHeight);

      adjustAxisDraggableFill();

      if (options.title && sizeType.value > 0) {
        title
            .attr("x", function(d) { return size.width/2 - Math.min(size.width, getComputedTextLength(this))/2; })
            .attr("dy", function(d, i) { return -i * titleFontSizeInPixels - halfFontSizeInPixels + "px"; });
        titleTooltip
            .text("");
      } else if (options.title) {
        titleTooltip
            .text(options.title);
      }

      if (options.xlabel && sizeType.value > 2) {
        xlabel
            .attr("x", size.width/2)
            .attr("y", size.height)
            .attr("dy", xAxisLabelBaseline + "px");
        xAxisDraggableTooltip
            .text("");
      } else {
        xAxisDraggableTooltip
            .text(options.xlabel);
      }

      if (options.ylabel && sizeType.value > 2) {
        ylabel
            .attr("transform","translate(" + yAxisLabelBaseline + " " + size.height/2+") rotate(-90)");
        yAxisDraggableTooltip
            .text("");
      } else {
        yAxisDraggableTooltip
          .text(options.ylabel);
      }

      notification
        .attr("x", size.width/2)
        .attr("y", size.height/2);

      vis.selectAll("g.x").remove();
      vis.selectAll("g.y").remove();

      updateMarkers();
      updateRulers();
      resizeCanvas();
    }

    function getComputedTextLength(el) {
      if (el.getComputedTextLength) {
        return el.getComputedTextLength();
      } else {
        return 100;
      }
    }

    function adjustAxisDraggableFill() {
      if (sizeType.value <= 1) {
        xAxisDraggable
          .style({
            "fill":       "rgba(196, 196, 196, 0.2)"
          });
        yAxisDraggable
          .style({
            "fill":       "rgba(196, 196, 196, 0.2)"
          });
      } else {
        xAxisDraggable
          .style({
            "fill":       null
          });
        yAxisDraggable
          .style({
            "fill":       null
          });
      }
    }

    //
    // Redraw the plot and axes when plot is translated or axes are re-scaled
    //
    function redraw() {
      // Regenerate x-ticks
      var gx = vis.selectAll("g.x")
          .data(xScale.ticks(xTickCount), String)
          .attr("transform", tx);

      var gxe = gx.enter().insert("g", "a")
          .attr("class", "x")
          .attr("transform", tx);

      gxe.append("line")
          .attr("stroke", gridStroke)
          .attr("y1", 0)
          .attr("y2", size.height);

      if (sizeType.value > 1) {
        gxe.append("text")
            .attr("class", "axis")
            .attr("y", size.height)
            .attr("dy", axisFontSizeInPixels + "px")
            .attr("text-anchor", "middle")
            .text(fx)
            .on("mouseover", function() { d3.select(this).style("font-weight", "bold");})
            .on("mouseout",  function() { d3.select(this).style("font-weight", "normal");});
      }

      gx.exit().remove();

      // Regenerate y-ticks
      var gy = vis.selectAll("g.y")
          .data(yScale.ticks(yTickCount), String)
          .attr("transform", ty);

      var gye = gy.enter().insert("g", "a")
          .attr("class", "y")
          .attr("transform", ty)
          .attr("background-fill", "#FFEEB6");

      gye.append("line")
          .attr("stroke", gridStroke)
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
            .attr("x", -axisFontSizeInPixels/4 + "px")
            .attr("dy", ".35em")
            .attr("text-anchor", "end")
            .style("cursor", "ns-resize")
            .text(fy)
            .on("mouseover", function() { d3.select(this).style("font-weight", "bold");})
            .on("mouseout",  function() { d3.select(this).style("font-weight", "normal");});
      }

      gy.exit().remove();
      plot.call(d3.behavior.zoom().x(xScale).y(yScale).on("zoom", redraw));
      update();
    }

    // ------------------------------------------------------------
    //
    // Rendering: Updating samples/data points in the plot
    //
    // ------------------------------------------------------------


    //
    // Update plotted data, optionally pass in new samplePoint
    //
    function update(samplePoint) {
      setCurrentSample(samplePoint);
      updateCanvasFromPoints(currentSample);
      updateMarkers();
      if (d3.event && d3.event.keyCode) {
        d3.event.preventDefault();
        d3.event.stopPropagation();
      }
    }

    // samplePoint is optional argument
    function updateOrRescale(samplePoint) {
      setCurrentSample(samplePoint);
      updateOrRescalePoints();
    }

    // samplePoint is optional argument
    function updateOrRescalePoints(samplePoint) {
      var i,
          domain = xScale.domain(),
          xAxisStart = Math.round(domain[0]),
          xAxisEnd = Math.round(domain[1]),
          start = Math.max(0, xAxisStart),
          xextent = domain[1] - domain[0],
          shiftPoint = xextent * 0.95,
          currentExtent;

      setCurrentSample(samplePoint);
      currentExtent = points[currentSample-1][0];
      if (shiftingX) {
        shiftingX = domainShift();
        if (shiftingX) {
          cancelAxisRescale();
          redraw();
        } else {
          update(currentSample);
        }
      } else {
        if (currentExtent > domain[0] + shiftPoint) {
          domainShift = shiftXDomainRealTime(shiftPoint*0.9, options.axisShift);
          shiftingX = domainShift();
          redraw();
        } else if ( currentExtent < domain[1] - shiftPoint && currentSample < points.length && xAxisStart > 0) {
          domainShift = shiftXDomainRealTime(shiftPoint*0.9, options.axisShift, -1);
          shiftingX = domainShift();
          redraw();
        } else if (currentExtent < domain[0]) {
          domainShift = shiftXDomainRealTime(shiftPoint*0.1, 1, -1);
          shiftingX = domainShift();
          redraw();
        } else {
          update(currentSample);
        }
      }
    }

    function shiftXDomainRealTime(shift, steps, direction) {
      var d0 = xScale.domain()[0],
          d1 = xScale.domain()[1],
          increment = 1/steps,
          index = 0;
      return function() {
        var factor;
        direction = direction || 1;
        index += increment;
        factor = shift * cubicEase(index);
        if (direction > 0) {
          xScale.domain([d0 + factor, d1 + factor]);
          persistScaleChangesToOptions();
          return xScale.domain()[0] < (d0 + shift);
        } else {
          xScale.domain([d0 - factor, d1 - factor]);
          persistScaleChangesToOptions();
          return xScale.domain()[0] > (d0 - shift);
        }
      };
    }

    function cancelAxisRescale() {
      if (!isNaN(downx)) {
        downx = NaN;
      }
      if (!isNaN(downy)) {
        downy = NaN;
      }
    }

    function circleClasses(d) {
      cs = [];
      if (d === selected) {
        cs.push("selected");
      }
      if (cs.length === 0) {
        return null;
      } else {
        return cs.join(" ");
      }
    }

    function updateMarkerRadius() {
      var d = xScale.domain(),
          r = xScale.range();
      markerRadius = (r[1] - r[0]) / ((d[1] - d[0]));
      markerRadius = Math.min(markerRadius, 6);
      markerStrokeWidth = markerRadius/4;
    }

    function updateMarkers() {
      var marker,
          markedPoints = null;
      if (options.markAllDataPoints && sizeType.value > 1) {
        markedPoints = points;
      } else if (options.markNearbyDataPoints && sizeType.value > 1) {
        markedPoints = selectable.slice(0);
        if (selected !== null && markedPoints.indexOf(selected) == -1) {
          markedPoints.push(selected);
        }
      }
      if (markedPoints !== null) {
        updateMarkerRadius();
        marker = vis.select("svg").selectAll("circle").data(markedPoints);
        marker.enter().append("circle")
            .attr("class", circleClasses)
            .attr("cx",    function(d) { return xScale(d[0]); })
            .attr("cy",    function(d) { return yScale(d[1]); })
            .attr("r", markerRadius)
            .style("stroke-width", markerStrokeWidth)
            .style("cursor", markerCursorStyle)
            .on("mousedown.drag",  dataPointDrag)
            .on("touchstart.drag", dataPointDrag)
            .append("title")
            .text(function(d) { return "( " + fx(d[0]) + ", " + fy(d[1]) + " )"; });

        marker
            .attr("class", circleClasses)
            .attr("cx",    function(d) { return xScale(d[0]); })
            .attr("cy",    function(d) { return yScale(d[1]); })
            .select("title")
            .text(function(d) { return "( " + fx(d[0]) + ", " + fy(d[1]) + " )"; });

        marker.exit().remove();
      }

      updateRulers();
    }

    function updateRulers() {
      if (options.showRulersOnSelection && selected !== null) {
        selectedRulerX
          .attr("y1", 0)
          .attr("y2", size.height)
          .attr("x1", function(d) { return selected === null ? 0 : xScale(selected[0]); } )
          .attr("x2", function(d) { return selected === null ? 0 : xScale(selected[0]); } )
          .attr("class", function(d) { return "ruler" + (selected === null ? " hidden" : ""); } );

        selectedRulerY
          .attr("x1", 0)
          .attr("x2", size.width)
          .attr("y1", function(d) { return selected === null ? 0 : yScale(selected[1]); } )
          .attr("y2", function(d) { return selected === null ? 0 : yScale(selected[1]); } )
          .attr("class", function(d) { return "ruler" + (selected === null ? " hidden" : ""); } );
      } else {
        selectedRulerX.attr("class", "ruler hidden");
        selectedRulerY.attr("class", "ruler hidden");
      }
    }


    // ------------------------------------------------------------
    //
    // UI Interaction: Plot dragging and translation; Axis re-scaling
    //
    // ------------------------------------------------------------

    function plotMousemove() {
      if (options.markNearbyDataPoints) {
        var mousePoint = d3.mouse(vis.node()),
            translatedMousePointX = xScale.invert(Math.max(0, Math.min(size.width, mousePoint[0]))),
            p,
            idx, pMin, pMax;
        // highlight the central point, and also points to the left and right
        // TODO Handle multiple data sets/lines
        selectable = [];
        for (i = 0; i < pointArray.length; i++) {
          points = pointArray[i];
          p = findClosestPointByX(translatedMousePointX, i);
          if (p !== null) {
            idx = points.indexOf(p);
            pMin = idx - (options.extraCirclesVisibleOnHover);
            pMax = idx + (options.extraCirclesVisibleOnHover + 1);
            if (pMin < 0) { pMin = 0; }
            if (pMax > points.length - 1) { pMax = points.length; }
            selectable = selectable.concat(points.slice(pMin, pMax));
          }
        }
        update();
      }
    }

    function findClosestPointByX(x, line) {
      if (typeof(line) == "undefined" || line === null) { line = 0; }
      // binary search through points.
      // This assumes points is sorted ascending by x value, which for realTime graphs is true.
      points = pointArray[line];
      if (points.length === 0) { return null; }
      var min = 0,
          max = points.length - 1,
          mid, diff, p1, p2, p3;
      while (min < max) {
        mid = Math.floor((min + max)/2.0);
        if (points[mid][0] < x) {
          min = mid + 1;
        } else {
          max = mid;
        }
      }

      // figure out which point is actually closest.
      // we have to compare 3 points, to account for floating point rounding errors.
      // if the mouse moves off the left edge of the graph, p1 may not exist.
      // if the mouse moves off the right edge of the graph, p3 may not exist.
      p1 = points[mid - 1];
      p2 = points[mid];
      p3 = points[mid + 1];
      if (typeof(p1) !== "undefined" && Math.abs(p1[0] - x) <= Math.abs(p2[0] - x)) {
        return p1;
      } else if (typeof(p3) === "undefined" || Math.abs(p2[0] - x) <= Math.abs(p3[0] - x)) {
        return p2;
      } else {
        return p3;
      }
    }

    function plotDrag() {
      var p;
      d3.event.preventDefault();
      d3.select('body').style("cursor", "move");
      if (d3.event.altKey) {
        plot.style("cursor", "nesw-resize");
        if (d3.event.shiftKey && options.addData) {
          p = d3.mouse(vis.node());
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
          p = d3.mouse(vis.node());
          downx = xScale.invert(p[0]);
          downy = yScale.invert(p[1]);
          draggedPoint = false;
          d3.event.stopPropagation();
        }
        // d3.event.stopPropagation();
      }
    }

    function falseFunction() {
      return false;
    }

    function xAxisDrag() {
      node.focus();
      document.onselectstart = falseFunction;
      d3.event.preventDefault();
      var p = d3.mouse(vis.node());
      downx = xScale.invert(p[0]);
    }

    function yAxisDrag() {
      node.focus();
      d3.event.preventDefault();
      document.onselectstart = falseFunction;
      var p = d3.mouse(vis.node());
      downy = yScale.invert(p[1]);
    }

    function dataPointDrag(d) {
      node.focus();
      d3.event.preventDefault();
      document.onselectstart = falseFunction;
      if (selected === d) {
        selected = draggedPoint = null;
      } else {
        selected = draggedPoint = d;
      }
      update();
    }

    function mousemove() {
      var p = d3.mouse(vis.node()),
          index,
          px,
          x,
          nextPoint,
          prevPoint,
          minusHalf,
          plusHalf;

      // t = d3.event.changedTouches;

      document.onselectstart = function() { return true; };
      d3.event.preventDefault();
      if (draggedPoint) {
        if (options.dataChange) {
          draggedPoint[1] = yScale.invert(Math.max(0, Math.min(size.height, p[1])));
        } else {
          index = points.indexOf(draggedPoint);
          if (index && index < (points.length-1)) {
            px = xScale.invert(p[0]);
            x = draggedPoint[0];
            nextPoint = points[index+1];
            prevPoint = points[index-1];
            minusHalf = x - (x - prevPoint[0])/2;
            plusHalf =  x + (nextPoint[0] - x)/2;
            if (px < minusHalf) {
              draggedPoint = prevPoint;
              selected = draggedPoint;
            } else if (px > plusHalf) {
              draggedPoint = nextPoint;
              selected = draggedPoint;
            }
          }
        }
        persistScaleChangesToOptions();
        update();
      }

      if (!isNaN(downx)) {
        d3.select('body').style("cursor", "col-resize");
        plot.style("cursor", "col-resize");
        if (shiftingX) {
          xScale.domain(axis.axisProcessDrag(downx, xScale.invert(p[0]), xScale.domain()));
        } else {
          xScale.domain(axis.axisProcessDrag(downx, xScale.invert(p[0]), xScale.domain()));
        }
        persistScaleChangesToOptions();
        updateMarkerRadius();
        redraw();
        d3.event.stopPropagation();
      }

      if (!isNaN(downy)) {
        d3.select('body').style("cursor", "row-resize");
        plot.style("cursor", "row-resize");
        yScale.domain(axis.axisProcessDrag(downy, yScale.invert(p[1]), yScale.domain()));
        persistScaleChangesToOptions();
        redraw();
        d3.event.stopPropagation();
      }
    }

    function mouseup() {
      d3.select('body').style("cursor", "auto");
      plot.style("cursor", "auto");
      document.onselectstart = function() { return true; };
      if (!isNaN(downx)) {
        redraw();
        downx = NaN;
      }
      if (!isNaN(downy)) {
        redraw();
        downy = NaN;
      }
      draggedPoint = null;
    }

    //------------------------------------------------------
    //
    // Autoscale
    //
    // ------------------------------------------------------------

    /**
      If there are more than 1 data points, scale the x axis to contain all x values,
      and scale the y axis so that the y values lie in the middle 80% of the visible y range.

      Then nice() the x and y scales (which means that the x and y domains will likely expand
      somewhat).
    */
    function autoscale() {
      var i,
          j,
          len,
          point,
          x,
          y,
          xmin = Infinity,
          xmax = -Infinity,
          ymin = Infinity,
          ymax = -Infinity,
          transform,
          pow;

      if (points.length < 2) return;

      for (i = 0; i < pointArray.length; i++) {
        points = pointArray[i];
        for (j = 0, len = points.length; j < len; j++){
          point = points[j];
          x = point[0];
          y = point[1];

          if (x < xmin) xmin = x;
          if (x > xmax) xmax = x;
          if (y < ymin) ymin = y;
          if (y > ymax) ymax = y;
        }
      }

      // Like Math.pow but returns a value with the same sign as x: pow(-1, 0.5) -> -1
      pow = function(x, exponent) {
        return x < 0 ? -Math.pow(-x, exponent) : Math.pow(x, exponent);
      };

      // convert ymin, ymax to a linear scale, and set 'transform' to the function that
      // converts the new min, max to the relevant scale.
      switch (options.yscale) {
        case 'linear':
          transform = function(x) { return x; };
          break;
        case 'log':
          ymin = Math.log(ymin) / Math.log(10);
          ymax = Math.log(ymax) / Math.log(10);
          transform = function(x) { return Math.pow(10, x); };
          break;
        case 'pow':
          ymin = pow(ymin, options.yscaleExponent);
          ymax = pow(ymax, options.yscaleExponent);
          transform = function(x) { return pow(x, 1/options.yscaleExponent); };
          break;
      }

      xScale.domain([xmin, xmax]).nice();
      yScale.domain([transform(ymin - 0.15*(ymax-ymin)), transform(ymax + 0.15*(ymax-ymin))]).nice();
      persistScaleChangesToOptions();
      redraw();
    }

    // ------------------------------------------------------------
    //
    // Brush Selection
    //
    // ------------------------------------------------------------

    /**
      Set or get the selection domain (i.e., the range of x values that are selected).

      Valid domain specifiers:
        null     no current selection (selection is turned off)
        []       a current selection exists but is empty (has_selection is true)
        [x1, x2] the region between x1 and x2 is selected. Any data points between
                 x1 and x2 (inclusive) would be considered to be selected.

      Default value is null.
    */
    function selectionDomain(a) {

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

      updateBrushElement();

      if (selection_listener) {
        selection_listener(selectionDomain());
      }
      return api;
    }

    /**
      Get whether the graph currently has a selection region. Default value is false.

      If true, it would be valid to filter the data points to return a subset within the selection
      region, although this region may be empty!

      If false the graph is not considered to have a selection region.

      Note that even if has_selection is true, the selection region may not be currently shown,
      and if shown, it may be empty.
    */
    function hasSelection() {
      return has_selection;
    }

    /**
      Set or get the visibility of the selection region. Default value is false.

      Has no effect if the graph does not currently have a selection region
      (selection_domain is null).

      If the selection_enabled property is true, the user will also be able to interact
      with the selection region.
    */
    function selectionVisible(val) {
      if (!arguments.length) {
        return selection_visible;
      }

      // setter
      val = !!val;
      if (selection_visible !== val) {
        selection_visible = val;
        updateBrushElement();
      }
      return api;
    }

    /**
      Set or get whether user manipulation of the selection region should be enabled
      when a selection region exists and is visible. Default value is true.

      Setting the value to true has no effect unless the graph has a selection region
      (selection_domain is non-null) and the region is visible (selection_visible is true).
      However, the selection_enabled setting is honored whenever those properties are
      subsequently updated.

      Setting the value to false does not affect the visibility of the selection region,
      and does not affect the ability to change the region by calling selectionDomain().

      Note that graph panning and zooming are disabled while selection manipulation is enabled.
    */
    function selectionEnabled(val) {
      if (!arguments.length) {
        return selection_enabled;
      }

      // setter
      val = !!val;
      if (selection_enabled !== val) {
        selection_enabled = val;
        updateBrushElement();
      }
      return api;
    }

    /**
      Set or get the listener to be called when the selection_domain changes.

      Both programatic and interactive updates of the selection region result in
      notification of the listener.

      The listener is called with the new selection_domain value in the first argument.
    */
    function selectionListener(cb) {
      if (!arguments.length) {
        return selection_listener;
      }
      // setter
      selection_listener = cb;
      return api;
    }

    function brushListener() {
      var extent;
      if (selection_enabled) {
        // Note there is a brush.empty() method, but it still reports true after the
        // brush extent has been programatically updated.
        extent = brush_control.extent();
        selectionDomain( extent[0] !== extent[1] ? extent : [] );
      }
    }

    function updateBrushElement() {
      if (has_selection && selection_visible) {
        brush_control = brush_control || d3.svg.brush()
          .x(xScale)
          .extent([selection_region.xmin || 0, selection_region.xmax || 0])
          .on("brush", brushListener);

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

    // ------------------------------------------------------------
    //
    // Canvas-based plotting
    //
    // ------------------------------------------------------------

    function createGraphCanvas() {
      graphCanvas = elem.append("canvas");
      gcanvas = graphCanvas.node();
      resizeCanvas();
    }

    function resizeCanvas() {
      graphCanvas
        .attr("class", "overlay")
        .style({
          "position": "absolute",
          "width":    size.width + "px",
          "height":   size.height + "px",
          "top":      padding.top + "px",
          "left":     padding.left + "px",
          "z-index": 1
        });
      gcanvas = graphCanvas.node();
      gcanvas.width = size.width;
      gcanvas.height = size.height;
      gcanvas.top = padding.top;
      gcanvas.left = padding.left;
      setupCanvasContext();
      updateCanvasFromPoints(currentSample);
    }

    function clearCanvas() {
      if (gcanvas.getContext) {
        gcanvas.width = gcanvas.width;
        gctx.fillStyle = canvasFillStyle;
        gctx.fillRect(0, 0, gcanvas.width, gcanvas.height);
        gctx.strokeStyle = "rgba(255,65,0, 1.0)";
      }
    }

    function setupCanvasContext() {
      if (gcanvas.getContext) {
        gctx = gcanvas.getContext( '2d' );
        gctx.globalCompositeOperation = "source-over";
        gctx.lineWidth = 1;
        gctx.fillStyle = canvasFillStyle;
        gctx.fillRect(0, 0, gcanvas.width, gcanvas.height);
        gctx.strokeStyle = "rgba(255,65,0, 1.0)";
      }
    }

    //
    // Update Canvas plotted data from [x, y] data points
    //
    function updateCanvasFromPoints(samplePoint) {
      var i, j, k,
          dx,
          px, py,
          index,
          yOrigin = yScale(0.00001),
          lines = options.lines,
          bars = options.bars,
          twopi = 2 * Math.PI,
          pointsLength = pointArray[0].length,
          numberOfLines = pointArray.length,
          xAxisStart,
          xAxisEnd,
          start,
          lengthX;

      // hack for lack of canvas support in jsdom tests
      if (typeof gcanvas.getContext === "undefined" ) { return; }

      setCurrentSample(samplePoint);
      clearCanvas();
      gctx.fillRect(0, 0, gcanvas.width, gcanvas.height);
      if (pointsLength === 0) { return; }
      xAxisStart = xScale.domain()[0];
      xAxisEnd =   xScale.domain()[1];
      start = Math.max(0, xAxisStart);
      if (lines) {
        for (i = 0; i < numberOfLines; i++) {
          points = pointArray[i];
          index = 0;
          // find first point >= xAxisStart
          for (j = 0; j < pointsLength; j++) {
            if (points[j][0] >= xAxisStart) { break; }
            index++;
          }
          if (index > 0) { --index; }
          if (index >= pointsLength) { break; }
          px = xScale(points[index][0]);
          py = yScale(points[index][1]);
          setStrokeColor(i);
          gctx.beginPath();
          gctx.moveTo(px, py);
          dx = points[index][0];
          index++;
          // plot all ... or until one point past xAxisEnd
          // or until we reach currentSample
          for (; index < samplePoint; index++) {
            dx = points[index][0];
            px = xScale(dx);
            py = yScale(points[index][1]);
            gctx.lineTo(px, py);
            if (dx >= xAxisEnd) { break; }
          }
          gctx.stroke();
          // now plot in a desaturated style all the rest of the points
          // ... or until one point past xAxisEnd
          if (index < pointsLength && dx < xAxisEnd) {
            setStrokeColor(i, true);
            for (;index < pointsLength; index++) {
              dx = points[index][0];
              px = xScale(dx);
              py = yScale(points[index][1]);
              gctx.lineTo(px, py);
              if (dx >= xAxisEnd) { break; }
            }
            gctx.stroke();
          }
        }
      } else if (bars) {
        for (i = 0; i < numberOfLines; i++) {
          points = pointArray[i];
          setStrokeColor(i);
          pointStop = samplePoint - 1;
          for (index=start; index < pointStop; index++) {
            px = xScale(points[index][0]);
            py = yScale(points[index][1]);
            if (py === 0) {
              continue;
            }
            gctx.beginPath();
            gctx.moveTo(px, yOrigin);
            gctx.lineTo(px, py);
            gctx.stroke();
          }
          pointStop = points.length-1;
          if (index < pointStop) {
            setStrokeColor(i, true);
            for (;index < pointStop; index++) {
              px = xScale(points[index][0]);
              py = yScale(points[index][1]);
              gctx.beginPath();
              gctx.moveTo(px, yOrigin);
              gctx.lineTo(px, py);
              gctx.stroke();
            }
          }
        }
      } else {
        for (i = 0; i < numberOfLines; i++) {
          points = pointArray[i];
          lengthX = 0;
          setFillColor(i);
          setStrokeColor(i, true);
          pointStop = samplePoint - 1;
          for (index=0; index < pointStop; index++) {
            px = xScale(points[index][0]);
            py = yScale(points[index][1]);
            gctx.arc(px, py, 1, 0, twopi, false);
            gctx.fill();
          }
          pointStop = points.length-1;
          if (index < pointStop) {
            setFillColor(i, true);
            setStrokeColor(i, true);
            for (;index < pointStop; index++) {
              px = xScale(points[index][0]);
              py = yScale(points[index][1]);
              gctx.arc(px, py, 1, 0, twopi, false);
              gctx.fill();
            }
          }
        }
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

    // ------------------------------------------------------------
    //
    // Adding samples/data points
    //
    // ------------------------------------------------------------

    // Add an array of points then update the graph.
    function addPoints(datapoints) {
      addDataPoints(datapoints);
      setCurrentSample(points.length);
      updateOrRescale();
    }

    // Add an array of samples then update the graph.
    function addSamples(datasamples) {
      addDataSamples(datasamples);
      setCurrentSample(points.length);
      updateOrRescale();
    }


    // Add a point [x, y] by processing sample (Y value) synthesizing
    // X value from sampleInterval and number of points
    function addSample(sample) {
      var index = points.length,
          xvalue = (index + dataSampleStart) * sampleInterval,
          point = [ xvalue, sample ];
      points.push(point);
      setCurrentSample(points.length);
      updateOrRescale();
    }

    // Add a point [x, y] to points array
    function addPoint(pnt) {
      points.push(pnt);
      setCurrentSample(points.length);
      updateOrRescale();
    }

    // Add an array (or arrays) of points.
    function addDataPoints(datapoints) {
      if (Object.prototype.toString.call(datapoints[0]) === "[object Array]") {
        for (var i = 0; i < datapoints.length; i++) {
          points = pointArray[i];
          points.push.apply(points, [datapoints[i]]);
          pointArray[i] = points;
        }
        points = pointArray[0];
      } else {
        points.push.apply(points, datapoints);
        pointArray = [points];
      }
    }

    // Add an array of points by processing an array of samples (Y values)
    // synthesizing the X value from sampleInterval interval and number of points.
    function addDataSamples(datasamples) {
      var start,
          i;
      if (Object.prototype.toString.call(datasamples[0]) === "[object Array]") {
        for (i = 0; i < datasamples.length; i++) {
          if (!pointArray[i]) { pointArray.push([]); }
          points = pointArray[i];
          start = points.length * sampleInterval;
          points.push.apply(points, indexedData(datasamples[i], sampleInterval, start));
          pointArray[i] = points;
        }
        points = pointArray[0];
      } else {
        for (i = 0; i < datasamples.length; i++) {
          if (!pointArray[i]) { pointArray.push([]); }
          start = pointArray[i].length * sampleInterval;
          pointArray[i].push([start, datasamples[i]]);
        }
      }
    }

    function resetDataPoints(datapoints) {

      function copy(array) {
        var ret = [];
        array.forEach(function(element) {
          ret.push(element);
        });
        return ret;
      }

      pointArray = [];
      if (!datapoints || datapoints.length === 0) {
        points = [];
        pointArray = [points];
        return;
      }
      if (Object.prototype.toString.call(datapoints[0]) === "[object Array]") {
        for (var i = 0; i < datapoints.length; i++) {
          pointArray.push(copy(datapoints[i]));
        }
        points = pointArray[0];
      } else {
        points = datapoints;
        pointArray = [copy(points)];
      }
    }

    function resetDataSamples(datasamples, interval, start) {
      pointArray = [];
      if (Object.prototype.toString.call(datasamples[0]) === "[object Array]") {
        for (var i = 0; i < datasamples.length; i++) {
          pointArray.push(indexedData(datasamples[i], interval, start));
        }
        points = pointArray[0];
      } else {
        points = indexedData(datasamples, interval, start);
        pointArray = [points];
      }
      sampleInterval = interval;
      dataSampleStart = start;
    }


    function resetPoints(datapoints) {
      resetDataPoints(datapoints);
    }

    function resetSamples(datasamples) {
      resetDataSamples(datasamples, sampleInterval, dataSampleStart);
    }

    function deletePoint(i) {
      if (points.length) {
        points.splice(i, 1);
        if (currentSample >= points.length) {
          currentSample = points.length-1;
        }
      }
    }

    // ------------------------------------------------------------
    //
    // Keyboard Handling
    //
    // ------------------------------------------------------------

    function registerKeyboardHandler() {
      svg.node().addEventListener("keydown", function (evt) {
        if (!selected) return false;
        if (evt.type == "keydown") {
          switch (evt.keyCode) {
            case 8:   // backspace
            case 46:  // delete
            if (options.dataChange) {
              var i = points.indexOf(selected);
              deletePoint(i);
              selected = points.length ? points[i > 0 ? i - 1 : 0] : null;
              update();
            }
            evt.preventDefault();
            evt.stopPropagation();
            break;
          }
          evt.preventDefault();
        }
      });
    }

    // ------------------------------------------------------------
    //
    // Graph attribute updaters
    //
    // ------------------------------------------------------------

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

    // ------------------------------------------------------------
    //
    // Main API functions ...
    //
    // ------------------------------------------------------------

    function renderGraph() {
      calculateLayout();
      if (svg === undefined) {
        renderNewGraph();
      } else {
        repaintExistingGraph();
      }
      if (options.showButtons) {
        if (!buttonLayer) createButtonLayer();
        resizeButtonLayer();
      }
      redraw();
    }

    function reset(idOrElement, options, message) {
      if (arguments.length) {
        initialize(idOrElement, options, message);
      } else {
        initialize();
      }
      renderGraph();
      // and then render again using actual size of SVG text elements are
      renderGraph();
      registerKeyboardHandler();
      return api;
    }

    function resize(w, h) {
      scale(w, h);
      initializeLayout();
      renderGraph();
      return api;
    }

    //
    // Public API to instantiated Graph
    //
    api = {
      update:               update,
      repaint:              renderGraph,
      reset:                reset,
      redraw:               redraw,
      resize:               resize,
      notify:               notify,

      // selection brush api
      selectionDomain:      selectionDomain,
      selectionVisible:     selectionVisible,
      selectionListener:    selectionListener,
      selectionEnabled:     selectionEnabled,
      hasSelection:         hasSelection,

      /**
        Read only getter for the d3 selection referencing the DOM elements containing the d3
        brush used to implement selection region manipulation.
      */
      brushElement: function() {
        return brush_element;
      },

      /**
        Read-only getter for the d3 brush control (d3.svg.brush() function) used to implement
        selection region manipulation.
      */
      brushControl: function() {
        return brush_control;
      },

      /**
        Read-only getter for the internal listener to the d3 'brush' event.
      */
      brushListener: function() {
        return brushListener;
      },

      // specific update functions ???
      scale:                scale,
      updateOrRescale:      updateOrRescale,

      xDomain: function(_) {
        if (!arguments.length) return xScale.domain();
        xScale.domain(_);
        if (updateXScale) {
          updateXScale();
          redraw();
        }
        return api;
      },

      yDomain: function(_) {
        if (!arguments.length) return yScale.domain();
        yScale.domain(_);
        if (updateYScale) {
          updateYScale();
          redraw();
        }
        return api;
      },

      xmin: function(_) {
        if (!arguments.length) return options.xmin;
        options.xmin = _;
        options.xrange = options.xmax - options.xmin;
        if (updateXScale) {
          updateXScale();
          redraw();
        }
        return api;
      },

      xmax: function(_) {
        if (!arguments.length) return options.xmax;
        options.xmax = _;
        options.xrange = options.xmax - options.xmin;
        if (updateXScale) {
          updateXScale();
          redraw();
        }
        return api;
      },

      ymin: function(_) {
        if (!arguments.length) return options.ymin;
        options.ymin = _;
        options.yrange = options.ymax - options.ymin;
        if (updateYScale) {
          updateYScale();
          redraw();
        }
        return api;
      },

      ymax: function(_) {
        if (!arguments.length) return options.ymax;
        options.ymax = _;
        options.yrange = options.ymax - options.ymin;
        if (updateYScale) {
          updateYScale();
          redraw();
        }
        return api;
      },

      xLabel: function(_) {
        if (!arguments.length) return options.xlabel;
        options.xlabel = _;
        updateXlabel();
        return api;
      },

      yLabel: function(_) {
        if (!arguments.length) return options.ylabel;
        options.ylabel = _;
        updateYlabel();
        return api;
      },

      title: function(_) {
        if (!arguments.length) return options.title;
        options.title = _;
        updateTitle();
        return api;
      },

      width: function(_) {
        if (!arguments.length) return size.width;
        size.width = _;
        return api;
      },

      height: function(_) {
        if (!arguments.length) return size.height;
        size.height = _;
        return api;
      },

      elem: function(_) {
        if (!arguments.length) return elem;
        elem = d3.select(_);
        graph(elem);
        return api;
      },

      numberOfPoints: function() {
        if (points) {
          return points.length;
        } else {
          return false;
        }
      },

      // Point data consist of an array (or arrays) of [x,y] arrays.
      addPoints:       addPoints,
      addPoint:        addPoint,
      resetPoints:      resetPoints,

      // Sample data consists of an array (or an array or arrays) of samples.
      // The interval between samples is assumed to have already been set
      // by specifying options.sampleInterval when creating the graph.
      addSamples:      addSamples,
      addSample:       addSample,
      resetSamples: resetSamples

    };

    // Initialization.
    initialize(idOrElement, options, message);

    if (node) {
      renderGraph();
      // Render again using actual size of SVG text elements.
      renderGraph();
    }

    return api;

  };
});

//     Underscore.js 1.4.2
//     http://underscorejs.org
//     (c) 2009-2012 Jeremy Ashkenas, DocumentCloud Inc.
//     Underscore may be freely distributed under the MIT license.

(function() {

  // Baseline setup
  // --------------

  // Establish the root object, `window` in the browser, or `global` on the server.
  var root = this;

  // Save the previous value of the `_` variable.
  var previousUnderscore = root._;

  // Establish the object that gets returned to break out of a loop iteration.
  var breaker = {};

  // Save bytes in the minified (but not gzipped) version:
  var ArrayProto = Array.prototype, ObjProto = Object.prototype, FuncProto = Function.prototype;

  // Create quick reference variables for speed access to core prototypes.
  var push             = ArrayProto.push,
      slice            = ArrayProto.slice,
      concat           = ArrayProto.concat,
      unshift          = ArrayProto.unshift,
      toString         = ObjProto.toString,
      hasOwnProperty   = ObjProto.hasOwnProperty;

  // All **ECMAScript 5** native function implementations that we hope to use
  // are declared here.
  var
    nativeForEach      = ArrayProto.forEach,
    nativeMap          = ArrayProto.map,
    nativeReduce       = ArrayProto.reduce,
    nativeReduceRight  = ArrayProto.reduceRight,
    nativeFilter       = ArrayProto.filter,
    nativeEvery        = ArrayProto.every,
    nativeSome         = ArrayProto.some,
    nativeIndexOf      = ArrayProto.indexOf,
    nativeLastIndexOf  = ArrayProto.lastIndexOf,
    nativeIsArray      = Array.isArray,
    nativeKeys         = Object.keys,
    nativeBind         = FuncProto.bind;

  // Create a safe reference to the Underscore object for use below.
  var _ = function(obj) {
    if (obj instanceof _) return obj;
    if (!(this instanceof _)) return new _(obj);
    this._wrapped = obj;
  };

  // Export the Underscore object for **Node.js**, with
  // backwards-compatibility for the old `require()` API. If we're in
  // the browser, add `_` as a global object via a string identifier,
  // for Closure Compiler "advanced" mode.
  if (typeof exports !== 'undefined') {
    if (typeof module !== 'undefined' && module.exports) {
      exports = module.exports = _;
    }
    exports._ = _;
  } else {
    root['_'] = _;
  }

  // Current version.
  _.VERSION = '1.4.2';

  // Collection Functions
  // --------------------

  // The cornerstone, an `each` implementation, aka `forEach`.
  // Handles objects with the built-in `forEach`, arrays, and raw objects.
  // Delegates to **ECMAScript 5**'s native `forEach` if available.
  var each = _.each = _.forEach = function(obj, iterator, context) {
    if (obj == null) return;
    if (nativeForEach && obj.forEach === nativeForEach) {
      obj.forEach(iterator, context);
    } else if (obj.length === +obj.length) {
      for (var i = 0, l = obj.length; i < l; i++) {
        if (iterator.call(context, obj[i], i, obj) === breaker) return;
      }
    } else {
      for (var key in obj) {
        if (_.has(obj, key)) {
          if (iterator.call(context, obj[key], key, obj) === breaker) return;
        }
      }
    }
  };

  // Return the results of applying the iterator to each element.
  // Delegates to **ECMAScript 5**'s native `map` if available.
  _.map = _.collect = function(obj, iterator, context) {
    var results = [];
    if (obj == null) return results;
    if (nativeMap && obj.map === nativeMap) return obj.map(iterator, context);
    each(obj, function(value, index, list) {
      results[results.length] = iterator.call(context, value, index, list);
    });
    return results;
  };

  // **Reduce** builds up a single result from a list of values, aka `inject`,
  // or `foldl`. Delegates to **ECMAScript 5**'s native `reduce` if available.
  _.reduce = _.foldl = _.inject = function(obj, iterator, memo, context) {
    var initial = arguments.length > 2;
    if (obj == null) obj = [];
    if (nativeReduce && obj.reduce === nativeReduce) {
      if (context) iterator = _.bind(iterator, context);
      return initial ? obj.reduce(iterator, memo) : obj.reduce(iterator);
    }
    each(obj, function(value, index, list) {
      if (!initial) {
        memo = value;
        initial = true;
      } else {
        memo = iterator.call(context, memo, value, index, list);
      }
    });
    if (!initial) throw new TypeError('Reduce of empty array with no initial value');
    return memo;
  };

  // The right-associative version of reduce, also known as `foldr`.
  // Delegates to **ECMAScript 5**'s native `reduceRight` if available.
  _.reduceRight = _.foldr = function(obj, iterator, memo, context) {
    var initial = arguments.length > 2;
    if (obj == null) obj = [];
    if (nativeReduceRight && obj.reduceRight === nativeReduceRight) {
      if (context) iterator = _.bind(iterator, context);
      return arguments.length > 2 ? obj.reduceRight(iterator, memo) : obj.reduceRight(iterator);
    }
    var length = obj.length;
    if (length !== +length) {
      var keys = _.keys(obj);
      length = keys.length;
    }
    each(obj, function(value, index, list) {
      index = keys ? keys[--length] : --length;
      if (!initial) {
        memo = obj[index];
        initial = true;
      } else {
        memo = iterator.call(context, memo, obj[index], index, list);
      }
    });
    if (!initial) throw new TypeError('Reduce of empty array with no initial value');
    return memo;
  };

  // Return the first value which passes a truth test. Aliased as `detect`.
  _.find = _.detect = function(obj, iterator, context) {
    var result;
    any(obj, function(value, index, list) {
      if (iterator.call(context, value, index, list)) {
        result = value;
        return true;
      }
    });
    return result;
  };

  // Return all the elements that pass a truth test.
  // Delegates to **ECMAScript 5**'s native `filter` if available.
  // Aliased as `select`.
  _.filter = _.select = function(obj, iterator, context) {
    var results = [];
    if (obj == null) return results;
    if (nativeFilter && obj.filter === nativeFilter) return obj.filter(iterator, context);
    each(obj, function(value, index, list) {
      if (iterator.call(context, value, index, list)) results[results.length] = value;
    });
    return results;
  };

  // Return all the elements for which a truth test fails.
  _.reject = function(obj, iterator, context) {
    return _.filter(obj, function(value, index, list) {
      return !iterator.call(context, value, index, list);
    }, context);
  };

  // Determine whether all of the elements match a truth test.
  // Delegates to **ECMAScript 5**'s native `every` if available.
  // Aliased as `all`.
  _.every = _.all = function(obj, iterator, context) {
    iterator || (iterator = _.identity);
    var result = true;
    if (obj == null) return result;
    if (nativeEvery && obj.every === nativeEvery) return obj.every(iterator, context);
    each(obj, function(value, index, list) {
      if (!(result = result && iterator.call(context, value, index, list))) return breaker;
    });
    return !!result;
  };

  // Determine if at least one element in the object matches a truth test.
  // Delegates to **ECMAScript 5**'s native `some` if available.
  // Aliased as `any`.
  var any = _.some = _.any = function(obj, iterator, context) {
    iterator || (iterator = _.identity);
    var result = false;
    if (obj == null) return result;
    if (nativeSome && obj.some === nativeSome) return obj.some(iterator, context);
    each(obj, function(value, index, list) {
      if (result || (result = iterator.call(context, value, index, list))) return breaker;
    });
    return !!result;
  };

  // Determine if the array or object contains a given value (using `===`).
  // Aliased as `include`.
  _.contains = _.include = function(obj, target) {
    if (obj == null) return false;
    if (nativeIndexOf && obj.indexOf === nativeIndexOf) return obj.indexOf(target) != -1;
    return any(obj, function(value) {
      return value === target;
    });
  };

  // Invoke a method (with arguments) on every item in a collection.
  _.invoke = function(obj, method) {
    var args = slice.call(arguments, 2);
    return _.map(obj, function(value) {
      return (_.isFunction(method) ? method : value[method]).apply(value, args);
    });
  };

  // Convenience version of a common use case of `map`: fetching a property.
  _.pluck = function(obj, key) {
    return _.map(obj, function(value){ return value[key]; });
  };

  // Convenience version of a common use case of `filter`: selecting only objects
  // with specific `key:value` pairs.
  _.where = function(obj, attrs) {
    if (_.isEmpty(attrs)) return [];
    return _.filter(obj, function(value) {
      for (var key in attrs) {
        if (attrs[key] !== value[key]) return false;
      }
      return true;
    });
  };

  // Return the maximum element or (element-based computation).
  // Can't optimize arrays of integers longer than 65,535 elements.
  // See: https://bugs.webkit.org/show_bug.cgi?id=80797
  _.max = function(obj, iterator, context) {
    if (!iterator && _.isArray(obj) && obj[0] === +obj[0] && obj.length < 65535) {
      return Math.max.apply(Math, obj);
    }
    if (!iterator && _.isEmpty(obj)) return -Infinity;
    var result = {computed : -Infinity};
    each(obj, function(value, index, list) {
      var computed = iterator ? iterator.call(context, value, index, list) : value;
      computed >= result.computed && (result = {value : value, computed : computed});
    });
    return result.value;
  };

  // Return the minimum element (or element-based computation).
  _.min = function(obj, iterator, context) {
    if (!iterator && _.isArray(obj) && obj[0] === +obj[0] && obj.length < 65535) {
      return Math.min.apply(Math, obj);
    }
    if (!iterator && _.isEmpty(obj)) return Infinity;
    var result = {computed : Infinity};
    each(obj, function(value, index, list) {
      var computed = iterator ? iterator.call(context, value, index, list) : value;
      computed < result.computed && (result = {value : value, computed : computed});
    });
    return result.value;
  };

  // Shuffle an array.
  _.shuffle = function(obj) {
    var rand;
    var index = 0;
    var shuffled = [];
    each(obj, function(value) {
      rand = _.random(index++);
      shuffled[index - 1] = shuffled[rand];
      shuffled[rand] = value;
    });
    return shuffled;
  };

  // An internal function to generate lookup iterators.
  var lookupIterator = function(value) {
    return _.isFunction(value) ? value : function(obj){ return obj[value]; };
  };

  // Sort the object's values by a criterion produced by an iterator.
  _.sortBy = function(obj, value, context) {
    var iterator = lookupIterator(value);
    return _.pluck(_.map(obj, function(value, index, list) {
      return {
        value : value,
        index : index,
        criteria : iterator.call(context, value, index, list)
      };
    }).sort(function(left, right) {
      var a = left.criteria;
      var b = right.criteria;
      if (a !== b) {
        if (a > b || a === void 0) return 1;
        if (a < b || b === void 0) return -1;
      }
      return left.index < right.index ? -1 : 1;
    }), 'value');
  };

  // An internal function used for aggregate "group by" operations.
  var group = function(obj, value, context, behavior) {
    var result = {};
    var iterator = lookupIterator(value);
    each(obj, function(value, index) {
      var key = iterator.call(context, value, index, obj);
      behavior(result, key, value);
    });
    return result;
  };

  // Groups the object's values by a criterion. Pass either a string attribute
  // to group by, or a function that returns the criterion.
  _.groupBy = function(obj, value, context) {
    return group(obj, value, context, function(result, key, value) {
      (_.has(result, key) ? result[key] : (result[key] = [])).push(value);
    });
  };

  // Counts instances of an object that group by a certain criterion. Pass
  // either a string attribute to count by, or a function that returns the
  // criterion.
  _.countBy = function(obj, value, context) {
    return group(obj, value, context, function(result, key, value) {
      if (!_.has(result, key)) result[key] = 0;
      result[key]++;
    });
  };

  // Use a comparator function to figure out the smallest index at which
  // an object should be inserted so as to maintain order. Uses binary search.
  _.sortedIndex = function(array, obj, iterator, context) {
    iterator = iterator == null ? _.identity : lookupIterator(iterator);
    var value = iterator.call(context, obj);
    var low = 0, high = array.length;
    while (low < high) {
      var mid = (low + high) >>> 1;
      iterator.call(context, array[mid]) < value ? low = mid + 1 : high = mid;
    }
    return low;
  };

  // Safely convert anything iterable into a real, live array.
  _.toArray = function(obj) {
    if (!obj) return [];
    if (obj.length === +obj.length) return slice.call(obj);
    return _.values(obj);
  };

  // Return the number of elements in an object.
  _.size = function(obj) {
    if (obj == null) return 0;
    return (obj.length === +obj.length) ? obj.length : _.keys(obj).length;
  };

  // Array Functions
  // ---------------

  // Get the first element of an array. Passing **n** will return the first N
  // values in the array. Aliased as `head` and `take`. The **guard** check
  // allows it to work with `_.map`.
  _.first = _.head = _.take = function(array, n, guard) {
    if (array == null) return void 0;
    return (n != null) && !guard ? slice.call(array, 0, n) : array[0];
  };

  // Returns everything but the last entry of the array. Especially useful on
  // the arguments object. Passing **n** will return all the values in
  // the array, excluding the last N. The **guard** check allows it to work with
  // `_.map`.
  _.initial = function(array, n, guard) {
    return slice.call(array, 0, array.length - ((n == null) || guard ? 1 : n));
  };

  // Get the last element of an array. Passing **n** will return the last N
  // values in the array. The **guard** check allows it to work with `_.map`.
  _.last = function(array, n, guard) {
    if (array == null) return void 0;
    if ((n != null) && !guard) {
      return slice.call(array, Math.max(array.length - n, 0));
    } else {
      return array[array.length - 1];
    }
  };

  // Returns everything but the first entry of the array. Aliased as `tail` and `drop`.
  // Especially useful on the arguments object. Passing an **n** will return
  // the rest N values in the array. The **guard**
  // check allows it to work with `_.map`.
  _.rest = _.tail = _.drop = function(array, n, guard) {
    return slice.call(array, (n == null) || guard ? 1 : n);
  };

  // Trim out all falsy values from an array.
  _.compact = function(array) {
    return _.filter(array, function(value){ return !!value; });
  };

  // Internal implementation of a recursive `flatten` function.
  var flatten = function(input, shallow, output) {
    each(input, function(value) {
      if (_.isArray(value)) {
        shallow ? push.apply(output, value) : flatten(value, shallow, output);
      } else {
        output.push(value);
      }
    });
    return output;
  };

  // Return a completely flattened version of an array.
  _.flatten = function(array, shallow) {
    return flatten(array, shallow, []);
  };

  // Return a version of the array that does not contain the specified value(s).
  _.without = function(array) {
    return _.difference(array, slice.call(arguments, 1));
  };

  // Produce a duplicate-free version of the array. If the array has already
  // been sorted, you have the option of using a faster algorithm.
  // Aliased as `unique`.
  _.uniq = _.unique = function(array, isSorted, iterator, context) {
    if (_.isFunction(isSorted)) {
      context = iterator;
      iterator = isSorted;
      isSorted = false;
    }
    var initial = iterator ? _.map(array, iterator, context) : array;
    var results = [];
    var seen = [];
    each(initial, function(value, index) {
      if (isSorted ? (!index || seen[seen.length - 1] !== value) : !_.contains(seen, value)) {
        seen.push(value);
        results.push(array[index]);
      }
    });
    return results;
  };

  // Produce an array that contains the union: each distinct element from all of
  // the passed-in arrays.
  _.union = function() {
    return _.uniq(concat.apply(ArrayProto, arguments));
  };

  // Produce an array that contains every item shared between all the
  // passed-in arrays.
  _.intersection = function(array) {
    var rest = slice.call(arguments, 1);
    return _.filter(_.uniq(array), function(item) {
      return _.every(rest, function(other) {
        return _.indexOf(other, item) >= 0;
      });
    });
  };

  // Take the difference between one array and a number of other arrays.
  // Only the elements present in just the first array will remain.
  _.difference = function(array) {
    var rest = concat.apply(ArrayProto, slice.call(arguments, 1));
    return _.filter(array, function(value){ return !_.contains(rest, value); });
  };

  // Zip together multiple lists into a single array -- elements that share
  // an index go together.
  _.zip = function() {
    var args = slice.call(arguments);
    var length = _.max(_.pluck(args, 'length'));
    var results = new Array(length);
    for (var i = 0; i < length; i++) {
      results[i] = _.pluck(args, "" + i);
    }
    return results;
  };

  // Converts lists into objects. Pass either a single array of `[key, value]`
  // pairs, or two parallel arrays of the same length -- one of keys, and one of
  // the corresponding values.
  _.object = function(list, values) {
    if (list == null) return {};
    var result = {};
    for (var i = 0, l = list.length; i < l; i++) {
      if (values) {
        result[list[i]] = values[i];
      } else {
        result[list[i][0]] = list[i][1];
      }
    }
    return result;
  };

  // If the browser doesn't supply us with indexOf (I'm looking at you, **MSIE**),
  // we need this function. Return the position of the first occurrence of an
  // item in an array, or -1 if the item is not included in the array.
  // Delegates to **ECMAScript 5**'s native `indexOf` if available.
  // If the array is large and already in sort order, pass `true`
  // for **isSorted** to use binary search.
  _.indexOf = function(array, item, isSorted) {
    if (array == null) return -1;
    var i = 0, l = array.length;
    if (isSorted) {
      if (typeof isSorted == 'number') {
        i = (isSorted < 0 ? Math.max(0, l + isSorted) : isSorted);
      } else {
        i = _.sortedIndex(array, item);
        return array[i] === item ? i : -1;
      }
    }
    if (nativeIndexOf && array.indexOf === nativeIndexOf) return array.indexOf(item, isSorted);
    for (; i < l; i++) if (array[i] === item) return i;
    return -1;
  };

  // Delegates to **ECMAScript 5**'s native `lastIndexOf` if available.
  _.lastIndexOf = function(array, item, from) {
    if (array == null) return -1;
    var hasIndex = from != null;
    if (nativeLastIndexOf && array.lastIndexOf === nativeLastIndexOf) {
      return hasIndex ? array.lastIndexOf(item, from) : array.lastIndexOf(item);
    }
    var i = (hasIndex ? from : array.length);
    while (i--) if (array[i] === item) return i;
    return -1;
  };

  // Generate an integer Array containing an arithmetic progression. A port of
  // the native Python `range()` function. See
  // [the Python documentation](http://docs.python.org/library/functions.html#range).
  _.range = function(start, stop, step) {
    if (arguments.length <= 1) {
      stop = start || 0;
      start = 0;
    }
    step = arguments[2] || 1;

    var len = Math.max(Math.ceil((stop - start) / step), 0);
    var idx = 0;
    var range = new Array(len);

    while(idx < len) {
      range[idx++] = start;
      start += step;
    }

    return range;
  };

  // Function (ahem) Functions
  // ------------------

  // Reusable constructor function for prototype setting.
  var ctor = function(){};

  // Create a function bound to a given object (assigning `this`, and arguments,
  // optionally). Binding with arguments is also known as `curry`.
  // Delegates to **ECMAScript 5**'s native `Function.bind` if available.
  // We check for `func.bind` first, to fail fast when `func` is undefined.
  _.bind = function bind(func, context) {
    var bound, args;
    if (func.bind === nativeBind && nativeBind) return nativeBind.apply(func, slice.call(arguments, 1));
    if (!_.isFunction(func)) throw new TypeError;
    args = slice.call(arguments, 2);
    return bound = function() {
      if (!(this instanceof bound)) return func.apply(context, args.concat(slice.call(arguments)));
      ctor.prototype = func.prototype;
      var self = new ctor;
      var result = func.apply(self, args.concat(slice.call(arguments)));
      if (Object(result) === result) return result;
      return self;
    };
  };

  // Bind all of an object's methods to that object. Useful for ensuring that
  // all callbacks defined on an object belong to it.
  _.bindAll = function(obj) {
    var funcs = slice.call(arguments, 1);
    if (funcs.length == 0) funcs = _.functions(obj);
    each(funcs, function(f) { obj[f] = _.bind(obj[f], obj); });
    return obj;
  };

  // Memoize an expensive function by storing its results.
  _.memoize = function(func, hasher) {
    var memo = {};
    hasher || (hasher = _.identity);
    return function() {
      var key = hasher.apply(this, arguments);
      return _.has(memo, key) ? memo[key] : (memo[key] = func.apply(this, arguments));
    };
  };

  // Delays a function for the given number of milliseconds, and then calls
  // it with the arguments supplied.
  _.delay = function(func, wait) {
    var args = slice.call(arguments, 2);
    return setTimeout(function(){ return func.apply(null, args); }, wait);
  };

  // Defers a function, scheduling it to run after the current call stack has
  // cleared.
  _.defer = function(func) {
    return _.delay.apply(_, [func, 1].concat(slice.call(arguments, 1)));
  };

  // Returns a function, that, when invoked, will only be triggered at most once
  // during a given window of time.
  _.throttle = function(func, wait) {
    var context, args, timeout, result;
    var previous = 0;
    var later = function() {
      previous = new Date;
      timeout = null;
      result = func.apply(context, args);
    };
    return function() {
      var now = new Date;
      var remaining = wait - (now - previous);
      context = this;
      args = arguments;
      if (remaining <= 0) {
        clearTimeout(timeout);
        previous = now;
        result = func.apply(context, args);
      } else if (!timeout) {
        timeout = setTimeout(later, remaining);
      }
      return result;
    };
  };

  // Returns a function, that, as long as it continues to be invoked, will not
  // be triggered. The function will be called after it stops being called for
  // N milliseconds. If `immediate` is passed, trigger the function on the
  // leading edge, instead of the trailing.
  _.debounce = function(func, wait, immediate) {
    var timeout, result;
    return function() {
      var context = this, args = arguments;
      var later = function() {
        timeout = null;
        if (!immediate) result = func.apply(context, args);
      };
      var callNow = immediate && !timeout;
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
      if (callNow) result = func.apply(context, args);
      return result;
    };
  };

  // Returns a function that will be executed at most one time, no matter how
  // often you call it. Useful for lazy initialization.
  _.once = function(func) {
    var ran = false, memo;
    return function() {
      if (ran) return memo;
      ran = true;
      memo = func.apply(this, arguments);
      func = null;
      return memo;
    };
  };

  // Returns the first function passed as an argument to the second,
  // allowing you to adjust arguments, run code before and after, and
  // conditionally execute the original function.
  _.wrap = function(func, wrapper) {
    return function() {
      var args = [func];
      push.apply(args, arguments);
      return wrapper.apply(this, args);
    };
  };

  // Returns a function that is the composition of a list of functions, each
  // consuming the return value of the function that follows.
  _.compose = function() {
    var funcs = arguments;
    return function() {
      var args = arguments;
      for (var i = funcs.length - 1; i >= 0; i--) {
        args = [funcs[i].apply(this, args)];
      }
      return args[0];
    };
  };

  // Returns a function that will only be executed after being called N times.
  _.after = function(times, func) {
    if (times <= 0) return func();
    return function() {
      if (--times < 1) {
        return func.apply(this, arguments);
      }
    };
  };

  // Object Functions
  // ----------------

  // Retrieve the names of an object's properties.
  // Delegates to **ECMAScript 5**'s native `Object.keys`
  _.keys = nativeKeys || function(obj) {
    if (obj !== Object(obj)) throw new TypeError('Invalid object');
    var keys = [];
    for (var key in obj) if (_.has(obj, key)) keys[keys.length] = key;
    return keys;
  };

  // Retrieve the values of an object's properties.
  _.values = function(obj) {
    var values = [];
    for (var key in obj) if (_.has(obj, key)) values.push(obj[key]);
    return values;
  };

  // Convert an object into a list of `[key, value]` pairs.
  _.pairs = function(obj) {
    var pairs = [];
    for (var key in obj) if (_.has(obj, key)) pairs.push([key, obj[key]]);
    return pairs;
  };

  // Invert the keys and values of an object. The values must be serializable.
  _.invert = function(obj) {
    var result = {};
    for (var key in obj) if (_.has(obj, key)) result[obj[key]] = key;
    return result;
  };

  // Return a sorted list of the function names available on the object.
  // Aliased as `methods`
  _.functions = _.methods = function(obj) {
    var names = [];
    for (var key in obj) {
      if (_.isFunction(obj[key])) names.push(key);
    }
    return names.sort();
  };

  // Extend a given object with all the properties in passed-in object(s).
  _.extend = function(obj) {
    each(slice.call(arguments, 1), function(source) {
      for (var prop in source) {
        obj[prop] = source[prop];
      }
    });
    return obj;
  };

  // Return a copy of the object only containing the whitelisted properties.
  _.pick = function(obj) {
    var copy = {};
    var keys = concat.apply(ArrayProto, slice.call(arguments, 1));
    each(keys, function(key) {
      if (key in obj) copy[key] = obj[key];
    });
    return copy;
  };

   // Return a copy of the object without the blacklisted properties.
  _.omit = function(obj) {
    var copy = {};
    var keys = concat.apply(ArrayProto, slice.call(arguments, 1));
    for (var key in obj) {
      if (!_.contains(keys, key)) copy[key] = obj[key];
    }
    return copy;
  };

  // Fill in a given object with default properties.
  _.defaults = function(obj) {
    each(slice.call(arguments, 1), function(source) {
      for (var prop in source) {
        if (obj[prop] == null) obj[prop] = source[prop];
      }
    });
    return obj;
  };

  // Create a (shallow-cloned) duplicate of an object.
  _.clone = function(obj) {
    if (!_.isObject(obj)) return obj;
    return _.isArray(obj) ? obj.slice() : _.extend({}, obj);
  };

  // Invokes interceptor with the obj, and then returns obj.
  // The primary purpose of this method is to "tap into" a method chain, in
  // order to perform operations on intermediate results within the chain.
  _.tap = function(obj, interceptor) {
    interceptor(obj);
    return obj;
  };

  // Internal recursive comparison function for `isEqual`.
  var eq = function(a, b, aStack, bStack) {
    // Identical objects are equal. `0 === -0`, but they aren't identical.
    // See the Harmony `egal` proposal: http://wiki.ecmascript.org/doku.php?id=harmony:egal.
    if (a === b) return a !== 0 || 1 / a == 1 / b;
    // A strict comparison is necessary because `null == undefined`.
    if (a == null || b == null) return a === b;
    // Unwrap any wrapped objects.
    if (a instanceof _) a = a._wrapped;
    if (b instanceof _) b = b._wrapped;
    // Compare `[[Class]]` names.
    var className = toString.call(a);
    if (className != toString.call(b)) return false;
    switch (className) {
      // Strings, numbers, dates, and booleans are compared by value.
      case '[object String]':
        // Primitives and their corresponding object wrappers are equivalent; thus, `"5"` is
        // equivalent to `new String("5")`.
        return a == String(b);
      case '[object Number]':
        // `NaN`s are equivalent, but non-reflexive. An `egal` comparison is performed for
        // other numeric values.
        return a != +a ? b != +b : (a == 0 ? 1 / a == 1 / b : a == +b);
      case '[object Date]':
      case '[object Boolean]':
        // Coerce dates and booleans to numeric primitive values. Dates are compared by their
        // millisecond representations. Note that invalid dates with millisecond representations
        // of `NaN` are not equivalent.
        return +a == +b;
      // RegExps are compared by their source patterns and flags.
      case '[object RegExp]':
        return a.source == b.source &&
               a.global == b.global &&
               a.multiline == b.multiline &&
               a.ignoreCase == b.ignoreCase;
    }
    if (typeof a != 'object' || typeof b != 'object') return false;
    // Assume equality for cyclic structures. The algorithm for detecting cyclic
    // structures is adapted from ES 5.1 section 15.12.3, abstract operation `JO`.
    var length = aStack.length;
    while (length--) {
      // Linear search. Performance is inversely proportional to the number of
      // unique nested structures.
      if (aStack[length] == a) return bStack[length] == b;
    }
    // Add the first object to the stack of traversed objects.
    aStack.push(a);
    bStack.push(b);
    var size = 0, result = true;
    // Recursively compare objects and arrays.
    if (className == '[object Array]') {
      // Compare array lengths to determine if a deep comparison is necessary.
      size = a.length;
      result = size == b.length;
      if (result) {
        // Deep compare the contents, ignoring non-numeric properties.
        while (size--) {
          if (!(result = eq(a[size], b[size], aStack, bStack))) break;
        }
      }
    } else {
      // Objects with different constructors are not equivalent, but `Object`s
      // from different frames are.
      var aCtor = a.constructor, bCtor = b.constructor;
      if (aCtor !== bCtor && !(_.isFunction(aCtor) && (aCtor instanceof aCtor) &&
                               _.isFunction(bCtor) && (bCtor instanceof bCtor))) {
        return false;
      }
      // Deep compare objects.
      for (var key in a) {
        if (_.has(a, key)) {
          // Count the expected number of properties.
          size++;
          // Deep compare each member.
          if (!(result = _.has(b, key) && eq(a[key], b[key], aStack, bStack))) break;
        }
      }
      // Ensure that both objects contain the same number of properties.
      if (result) {
        for (key in b) {
          if (_.has(b, key) && !(size--)) break;
        }
        result = !size;
      }
    }
    // Remove the first object from the stack of traversed objects.
    aStack.pop();
    bStack.pop();
    return result;
  };

  // Perform a deep comparison to check if two objects are equal.
  _.isEqual = function(a, b) {
    return eq(a, b, [], []);
  };

  // Is a given array, string, or object empty?
  // An "empty" object has no enumerable own-properties.
  _.isEmpty = function(obj) {
    if (obj == null) return true;
    if (_.isArray(obj) || _.isString(obj)) return obj.length === 0;
    for (var key in obj) if (_.has(obj, key)) return false;
    return true;
  };

  // Is a given value a DOM element?
  _.isElement = function(obj) {
    return !!(obj && obj.nodeType === 1);
  };

  // Is a given value an array?
  // Delegates to ECMA5's native Array.isArray
  _.isArray = nativeIsArray || function(obj) {
    return toString.call(obj) == '[object Array]';
  };

  // Is a given variable an object?
  _.isObject = function(obj) {
    return obj === Object(obj);
  };

  // Add some isType methods: isArguments, isFunction, isString, isNumber, isDate, isRegExp.
  each(['Arguments', 'Function', 'String', 'Number', 'Date', 'RegExp'], function(name) {
    _['is' + name] = function(obj) {
      return toString.call(obj) == '[object ' + name + ']';
    };
  });

  // Define a fallback version of the method in browsers (ahem, IE), where
  // there isn't any inspectable "Arguments" type.
  if (!_.isArguments(arguments)) {
    _.isArguments = function(obj) {
      return !!(obj && _.has(obj, 'callee'));
    };
  }

  // Optimize `isFunction` if appropriate.
  if (typeof (/./) !== 'function') {
    _.isFunction = function(obj) {
      return typeof obj === 'function';
    };
  }

  // Is a given object a finite number?
  _.isFinite = function(obj) {
    return isFinite( obj ) && !isNaN( parseFloat(obj) );
  };

  // Is the given value `NaN`? (NaN is the only number which does not equal itself).
  _.isNaN = function(obj) {
    return _.isNumber(obj) && obj != +obj;
  };

  // Is a given value a boolean?
  _.isBoolean = function(obj) {
    return obj === true || obj === false || toString.call(obj) == '[object Boolean]';
  };

  // Is a given value equal to null?
  _.isNull = function(obj) {
    return obj === null;
  };

  // Is a given variable undefined?
  _.isUndefined = function(obj) {
    return obj === void 0;
  };

  // Shortcut function for checking if an object has a given property directly
  // on itself (in other words, not on a prototype).
  _.has = function(obj, key) {
    return hasOwnProperty.call(obj, key);
  };

  // Utility Functions
  // -----------------

  // Run Underscore.js in *noConflict* mode, returning the `_` variable to its
  // previous owner. Returns a reference to the Underscore object.
  _.noConflict = function() {
    root._ = previousUnderscore;
    return this;
  };

  // Keep the identity function around for default iterators.
  _.identity = function(value) {
    return value;
  };

  // Run a function **n** times.
  _.times = function(n, iterator, context) {
    for (var i = 0; i < n; i++) iterator.call(context, i);
  };

  // Return a random integer between min and max (inclusive).
  _.random = function(min, max) {
    if (max == null) {
      max = min;
      min = 0;
    }
    return min + (0 | Math.random() * (max - min + 1));
  };

  // List of HTML entities for escaping.
  var entityMap = {
    escape: {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#x27;',
      '/': '&#x2F;'
    }
  };
  entityMap.unescape = _.invert(entityMap.escape);

  // Regexes containing the keys and values listed immediately above.
  var entityRegexes = {
    escape:   new RegExp('[' + _.keys(entityMap.escape).join('') + ']', 'g'),
    unescape: new RegExp('(' + _.keys(entityMap.unescape).join('|') + ')', 'g')
  };

  // Functions for escaping and unescaping strings to/from HTML interpolation.
  _.each(['escape', 'unescape'], function(method) {
    _[method] = function(string) {
      if (string == null) return '';
      return ('' + string).replace(entityRegexes[method], function(match) {
        return entityMap[method][match];
      });
    };
  });

  // If the value of the named property is a function then invoke it;
  // otherwise, return it.
  _.result = function(object, property) {
    if (object == null) return null;
    var value = object[property];
    return _.isFunction(value) ? value.call(object) : value;
  };

  // Add your own custom functions to the Underscore object.
  _.mixin = function(obj) {
    each(_.functions(obj), function(name){
      var func = _[name] = obj[name];
      _.prototype[name] = function() {
        var args = [this._wrapped];
        push.apply(args, arguments);
        return result.call(this, func.apply(_, args));
      };
    });
  };

  // Generate a unique integer id (unique within the entire client session).
  // Useful for temporary DOM ids.
  var idCounter = 0;
  _.uniqueId = function(prefix) {
    var id = idCounter++;
    return prefix ? prefix + id : id;
  };

  // By default, Underscore uses ERB-style template delimiters, change the
  // following template settings to use alternative delimiters.
  _.templateSettings = {
    evaluate    : /<%([\s\S]+?)%>/g,
    interpolate : /<%=([\s\S]+?)%>/g,
    escape      : /<%-([\s\S]+?)%>/g
  };

  // When customizing `templateSettings`, if you don't want to define an
  // interpolation, evaluation or escaping regex, we need one that is
  // guaranteed not to match.
  var noMatch = /(.)^/;

  // Certain characters need to be escaped so that they can be put into a
  // string literal.
  var escapes = {
    "'":      "'",
    '\\':     '\\',
    '\r':     'r',
    '\n':     'n',
    '\t':     't',
    '\u2028': 'u2028',
    '\u2029': 'u2029'
  };

  var escaper = /\\|'|\r|\n|\t|\u2028|\u2029/g;

  // JavaScript micro-templating, similar to John Resig's implementation.
  // Underscore templating handles arbitrary delimiters, preserves whitespace,
  // and correctly escapes quotes within interpolated code.
  _.template = function(text, data, settings) {
    settings = _.defaults({}, settings, _.templateSettings);

    // Combine delimiters into one regular expression via alternation.
    var matcher = new RegExp([
      (settings.escape || noMatch).source,
      (settings.interpolate || noMatch).source,
      (settings.evaluate || noMatch).source
    ].join('|') + '|$', 'g');

    // Compile the template source, escaping string literals appropriately.
    var index = 0;
    var source = "__p+='";
    text.replace(matcher, function(match, escape, interpolate, evaluate, offset) {
      source += text.slice(index, offset)
        .replace(escaper, function(match) { return '\\' + escapes[match]; });
      source +=
        escape ? "'+\n((__t=(" + escape + "))==null?'':_.escape(__t))+\n'" :
        interpolate ? "'+\n((__t=(" + interpolate + "))==null?'':__t)+\n'" :
        evaluate ? "';\n" + evaluate + "\n__p+='" : '';
      index = offset + match.length;
    });
    source += "';\n";

    // If a variable is not specified, place data values in local scope.
    if (!settings.variable) source = 'with(obj||{}){\n' + source + '}\n';

    source = "var __t,__p='',__j=Array.prototype.join," +
      "print=function(){__p+=__j.call(arguments,'');};\n" +
      source + "return __p;\n";

    try {
      var render = new Function(settings.variable || 'obj', '_', source);
    } catch (e) {
      e.source = source;
      throw e;
    }

    if (data) return render(data, _);
    var template = function(data) {
      return render.call(this, data, _);
    };

    // Provide the compiled function source as a convenience for precompilation.
    template.source = 'function(' + (settings.variable || 'obj') + '){\n' + source + '}';

    return template;
  };

  // Add a "chain" function, which will delegate to the wrapper.
  _.chain = function(obj) {
    return _(obj).chain();
  };

  // OOP
  // ---------------
  // If Underscore is called as a function, it returns a wrapped object that
  // can be used OO-style. This wrapper holds altered versions of all the
  // underscore functions. Wrapped objects may be chained.

  // Helper function to continue chaining intermediate results.
  var result = function(obj) {
    return this._chain ? _(obj).chain() : obj;
  };

  // Add all of the Underscore functions to the wrapper object.
  _.mixin(_);

  // Add all mutator Array functions to the wrapper.
  each(['pop', 'push', 'reverse', 'shift', 'sort', 'splice', 'unshift'], function(name) {
    var method = ArrayProto[name];
    _.prototype[name] = function() {
      var obj = this._wrapped;
      method.apply(obj, arguments);
      if ((name == 'shift' || name == 'splice') && obj.length === 0) delete obj[0];
      return result.call(this, obj);
    };
  });

  // Add all accessor Array functions to the wrapper.
  each(['concat', 'join', 'slice'], function(name) {
    var method = ArrayProto[name];
    _.prototype[name] = function() {
      return result.call(this, method.apply(this._wrapped, arguments));
    };
  });

  _.extend(_.prototype, {

    // Start chaining a wrapped Underscore object.
    chain: function() {
      this._chain = true;
      return this;
    },

    // Extracts the result from a wrapped and chained object.
    value: function() {
      return this._wrapped;
    }

  });

}).call(this);

define("underscore", (function (global) {
    return function () {
        var ret, fn;
        return ret || global._;
    };
}(this)));

//     Backbone.js 1.0.0

//     (c) 2010-2013 Jeremy Ashkenas, DocumentCloud Inc.
//     Backbone may be freely distributed under the MIT license.
//     For all details and documentation:
//     http://backbonejs.org

(function(){

  // Initial Setup
  // -------------

  // Save a reference to the global object (`window` in the browser, `exports`
  // on the server).
  var root = this;

  // Save the previous value of the `Backbone` variable, so that it can be
  // restored later on, if `noConflict` is used.
  var previousBackbone = root.Backbone;

  // Create local references to array methods we'll want to use later.
  var array = [];
  var push = array.push;
  var slice = array.slice;
  var splice = array.splice;

  // The top-level namespace. All public Backbone classes and modules will
  // be attached to this. Exported for both the browser and the server.
  var Backbone;
  if (typeof exports !== 'undefined') {
    Backbone = exports;
  } else {
    Backbone = root.Backbone = {};
  }

  // Current version of the library. Keep in sync with `package.json`.
  Backbone.VERSION = '1.0.0';

  // Require Underscore, if we're on the server, and it's not already present.
  var _ = root._;
  if (!_ && (typeof require !== 'undefined')) _ = require('underscore');

  // For Backbone's purposes, jQuery, Zepto, Ender, or My Library (kidding) owns
  // the `$` variable.
  Backbone.$ = root.jQuery || root.Zepto || root.ender || root.$;

  // Runs Backbone.js in *noConflict* mode, returning the `Backbone` variable
  // to its previous owner. Returns a reference to this Backbone object.
  Backbone.noConflict = function() {
    root.Backbone = previousBackbone;
    return this;
  };

  // Turn on `emulateHTTP` to support legacy HTTP servers. Setting this option
  // will fake `"PUT"` and `"DELETE"` requests via the `_method` parameter and
  // set a `X-Http-Method-Override` header.
  Backbone.emulateHTTP = false;

  // Turn on `emulateJSON` to support legacy servers that can't deal with direct
  // `application/json` requests ... will encode the body as
  // `application/x-www-form-urlencoded` instead and will send the model in a
  // form param named `model`.
  Backbone.emulateJSON = false;

  // Backbone.Events
  // ---------------

  // A module that can be mixed in to *any object* in order to provide it with
  // custom events. You may bind with `on` or remove with `off` callback
  // functions to an event; `trigger`-ing an event fires all callbacks in
  // succession.
  //
  //     var object = {};
  //     _.extend(object, Backbone.Events);
  //     object.on('expand', function(){ alert('expanded'); });
  //     object.trigger('expand');
  //
  var Events = Backbone.Events = {

    // Bind an event to a `callback` function. Passing `"all"` will bind
    // the callback to all events fired.
    on: function(name, callback, context) {
      if (!eventsApi(this, 'on', name, [callback, context]) || !callback) return this;
      this._events || (this._events = {});
      var events = this._events[name] || (this._events[name] = []);
      events.push({callback: callback, context: context, ctx: context || this});
      return this;
    },

    // Bind an event to only be triggered a single time. After the first time
    // the callback is invoked, it will be removed.
    once: function(name, callback, context) {
      if (!eventsApi(this, 'once', name, [callback, context]) || !callback) return this;
      var self = this;
      var once = _.once(function() {
        self.off(name, once);
        callback.apply(this, arguments);
      });
      once._callback = callback;
      return this.on(name, once, context);
    },

    // Remove one or many callbacks. If `context` is null, removes all
    // callbacks with that function. If `callback` is null, removes all
    // callbacks for the event. If `name` is null, removes all bound
    // callbacks for all events.
    off: function(name, callback, context) {
      var retain, ev, events, names, i, l, j, k;
      if (!this._events || !eventsApi(this, 'off', name, [callback, context])) return this;
      if (!name && !callback && !context) {
        this._events = {};
        return this;
      }

      names = name ? [name] : _.keys(this._events);
      for (i = 0, l = names.length; i < l; i++) {
        name = names[i];
        if (events = this._events[name]) {
          this._events[name] = retain = [];
          if (callback || context) {
            for (j = 0, k = events.length; j < k; j++) {
              ev = events[j];
              if ((callback && callback !== ev.callback && callback !== ev.callback._callback) ||
                  (context && context !== ev.context)) {
                retain.push(ev);
              }
            }
          }
          if (!retain.length) delete this._events[name];
        }
      }

      return this;
    },

    // Trigger one or many events, firing all bound callbacks. Callbacks are
    // passed the same arguments as `trigger` is, apart from the event name
    // (unless you're listening on `"all"`, which will cause your callback to
    // receive the true name of the event as the first argument).
    trigger: function(name) {
      if (!this._events) return this;
      var args = slice.call(arguments, 1);
      if (!eventsApi(this, 'trigger', name, args)) return this;
      var events = this._events[name];
      var allEvents = this._events.all;
      if (events) triggerEvents(events, args);
      if (allEvents) triggerEvents(allEvents, arguments);
      return this;
    },

    // Tell this object to stop listening to either specific events ... or
    // to every object it's currently listening to.
    stopListening: function(obj, name, callback) {
      var listeners = this._listeners;
      if (!listeners) return this;
      var deleteListener = !name && !callback;
      if (typeof name === 'object') callback = this;
      if (obj) (listeners = {})[obj._listenerId] = obj;
      for (var id in listeners) {
        listeners[id].off(name, callback, this);
        if (deleteListener) delete this._listeners[id];
      }
      return this;
    }

  };

  // Regular expression used to split event strings.
  var eventSplitter = /\s+/;

  // Implement fancy features of the Events API such as multiple event
  // names `"change blur"` and jQuery-style event maps `{change: action}`
  // in terms of the existing API.
  var eventsApi = function(obj, action, name, rest) {
    if (!name) return true;

    // Handle event maps.
    if (typeof name === 'object') {
      for (var key in name) {
        obj[action].apply(obj, [key, name[key]].concat(rest));
      }
      return false;
    }

    // Handle space separated event names.
    if (eventSplitter.test(name)) {
      var names = name.split(eventSplitter);
      for (var i = 0, l = names.length; i < l; i++) {
        obj[action].apply(obj, [names[i]].concat(rest));
      }
      return false;
    }

    return true;
  };

  // A difficult-to-believe, but optimized internal dispatch function for
  // triggering events. Tries to keep the usual cases speedy (most internal
  // Backbone events have 3 arguments).
  var triggerEvents = function(events, args) {
    var ev, i = -1, l = events.length, a1 = args[0], a2 = args[1], a3 = args[2];
    switch (args.length) {
      case 0: while (++i < l) (ev = events[i]).callback.call(ev.ctx); return;
      case 1: while (++i < l) (ev = events[i]).callback.call(ev.ctx, a1); return;
      case 2: while (++i < l) (ev = events[i]).callback.call(ev.ctx, a1, a2); return;
      case 3: while (++i < l) (ev = events[i]).callback.call(ev.ctx, a1, a2, a3); return;
      default: while (++i < l) (ev = events[i]).callback.apply(ev.ctx, args);
    }
  };

  var listenMethods = {listenTo: 'on', listenToOnce: 'once'};

  // Inversion-of-control versions of `on` and `once`. Tell *this* object to
  // listen to an event in another object ... keeping track of what it's
  // listening to.
  _.each(listenMethods, function(implementation, method) {
    Events[method] = function(obj, name, callback) {
      var listeners = this._listeners || (this._listeners = {});
      var id = obj._listenerId || (obj._listenerId = _.uniqueId('l'));
      listeners[id] = obj;
      if (typeof name === 'object') callback = this;
      obj[implementation](name, callback, this);
      return this;
    };
  });

  // Aliases for backwards compatibility.
  Events.bind   = Events.on;
  Events.unbind = Events.off;

  // Allow the `Backbone` object to serve as a global event bus, for folks who
  // want global "pubsub" in a convenient place.
  _.extend(Backbone, Events);

  // Backbone.Model
  // --------------

  // Backbone **Models** are the basic data object in the framework --
  // frequently representing a row in a table in a database on your server.
  // A discrete chunk of data and a bunch of useful, related methods for
  // performing computations and transformations on that data.

  // Create a new model with the specified attributes. A client id (`cid`)
  // is automatically generated and assigned for you.
  var Model = Backbone.Model = function(attributes, options) {
    var defaults;
    var attrs = attributes || {};
    options || (options = {});
    this.cid = _.uniqueId('c');
    this.attributes = {};
    _.extend(this, _.pick(options, modelOptions));
    if (options.parse) attrs = this.parse(attrs, options) || {};
    if (defaults = _.result(this, 'defaults')) {
      attrs = _.defaults({}, attrs, defaults);
    }
    this.set(attrs, options);
    this.changed = {};
    this.initialize.apply(this, arguments);
  };

  // A list of options to be attached directly to the model, if provided.
  var modelOptions = ['url', 'urlRoot', 'collection'];

  // Attach all inheritable methods to the Model prototype.
  _.extend(Model.prototype, Events, {

    // A hash of attributes whose current and previous value differ.
    changed: null,

    // The value returned during the last failed validation.
    validationError: null,

    // The default name for the JSON `id` attribute is `"id"`. MongoDB and
    // CouchDB users may want to set this to `"_id"`.
    idAttribute: 'id',

    // Initialize is an empty function by default. Override it with your own
    // initialization logic.
    initialize: function(){},

    // Return a copy of the model's `attributes` object.
    toJSON: function(options) {
      return _.clone(this.attributes);
    },

    // Proxy `Backbone.sync` by default -- but override this if you need
    // custom syncing semantics for *this* particular model.
    sync: function() {
      return Backbone.sync.apply(this, arguments);
    },

    // Get the value of an attribute.
    get: function(attr) {
      return this.attributes[attr];
    },

    // Get the HTML-escaped value of an attribute.
    escape: function(attr) {
      return _.escape(this.get(attr));
    },

    // Returns `true` if the attribute contains a value that is not null
    // or undefined.
    has: function(attr) {
      return this.get(attr) != null;
    },

    // Set a hash of model attributes on the object, firing `"change"`. This is
    // the core primitive operation of a model, updating the data and notifying
    // anyone who needs to know about the change in state. The heart of the beast.
    set: function(key, val, options) {
      var attr, attrs, unset, changes, silent, changing, prev, current;
      if (key == null) return this;

      // Handle both `"key", value` and `{key: value}` -style arguments.
      if (typeof key === 'object') {
        attrs = key;
        options = val;
      } else {
        (attrs = {})[key] = val;
      }

      options || (options = {});

      // Run validation.
      if (!this._validate(attrs, options)) return false;

      // Extract attributes and options.
      unset           = options.unset;
      silent          = options.silent;
      changes         = [];
      changing        = this._changing;
      this._changing  = true;

      if (!changing) {
        this._previousAttributes = _.clone(this.attributes);
        this.changed = {};
      }
      current = this.attributes, prev = this._previousAttributes;

      // Check for changes of `id`.
      if (this.idAttribute in attrs) this.id = attrs[this.idAttribute];

      // For each `set` attribute, update or delete the current value.
      for (attr in attrs) {
        val = attrs[attr];
        if (!_.isEqual(current[attr], val)) changes.push(attr);
        if (!_.isEqual(prev[attr], val)) {
          this.changed[attr] = val;
        } else {
          delete this.changed[attr];
        }
        unset ? delete current[attr] : current[attr] = val;
      }

      // Trigger all relevant attribute changes.
      if (!silent) {
        if (changes.length) this._pending = true;
        for (var i = 0, l = changes.length; i < l; i++) {
          this.trigger('change:' + changes[i], this, current[changes[i]], options);
        }
      }

      // You might be wondering why there's a `while` loop here. Changes can
      // be recursively nested within `"change"` events.
      if (changing) return this;
      if (!silent) {
        while (this._pending) {
          this._pending = false;
          this.trigger('change', this, options);
        }
      }
      this._pending = false;
      this._changing = false;
      return this;
    },

    // Remove an attribute from the model, firing `"change"`. `unset` is a noop
    // if the attribute doesn't exist.
    unset: function(attr, options) {
      return this.set(attr, void 0, _.extend({}, options, {unset: true}));
    },

    // Clear all attributes on the model, firing `"change"`.
    clear: function(options) {
      var attrs = {};
      for (var key in this.attributes) attrs[key] = void 0;
      return this.set(attrs, _.extend({}, options, {unset: true}));
    },

    // Determine if the model has changed since the last `"change"` event.
    // If you specify an attribute name, determine if that attribute has changed.
    hasChanged: function(attr) {
      if (attr == null) return !_.isEmpty(this.changed);
      return _.has(this.changed, attr);
    },

    // Return an object containing all the attributes that have changed, or
    // false if there are no changed attributes. Useful for determining what
    // parts of a view need to be updated and/or what attributes need to be
    // persisted to the server. Unset attributes will be set to undefined.
    // You can also pass an attributes object to diff against the model,
    // determining if there *would be* a change.
    changedAttributes: function(diff) {
      if (!diff) return this.hasChanged() ? _.clone(this.changed) : false;
      var val, changed = false;
      var old = this._changing ? this._previousAttributes : this.attributes;
      for (var attr in diff) {
        if (_.isEqual(old[attr], (val = diff[attr]))) continue;
        (changed || (changed = {}))[attr] = val;
      }
      return changed;
    },

    // Get the previous value of an attribute, recorded at the time the last
    // `"change"` event was fired.
    previous: function(attr) {
      if (attr == null || !this._previousAttributes) return null;
      return this._previousAttributes[attr];
    },

    // Get all of the attributes of the model at the time of the previous
    // `"change"` event.
    previousAttributes: function() {
      return _.clone(this._previousAttributes);
    },

    // Fetch the model from the server. If the server's representation of the
    // model differs from its current attributes, they will be overridden,
    // triggering a `"change"` event.
    fetch: function(options) {
      options = options ? _.clone(options) : {};
      if (options.parse === void 0) options.parse = true;
      var model = this;
      var success = options.success;
      options.success = function(resp) {
        if (!model.set(model.parse(resp, options), options)) return false;
        if (success) success(model, resp, options);
        model.trigger('sync', model, resp, options);
      };
      wrapError(this, options);
      return this.sync('read', this, options);
    },

    // Set a hash of model attributes, and sync the model to the server.
    // If the server returns an attributes hash that differs, the model's
    // state will be `set` again.
    save: function(key, val, options) {
      var attrs, method, xhr, attributes = this.attributes;

      // Handle both `"key", value` and `{key: value}` -style arguments.
      if (key == null || typeof key === 'object') {
        attrs = key;
        options = val;
      } else {
        (attrs = {})[key] = val;
      }

      // If we're not waiting and attributes exist, save acts as `set(attr).save(null, opts)`.
      if (attrs && (!options || !options.wait) && !this.set(attrs, options)) return false;

      options = _.extend({validate: true}, options);

      // Do not persist invalid models.
      if (!this._validate(attrs, options)) return false;

      // Set temporary attributes if `{wait: true}`.
      if (attrs && options.wait) {
        this.attributes = _.extend({}, attributes, attrs);
      }

      // After a successful server-side save, the client is (optionally)
      // updated with the server-side state.
      if (options.parse === void 0) options.parse = true;
      var model = this;
      var success = options.success;
      options.success = function(resp) {
        // Ensure attributes are restored during synchronous saves.
        model.attributes = attributes;
        var serverAttrs = model.parse(resp, options);
        if (options.wait) serverAttrs = _.extend(attrs || {}, serverAttrs);
        if (_.isObject(serverAttrs) && !model.set(serverAttrs, options)) {
          return false;
        }
        if (success) success(model, resp, options);
        model.trigger('sync', model, resp, options);
      };
      wrapError(this, options);

      method = this.isNew() ? 'create' : (options.patch ? 'patch' : 'update');
      if (method === 'patch') options.attrs = attrs;
      xhr = this.sync(method, this, options);

      // Restore attributes.
      if (attrs && options.wait) this.attributes = attributes;

      return xhr;
    },

    // Destroy this model on the server if it was already persisted.
    // Optimistically removes the model from its collection, if it has one.
    // If `wait: true` is passed, waits for the server to respond before removal.
    destroy: function(options) {
      options = options ? _.clone(options) : {};
      var model = this;
      var success = options.success;

      var destroy = function() {
        model.trigger('destroy', model, model.collection, options);
      };

      options.success = function(resp) {
        if (options.wait || model.isNew()) destroy();
        if (success) success(model, resp, options);
        if (!model.isNew()) model.trigger('sync', model, resp, options);
      };

      if (this.isNew()) {
        options.success();
        return false;
      }
      wrapError(this, options);

      var xhr = this.sync('delete', this, options);
      if (!options.wait) destroy();
      return xhr;
    },

    // Default URL for the model's representation on the server -- if you're
    // using Backbone's restful methods, override this to change the endpoint
    // that will be called.
    url: function() {
      var base = _.result(this, 'urlRoot') || _.result(this.collection, 'url') || urlError();
      if (this.isNew()) return base;
      return base + (base.charAt(base.length - 1) === '/' ? '' : '/') + encodeURIComponent(this.id);
    },

    // **parse** converts a response into the hash of attributes to be `set` on
    // the model. The default implementation is just to pass the response along.
    parse: function(resp, options) {
      return resp;
    },

    // Create a new model with identical attributes to this one.
    clone: function() {
      return new this.constructor(this.attributes);
    },

    // A model is new if it has never been saved to the server, and lacks an id.
    isNew: function() {
      return this.id == null;
    },

    // Check if the model is currently in a valid state.
    isValid: function(options) {
      return this._validate({}, _.extend(options || {}, { validate: true }));
    },

    // Run validation against the next complete set of model attributes,
    // returning `true` if all is well. Otherwise, fire an `"invalid"` event.
    _validate: function(attrs, options) {
      if (!options.validate || !this.validate) return true;
      attrs = _.extend({}, this.attributes, attrs);
      var error = this.validationError = this.validate(attrs, options) || null;
      if (!error) return true;
      this.trigger('invalid', this, error, _.extend(options || {}, {validationError: error}));
      return false;
    }

  });

  // Underscore methods that we want to implement on the Model.
  var modelMethods = ['keys', 'values', 'pairs', 'invert', 'pick', 'omit'];

  // Mix in each Underscore method as a proxy to `Model#attributes`.
  _.each(modelMethods, function(method) {
    Model.prototype[method] = function() {
      var args = slice.call(arguments);
      args.unshift(this.attributes);
      return _[method].apply(_, args);
    };
  });

  // Backbone.Collection
  // -------------------

  // If models tend to represent a single row of data, a Backbone Collection is
  // more analagous to a table full of data ... or a small slice or page of that
  // table, or a collection of rows that belong together for a particular reason
  // -- all of the messages in this particular folder, all of the documents
  // belonging to this particular author, and so on. Collections maintain
  // indexes of their models, both in order, and for lookup by `id`.

  // Create a new **Collection**, perhaps to contain a specific type of `model`.
  // If a `comparator` is specified, the Collection will maintain
  // its models in sort order, as they're added and removed.
  var Collection = Backbone.Collection = function(models, options) {
    options || (options = {});
    if (options.url) this.url = options.url;
    if (options.model) this.model = options.model;
    if (options.comparator !== void 0) this.comparator = options.comparator;
    this._reset();
    this.initialize.apply(this, arguments);
    if (models) this.reset(models, _.extend({silent: true}, options));
  };

  // Default options for `Collection#set`.
  var setOptions = {add: true, remove: true, merge: true};
  var addOptions = {add: true, merge: false, remove: false};

  // Define the Collection's inheritable methods.
  _.extend(Collection.prototype, Events, {

    // The default model for a collection is just a **Backbone.Model**.
    // This should be overridden in most cases.
    model: Model,

    // Initialize is an empty function by default. Override it with your own
    // initialization logic.
    initialize: function(){},

    // The JSON representation of a Collection is an array of the
    // models' attributes.
    toJSON: function(options) {
      return this.map(function(model){ return model.toJSON(options); });
    },

    // Proxy `Backbone.sync` by default.
    sync: function() {
      return Backbone.sync.apply(this, arguments);
    },

    // Add a model, or list of models to the set.
    add: function(models, options) {
      return this.set(models, _.defaults(options || {}, addOptions));
    },

    // Remove a model, or a list of models from the set.
    remove: function(models, options) {
      models = _.isArray(models) ? models.slice() : [models];
      options || (options = {});
      var i, l, index, model;
      for (i = 0, l = models.length; i < l; i++) {
        model = this.get(models[i]);
        if (!model) continue;
        delete this._byId[model.id];
        delete this._byId[model.cid];
        index = this.indexOf(model);
        this.models.splice(index, 1);
        this.length--;
        if (!options.silent) {
          options.index = index;
          model.trigger('remove', model, this, options);
        }
        this._removeReference(model);
      }
      return this;
    },

    // Update a collection by `set`-ing a new list of models, adding new ones,
    // removing models that are no longer present, and merging models that
    // already exist in the collection, as necessary. Similar to **Model#set**,
    // the core operation for updating the data contained by the collection.
    set: function(models, options) {
      options = _.defaults(options || {}, setOptions);
      if (options.parse) models = this.parse(models, options);
      if (!_.isArray(models)) models = models ? [models] : [];
      var i, l, model, attrs, existing, sort;
      var at = options.at;
      var sortable = this.comparator && (at == null) && options.sort !== false;
      var sortAttr = _.isString(this.comparator) ? this.comparator : null;
      var toAdd = [], toRemove = [], modelMap = {};

      // Turn bare objects into model references, and prevent invalid models
      // from being added.
      for (i = 0, l = models.length; i < l; i++) {
        if (!(model = this._prepareModel(models[i], options))) continue;

        // If a duplicate is found, prevent it from being added and
        // optionally merge it into the existing model.
        if (existing = this.get(model)) {
          if (options.remove) modelMap[existing.cid] = true;
          if (options.merge) {
            existing.set(model.attributes, options);
            if (sortable && !sort && existing.hasChanged(sortAttr)) sort = true;
          }

        // This is a new model, push it to the `toAdd` list.
        } else if (options.add) {
          toAdd.push(model);

          // Listen to added models' events, and index models for lookup by
          // `id` and by `cid`.
          model.on('all', this._onModelEvent, this);
          this._byId[model.cid] = model;
          if (model.id != null) this._byId[model.id] = model;
        }
      }

      // Remove nonexistent models if appropriate.
      if (options.remove) {
        for (i = 0, l = this.length; i < l; ++i) {
          if (!modelMap[(model = this.models[i]).cid]) toRemove.push(model);
        }
        if (toRemove.length) this.remove(toRemove, options);
      }

      // See if sorting is needed, update `length` and splice in new models.
      if (toAdd.length) {
        if (sortable) sort = true;
        this.length += toAdd.length;
        if (at != null) {
          splice.apply(this.models, [at, 0].concat(toAdd));
        } else {
          push.apply(this.models, toAdd);
        }
      }

      // Silently sort the collection if appropriate.
      if (sort) this.sort({silent: true});

      if (options.silent) return this;

      // Trigger `add` events.
      for (i = 0, l = toAdd.length; i < l; i++) {
        (model = toAdd[i]).trigger('add', model, this, options);
      }

      // Trigger `sort` if the collection was sorted.
      if (sort) this.trigger('sort', this, options);
      return this;
    },

    // When you have more items than you want to add or remove individually,
    // you can reset the entire set with a new list of models, without firing
    // any granular `add` or `remove` events. Fires `reset` when finished.
    // Useful for bulk operations and optimizations.
    reset: function(models, options) {
      options || (options = {});
      for (var i = 0, l = this.models.length; i < l; i++) {
        this._removeReference(this.models[i]);
      }
      options.previousModels = this.models;
      this._reset();
      this.add(models, _.extend({silent: true}, options));
      if (!options.silent) this.trigger('reset', this, options);
      return this;
    },

    // Add a model to the end of the collection.
    push: function(model, options) {
      model = this._prepareModel(model, options);
      this.add(model, _.extend({at: this.length}, options));
      return model;
    },

    // Remove a model from the end of the collection.
    pop: function(options) {
      var model = this.at(this.length - 1);
      this.remove(model, options);
      return model;
    },

    // Add a model to the beginning of the collection.
    unshift: function(model, options) {
      model = this._prepareModel(model, options);
      this.add(model, _.extend({at: 0}, options));
      return model;
    },

    // Remove a model from the beginning of the collection.
    shift: function(options) {
      var model = this.at(0);
      this.remove(model, options);
      return model;
    },

    // Slice out a sub-array of models from the collection.
    slice: function(begin, end) {
      return this.models.slice(begin, end);
    },

    // Get a model from the set by id.
    get: function(obj) {
      if (obj == null) return void 0;
      return this._byId[obj.id != null ? obj.id : obj.cid || obj];
    },

    // Get the model at the given index.
    at: function(index) {
      return this.models[index];
    },

    // Return models with matching attributes. Useful for simple cases of
    // `filter`.
    where: function(attrs, first) {
      if (_.isEmpty(attrs)) return first ? void 0 : [];
      return this[first ? 'find' : 'filter'](function(model) {
        for (var key in attrs) {
          if (attrs[key] !== model.get(key)) return false;
        }
        return true;
      });
    },

    // Return the first model with matching attributes. Useful for simple cases
    // of `find`.
    findWhere: function(attrs) {
      return this.where(attrs, true);
    },

    // Force the collection to re-sort itself. You don't need to call this under
    // normal circumstances, as the set will maintain sort order as each item
    // is added.
    sort: function(options) {
      if (!this.comparator) throw new Error('Cannot sort a set without a comparator');
      options || (options = {});

      // Run sort based on type of `comparator`.
      if (_.isString(this.comparator) || this.comparator.length === 1) {
        this.models = this.sortBy(this.comparator, this);
      } else {
        this.models.sort(_.bind(this.comparator, this));
      }

      if (!options.silent) this.trigger('sort', this, options);
      return this;
    },

    // Figure out the smallest index at which a model should be inserted so as
    // to maintain order.
    sortedIndex: function(model, value, context) {
      value || (value = this.comparator);
      var iterator = _.isFunction(value) ? value : function(model) {
        return model.get(value);
      };
      return _.sortedIndex(this.models, model, iterator, context);
    },

    // Pluck an attribute from each model in the collection.
    pluck: function(attr) {
      return _.invoke(this.models, 'get', attr);
    },

    // Fetch the default set of models for this collection, resetting the
    // collection when they arrive. If `reset: true` is passed, the response
    // data will be passed through the `reset` method instead of `set`.
    fetch: function(options) {
      options = options ? _.clone(options) : {};
      if (options.parse === void 0) options.parse = true;
      var success = options.success;
      var collection = this;
      options.success = function(resp) {
        var method = options.reset ? 'reset' : 'set';
        collection[method](resp, options);
        if (success) success(collection, resp, options);
        collection.trigger('sync', collection, resp, options);
      };
      wrapError(this, options);
      return this.sync('read', this, options);
    },

    // Create a new instance of a model in this collection. Add the model to the
    // collection immediately, unless `wait: true` is passed, in which case we
    // wait for the server to agree.
    create: function(model, options) {
      options = options ? _.clone(options) : {};
      if (!(model = this._prepareModel(model, options))) return false;
      if (!options.wait) this.add(model, options);
      var collection = this;
      var success = options.success;
      options.success = function(resp) {
        if (options.wait) collection.add(model, options);
        if (success) success(model, resp, options);
      };
      model.save(null, options);
      return model;
    },

    // **parse** converts a response into a list of models to be added to the
    // collection. The default implementation is just to pass it through.
    parse: function(resp, options) {
      return resp;
    },

    // Create a new collection with an identical list of models as this one.
    clone: function() {
      return new this.constructor(this.models);
    },

    // Private method to reset all internal state. Called when the collection
    // is first initialized or reset.
    _reset: function() {
      this.length = 0;
      this.models = [];
      this._byId  = {};
    },

    // Prepare a hash of attributes (or other model) to be added to this
    // collection.
    _prepareModel: function(attrs, options) {
      if (attrs instanceof Model) {
        if (!attrs.collection) attrs.collection = this;
        return attrs;
      }
      options || (options = {});
      options.collection = this;
      var model = new this.model(attrs, options);
      if (!model._validate(attrs, options)) {
        this.trigger('invalid', this, attrs, options);
        return false;
      }
      return model;
    },

    // Internal method to sever a model's ties to a collection.
    _removeReference: function(model) {
      if (this === model.collection) delete model.collection;
      model.off('all', this._onModelEvent, this);
    },

    // Internal method called every time a model in the set fires an event.
    // Sets need to update their indexes when models change ids. All other
    // events simply proxy through. "add" and "remove" events that originate
    // in other collections are ignored.
    _onModelEvent: function(event, model, collection, options) {
      if ((event === 'add' || event === 'remove') && collection !== this) return;
      if (event === 'destroy') this.remove(model, options);
      if (model && event === 'change:' + model.idAttribute) {
        delete this._byId[model.previous(model.idAttribute)];
        if (model.id != null) this._byId[model.id] = model;
      }
      this.trigger.apply(this, arguments);
    }

  });

  // Underscore methods that we want to implement on the Collection.
  // 90% of the core usefulness of Backbone Collections is actually implemented
  // right here:
  var methods = ['forEach', 'each', 'map', 'collect', 'reduce', 'foldl',
    'inject', 'reduceRight', 'foldr', 'find', 'detect', 'filter', 'select',
    'reject', 'every', 'all', 'some', 'any', 'include', 'contains', 'invoke',
    'max', 'min', 'toArray', 'size', 'first', 'head', 'take', 'initial', 'rest',
    'tail', 'drop', 'last', 'without', 'indexOf', 'shuffle', 'lastIndexOf',
    'isEmpty', 'chain'];

  // Mix in each Underscore method as a proxy to `Collection#models`.
  _.each(methods, function(method) {
    Collection.prototype[method] = function() {
      var args = slice.call(arguments);
      args.unshift(this.models);
      return _[method].apply(_, args);
    };
  });

  // Underscore methods that take a property name as an argument.
  var attributeMethods = ['groupBy', 'countBy', 'sortBy'];

  // Use attributes instead of properties.
  _.each(attributeMethods, function(method) {
    Collection.prototype[method] = function(value, context) {
      var iterator = _.isFunction(value) ? value : function(model) {
        return model.get(value);
      };
      return _[method](this.models, iterator, context);
    };
  });

  // Backbone.View
  // -------------

  // Backbone Views are almost more convention than they are actual code. A View
  // is simply a JavaScript object that represents a logical chunk of UI in the
  // DOM. This might be a single item, an entire list, a sidebar or panel, or
  // even the surrounding frame which wraps your whole app. Defining a chunk of
  // UI as a **View** allows you to define your DOM events declaratively, without
  // having to worry about render order ... and makes it easy for the view to
  // react to specific changes in the state of your models.

  // Creating a Backbone.View creates its initial element outside of the DOM,
  // if an existing element is not provided...
  var View = Backbone.View = function(options) {
    this.cid = _.uniqueId('view');
    this._configure(options || {});
    this._ensureElement();
    this.initialize.apply(this, arguments);
    this.delegateEvents();
  };

  // Cached regex to split keys for `delegate`.
  var delegateEventSplitter = /^(\S+)\s*(.*)$/;

  // List of view options to be merged as properties.
  var viewOptions = ['model', 'collection', 'el', 'id', 'attributes', 'className', 'tagName', 'events'];

  // Set up all inheritable **Backbone.View** properties and methods.
  _.extend(View.prototype, Events, {

    // The default `tagName` of a View's element is `"div"`.
    tagName: 'div',

    // jQuery delegate for element lookup, scoped to DOM elements within the
    // current view. This should be prefered to global lookups where possible.
    $: function(selector) {
      return this.$el.find(selector);
    },

    // Initialize is an empty function by default. Override it with your own
    // initialization logic.
    initialize: function(){},

    // **render** is the core function that your view should override, in order
    // to populate its element (`this.el`), with the appropriate HTML. The
    // convention is for **render** to always return `this`.
    render: function() {
      return this;
    },

    // Remove this view by taking the element out of the DOM, and removing any
    // applicable Backbone.Events listeners.
    remove: function() {
      this.$el.remove();
      this.stopListening();
      return this;
    },

    // Change the view's element (`this.el` property), including event
    // re-delegation.
    setElement: function(element, delegate) {
      if (this.$el) this.undelegateEvents();
      this.$el = element instanceof Backbone.$ ? element : Backbone.$(element);
      this.el = this.$el[0];
      if (delegate !== false) this.delegateEvents();
      return this;
    },

    // Set callbacks, where `this.events` is a hash of
    //
    // *{"event selector": "callback"}*
    //
    //     {
    //       'mousedown .title':  'edit',
    //       'click .button':     'save'
    //       'click .open':       function(e) { ... }
    //     }
    //
    // pairs. Callbacks will be bound to the view, with `this` set properly.
    // Uses event delegation for efficiency.
    // Omitting the selector binds the event to `this.el`.
    // This only works for delegate-able events: not `focus`, `blur`, and
    // not `change`, `submit`, and `reset` in Internet Explorer.
    delegateEvents: function(events) {
      if (!(events || (events = _.result(this, 'events')))) return this;
      this.undelegateEvents();
      for (var key in events) {
        var method = events[key];
        if (!_.isFunction(method)) method = this[events[key]];
        if (!method) continue;

        var match = key.match(delegateEventSplitter);
        var eventName = match[1], selector = match[2];
        method = _.bind(method, this);
        eventName += '.delegateEvents' + this.cid;
        if (selector === '') {
          this.$el.on(eventName, method);
        } else {
          this.$el.on(eventName, selector, method);
        }
      }
      return this;
    },

    // Clears all callbacks previously bound to the view with `delegateEvents`.
    // You usually don't need to use this, but may wish to if you have multiple
    // Backbone views attached to the same DOM element.
    undelegateEvents: function() {
      this.$el.off('.delegateEvents' + this.cid);
      return this;
    },

    // Performs the initial configuration of a View with a set of options.
    // Keys with special meaning *(e.g. model, collection, id, className)* are
    // attached directly to the view.  See `viewOptions` for an exhaustive
    // list.
    _configure: function(options) {
      if (this.options) options = _.extend({}, _.result(this, 'options'), options);
      _.extend(this, _.pick(options, viewOptions));
      this.options = options;
    },

    // Ensure that the View has a DOM element to render into.
    // If `this.el` is a string, pass it through `$()`, take the first
    // matching element, and re-assign it to `el`. Otherwise, create
    // an element from the `id`, `className` and `tagName` properties.
    _ensureElement: function() {
      if (!this.el) {
        var attrs = _.extend({}, _.result(this, 'attributes'));
        if (this.id) attrs.id = _.result(this, 'id');
        if (this.className) attrs['class'] = _.result(this, 'className');
        var $el = Backbone.$('<' + _.result(this, 'tagName') + '>').attr(attrs);
        this.setElement($el, false);
      } else {
        this.setElement(_.result(this, 'el'), false);
      }
    }

  });

  // Backbone.sync
  // -------------

  // Override this function to change the manner in which Backbone persists
  // models to the server. You will be passed the type of request, and the
  // model in question. By default, makes a RESTful Ajax request
  // to the model's `url()`. Some possible customizations could be:
  //
  // * Use `setTimeout` to batch rapid-fire updates into a single request.
  // * Send up the models as XML instead of JSON.
  // * Persist models via WebSockets instead of Ajax.
  //
  // Turn on `Backbone.emulateHTTP` in order to send `PUT` and `DELETE` requests
  // as `POST`, with a `_method` parameter containing the true HTTP method,
  // as well as all requests with the body as `application/x-www-form-urlencoded`
  // instead of `application/json` with the model in a param named `model`.
  // Useful when interfacing with server-side languages like **PHP** that make
  // it difficult to read the body of `PUT` requests.
  Backbone.sync = function(method, model, options) {
    var type = methodMap[method];

    // Default options, unless specified.
    _.defaults(options || (options = {}), {
      emulateHTTP: Backbone.emulateHTTP,
      emulateJSON: Backbone.emulateJSON
    });

    // Default JSON-request options.
    var params = {type: type, dataType: 'json'};

    // Ensure that we have a URL.
    if (!options.url) {
      params.url = _.result(model, 'url') || urlError();
    }

    // Ensure that we have the appropriate request data.
    if (options.data == null && model && (method === 'create' || method === 'update' || method === 'patch')) {
      params.contentType = 'application/json';
      params.data = JSON.stringify(options.attrs || model.toJSON(options));
    }

    // For older servers, emulate JSON by encoding the request into an HTML-form.
    if (options.emulateJSON) {
      params.contentType = 'application/x-www-form-urlencoded';
      params.data = params.data ? {model: params.data} : {};
    }

    // For older servers, emulate HTTP by mimicking the HTTP method with `_method`
    // And an `X-HTTP-Method-Override` header.
    if (options.emulateHTTP && (type === 'PUT' || type === 'DELETE' || type === 'PATCH')) {
      params.type = 'POST';
      if (options.emulateJSON) params.data._method = type;
      var beforeSend = options.beforeSend;
      options.beforeSend = function(xhr) {
        xhr.setRequestHeader('X-HTTP-Method-Override', type);
        if (beforeSend) return beforeSend.apply(this, arguments);
      };
    }

    // Don't process data on a non-GET request.
    if (params.type !== 'GET' && !options.emulateJSON) {
      params.processData = false;
    }

    // If we're sending a `PATCH` request, and we're in an old Internet Explorer
    // that still has ActiveX enabled by default, override jQuery to use that
    // for XHR instead. Remove this line when jQuery supports `PATCH` on IE8.
    if (params.type === 'PATCH' && window.ActiveXObject &&
          !(window.external && window.external.msActiveXFilteringEnabled)) {
      params.xhr = function() {
        return new ActiveXObject("Microsoft.XMLHTTP");
      };
    }

    // Make the request, allowing the user to override any Ajax options.
    var xhr = options.xhr = Backbone.ajax(_.extend(params, options));
    model.trigger('request', model, xhr, options);
    return xhr;
  };

  // Map from CRUD to HTTP for our default `Backbone.sync` implementation.
  var methodMap = {
    'create': 'POST',
    'update': 'PUT',
    'patch':  'PATCH',
    'delete': 'DELETE',
    'read':   'GET'
  };

  // Set the default implementation of `Backbone.ajax` to proxy through to `$`.
  // Override this if you'd like to use a different library.
  Backbone.ajax = function() {
    return Backbone.$.ajax.apply(Backbone.$, arguments);
  };

  // Backbone.Router
  // ---------------

  // Routers map faux-URLs to actions, and fire events when routes are
  // matched. Creating a new one sets its `routes` hash, if not set statically.
  var Router = Backbone.Router = function(options) {
    options || (options = {});
    if (options.routes) this.routes = options.routes;
    this._bindRoutes();
    this.initialize.apply(this, arguments);
  };

  // Cached regular expressions for matching named param parts and splatted
  // parts of route strings.
  var optionalParam = /\((.*?)\)/g;
  var namedParam    = /(\(\?)?:\w+/g;
  var splatParam    = /\*\w+/g;
  var escapeRegExp  = /[\-{}\[\]+?.,\\\^$|#\s]/g;

  // Set up all inheritable **Backbone.Router** properties and methods.
  _.extend(Router.prototype, Events, {

    // Initialize is an empty function by default. Override it with your own
    // initialization logic.
    initialize: function(){},

    // Manually bind a single named route to a callback. For example:
    //
    //     this.route('search/:query/p:num', 'search', function(query, num) {
    //       ...
    //     });
    //
    route: function(route, name, callback) {
      if (!_.isRegExp(route)) route = this._routeToRegExp(route);
      if (_.isFunction(name)) {
        callback = name;
        name = '';
      }
      if (!callback) callback = this[name];
      var router = this;
      Backbone.history.route(route, function(fragment) {
        var args = router._extractParameters(route, fragment);
        callback && callback.apply(router, args);
        router.trigger.apply(router, ['route:' + name].concat(args));
        router.trigger('route', name, args);
        Backbone.history.trigger('route', router, name, args);
      });
      return this;
    },

    // Simple proxy to `Backbone.history` to save a fragment into the history.
    navigate: function(fragment, options) {
      Backbone.history.navigate(fragment, options);
      return this;
    },

    // Bind all defined routes to `Backbone.history`. We have to reverse the
    // order of the routes here to support behavior where the most general
    // routes can be defined at the bottom of the route map.
    _bindRoutes: function() {
      if (!this.routes) return;
      this.routes = _.result(this, 'routes');
      var route, routes = _.keys(this.routes);
      while ((route = routes.pop()) != null) {
        this.route(route, this.routes[route]);
      }
    },

    // Convert a route string into a regular expression, suitable for matching
    // against the current location hash.
    _routeToRegExp: function(route) {
      route = route.replace(escapeRegExp, '\\$&')
                   .replace(optionalParam, '(?:$1)?')
                   .replace(namedParam, function(match, optional){
                     return optional ? match : '([^\/]+)';
                   })
                   .replace(splatParam, '(.*?)');
      return new RegExp('^' + route + '$');
    },

    // Given a route, and a URL fragment that it matches, return the array of
    // extracted decoded parameters. Empty or unmatched parameters will be
    // treated as `null` to normalize cross-browser behavior.
    _extractParameters: function(route, fragment) {
      var params = route.exec(fragment).slice(1);
      return _.map(params, function(param) {
        return param ? decodeURIComponent(param) : null;
      });
    }

  });

  // Backbone.History
  // ----------------

  // Handles cross-browser history management, based on either
  // [pushState](http://diveintohtml5.info/history.html) and real URLs, or
  // [onhashchange](https://developer.mozilla.org/en-US/docs/DOM/window.onhashchange)
  // and URL fragments. If the browser supports neither (old IE, natch),
  // falls back to polling.
  var History = Backbone.History = function() {
    this.handlers = [];
    _.bindAll(this, 'checkUrl');

    // Ensure that `History` can be used outside of the browser.
    if (typeof window !== 'undefined') {
      this.location = window.location;
      this.history = window.history;
    }
  };

  // Cached regex for stripping a leading hash/slash and trailing space.
  var routeStripper = /^[#\/]|\s+$/g;

  // Cached regex for stripping leading and trailing slashes.
  var rootStripper = /^\/+|\/+$/g;

  // Cached regex for detecting MSIE.
  var isExplorer = /msie [\w.]+/;

  // Cached regex for removing a trailing slash.
  var trailingSlash = /\/$/;

  // Has the history handling already been started?
  History.started = false;

  // Set up all inheritable **Backbone.History** properties and methods.
  _.extend(History.prototype, Events, {

    // The default interval to poll for hash changes, if necessary, is
    // twenty times a second.
    interval: 50,

    // Gets the true hash value. Cannot use location.hash directly due to bug
    // in Firefox where location.hash will always be decoded.
    getHash: function(window) {
      var match = (window || this).location.href.match(/#(.*)$/);
      return match ? match[1] : '';
    },

    // Get the cross-browser normalized URL fragment, either from the URL,
    // the hash, or the override.
    getFragment: function(fragment, forcePushState) {
      if (fragment == null) {
        if (this._hasPushState || !this._wantsHashChange || forcePushState) {
          fragment = this.location.pathname;
          var root = this.root.replace(trailingSlash, '');
          if (!fragment.indexOf(root)) fragment = fragment.substr(root.length);
        } else {
          fragment = this.getHash();
        }
      }
      return fragment.replace(routeStripper, '');
    },

    // Start the hash change handling, returning `true` if the current URL matches
    // an existing route, and `false` otherwise.
    start: function(options) {
      if (History.started) throw new Error("Backbone.history has already been started");
      History.started = true;

      // Figure out the initial configuration. Do we need an iframe?
      // Is pushState desired ... is it available?
      this.options          = _.extend({}, {root: '/'}, this.options, options);
      this.root             = this.options.root;
      this._wantsHashChange = this.options.hashChange !== false;
      this._wantsPushState  = !!this.options.pushState;
      this._hasPushState    = !!(this.options.pushState && this.history && this.history.pushState);
      var fragment          = this.getFragment();
      var docMode           = document.documentMode;
      var oldIE             = (isExplorer.exec(navigator.userAgent.toLowerCase()) && (!docMode || docMode <= 7));

      // Normalize root to always include a leading and trailing slash.
      this.root = ('/' + this.root + '/').replace(rootStripper, '/');

      if (oldIE && this._wantsHashChange) {
        this.iframe = Backbone.$('<iframe src="javascript:0" tabindex="-1" />').hide().appendTo('body')[0].contentWindow;
        this.navigate(fragment);
      }

      // Depending on whether we're using pushState or hashes, and whether
      // 'onhashchange' is supported, determine how we check the URL state.
      if (this._hasPushState) {
        Backbone.$(window).on('popstate', this.checkUrl);
      } else if (this._wantsHashChange && ('onhashchange' in window) && !oldIE) {
        Backbone.$(window).on('hashchange', this.checkUrl);
      } else if (this._wantsHashChange) {
        this._checkUrlInterval = setInterval(this.checkUrl, this.interval);
      }

      // Determine if we need to change the base url, for a pushState link
      // opened by a non-pushState browser.
      this.fragment = fragment;
      var loc = this.location;
      var atRoot = loc.pathname.replace(/[^\/]$/, '$&/') === this.root;

      // If we've started off with a route from a `pushState`-enabled browser,
      // but we're currently in a browser that doesn't support it...
      if (this._wantsHashChange && this._wantsPushState && !this._hasPushState && !atRoot) {
        this.fragment = this.getFragment(null, true);
        this.location.replace(this.root + this.location.search + '#' + this.fragment);
        // Return immediately as browser will do redirect to new url
        return true;

      // Or if we've started out with a hash-based route, but we're currently
      // in a browser where it could be `pushState`-based instead...
      } else if (this._wantsPushState && this._hasPushState && atRoot && loc.hash) {
        this.fragment = this.getHash().replace(routeStripper, '');
        this.history.replaceState({}, document.title, this.root + this.fragment + loc.search);
      }

      if (!this.options.silent) return this.loadUrl();
    },

    // Disable Backbone.history, perhaps temporarily. Not useful in a real app,
    // but possibly useful for unit testing Routers.
    stop: function() {
      Backbone.$(window).off('popstate', this.checkUrl).off('hashchange', this.checkUrl);
      clearInterval(this._checkUrlInterval);
      History.started = false;
    },

    // Add a route to be tested when the fragment changes. Routes added later
    // may override previous routes.
    route: function(route, callback) {
      this.handlers.unshift({route: route, callback: callback});
    },

    // Checks the current URL to see if it has changed, and if it has,
    // calls `loadUrl`, normalizing across the hidden iframe.
    checkUrl: function(e) {
      var current = this.getFragment();
      if (current === this.fragment && this.iframe) {
        current = this.getFragment(this.getHash(this.iframe));
      }
      if (current === this.fragment) return false;
      if (this.iframe) this.navigate(current);
      this.loadUrl() || this.loadUrl(this.getHash());
    },

    // Attempt to load the current URL fragment. If a route succeeds with a
    // match, returns `true`. If no defined routes matches the fragment,
    // returns `false`.
    loadUrl: function(fragmentOverride) {
      var fragment = this.fragment = this.getFragment(fragmentOverride);
      var matched = _.any(this.handlers, function(handler) {
        if (handler.route.test(fragment)) {
          handler.callback(fragment);
          return true;
        }
      });
      return matched;
    },

    // Save a fragment into the hash history, or replace the URL state if the
    // 'replace' option is passed. You are responsible for properly URL-encoding
    // the fragment in advance.
    //
    // The options object can contain `trigger: true` if you wish to have the
    // route callback be fired (not usually desirable), or `replace: true`, if
    // you wish to modify the current URL without adding an entry to the history.
    navigate: function(fragment, options) {
      if (!History.started) return false;
      if (!options || options === true) options = {trigger: options};
      fragment = this.getFragment(fragment || '');
      if (this.fragment === fragment) return;
      this.fragment = fragment;
      var url = this.root + fragment;

      // If pushState is available, we use it to set the fragment as a real URL.
      if (this._hasPushState) {
        this.history[options.replace ? 'replaceState' : 'pushState']({}, document.title, url);

      // If hash changes haven't been explicitly disabled, update the hash
      // fragment to store history.
      } else if (this._wantsHashChange) {
        this._updateHash(this.location, fragment, options.replace);
        if (this.iframe && (fragment !== this.getFragment(this.getHash(this.iframe)))) {
          // Opening and closing the iframe tricks IE7 and earlier to push a
          // history entry on hash-tag change.  When replace is true, we don't
          // want this.
          if(!options.replace) this.iframe.document.open().close();
          this._updateHash(this.iframe.location, fragment, options.replace);
        }

      // If you've told us that you explicitly don't want fallback hashchange-
      // based history, then `navigate` becomes a page refresh.
      } else {
        return this.location.assign(url);
      }
      if (options.trigger) this.loadUrl(fragment);
    },

    // Update the hash location, either replacing the current entry, or adding
    // a new one to the browser history.
    _updateHash: function(location, fragment, replace) {
      if (replace) {
        var href = location.href.replace(/(javascript:|#).*$/, '');
        location.replace(href + '#' + fragment);
      } else {
        // Some browsers require that `hash` contains a leading #.
        location.hash = '#' + fragment;
      }
    }

  });

  // Create the default Backbone.history.
  Backbone.history = new History;

  // Helpers
  // -------

  // Helper function to correctly set up the prototype chain, for subclasses.
  // Similar to `goog.inherits`, but uses a hash of prototype properties and
  // class properties to be extended.
  var extend = function(protoProps, staticProps) {
    var parent = this;
    var child;

    // The constructor function for the new subclass is either defined by you
    // (the "constructor" property in your `extend` definition), or defaulted
    // by us to simply call the parent's constructor.
    if (protoProps && _.has(protoProps, 'constructor')) {
      child = protoProps.constructor;
    } else {
      child = function(){ return parent.apply(this, arguments); };
    }

    // Add static properties to the constructor function, if supplied.
    _.extend(child, parent, staticProps);

    // Set the prototype chain to inherit from `parent`, without calling
    // `parent`'s constructor function.
    var Surrogate = function(){ this.constructor = child; };
    Surrogate.prototype = parent.prototype;
    child.prototype = new Surrogate;

    // Add prototype properties (instance properties) to the subclass,
    // if supplied.
    if (protoProps) _.extend(child.prototype, protoProps);

    // Set a convenience property in case the parent's prototype is needed
    // later.
    child.__super__ = parent.prototype;

    return child;
  };

  // Set up inheritance for the model, collection, router, view and history.
  Model.extend = Collection.extend = Router.extend = View.extend = History.extend = extend;

  // Throw an error when a URL is needed, and none is supplied.
  var urlError = function() {
    throw new Error('A "url" property or function must be specified');
  };

  // Wrap an optional error callback with a fallback error event.
  var wrapError = function (model, options) {
    var error = options.error;
    options.error = function(resp) {
      if (error) error(model, resp, options);
      model.trigger('error', model, resp, options);
    };
  };

}).call(this);

define("backbone", ["underscore"], (function (global) {
    return function () {
        var ret, fn;
        return ret || global.Backbone;
    };
}(this)));

/*global define */

define('grapher/bar-graph/bar-graph-model',['require','backbone'],function (require) {
  // Dependencies.
  var Backbone = require('backbone'),

      BarGraphModel = Backbone.Model.extend({
        defaults: {
          // Current value displayed by bar graph.
          value:     0,
          // Second value displayed by bar graph (using small triangle).
          // It can be used to show averaged or previous value.
          // null means that it shouldn't be displayed at all.
          secondValue: null,
          // Min value displayed.
          min: 0,
          // Max value displayed.
          max: 10,

          // Width of the bar graph (bar itself, labels, titles etc. are
          // NOT included).
          barWidth: "2em",

          // Height of the bar graph container (bar itself + small padding).
          height: "20em",

          // Graph title. You can also specify multiline title using array
          // of strings, e.g.:
          // ["Title", "Subtitle"]
          title: "",
          // Accepted values are "right", "top" and "bottom".
          titleOn: "right",
          // Color of the main bar.
          barColor:  "#e23c34",
          // Color of the area behind the bar.
          fillColor: "white",
          // Number of labels displayed on the left side of the graph.
          // This value is *only* a suggestion. The most clean
          // and human-readable values are used.
          // You can also specify value-label pairs, e.g.:
          // [
          //   {
          //     "value": 0,
          //     "label": "low"
          //   },
          //   {
          //     "value": 10,
          //     "label": "high"
          //   }
          // ]
          // Use 0 or null to disable labels completely.
          labels:          10,
          // Units symbol displayed next to labels.
          units: "",
          // Number of grid lines displayed on the bar.
          gridLines:      10,
          // Format of labels.
          // See the specification of this format:
          // https://github.com/mbostock/d3/wiki/Formatting#wiki-d3_format
          // or:
          // http://docs.python.org/release/3.1.3/library/string.html#formatspec
          labelFormat: "0.1f"
        }
      });

  return BarGraphModel;
});

/*global define, $ */

/**
 * Require this module to initialize Lab jQuery plugins.
 */
define('common/jquery-plugins',[],function () {
  /**
   * Allows to measure element when it isn't already added to the page.
   * @param  {Function} fn       Function which will be executed.
   * @param  {string}   selector jQuery selector.
   * @param  {Object}   parent   Element which will be used as a temporal container.
   * @return {*}                 Result of 'fn' execution.
   */
  $.fn.measure = function(fn, selector, parent) {
    var el, selection, result;
    el = $(this).clone(false);
    el.css({
      visibility: 'hidden',
      position: 'absolute'
    });
    el.appendTo(parent);
    if (selector) {
      selection = el.find(selector);
    } else {
      selection = el;
    }
    result = fn.apply(selection);
    el.remove();
    return result;
  };

  /**
   * Truncates text inside given element, so its width doesn't exceed specified
   * value (in pixels). Note that you *can* use this function even on elements
   * like <p> or <h1>, which quite often have width of its parent (not width of
   * their text). This function will create a new <span> element with the same
   * style as original text and use it to measure real width of the text.
   *
   * @param  {number} maxWidth Maximum allowed width of text.
   */
  $.fn.truncate = function (maxWidth) {
    var $el = $(this),
        $span = $('<span>'),
        width,
        newText;

    $span.text($el.text());
    $span.css({
      'font-size': $el.css('font-size'),
      'font-weight': $el.css('font-weight'),
      'white-space': 'nowrap',
      'visibility': 'hidden'
    });
    $span.appendTo($el.parent());

    width = $span.width();

    if (width > maxWidth) {
      newText = $span.text() + "...";
      $span.text(newText);
      while (width > maxWidth && newText.length > 3) {
        newText = $span.text().slice(0, -4) + "...";
        $span.text(newText);
        width = $span.width();
      }

      // Save original text content in title attribute,
      // so tooltip can be displayed.
      $el.attr("title", $el.text());
      // Update original element.
      $el.text(newText);
    }
    // Cleanup!
    $span.remove();
  };
});

/*global define, d3, $ */

define('grapher/bar-graph/bar-graph-view',['require','common/jquery-plugins','backbone'],function (require) {
  //  Dependencies.
      require('common/jquery-plugins');
  var Backbone  = require('backbone'),

      uid = 0,
      // Returns unique ID used by the bar graph view.
      getUID = function () {
        return uid++;
      },

      // Get real width SVG of element using bounding box.
      getRealWidth = function (d3selection) {
        return d3selection.node().getBBox().width;
      },

      // Bar graph scales itself according to the font size.
      // We assume some CANONICAL_FONT_SIZE. All values which should
      // be scaled, should use returned function.
      CANONICAL_FONT_SIZE = 16,
      getScaleFunc = function (fontSize) {
        var factor = fontSize / CANONICAL_FONT_SIZE;

        return function (val) {
          return val * factor;
        };
      },

      setupValueLabelPairs = function (yAxis, ticks) {
        var values = [],
            labels = {},
            i, len;

        for (i = 0, len = ticks.length; i < len; i++) {
          values[i] = ticks[i].value;
          labels[values[i]] = ticks[i].label;
        }

        yAxis
          .tickValues(values)
          .tickFormat(function (value) {
            return labels[value];
          });
      },

      getFormatFunc = function (formatString, unitsString) {
        var format = d3.format(formatString);
        return function (value) {
          return format(value) + " " + unitsString;
        };
      },

      BarGraphView = Backbone.View.extend({
        // Container is a DIV.
        tagName: "div",

        className: "bar-graph",

        initialize: function () {
          // Unique ID. Required to generate unique
          // gradient names.
          this.uid = getUID();

          this.$topArea = $('<div class="top-area">').appendTo(this.$el);

          // Create some SVG elements, which are constant and doesn't need to
          // be recreated each time during rendering.
          this.vis = d3.select(this.el).append("svg");
          this.defs = this.vis.append("defs");
          this.axisContainer = this.vis.append("g");
          this.fill = this.vis.append("rect");
          this.bar = this.vis.append("rect");
          this.gridContainer = this.vis.append("g");
          this.trianglePos = this.vis.append("g");
          this.traingle = this.trianglePos.append("polygon");
          this.titleContainer = this.vis.append("g");

          this.yScale = d3.scale.linear();
          this.heightScale = d3.scale.linear();
          this.yAxis = d3.svg.axis();

          this.scale = null;
          this.barWidth = null;

          this.$bottomArea = $('<div class="bottom-area">').appendTo(this.$el);

          // Register callbacks!
          this.model.on("change", this.modelChanged, this);
        },

        // Render whole bar graph.
        render: function () {
              // toJSON() returns all attributes of the model.
              // This is equivalent to many calls like:
              // property1 = model.get("property1");
              // property2 = model.get("property2");
              // etc.
          var options            = this.model.toJSON(),
              fontSize           = parseFloat(this.$el.css("font-size")),
              // Scale function.
              scale = this.scale = getScaleFunc(fontSize),
              renderLabels       = options.labels > 0 || options.labels.length > 0,
              // Basic padding (scaled).
              paddingTop         = renderLabels ? scale(8) : scale(3),
              paddingBottom      = renderLabels ? scale(8) : scale(3),

              offset = 0;

          // Set height of the most outer container.
          this.$el.outerHeight(options.height);

          this._setupHorizontalTitle();

          this.svgHeight = this.$el.height() - this.$topArea.height() - this.$bottomArea.height();

          // Setup SVG element.
          this.vis
            .attr({
              // Use some random width. At the end of rendering, it will be
              // updated to a valid value in ems (based on the graph content).
              "width":  600,
              "height": this.svgHeight
            });

          // Setup Y scale.
          this.yScale
            .domain([options.min, options.max])
            .range([this.svgHeight - paddingTop, paddingBottom])
            .clamp(true);

          // Setup scale used to translation of the bar height.
          this.heightScale
            .domain([options.min, options.max])
            .range([0, this.svgHeight - paddingTop - paddingBottom])
            .clamp(true);

          // Render elements from left to right.

          this.axisContainer.selectAll("*").remove();
          if (renderLabels) {
            // Setup Y axis.
            this.yAxis
              .scale(this.yScale)
              .tickValues(null)
              .tickPadding(0)
              .tickSize(0, 0, 0)
              .orient("left");

            if (typeof options.labels === "number") {
              // Just normal tics.
              this.yAxis
                .ticks(options.labels)
                .tickFormat(getFormatFunc(options.labelFormat, options.units));
            } else {
              // Array with value - label pairs.
              setupValueLabelPairs(this.yAxis, options.labels);
            }

            // Create and append Y axis.
            this.axisContainer.call(this.yAxis);

            offset += getRealWidth(this.axisContainer);

            this.axisContainer.attr("transform", "translate(" + offset + ")");

            offset += scale(5);
          }

          // Setup background of the bar.
          this.fill
            .attr({
              "width": options.barWidth,
              "height": this.heightScale(options.max),
              "x": offset,
              "y": this.yScale(options.max),
              "rx": "0.5em",
              "ry": "0.5em",
              "fill": this._getFillGradient(options.fillColor)
            });

          // Setup the main bar.
          this.bar
            .attr({
              "width": options.barWidth,
              "x": offset,
              "rx": "0.5em",
              "ry": "0.5em",
              "fill": this._getBarGradient(options.barColor)
            });

          this.barWidth = getRealWidth(this.fill);

          this.traingle
            .classed("triangle", true)
            .attr({
              "points": "15,-7 15,7 1,0",
              "transform": "translate(" + offset + ") scale(" + scale(1) + ")"
            });

          this._setupGrid(offset);

          offset += this.barWidth;

          offset = this._setupTitle(offset);

          // Convert final width in px into value in ems.
          // That ensures that the SVG will work well with semantic layout.
          this.vis.attr("width", (offset / fontSize) + "em");
          this.$el.css("min-width", (offset / fontSize) + "em");

          // work-around bug on iPad2 where container is not expanding in width
          // when SVG element rendered inside it
          // see: Bar graph rendering issues on iPad
          // https://www.pivotaltracker.com/story/show/47854951
          // This means while we are duplicating the current padding styles set
          // in _grapher.sass changes in desired style must be duplicated here.
          this.$el.css("min-width", (offset / fontSize + 0.8) + "em");

          // Finally, update displayed values.
          this.update();
        },

        // Updates only bar height.
        update: function () {
          var value       = this.model.get("value"),
              secondValue = this.model.get("secondValue");

          this.bar
            .attr("height", this.heightScale(value))
            .attr("y", this.yScale(value));

          if (typeof secondValue !== 'undefined' && secondValue !== null) {
            this.traingle.classed("hidden", false);
            this.trianglePos.attr("transform", "translate(0," + this.yScale(secondValue) + ")");
          } else {
            this.traingle.classed("hidden", true);
          }
        },

        // This function should be called whenever model attribute is changed.
        modelChanged: function () {
          var changedAttributes = this.model.changedAttributes(),
              count = 0,
              valChanged, secValChanged, name;

          // There are two possible cases:
          // - Only "value" or "secondValue" have changed, so update only values
          //   displays.
          // - Other attributes have changed, so redraw whole bar graph.

          // Case 1. Check how many attributes have been changed.
          for (name in changedAttributes) {
            if (changedAttributes.hasOwnProperty(name)) {
              count++;
              if (count > 2) {
                // If 3 or more, redraw whole bar graph.
                this.render();
                return;
              }
            }
          }

          valChanged = typeof changedAttributes.value !== 'undefined';
          secValChanged = typeof changedAttributes.secondValue !== 'undefined';
          // Case 2. 1 or 2 attributes have changed, check if they are "value" and "secondValue".
          if ((count === 1 && (valChanged || secValChanged)) ||
              (count === 2 && (valChanged && secValChanged))) {
            this.update();
          } else {
            this.render();
          }
        },

        _getBarGradient: function (color) {
          var id = "bar-gradient-" + this.uid,
              gradient = this.defs.select("#" + id);

          color = d3.rgb(color);

          if (gradient.empty()) {
            // Create a new gradient.
            gradient = this.defs.append("linearGradient")
              .attr("id", id)
              .attr("x1", "0%")
              .attr("y1", "0%")
              .attr("x2", "0%")
              .attr("y2", "100%");
          } else {
            gradient.selectAll("stop").remove();
          }

          gradient.append("stop")
            .attr("stop-color", color.brighter(2).toString())
            .attr("offset", "0%");
          gradient.append("stop")
            .attr("stop-color", color.toString())
            .attr("offset", "100%");

          return "url(#" + id + ")";
        },

        _getFillGradient: function (color) {
          var id = "fill-gradient-" + this.uid,
              gradient = this.defs.select("#" + id);

          if (gradient.empty()) {
            // Create a new gradient.
            gradient = this.defs.append("linearGradient")
              .attr("id", id)
              .attr("x1", "0%")
              .attr("y1", "0%")
              .attr("x2", "0%")
              .attr("y2", "100%");
          } else {
            gradient.selectAll("stop").remove();
          }

          gradient.append("stop")
            .attr("stop-color", color)
            .attr("offset", "0%");
          gradient.append("stop")
            .attr("stop-color", color)
            .attr("stop-opacity", 0.5)
            .attr("offset", "15%");
          gradient.append("stop")
            .attr("stop-color", color)
            .attr("stop-opacity", 0.4)
            .attr("offset", "100%");

          return "url(#" + id + ")";
        },

        _setupGrid: function (offset) {
          var gridLines = this.yScale.ticks(this.model.get("gridLines")),
              yScale = this.yScale,
              width = this.barWidth;

          // Remove first and last tick, as we don't want to draw it as grid line.
          gridLines.pop(); gridLines.shift();
          this.grid = this.gridContainer.selectAll(".grid-line").data(gridLines, String),

          this.grid.enter().append("path").attr("class", "grid-line");
          this.grid.exit().remove();
          this.grid.attr("d", function (d) {
            return "M " + offset + " " + Math.round(yScale(d)) + " h " + width;
          });

          return offset;
        },

        // Setup vertical title.
        _setupTitle: function (offset) {
              // "title" option is expected to be string
              // or array of strings.
          var title = this.model.get("title"),
              self  = this,
              isArray, lines,
              titleG, gEnter;

          if (title && this.model.get("titleOn") === "right") {
            offset += this.scale(10);

            isArray = $.isArray(title);
            lines = isArray ? title.length : 1;

            titleG = this.titleContainer.selectAll(".title").data(isArray ? title : [title]);

            titleG.exit().remove();

            gEnter = titleG.enter().append("g").attr("class", "title");
            gEnter.append("title");
            gEnter.append("text");

            titleG.each(function (d, i) {
              var g = d3.select(this);
              g.select("title").text(d);
              g.select("text")
                .text(self._processTitle(d))
                .attr("dy", -(lines - i -1) + "em");
            });

            // Transform whole container.
            this.titleContainer.attr("transform",
              "translate(" + offset + ", " + this.svgHeight / 2 + ") rotate(90)");

            // Update offset.
            offset += parseFloat($(titleG.node()).css("font-size")) * lines;
          }

          return offset;
        },

        // Setup horizontal title.
        _setupHorizontalTitle: function () {
              // "title" option is expected to be string
              // or array of strings.
          var title = this.model.get("title"),
              pos = this.model.get("titleOn"),
              $container;

          this.$topArea.empty();
          this.$bottomArea.empty();

          if (!title || title.length === 0 || pos === "right") {
            return;
          }

          title = $.isArray(title) ? title : [title];

          if (pos === "top") {
            $container = this.$topArea;
          } else if (pos === "bottom") {
            $container = this.$bottomArea;
          }

          title.forEach(function (t) {
            $container.append('<p class="title">' + t + '</p>');
          });
        },

        _processTitle: function (title) {
          var $title = $('<span class="title">' + title + '</span>').appendTo(this.$el),
              truncatedText;

          $title.truncate(this.svgHeight);
          truncatedText = $title.text();
          $title.remove();
          return truncatedText;
        }
      });

  return BarGraphView;
});

/*global define: false, window: false */

define('grapher/public-api',['require','../lab.version','../lab.config','grapher/core/graph','grapher/bar-graph/bar-graph-model','grapher/bar-graph/bar-graph-view'],function (require) {
  'use strict';
  var
    version = require('../lab.version'),
    config  = require('../lab.config'),
    Graph         = require('grapher/core/graph'),
    BarGraphModel = require('grapher/bar-graph/bar-graph-model'),
    BarGraphView  = require('grapher/bar-graph/bar-graph-view'),
    // Object to be returned.
    publicAPI;

  publicAPI = {
    version: "0.0.1",
    // ==========================================================================
    // Add functions and modules which should belong to this API:
    // - graph constructor,
    Graph: Graph,
    // - bar graph model,
    BarGraphModel: BarGraphModel,
    // - bar graph view.
    BarGraphView: BarGraphView
    // ==========================================================================
  };

  // Finally, export API to global namespace.
  // Create or get 'Lab' global object (namespace).
  window.Lab = window.Lab || {};
  // Export config modules.
  window.Lab.config = config;

  // Export this API under 'grapher' name.
  window.Lab.grapher = publicAPI;

  // Also return publicAPI as module.
  return publicAPI;
});
require(['grapher/public-api'], undefined, undefined, true); }());