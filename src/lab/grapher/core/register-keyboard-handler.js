grapher.registerKeyboardHandler = function(callback) {
  d3.select(window).on("keydown", callback);
};

