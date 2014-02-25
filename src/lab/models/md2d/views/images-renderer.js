define(function(require) {

  var labConfig = require('lab.config');
  var UPPER_LEFT = 0;
  var CENTER = 1;

  return function ImagesRenderer(modelView, model) {
    // A collection of image dimensions for each <image> src that has been seen by the renderer.
    var imgDimBySrc = {};

    // Nested arrays of data about the requested images, ready to be joined to the d3 selection.
    var imageData;

    // In order to center and scale images correctly, we need their actual width and height.
    // However, this information loads asynchronously, so the width and height adjustments may need
    // to happen after we have completed setting up images.
    // Therefore, call this method before creating an <image> element with the given src.
    // It will create an Image object with that src, if we do not already have one, and when the
    // Image finishes loading it will update the width and height of any images in the image
    // container which have the same src.
    function loadImage(src) {
      if (imgDimBySrc[src]) {
        return;
      }

      // Create placeholder, it will be updated when image is loaded.
      imgDimBySrc[src] = {
        width: 0,
        height: 0
      };

      var image = new Image();
      image.src = src;
      image.onload = function() {
        // IE11 workaround - without adding an image to DOM, we can't get its correct dimensions.
        // When image src refers to an SVG image, its width and height will be always reported as 0.
        // See: https://www.pivotaltracker.com/story/show/66376534
        var $image = $(image).appendTo("body");
        var imageDim = imgDimBySrc[src];
        imageDim.width = $image.width();
        imageDim.height = $image.height();
        $image.remove();
        // Resize and recenter any instances of this image currently in the DOM.
        d3.select(modelView.node)
          .selectAll('image').each(function() {
            if (d3.select(this).attr('xlink:href') === src) {
              d3.select(this)
                .attr('width', scaleImageLength(imageDim.width))
                .attr('height', scaleImageLength(imageDim.height))
                .attr('transform', translateImage);
            }
          });

        // This selector-based alternative to the .each() above actually works in Chrome, but other
        // (conforming!) browsers require that 'src' be CSS escaped first
        // (see http://mathiasbynens.be/notes/css-escapes)
        //
        // d3.select(modelView.node)
        //   .selectAll('image[*|href="' + src + '"')
        //   .attr(...)
      };
    }

    // Images prepared for Classic MW have 1 pixel == 0.1 Angstrom (0.01 nm). Therefore, convert
    // image dimension from "Classic MW pixels", to nm, to onscreen pixels.
    function scaleImageLength(l) {
      return modelView.model2px(0.01 * l);
    }

    // Sets 'imageData' to a nested array of information about the requested images which can be
    // joined to the nested d3 selection in setup() in order to append the actual <image> elements.
    function setupImageData() {
      imageData = [[], []];

      (model.properties.images || []).forEach(function(desc) {
        var layer = desc.imageLayer === 1 ? imageData[1] : imageData[0];
        var src = getImagePath(desc);
        var referencePoint;
        var capturesPointer;
        var x;
        var y;

        if (desc.imageHostType) {
          // imageHostType => image is "attached" to an atom or obstacle, and x and y specify the
          // model coordinates of its center.
          referencePoint = CENTER;
          // Images attached to objects still allow the underlying object to be dragged.
          capturesPointer = false;
        } else {
          // no imageHostType => image is at a fixed coordinate in the model space, and x and y
          // specify the model coordinates of its upper left corner.
          referencePoint = UPPER_LEFT;
          // Unattached images prevent dragging of whatever is beneath them, in the usual way.
          capturesPointer = true;
          // Update x and y now; updateImageCoordinates will be a noop.
          x = modelView.model2px(desc.imageX);
          y = modelView.model2pxInv(desc.imageY);
        }

        loadImage(src);

        layer.push({
          imageDescription: desc,
          src:              src,
          x:                x,
          y:                y,
          referencePoint:   referencePoint,
          capturesPointer:  capturesPointer,
          zOrder:           desc.imageLayerPosition || 0,
          visible:          desc.visible
        });
      });

      // Finally, because imageData for each layer is 1:1 with svg image elements, sort the
      // imageData for each layer by the intended z order of the images.
      imageData.forEach(function(layer) {
        layer.sort(function(a, b) {
          return d3.ascending(a.zOrder, b.zOrder);
        });
      });

      updateImageCoordinates();
    }

    // Update just the x, y of each element in imageData (except for fixed elements)
    function updateImageCoordinates() {
      imageData.forEach(function(layer) {
        layer.forEach(function(datum) {

          var imageDescription = datum.imageDescription;
          var hostType = imageDescription.imageHostType;
          var index    = imageDescription.imageHostIndex;
          var atoms;
          var obstacles;
          var x, y;

          if (hostType === 'Atom') {
            atoms = model.getAtoms();
            x = atoms[index].x;
            y = atoms[index].y;
          } else if(hostType === 'RectangularObstacle') {
            obstacles = model.get_obstacles();
            x = obstacles.x[index] + obstacles.width[index] / 2;
            y = obstacles.y[index] + obstacles.height[index] / 2;
          }

          if (x !== undefined) {
            datum.x = modelView.model2px(x);
            datum.y = modelView.model2pxInv(y);
          }
        });
      });
    }

    function getImagePath(imageDescription) {
      var imageMapping = model.properties.imageMapping;
      var basePath;

      if (model.properties.imagePath) {
        basePath = labConfig.actualRoot + model.properties.imagePath;
      } else if (modelView.url) {
        basePath = labConfig.actualRoot + modelView.url.slice(0, modelView.url.lastIndexOf("/") + 1);
      }

      return basePath + (imageMapping[imageDescription.imageUri] || imageDescription.imageUri);
    }

    // A 2d translation that centers the image, if required.
    function translateImage(d) {
      if (d.referencePoint === UPPER_LEFT) {
        return "";
      }
      var image = imgDimBySrc[d.src];
      return "translate(" + (-scaleImageLength(image.width/2)) + "," +
                            (-scaleImageLength(image.height/2)) +")";
    }

    // Called whenever the set of images or their ordering change in some way.
    function setup() {
      setupImageData();

      d3.select(modelView.node).selectAll('.image-container')
        .data(imageData)
        .each(function(d) {
          var images = d3.select(this).selectAll('image').data(d);
          images.enter().append('image');
          images.attr({
            'xlink:href': function(d) { return d.src; },
            x: function(d) { return d.x; },
            y: function(d) { return d.y; },
            height: function (d) { return scaleImageLength(imgDimBySrc[d.src].height); },
            width:  function (d) { return scaleImageLength(imgDimBySrc[d.src].width); },
            transform: translateImage,
            'pointer-events': function(d) { return d.capturesPointer ? 'auto' : 'none'; }
          });
          images.style('display', function(d) { return d.visible ? '' : 'none'; });

          images.exit().remove();
        });
    }

    // Called for every tick; just updates image coordinates.
    function update() {
      updateImageCoordinates();

      // No need for a nested selection as all images are already bound to the correct data items.
      // Just need to let d3 know it should reapply x, y because the data items have been updated.
      d3.select(modelView.node).selectAll('.image-container image')
        .attr({
          x: function(d) { return d.x; },
          y: function(d) { return d.y; },
        });
     }

    function bindModel(_model) {
      model = _model;
    }

    return {
      setup: setup,
      update: update,
      bindModel: bindModel
    };
  };
});
