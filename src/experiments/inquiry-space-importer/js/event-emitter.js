if (typeof ISImporter === 'undefined') ISImporter = {};

/**
  Basic event-emitter functionality to mixin to other classes.

  TODO: needs explicit tests (is currently *implicitly* tested by sensor-applet_spec).
*/
ISImporter.EventEmitter = {

  on: function(evt, cb) {
    if (!this._callbacks) this._callbacks = {};
    if (!this._callbacks[evt]) this._callbacks[evt] = [];

    this._callbacks[evt].push(cb);
  },

  emit: function(evt) {
    var args = arguments.length > 1 ? [].splice.call(arguments, 1) : [];

    if (this._callbacks && this._callbacks[evt]) {
      for (var i = 0, len = this._callbacks[evt].length; i < len; i++) {
        this._callbacks[evt][i].apply(null, args);
      }
    }
  }
};