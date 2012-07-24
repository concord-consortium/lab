/*jshint multistr: true */
/* Author: 
Piotr Janik
*/

$(document).ready(function () {
  var
    gl = GL.create({ alpha: true }),

    TEX_WIDTH = 128,
    TEX_HEIGHT = 128,
    RANGE = 1000,

    plane,
    textureA,
    textureB,
    outputTexture,
    outputStorage,
    outputConverted,

    data,
    dataTmp,

    step,
    renderTime,
    cpuTime,
    gpuTime,
    readTime1,
    readTime2,
    statsInterval = 5,

    renderShader = new GL.Shader('\
      varying vec2 coord;\
      void main() {\
        coord = gl_TexCoord.xy;\
        gl_Position = gl_Vertex;\
      }\
      ', '\
        uniform sampler2D texture;\
        uniform float range;\
        varying vec2 coord;\
        void main() {\
          gl_FragColor = vec4(texture2D(texture, coord).r / range, 0.0, 1.0 - texture2D(texture, coord).r / range, 1.0);\
        }\
      '),

    updateShader = new GL.Shader('\
      varying vec2 coord;\
      void main() {\
        coord = gl_Vertex.xy * 0.5 + 0.5;\
        gl_Position = vec4(gl_Vertex.xyz, 1.0);\
      }\
      ', '\
        uniform sampler2D texture;\
        uniform vec2 delta;\
        varying vec2 coord;\
        void main() {\
          vec4 data = texture2D(texture, coord);\
          /* calculate average neighbor value */\
          vec2 dx = vec2(delta.x, 0.0);\
          vec2 dy = vec2(0.0, delta.y);\
          float average = (\
            texture2D(texture, coord - dx).r +\
            texture2D(texture, coord - dy).r +\
            texture2D(texture, coord + dx).r +\
            texture2D(texture, coord + dy).r\
          ) * 0.25;\
          data += (average - data.r) * 0.5;\
          gl_FragColor = data;\
        }\
      '),

    // ========================================================================
    // The first method of encoding floats based on: 
    // https://github.com/cscheid/facet/blob/master/src/shade/bits/encode_float.js
    //
    // After rendering to RGBA, UNSIGNED_BYTE texture just call gl.readPixels with
    // an Uint8Array array and cast it to Float32Array.
    // e.g.:
    // var output = new Uint8Array(size);
    // (render to RGBA texture)
    // gl.readPixels(..., output);
    // var result = new Float32Array(output.buffer);
    //
    // 'result' array should be filled with float values.
    //
    encodeShader1 = new GL.Shader('\
      varying vec2 coord;\
      void main() {\
        coord = gl_Vertex.xy * 0.5 + 0.5;\
        gl_Position = vec4(gl_Vertex.xyz, 1.0);\
      }\
      ', '\
        uniform sampler2D texture;\
        varying vec2 coord;\
        float shift_right(float v, float amt) {\
          v = floor(v) + 0.5;\
          return floor(v / exp2(amt));\
        }\
        float shift_left(float v, float amt) {\
          return floor(v * exp2(amt) + 0.5);\
        }\
        \
        float mask_last(float v, float bits) {\
          return mod(v, shift_left(1.0, bits));\
        }\
        float extract_bits(float num, float from, float to) {\
          from = floor(from + 0.5);\
          to = floor(to + 0.5);\
          return mask_last(shift_right(num, from), to - from);\
        }\
        vec4 encode_float(float val) {\
          if (val == 0.0)\
            return vec4(0, 0, 0, 0);\
          float sign = val > 0.0 ? 0.0 : 1.0;\
          val = abs(val);\
          float exponent = floor(log2(val));\
          float biased_exponent = exponent + 127.0;\
          float fraction = ((val / exp2(exponent)) - 1.0) * 8388608.0;\
          \
          float t = biased_exponent / 2.0;\
          float last_bit_of_biased_exponent = fract(t) * 2.0;\
          float remaining_bits_of_biased_exponent = floor(t);\
          \
          float byte4 = extract_bits(fraction, 0.0, 8.0) / 255.0;\
          float byte3 = extract_bits(fraction, 8.0, 16.0) / 255.0;\
          float byte2 = (last_bit_of_biased_exponent * 128.0 + extract_bits(fraction, 16.0, 23.0)) / 255.0;\
          float byte1 = (sign * 128.0 + remaining_bits_of_biased_exponent) / 255.0;\
          return vec4(byte4, byte3, byte2, byte1);\
        }\
        void main() {\
          vec4 data = texture2D(texture, coord);\
          gl_FragColor = encode_float(data.r);\
        }\
      '),

    readTextureMethod1 = function (tex) {
      outputTexture.drawTo(function () {
        tex.bind();
        encodeShader1.draw(plane);
        // format: gl.RGBA, type: gl.UNSIGNED_BYTE - only this set is accepted by WebGL readPixels.
        gl.readPixels(0, 0, outputTexture.width, outputTexture.height, outputTexture.format, outputTexture.type, outputStorage);
        outputConverted = new Float32Array(outputStorage.buffer);
      });
      gl.finish();
    },

    // ========================================================================
    
    // ========================================================================
    // The second method of encoding floats based on: 
    // http://d.hatena.ne.jp/ultraist/20110608/1307539319
    // http://www.udp.jp/misc/nvjs/gpgpu.html
    //
    // After rendering to RGBA, UNSIGNED_BYTE texture just call gl.readPixels with
    // Uint8Array array and call decodeFloatArray.
    // e.g.:
    // var output = new Uint8Array(size);
    // var result = new Float32Array(size / 4);
    // (render to RGBA texture)
    // gl.readPixels(..., output);
    // decodeFloatArray(output, result);
    //
    // 'result' array should be filled with float values.
    //
    encodeShader2 = new GL.Shader('\
      varying vec2 coord;\
      void main() {\
        coord = gl_Vertex.xy * 0.5 + 0.5;\
        gl_Position = vec4(gl_Vertex.xyz, 1.0);\
      }\
      ', '\
        uniform sampler2D texture;\
        varying vec2 coord;\
        vec4 encode_float(float v) {\
          vec4 c = vec4(0.0, 0.0, 0.0, 0.0);\
          if (v < 0.0) {\
            c[0] += 64.0;\
            v = -v;\
          }\
          float f = 0.0;\
          float e = ceil(log2(v));\
          float m = v * exp2(-e);\
          if (e < 0.0) {\
            e = -e;\
            c[0] += 128.0;\
          }\
          c[0] += e;\
          m *= 255.0;\
          f = floor(m);\
          c[1] = f;\
          m  -= f;\
          m *= 255.0;\
          f = floor(m);\
          c[2] = f;\
          m  -= f;\
          m *= 255.0;\
          c[3] = floor(m);\
          return c * 3.921569E-03;\
        }\
        void main() {\
          vec4 data = texture2D(texture, coord);\
          gl_FragColor = encode_float(data.r);\
        }\
      '),

    exp2Table = [
      2.168404E-19, 4.336809E-19, 8.673617E-19, 1.734723E-18,
      3.469447E-18, 6.938894E-18, 1.387779E-17, 2.775558E-17,
      5.551115E-17, 1.110223E-16, 2.220446E-16, 4.440892E-16,
      8.881784E-16, 1.776357E-15, 3.552714E-15, 7.105427E-15,
      1.421085E-14, 2.842171E-14, 5.684342E-14, 1.136868E-13,
      2.273737E-13, 4.547474E-13, 9.094947E-13, 1.818989E-12,
      3.637979E-12, 7.275958E-12, 1.455192E-11, 2.910383E-11,
      5.820766E-11, 1.164153E-10, 2.328306E-10, 4.656613E-10,
      9.313226E-10, 1.862645E-09, 3.725290E-09, 7.450581E-09,
      1.490116E-08, 2.980232E-08, 5.960464E-08, 1.192093E-07,
      2.384186E-07, 4.768372E-07, 9.536743E-07, 1.907349E-06,
      3.814697E-06, 7.629395E-06, 1.525879E-05, 3.051758E-05,
      6.103516E-05, 1.220703E-04, 2.441406E-04, 4.882812E-04,
      9.765625E-04, 1.953125E-03, 3.906250E-03, 7.812500E-03,
      1.562500E-02, 3.125000E-02, 6.250000E-02, 1.250000E-01,
      2.500000E-01, 5.000000E-01, 1.000000E+00, 2.000000E+00,
      4.000000E+00, 8.000000E+00, 1.600000E+01, 3.200000E+01,
      6.400000E+01, 1.280000E+02, 2.560000E+02, 5.120000E+02,
      1.024000E+03, 2.048000E+03, 4.096000E+03, 8.192000E+03,
      1.638400E+04, 3.276800E+04, 6.553600E+04, 1.310720E+05,
      2.621440E+05, 5.242880E+05, 1.048576E+06, 2.097152E+06,
      4.194304E+06, 8.388608E+06, 1.677722E+07, 3.355443E+07,
      6.710886E+07, 1.342177E+08, 2.684355E+08, 5.368709E+08,
      1.073742E+09, 2.147484E+09, 4.294967E+09, 8.589935E+09,
      1.717987E+10, 3.435974E+10, 6.871948E+10, 1.374390E+11,
      2.748779E+11, 5.497558E+11, 1.099512E+12, 2.199023E+12,
      4.398047E+12, 8.796093E+12, 1.759219E+13, 3.518437E+13,
      7.036874E+13, 1.407375E+14, 2.814750E+14, 5.629500E+14,
      1.125900E+15, 2.251800E+15, 4.503600E+15, 9.007199E+15,
      1.801440E+16, 3.602880E+16, 7.205759E+16, 1.441152E+17,
      2.882304E+17, 5.764608E+17, 1.152922E+18, 2.305843E+18
    ],
    
    decodeFloatArray = function (input, output) {
      var
        m, e, i_sign,
        i, i4, len;

      for (i = 0, len = output.length; i < len; i += 1) {
        i4 = i * 4;
        m = input[i4 + 1] * 3.921569E-03
          + input[i4 + 2] * 1.537870E-05
          + input[i4 + 3] * 6.030863E-08;
        e = input[i4 + 0];
        i_sign = 0;

        if (e & 0x80) {
          i_sign = 1;
          e &= ~0x80;
        }
        if (e & 0x40) {
          m = -m;
          e &= ~0x40;
        }
        if (i_sign) {
          e = -e;
        }
        output[i] = m * exp2Table[e + 62];
      }
    },

    readTextureMethod2 = function (tex) {
      outputTexture.drawTo(function () {
        tex.bind();
        encodeShader2.draw(plane);
        // format: gl.RGBA, type: gl.UNSIGNED_BYTE - only this set is accepted by WebGL readPixels.
        gl.readPixels(0, 0, outputTexture.width, outputTexture.height, outputTexture.format, outputTexture.type, outputStorage);
        decodeFloatArray(outputStorage, outputConverted);
      });
      gl.finish();
    },

    init = function () {
      var dataGPU, i, len;
      // Init WebGL context.
      if (!gl.getExtension('OES_texture_float')) {
        throw new Error('This sddemo requires the OES_texture_float extension');
      }

      gl.canvas.width = 512;
      gl.canvas.height = 512;
      gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
      gl.disable(gl.DEPTH_TEST);

      // Plane from -1 do 1 (x and y) with texture coordinates.
      plane = GL.Mesh.plane({ coords: true });
      // Two textures used for simple simulation. 
      // Do not use only single component textures (ALPHA/LUMINANCE), as they cause problems on some GPUs 
      // (when used as render targets).
      textureA = new GL.Texture(TEX_WIDTH, TEX_HEIGHT, { type: gl.FLOAT, format: gl.RGBA, filter: gl.NEAREST });
      textureB = new GL.Texture(TEX_WIDTH, TEX_HEIGHT, { type: gl.FLOAT, format: gl.RGBA, filter: gl.NEAREST });
      // Texture used for reading data from GPU.
      outputTexture = new GL.Texture(TEX_WIDTH, TEX_HEIGHT, { type: gl.UNSIGNED_BYTE, format: gl.RGBA, filter: gl.NEAREST });
      outputStorage = new Uint8Array(TEX_WIDTH * TEX_HEIGHT * 4);
      outputConverted = new Float32Array(TEX_WIDTH * TEX_HEIGHT);

      // !!! Workaround for the bug: http://code.google.com/p/chromium/issues/detail?id=125481 !!!
      // lightgl.js sets this parameter to 1 during each GL.Texture call, so overwrite it when
      // all textures are created.
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 0);

      // Init data. Draw simple rectangle in the center.
      data = new Float32Array(TEX_WIDTH * TEX_HEIGHT);
      dataGPU = new Float32Array(TEX_WIDTH * TEX_HEIGHT * 4);
      for (i = 0, len = TEX_WIDTH * TEX_HEIGHT; i < len; i += 1) {
        data[i] = Math.random() * RANGE;
        dataGPU[4 * i] = data[i];
        dataGPU[4 * i + 1] = 0;
        dataGPU[4 * i + 2] = 0;
        dataGPU[4 * i + 3] = 0;
      }
      // No need to initialize temp data now.
      dataTmp = new Float32Array(TEX_WIDTH * TEX_HEIGHT);

      writeTexture(textureA, dataGPU);
      
      // Stats.
      step = 0;
      renderTime = 0;
      cpuTime = 0;
      gpuTime = 0;
      readTime1 = 0;
      readTime2 = 0;
    },

    writeTexture = function (tex, input) {
      // Make sure that texture is bound.
      gl.bindTexture(gl.TEXTURE_2D, tex.id);
      gl.texImage2D(gl.TEXTURE_2D, 0, tex.format, tex.width, tex.height, 0, tex.format, tex.type, input);
      gl.finish();
    },

    render = function () {
      gl.clear(gl.COLOR_BUFFER_BIT);
      // Set viewport as GPGPU operations can modify it.
      gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
      textureA.bind(0);
      renderShader.uniforms({
        texture: 0,
        range: RANGE
      }).draw(plane);
      textureA.unbind(0);
      gl.finish();
    },

    simulationStepCPU = function () {
      var i, j, iwidth, idx, avg, n, w, s, e, size = TEX_WIDTH * TEX_HEIGHT;
      for (i = 0; i < TEX_HEIGHT; i += 1) {
        iwidth = i * TEX_WIDTH;
        for (j = 0; j < TEX_WIDTH; j += 1) {
          idx = iwidth + j;
          // Clamp to edge.
          n = idx - TEX_WIDTH; if (n < 0) n = idx;
          w = idx - 1;         if (w < 0) w = idx;
          s = idx + TEX_WIDTH; if (s > size - 1) s = idx;
          e = idx + 1;         if (e > size - 1) e = idx;
          avg = (data[n] + data[w] + data[s] + data[e]) * 0.25;
          dataTmp[idx] = data[idx] + (avg - data[idx]) * 0.5;
        }
      }
      data = dataTmp;
    },

    simulationStepGPU = function () {
      textureB.drawTo(function () {
        textureA.bind();
        updateShader.uniforms({
          delta: [1 / TEX_WIDTH, 1 / TEX_HEIGHT]
        }).draw(plane);
      });
      textureB.swapWith(textureA);
      gl.finish();
    },

    compareGPUAndCPUResults = function () {
      var error = 0.0, i, len;
      for (i = 0, len = TEX_WIDTH * TEX_HEIGHT; i < len; i += 1) {
        error += Math.abs((data[i] - outputConverted[i]) / data[i]) * 100; // %
      }
      return error / len;
    },

    getTime = function () {
      return (new Date()).getTime();
    },

    initialTest = function () {
      var error, time;
      // Method 1.
      time = getTime();
      readTextureMethod1(textureA);
      time = getTime() - time;
      error = compareGPUAndCPUResults();
      $('#init-error-m1').text(error);
      $('#init-read-time-m1').text(time);
      // Method 2.
      time = getTime();
      readTextureMethod2(textureA);
      time = getTime() - time;
      error = compareGPUAndCPUResults();
      $('#init-error-m2').text(error);
      $('#init-read-time-m2').text(time);
    },

    updateStats = function () {
      // $('#error').text(decimalFormat(compareGPUAndCPUResults(), 2));
      $('#error').text(compareGPUAndCPUResults().toFixed(2));
      $('#render-time').text((renderTime).toFixed(1));
      $('#cpu-time').text((cpuTime).toFixed(1));
      $('#gpu-time').text((gpuTime).toFixed(1));
      $('#read-time-m1').text((readTime1).toFixed(1));
      $('#read-time-m2').text((readTime2).toFixed(1));
    },

    onDrawCallback = function () {
      var time, diff;
      
      $('#step').text(step);
      
      // Measure time in the first (=== 0) step differently.
      time = getTime();
      simulationStepGPU();
      diff = getTime() - time;
      gpuTime = step ? gpuTime * 0.95 + diff * 0.05 : diff;

      time = getTime();
      simulationStepCPU();
      diff = getTime() - time;
      cpuTime = step ? cpuTime * 0.95 + diff * 0.05 : diff;

      time = getTime();
      readTextureMethod1(textureA);
      diff = getTime() - time;
      readTime1 = step ? readTime1 * 0.95 + diff * 0.05 : diff;

      time = getTime();
      readTextureMethod2(textureA);
      diff = getTime() - time;
      readTime2 = step ? readTime2 * 0.95 + diff * 0.05 : diff;

      time = getTime();
      render();
      diff = getTime() - time;
      renderTime = step ? renderTime * 0.95 + diff * 0.05 : diff;
      
      if (step % statsInterval === 0) 
        updateStats();

      step += 1;
    };

  $('#grid-res').change(function () {
    var val;
    val = $("#grid-res").val();
    TEX_WIDTH = Number(val);
    TEX_HEIGHT = Number(val);
    init();
    initialTest();  
  });
  $('#grid-res').change();
  
  $('#convas-container').append(gl.canvas);
  gl.ondraw = onDrawCallback;
  gl.animate();
});
