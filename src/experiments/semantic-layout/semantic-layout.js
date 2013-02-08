/*global $ CodeMirror */

var interactiveEditor,
    componentEditor,
    containers,
    $containers,
    $interactiveContainer,
    components,
    $components,
    minLeft,
    minTop,
    modelWidth = 50,
    modelHeight = 50;

function update() {
  var redraws = 7, id, $container;

  $interactiveContainer = $("#interactive-container");
  $interactiveContainer.empty();

  containers = JSON.parse(interactiveEditor.getValue());
  components = JSON.parse(componentEditor.getValue());

  createContainers();
  placeComponentsInContainers();

  minLeft = 0;
  minTop = 0;

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
    // $container.css("width", $container.outerWidth());
    // $container.css("height", $container.outerHeight());
    $container.css("left", $container.position().left-minLeft);
    $container.css("top", $container.position().top-minTop);
  }

  redraws = 7;

  // and then resize after the shift in origin
  while (redraws--) {
    positionContainers();
    resizeModelContainer();
  }

  positionContainers();
}

function createContainers() {
  var colors = ["blue", "red", "green", "purple", "gold"],
      container, id, prop, i, ii;

  $containers = {};

  $containers.model = $("<div id='model' class='container'>");
  $containers.model.css({
    left: 0,
    top: 0,
    width: modelWidth,
    height: modelWidth * getObject(components, "model")["aspect-ratio"],
    background: "orange"
  }).appendTo($interactiveContainer);

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
      if (/^margin-/.test(prop)) {
        $containers[id].css(prop, container[prop]);
      }
    }
  }
}

function placeComponentsInContainers() {
  var component, container, divContents, items, $row,
      i, ii, j, jj, k, kk;

  $components = {};

  for (i = 0, ii = components.length; i<ii; i++) {
    component = components[i];
    $components[component.id] = createComponent(component);
  }

  for (i = 0, ii = containers.length; i<ii; i++) {
    container = containers[i];
    divContents = container.components;
    if (!divContents) continue;

    if (Object.prototype.toString.call(divContents[0]) !== "[object Array]") {
      divContents = [divContents];
    }

    for (j = 0, jj = divContents.length; j < jj; j++) {
      items = divContents[j];
      $row = $('<div class="interactive-' + container.id + '-row"/>');
      $containers[container.id].append($row);
      for (k = 0, kk = items.length; k < kk; k++) {
        $row.append($components[items[k]]);
      }
    }
    $containers[container.id].css("min-width", $containers[container.id].outerWidth());
    $containers[container.id].css("min-height", $containers[container.id].outerHeight());
  }
}

function createComponent(comp) {
  var $component;

  switch (comp.type) {
    case "button":
      $component = $("<button id='"+comp.id+"'>")
        .html(comp.text);
  }

  return $component;
}

function positionContainers() {
  var container, $container,
      left, top, right, bottom, i, ii;

  for (i = 0, ii = containers.length; i<ii; i++) {
    container = containers[i];
    $container = $containers[container.id];
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
        $container.css("width", right-left);
      } else {
        left = right - $container.outerWidth(true);
        $container.css("left", left);
      }
    }
    if (container.bottom) {
      bottom = parseDimension(container.bottom);
      if (container.top) {
        $container.css("height", bottom-top);
      } else {
        top = bottom - $container.outerHeight(true);
        $container.css("top", top);
      }
    }
    $container.css("position", "absolute");

    if (left < minLeft) {
      minLeft = left;
    }
    if (top < minTop) {
      minTop = top;
    }
  }
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

// parses a container's dimension, such as "model.height"
function getDimension(dim) {
  var id, $container, attr;

  id = dim.split(".")[0];
  $container = $containers[id];
  attr = dim.split(".")[1];

  return getDimensionOfContainer($container, attr);
}

function getDimensionOfContainer($container, dim) {
  var position = $container.position();

  switch (dim) {
    case "top":
      return position.top + parseInt($container.css("margin-top"), 10);
    case "bottom":
      return position.top + $container.outerHeight(true);
    case "left":
      return position.left + parseInt($container.css("margin-left"), 10);
    case "right":
      return position.left + $container.outerWidth(true);
    case "height":
      return $container.outerHeight();
    case "width":
      return $container.outerWidth();
  }
}

// shrinks the model to fit in the interactive, given the sizes
// of the other containers around it.
function resizeModelContainer() {
  var maxY = -Infinity,
      maxX = -Infinity,
      id, $container,
      right, bottom,
      $modelContainer,
      availableWidth, availableHeight, ratio, xDiff, yDiff,
      modelAspectRatio, containerAspectRatio;

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

  $modelContainer = $containers.model;

  availableWidth  = $interactiveContainer.width();
  availableHeight = $interactiveContainer.height();

  containerAspectRatio = availableHeight / availableWidth;

  modelAspectRatio = getObject(components, "model")["aspect-ratio"];

  xDiff = maxX - availableWidth;
  yDiff = maxY - availableHeight;
  if (maxX > availableWidth && xDiff > yDiff) {
    ratio = (1 - 0.3 * (maxX - availableWidth) / availableWidth);
    modelWidth = $modelContainer.width() * ratio;
    modelHeight = modelAspectRatio * modelWidth;
  }
  else if (maxY > availableHeight) {
    ratio = (1 - 0.3 * (maxY - availableHeight) / availableHeight);
    modelHeight = $modelContainer.height() * ratio;
    modelWidth = modelHeight / modelAspectRatio;
  }
  else if (maxX < availableHeight) {
    ratio = (1 + 0.3 * (availableWidth - maxX) / availableWidth);
    modelWidth = $modelContainer.width() * ratio;
    modelHeight = modelAspectRatio * modelWidth;
  }
  else if (maxY < availableHeight) {
    ratio = (1 + 0.3 * (availableHeight - maxY) / availableHeight);
    modelHeight = $modelContainer.height() * ratio;
    modelWidth = modelHeight / modelAspectRatio;
  }

  $modelContainer.css({
    width: modelWidth,
    height: modelHeight
  });
}

// finds the object with the given id, given an array of
// [ {id: x, ...}, {id: y, ...} ]
function getObject(arr, id) {
  for (var i = 0, ii = arr.length; i<ii; i++) {
    if (arr[i].id === id) {
      return arr[i];
    }
  }
}


$(function () {
var INDENT = 2,
    $interactiveTextarea = $("#interactive-textarea"),
    $componentTextarea = $("#components-textarea"),
    $examples, option, firstExample;

  interactiveEditor = CodeMirror.fromTextArea($interactiveTextarea[0], {
    mode: 'javascript',
    indentUnit: INDENT,
    lineNumbers: true,
    lineWrapping: false
  });

  componentEditor = CodeMirror.fromTextArea($componentTextarea[0], {
    mode: 'javascript',
    indentUnit: INDENT,
    lineNumbers: true,
    lineWrapping: false
  });

  $("#wrapper").resizable();

  $("#wrapper").bind("resize", update);
  $("#update-layout").on("click", update);

  $examples = $("#examples");

  // layouts comes from layout-examples.js
  for (example in layouts) {
    option = $("<option value='"+example+"'>")
      .text(example)
      .appendTo($examples);

    $examples.bind("change", function(evt) {
      var example = layouts[this.value];
      interactiveEditor.setValue(JSON.stringify(example, null, " "))
      update();
    });

    if (!firstExample) {
      firstExample = layouts[example];
    }
  }

  interactiveEditor.setValue(JSON.stringify(firstExample, null, " "))

  update();

});