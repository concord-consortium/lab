/*globals define, d3, $, Backbone */

define(function (require) {
  // Dependencies.

  var BarGraphView = Backbone.View.extend({

    // Container is a DIV.
    tagName: "div",

    className: "bar-graph",

    initialize: function () {
      // Create all variables.
      this.vis = d3.select(this.el).append("svg");
      this.bar = this.vis.append("rect");
      this.axisContainer = this.vis.append("g");

      this.yScale = d3.scale.linear();
      this.heightScale = d3.scale.linear();
      this.yAxis = d3.svg.axis();

      // Register callbacks!
      this.model.on("change", this.modelChanged, this);
    },

    render: function () {
          // toJSON() returns all attributes of the model.
          // This is equivalent to many calls like:
          // property1 = model.get("property1");
          // property2 = model.get("property2");
          // etc.
      var options = this.model.toJSON(),
          padding = options.padding;

      // Set SVG element dimensions.
      this.vis.attr({
        width:  options.width,
        height: options.height
      });

      // Setup Y scale.
      this.yScale
        .domain([options.minValue, options.maxValue])
        .range([options.height - padding.top, padding.bottom]);

      // Setup scale used to translation of the bar height.
      this.heightScale
        .domain([options.minValue, options.maxValue])
        .range([0, options.height - padding.top - padding.bottom]);

      // Setup Y axis.
      this.yAxis
        .scale(this.yScale)
        .ticks(options.ticks)
        .orient("right");

      // Append Y axis.
      this.axisContainer
        .attr("transform", "translate(" + (options.width - padding.right) + ", 0)")
        .call(this.yAxis);

      // Setup bar.
      this.bar
        .attr({
          width: (options.width - padding.left - padding.right) * options.barWidth,
          x: padding.left
        })
        .style({
          fill: options.barColor
        });

      // Finally, update bar.
      this.updateBar();
    },

    // Updates only bar height.
    updateBar: function () {
      var value = this.model.get("value");
      this.bar
        .attr("height", this.heightScale(value))
        .attr("y", this.yScale(value));
    },

    // Function called whenever model attribute is changed.
    modelChanged: function () {
      var changedAttributes = this.model.changedAttributes(),
          changedAttrsCount = 0,
          name;

      // There are two possible cases.
      // Only "value" has changed, so update only bar height.
      // Other attributes have changed, so redraw whole bar graph.

      // Case 1. Check how many attributes have been changed.
      for (name in changedAttributes) {
        if (changedAttributes.hasOwnProperty()) {
          changedAttrsCount++;
          if (changedAttrsCount > 1) {
            // If 2 or more, redraw whole bar graph.
            this.render();
            return;
          }
        }
      }

      // Case 2. Only one attribute has changed, check if it's "value".
      if (changedAttributes.value) {
        this.updateBar();
      } else {
        this.render();
      }
    }
  });

  return BarGraphView;
});
