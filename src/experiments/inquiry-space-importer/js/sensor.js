/*globals defineClass extendClass */

if (typeof ISImporter === 'undefined') ISImporter = {};

ISImporter.SensorApplet = defineClass({

  _state: 'not appended',

  getState: function() {
    return this._state;
  },

  on: function(evt, cb) {
    if (!this._callbacks) this._callbacks = {};
    if (!this._callbacks[evt]) this._callbacks[evt] = [];

    this._callbacks[evt].push(cb);
  },

  fireEvent: function(evt) {
    if (this._callbacks && this._callbacks[evt]) {
      for (var i = 0, len = this._callbacks[evt].length; i < len; i++) {
        this._callbacks[evt][i]();
      }
    }
  },

  append: function () {
    if (this.getState() !== 'not appended') {
      throw new Error("Can't call append() when sensor applet has left 'not appended' state");
    }
    this._appendHTML( this.getHTML() );
    this._state = 'appended';
    this._waitForAppletReady();
  },

  _waitForAppletReady: function() {
    var self = this,
        timer;

    timer = window.setInterval(function() {
      if (self.testAppletReady()) {
        window.clearInterval( timer );
        self._state = 'applet ready';
        self.fireEvent('appletReady');
      }
    }, this.testAppletReadyInterval);
  },

  _appendHTML: function(html) {
    $(document).append(html);
  },

  getHTML: function() {
    throw new Error("Override this method!");
  },

  testAppletReady: function() {
    throw new Error("Override this method!");
  }

});