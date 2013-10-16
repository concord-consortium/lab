/*global define: false, $: false */
// ------------------------------------------------------------
//
//   Semantic Layout
//
// ------------------------------------------------------------

define(function (require) {

  var labConfig    = require('lab.config'),
      layoutConfig = require('common/layout/semantic-layout-config'),
      arrays       = require('arrays'),
      console      = require('common/console'),
      alert        = require('common/alert');

  return function SemanticLayout($interactiveContainer) {
        // Public API.
    var layout,

        // Array of containers specifications.
        containerSpecList,
        // Hash containing content of container for a given container ID.
        containersContent,
        // Hash of component controllers.
        componentByID,
        modelController,
        aspectRatio,
        fontScale,

        // Container specifications by ID.
        containerSpecByID,
        // Container jQuery objects by ID.
        $containerByID,
        // Model container jQuery object.
        $modelContainer,

        // Dimensions of the container.
        availableWidth,
        availableHeight,

        // Amount to inset the model and components from the top left
        padding = 10,

        // To optimize getHeightForWidth for model containers that care about the font size, kee
        // track of changes
        fontSizeChanged = false,

        // Most important variables.
        // In fact they define state of the layout.
        modelWidth,
        modelTop,
        modelLeft,
        topBoundary,
        leftBoundary,
        bottomBarWidth;

    function reset() {
      modelWidth = layoutConfig.minModelWidth;
      modelTop = 0;
      modelLeft = 0;
      topBoundary = 0;
      leftBoundary = 0;
      bottomBarWidth = 0;
    }

    function getDimensionOfContainer($container, dim) {
      var position = $container.position();

      switch (dim) {
        case "top":
          return position.top;
        case "bottom":
          return position.top + $container.outerHeight();
        case "left":
          return position.left;
        case "right":
          return position.left + $container.outerWidth();
        case "height":
          return $container.outerHeight();
        case "width":
          return $container.outerWidth();
      }
    }

    function setFontSize() {
      var canonicalWidth = layoutConfig.canonicalWidth,
          canonicalHeight = canonicalWidth / aspectRatio,
          containerScale, font;

      containerScale = Math.min($interactiveContainer.width() / canonicalWidth,
                                $interactiveContainer.height() / canonicalHeight);

      padding = containerScale * 10;

      font = layoutConfig.canonicalFontSize * fontScale * containerScale;

      // Ensure min font size (in 'em').
      if (font < layoutConfig.minFontSize) {
        font = layoutConfig.minFontSize;
      }

      // Set font-size of #responsive-content element. So, if application author
      // wants to avoid rescaling of font-size for some elements, they should not
      // be included in #responsive-content DIV.
      // TODO: #responsive-content ID is hardcoded, change it?
      $("#responsive-content").css("font-size", font + "em");
      fontSizeChanged = true;
    }

    function setupBackground() {
      var colors = layoutConfig.containerColors,
          id, i, len;

      for (i = 0, len = containerSpecList.length; i < len; i++) {
        id = containerSpecList[i].id;
        $containerByID[id].css("background", labConfig.authoring ? colors[i % colors.length] : "");
      }
    }

    function createContainers() {
      var container, id, prop, i, ii;

      // Cleanup interactive container.
      $interactiveContainer.empty();

      $containerByID = {};
      containerSpecByID = {};

      for (i = 0, ii = containerSpecList.length; i < ii; i++) {
        container = containerSpecList[i];
        id = container.id;
        containerSpecByID[id] = container;
        $containerByID[id] = $("<div id='" + id + "'>").appendTo($interactiveContainer);
        $containerByID[id].css({
          "display": "inline-block",
          "position": "absolute"
        });

        if (container.width === undefined) {
          // Disable wrapping of elements in a container, which
          // doesn't define explicit width. It's required to calculate
          // layout correctly.
          $containerByID[id].css("white-space", "nowrap");
        }

        for (prop in container) {
          if (!container.hasOwnProperty(prop)) continue;
          // Add any padding-* properties directly to the container's style.
          if (/^padding-/.test(prop)) {
            $containerByID[id].css(prop, container[prop]);
          }
          // Support also "align" property.
          else if (prop === "align") {
            $containerByID[id].css("text-align", container[prop]);
          }
          else if (prop === "min-width") {
            $containerByID[id].css("min-width", container[prop]);
          }
          else if (prop === "fontScale") {
            $containerByID[id].css("font-size", container[prop] + "em");
          }
        }
      }
    }

    function placeComponentsInContainers() {
      var id, containerID, divContents, items,
          $row, $rows, $containerComponents,
          lastContainer, comps, errMsg,
          i, ii, j, jj, k, kk;

      comps = $.extend({}, componentByID);

      for (containerID in containersContent) {
        if (!containersContent.hasOwnProperty(containerID)) continue;

        if (!$containerByID[containerID]) {
          // Inform an author and skip this container.
          errMsg = "Incorrect layout definition - '" + containerID + "' container does not exist.";
          alert(errMsg);
          continue;
        }

        divContents = containersContent[containerID];

        if (!arrays.isArray(divContents)) {
          // Inform an author and skip this container.
          errMsg = "Incorrect layout definition for '" + containerID + "' container. It should specify " +
                   "an array of components or an array of arrays of components (multiple rows).";
          alert(errMsg);
          continue;
        }

        if (!arrays.isArray(divContents[0])) {
          // Only one row specified. Wrap it into array to process it easier.
          divContents = [divContents];
        }

        for (j = 0, jj = divContents.length; j < jj; j++) {
          items = divContents[j];
          $row = $('<div class="interactive-row"/>');
          // Each row should have width 100% of its parent container.
          $row.css("width", "100%");
          // When there is only one row, ensure that it fills whole container.
          if (jj === 1) {
            $row.css("height", "100%");
          }
          $containerByID[containerID].append($row);
          for (k = 0, kk = items.length; k < kk; k++) {
            id = items[k];
            if (comps[id] === undefined) {
              // Inform an author and skip this definition.
              alert("Incorrect layout definition. Component with ID '" + id + "'' is not defined.");
              continue;
            }
            $row.append(comps[id].getViewContainer());
            delete comps[id];
          }
        }
      }

      // Add any remaining components to "bottom" or last container.
      lastContainer = containerSpecByID.bottom || containerSpecList[containerSpecList.length-1];
      $rows = $containerByID[lastContainer.id].children();
      $row = $rows.last();
      if (!$row.length) {
        $row = $('<div class="interactive-row"/>');
        $containerByID[lastContainer.id].append($row);
      }
      for (id in comps) {
        if (!comps.hasOwnProperty(id)) continue;
        $row.append(comps[id].getViewContainer());
      }

      // When there are multiple components in a container, ensure that there
      // is spacing between them.
      // See src/sass/lab/_semantic-layout.sass for .component-spacing class definition.
      for (i = 0, ii = containerSpecList.length; i < ii; i++) {
        // First children() call returns rows, second one components.
        $containerComponents = $containerByID[containerSpecList[i].id].children().children();
        if ($containerComponents.length > 1) {
          $containerComponents.addClass("component-spacing");
        }
      }
    }

    function positionContainers() {
      var container, $container,
          left, top, right, bottom, height, i, ii, id;

      $modelContainer.css({
        width:  modelWidth,
        height: modelController.getHeightForWidth(modelWidth, fontSizeChanged),
        left:   modelLeft,
        top:    modelTop
      });

      fontSizeChanged = false;

      for (i = 0, ii = containerSpecList.length; i<ii; i++) {
        container = containerSpecList[i];
        $container = $containerByID[container.id];

        if (!container.left && !container.right) {
          container.left = "0";
        }
        if (!container.top && !container.bottom) {
          container.top = "0";
        }

        if (container.left) {
          left = parseDimension(container.left);
          $container.css("left", left);
        }
        if (container.top) {
          top = parseDimension(container.top);
          $container.css("top", top);
        }
        if (container.height) {
          $container.css("height", parseDimension(container.height));
        }
        if (container.width) {
          $container.css("width", parseDimension(container.width));
        }
        if (container.right) {
          right = parseDimension(container.right);
          if (container.left) {
            $container.css("width", right - left);
          } else {
            left = right - $container.outerWidth();
            $container.css("left", left);
          }
        }
        if (container.bottom) {
          bottom = parseDimension(container.bottom);
          if (container.top) {
            $container.css("height", bottom - top);
          } else {
            top = bottom - $container.outerHeight();
            $container.css("top", top);
          }
        }

        // Containers with "aboveOthers" property should be treated in a special
        // way. It's a group of absolutely positioned containers, which is always
        // placed above other containers. So, in fact they define topBoundary
        // for other components.
        if (container.aboveOthers) {
          bottom = getDimensionOfContainer($container, "bottom") + padding;
          if (bottom > topBoundary) {
            topBoundary = bottom;
          }
        }
        if (container.belowOthers) {
          height = getDimensionOfContainer($container, "height") + padding;
          if (height > bottomBarWidth) {
            bottomBarWidth = height;
          }
        }
      }

      leftBoundary = padding;

      // Shift typical containers (aboveOther == false) according to the top boundary.
      for (id in $containerByID) {
        if (!$containerByID.hasOwnProperty(id)) continue;
        if (containerSpecByID[id] && containerSpecByID[id].aboveOthers) continue;
        if (containerSpecByID[id] && containerSpecByID[id].belowOthers) continue;
        $container = $containerByID[id];
        top = getDimensionOfContainer($container, "top");
        $container.css("top", top + topBoundary);
        left = getDimensionOfContainer($container, "left");
        $container.css("left", left + leftBoundary);
      }
    }

    // shrinks the model to fit in the interactive, given the sizes
    // of the other containers around it.
    function resizeModelContainer() {
      var maxX = -Infinity,
          maxY = -Infinity,
          minX = Infinity,
          minY = Infinity,
          id, $container,
          right, bottom, top, left, ratio;

      for (id in $containerByID) {
        if (!$containerByID.hasOwnProperty(id)) continue;
        if (containerSpecByID[id] && containerSpecByID[id].aboveOthers) continue;
        if (containerSpecByID[id] && containerSpecByID[id].belowOthers) continue;
        $container = $containerByID[id];
        right = getDimensionOfContainer($container, "right");
        if (right > maxX) {
          maxX = right;
        }
        bottom = getDimensionOfContainer($container, "bottom");
        if (bottom > maxY) {
          maxY = bottom;
        }
        left = getDimensionOfContainer($container, "left");
        if (left < minX) {
          minX = left;
        }
        top = getDimensionOfContainer($container, "top");
        if (top < minY) {
          minY = top;
        }
      }

      // Stop condition. We assume that layout is good enough when it fits the container +/- 2px.
      if ((maxX <= availableWidth + 2 && maxY <= (availableHeight-bottomBarWidth + 2)) &&
          (Math.abs(availableWidth - maxX) < 2 || Math.abs((availableHeight-bottomBarWidth) - maxY) < 2) &&
          (Math.abs(minX - leftBoundary) < 2 && Math.abs(minY - topBoundary) < 2)) {
        return true;
      }

      ratio = Math.min(availableWidth / maxX, (availableHeight-bottomBarWidth) / maxY);
      if (!isNaN(ratio)) {
        modelWidth = modelWidth * ratio;
      }
      if (modelWidth < layoutConfig.minModelWidth) {
        modelWidth = layoutConfig.minModelWidth;
      }

      modelLeft -= minX - leftBoundary;
      modelTop -= minY - topBoundary;

      return false;
    }

    // parses arithmetic such as "model.height/2"
    function parseDimension(dim) {
      var vars, i, ii, value;

      if (typeof dim === "number" || /^[0-9]+\.?[0-9]*(em)?$/.test(dim)) {
        return dim;
      }

      // find all strings of the form x.y
      vars = dim.match(/[a-zA-Z][a-zA-Z0-9\-]+\.[a-zA-Z]+/g);

      // replace all x.y's with the actual dimension
      for (i=0, ii=vars.length; i<ii; i++) {
        value = getDimension(vars[i]);
        dim = dim.replace(vars[i], value);
      }
      // eval only if we contain no more alphabetic letters
      // dim can contain strings which are just numbers ...
      // or strings with with expressions like this: "839/2 - 117/2"
      if (/^[^a-zA-Z]*$/.test(dim)) {
        return eval(dim);
      } else {
        return 0;
      }
    }

    // Parses a container's dimension, such as "model.height".
    function getDimension(dim) {
      switch(dim) {
        case "container.width":
          return availableWidth;
        case "container.height":
          return availableHeight;
        case "interactive.left":
          return leftBoundary;
        case "interactive.top":
          return topBoundary;
        case "interactive.width":
        case "interactive.right":
          return availableWidth - leftBoundary;
        case "interactive.height":
        case "interactive.bottom":
          return availableHeight - topBoundary - bottomBarWidth;
        default:
          dim = dim.split(".");
          return getDimensionOfContainer($containerByID[dim[0]], dim[1]);
      }
    }

    // Public API.
    layout = {
      /**
       * Setups interactive layout. Cleanups interactive container, creates new containers and places
       * components inside them.
       *
       * This method should be called each time when at least one of the following objects is changed:
       *  - layout template,
       *  - component locations,
       *  - components,
       *  - model controller,
       *  - font scale.
       *
       * @param {array} newContainers List of layout containers.
       * @param {Object} newContainersContent Hash of components locations, e.g. {"bottom": ["button", "textLabel"]}.
       * @param {Object} newComponents Hash of components controllers. Keys are IDs of the components.
       * @param {number} newFontScale Aspect ratio, floating point number, typically around 1.3.
       * @param {number} newFontScale Font scale, floating point number, typically between 0.5 and 1.5.
       */
      initialize: function(newContainers, newContainersContent, newComponents, newAspectRatio, newFontScale) {
        containerSpecList = newContainers;
        containersContent = newContainersContent;
        componentByID = newComponents;
        aspectRatio = newAspectRatio;
        fontScale = newFontScale;

        createContainers();
        placeComponentsInContainers();

        // After .initialize() call client code has to call .setupModel().
        modelController = null;
      },

      /**
       * Setups model controller, as well as model container provided by it.
       * Model Controller should implement getViewVontainer() method.
       * Always call this function after initialize()!
       *
       * @param {ModelController} newModelController Model Controller object.
       */
      setupModel: function (newModelController) {
        modelController = newModelController;

        if ($containerByID.model) {
          if ($containerByID.model === modelController.getViewContainer()) {
            // Do nothing, the valid model container is already inside interactive container.
            return;
          }
          // If there is an old model container, remove it.
          $containerByID.model.remove();
        }

        $modelContainer = modelController.getViewContainer();
        $modelContainer.css({
          "display": "inline-block",
          "position": "absolute",
          "z-index": "0"
        });
        $modelContainer.appendTo($interactiveContainer);
        $containerByID.model = $modelContainer;
      },

      /**
       * Returns true if semantic layout is ready to perform calculations.
       * @return {boolean}
       */
      isReady: function () {
        if (!modelController) return false;
        else return true;
      },

      /**
       * Layouts interactive. Adjusts size of the model container to ensure that all components are inside the
       * interactive container and all available space is used in the best way.
       */
      layoutInteractive: function () {
        var redraws = layoutConfig.iterationsLimit,
            id;

        console.time('[layout] update');

        reset();
        availableWidth  = $interactiveContainer.width();
        availableHeight = $interactiveContainer.height();
        modelWidth = availableWidth; // optimization

        // 0. Set font size of the interactive-container based on its size.
        setFontSize();

        // 1. Calculate optimal layout.
        positionContainers();
        while (--redraws > 0 && !resizeModelContainer()) {
          positionContainers();
        }

        // 2. Notify components that their containers have new sizes.
        modelController.resize();
        for (id in componentByID) {
          if (componentByID.hasOwnProperty(id) && componentByID[id].resize !== undefined) {
            componentByID[id].resize();
          }
        }

        // 3. Set / remove colors of containers depending on the value of Lab.config.authoring
        setupBackground();

        console.timeEnd('[layout] update');

        // Return number of iterations (e.g. for benchmarks).
        return layoutConfig.iterationsLimit - redraws;
      }
    };

    return layout;
  };

});