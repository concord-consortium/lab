/*globals defineClass extendClass */

if (typeof ISImporter === 'undefined') ISImporter = {};

ISImporter.SensorApplet = defineClass({

  _state: 'not appended',

  getState: function() {
    return this._state;
  },

  append: function () {
    if (this.getState() !== 'not appended') {
      throw new Error("Can't call append() when sensor applet has left 'not appended' state");
    }
    this._appendHTML( this.getHTML() );
    this._state = 'appended';
  },

  _appendHTML: function(html) {
    $(document).append(html);
  },

  getHTML: function() {
    throw new Error("Override this method!");
  }

});