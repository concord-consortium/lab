/*global define: false $: false */

/**
  For use with models that do not need an associated view, but which (at least for now) are required
  by the common ModelController to have a ModelContainer which has an $el property and which
  responds to certain methods.
*/

export default function() {
  return {
    $el: $("<div id='model-container' class='container'/>"),
    getHeightForWidth: function() {
      return 0;
    },
    resize: function() {},
    repaint: function() {},
    bindModel: function() {},
    setup: function() {},
    update: function() {}
  };
};
