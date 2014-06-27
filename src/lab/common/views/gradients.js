/*global define: false */

define(function() {
  return {
    /**
     * Creates a new radial gradient or updates existing one.
     *
     * @param  {[type]} id
     * @param  {[type]} lightColor
     * @param  {[type]} medColor
     * @param  {[type]} darkColor
     * @param  {[type]} container SVG container which will be used to store gradients definitions.
     * @return {string}           Gradient URL string, e.g. "url(#green-gradient)"
     */
    createRadialGradient: function(id, lightColor, medColor, darkColor, container) {
      var gradientUrl, defs, gradient;
      defs = container.select("defs");
      if (defs.empty()) {
        // Store gradients in 'defs' element.
        defs = container.append("defs");
      }

      gradient = defs.select("#" + id);

      if (gradient.empty()) {
        // Create a new gradient.
        gradient = defs.append("radialGradient").attr("id", id).attr("cx", "50%").attr("cy", "47%").attr("r", "53%").attr("fx", "35%").attr("fy", "30%");
      } else {
        gradient.selectAll("stop").remove()
      }

      gradient.append("stop").attr("stop-color", lightColor).attr("offset", "0%");
      gradient.append("stop").attr("stop-color", medColor).attr("offset", "40%");
      gradient.append("stop").attr("stop-color", darkColor).attr("offset", "80%");
      gradient.append("stop").attr("stop-color", medColor).attr("offset", "100%");

      gradientUrl = "url(#" + id + ")";
      // Store main color (for now - dark color) of the gradient.
      // Useful for radial bonds. Keys are URLs for convenience.
      this.mainColorOfGradient[gradientUrl] = darkColor;
      return gradientUrl;
    },

    /**
     * Hash which defines the main color of a given gradient.
     * Note that for convenience, keys are in forms of URLs (e.g. url(#some-gradient)).
     * e.g. useful for MD2D radial bonds, which can adjust their color to gradient.
     */
    mainColorOfGradient: {},
    /**
     * NOT INTENDED FOR INDEPENDENT USE
     * Resolves mismatched parentheses in a string.
     * Optionally, removes or "peels" the outermost pair of parenthesis
     *
     * @param  {string} string    String to resolve
     * @param  {boolean} peel     Whether or not to "peel" the outermost parenthesis pair.
     * @return {string}           Resolved string
     */
    settleParens: function(string, peel) {
      var end, inparens, firstparen;
      inparens = false;
      string = string.split("")
      for (end = 0; end < string.length; end++) {
        if (inparens) {
          if (string[end] == ")") {
            inparens = false;
          } else if (string[end] == "(") {
            string[firstparen] = " ";
            firstparen = end;
          }
        } else {
          if (string[end] == "(") {
            if (peel) {
              string[end] = " "
              peel = false
            } else {
              inparens = true;
              firstparen = end;
            }
          } else if (string[end] == ")") {
            string[end] = " ";
          }
        }
      }
      return string.join("").replace(/\s+/, " ").trim()
    },
    /**
     * NOT INTENDED FOR INDEPENDENT USE
     * Splits a string by space or comma, keeping parentheses intact
     * Then, parses each "word" for possible meanings
     * Optionally, removes or "peels" the outermost pair of parenthesis before splitting
     *
     * @param  {string} string    String to split
     * @param  {boolean} peel     Whether or not to "peel" the outermost parenthesis pair.
     * @return {Array.<Object>}   Array of "words"
     */
    smartSplit: function(string, peel) {
      var start, end, result, inparens, temp;
      string = this.settleParens(string, peel);
      inparens = false;
      result = [];
      for (end = 1; end < string.length; end++) {
        if (inparens) {
          if (string[end] == ")") {
            inparens = false;
          }
          continue;
        }
        if (string[end] == "," || string[end] == " ") {
          temp = string.slice(start, end).trim()
          if (temp.length > 0) {
            result.push(this.parseWord(temp));
          }
          start = end + 1;
        } else if (string[end] == "(") {
          inparens = true;
        }
      }
      if (end == string.length) {
        result.push(this.parseWord(string.slice(start, end).trim()));
      }
      return result;
    },
    /**
     * NOT INTENDED FOR INDEPENDENT USE
     * Finds all possible meanings of a given word, storing those
     * as properties into a String representation of the word
     *
     * @param  {string} word                      Word to find the meaning of
     * @return {Object.<string,number|boolean>}   Word as a String object and properties set
     */
    parseWord: function(word) {
      var result, temp;
      result = new String(word);
      if (word.search(/(^|[^a-zA-Z])li?n?e?a?r?($|[^a-zA-Z])/) != -1) {
        result.isLinear = true;
      }
      if (word.search(/(^|[^a-zA-Z])ra?d?i?a?l?($|[^a-zA-Z])/) != -1) {
        result.isRadial = true;
      }
      if (word.search(/(^|[^a-zA-Z])gr?a?d?i?e?n?t?($|[^a-zA-Z])/) != -1) {
        result.isGradient = true;
      }
      if (word.search(/(\(|\))/) != -1) {
        result.isParens = true;
        return result;
      }
      temp = parseFloat(word);
      if (!isNaN(temp)) {
        result.asNumber = temp;
      }
      if (word.search(/(^|[^a-zA-Z])de?g?r?e?e?s?($|[^a-zA-Z])/) != -1) {
        result.isDegrees = true;
      }
      if (word.search(/(^|[^a-zA-Z])ri?g?h?t?($|[^a-zA-Z])/) != -1) {
        result.isRight = true;
      }
      if (word.search(/(^|[^a-zA-Z])le?f?t?($|[^a-zA-Z])/) != -1) {
        result.isLeft = true;
      }
      if (word.search(/(^|[^a-zA-Z])(t|u)o?p?($|[^a-zA-Z])/) != -1) {
        result.isTop = true;
      }
      if (word.search(/(^|[^a-zA-Z])bo?t?t?o?m?($|[^a-zA-Z])/) != -1) {
        result.isBottom = true;
      }
      if (word.search(/(^|[^a-zA-Z])re?pe?a?t?($|[^a-zA-Z])/) != -1) {
        result.isRepeat = true;
      }
      if (word.search(/(^|[^a-zA-Z])re?fl?e?c?t?($|[^a-zA-Z])/) != -1) {
        result.isReflect = true;
      }
      return result;
    },
    /**
     * NOT INTENDED FOR INDEPENDENT USE
     * Given an array containing stop objects of color data and optionally offset data,
     * interpolate values for stops without offsets.
     * e.g.
     * [{"color":"red","offset":0},{"color":"yellow"},{"color":"blue","offset":100}]
     * would return
     * [{"color":"red","offset":0},{"color":"yellow","offset":50},{"color":"blue","offset":100}]
     *
     * @param  {Array.<Object<string,Object|string|number>>} stops  Array of objects containing color data and optionally offset data
     * @return {Array.<Object<string,Object|string|number>>}        Array of objects containing both color and offset data
     */
    interpolateStops: function(stops) {
      var i, j, k, start, end, step;
      if (stops.length == 0) {
        return stops;
      }
      if (!("offset" in stops[0])) {
        stops[0].offset = 0;
      }
      if (stops.length == 1) {
        return stops;
      }
      if (!("offset" in stops[stops.length - 1])) {
        stops[stops.length - 1].offset = 100;
      }
      for (i = 2; i < stops.length; i++) {
        if ("offset" in stops[i] && !("offset" in stops[i - 1])) {
          start = 0;
          end = stops[i].offset;
          for (j = i - 2; j >= 0; j--) {
            if ("offset" in stops[j]) {
              start = stops[j].offset;
              break;
            }
          }
          step = (end - start) / (i - j)
          for (var k = j + 1; k < i; k++) {
            stops[k].offset = start + step * (k - j);
          }
        }
      }
      return stops
    },
    /**
     * NOT INTENDED FOR INDEPENDENT USE: use gradients.parse instead
     * Parses and returns any color or gradient that a given string contains
     * as a gradient/color object of the form
     * {"color":"red"}
     * or
     * {"gradient":"linear","direction":0,"stops":[{"color":"red","offset":0}, ... ]}
     *
     * @param  {string} string  String
     * @return {Object}         Gradient/color object
     */
    fullParse: function(string) {
      //Preliminary gradient verification
      string = string.trim().toLowerCase();
      if (string.search(/[^#0-9a-zA-Z-]/) == -1) {
        return {
          "color": string
        };
      }
      var stops, words, direction, linear, radial, i, gradient, remove, x_direction, y_direction, repeat;

      //String preprocessing
      string = string.replace(/[\n\r:;]/g, " ").replace(/\/\*.*\*\/$/, "").replace(/\{\[/, "(").replace(/\}\]/, ")").replace(/[^a-zA-Z0-9%#\-\(\)\., ]*/g, "").replace(/\s*-\s+/g, "-").replace(/\s*\(/g, "(").replace(/\s+/g, " ");
      words = this.smartSplit(string, false);
      gradient = {};

      //Remove any irrelevant parentheses
      for (i = 0; i < words.length; i++) {
        if (words[i].isParens === true && (words[i].isGradient === true || words[i].isLinear === true || words[i].isRadial === true)) {
          words.splice.apply(words, [i, 1].concat(this.smartSplit(words[i], true)))
        }
      }

      //Parse gradient metadata
      direction = false;
      radial = false;
      linear = false;
      repeat = false;
      x_direction = 0;
      y_direction = 0;
      for (i = 0; i < words.length; i++) {
        remove = false
        if (words[i].isLeft === true) {
          x_direction -= 1;
          remove = true;
        } else if (words[i].isRight === true) {
          x_direction += 1;
          remove = true;
        }
        if (words[i].isTop === true) {
          y_direction += 1;
          remove = true;
        } else if (words[i].isBottom === true) {
          y_direction -= 1;
          remove = true;
        }
        if (words[i].isRadial === true && !(words[i].isRight === true)) {
          radial = true;
          remove = true;
        }
        if (words[i].isLinear === true && !(words[i].isLeft === true)) {
          linear = true;
          remove = true;
        }
        if ("asNumber" in words[i]) {
          if (words[i].isDegrees === true || i + 1 < words.length && words[i + 1].isDegrees === true) {
            if (direction === false) {
              direction = words[i].asNumber;
            }
            remove = true;
          }
        }
        if (words[i].isRepeat === true) {
          repeat = "repeat";
          remove = true;
        } else if (words[i].isReflect === true) {
          repeat = "reflect";
          remove = true;
        }
        if (remove || words[i].isDegrees === true || words[i].isGradient === true) {
          words.splice(i, 1);
          i--;
        }
      }
      if (direction === false && (x_direction != 0 || y_direction != 0)) {
        direction = (180 * Math.atan2(y_direction, x_direction) / Math.PI % 360);
      }

      //Parse the stops
      stops = [];
      for (i = 0; i < words.length; i++) {
        if (!("asNumber" in words[i])) {
          if (i + 1 < words.length && ("asNumber" in words[i + 1])) {
            stops.push({
              color: words[i],
              offset: words[i + 1].asNumber
            })
            words.splice(i, 2)
          } else {
            stops.push({
              color: words[i]
            })
            words.splice(i, 1)
          }
          i--
        }
      }
      if (stops.length == 1) {
        return {
          "color": stops[0].color
        };
      }
      if (stops.length == 0) {
        return {
          "color": "none"
        };
      }
      this.interpolateStops(stops);

      //Parse leftover words
      for (i = 0; i < words.length; i++) {
        if (words[i].isNumber === true) {
          if (direction === false) {
            direction = words[i].asNumber;
          }
        }
      }

      //Build and return gradient object
      if (radial && !linear) {
        direction = false
        gradient.gradient = "radial"
      } else {
        if (direction === false) {
          direction = 0
        }
        direction %= 360;
        if (direction < 0) {
          direction += 360;
        }
        gradient.gradient = "linear"
        gradient.direction = direction
      }
      if (repeat !== false) {
        gradient.repeat = repeat
      }
      gradient.stops = stops;
      gradient.standard = this.toStandardForm(gradient);
      return gradient;
    },
    /**
     * Parses and returns any color or gradient that a given string contains
     * as a gradient/color object of the form
     * {"color":"red"}
     * or
     * {"gradient":"linear","direction":0,"stops":[{"color":"red","offset":0}, ... ]}
     *
     * A string given in standard form is faster to parse. An arbitrary string will use gradient.fullParse.
     *
     * @param  {string} string  String
     * @return {Object}         Gradient/color object
     */
    parse: function(string) {
      string = string.trim().toLowerCase().replace(/\s+/g, " ")
      if (string.search(/ /) == -1) {
        return {
          "color": string,
          "standard": string
        };
      }
      var stops, direction, gradient, type, s, offset, restandardize;
      stops = string.split(" ");
      gradient = {}
      type = stops.shift()
      if (type == "linear" || type == "radial") {
        gradient.gradient = type;
      } else {
        return this.fullParse(string);
      }
      if (type == "linear") {
        direction = parseFloat(stops.shift());
        if (isNaN(direction)) {
          return this.fullParse(string);
        }
        direction %= 360;
        if (direction < 0) {
          direction += 360;
        }
        gradient.direction = direction;
        restandardize = true;
      }
      gradient.stops = []
      if (stops.length % 2 == 0) {
        for (s = 0; s < stops.length; s += 2) {
          offset = parseFloat(stops[s + 1])
          if (isNaN(offset)) {
            return this.fullParse(string);
          }
          gradient.stops.push({
            "color": stops[s],
            "offset": offset
          });
        }
      } else {
        return this.fullParse(string);
      }
      if (restandardize) {
        gradient.standard = this.toStandardForm(gradient);
      } else {
        gradient.standard = string;
      }
      return gradient;
    },
    /**
     * Applies a given gradient/color to the background of a given element
     *
     * @param  {Object} color   A gradient/color object created by gradients.parse
     * @param  {Object} element The specified DOM element to apply the background to
     */
    toCSS: function(color, element) {
      var temp, i;
      if ("color" in color) {
        element.style.backgroundColor = color.color.length ? color.color : "inherit"
        element.style.backgroundImage = "none"
      } else {
        temp = (color.gradient == "radial" ? "-webkit-radial-gradient(ellipse," : "-webkit-linear-gradient(" + color.direction + "deg, ");
        for (i = 0; i < color.stops.length; i++) {
          temp += color.stops[i].color + " " + color.stops[i].offset + "%";
          if (i < color.stops.length - 1) {
            temp += ",";
          }
        }
        temp += ")";
        element.style.backgroundColor = "none";
        element.style.backgroundImage = temp;
      }
    },
    /**
     * Converts a given gradient/color to standard form
     *
     * @param  {Object} color A gradient/color object created by gradients.parse
     * @return {string}       The converted standard form string
     */
    toStandardForm: function(color) {
      var temp, i;
      if ("color" in color) {
        color.standard = color.color;
        return color.color;
      } else {
        temp = color.gradient + " " + (color.gradient == "linear" ? color.direction + "deg " : "");
        for (i = 0; i < color.stops.length; i++) {
          temp += color.stops[i].color + " " + color.stops[i].offset + "%";
          if (i < color.stops.length - 1) {
            temp += " ";
          }
        }
        color.standard = temp;
        return temp;
      }
    },
    /**
     * Converts a given gradient/color to an SVG fill, creating a gradient definition if necessary
     *
     * @param  {Object} color    A gradient/color object created by gradients.parse
     * @param  {Object} continer The container to append the gradient definitions to
     * @return {string}          The converted string for use in SVG fill
     */
    toSVG: function(color, container) {
      if (color.color) {
        return color.color;
      }
      var gradientUrl, defs, gradient, id, c, x0, y0, xt, yt, args, stop;
      defs = container.select("defs");
      if (defs.empty()) {
        // Store gradients in "defs" element.
        defs = container.append("defs");
      }

      id = color.standard.replace(/[^a-z0-9]/g, "");
      gradient = defs.select("#" + id);

      if (gradient.empty()) {
        // Create a new gradient.
        if (color.gradient == "linear") {
          xt = -Math.cos(Math.PI * color.direction / 180);
          yt = -Math.sin(Math.PI * color.direction / 180);
          if (Math.abs(yt) > Math.abs(xt)) {
            x0 = xt * Math.abs(50 / yt);
            y0 = (yt < 0 ? -1 : 1) * 50;
          } else {
            x0 = (xt < 0 ? -1 : 1) * 50;
            y0 = yt * Math.abs(50 / xt);
          }
          gradient = defs.append("linearGradient").attr("id", id).attr("x1", (50 + x0) + "%").attr("y1", (50 + y0) + "%").attr("x2", (50 - x0) + "%").attr("y2", (50 - y0) + "%");
        } else {
          gradient = defs.append("radialGradient").attr("id", id).attr("cx", "50%").attr("cy", "50%").attr("r", "50%").attr("fx", "50%").attr("fy", "50%");
        }
      } else {
        // Gradient exists. Using it.
        return "url(#" + id + ")";
      }

      for (c = 0; c < color.stops.length; c++) {
        stop = gradient.append("stop").attr("stop-color", color.stops[c].color).attr("offset", color.stops[c].offset + "%");
        args = color.stops[c].color.split(",");
        if (args.length == 4 && !isNaN(args = parseFloat(args[3]))) {
          stop.attr("stop-opacity", args)
        }
      };

      return "url(#" + id + ")";
    }
  };
});