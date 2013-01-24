/*global Lab $ CodeMirror */

var interactiveEditor,
    cellWidth,
    cellHeight,
    modelComponent,
    components,
    intHeight, intWidth,
    rescaling = false,
    scale = 1,
    offset = [0,0],
    authorMode = false,
    panDragStart = {x: 0, y: 0},
    panDragEnd   = {x: 0, y: 0},
    gridLines = document.getElementById("grid-lines");

function getDimensions(components) {
  var minX = Infinity,
      maxX = -Infinity,
      minY = Infinity,
      maxY = -Infinity,
      model = modelComponent,
      i, len, comp;

  for(i = 0, len = components.length; i < len; i++) {
    comp = components[i];

    if (comp.aspectRatio) {
      if (comp.width) {
        comp.height = model.height * (comp.width/model.width) * (comp.aspectRatio/model.aspectRatio);
      } else if (comp.height) {
        comp.width = model.width * (model.aspectRatio/comp.aspectRatio) * (comp.height/model.height);
      }
    }

    if (comp.x < minX) {
      minX = comp.x;
    }
    if (comp.x + comp.width > maxX) {
      maxX = comp.x + comp.width;
    }
    if (comp.y < minY) {
      minY = comp.y;
    }
    if (comp.y + comp.height > maxY) {
      maxY = comp.y + comp.height;
    }
  }

  if (authorMode) {
    minX = Math.floor(minX);
    maxX = Math.ceil(maxX);
    minY = Math.floor(minY);
    maxY = Math.ceil(maxY);
  }

  return {maxX: maxX, minX: minX, minY: minY, maxY: maxY};
}

function update() {
  components = JSON.parse(interactiveEditor.getValue());

  authorMode = !! $("#author-mode").attr("checked");

  calculateComponentGrid();

  if (rescaling) {
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
  // Find model.
  for (i = 0; i < components.length; i++) {
    if (components[i].model) {
      modelComponent = components[i];
    }
  }

  dimensions = getDimensions(components);
  dimensions.colsNum = dimensions.maxX - dimensions.minX;
  dimensions.rowsNum = dimensions.maxY - dimensions.minY;
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
        color = isAxis ? "#333" : "#969696";
    line.attr({
      x1: x1,
      y1: y1,
      x2: x2,
      y2: y2
    }).css({
      "stroke": color,
      "stroke-width": thickness,
      "cursor": "ew-resize",
      "pointer-events": "all"
    });

    line.appendTo($(gridLines));

    return line;
  }

  mouseDown = function(evt) {
    rescaling = true;
    draggingElement = evt.target;
    startX = evt.offsetX;
    $(gridLines).css("pointer-events", "all");
    gridLines.addEventListener("mousemove", mouseMove, true);
    gridLines.addEventListener("mouseup", mouseUp, true);
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
    gridLines.removeEventListener("mousemove", mouseMove, true);
    gridLines.removeEventListener("mouseup", mouseUp, true);
    // so use hack
    draggingElement = null;

    $(gridLines).css("pointer-events", "none");
    rescaling = false;
  }

  for (i = 0, x = 0; x < contWidth; i++) {
    x = i * cellWidth + (offset[0] % cellWidth);
    line = addLine(x, 0, x, contHeight, i == -dimensions.minX + Math.floor(offset[0] / cellWidth));
    line.bind("mousedown", mouseDown);
  }

  for (i = 0, y = 0; y < contHeight; i++) {
    y = i * cellHeight + (offset[1] % cellHeight);
    addLine(0, y, contWidth, y, i == dimensions.maxY + Math.floor(offset[1] / cellHeight));
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

  if (!authorMode) {
    offset[0] = panDragEnd.x = 0;
    offset[1] = panDragEnd.y = 0;
  }

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

function panBackground(evt) {
  offset[0] = evt.pageX - panDragStart.x + panDragEnd.x;
  offset[1] = evt.pageY - panDragStart.y + panDragEnd.y;
  update();
}

function renderComponents() {
  $("#interactive-container").empty();

  var background = $("<div id='background'>").css({
    "position": "absolute",
    "left": 0,
    "top":  0,
    "width": "100%",
    "height": "100%",
  }).appendTo("#interactive-container");

  var intBackground = $("<div id='int-background'>").css({
    "position": "absolute",
    "left": 0 + (authorMode ? offset[0] : 0),
    "top":  0 + (authorMode ? offset[1] : 0),
    "width": intWidth,
    "height": intHeight,
    "background": "#DDD",
  }).appendTo(background);

  if (authorMode) {
    background.unbind();
    background.bind('mousedown', function(evt) {
      panDragStart.x = evt.pageX;
      panDragStart.y = evt.pageY;
      $("#interactive-container").bind('mousemove', panBackground);
      $("#interactive-container").bind('mouseup', function() {
        panDragEnd.x = offset[0];
        panDragEnd.y = offset[1];
        $("#interactive-container").unbind('mousemove', panBackground);
      });
    });
  }

  for (i = 0; i < components.length; i++) {
    comp = components[i];

    comp.widthPx = comp.width * cellWidth;
    comp.heightPx = comp.height * cellHeight;
    comp.xPx = (comp.x - dimensions.minX) * cellWidth;
    comp.yPx = (intHeight - (comp.y - dimensions.minY) * cellHeight) - comp.heightPx;

    $("<div>")
    .attr({
      "class": "component"
    })
    .css({
      "left": comp.xPx + (authorMode ? offset[0] : 0),
      "top":  comp.yPx + (authorMode ? offset[1] : 0),
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