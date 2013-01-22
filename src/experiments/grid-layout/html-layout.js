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
    modelComponent;

function update() {
  var authorMode = !! $("#author-mode").attr("checked");

  if (authorMode) {
    updateAuthorView();
  } else {
    setupLayout();
  }
}

function updateAuthorView() {
  //console.log(modelComponent.xPx + ", "+modelComponent.yPx)
  var container = $("#interactive-container"),
      contWidth = container.width(),
      contHeight = container.height(),
      x = 0,
      y = 0;

  $("<svg>")
  .attr({
    xmlns: "http://www.w3.org/2000/svg",
    version: "1.1",
    class: "grid-lines"
  })
  .css({
    top: 0,
    left: 0,
    width: contWidth,
    height: contHeight,
    position: "absolute"
  })
  .appendTo(container);

  while (x < contWidth) {
    $("<line x1='"+x+"' x2='"+x+"' y1='"+0+"' y2='"+contHeight+"'>")
    .attr("style", "stroke:rgb(255,0,0);stroke-width:2")
    .appendTo("svg");

    x += cellWidth;
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

  console.log("interactive height: " + intHeight);
  console.log("interactive width: " + intWidth);

  cellWidth = intWidth / colsNum;
  cellHeight = intHeight / rowsNum;

  console.log("cell height: " + cellHeight);
  console.log("cell width: " + cellWidth);


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

    console.log(i + "x :" + compX);
    console.log(i + "y :" + compY);

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

  setupLayout();

});