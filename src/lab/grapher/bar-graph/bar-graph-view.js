/*globals define, d3, $ */

define(function (require) {
  // Dependencies.

  return function BarGraphView(containerId, options) {
    var api,
        container,
        // SVG elements.
        vis,
        bar,

        yScale,
        heightScale,

        yAxis,

        padding = {
          left: 10,
          top: 10,
          right: 30,
          bottom: 10
        },

        defaultOptions = {
          width:  100,
          height: 300,
          barWidth: 0.8,     // defined as a factor of width.
          title:    "graph",
          ylabel:   "y-axis",
          yscale:   "linear",
          barColor: "green",
          minValue: 0,
          maxValue: 10,
          ticks:    10
        },

        //
        // Private methods.
        //

        // Fill options with default values if it is necessary.
        setupOptions = function (newOptions) {
          var name;
          options = newOptions || {};
          for(name in defaultOptions) {
            if (defaultOptions.hasOwnProperty(name) && options[name] === undefined) {
              options[name] = defaultOptions[name];
            }
          }
          return options;
        },

        initialize = function (newContainerId, newOptions) {
          containerId = newContainerId;
          options = setupOptions(newOptions);

          container = d3.select(containerId);

          yScale = d3.scale.linear()
            .domain([options.minValue, options.maxValue])
            .range([options.height - padding.top, padding.bottom]);

          heightScale = d3.scale.linear()
            .domain([options.minValue, options.maxValue])
            .range([0, options.height - padding.top - padding.bottom]);

          yAxis = d3.svg.axis().scale(yScale).ticks(options.ticks).orient("right");

          draw();
        },

        draw = function () {
          // Create main SVG element.
          vis = container.append("svg")
            .attr({
              width:  options.width,
              height: options.height
            });

          // Create axis.
          vis.append("g")
            .attr("transform", "translate(" + (options.width - padding.right) + ", 0)")
            .call(yAxis);

          // Create bar.
          bar = vis.append("rect")
            .attr({
              width: (options.width - padding.left - padding.right) * options.barWidth,
              x: padding.left
            })
            .style({
              fill: options.barColor
            });
        };

    //
    // Public API.
    //
    api = {
      // Update bar graph, set new value.
      update: function (value) {
        bar
          .attr("height", heightScale(value))
          .attr("y", yScale(value));
      }
    };

    //
    // One-off initialization.
    //
    initialize(containerId, options);

    return api;
  };
});
