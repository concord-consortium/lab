/*globals energy2d: false */
/*jslint indent: 2, browser: true */
//
// lab/utils/energy2d/gpu/init.js
//

// define namespace
energy2d.namespace('energy2d.utils.gpu');


// The internal `gl` variable holds the current WebGL context.
// It's used by other energy2d.utils.gpu classes and modules.
var gl;

// WebGL Context manager.
//
// It provides access to one, global WebGL context.
// All clients interested in WebGL context should call:
// energy2d.utils.gpu.gl.getContext()
// If WebGL is not available, an appropriate error will be thrown.
energy2d.utils.gpu.init = function () {
  'use strict';
  var canvas = document.createElement('canvas');
  try {
    gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
  } catch (e) {}
  if (!gl) {
    throw new Error('GL: WebGL not supported.');
  }
  // Self-defining function.
  // During next call just return initialized context.
  energy2d.utils.gpu.init = function () {
    return gl;
  };
  // Export WebGL context.
  energy2d.utils.gpu.gl = gl;
  return gl;
};

// Helper functions which checks if WebGL Context is ready and initialized.
energy2d.utils.gpu.assertInitialized = function () {
  'use strict';
  if (!gl) {
    throw new Error("GPU: WebGL not initialized. Call energy2d.utils.gpu.init().");
  }
};