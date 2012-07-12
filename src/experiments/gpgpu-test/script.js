/*globals energy2d: false, $: false, Float32Array: false */
/*jslint browser: true, indent: 2, es5: true */
/* Author: 
Piotr Janik
*/

$(document).ready(function () {
  'use strict';
  var
    gpgpu = energy2d.utils.gpu.gpgpu,

    DIMX = 256,
    DIMY = 512,

    texture,
    input_data,
    input_rgba,
    output_data,

    err,

    i, len;

  gpgpu.init(DIMX, DIMY);

  texture = gpgpu.createTexture();

  input_data = new Float32Array(DIMX * DIMY);
  output_data = new Float32Array(DIMX * DIMY);

  for (i = 0, len = input_data.length; i < len; i += 1) {
    input_data[i] = i;
  }

  input_rgba = gpgpu.convertToRGBA(input_data);

  gpgpu.writeTexture(texture, input_rgba);

  gpgpu.readTexture(texture, output_data);

  err = 0;
  for (i = 0, len = input_data.length; i < len; i += 1) {
    err += Math.abs(input_data[i] - output_data[i]);
  }

  $('#result').text(err);
});
