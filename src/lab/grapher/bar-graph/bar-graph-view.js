import 'common/jquery-plugins';
import Backbone from 'backbone';

var
  uid = 0,
  // Returns unique ID used by the bar graph view.
  getUID = function() {
    return uid++;
  },

  // Get real width SVG of element using bounding box.
  getRealWidth = function(d3selection) {
    return d3selection.node().getBBox().width;
  },

  // Bar graph scales itself according to the font size.
  // We assume some CANONICAL_FONT_SIZE. All values which should
  // be scaled, should use returned function.
  CANONICAL_FONT_SIZE = 16,
  getScaleFunc = function(fontSize) {
    var factor = fontSize / CANONICAL_FONT_SIZE;

    return function(val) {
      return val * factor;
    };
  },

  setupValueLabelPairs = function(yAxis, ticks) {
    var values = [],
      labels = {},
      i, len;

    for (i = 0, len = ticks.length; i < len; i++) {
      values[i] = ticks[i].value;
      labels[values[i]] = ticks[i].label;
    }

    yAxis
      .tickValues(values)
      .tickFormat(function(value) {
        return labels[value];
      });
  },

  getFormatFunc = function(formatString, unitsString) {
    var format = d3.format(formatString);
    return function(value) {
      return format(value) + " " + unitsString;
    };
  },

  BarGraphView = Backbone.View.extend({
    // Container is a DIV.
    tagName: "div",

    className: "bar-graph",

    initialize: function() {
      // Unique ID. Required to generate unique
      // gradient names.
      this.uid = getUID();

      this.$topArea = $('<div class="top-area">').appendTo(this.$el);

      // Create some SVG elements, which are constant and doesn't need to
      // be recreated each time during rendering.
      this.vis = d3.select(this.el).append("svg");
      this.defs = this.vis.append("defs");
      this.axisContainer = this.vis.append("g");
      this.fill = this.vis.append("rect");
      this.bar = this.vis.append("rect");
      this.gridContainer = this.vis.append("g");
      this.trianglePos = this.vis.append("g");
      this.traingle = this.trianglePos.append("polygon");
      this.titleContainer = this.vis.append("g");

      this.yScale = d3.scale.linear();
      this.heightScale = d3.scale.linear();
      this.yAxis = d3.svg.axis();

      this.scale = null;
      this.barWidth = null;

      this.$bottomArea = $('<div class="bottom-area">').appendTo(this.$el);

      // Register callbacks!
      this.model.on("change", this.modelChanged, this);
    },

    // Render whole bar graph.
    render: function() {
      // toJSON() returns all attributes of the model.
      // This is equivalent to many calls like:
      // property1 = model.get("property1");
      // property2 = model.get("property2");
      // etc.
      var options = this.model.toJSON(),
        fontSize = parseFloat(this.$el.css("font-size")),
        // Scale function.
        scale = this.scale = getScaleFunc(fontSize),
        renderLabels = options.labels > 0 || options.labels.length > 0,
        // Basic padding (scaled).
        paddingTop = renderLabels ? scale(8) : scale(3),
        paddingBottom = renderLabels ? scale(8) : scale(3),

        offset = 0;

      // Set height of the most outer container.
      this.$el.outerHeight(options.height);

      this._setupHorizontalTitle();

      this.svgHeight = this.$el.height() - this.$topArea.height() - this.$bottomArea.height();

      // Setup SVG element.
      this.vis
        .attr({
          // Use some random width. At the end of rendering, it will be
          // updated to a valid value in ems (based on the graph content).
          "width": 600,
          "height": this.svgHeight
        });

      // Setup Y scale.
      this.yScale
        .domain([options.min, options.max])
        .range([this.svgHeight - paddingTop, paddingBottom])
        .clamp(true);

      // Setup scale used to translation of the bar height.
      this.heightScale
        .domain([options.min, options.max])
        .range([0, this.svgHeight - paddingTop - paddingBottom])
        .clamp(true);

      // Render elements from left to right.

      this.axisContainer.selectAll("*").remove();
      if (renderLabels) {
        // Setup Y axis.
        this.yAxis
          .scale(this.yScale)
          .tickValues(null)
          .tickPadding(0)
          .tickSize(0, 0, 0)
          .orient("left");

        if (typeof options.labels === "number") {
          // Just normal tics.
          this.yAxis
            .ticks(options.labels)
            .tickFormat(getFormatFunc(options.labelFormat, options.units));
        } else {
          // Array with value - label pairs.
          setupValueLabelPairs(this.yAxis, options.labels);
        }

        // Create and append Y axis.
        this.axisContainer.call(this.yAxis);

        offset += getRealWidth(this.axisContainer);

        this.axisContainer.attr("transform", "translate(" + offset + ")");

        offset += scale(5);
      }

      // Setup background of the bar.
      this.fill
        .attr({
          "width": options.barWidth,
          "height": this.heightScale(options.max),
          "x": offset,
          "y": this.yScale(options.max),
          "rx": "0.5em",
          "ry": "0.5em",
          "fill": this._getFillGradient(options.fillColor)
        });

      // Setup the main bar.
      this.bar
        .attr({
          "width": options.barWidth,
          "x": offset,
          "rx": "0.5em",
          "ry": "0.5em",
          "fill": this._getBarGradient(options.barColor)
        });

      this.barWidth = getRealWidth(this.fill);

      this.traingle
        .classed("triangle", true)
        .attr({
          "points": "15,-7 15,7 1,0",
          "transform": "translate(" + offset + ") scale(" + scale(1) + ")"
        });

      this._setupGrid(offset);

      offset += this.barWidth;

      offset = this._setupTitle(offset);

      // Convert final width in px into value in ems.
      // That ensures that the SVG will work well with semantic layout.
      this.vis.attr("width", (offset / fontSize) + "em");
      this.$el.css("min-width", (offset / fontSize) + "em");

      // work-around bug on iPad2 where container is not expanding in width
      // when SVG element rendered inside it
      // see: Bar graph rendering issues on iPad
      // https://www.pivotaltracker.com/story/show/47854951
      // This means while we are duplicating the current padding styles set
      // in _grapher.sass changes in desired style must be duplicated here.
      this.$el.css("min-width", (offset / fontSize + 0.8) + "em");

      // Finally, update displayed values.
      this.update();
    },

    // Updates only bar height.
    update: function() {
      var value = this.model.get("value"),
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
    modelChanged: function() {
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

    _getBarGradient: function(color) {
      var id = "bar-gradient-" + this.uid,
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

    _getFillGradient: function(color) {
      var id = "fill-gradient-" + this.uid,
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

    _setupGrid: function(offset) {
      var gridLines = this.yScale.ticks(this.model.get("gridLines")),
        yScale = this.yScale,
        width = this.barWidth;

      // Remove first and last tick, as we don't want to draw it as grid line.
      gridLines.pop();
      gridLines.shift();
      this.grid = this.gridContainer.selectAll(".grid-line").data(gridLines, String),

        this.grid.enter().append("path").attr("class", "grid-line");
      this.grid.exit().remove();
      this.grid.attr("d", function(d) {
        return "M " + offset + " " + Math.round(yScale(d)) + " h " + width;
      });

      return offset;
    },

    // Setup vertical title.
    _setupTitle: function(offset) {
      // "title" option is expected to be string
      // or array of strings.
      var title = this.model.get("title"),
        self = this,
        isArray, lines,
        titleG, gEnter;

      if (title && this.model.get("titleOn") === "right") {
        offset += this.scale(10);

        isArray = $.isArray(title);
        lines = isArray ? title.length : 1;

        titleG = this.titleContainer.selectAll(".title").data(isArray ? title : [title]);

        titleG.exit().remove();

        gEnter = titleG.enter().append("g").attr("class", "title");
        gEnter.append("title");
        gEnter.append("text");

        titleG.each(function(d, i) {
          var g = d3.select(this);
          g.select("title").text(d);
          g.select("text")
            .text(self._processTitle(d))
            .attr("dy", -(lines - i - 1) + "em");
        });

        // Transform whole container.
        this.titleContainer.attr("transform",
          "translate(" + offset + ", " + this.svgHeight / 2 + ") rotate(90)");

        // Update offset.
        offset += parseFloat($(titleG.node()).css("font-size")) * lines;
      }

      return offset;
    },

    // Setup horizontal title.
    _setupHorizontalTitle: function() {
      // "title" option is expected to be string
      // or array of strings.
      var title = this.model.get("title"),
        pos = this.model.get("titleOn"),
        $container;

      this.$topArea.empty();
      this.$bottomArea.empty();

      if (!title || title.length === 0 || pos === "right") {
        return;
      }

      title = $.isArray(title) ? title : [title];

      if (pos === "top") {
        $container = this.$topArea;
      } else if (pos === "bottom") {
        $container = this.$bottomArea;
      }

      title.forEach(function(t) {
        $container.append('<p class="title">' + t + '</p>');
      });
    },

    _processTitle: function(title) {
      var $title = $('<span class="title">' + title + '</span>').appendTo(this.$el),
        truncatedText;

      $title.truncate(this.svgHeight);
      truncatedText = $title.text();
      $title.remove();
      return truncatedText;
    }
  });

export default BarGraphView;
