if (typeof ISImporter === 'undefined') ISImporter = {};

/**
  Basic event-emitter functionality to mixin to other classes.

  TODO: needs explicit tests (is currently *implicitly* tested by sensor-applet_spec).
*/
ISImporter.EventEmitter = {

  on: function(evt, cb) {
    if (!this._ee_listeners) this._ee_listeners = {};
    if (!this._ee_listeners[evt]) this._ee_listeners[evt] = [];

    this._ee_listeners[evt].push(cb);
  },

  emit: function(evt) {
    var args = arguments.length > 1 ? [].splice.call(arguments, 1) : [];

    if (this._ee_listeners && this._ee_listeners[evt]) {
      for (var i = 0, len = this._ee_listeners[evt].length; i < len; i++) {
        this._ee_listeners[evt][i].apply(null, args);
      }
    }
  },

  removeListener: function(evt, listener) {
    if (this._ee_listeners && this._ee_listeners[evt]) {
      for (var i = 0, len = this._ee_listeners[evt].length; i < len; i++) {
        if (this._ee_listeners[evt][i] === listener) {
          this._ee_listeners[evt].splice(i, 1);
        }
      }
    }
  },

  removeListeners: function(evt) {
    if (!evt) {
      this._ee_listeners = {};
    } else {
      if (this._ee_listeners) this._ee_listeners[evt] = [];
    }
  }
};