/*globals defineClass extendClass mixin */

if (typeof ISImporter === 'undefined') ISImporter = {};

ISImporter.Dataset = defineClass({

  _x: null,
  _y: null,
  _length: 0,
  _nextX: 0,
  _xIncrement: 1,

  _hasSelection: false,
  _selectionXMin: null,
  _selectionXMax: null,

  /**
    get length; prefixed with 'get' because we might want to implement
    a setter eventually.
  */
  getLength: function() {
    return this._length;
  },

  getDataPoints: function() {
    var ret = [];
    for (var i = 0; i < this._length; i++) {
      ret[i] = [this._x[i], this._y[i]];
    }
    return ret;
  },

  setDataPoints: function(xs, ys) {
    this._x = [];
    this._y = [];

    for (var i = 0, len = arguments.length; i < len; i++) {
      this._x[i] = arguments[i][0];
      this._y[i] = arguments[i][1];
    }
    this._length = len;

    this.emit('dataReset');
  },

  copyDataInto: function(x, y) {
    x.length = y.length = this._length;
    for (var i = 0; i < this._length; i++) {
      x[i] = this._x[i];
      y[i] = this._y[i];
    }
  },

  getSelectionDomain: function() {
    if (!this._hasSelection) {
      return null;
    }
    if (this._selectionXMin === Infinity && this._selectionXMax === Infinity) {
      return [];
    }
    else {
      return [this._selectionXMin, this._selectionXMax];
    }
  },

  getSelectedDataPoints: function() {
    var ret, i;

    if (!this._hasSelection) {
      return null;
    }
    if (this._selectionXMin === Infinity && this._selectionXMax === Infinity) {
      // fast path
      return [];
    }

    // Filter.

    // Future implementations of this class or subclasses may want to keep
    // data ordered or use some other data structure to make this fast. (In addition
    // they might want to use a "copy into" API a la the copyDataInto method.)
    ret = [];
    for (i = 0; i < this._length; i++) {
      if (this._selectionXMin <= this._x[i] && this._x[i] <= this._selectionXMax) {
        ret.push( [this._x[i], this._y[i]] );
      }
    }
    return ret;
  },

  setNextX: function(val) {
    this._nextX = val;
  },

  getNextX: function() {
    return this._nextX;
  },

  setXIncrement: function(val) {
    this._xIncrement = val;
  },

  getXIncrement: function() {
    return this._xIncrement;
  },

  add: function(y) {
    var x = this.getNextX();
    if (!this._x) this._x = [];
    if (!this._y) this._y = [];

    this._x[this._length] = x;
    this._y[this._length] = y;
    this.setNextX( x + this.getXIncrement() );
    this._length++;
    // TODO don't construct the array if there is no 'data' listener
    this.emit('data', [x, y]);
  },

  select: function(domain) {
    if (domain === null) {
      this._hasSelection = false;
    } else if (domain.length === 0) {
      this._hasSelection = true;
      this._selectionXMin = Infinity;
      this._selectionXMax = Infinity;
    } else {
      this._hasSelection = true;
      if (domain[0] < domain[1]) {
        this._selectionXMin = domain[0];
        this._selectionXMax = domain[1];
      } else {
        this._selectionXMax = domain[0];
        this._selectionXMin = domain[1];
      }
    }
  }

});

mixin( ISImporter.Dataset.prototype, ISImporter.EventEmitter );