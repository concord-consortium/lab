/*global $, define: false, d3: false, AUTHORING: false */
/*jshint loopfunc: true */

// ------------------------------------------------------------
//
//   MD2D View Renderer
//
// ------------------------------------------------------------
define(function(require) {
  // Dependencies.
  var labConfig         = require('lab.config'),
    console             = require('common/console'),
    benchmark           = require('common/benchmark/benchmark'),
    AtomsRenderer       = require('models/md2d/views/atoms-renderer'),
    BondsRenderer       = require('models/md2d/views/bonds-renderer'),
    VectorsRenderer     = require('models/md2d/views/vectors-renderer'),
    VdwLinesRenderer    = require('./vdw-lines-renderer'),
    GeneticRenderer     = require('models/md2d/views/genetic-renderer'),
    wrapSVGText         = require('cs!common/layout/wrap-svg-text'),
    gradients           = require('common/views/gradients'),
    contrastingColor    = require('common/views/color').contrastingColor,
    ImagesRenderer      = require('./images-renderer');

  return function MD2DView(modelView, model) {
    // Public API object to be returned.
    var api = {},

      // Allows us to defer running actual renderer setup until layout system has determined oursize.
      isSetup = false,

      // The model function getAtoms() returns a 2 dimensional array
      // of particle indices and properties that is updated every model tick.
      // This array is not garbage-collected so the view can be assured that
      // the latest modelAtoms will be in this array when the view is executing
      modelAtoms,
      modelElectricField,
      modelElements,
      modelWidth,
      modelHeight,
      aspectRatio,

      // Basic scaling functions for position, it transforms model units to "pixels".
      // Use it for positions of objects rendered inside the view.
      model2px,

      // Inverted scaling function for position transforming model units to "pixels".
      // Use it for Y coordinates, as Y axis in model coordinate system increases
      // from bottom to top, while but SVG has increases from top to bottom
      model2pxInv,

      // "Viewports" - SVG elements whose viewbox is automatically adjusted appropriately by the
      // container (called modelView here although it's a generic container, *not* the modelView)
      belowAtomsViewport = modelView.appendViewport().classed("below-atoms", true),

      // "Containers" - G elements used to position layers of the final visualization.
      shapeContainerBelow  = belowAtomsViewport.append("g").attr("class", "shape-container-below"),
      imageContainerBelow  = belowAtomsViewport.append("g").attr("class", "image-container image-container-below"),
      textContainerBelow   = belowAtomsViewport.append("g").attr("class", "text-container-below"),

      // TODO: remove it, as well as legacy code responsible for SVG atoms rendering.
      atomsViewport  = modelView.appendViewport().classed("atoms", true),
      atomsContainer = atomsViewport.append("g").attr("class", "atoms-container"),

      vectorsBelowPixi = modelView.appendPixiViewport(),
      vdwLinesPixi = modelView.appendPixiViewport(),
      bondsPixi = modelView.appendPixiViewport(),
      atomsPixi = modelView.appendPixiViewport(),
      vectorsAbovePixi = modelView.appendPixiViewport(),

      aboveAtomsViewport = modelView.appendViewport().classed("above-atoms", true),
      shapeContainerTop  = aboveAtomsViewport.append("g").attr("class", "shape-container-top"),
      lineContainerTop   = aboveAtomsViewport.append("g").attr("class", "line-container-top"),
      imageContainerTop  = aboveAtomsViewport.append("g").attr("class", "image-container image-container-top"),
      textContainerTop   = aboveAtomsViewport.append("g").attr("class", "text-container-top"),

      iconContainer = modelView.foregroundContainer.append("g").attr("class", "icon-container"),

      // Renderers specific for MD2D
      // TODO: try to create new renderers in separate files for clarity and easier testing.
      atomsRenderer = new AtomsRenderer(modelView, model, atomsPixi.pixiContainer, atomsPixi.canvas),
      bondsRenderer = new BondsRenderer(modelView, model, bondsPixi.pixiContainer, atomsRenderer),
      vdwLinesRenderer = new VdwLinesRenderer(modelView, model, vdwLinesPixi.pixiContainer),
      velocityVectorsRenderer = new VectorsRenderer(vectorsAbovePixi.pixiContainer, {
        get show() { return model.get("showVelocityVectors"); },
        get length() { return model.get("velocityVectors").length; },
        get width() { return model.get("velocityVectors").width; },
        get color() { return model.get("velocityVectors").color; },
        get dirOnly() { return false; },
        get count() { return modelAtoms.length; },
        x: function (i) { return modelAtoms[i].x; },
        y: function (i) { return modelAtoms[i].y; },
        vx: function (i) { return modelAtoms[i].vx * 100; },
        vy: function (i) { return modelAtoms[i].vy * 100; },
        m2px: modelView.model2canvas,
        m2pxInv: modelView.model2canvasInv
      }),
      forceVectorsRenderer = new VectorsRenderer(vectorsAbovePixi.pixiContainer, {
        get show() { return model.get("showForceVectors"); },
        get length() { return model.get("forceVectors").length; },
        get width() { return model.get("forceVectors").width; },
        get color() { return model.get("forceVectors").color; },
        get dirOnly() { return model.get("forceVectorsDirectionOnly"); },
        get count() { return modelAtoms.length; },
        x: function (i) { return modelAtoms[i].x; },
        y: function (i) { return modelAtoms[i].y; },
        vx: function (i) { var a = modelAtoms[i]; return a.ax * a.mass * 100; },
        vy: function (i) { var a = modelAtoms[i]; return a.ay * a.mass * 100; },
        m2px: modelView.model2canvas,
        m2pxInv: modelView.model2canvasInv
      }),
      electricFieldRenderer = new VectorsRenderer(vectorsBelowPixi.pixiContainer, {
        get show() { return model.get("showElectricField"); },
        get length() { return Math.sqrt(3 * model.get("width") / model.get("electricFieldDensity")); },
        get width() { return 0.01; },
        get color() {
          var c = model.get("electricFieldColor");
          return c !== "auto" ? c : contrastingColor(model.get("backgroundColor"));
        },
        get dirOnly() { return true; },
        get count() { return modelElectricField.length; },
        x: function (i) { return modelElectricField[i].x; },
        y: function (i) { return modelElectricField[i].y; },
        vx: function (i) { return modelElectricField[i].fx; },
        vy: function (i) { return modelElectricField[i].fy; },
        alpha: function (i) {
          var d = modelElectricField[i];
          return Math.min(1, Math.pow(d.fx * d.fx + d.fy * d.fy, 0.2) * 0.3);
        },
        m2px: modelView.model2canvas,
        m2pxInv: modelView.model2canvasInv
      }),
      imagesRenderer = new ImagesRenderer(modelView, model),
      geneticRenderer,

      arrowHeadsCache,
      fontSizeInPixels,
      obstacle,
      obstacles,
      mockObstaclesArray = [],
      shapes,
      shapeTop,
      shapeBelow,
      mockShapesTop = [],
      mockShapesBelow = [],
      lines,
      lineTop,
      mockLinesTop = [],
      useQuantumDynamics,
      forceVectorColor,
      forceVectorWidth,
      textBoxes,
      // Flag indicating whether there are some movable text boxes or not (e.g. attached to an atom
      // or obstacle). Used for optimization.
      onlyStaticTextBoxes = true,
      drawAtomTrace,
      atomTraceId,
      atomTraceColor,
      atomTrace,
      atomTracePath,

      browser = benchmark.what_browser(),

      // pre-calculations
      halfPi = Math.PI / 2,

      // this is a hack put in place to temporarily deal with a IE 10 bug which
      // does not update line markers when svg lines are moved
      // see https://connect.microsoft.com/IE/feedback/details/781964/
      hideLineMarkers = browser.browser === "MSIE" && Number(browser.version) >= 10;

    function createCustomArrowHead(i, path, start) {
      if(!path || path === "none"){
        return "none";
      }

      var id = "arrowhead-path" + path.toLowerCase().replace(/[^a-z0-9]/g, '') +
               (start ? "start" : "") + lines.lineColor[i].toLowerCase().replace(/[^a-z0-9]/g, '');

      if (!arrowHeadsCache[id]) {
        var defs, arrowHead;
        defs = atomsContainer.select("defs");
        if (defs.empty()) {
          defs = atomsContainer.append("defs");
        }
        arrowHead = defs.select("#" + id);
        arrowHead = atomsContainer.append("marker")
          .attr("id", id)
          .attr("class", "custom-arrow-head")
          .attr("viewBox", "0 0 10 10")
          .attr("refX", "5")
          .attr("refY", "5")
          .attr("markerUnits", "strokeWidth")
          .attr("markerWidth", "4")
          .attr("markerHeight", "4")
          .attr("orient", "auto");
        arrowHead.append("path")
          .attr("d", path)
          .attr("fill", lines.lineColor[i])
          .attr("transform", start ? "translate(10, 10) rotate(180)" : "");
        arrowHeadsCache[id] = true;
      }
      return "url(#" + id + ")";
    }

    function createVectorArrowHeads(color, name) {
      var defs,
        id = "Triangle-" + name,
        arrowHead;
      defs = atomsContainer.select("defs");
      if (defs.empty()) {
        defs = atomsContainer.append("defs");
      }
      arrowHead = defs.select("#" + id).remove();
      arrowHead = defs.append("marker")
        .attr("id", "Triangle-" + name)
        .attr("viewBox", "0 0 10 10")
        .attr("refX", "0")
        .attr("refY", "5")
        .attr("markerUnits", "strokeWidth")
        .attr("markerWidth", "4")
        .attr("markerHeight", "3")
        .attr("orient", "auto")
        .attr("stroke", color)
        .attr("fill", color);
      arrowHead.append("path")
        .attr("d", "M 0 0 L 10 5 L 0 10 z");
    }

    function createExcitationGlow() {
      var defs,
        glow;

      defs = atomsContainer.select("defs");
      if (defs.empty()) {
        defs = atomsContainer.append("defs");
      }
      glow = defs.select("#glow");
      if (glow.empty()) {
        glow = defs.append("filter")
          .attr("id", "glow")
          .attr("x", "-2")
          .attr("y", "-2")
          .attr("width", "800%")
          .attr("height", "800%");
        glow.append("feMorphology")
          .attr("result", "bigger")
          .attr("in", "SourceGraphic")
          .attr("operator", "dilate")
          .attr("radius", "6");
        glow.append("feGaussianBlur")
          .attr("result", "blurOut")
          .attr("in", "bigger")
          .attr("stdDeviation", "10");
        glow.append("feBlend")
          .attr("in", "SourceGraphic")
          .attr("in2", "blurOut")
          .attr("mode", "normal");
      }
    }

    // Create key images which can be shown in the
    // upper left corner in different situations.
    // IMPORTANT: The height attribute must be set,
    // it will allow to properly calculate images
    // placement in drawSymbolImages() function.
    function createSymbolImages() {
      var xMargin = "1%",
        fSize = Math.max(fontSizeInPixels, 12);

      // only add these images if they don't already exist
      if (iconContainer.select("#heat-bath").empty()) {
        // Heat bath key image.
        iconContainer.append("image")
          .attr({
            "id": "heat-bath",
            "x": xMargin,
            "width": fSize * 2,
            "height": fSize * 2,
            "preserveAspectRatio": "xMinYMin",
            // base64 of resources/upstatement/heatbath.svg
            "xlink:href": "data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0idXRmLTgiPz4NCjwhLS0gR2VuZXJhdG9yOiBBZG9iZSBJbGx1c3RyYXRvciAxNC4wLjAsIFNWRyBFeHBvcnQgUGx1Zy1JbiAuIFNWRyBWZXJzaW9uOiA2LjAwIEJ1aWxkIDQzMzYzKSAgLS0+DQo8IURPQ1RZUEUgc3ZnIFBVQkxJQyAiLS8vVzNDLy9EVEQgU1ZHIDEuMS8vRU4iICJodHRwOi8vd3d3LnczLm9yZy9HcmFwaGljcy9TVkcvMS4xL0RURC9zdmcxMS5kdGQiPg0KPHN2ZyB2ZXJzaW9uPSIxLjEiIGlkPSJMYXllcl8xIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHhtbG5zOnhsaW5rPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5L3hsaW5rIiB4PSIwcHgiIHk9IjBweCINCgkgd2lkdGg9Ijk2LjIzNnB4IiBoZWlnaHQ9IjUzLjMyMXB4IiB2aWV3Qm94PSIxLjc2NCAxMy44MSA5Ni4yMzYgNTMuMzIxIiBlbmFibGUtYmFja2dyb3VuZD0ibmV3IDEuNzY0IDEzLjgxIDk2LjIzNiA1My4zMjEiDQoJIHhtbDpzcGFjZT0icHJlc2VydmUiPg0KPGxpbmVhckdyYWRpZW50IGlkPSJTVkdJRF8xXyIgZ3JhZGllbnRVbml0cz0idXNlclNwYWNlT25Vc2UiIHgxPSItNjIyIiB5MT0iOTQ1LjU2MSIgeDI9Ii02MjIiIHkyPSI5MjYuNDM5OSI+DQoJPHN0b3AgIG9mZnNldD0iMCIgc3R5bGU9InN0b3AtY29sb3I6IzU1NTU1NSIvPg0KCTxzdG9wICBvZmZzZXQ9IjEiIHN0eWxlPSJzdG9wLWNvbG9yOiNGRkZGRkYiLz4NCjwvbGluZWFyR3JhZGllbnQ+DQo8cGF0aCBmaWxsPSIjRTZFN0U4IiBzdHJva2U9InVybCgjU1ZHSURfMV8pIiBzdHJva2Utd2lkdGg9IjAuNSIgc3Ryb2tlLW1pdGVybGltaXQ9IjEwIiBkPSJNNzEuMzMsMTQuMzg0DQoJYy04Ljk0MiwwLTE2LjgyNyw0LjQ1OS0yMS41OTYsMTEuMjY1Yy00Ljc3LTYuODAzLTEyLjY1NS0xMS4yNjUtMjEuNTk4LTExLjI2NWMtMTQuNTY0LDAtMjYuMzczLDExLjgwNi0yNi4zNzMsMjYuMzczDQoJYzAsMTQuNTY4LDExLjgwNSwyNi4zNzQsMjYuMzczLDI2LjM3NGM4Ljk0MiwwLDE2LjgyOC00LjQ2LDIxLjU5OC0xMS4yNjZjNC43NjksNi44MDIsMTIuNjUzLDExLjI2NiwyMS41OTYsMTEuMjY2DQoJYzE0LjU2NiwwLDI2LjM3Mi0xMS44MDYsMjYuMzcyLTI2LjM3NEM5Ny43MDIsMjYuMTksODUuODk2LDE0LjM4NCw3MS4zMywxNC4zODR6Ii8+DQo8cGF0aCBmaWxsPSIjNTU1NTU1IiBkPSJNMzEuNDQ4LDQ3LjcxOVYyNy4xMzNjMC0xLjE2LTAuOTQxLTIuMS0yLjEwMi0yLjFjLTEuMTU3LDAtMi4wOTUsMC45NC0yLjA5NSwyLjF2MjAuNTg2DQoJYy0xLjM4NSwwLjc1Mi0yLjMzOCwyLjE5Ni0yLjMzOCwzLjg4MWMwLDIuNDQ3LDEuOTg2LDQuNDI4LDQuNDMzLDQuNDI4YzIuNDUxLDAsNC40MzQtMS45OCw0LjQzNC00LjQyOA0KCUMzMy43ODMsNDkuOTE2LDMyLjgzLDQ4LjQ3MSwzMS40NDgsNDcuNzE5eiIvPg0KPHBhdGggZmlsbD0iIzU1NTU1NSIgZD0iTTgwLjIwOSwzNy42NjN2LTMuOTc0YzAtNC43NzUtMy44ODItOC42NTktOC42NTMtOC42NTlTNjIuOSwyOC45MTUsNjIuOSwzMy42ODl2My45NzRoLTIuMDY3djE1Ljk3M2gyMS43Mg0KCVYzNy42NjNIODAuMjA5eiBNNjYuMjM5LDMzLjY4OWMwLTIuOTMsMi4zODQtNS4zMTYsNS4zMTMtNS4zMTZjMi45MzEsMCw1LjMxNiwyLjM4Niw1LjMxNiw1LjMxNnYzLjk3NGgtMTAuNjNWMzMuNjg5eiIvPg0KPC9zdmc+DQo=",
            "class": "opaque-on-hover"
          })
          .append("title")
          .text("Heatbath active");
      }
      if (iconContainer.select("#ke-gradient").empty()) {
        // Kinetic Energy Shading gradient image.
        iconContainer.append("image")
          .attr({
            "id": "ke-gradient",
            "x": "0",
            "width": fSize * 2.2,
            "height": fSize * 6,
            "preserveAspectRatio": "xMinYMin",
            // base64 of resources/upstatement/ke-gradient.svg
            "xlink:href": "data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0idXRmLTgiPz4NCjwhLS0gR2VuZXJhdG9yOiBBZG9iZSBJbGx1c3RyYXRvciAxNC4wLjAsIFNWRyBFeHBvcnQgUGx1Zy1JbiAuIFNWRyBWZXJzaW9uOiA2LjAwIEJ1aWxkIDQzMzYzKSAgLS0+DQo8IURPQ1RZUEUgc3ZnIFBVQkxJQyAiLS8vVzNDLy9EVEQgU1ZHIDEuMS8vRU4iICJodHRwOi8vd3d3LnczLm9yZy9HcmFwaGljcy9TVkcvMS4xL0RURC9zdmcxMS5kdGQiPg0KPHN2ZyB2ZXJzaW9uPSIxLjEiIGlkPSJMYXllcl8xIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHhtbG5zOnhsaW5rPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5L3hsaW5rIiB4PSIwcHgiIHk9IjBweCINCgkgd2lkdGg9IjM5cHgiIGhlaWdodD0iMTExcHgiIHZpZXdCb3g9IjI1LjUgNC4wOTMgMzkgMTExIiBlbmFibGUtYmFja2dyb3VuZD0ibmV3IDI1LjUgNC4wOTMgMzkgMTExIiB4bWw6c3BhY2U9InByZXNlcnZlIj4NCjxwYXRoIGZpbGw9IiNFNkU3RTgiIGQ9Ik02MC45MTUsMTA2LjAzOGMwLDYuODEtMS4wNTMsNy45Mi03LjY4LDcuOTJsLTE0LjQ0NSwwLjI3M2MtNi42MjcsMC03LjYyNS0xLjM4NC03LjYyNS04LjE5M1YxMy41NjMNCgljMC02LjgxLDAuOTk4LTguMjIsNy42MjUtOC4yMmgxNC40NDVjNi42MjcsMCw3LjY4LDEuNDEsNy42OCw4LjIyVjEwNi4wMzh6Ii8+DQo8bGluZWFyR3JhZGllbnQgaWQ9IlNWR0lEXzFfIiBncmFkaWVudFVuaXRzPSJ1c2VyU3BhY2VPblVzZSIgeDE9Ijk4Ni4wNDQ5IiB5MT0iMTI5MC41MjY2IiB4Mj0iOTg2LjA0NDkiIHkyPSIxMjI2LjEzMjEiPg0KCTxzdG9wICBvZmZzZXQ9IjAiIHN0eWxlPSJzdG9wLWNvbG9yOiNBN0E5QUMiLz4NCgk8c3RvcCAgb2Zmc2V0PSIxIiBzdHlsZT0ic3RvcC1jb2xvcjojRkZGRkZGIi8+DQo8L2xpbmVhckdyYWRpZW50Pg0KPHBhdGggZmlsbD0iI0U2RTdFOCIgc3Ryb2tlPSJ1cmwoI1NWR0lEXzFfKSIgc3Ryb2tlLXdpZHRoPSIwLjUiIHN0cm9rZS1taXRlcmxpbWl0PSIxMCIgZD0iTTM2Ljk3MSwyNC43NjMNCgljMC0yLjAwNSwxLjYyNC0zLjYyOCwzLjYyOC0zLjYyOGgxMC45MzdjMi4wMDQsMCwzLjYyOCwxLjYyMiwzLjYyOCwzLjYyOHY2OC40NThjMCwyLjAwMy0xLjYyNCwzLjYyOS0zLjYyOCwzLjYyOUg0MC41OTkNCgljLTIuMDA0LDAtMy42MjgtMS42MjUtMy42MjgtMy42MjlWMjQuNzYzeiIvPg0KPGxpbmVhckdyYWRpZW50IGlkPSJTVkdJRF8yXyIgZ3JhZGllbnRVbml0cz0idXNlclNwYWNlT25Vc2UiIHgxPSIxMjQ1LjU4ODkiIHkxPSI4OTAuMDQ1MiIgeDI9IjEyNDUuNTg4OSIgeTI9Ijk2Mi4yNiIgZ3JhZGllbnRUcmFuc2Zvcm09Im1hdHJpeCgtMSAwIDAgMSAxMjkxLjYyODkgLTg2Ny4yMzgzKSI+DQoJPHN0b3AgIG9mZnNldD0iMC4wMDQzIiBzdHlsZT0ic3RvcC1jb2xvcjojRUY0MTM2Ii8+DQoJPHN0b3AgIG9mZnNldD0iMC4xNjUzIiBzdHlsZT0ic3RvcC1jb2xvcjojRjE2MDRCIi8+DQoJPHN0b3AgIG9mZnNldD0iMC41MTg5IiBzdHlsZT0ic3RvcC1jb2xvcjojRjc5RTg1Ii8+DQoJPHN0b3AgIG9mZnNldD0iMSIgc3R5bGU9InN0b3AtY29sb3I6I0ZGRkZGRiIvPg0KPC9saW5lYXJHcmFkaWVudD4NCjxwYXRoIGZpbGw9InVybCgjU1ZHSURfMl8pIiBkPSJNNDIuODI3LDk1LjAyM2MtMi4yMTUsMC00LjAwOS0xLjc5Ni00LjAwOS00LjAxMVYyNi44OTNjMC0yLjI1NywxLjgyOC00LjA4Niw0LjA4NS00LjA4Nmg2LjI3NA0KCWMyLjI1NywwLDQuMDg2LDEuODI5LDQuMDg2LDQuMDg2djY0LjExOWMwLDIuMjE1LTEuNzk1LDQuMDExLTQuMDExLDQuMDExSDQyLjgyN3oiLz4NCjxyZWN0IHg9IjE0LjM5NyIgeT0iOS42MDciIGZpbGw9Im5vbmUiIHdpZHRoPSI2MS4zNiIgaGVpZ2h0PSIxNC44MTIiLz4NCjx0ZXh0IHRyYW5zZm9ybT0ibWF0cml4KDEgMCAwIDEgMzQuNjA2IDE3LjAxMjkpIiBmb250LWZhbWlseT0iJ0FyaWFsTVQnIiBmb250LXNpemU9IjkuNDc5OCI+SElHSDwvdGV4dD4NCjxyZWN0IHg9IjE0LjM5NyIgeT0iMTAzLjAzMyIgZmlsbD0ibm9uZSIgd2lkdGg9IjYxLjM2IiBoZWlnaHQ9IjE0LjgxMiIvPg0KPHRleHQgdHJhbnNmb3JtPSJtYXRyaXgoMSAwIDAgMSAzNS4yOTMgMTA4LjY2OTIpIiBmb250LWZhbWlseT0iJ0FyaWFsTVQnIiBmb250LXNpemU9IjkuNDc5OCI+TE9XPC90ZXh0Pg0KPC9zdmc+DQo=",
            "class": "opaque-on-hover"
          })
          .append("title")
          .text("Kinetic energy gradient");
      }
    }

    // Draw key images in the upper left corner.
    // Place them in one row, dynamically calculate
    // y position.

    function drawSymbolImages() {
      var heatBath = model.get('temperatureControl'),
        keShadingMode = model.get('keShading'),
        imageSelect, imageHeight,
        // Variables used for calculating proper y positions.
        yPos = 0,
        yMargin = 1,
        fSize = Math.max(fontSizeInPixels, 12);

      // Heat bath symbol.
      if (heatBath) {
        yPos += yMargin;
        imageSelect = iconContainer.select("#heat-bath")
          .attr({
            "y": yPos,
            "width": fSize * 2,
            "height": fSize * 2
          })
          .style("display", "");

        imageHeight = parseInt(imageSelect.attr("height"), 10);
        yPos += imageHeight;
      } else {
        iconContainer.select("#heat-bath").style("display", "none");
      }

      // Kinetic Energy shading gradient.
      // Put it under heat bath symbol.
      if (keShadingMode) {
        yPos += yMargin;
        iconContainer.select("#ke-gradient")
          .attr({
            "y": yPos,
            "width": fSize * 2.2,
            "height": fSize * 6
          })
          .style("display", "");
      } else {
        iconContainer.select("#ke-gradient").style("display", "none");
      }
    }

    function atomTraceEnter() {
      atomTrace.enter().append("path")
        .attr({
          "class": "atomTrace",
          "d": getAtomTracePath,
          "stroke-width": model2px(0.01),
          "stroke": atomTraceColor,
          "fill": "none",
          "stroke-dasharray": "6, 6"
        });
    }

    function obstacleEnter() {
      var obstacleGroup = obstacle.enter().append("g");

      obstacleGroup
        .attr("class", "obstacle")
        .attr("transform",
          function(d, i) {
            return "translate(" + model2px(obstacles.x[i]) + " " + model2pxInv(obstacles.y[i] + obstacles.height[i]) + ")";
          }
      );
      obstacleGroup.append("rect")
        .attr({
          "class": "obstacle-shape",
          "x": 0,
          "y": 0,
          "width": function(d, i) {
            return model2px(obstacles.width[i]);
          },
          "height": function(d, i) {
            return model2px(obstacles.height[i]);
          },
          "fill": function(d, i) {
            return obstacles.visible[i] ? gradients.toSVG(gradients.parse(obstacles.color[i]), atomsContainer) : "transparent";
          },
          "stroke-width": function(d, i) {
            return obstacles.visible[i] ? 0.2 : 0.0;
          },
          "stroke": function(d, i) {
            return obstacles.visible[i] ? gradients.toSVG(gradients.parse(obstacles.color[i]), atomsContainer) : "transparent";
          }
        });

      // Append external force markers.
      obstacleGroup.each(function(d, i) {
        // Fast path, if no forces are defined.
        if (!obstacles.externalAx[i] && !obstacles.externalAy[i])
          return;

        // Note that arrows indicating obstacle external force use
        // the same options for styling like arrows indicating atom force.
        // Only their length is fixed.
        var obstacleGroupEl = d3.select(this),
          obsHeight = obstacles.height[i],
          obsWidth = obstacles.width[i],
          obsAx = obstacles.externalAx[i],
          obsAy = obstacles.externalAy[i],
          // Use fixed length of force vectors (in nm).
          vecLen = 0.06,
          space = 0.06,
          step, coords;

        // Set arrows indicating horizontal force.
        if (obsAx) {
          // Make sure that arrows keep constant distance between both ends of an obstacle.
          step = (obsHeight - 2 * space) / Math.round((obsHeight - 2 * space) / 0.2);
          coords = d3.range(space, obsHeight, step);
          obstacleGroupEl.selectAll("path.obstacle-force-hor").data(coords).enter().append("path")
            .attr({
              "class": "obstacle-force-hor",
              "d": function(d) {
                if (obsAx < 0)
                  return "M " + model2px(obsWidth + vecLen + space) +
                    "," + model2px(d) +
                    " L " + model2px(obsWidth + space) +
                    "," + model2px(d);
                else
                  return "M " + model2px(-vecLen - space) +
                    "," + model2px(d) +
                    " L " + model2px(-space) +
                    "," + model2px(d);
              }
            });
        }
        // Later set arrows indicating vertical force.
        if (obsAy) {
          // Make sure that arrows keep constant distance between both ends of an obstacle.
          step = (obsWidth - 2 * space) / Math.round((obsWidth - 2 * space) / 0.2);
          coords = d3.range(space, obsWidth, step);
          obstacleGroupEl.selectAll("path.obstacle-force-vert").data(coords).enter().append("path")
            .attr({
              "class": "obstacle-force-vert",
              "d": function(d) {
                if (obsAy < 0)
                  return "M " + model2px(d) +
                    "," + model2px(-vecLen - space) +
                    " L " + model2px(d) +
                    "," + model2px(-space);
                else
                  return "M " + model2px(d) +
                    "," + model2px(obsHeight + vecLen + space) +
                    " L " + model2px(d) +
                    "," + model2px(obsHeight + space);
              }
            });
        }
        // Finally, set common attributes and stying for both vertical and horizontal forces.
        obstacleGroupEl.selectAll("path.obstacle-force-hor, path.obstacle-force-vert")
          .attr({
            "marker-end": hideLineMarkers ? "" : "url(#Triangle-force)",
            "stroke-width": model2px(forceVectorWidth),
            "stroke": forceVectorColor,
            "fill": "none"
          });
      });
    }


    function shapeEnter() {
      var layers = [shapeTop, shapeBelow],
        i;
      for (i = 0; i < layers.length; i++) {
        var shapeGroup = layers[i].enter().append("g");
        shapeGroup.attr("class", "shape").attr("transform", function(d) {
          return "translate(" + model2px(shapes.x[d.index]) + " " + model2pxInv(shapes.y[d.index] + shapes.height[d.index]) + ")";
        });
        shapeGroup.append("rect").attr({
          "class": "shape-rectangle",
          "x": 0,
          "y": 0,
          "width": function(d) {
            return model2px(shapes.width[d.index]);
          },
          "height": function(d) {
            return model2px(shapes.height[d.index]);
          },
          "fill": function(d) {
            return shapes.visible[d.index] && shapes.type[d.index] === 'rectangle' ? gradients.toSVG(gradients.parse(shapes.color[d.index]), atomsContainer) : "transparent";
          },
          "stroke-width": function(d) {
            return shapes.lineWeight[d.index];
          },
          "stroke-dasharray": function(d) {
            return shapes.lineDashes[d.index];
          },
          "stroke": function(d) {
            return shapes.visible[d.index] && shapes.type[d.index] === 'rectangle' ? shapes.lineColor[d.index] : "transparent";
          }
        });
        shapeGroup.append("ellipse").attr({
          "class": "shape-ellipse",
          "cx": function(d) {
            return model2px(shapes.width[d.index]) / 2;
          },
          "cy": function(d) {
            return model2px(shapes.height[d.index]) / 2;
          },
          "rx": function(d) {
            return model2px(shapes.width[d.index]) / 2;
          },
          "ry": function(d) {
            return model2px(shapes.height[d.index]) / 2;
          },
          "fill": function(d) {
            return shapes.visible[d.index] && shapes.type[d.index] === 'ellipse' ? gradients.toSVG(gradients.parse(shapes.color[d.index]), atomsContainer) : "transparent";
          },
          "stroke-width": function(d) {
            return shapes.lineWeight[d.index];
          },
          "stroke-dasharray": function(d) {
            return shapes.lineDashes[d.index];
          },
          "stroke": function(d) {
            return shapes.visible[d.index] && shapes.type[d.index] === 'ellipse' ? shapes.lineColor[d.index] : "transparent";
          }
        });
      }
    }

    function getTextBoxCoords(d) {
      var x, y, hostX, hostY, textX, textY, frameX, frameY, calloutX, calloutY,
        pixelScale = model2px(d.fontSize);

      x = d.x;
      y = d.y;

      if (d.hostType) {
        // Mark that at least one text box has a host - it means that we have to update text boxes
        // each tick. Otherwise, we can follow a fast path and don't update them after creation.
        onlyStaticTextBoxes = false;
        if (d.hostType === "Atom") {
          hostX = modelAtoms[d.hostIndex].x;
          hostY = modelAtoms[d.hostIndex].y;
        } else {
          hostX = obstacles.x[d.hostIndex] + (obstacles.width[d.hostIndex] / 2);
          hostY = obstacles.y[d.hostIndex] + (obstacles.height[d.hostIndex] / 2);
        }
      }

      if (d.hostType && !d.calloutPoint) {
        x = hostX;
        y = hostY;
      }

      if (d.calloutPoint) {
        if (!d.hostType) {
          calloutX = d.calloutPoint[0];
          calloutY = d.calloutPoint[1];
        } else {
          calloutX = hostX;
          calloutY = hostY;
        }
      }

      frameX = model2px(x);
      frameY = model2pxInv(y);

      textX = frameX + pixelScale * 0.75;
      textY = frameY + pixelScale * 1.2;

      calloutX = model2px(calloutX);
      calloutY = model2pxInv(calloutY);

      return [textX, textY, frameX, frameY, calloutX, calloutY];
    }

    function getCalloutPath(location, frame, fullWidth, fullHeight, fontSize) {
      var calloutLocation = [
        parseFloat(location[0]),
        parseFloat(location[1])
      ],
        center = [
          parseFloat(frame.getAttribute("x")) + (fullWidth / 2),
          parseFloat(frame.getAttribute("y")) + (fullHeight / 2)
        ],
        angle = halfPi - Math.atan((calloutLocation[0] - center[0]) / (calloutLocation[1] - center[1])),
        baseSize = Math.min(fontSize, fullHeight / 2),

        dcx = Math.sin(angle) * baseSize,
        dcy = Math.cos(angle) * baseSize;

      return (center[0] + dcx) + ", " + (center[1] - dcy) + " " + (center[0] - dcx) + ", " + (center[1] + dcy) + " " + calloutLocation;
    }

    function updateTextBoxes() {
      var layers = [textContainerTop, textContainerBelow],
        updateText;

      updateText = function(layerNum) {
        var layer = layers[layerNum - 1],
          layerTextBoxes = textBoxes.filter(function(t) {
            return t.layer === layerNum;
          });

        layer.selectAll("g.textBoxWrapper rect")
          .data(layerTextBoxes.filter(function(d) {
            return d.frame;
          }))
          .attr({
            "x": function(d) {
              return getTextBoxCoords(d)[2];
            },
            "y": function(d) {
              return getTextBoxCoords(d)[3];
            },
            "transform": function(d) {
              var rotate = d.rotate,
                pos = getTextBoxCoords(d);
              return "rotate(" + rotate + " " + pos[0] + " " + pos[1] + ")";
            }
          });

        layer.selectAll("g.textBoxWrapper text")
          .data(layerTextBoxes)
          .attr({
            "y": function(d) {
              $(this).find("tspan").attr("x", getTextBoxCoords(d)[0]);
              return getTextBoxCoords(d)[1];
            }
          });

        layer.selectAll("g.textBoxWrapper polygon")
          .data(layerTextBoxes.filter(function(d) {
            return d.calloutPoint;
          }))
          .attr({
            "callout-location-data": function(d) {
              var pos = getTextBoxCoords(d);
              return pos[4] + ", " + pos[5];
            }
          });
      };

      updateText(1);
      updateText(2);

      // update callouts
      $(".textBox").each(function() {
        var $parentNode = $(this.parentNode),
          callout = $parentNode.find("polygon"),
          frame = $parentNode.find("rect")[0],
          fontSize, width, height, calloutLocation;

        if (!frame || callout.length === 0) return;

        fontSize = parseFloat(this.getAttributeNS(null, "font-size"));
        width = frame.getAttribute("width");
        height = frame.getAttribute("height");
        calloutLocation = callout.attr("callout-location-data").split(", ");

        callout.attr("points", getCalloutPath(calloutLocation, frame, width, height, fontSize));
      });
    }

    function drawTextBoxes() {
      var size, layers, appendTextBoxes;
      // Workaround for a rendering bug in Chrome on OS X and Windows (but not Linux or Android);
      // see http://crbug.com/309740
      var shouldRoundTextBoxStrokeWidth =
        browser.browser === 'Chrome' && !!browser.oscpu.match(/Windows|Mac OS X/);

      textBoxes = model.get('textBoxes');

      size = [model.get('width'), model.get('height')];

      layers = [textContainerTop, textContainerBelow];

      // Append to either top or bottom layer depending on item's layer #.
      appendTextBoxes = function(layerNum) {
        var layer = layers[layerNum - 1],
          text, layerTextBoxes, selection;

        layer.selectAll("g.textBoxWrapper").remove();

        layerTextBoxes = textBoxes.filter(function(t) {
          return t.layer === layerNum;
        });

        selection = layer.selectAll("g.textBoxWrapper")
          .data(layerTextBoxes);
        text = selection.enter().append("svg:g")
          .attr("class", "textBoxWrapper");

        text.filter(function(d) {
          return d.calloutPoint;
        })
          .append("polygon")
          .attr({
            "points": "0,0 0,0 0,0",
            "style": function(d) {
              var backgroundColor = d.backgroundColor,
                strokeWidth = d.strokeWidthEms * fontSizeInPixels,
                strokeOpacity = d.strokeOpacity,
                strokeColor = d.strokeColor;
              return "fill:" + backgroundColor + ";opacity:1.0;fill-opacity:1;stroke:" + strokeColor + ";stroke-width:" + (strokeWidth * 2) + ";stroke-opacity:" + strokeOpacity;
            },
            "callout-location-data": function(d) {
              var pos = getTextBoxCoords(d);
              return pos[4] + ", " + pos[5];
            }
          });

        text.filter(function(d) {
          return d.frame;
        })
          .append("rect")
          .attr({
            "class": function(d, i) {
              return "textBoxFrame text-" + i;
            },
            "id": function(d, i) {
              return "text-" + i;
            },
            "transform": function(d) {
              var rotate = d.rotate,
                pos = getTextBoxCoords(d);
              return "rotate(" + rotate + " " + pos[0] + " " + pos[1] + ")";
            },
            "style": function(d) {
              var backgroundColor = d.backgroundColor,
                strokeWidth = d.strokeWidthEms * fontSizeInPixels,
                strokeOpacity = d.strokeOpacity,
                strokeColor = d.strokeColor;

              if (shouldRoundTextBoxStrokeWidth && strokeWidth < 1) {
                // Workaround for ghosting artifact left when stroke-width < 1 in Chrome on OS X.
                // Try to adjust opacity to compensate for increased width:
                strokeOpacity *= strokeWidth;
                strokeWidth = 1;
              }

              return "fill:" + backgroundColor + ";opacity:1.0;fill-opacity:1;stroke:" + strokeColor + ";stroke-width:" + strokeWidth + ";stroke-opacity:" + strokeOpacity;
            },
            "width": 0,
            "height": 0,
            "rx": function(d) {
              return d.frame === "rounded rectangle" ? model2px(d.fontSize) / 2.5 : 0;
            },
            "ry": function(d) {
              return d.frame === "rounded rectangle" ? model2px(d.fontSize) / 2 : 0;
            },
            "x": function(d) {
              return getTextBoxCoords(d)[2];
            },
            "y": function(d) {
              return getTextBoxCoords(d)[3];
            }
          });

        text.filter(function(d) {
          return d.calloutPoint;
        })
          .append("polygon")
          .attr({
            "points": "0,0 0,0 0,0",
            "style": function(d) {
              var backgroundColor = d.backgroundColor;
              return "fill:" + backgroundColor + ";opacity:1.0;fill-opacity:1;stroke:#000000;stroke-width:0;";
            }
          });

        text.append("text")
          .attr({
            "class": function() {
              return "textBox" + (AUTHORING ? " draggable" : "");
            },
            "transform": function(d) {
              var rotate = d.rotate,
                pos = getTextBoxCoords(d);
              return "rotate(" + rotate + " " + pos[0] + " " + pos[1] + ")";
            },
            "x-data": function(d) {
              return getTextBoxCoords(d)[0];
            },
            "y": function(d) {
              return getTextBoxCoords(d)[1];
            },
            "width-data": function(d) {
              return d.width;
            },
            "height-data": function(d) {
              return d.height;
            },
            "width": model2px(size[0]),
            "height": model2px(size[1]),
            "xml:space": "preserve",
            "font-family": "'" + labConfig.fontface + "', sans-serif",
            "font-size": function(d) {
              return model2px(d.fontSize) + "px";
            },
            "fill": function(d) {
              return d.color || "black";
            },
            "text-data": function(d) {
              return d.text;
            },
            "text-anchor": function(d) {
              var align = d.textAlign || "left";
              if (align === "center") align = "middle";
              return align;
            },
            "has-host": function(d) {
              return !!d.hostType;
            }
          })
          .call(d3.behavior.drag()
            .on("drag", textDrag)
            .on("dragend", function(d) {
              // simple output to console for now, eventually should just get
              // serialized back to interactive (or model?) JSON on author save
              console.log('"x": ' + d.x + ",");
              console.log('"y": ' + d.y + ",");
            })
        );
        selection.exit().remove();
      };

      appendTextBoxes(1);
      appendTextBoxes(2);

      // wrap text, set callouts
      $(".textBox").each(function() {
        var text = this.getAttributeNS(null, "text-data"),
          x = this.getAttributeNS(null, "x-data"),
          width = this.getAttributeNS(null, "width-data"),
          height = this.getAttributeNS(null, "height-data"),
          fontSize = parseFloat(this.getAttributeNS(null, "font-size")),
          transform = this.getAttributeNS(null, "transform"),
          hasHost = this.getAttributeNS(null, "has-host"),
          textAlign = this.getAttributeNS(null, "text-anchor"),
          $parentNode = $(this.parentNode),
          horizontalPadding, verticalPadding,
          result, fullWidth, fullHeight, frame, dy, tx, ty,
          callout, calloutLocation;

        dy = fontSize * 1.2;
        horizontalPadding = +fontSize * 1.5;
        verticalPadding = fontSize / 1.8;

        if (width === '') {
          width = -1;
        } else {
          width = model2px(width);
        }

        if (height === '') {
          height = -1;
        } else {
          height = model2px(height);
        }

        while (this.firstChild) { // clear element first
          this.removeChild(this.firstChild);
        }

        result = wrapSVGText(text, this, width, x, dy);

        if ($parentNode.find("rect").length > 0) {
          frame = $parentNode.find("rect")[0];
          fullWidth = result.width + horizontalPadding;
          frame.setAttributeNS(null, "width", fullWidth);
          if (height > 0) {
            fullHeight = height;
          } else {
            fullHeight = (result.lines * dy) + verticalPadding;
          }
          frame.setAttributeNS(null, "height", fullHeight);
        }

        // if we have a callout
        callout = $parentNode.find("polygon");
        if (frame && callout.length > 0) {
          calloutLocation = callout.attr("callout-location-data").split(", ");
          callout.attr("points", getCalloutPath(calloutLocation, frame, fullWidth, fullHeight, fontSize));
        }

        // center all hosted labels simply by tweaking the g.transform
        if (textAlign === "middle") {
          tx = result.width / 2;
          if (height > 0) {
            ty = height / 2 - verticalPadding * 1.5 - (result.lines - 1) * dy / 2;
          } else {
            ty = 0;
          }
          transform = transform + " translate(" + tx + "," + ty + ")";
          $(this).attr("transform", transform);
        }
        if (hasHost === "true" && callout.length === 0) {
          tx = result.width / -2 - horizontalPadding / 2;
          ty = result.lines * dy / -2 - verticalPadding / 2;
          $parentNode.attr("transform", "translate(" + tx + "," + ty + ")");
        }
      });
    }

    function setupObstacles() {
      obstacles = model.get_obstacles();
      atomsContainer.selectAll("g.obstacle").remove();
      if (obstacles) {
        mockObstaclesArray.length = obstacles.x.length;
        obstacle = atomsContainer.selectAll("g.obstacle").data(mockObstaclesArray);
        obstacleEnter();
      }
    }

    function setupShapes() {
      shapes = model.get_shapes();
      shapeContainerTop.selectAll(".shape").remove();
      shapeContainerBelow.selectAll(".shape").remove();
      if (shapes) {
        mockShapesTop = [];
        mockShapesBelow = [];
        for (var i = 0; i < shapes.x.length; i++) {
          if (shapes.layer[i] === 1) {
            mockShapesTop.push({
              index: i,
              layerPosition: shapes.layerPosition[i]
            });
          } else {
            mockShapesBelow.push({
              index: i,
              layerPosition: shapes.layerPosition[i]
            });
          }
        }
        mockShapesTop.sort(function(a, b) {
          return a.layerPosition - b.layerPosition;
        });
        mockShapesBelow.sort(function(a, b) {
          return a.layerPosition - b.layerPosition;
        });
        shapeTop = shapeContainerTop.selectAll(".shape").data(mockShapesTop);
        shapeBelow = shapeContainerBelow.selectAll(".shape").data(mockShapesBelow);
        shapeEnter();
      }
    }

    function setupLines() {
      lines = model.get_lines();
      mockLinesTop.length = lines.x1.length;
      lineTop = lineContainerTop.selectAll(".line").data(mockLinesTop);
      lineTop.exit().remove();
      if (lines) {
        lineTop.enter().append("line");
        lineTop.attr({
          "class": "line",
          "x1": function(d, i) {
            return model2px(lines.x1[i]);
          },
          "y1": function(d, i) {
            return model2pxInv(lines.y1[i]);
          },
          "x2": function(d, i) {
            return model2px(lines.x2[i]);
          },
          "y2": function(d, i) {
            return model2pxInv(lines.y2[i]);
          },
          "stroke-width": function(d, i) {
            return lines.lineWeight[i];
          },
          "stroke-dasharray": function(d, i) {
            return lines.lineDashes[i];
          },
          "stroke": function(d, i) {
            return lines.lineColor[i];
          },
          "marker-start": function(d, i){
            return createCustomArrowHead(i, lines.beginStyle[i], true);
          },
          "marker-end": function(d, i){
            return createCustomArrowHead(i, lines.endStyle[i]);
          },
          "visibility": function(d, i) {
            return lines.visible[i] ? "visible" : "hidden";
          }
        });
      }
    }

    function setupAtomTrace() {
      atomsContainer.selectAll("path.atomTrace").remove();
      atomTracePath = "";

      drawAtomTrace = model.get("showAtomTrace");
      atomTraceId = model.get("atomTraceId");
      if (drawAtomTrace) {
        atomTrace = atomsContainer.selectAll("path.atomTrace").data([modelAtoms[atomTraceId]]);
        atomTraceEnter();
      }
    }

    function getAtomTracePath(d) {
      // until we implement buffered array model output properties,
      // we just keep the path history in the path string
      var dx = Math.floor(model2px(d.x) * 100) / 100,
        dy = Math.floor(model2pxInv(d.y) * 100) / 100,
        lIndex, sIndex;
      if (!atomTracePath) {
        atomTracePath = "M" + dx + "," + dy + "L";
        return "M " + dx + "," + dy;
      } else {
        atomTracePath += dx + "," + dy + " ";
      }

      // fake buffered array functionality by knocking out the first
      // element of the string when we get too big
      if (atomTracePath.length > 4000) {
        lIndex = atomTracePath.indexOf("L");
        sIndex = atomTracePath.indexOf(" ");
        atomTracePath = "M" + atomTracePath.slice(lIndex + 1, sIndex) + "L" + atomTracePath.slice(sIndex + 1);
      }
      return atomTracePath;
    }

    function updateAtomTrace() {
      atomTrace.attr({
        "d": getAtomTracePath
      });
    }

    function textDrag(d) {
      var dragDx = model2px.invert(d3.event.dx),
        dragDy = model2px.invert(d3.event.dy);

      if (!(AUTHORING && model.isStopped())) {
        // for now we don't have user-draggable textBoxes
        return;
      } else {
        d.x = d.x + dragDx;
        d.y = d.y - dragDy;
        updateTextBoxes();
      }
    }

    function setupFirefox1823Warning() {
      var b = benchmark.what_browser(); // we need to recalc this for FF, for some reason
      if (true || b.browser === "Firefox" &&
          b.version >= "18" && b.version < "23") {
        var $warning = modelView.$el.parent().find("#ff1823warning");
        if ($warning.length === 0) {
          $warning = $("<div id='ff1823warning' class='warning-pane'>" +
                       "<a href='http://blog.concord.org/serious-performance-regression-in-firefox-18-and-newer' " +
                       "class='opens-in-new-window' target='_blank'>" +
                       "Firefox v18-22 performance issue...</a></div>");
          $warning.on("click", function () {
            $(this).fadeOut();
          });
          $warning.appendTo(modelView.$el.parent());
        }
        var pos = modelView.pos();
        $warning.css({
          width: pos.width - 20,
          top: pos.bottom - $warning.height() - 10,
          left: pos.left + 10
        });
      }
    }

    function setupFirefox27Warning() {
      var b = benchmark.what_browser(); // we need to recalc this for FF, for some reason
      if (false && b.oscpu.indexOf("Windows") !== -1 &&
          b.browser === "Firefox" &&
          b.version >= "27" && b.version < "28") {
        var $warning = modelView.$el.parent().find("#ff27warning");
        if ($warning.length === 0) {
          $warning = $("<div id='ff27warning' class='warning-pane'>Firefox v27 has broken SVG " +
                       "implementation what can lead to rendering issues. We recommend to use " +
                       "a different browser until Firefox v28 is available.</div>");
          $warning.on("click", function () {
            $(this).fadeOut();
          });
          $warning.appendTo(modelView.$el.parent());
        }
        var pos = modelView.pos();
        $warning.css({
          width: pos.width - 20,
          top: pos.bottom - $warning.height() - 10,
          left: pos.left + 10
        });
      }
    }

    function setupMiscOptions() {
      // These options are still used by the obstacle force arrows.
      forceVectorColor = model.get("forceVectors").color;
      forceVectorWidth = model.get("forceVectors").width;
      createVectorArrowHeads(forceVectorColor, "force");

      // Reset custom arrow heads.
      arrowHeadsCache = {};
      atomsContainer.selectAll(".custom-arrow-head").remove();

      atomTraceColor = model.get("atomTraceColor");
    }

    function setupRendererOptions() {
      useQuantumDynamics = model.properties.useQuantumDynamics;
      if (useQuantumDynamics) {
        createExcitationGlow();
      }

      createSymbolImages();

      // Initialize renderers.
      geneticRenderer = new GeneticRenderer(modelView, model);
    }

    function photonPath(d) {
      var lineData = [],
        nPoints = 40,
        line = d3.svg.line()
          .x(function(d) {
            return model2px(0.5 / nPoints * d.x);
          })
          .y(function(d) {
            return model2px(0.1 * d.y);
          }),

        t = d.angularFrequency * 2 * Math.PI / nPoints,
        i;

      // Reference implementation: https://github.com/concord-consortium/mw/blob/6e2f2d4630323b8e993fcfb531a3e7cb06644fef/src/org/concord/mw2d/models/Photon.java#L74-L79
      for (i = 0; i < nPoints; i++) {
        lineData.push({
          x: i - nPoints / 2,
          y: Math.sin(i * t) / (1 + 0.01 * (i - 0.5 * nPoints) * (i - 0.5 * nPoints))
        });
      }

      return line(lineData);
    }

    function enterAndUpdatePhotons() {
      var photons = atomsContainer
        .selectAll(".photon")
        .data(model.getPhotons(), function(d) {
          return d.id;
        });

      photons.enter().append("path")
        .attr({
          "class": "photon",
          "d": photonPath,
          "stroke-width": 0.5,
          "stroke": "rgba(0,0,0,0.8)",
          "fill-opacity": 0
        });

      photons.exit().remove();

      photons.attr("transform", function(d) {
        return "translate(" + model2px(d.x) + ", " + model2pxInv(d.y) + ") " +
          "rotate(" + d.angle + ")";
      });

    }

    //
    // *** Main Renderer functions ***
    //

    //
    // MD2D Renderer: setup
    //

    function setup() {
      model2px = modelView.model2px;
      model2pxInv = modelView.model2pxInv;

      fontSizeInPixels = modelView.getFontSizeInPixels();

      modelAtoms = model.getAtoms();
      modelElectricField = model.getElectricField();
      modelElements = model.get_elements();
      modelWidth = model.get('width');
      modelHeight = model.get('height');
      aspectRatio = modelWidth / modelHeight;

      setupRendererOptions();

      // Subscribe for model events.
      model.addPropertiesListener(["temperatureControl", "keShading"], drawSymbolImages);

      function redrawClickableObjects(redrawOperation) {
        return function() {
          redrawOperation();
          // All objects where repainted (probably removed and added again), so
          // it's necessary to apply click handlers again.
          modelView.updateClickHandlers();
        };
      }

      function setupElectricField() {
        electricFieldRenderer.setup();
        modelView.renderCanvas();
      }

      // Redraw container each time when some visual-related property is changed.
      model.addPropertiesListener([
          "chargeShading", "showChargeSymbols", "useThreeLetterCode",
          "showAtomTrace", "atomTraceId", "aminoAcidColorScheme",
          "backgroundColor", "markColor", "forceVectorsDirectionOnly"
        ],
        redrawClickableObjects(repaint));

      // Vectors:
      model.addPropertiesListener(["electricFieldDensity", "showElectricField", "electricFieldColor"],
        setupElectricField);
      model.addPropertiesListener(["showVelocityVectors", "velocityVectors"], function () {
        velocityVectorsRenderer.setup();
        modelView.renderCanvas();
      });
      model.addPropertiesListener(["showForceVectors", "forceVectors", "forceVectorsDirectionOnly"], function () {
        forceVectorsRenderer.setup();
        modelView.renderCanvas();
      });
      model.addPropertiesListener(["showVDWLines", "VDWLinesCutoff"], function () {
        vdwLinesRenderer.setup();
        modelView.renderCanvas();
      });

      model.on('addAtom', redrawClickableObjects(function () {
        atomsRenderer.setup();
        velocityVectorsRenderer.setup();
        forceVectorsRenderer.setup();
        electricFieldRenderer.update();
        modelView.renderCanvas();
      }));
      model.on('removeAtom', redrawClickableObjects(function () {
        atomsRenderer.setup();
        velocityVectorsRenderer.setup();
        forceVectorsRenderer.setup();
        electricFieldRenderer.update();
        modelView.renderCanvas();
      }));
      model.on('addRadialBond', redrawClickableObjects(function () {
        bondsRenderer.setup();
        modelView.renderCanvas();
      }));
      model.on('removeRadialBond', redrawClickableObjects(function () {
        bondsRenderer.setup();
        modelView.renderCanvas();
      }));
      model.on('textBoxesChanged', redrawClickableObjects(drawTextBoxes));
      model.on('imagesChanged', redrawClickableObjects(imagesRenderer.setup));
      model.on('addElectricField', setupElectricField);
      model.on('removeElectricField', setupElectricField);
      model.on('changeElectricField', setupElectricField);

      setupFirefox1823Warning();
      setupFirefox27Warning();

      isSetup = true;
    }

    // Call when model is reset or reloaded.

    function bindModel(newModel) {
      model = newModel;
      atomsRenderer.bindModel(newModel);
      bondsRenderer.bindModel(newModel);
      vdwLinesRenderer.bindModel(newModel);
      imagesRenderer.bindModel(newModel);
      setup();
    }

    //
    // MD2D Renderer: repaint
    //
    // Call when container being rendered into changes size, in that case
    // pass in new D3 scales for model2px transformations.
    //
    // Also call when the number of objects changes such that the container
    // must be setup again.
    //

    function repaint(m2px, m2pxInv) {
      if (arguments.length) {
        model2px = m2px;
        model2pxInv = m2pxInv;
      }
      fontSizeInPixels = modelView.getFontSizeInPixels();

      setupMiscOptions();
      setupObstacles();
      atomsRenderer.setup();
      bondsRenderer.setup();
      vdwLinesRenderer.setup();
      setupShapes();
      setupLines();
      geneticRenderer.setup();
      velocityVectorsRenderer.setup();
      forceVectorsRenderer.setup();
      electricFieldRenderer.setup();
      setupAtomTrace();
      imagesRenderer.setup();
      drawTextBoxes();
      drawSymbolImages();
      setupFirefox1823Warning();
      setupFirefox27Warning();
      if (useQuantumDynamics) {
        enterAndUpdatePhotons();
      }
    }

    //
    // MD2D Renderer: update
    //
    // Call to update visualization when model result state changes.
    // Normally called on every model tick.
    //

    function update() {
      console.time('view update');
      if (obstacles) {
        obstacle.attr("transform", function(d, i) {
          return "translate(" + model2px(obstacles.x[i]) + " " + model2pxInv(obstacles.y[i] + obstacles.height[i]) + ")";
        });
      }

      if (shapes) {
        shapeTop.attr("transform", function(d) {
          return "translate(" + model2px(shapes.x[d.index]) + " " + model2pxInv(shapes.y[d.index] + shapes.height[d.index]) + ")";
        });
        shapeBelow.attr("transform", function(d) {
          return "translate(" + model2px(shapes.x[d.index]) + " " + model2pxInv(shapes.y[d.index] + shapes.height[d.index]) + ")";
        });
      }

      atomsRenderer.update();
      bondsRenderer.update();
      vdwLinesRenderer.update();
      velocityVectorsRenderer.update();
      forceVectorsRenderer.update();
      electricFieldRenderer.update();

      if (drawAtomTrace) {
        updateAtomTrace();
      }
      if (model.properties.images && model.properties.images.length !== 0) {
        imagesRenderer.update();
      }
      if (textBoxes && textBoxes.length > 0 && !onlyStaticTextBoxes) {
        // Update text boxes properties only when at least one of them is attached to some movable
        // object like atom or obstacle.
        updateTextBoxes();
      }
      if (useQuantumDynamics) {
        enterAndUpdatePhotons();
      }
      console.timeEnd('view update');
    }

    //
    // Public API to instantiated Renderer
    //
    api = {
      // Expose private methods.
      setup: function() {
        if (!isSetup) {
          setup();
        }
      },

      update: function() {
        if (isSetup) {
          update();
        }
      },

      repaint: function() {
        if (isSetup) {
          repaint();
        }
      },

      bindModel: bindModel
    };

    return api;
  };
});
