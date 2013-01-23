/*global Lab $ CodeMirror */

function getDimensions(components) {
  var minX = Infinity,
      maxX = -Infinity,
      minY = Infinity,
      maxY = -Infinity,
      i, len;

  for(i = 0, len = components.length; i < len; i++) {
    if (components[i].x < minX) {
      minX = components[i].x;
    }
    if (components[i].x + components[i].width > maxX) {
      maxX = components[i].x + components[i].width;
    }
    if (components[i].y < minY) {
      minY = components[i].y;
    }
    if (components[i].y + components[i].height > maxY) {
      maxY = components[i].y + components[i].height;
    }
  }

  return {maxX: maxX, minX: minX, minY: minY, maxY: maxY};
}

var interactiveEditor,
    cellWidth,
    cellHeight,
    modelComponent,
    components,
    intHeight, intWidth,
    scale = 1,
    gridLines = document.getElementById("grid-lines");

function update() {
  components = JSON.parse(interactiveEditor.getValue());

  calculateComponentGrid();

  var authorMode = !! $("#author-mode").attr("checked");

  if (intWidth) {
    intWidth = intWidth * scale;
    intHeight = intHeight * scale;
    cellWidth = intWidth / dimensions.colsNum;
    cellHeight = intHeight / dimensions.rowsNum;
  }

  if (authorMode) {
    addGridLines();
  } else {
    setupLayout();
  }

  renderComponents();
}

function calculateComponentGrid() {
  dimensions = getDimensions(components);
  dimensions.colsNum = dimensions.maxX - dimensions.minX;
  dimensions.rowsNum = dimensions.maxY - dimensions.minY;

  // Find model.
  for (i = 0; i < components.length; i++) {
    if (components[i].model) {
      modelComponent = components[i];
    }
  }
}

function addGridLines() {
  var container = $("#interactive-container"),
      contWidth = container.width(),
      contHeight = container.height(),
      svgUrl = "http://www.w3.org/2000/svg",
      createLine, x, y, i, draggingElement, startX, startY;

  $(gridLines).empty()
  .css({
    width: contWidth,
    height: contHeight
  })

  addLine = function(x1, y1, x2, y2, isAxis) {
    var line = $(document.createElementNS(svgUrl, "line")),
        thickness = isAxis ? 1.5 : 1,
        color = isAxis ? "#333" : "#969696"
    line.attr({
      x1: x1,
      y1: y1,
      x2: x2,
      y2: y2
    }).css({
      "stroke": color,
      "stroke-width": thickness,
      "cursor": "ew-resize"
    });

    line.appendTo($(gridLines));

    return line;
  }

  mouseDown = function(evt) {
    draggingElement = evt.target;
    startX = evt.offsetX;
    gridLines.addEventListener("mousemove", mouseMove, true)
    gridLines.addEventListener("mouseup", mouseUp, true)
  }

  mouseMove = function(evt) {
    if (!draggingElement) return;

    var x = evt.offsetX;
    scale = x / startX;
    startX = x;
    update();
  }

  mouseUp = function() {
    // this doesn't seem to work....
    gridLines.removeEventListener("mousemove", mouseMove, true)
    gridLines.removeEventListener("mouseup", mouseUp, true)
    // so use hack
    draggingElement = null;
  }

  for (i = 0, x = 0; x < contWidth; i++) {
    x = i * cellWidth;
    line = addLine(x, 0, x, contHeight, i == -dimensions.minX);
    line.bind("mousedown", mouseDown);
  }

  for (i = 0, y = 0; y < contHeight; i++) {
    y = i * cellHeight
    addLine(0, y, contWidth, y, i == dimensions.maxY);
  }

}

function setupLayout() {
  var cellAspectRatio,
      intAspectRatio,
      containerAspectRatio,

      containerWidth,
      containerHeight,

      compX, compY,
      compWidth, compHeight,

      i,

      comp;

  $(gridLines).empty()

  cellAspectRatio = modelComponent.width / modelComponent.height * modelComponent.aspectRatio;
  intAspectRatio = dimensions.rowsNum / dimensions.colsNum * cellAspectRatio;

  containerWidth = $("#interactive-container").width();
  containerHeight = $("#interactive-container").height();

  containerAspectRatio = containerHeight / containerWidth;

  if (containerAspectRatio >= intAspectRatio) {
    intWidth = containerWidth;
    intHeight = intAspectRatio * intWidth;
  } else {
    intHeight = containerHeight;
    intWidth = intHeight / intAspectRatio;
  }

  intWidth = intWidth * scale;
  intHeight = intHeight * scale;

  cellWidth = intWidth / dimensions.colsNum;
  cellHeight = intHeight / dimensions.rowsNum;
}

function renderComponents() {
  $("#interactive-container").empty();

  $("<div></div>").css({
    "position": "absolute",
    "top": 0,
    "left": 0,
    "width": intWidth,
    "height": intHeight,
    "background": "#DDD"
  }).appendTo("#interactive-container");

  for (i = 0; i < components.length; i++) {
    comp = components[i];

    comp.widthPx = comp.width * cellWidth;
    comp.heightPx = comp.height * cellHeight;
    comp.xPx = (comp.x - dimensions.minX) * cellWidth;
    comp.yPx = (intHeight - (comp.y - dimensions.minY) * cellHeight) - comp.heightPx;

    $("<div></div>")
    .attr({
      "class": "component"
    })
    .css({
      "left": comp.xPx,
      "top": comp.yPx,
      "width": comp.widthPx,
      "height": comp.heightPx,
      "background": comp.color
    }).appendTo("#interactive-container");
  }
}

$(function () {
var INDENT = 2,
    $interactiveTextarea = $("#interactive-textarea");

  interactiveEditor = CodeMirror.fromTextArea($interactiveTextarea.get(0), {
    mode: 'javascript',
    indentUnit: INDENT,
    lineNumbers: true,
    lineWrapping: false
  });

  $("#wrapper").resizable();

  $("#wrapper").bind("resize", update);
  $("#update-layout").on("click", update);
  $("#author-mode").on("click", update);

  update();

});