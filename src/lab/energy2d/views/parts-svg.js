/*global define: false, d3: false */

define(function () {

  // Classic version of Energy2D was rendering rectangles with small shift.
  // If we do the same then converted models look better.
  var E2D_XY_SHIFT = -1,
      E2D_DIM_SHIFT = 2;

  return function PartsSVGRenderer(SVGContainer, g) {
    var api,
        parts,

        m2px = SVGContainer.model2px,
        m2pxInv = SVGContainer.model2pxInv,

        shapeTest = {
          "rect":    function (d) { return d.shapeType === "rectangle" ? this : null; },
          "ellipse": function (d) { return d.shapeType === "ellipse" ? this : null; },
          "path": function (d) { return d.shapeType === "polygon" || d.shapeType === "ring" ? this : null; }
        },

        ringPathSpec = d3.svg.arc()
            .innerRadius(function (d) { return m2px(d.inner * 0.5); })
            .outerRadius(function (d) { return m2px(d.outer * 0.5); })
            .startAngle(0)
            .endAngle(Math.PI * 2);

    function labelTest(d) { return d.label ? this : null; }
    function textureTest(d) { return d.texture ? this : null; }

    function transform(d) { return "translate(" + m2px(d.x || 0) + "," + m2pxInv(d.y || 0) + ")"; }
    function width(d) { return m2px(d.width) + E2D_DIM_SHIFT; }
    function height(d) { return m2px(d.height) + E2D_DIM_SHIFT; }
    function rx(d) { return m2px(d.a * 0.5); }
    function ry(d) { return m2px(d.b * 0.5); }
    function display(d) { return d.visible ? undefined : "none"; }
    function label(d) { return d.computeLabel(); }
    function dx() { return -this.getBBox().width / 2; }
    function fill(d) {
      if (!d.filled) return 'rgba(0, 0, 0, 0)';

      var color;
      if (d.color) {
        if (typeof d.color === 'string') {
          color = d.color;
        } else {
          color = d.color.toString();
          while (d.length < 6) {
            color = '0' + color;
          }
        }
        // TODO: this should be done during XML->JSON conversion.
        if (!isNaN(parseInt(color, 16))) color = '#' + color;
      } else if (d.power > 0) {
        color = '#FFFF00';
      } else if (d.power < 0) {
        color = '#B0C4DE';
      } else if (d.constant_temperature) {
        // Heatmap will be visible.
        color = 'rgba(0, 0, 0, 0)';
      } else {
        color = "gray";
      }
      return color;
    }
    function polygonPathSpec(d) {
      var res = [],
          x = d.x_coords,
          y = d.y_coords,
          i, len;
      for (i = 0, len = x.length; i < len; i++) {
        res.push(m2px(x[i]));
        res.push(m2pxInv(y[i]));
      }
      return "M" + res.join(",") + "Z";
    }
    function pathSpec(d) {
      switch (d.shapeType ) {
      case "polygon":
        return polygonPathSpec(d);
      case "ring":
        return ringPathSpec(d);
      }
    }
    function xLabel (d) {
      var s = d.shapeType;
      return s === "rectangle" || s === "polygon" ? this.parentNode.firstElementChild.getBBox().width / 2 : 0;
    }
    function yLabel (d) {
      var s = d.shapeType;
      return s === "rectangle" || s === "polygon" ? this.parentNode.firstElementChild.getBBox().height / 2 : 0;
    }

    function generateTextures() {
      g.append("defs").append("pattern")
          .attr("id", "texture-1")
          .attr("patternUnits", "userSpaceOnUse")
          .attr("x", 0)
          .attr("y", 0)
          .attr("width", 8)
          .attr("height", 8)
        .append("path")
          .attr("d", "M0,0 L8,8");
    }

    function renderShape(shape, enter, update) {
      enter = enter.select(shapeTest[shape]);
      enter.append(shape)
          .attr("class", "e2d-part-shape");
      enter.select(textureTest).append(shape)
          .attr("fill", "url(#texture-1)");

      switch(shape) {
      case "rect":
        update.selectAll("rect")
            .attr("x", E2D_XY_SHIFT)
            .attr("y", E2D_XY_SHIFT)
            .attr("width", width)
            .attr("height", height);
        break;
      case "ellipse":
        update.selectAll("ellipse")
            .attr("rx", rx)
            .attr("ry", ry);
        break;
      case "path":
        update.selectAll("path")
            .attr("d", pathSpec);
        break;
      }
    }

    function renderLabels(enter, update) {
      enter.select(labelTest).append("text")
          .attr("class", "e2d-part-label")
          .attr("dy", ".35em");
      update.select("text")
          .text(label)
          .attr("dx", dx)
          .attr("x", xLabel)
          .attr("y", yLabel);
    }

    // Public API.
    api = {
      renderParts: function () {
        if (!parts) return;

        var part, partEnter;

        part = g.selectAll(".e2d-part").data(parts);
        partEnter = part.enter().append("g")
            .attr("class", "e2d-part");

        renderShape("rect", partEnter, part);
        renderShape("ellipse", partEnter, part);
        renderShape("path", partEnter, part);
        renderLabels(partEnter, part);

        part
            .attr("transform", transform);
        part.select(".e2d-part-shape")
            .attr("fill", fill)
            .style("display", display);

        part.exit().remove();
      },

      bindPartsArray: function (newParts) {
        parts = newParts;
      }
    };

    (function () {
      generateTextures();
    }());

    return api;
  };
});
