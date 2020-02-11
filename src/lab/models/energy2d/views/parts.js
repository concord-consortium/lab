/*global define: false, d3: false */

// Classic version of Energy2D was rendering rectangles with small shift.
// If we do the same then converted models look better.
var E2D_XY_SHIFT = 1,
  E2D_DIM_SHIFT = 2;

export default function PartsView(SVGContainer, g) {
  var api,
    parts,

    m2px = SVGContainer.model2px,
    m2pxInv = SVGContainer.model2pxInv,

    shapeTest = {
      "rect": function(d) {
        return d.shapeType === "rectangle" ? this : null;
      },
      "ellipse": function(d) {
        return d.shapeType === "ellipse" ? this : null;
      },
      "path": function(d) {
        return d.shapeType === "polygon" || d.shapeType === "ring" ? this : null;
      }
    },

    ringPathSpec = d3.svg.arc()
    .innerRadius(function(d) {
      return m2px(d.inner * 0.5);
    })
    .outerRadius(function(d) {
      return m2px(d.outer * 0.5);
    })
    .startAngle(0)
    .endAngle(Math.PI * 2),

    dragBehavior = (function() {
      var x, y, minX, maxX, minY, maxY, bbox;
      return d3.behavior.drag()
        .origin(function(d) {
          return {
            x: m2px(d.x),
            y: m2pxInv(d.y)
          };
        })
        .on("dragstart", function(d) {
          var rx, ry;
          if (d.draggable) {
            x = y = null;
            rx = m2px.range();
            ry = m2pxInv.range();
            minX = Math.min(rx[0], rx[1]);
            maxX = Math.max(rx[0], rx[1]);
            minY = Math.min(ry[0], ry[1]);
            maxY = Math.max(ry[0], ry[1]);
            bbox = this.getBBox();
            bbox.x0 = bbox.x + 10;
            bbox.y0 = bbox.y + 10;
            bbox.x1 = bbox.x + bbox.width - 10;
            bbox.y1 = bbox.y + bbox.height - 10;
            d3.select(this).style("opacity", 0.7);
          }
        })
        .on("drag", function(d) {
          if (d.draggable) {
            x = d3.event.x;
            y = d3.event.y;
            x -= Math.max(0, bbox.x0 + x - maxX) + Math.min(0, bbox.x1 + x - minX);
            y -= Math.max(0, bbox.y0 + y - maxY) + Math.min(0, bbox.y1 + y - minY);
            d3.select(this).attr("transform", "translate(" + x + "," + y + ")");
          }
        })
        .on("dragend", function(d) {
          if (d.draggable) {
            d3.select(this).style("opacity", 1);
            if (x !== null) { // no need to check 'y' too
              d.x = m2px.invert(x);
              d.y = m2pxInv.invert(y);
            }
          }
        });
    }());

  function transform(d) {
    return "translate(" + m2px(d.x || 0) + "," + m2pxInv(d.y || 0) + ")";
  }

  function width(d) {
    return m2px(d.width) + E2D_DIM_SHIFT;
  }

  function height(d) {
    return m2px(d.height) + E2D_DIM_SHIFT;
  }

  function rx(d) {
    return m2px(d.a * 0.5);
  }

  function ry(d) {
    return m2px(d.b * 0.5);
  }

  function visibility(d) {
    return d.visible ? "visible" : "hidden";
  }

  function textureFill(d) {
    return d.texture ? "url(#texture-1)" : "none";
  }

  function label(d) {
    return d.computeLabel();
  }

  function dx() {
    return -this.getBBox().width / 2;
  }

  function fill(d) {
    if (!d.filled) return 'rgba(0, 0, 0, 0)';
    var color;
    if (d.color === "auto") {
      if (d.power > 0) {
        color = '#FFFF00';
      } else if (d.power < 0) {
        color = '#B0C4DE';
      } else if (d.constant_temperature) {
        // Heatmap will be visible.
        color = 'rgba(0, 0, 0, 0)';
      } else {
        color = "#999";
      }
    } else {
      // Typical color definition.
      color = d.color;
      // TODO: this should be done during XML->JSON conversion.
      if (!isNaN(parseInt(color, 16))) {
        while (color.length < 6) {
          color = '0' + color;
        }
        color = '#' + color;
      }
    }
    return color;
  }

  function polygonPathSpec(d) {
    var res = [],
      x = d.raw_x_coords,
      y = d.raw_y_coords,
      i, len;
    for (i = 0, len = x.length; i < len; i++) {
      res.push(m2px(x[i]));
      res.push(m2pxInv(y[i]));
    }
    return "M" + res.join(",") + "Z";
  }

  function pathSpec(d) {
    switch (d.shapeType) {
      case "polygon":
        return polygonPathSpec(d);
      case "ring":
        return ringPathSpec(d);
    }
  }

  function xLabel(d) {
    var s = d.shapeType;
    return s === "rectangle" || s === "polygon" ? this.parentNode.firstElementChild.getBBox().width / 2 : 0;
  }

  function yLabel(d) {
    var s = d.shapeType;
    return s === "rectangle" || s === "polygon" ? this.parentNode.firstElementChild.getBBox().height / 2 : 0;
  }

  function generateTextures() {
    var p = g.append("defs").append("pattern")
      .attr("id", "texture-1")
      .attr("patternUnits", "userSpaceOnUse")
      .attr("x", 0)
      .attr("y", 0)
      .attr("width", "0.7em")
      .attr("height", "0.7em")
      .attr("viewBox", "0 0 16 16");
    p.append("path")
      .attr("class", "e2d-texture-path-shadow")
      .attr("d", "M0,0 L16,16 M-1,15 L1,17 M15,-1 L17,1");
    p.append("path")
      .attr("class", "e2d-texture-path")
      .attr("d", "M0,0 L16,16 M-1,15 L1,17 M15,-1 L17,1");
  }

  function renderShape(shape, enter, update) {
    enter = enter.select(shapeTest[shape]);
    enter.append(shape)
      .attr("class", "e2d-part-shape");
    enter.append(shape)
      .attr("class", "e2d-part-shape-outline")
      .attr("fill", textureFill);

    // Propagate data.
    update.select(".e2d-part-shape");
    update.select(".e2d-part-shape-outline");

    switch (shape) {
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
    enter.append("text")
      .attr("class", "e2d-part-label-shadow")
      .attr("dy", ".35em");
    enter.append("text")
      .attr("class", "e2d-part-label")
      .attr("dy", ".35em");

    // Propagate data.
    update.select(".e2d-part-label");
    update.select(".e2d-part-label-shadow");
    update.selectAll(".e2d-part-label, .e2d-part-label-shadow")
      .text(label)
      .attr("dx", dx)
      .attr("x", xLabel)
      .attr("y", yLabel);
  }

  // Public API.
  api = {
    renderParts: function() {
      if (!parts) return;

      var part, partEnter;

      part = g.selectAll(".e2d-part").data(parts);
      partEnter = part.enter().append("g")
        // "part" class is useful for onClick handles, so author
        // can call: onClick("part", function () { ... }).
        .attr("class", "e2d-part part");

      renderShape("rect", partEnter, part);
      renderShape("ellipse", partEnter, part);
      renderShape("path", partEnter, part);
      renderLabels(partEnter, part);

      partEnter.call(dragBehavior);

      part
        .attr("transform", transform);
      part.select(".e2d-part-shape")
        .attr("fill", fill)
        .style("visibility", visibility);

      part.exit().remove();
    },

    bindPartsArray: function(newParts) {
      parts = newParts;
    }
  };

  (function() {
    generateTextures();
  }());

  return api;
};
