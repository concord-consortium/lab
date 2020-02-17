export default function SVGContainer() {
  return {
    setup: function() {},
    repaint: function() {},
    bindModel: function() {},
    getHeightForWidth: function(width) { return width; },
    resize: function() {},
    $el: $('<div id="model-container"></div>')
  };
}
