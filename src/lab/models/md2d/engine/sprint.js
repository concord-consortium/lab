(function() {
  var errorMessage, format, intSizeTable, sprint, _ref,
    __slice = Array.prototype.slice,
    __indexOf = Array.prototype.indexOf || function(item) { for (var i = 0, l = this.length; i < l; i++) { if (i in this && this[i] === item) return i; } return -1; };

  format = /%(\d+[$])?((?:[+\x20\-#0])*)((?:[*](?:\d+[$])?)?v)?(\d*|[*](?:\d+[$])?)(?:[.](\d+|[*](?:\d+[$])?))?(hh?|ll?|[Lzjtq]|I(?:32|64)?)?([diuDUfFeEgGxXoOscpnbB])|%%/g;

  errorMessage = "64-bit numbers aren't supported by sprint()!";

  intSizeTable = {
    h: 2,
    hh: 1,
    l: 4,
    ll: new RangeError(errorMessage),
    L: 4,
    z: 4,
    j: 4,
    t: 4,
    I: 4,
    I32: 4,
    I64: new RangeError(errorMessage),
    q: new RangeError(errorMessage)
  };

  sprint = function() {
    var arrayObjects, i, padString, string, toString, values, _ref;
    string = arguments[0], values = 2 <= arguments.length ? __slice.call(arguments, 1) : [];
    arrayObjects = ['[object Array]', '[object Arguments]'];
    toString = Object.prototype.toString;
    if ((_ref = toString.call(values[0]), __indexOf.call(arrayObjects, _ref) >= 0) && values.length === 1) {
      values = values[0];
    }
    i = -1;
    padString = function(string, length, joiner, leftPad) {
      string = "" + string;
      if (string.length > length) {
        return string;
      } else if (leftPad) {
        return "" + string + (new Array(length - string.length + 1).join(joiner));
      } else {
        return "" + (new Array(length - string.length + 1).join(joiner)) + string;
      }
    };
    return ("" + string).replace(format, function() {
      var abs, alignCharacter, argument, character, defaultPrecision, flags, intSize, leftPad, length, letter, matches, padInteger, precision, prefix, result, special, string, toExponential, type, vector;
      string = arguments[0], matches = 2 <= arguments.length ? __slice.call(arguments, 1) : [];
      argument = matches[0], flags = matches[1], vector = matches[2], length = matches[3], precision = matches[4], intSize = matches[5], type = matches[6];
      if (intSize == null) intSize = 'L';
      if (string === '%%') return '%';
      leftPad = __indexOf.call(flags, '-') >= 0;
      alignCharacter = __indexOf.call(flags, '0') >= 0 && !leftPad ? '0' : ' ';
      abs = function(int, signed) {
        var bits, entry, highValue;
        if (signed == null) signed = false;
        if (intSize === 'L' && (int >= 0 || signed)) return parseInt(int, 10);
        entry = intSizeTable[intSize];
        if (entry instanceof Error) throw entry;
        bits = entry * 8;
        int = parseInt(int, 10) % Math.pow(2, bits);
        highValue = Math.pow(2, bits) - 1;
        if (signed && int >= Math.pow(2, bits - 1)) int = -Math.pow(2, bits) + int;
        if (signed) {
          return int;
        } else {
          return int >>> 0;
        }
      };
      toExponential = function() {
        argument = (+argument).toExponential(precision);
        if (special && __indexOf.call(argument, '.') < 0) {
          argument = argument.replace('e', '.e');
        }
        return argument.toLowerCase().replace(/\d+$/, function(string) {
          return padString(string, 3, 0);
        });
      };
      padInteger = function(string) {
        if (+string === 0 && +precision === 0) {
          return '';
        } else if (defaultPrecision) {
          return string;
        } else {
          alignCharacter = ' ';
          return padString(string, precision, '0');
        }
      };
      if (vector) {
        character = vector[0] === '*' ? vector.length > 2 ? values[parseInt(vector.slice(1), 10) - 1] : values[++i] : '.';
      }
      length = length[0] === '*' ? length.length === 1 ? values[++i] : values[parseInt(length.slice(1)) - 1] : !length ? 0 : length;
      precision = precision && precision[0] === '*' ? precision.length === 1 ? values[++i] : values[parseInt(precision.slice(1), 10) - 1] : !precision ? (defaultPrecision = true, 6) : precision;
      argument = values[(parseInt(argument, 10) || ++i + 1) - 1];
      if (argument === 0) if (1 / argument === -Infinity) argument = '-0';
      argument = argument != null ? "" + argument : '';
      special = __indexOf.call(flags, '#') >= 0;
      arguments = (function() {
        var _i, _len, _results;
        if (vector) {
          _results = [];
          for (_i = 0, _len = argument.length; _i < _len; _i++) {
            letter = argument[_i];
            _results.push(letter.charCodeAt(0));
          }
          return _results;
        } else {
          return [argument];
        }
      })();
      result = (function() {
        var _i, _len, _results;
        _results = [];
        for (_i = 0, _len = arguments.length; _i < _len; _i++) {
          argument = arguments[_i];
          argument = (function() {
            var _ref2;
            switch (type) {
              case 'd':
              case 'i':
              case 'D':
                return padInteger(abs(argument, true));
              case 'u':
              case 'U':
                return padInteger(abs(argument));
              case 'f':
              case 'F':
                argument = (+argument).toFixed(precision).toLowerCase();
                if (special && __indexOf.call(argument, '.') < 0 && !/^-?[a-z]+$/.test(argument)) {
                  argument += '.';
                }
                return argument;
              case 'e':
              case 'E':
                return toExponential();
              case 'g':
              case 'G':
                if (+argument === 0 || (0.0001 <= (_ref2 = Math.abs(argument)) && _ref2 < Math.pow(10, precision))) {
                  argument = ("" + argument).substr(0, +precision + 1);
                  if (special) {
                    return argument.replace(/[.]?$/, '.');
                  } else {
                    return argument.replace(/[.]$/, '');
                  }
                } else {
                  return toExponential().replace(/[.]?0+e/, 'e');
                }
                break;
              case 'x':
              case 'X':
                prefix = special && +argument !== 0 ? '0x' : '';
                return "" + prefix + (padInteger(abs(argument).toString(16)));
              case 'b':
              case 'B':
                prefix = special && +argument !== 0 ? '0b' : '';
                return "" + prefix + (padInteger(abs(argument).toString(2)));
              case 'o':
              case 'O':
                prefix = special ? '0' : '';
                return "" + prefix + (padInteger(abs(argument).toString(8)));
              case 's':
                if (defaultPrecision) {
                  return argument;
                } else {
                  return argument.substr(0, precision);
                }
                break;
              case 'c':
                return String.fromCharCode(argument);
              default:
                throw new Exception("Unrecognized %type (?). Shouldn't happen.");
            }
          })();
          argument = "" + argument;
          if (type === type.toUpperCase()) argument = argument.toUpperCase();
          if (argument[0] !== '-') {
            if (__indexOf.call(flags, '+') >= 0) {
              argument = "+" + argument;
            } else if (__indexOf.call(flags, ' ') >= 0) {
              argument = " " + argument;
            }
          }
          _results.push(padString(argument, length, alignCharacter, leftPad));
        }
        return _results;
      }).apply(this, arguments);
      return result.join(character);
    });
  };

  if ((typeof module !== "undefined" && module !== null ? module.exports : void 0) != null) {
    module.exports = sprint;
  }

  ((_ref = typeof module !== "undefined" && module !== null ? module.exports : void 0) != null ? _ref : this).sprint = sprint;

}).call(this);
