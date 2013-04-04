/*global define, d3 */

define(function (require) {
  // Dependencies.
  var Backbone = require('backbone'),

      VIEW = {
        padding: {
          left:   0,
          top:    8,
          right:  0,
          bottom: 8
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
          this.fill = this.vis.append("rect");
          this.title = this.vis.append("text");
          this.axisContainer = this.vis.append("g");
          this.bar = this.vis.append("rect");
          this.trianglePos = this.vis.append("g");
          this.traingle = this.trianglePos.append("polygon");

          this.yScale = d3.scale.linear();
          this.heightScale = d3.scale.linear();
          this.yAxis = d3.svg.axis();

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
              // Scale function.
              scale      = getScaleFunc(parseFloat(this.$el.css("font-size"))),
              // Basic padding (scaled).
              paddingLeft   = scale(VIEW.padding.left),
              paddingTop    = scale(VIEW.padding.top),
              paddingBottom = scale(VIEW.padding.bottom),
              // Note that right padding is especially important
              // in this function, as we are constructing bar graph
              // from right to left side. This variable holds current
              // padding. Later it is modified by appending of title,
              // axis, labels and all necessary elements.
              paddingRight  = scale(VIEW.padding.right);

          // Setup SVG element.
          this.vis
            .attr({
              "width":  options.width,
              "height": options.height
            })
            .style({
              "font-size": "1em"
            });

          // Setup Y scale.
          this.yScale
            .domain([options.minValue, options.maxValue])
            .range([options.height - paddingTop, paddingBottom]);

          // Setup scale used to translation of the bar height.
          this.heightScale
            .domain([options.minValue, options.maxValue])
            .range([0, options.height - paddingTop - paddingBottom]);

          // Setup title.
          if (options.title !== undefined) {
            this.title
              .text(options.title)
              .style({
                "font-size": "1em",
                "text-anchor": "middle",
                "fill": options.textColor
              });

            // Rotate title and translate it into right place.
            // We do we use height for calculating right margin?
            // Text will be rotated 90*, so current height is expected width.
            paddingRight += getRealHeight(this.title);
            this.title
              .attr("transform", "translate(" + (options.width - paddingRight) + ", " + options.height / 2 + ") rotate(90)");
          }

          // Setup Y axis.
          this.yAxis
            .scale(this.yScale)
            .tickSubdivide(options.tickSubdivide)
            .tickSize(scale(8), scale(5), scale(8))
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

          // Style Y axis.
          this.axisContainer
            .style({
              "stroke": options.textColor,
              "stroke-width": scale(2),
              "fill": "none"
            });

          // Style Y axis labels.
          this.axisContainer.selectAll("text")
            .style({
              "fill": options.textColor,
              "stroke": "none",
              // Workaround for hiding numeric labels. D3 doesn't provide any convenient function
              // for that. Returning empty string as tickFormat causes that bounding box width is
              // calculated incorrectly.
              "font-size": options.displayLabels ? "0.8em" : 0
          });

          // Remove axis completely if ticks are equal to 0.
          if (options.ticks === 0)
            this.axisContainer.selectAll("*").remove();

          // Translate axis into right place, add narrow empty space.
          // Note that this *have* to be done after all styling to get correct width of bounding box!
          paddingRight += getRealWidth(this.axisContainer) + scale(7);
          this.axisContainer
            .attr("transform", "translate(" + (options.width - paddingRight) + ", 0)");

          // Setup background of the bar.
          paddingRight += scale(5);
          this.fill
            .attr({
              "width": (options.width - paddingLeft - paddingRight),
              "height": this.heightScale(options.maxValue),
              "x": paddingLeft,
              "y": this.yScale(options.maxValue)
            })
            .style({
              "fill": options.fillColor
            });

          // Setup the main bar.
          this.bar
            .attr({
              "width": (options.width - paddingLeft - paddingRight),
              "x": paddingLeft
            })
            .style({
              "fill": options.barColor
            });

          this.traingle
            .classed("triangle", true)
            .attr({
              "points": "-15,-7 -15,7 0,0",
              "transform": "translate(" + (options.width - paddingRight) + ") scale(" + scale(1) + ")"
            });

          // Finally, update values display.
          this.update();
        },

        // Updates only bar height.
        update: function () {
          var value       = this.model.get("value"),
              secondValue = this.model.get("secondValue");

          this.bar
            .attr("height", this.heightScale(value))
            .attr("y", this.yScale(value));

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
        }
      });

  return BarGraphView;
});
