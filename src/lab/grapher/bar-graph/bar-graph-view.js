/*global define, d3, $ */

define(function (require) {
  // Dependencies.
  var Backbone  = require('backbone'),

      VIEW = {
        padding: {
          top:    7,
          bottom: 7
        }
      },

      // Get real width SVG of element using bounding box.
      getRealWidth = function (d3selection) {
        return d3selection.node().getBBox().width;
      },

      // Get real height SVG of element using bounding box.
      getRealHeight = function (d3selection) {
        return d3selection.node().getBBox().height;
      },

      // Bar graph scales itself according to the font size.
      // We assume some CANONICAL_FONT_SIZE. All values which should
      // be scaled, should use returned function.
      CANONICAL_FONT_SIZE = 16,
      getScaleFunc = function (fontSize) {
        var factor = fontSize / CANONICAL_FONT_SIZE;

        return function (val) {
          return val * factor;
        };
      },

      setupValueLabelPairs = function (yAxis, ticks) {
        var values = [],
            labels = {},
            i, len;

        for (i = 0, len = ticks.length; i < len; i++) {
          values[i] = ticks[i].value;
          labels[values[i]] = ticks[i].label;
        }

        yAxis
          .tickValues(values)
          .tickFormat(function (value) {
            return labels[value];
          });
      },

      BarGraphView = Backbone.View.extend({
        // Container is a DIV.
        tagName: "div",

        className: "bar-graph",

        initialize: function () {
          // Create all SVG elements ONLY in this function.
          // Avoid recreation of SVG elements while rendering.
          this.vis = d3.select(this.el).append("svg");
          this.defs = this.vis.append("defs");
          this.axisContainer = this.vis.append("g");
          this.fill = this.vis.append("rect");
          this.bar = this.vis.append("rect");
          this.gridContainer = this.vis.append("g");
          this.trianglePos = this.vis.append("g");
          this.traingle = this.trianglePos.append("polygon");
          this.title = this.vis.append("text");

          this.yScale = d3.scale.linear();
          this.heightScale = d3.scale.linear();
          this.yAxis = d3.svg.axis();

          this.scale = null;
          this.barWidth = null;

          // Register callbacks!
          this.model.on("change", this.modelChanged, this);
        },

        // Render whole bar graph.
        render: function () {
              // toJSON() returns all attributes of the model.
              // This is equivalent to many calls like:
              // property1 = model.get("property1");
              // property2 = model.get("property2");
              // etc.
          var options    = this.model.toJSON(),
              fontSize   = parseFloat(this.$el.css("font-size")),
              // Scale function.
              scale      = getScaleFunc(fontSize),
              // Basic padding (scaled).
              paddingTop    = scale(VIEW.padding.top),
              paddingBottom = scale(VIEW.padding.bottom),
              offset = 0;

          this.scale = scale;

          this.$el.outerHeight(options.height);
          this.svgHeight = this.$el.innerHeight();

          // Setup SVG element.
          this.vis
            .attr({
              "width":  600,
              "height": this.svgHeight
            })
            .style({
              "font-size": "1em"
            });

          // Setup Y scale.
          this.yScale
            .domain([options.minValue, options.maxValue])
            .range([this.svgHeight - paddingTop, paddingBottom]);

          // Setup scale used to translation of the bar height.
          this.heightScale
            .domain([options.minValue, options.maxValue])
            .range([0, this.svgHeight - paddingTop - paddingBottom]);

          // Render elements from left to right.

          this.axisContainer.selectAll("*").remove();
            if (options.ticks > 0 && options.displayLabels) {
            // Setup Y axis.
            this.yAxis
              .scale(this.yScale)
              .tickPadding(0)
              .tickSize(0, 0, 0)
              .orient("right");

            if (typeof options.ticks === "number") {
              // Just normal tics.
              this.yAxis
                .ticks(options.ticks)
                .tickFormat(d3.format(options.labelFormat));
            } else {
              // Array with value - label pairs.
              setupValueLabelPairs(this.yAxis, options.ticks);
            }

            // Create and append Y axis.
            this.axisContainer
              .call(this.yAxis);

            // Style Y axis labels.
            this.axisContainer.selectAll("text")
              .style({
                "fill": options.textColor,
                "stroke": "none",
                "font-size": "0.7em"
            });

            // Note that this *have* to be done after all styling to get correct width of bounding box!
            offset += getRealWidth(this.axisContainer) + scale(7);
          }

          // Setup background of the bar.
          this.fill
            .attr({
              "width": options.width,
              "height": this.heightScale(options.maxValue),
              "x": offset,
              "y": this.yScale(options.maxValue),
              "rx": "0.5em",
              "ry": "0.5em"
            })
            .style({
              "fill": this._getFillGradient(options.fillColor)
            });

          // Setup the main bar.
          this.bar
            .attr({
              "width": options.width,
              "x": offset,
              "rx": "0.5em",
              "ry": "0.5em"
            })
            .style({
              "fill": this._getBarGradient(options.barColor)
            });

          this.barWidth = getRealWidth(this.fill);

          this.traingle
            .classed("triangle", true)
            .attr({
              "points": "-15,-7 -15,7 -1,0",
              "transform": "translate(" + (offset + this.barWidth) + ") scale(" + scale(1) + ")"
            });

          this._setupGrid(offset);

          offset += this.barWidth;

          // Setup title.
          if (options.title) {
            this.title
              .text(options.title)
              .style({
                "font-size": "1em",
                "text-anchor": "middle",
                "fill": options.textColor
              });

            offset += scale(7);

            this.title
              .attr("transform", "translate(" + offset + ", " + this.svgHeight / 2 + ") rotate(90)");

            offset += parseFloat($(this.title.node()).css("font-size"));
          }

          this.vis.attr("width", (offset / fontSize) + "em");

          // Finally, update values display.
          this.update();
        },

        // Updates only bar height.
        update: function () {
          var value       = this.model.get("value"),
              secondValue = this.model.get("secondValue"),
              gridThreshold = value * 0.95;

          this.bar
            .attr("height", this.heightScale(value))
            .attr("y", this.yScale(value));

          this.grid
            .style("opacity", function (d) {
              return d < gridThreshold ? 0.7 : 0;
            });

          if (typeof secondValue !== 'undefined' && secondValue !== null) {
            this.traingle.classed("hidden", false);
            this.trianglePos.attr("transform", "translate(0," + this.yScale(secondValue) + ")");
          } else {
            this.traingle.classed("hidden", true);
          }
        },

        // This function should be called whenever model attribute is changed.
        modelChanged: function () {
          var changedAttributes = this.model.changedAttributes(),
              count = 0,
              valChanged, secValChanged, name;

          // There are two possible cases:
          // - Only "value" or "secondValue" have changed, so update only values
          //   displays.
          // - Other attributes have changed, so redraw whole bar graph.

          // Case 1. Check how many attributes have been changed.
          for (name in changedAttributes) {
            if (changedAttributes.hasOwnProperty(name)) {
              count++;
              if (count > 2) {
                // If 3 or more, redraw whole bar graph.
                this.render();
                return;
              }
            }
          }

          valChanged = typeof changedAttributes.value !== 'undefined';
          secValChanged = typeof changedAttributes.secondValue !== 'undefined';
          // Case 2. 1 or 2 attributes have changed, check if they are "value" and "secondValue".
          if ((count === 1 && (valChanged || secValChanged)) ||
              (count === 2 && (valChanged && secValChanged))) {
            this.update();
          } else {
            this.render();
          }
        },

        _getBarGradient: function (color) {
          var id = "bar-gradient",
              gradient = this.defs.select("#" + id);

          color = d3.rgb(color);

          if (gradient.empty()) {
            // Create a new gradient.
            gradient = this.defs.append("linearGradient")
              .attr("id", id)
              .attr("x1", "0%")
              .attr("y1", "0%")
              .attr("x2", "0%")
              .attr("y2", "100%");
          } else {
            gradient.selectAll("stop").remove();
          }

          gradient.append("stop")
            .attr("stop-color", color.brighter(2).toString())
            .attr("offset", "0%");
          gradient.append("stop")
            .attr("stop-color", color.toString())
            .attr("offset", "100%");

          return "url(#" + id + ")";
        },

        _getFillGradient: function (color) {
          var id = "fill-gradient",
              gradient = this.defs.select("#" + id);

          if (gradient.empty()) {
            // Create a new gradient.
            gradient = this.defs.append("linearGradient")
              .attr("id", id)
              .attr("x1", "0%")
              .attr("y1", "0%")
              .attr("x2", "0%")
              .attr("y2", "100%");
          } else {
            gradient.selectAll("stop").remove();
          }

          gradient.append("stop")
            .attr("stop-color", color)
            .attr("offset", "0%");
          gradient.append("stop")
            .attr("stop-color", color)
            .attr("stop-opacity", 0.5)
            .attr("offset", "15%");
          gradient.append("stop")
            .attr("stop-color", color)
            .attr("stop-opacity", 0.4)
            .attr("offset", "100%");

          return "url(#" + id + ")";
        },

        _setupGrid: function (offset) {
          var gridLines = this.yScale.ticks(this.model.get("gridLines")),
              scale = this.scale,
              yScale = this.yScale,
              width = this.barWidth;

          // Remove first and last tick, as we don't want to draw it as grid line.
          gridLines.pop(); gridLines.shift();
          this.grid = this.gridContainer.selectAll(".grid-line").data(gridLines, String),

          this.grid.enter().append("path").attr("class", "grid-line");
          this.grid.exit().remove();
          this.grid.attr({
            "d": function (d) {
              return "M " + offset + " " + Math.round(yScale(d)) + " h " + width;
            },
            "stroke-width": Math.round(scale(1)),
            "stroke": "#fff"
          });
        }
      });

  return BarGraphView;
});
