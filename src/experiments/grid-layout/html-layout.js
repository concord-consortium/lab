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
    gridLines = document.getElementById("grid-lines");

function update() {
  var authorMode = !! $("#author-mode").attr("checked");

  if (authorMode) {
    updateAuthorView();
  } else {
    setupLayout();
  }
}

function updateAuthorView() {
  var container = $("#interactive-container"),
      contWidth = container.width(),
      contHeight = container.height(),
      x = 0,
      y = 0,
      svgUrl = "http://www.w3.org/2000/svg",
      createLine;

  $(gridLines).empty()
  .css({
    width: contWidth,
    height: contHeight
  })

  addLine = function(x1, y1, x2, y2) {
    var line = document.createElementNS(svgUrl, "line");
    line.setAttributeNS(null, "x1", x1);
    line.setAttributeNS(null, "y1", y1);
    line.setAttributeNS(null, "x2", x2);
    line.setAttributeNS(null, "y2", y2);
    line.setAttributeNS(null, "style", "stroke:rgb(150,150,150);stroke-width:1");

    gridLines.appendChild(line);
  }

  while (x < contWidth) {
    addLine(x, 0, x, contHeight);
    x += cellWidth;
  }

  while (y < contHeight) {
    addLine(0, y, contWidth, y);
    y += cellHeight;
  }

}

function setupLayout() {
  var components = JSON.parse(interactiveEditor.getValue()),

      colsNum,
      rowsNum,

      cellAspectRatio,
      intAspectRatio,
      containerAspectRatio,

      containerWidth,
      containerHeight,

      intWidth,
      intHeight,

      dimensions,

      compX, compY,
      compWidth, compHeight,

      i,

      comp;

  $("#interactive-container").empty();
  $(gridLines).empty()

  dimensions = getDimensions(components);
  colsNum = dimensions.maxX - dimensions.minX;
  rowsNum = dimensions.maxY - dimensions.minY;

  // Find model.
  for (i = 0; i < components.length; i++) {
    if (components[i].model) {
      modelComponent = components[i];
    }
  }

  cellAspectRatio = modelComponent.width / modelComponent.height * modelComponent.aspectRatio;
  intAspectRatio = rowsNum / colsNum * cellAspectRatio;

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

  cellWidth = intWidth / colsNum;
  cellHeight = intHeight / rowsNum;


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

  setupLayout();

});