 
// WebGL Context Manager module.
//
// It provides access to one, global WebGL context.
// All clients interested in WebGL context should call:
// getWebGLContext() function. If WebGL is not available,
// an appropriate error will be thrown.
// The internal `gl` variable holds the current WebGL context.
var gl;

export default {
  getWebGLContext: function() {
    if (!gl) {
      var canvas = document.createElement('canvas');
      try {
        gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      } catch (e) {}
      if (!gl) {
        throw new Error('GL: WebGL not supported.');
      }
    }
    return gl;
  },

  get error() {
    if (!gl) return "WebGL unavailable";
    var error = gl.getError();
    return error === gl.NO_ERROR ? undefined : error;
  }
};
