/*jslint indent: 2, browser: true, newcap: true */
/*globals define: false*/

// Simple wrapper around WebGL textures that supports render-to-texture.
//
// The arguments `width` and `height` give the size of the texture in texels.
// WebGL texture dimensions must be powers of two unless `filter` is set to
// either `gl.NEAREST` or `gl.REPEAT` and `wrap` is set to `gl.CLAMP_TO_EDGE`
// (which they are by default).
//
// Texture parameters can be passed in via the `options` argument.
// Example usage:
//
//     var t = new Texture(256, 256, {
//       // Defaults to gl.LINEAR, set both at once with "filter"
//       mag_filter: gl.NEAREST,
//       min_filter: gl.LINEAR,
//
//       // Defaults to gl.CLAMP_TO_EDGE, set both at once with "wrap"
//       wrap_s: gl.REPEAT,
//       wrap_t: gl.REPEAT,
//
//       format: gl.RGB, // Defaults to gl.RGBA
//       type: gl.FLOAT  // Defaults to gl.UNSIGNED_BYTE
//     });

define(function (require) {
  'use strict';
  var
    // Dependencies.
    context = require('models/energy2d/gpu/context'),

    // WebGL context.
    gl,

    // Class to be exported.
    Texture;

  Texture = function (width, height, options) {
    gl = context.getWebGLContext();
    options = options || {};
    // Basic texture params.
    this.id = gl.createTexture();
    this.width = width;
    this.height = height;
    this.format = options.format || gl.RGBA;
    this.type = options.type || gl.UNSIGNED_BYTE;
    // Number of texture unit which contains this texture (if any).
    this.tex_unit = null;
    // Render target params.
    this.fbo = null;

    // Set parameters.
    gl.bindTexture(gl.TEXTURE_2D, this.id);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, options.mag_filter || options.filter || gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, options.min_filter || options.filter || gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, options.wrap || options.wrap_s || gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, options.wrap || options.wrap_t || gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, this.format, width, height, 0, this.format, this.type, null);
  };

  // Set texture as render target.
  // After this call user can render to texture.
  Texture.prototype.setAsRenderTarget = function () {
    if (this.fbo === null) {
      // FBO initialization during first call.
      this.fbo = gl.createFramebuffer();
      gl.bindFramebuffer(gl.FRAMEBUFFER, this.fbo);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.id, 0);
      gl.viewport(0, 0, this.width, this.height);
    } else {
      gl.bindFramebuffer(gl.FRAMEBUFFER, this.fbo);
      gl.viewport(0, 0, this.width, this.height);
    }
  };

  // Bind this texture to the given texture unit (0-7, defaults to 0).
  Texture.prototype.bind = function (unit) {
    this.tex_unit = unit || 0;
    gl.activeTexture(gl.TEXTURE0 + this.tex_unit);
    gl.bindTexture(gl.TEXTURE_2D, this.id);
  };

  // Unbind this texture.
  Texture.prototype.unbind = function (unit) {
    if (this.tex_unit === null) {
      return;
    }
    gl.activeTexture(gl.TEXTURE0 + this.tex_unit);
    gl.bindTexture(gl.TEXTURE_2D, null);
    this.tex_unit = null;
  };

  // Render all draw calls in `callback` to this texture. It also temporarily
  // changes the viewport to the size of the texture.
  Texture.prototype.drawTo = function (callback) {
    if (this.fbo === null) {
      throw new Error("Texture: call setupAsRenderTarget() method first.");
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.fbo);
    gl.viewport(0, 0, this.width, this.height);

    callback();

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  };

  // Switch this texture with 'other', useful for the ping-pong rendering
  // technique used in multi-stage rendering.
  // Textures should have identical dimensions, types and in general - parameters.
  // Only ID, FBO and active texture unit values are swapped.
  Texture.prototype.swapWith = function (other) {
    var temp;
    // Swap ID.
    temp = other.id;
    other.id = this.id;
    this.id = temp;
    // Swap active texture unit.
    temp = other.tex_unit;
    other.tex_unit = this.tex_unit;
    this.tex_unit = temp;
    // Swap FBO.
    temp = other.fbo;
    other.fbo = this.fbo;
    this.fbo = temp;
  };

  // Export constructor function.
  return Texture;
});
