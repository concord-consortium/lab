/* jshint loopfunc: true*/

define(function(require) {

  var labConfig = require('lab.config');

  return function ImagesRenderer(modelView, model, containers) {
    var imageSizes = [];

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

    function getImageCoords(i) {
      var imagesDescription = model.properties.images;
      var atoms = model.getAtoms();
      var obstacles = model.get_obstacles();
      var model2px = modelView.model2px;
      var model2pxInv = modelView.model2pxInv;

      var props = imagesDescription[i],
        x, y, img_width, img_height;

      if (props.imageHostType) {
        if (props.imageHostType === "Atom") {
          x = atoms[props.imageHostIndex].x;
          y = atoms[props.imageHostIndex].y;
        } else if (props.imageHostType === "RectangularObstacle") {
          x = obstacles.x[props.imageHostIndex] + (obstacles.width[props.imageHostIndex] / 2);
          y = obstacles.y[props.imageHostIndex] + (obstacles.height[props.imageHostIndex] / 2);
        }
        img_width = imageSizes[i][0];
        img_height = imageSizes[i][1];
        x = x - img_width / 2;
        y = y + img_height / 2;
      } else {
        x = props.imageX;
        y = props.imageY;
      }
      return [model2px(x), model2pxInv(y)];
    }

    function setup() {
      var imageProp = model.properties.images;
      var model2px = modelView.model2px;

      var img = [],
        imglayer,
        container,
        i,
        positionOrder,
        positionOrderTop = [],
        positionOrderBelow = [];

      containers.above.selectAll("image").remove();
      containers.below.selectAll("image").remove();

      if (!imageProp) return;

      for (i = 0; i < imageProp.length; i++) {
        img[i] = new Image();
        img[i].src = getImagePath(imageProp[i]);
        img[i].onload = (function(i) {
          return function() {
            imglayer = imageProp[i].imageLayer;
            positionOrder = imglayer === 1 ? positionOrderTop : positionOrderBelow;
            positionOrder.push({
              i: i,
              zOrder: ( !! imageProp[i].imageLayerPosition) ? imageProp[i].imageLayerPosition : 0
            });
            positionOrder.sort(function(a, b) {
              return d3.ascending(a["zOrder"], b["zOrder"]);
            });
            // In Classic MW model size is defined in 0.1A.
            // Model unit (0.1A) - pixel ratio is always 1. The same applies
            // to images. We can assume that their pixel dimensions are
            // in 0.1A also. So convert them to nm (* 0.01).
            imageSizes[i] = [0.01 * img[i].width, 0.01 * img[i].height];
            container = imglayer === 1 ? containers.above : containers.below;
            container.selectAll("image").remove();
            container.selectAll("image")
              .data(positionOrder, function(d) {
                return d.i;
              })
              .enter().append("image")
              .attr("x", function(d) {
                return getImageCoords(d.i)[0];
              })
              .attr("y", function(d) {
                return getImageCoords(d.i)[1];
              })
              .attr("class", function(d) {
                return "image_attach" + d.i;
              })
              .attr("xlink:href", function(d) {
                return img[d.i].src;
              })
              .attr("width", function(d) {
                return model2px(imageSizes[d.i][0]);
              })
              .attr("height", function(d) {
                return model2px(imageSizes[d.i][1]);
              })
              .attr("pointer-events", function(d) {
                // Make images transparent for mouse events when they are attached to atoms or
                // obstacles. In such case interactivity of image will be defined by the
                // interactivity of the host object.
                if (imageProp[d.i].imageHostType) return "none";
                return "auto";
              });
          };
        })(i);
      }
    }

    function update() {
      var imagesDescription = model.properties.images;

      var numImages, imglayer, container, coords, i;
      numImages = imagesDescription.length;
      for (i = 0; i < numImages; i++) {
        if (!imageSizes || !imageSizes[i]) continue;
        coords = getImageCoords(i);
        imglayer = imagesDescription[i].imageLayer;
        container = imglayer === 1 ? containers.above : containers.below;
        container.selectAll("image.image_attach" + i)
          .attr("x", coords[0])
          .attr("y", coords[1]);
      }
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
