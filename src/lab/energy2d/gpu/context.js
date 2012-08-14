/*jslint indent: 2, browser: true, newcap: true */
/*globals define: false*/

// WebGL Context Manager module.
//
// It provides access to one, global WebGL context.
// All clients interested in WebGL context should call:
// getWebGLContext() function. If WebGL is not available, 
// an appropriate error will be thrown.
define(function (require) {
  'use strict';
  // The internal `gl` variable holds the current WebGL context.
  var gl;

  return {
    getWebGLContext: function () {
      if (gl === undefined) {
        var canvas = document.createElement('canvas');
        try {
          gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
        } catch (e) {}
        if (!gl) {
          throw new Error('GL: WebGL not supported.');
        }
      }
      return gl;
    }
  };
});
