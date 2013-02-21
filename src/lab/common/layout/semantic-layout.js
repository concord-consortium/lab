/*global define: false, $: false */
// ------------------------------------------------------------
//
//   Semantic Layout
//
// ------------------------------------------------------------

define(function (require) {

  var labConfig = require('lab.config'),
      arrays    = require('arrays'),
      alert     = require('common/alert'),

      // Minimum width of the model.
      minModelWidth = 150,
      // Minimum font size (in ems).
      minFontSize = 0.65,
      // Canoncical font size (in ems).
      canonicalFontSize = 0.9,
      // Canonical dimensions of the interactive, they decide about font size.
      // (canoncicalFontSize * fontScale) em is used for the interactive which fits this container:
      // 98% because 2% is reserved for left and right padding (see: src/sass/_semantic-layout.sass).
      canonicalInteractiveWidth = 600 * 0.98,
      // 94% because 5% is reserved for banner with credits, about and share links (see: src/sass/_semantic-layout.sass).
      canonicalInteractiveHeight = 420 * 0.94,

      containerColors = [
        "rgba(0,0,255,0.1)", "rgba(255,0,0,0.1)", "rgba(0,255,0,0.1)", "rgba(255,255,0,0.1)",
        "rgba(0,255,255,0.1)", "rgba(255,255,128,0.1)", "rgba(128,255,0,0.1)", "rgba(255,128,0,0.1)"
      ];

  return function SemanticLayout($interactiveContainer, containers, componentLocations, components, modelController, fontScale) {

    var layout,
        $modelContainer,
        $containers,

        modelWidth = minModelWidth,
        modelTop = 0,
        modelLeft = 0,

        // Interactive dimensions which fits canonical dimensions.
        // So, basic dimensions are <= canonical dimensions.
        // They are required to correctly determine font size
        // (as we can't simply use canonical dimensions).
        basicInteractiveWidth,
        basicInteractiveHeight,

        // Interactive aspect ratio. It's used to determine font size.
        // Note that it may change a little bit during resizing (as there are
        // some dimensions defined in px, like borders, user agent styles etc.),
        // however this slight differences don't have any significant impact on result.
        interactiveAspectRatio,

        // Dimensions of the container.
        availableWidth,
        availableHeight;

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
      var containerAspectRatio = availableWidth / availableHeight,
          containerScale, font;

      if (interactiveAspectRatio <= containerAspectRatio) {
        containerScale = availableHeight / basicInteractiveHeight;
      } else {
        containerScale = availableWidth / basicInteractiveWidth;
      }

      font = canonicalFontSize * fontScale * containerScale;

      // Ensure min font size (in 'em').
      if (font < minFontSize) {
        font = minFontSize;
      }

      // Set font-size of #responsive-content element. So, if application author
      // wants to avoid rescaling of font-size for some elements, they should not
      // be included in #responsive-content DIV.
      // TODO: #responsive-content ID is hardcoded, change it?
      $("#responsive-content").css("font-size", font + "em");
    }

    // Calculate width for containers which doesn't explicitly specify its width.
    // In such case, width is determined by the content, no reflow will be allowed.
    function setMinDimensions() {
      var maxMinWidth, $container, i, len;

      function setRowMinWidth() {
        var minWidth = 0;
        // $(this) refers to one row.
        $(this).children().each(function () {
          // $(this) refers to element in row.
          minWidth += $(this).outerWidth(true);
        });
        $(this).css("min-width", Math.ceil(minWidth));
        if (minWidth > maxMinWidth) {
          maxMinWidth = minWidth;
        }
      }

      for (i = 0, len = containers.length; i < len; i++) {
        $container = $containers[containers[i].id];
        if (containers[i].width === undefined) {
          // Set min-width only for containers, which DO NOT specify
          // "width" explicitly in their definitions.
          maxMinWidth = -Infinity;
          $container.css("min-width", 0);
          $container.children().each(setRowMinWidth);
          $container.css("min-width", maxMinWidth);
        }
        if (containers[i]["min-width"] !== undefined) {
          $container.css("min-width", containers[i]["min-width"]);
        }
      }
    }

    function setupBackground() {
      var id, i, len;

      for (i = 0, len = containers.length; i < len; i++) {
        id = containers[i].id;
        $containers[id].css("background", labConfig.authoring ? containerColors[i % containerColors.length] : "");
      }
    }

    function createContainers() {
      var container, id, prop, i, ii;

      $containers = {};

      $modelContainer = modelController.getViewContainer();
      $modelContainer.css({
        "display": "inline-block",
        "position": "absolute"
      });
      $modelContainer.appendTo($interactiveContainer);
      $containers.model = $modelContainer;

      for (i = 0, ii = containers.length; i < ii; i++) {
        container = containers[i];
        id = container.id;
        $containers[id] = $("<div id='" + id + "'>").appendTo($interactiveContainer);
        $containers[id].css({
          "display": "inline-block",
          "position": "absolute"
        });

        for (prop in container) {
          if (!container.hasOwnProperty(prop)) continue;
          // Add any padding-* properties directly to the container's style.
          if (/^padding-/.test(prop)) {
            $containers[id].css(prop, container[prop]);
          }
          // Support also "align" property.
          if (prop === "align") {
            $containers[id].css("text-align", container[prop]);
          }
        }
      }
    }

    function placeComponentsInContainers() {
      var id, container, divContents, items,
          $row, $rows, $containerComponents,
          lastContainer, comps, errMsg,
          i, ii, j, jj, k, kk;

      comps = $.extend({}, components);

      for (i = 0, ii = containers.length; i<ii; i++) {
        container = containers[i];
        if (componentLocations) {
          divContents = componentLocations[container.id];
        }
        if (!divContents) continue;

        if (!arrays.isArray(divContents)) {
          // Inform an author and skip this container.
          errMsg = "Incorrect layout definition for '" + container.id + "' container. It should specify " +
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
          $row = $('<div class="interactive-' + container.id + '-row"/>');
          // Each row should have width 100% of its parent container.
          $row.css("width", "100%");
          // When there is only one row, ensure that it fills whole container.
          if (jj === 1) {
            $row.css("height", "100%");
          }
          $containers[container.id].append($row);
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
      lastContainer = getObject(containers, "bottom") || containers[containers.length-1];
      $rows = $containers[lastContainer.id].children();
      $row = $rows.last();
      if (!$row.length) {
        $row = $('<div class="interactive-' + container.id + '-row"/>');
        $containers[container.id].append($row);
      }
      for (id in comps) {
        if (!comps.hasOwnProperty(id)) continue;
        $row.append(comps[id].getViewContainer());
      }

      // When there are multiple components in a container, ensure that there
      // is spacing between them.
      // See src/sass/lab/_semantic-layout.sass for .component-spacing class definition.
      for (i = 0, ii = containers.length; i < ii; i++) {
        // First children() call returns rows, second one components.
        $containerComponents = $containers[containers[i].id].children().children();
        if ($containerComponents.length > 1) {
          $containerComponents.addClass("component-spacing");
        }
      }
    }

    function positionContainers() {
      var container, $container,
          left, top, right, bottom, i, ii;

      $modelContainer.css({
        width:  modelWidth,
        height: modelController.getHeightForWidth(modelWidth),
        left:   modelLeft,
        top:    modelTop
      });

      for (i = 0, ii = containers.length; i<ii; i++) {
        container = containers[i];
        $container = $containers[container.id];

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
          left = right - $container.outerWidth();
          $container.css("left", left);
        }
        if (container.bottom) {
          bottom = parseDimension(container.bottom);
          top = bottom - $container.outerHeight();
          $container.css("top", top);
        }
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

      // Calculate boundaries of the interactive.
      for (id in $containers) {
        if (!$containers.hasOwnProperty(id)) continue;
        $container = $containers[id];
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

      // TODO: this is quite naive approach.
      // It should be changed to some fitness function defining quality of the layout.
      // Using current algorithm, very often we follow some local minima.
      if ((maxX <= availableWidth && maxY <= availableHeight) &&
          (availableWidth - maxX < 1 || availableHeight - maxY < 1) &&
          (minX < 1 && minY < 1)) {
        // Perfect solution found!
        // (TODO: not so perfect, see above)
        return true;
      }

      ratio = Math.min(availableWidth / maxX, availableHeight / maxY);
      if (!isNaN(ratio)) {
        modelWidth = modelWidth * ratio;
      }
      if (modelWidth < minModelWidth) {
        modelWidth = minModelWidth;
      }

      modelLeft -= minX;
      modelTop -= minY;

      return false;
    }

    // parses arithmetic such as "model.height/2"
    function parseDimension(dim) {
      var vars, i, ii, value;

      if (typeof dim === "number" || /^[0-9]+(em)?$/.test(dim)) {
        return dim;
      }

      // find all strings of the form x.y
      vars = dim.match(/[a-zA-Z\-]+\.[a-zA-Z]+/g);

      // replace all x.y's with the actual dimension
      for (i=0, ii=vars.length; i<ii; i++) {
        value = getDimension(vars[i]);
        dim = dim.replace(vars[i], value);
      }
      // eval only if we contain no more alphabetic letters
      if (/^[^a-zA-Z]*$/.test(dim)) {
        return eval(dim);
      } else {
        return 0;
      }
    }

    // Parses a container's dimension, such as "model.height".
    function getDimension(dim) {
      switch(dim) {
        case "interactive.width":
          return availableWidth;
        case "interactive.height":
          return availableHeight;
        default:
          dim = dim.split(".");
          return getDimensionOfContainer($containers[dim[0]], dim[1]);
      }
    }

    function getObject(arr, id) {
      for (var i = 0, ii = arr.length; i<ii; i++) {
        if (arr[i].id === id) {
          return arr[i];
        }
      }
    }

    function calcInteractiveAspectRatio() {
      var redraws = 0,
          maxX = -Infinity,
          maxY = -Infinity,
          canonicalAspectRatio = canonicalInteractiveWidth / canonicalInteractiveHeight,
          id, $container, val;

      availableWidth = canonicalInteractiveWidth;
      availableHeight = canonicalInteractiveHeight;
      // Set basic interactive dimensions to default values to ensure that default font will be used.
      basicInteractiveWidth = canonicalInteractiveWidth;
      basicInteractiveHeight = canonicalInteractiveHeight;
      // Set font size to ensure that "fontScale" and "canonicalFontSize" are taken into account.
      setFontSize();
      setMinDimensions();
      modelWidth = availableWidth;
      positionContainers();
      while (redraws < 15 && !resizeModelContainer()) {
        positionContainers();
        redraws++;
      }

      for (id in $containers) {
        if (!$containers.hasOwnProperty(id)) continue;
        $container = $containers[id];
        val = getDimensionOfContainer($container, "right");
        if (val > maxX) {
          maxX = val;
        }
        val = getDimensionOfContainer($container, "bottom");
        if (val > maxY) {
          maxY = val;
        }
      }

      interactiveAspectRatio = maxX / maxY;
      if (interactiveAspectRatio < canonicalAspectRatio) {
        basicInteractiveWidth = canonicalInteractiveHeight * interactiveAspectRatio;
        basicInteractiveHeight = canonicalInteractiveHeight;
      } else {
        basicInteractiveWidth = canonicalInteractiveWidth;
        basicInteractiveHeight = canonicalInteractiveWidth / interactiveAspectRatio;
      }
    }

    // Public API.
    layout = {
      layoutInteractive: function () {
        var redraws = 0,
            id;

        availableWidth  = $interactiveContainer.width();
        availableHeight = $interactiveContainer.height();

        // 0. Set font size of the interactive-container based on its size.
        setFontSize();

        // 1. Calculate dimensions of containers which don't specify explicitly define it.
        //    It's necessary to do it each time, as when size of the container is changed,
        //    also size of the components can be changed (e.g. due to new font size).
        setMinDimensions();

        // 2. Calculate optimal layout.
        modelWidth = availableWidth;
        positionContainers();
        while (redraws < 35 && !resizeModelContainer()) {
          positionContainers();
          redraws++;
        }

        // 3. Notify components that their containers have new sizes.
        modelController.resize();
        for (id in components) {
          if (components.hasOwnProperty(id) && components[id].resize !== undefined) {
            components[id].resize();
          }
        }

        // 4. Set / remove colors of containers depending on the value of Lab.config.authoring
        setupBackground();
      }
    };

    //
    // Initialize.
    //
    createContainers();
    placeComponentsInContainers();
    calcInteractiveAspectRatio();

    return layout;
  };

});