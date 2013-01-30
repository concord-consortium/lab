/*global define: false, $: false */
// ------------------------------------------------------------
//
//   Semantic Layout
//
// ------------------------------------------------------------

define(function (require) {

  return function SemanticLayout($interactiveContainer, containers, $components, componentLocations) {

    var layout = {},
        $modelContainer,
        $containers,
        minLeft, minTop;

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
    };

    function layoutInteractive() {
      var redraws, id, $container;

      $modelContainer = $interactiveContainer.find("#model-container");
      if ($modelContainer.length) {
        removeNonModelContainers();
      } else {
        $modelContainer = $("<div id='model-container' class='container'>")
        .css({
          left: 0,
          top: 0,
          width: 50,
          height: 50,
        }).appendTo($interactiveContainer);
      }

      createContainers();
      placeComponentsInContainers();

      minLeft = 0;
      minTop = 0;

      redraws = 5;

      // position containers and re-size several times,
      // until the positioning settles out
      while (redraws--) {
        positionContainers();
        resizeModelContainer();
      }

      // shift everything over if we have components to
      // the left of or above the model
      for (id in $containers) {
        if (!$containers.hasOwnProperty(id)) continue;
        $container = $containers[id];
        $container.css("left", $container.position().left-minLeft);
        $container.css("top", $container.position().top-minTop);
      }

      redraws = 2;

      // and then resize after the shift in origin
      while (redraws--) {
        positionContainers();
        resizeModelContainer();
      }
    };

    function removeNonModelContainers() {
      var children = $interactiveContainer.children(),
          i, ii;
      for (i=0, ii=children.length; i<ii; i++) {
        if (children[i] !== $modelContainer[0]) {
          children[i].remove();
        }
      }
    };

    function createContainers() {
      var colors = ["rgba(0,0,255,0.1)", "rgba(255,0,0,0.1)", "rgba(0,255,0,0.1)", "rgba(255,255,0,0.1)"],
          container, id, prop, i, ii;

      $containers = {};
      $containers.model = $modelContainer;

      for (i = 0, ii = containers.length; i<ii; i++) {
        container = containers[i];
        id = container.id;
        $containers[id] = $("<div id='"+id+"'>");
        $containers[id].css({
          display: "inline-block",
          background: colors[i%colors.length]
        }).appendTo($interactiveContainer);

        // add any padding-* properties directly to the container's style
        for (prop in container) {
          if (!container.hasOwnProperty(prop)) continue;
          if (/^padding-/.test(prop)) {
            $containers[id].css(prop, container[prop]);
          }
        }
      }
    };

    function placeComponentsInContainers() {
      var component, container, divContents, items, $row,
          lastContainer, $rows,
          i, ii, j, jj, k, kk;

      for (i = 0, ii = containers.length; i<ii; i++) {
        container = containers[i];
        if (componentLocations) {
          divContents = componentLocations[container.id];
        }
        if (!divContents) continue;

        if (Object.prototype.toString.call(divContents[0]) !== "[object Array]") {
          divContents = [divContents];
        }

        for (j = 0, jj = divContents.length; j < jj; j++) {
          items = divContents[j];
          $row = $('<div class="interactive-' + container.id + '-row"/>');
          $containers[container.id].append($row);
          for (k = 0, kk = items.length; k < kk; k++) {
            $row.append($components[items[k]].getViewContainer());
            delete $components[items[k]];
          }
        }
      }

      // add any remaining components to "bottom" or last container
      lastContainer = getObject(containers, "bottom") || containers[containers.length-1];
      for (id in $components) {
        if (!$components.hasOwnProperty(id)) continue;
        $rows = $containers[lastContainer.id].children();
        $row = $rows.last();
        if (!$row.length) {
          $row = $('<div class="interactive-' + container.id + '-row"/>');
          $containers[container.id].append($row);
        }
        $row.append($components[id].getViewContainer());
      }
    };

    function positionContainers() {
      var container, $container,
          left, top, right, bottom, i, ii;

      for (i = 0, ii = containers.length; i<ii; i++) {
        container = containers[i];
        $container = $containers[container.id];
        if (!container.top && !container.bottom) {
          container.top = "model.top";
        }
        if (!container.left && !container.right) {
          container.left = "model.left";
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
        $container.css("position", "absolute");

        if (left < minLeft) {
          minLeft = left;
        }
        if (top < minTop) {
          minTop = top;
        }
      }
    };

    // shrinks the model to fit in the interactive, given the sizes
    // of the other containers around it.
    function resizeModelContainer() {
      var maxX, maxY = maxX = -Infinity,
          id, $container,
          right, bottom,
          widthOfNonModelContainers,
          heightOfNonModelContainers,
          availableWidth, availableHeight,
          modelAspectRatio, containerAspectRatio,
          width, height;

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
      }

      widthOfNonModelContainers  = maxX - $modelContainer.width();
      heightOfNonModelContainers = maxY - $modelContainer.height();

      availableWidth  = $interactiveContainer.width() - widthOfNonModelContainers;
      availableHeight = $interactiveContainer.height() - heightOfNonModelContainers;

      containerAspectRatio = availableHeight / availableWidth;

      modelAspectRatio = $modelContainer.height() / $modelContainer.width();
      console.log(modelAspectRatio);

      if (containerAspectRatio >= modelAspectRatio) {
        width = availableWidth;
        height = modelAspectRatio * width;
      } else {
        height = availableHeight;
        width = height / modelAspectRatio;
      }

      $modelContainer.css({
        width: width,
        height: height
      });
    };


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
    };

    // parses a container's dimension, such as "model.height"
    function getDimension(dim) {
      var id, $container, attr;

      id = dim.split(".")[0];
      $container = $containers[id];
      attr = dim.split(".")[1];

      return getDimensionOfContainer($container, attr);
    };

    function getObject(arr, id) {
      for (var i = 0, ii = arr.length; i<ii; i++) {
        if (arr[i].id === id) {
          return arr[i];
        }
      }
    };

    layout.layoutInteractive = layoutInteractive;
    layout.positionContainers = positionContainers;
    layout.resizeModelContainer = resizeModelContainer;

    return layout;
  };

});