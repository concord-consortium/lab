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
    readTime,
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

    encodeShader = new GL.Shader('\
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
      readTime = 0;
    },

    writeTexture = function (tex, input) {
      // Make sure that texture is bound.
      gl.bindTexture(gl.TEXTURE_2D, tex.id);
      gl.texImage2D(gl.TEXTURE_2D, 0, tex.format, tex.width, tex.height, 0, tex.format, tex.type, input);
    },

    render = function () {
      gl.clear(gl.COLOR_BUFFER_BIT);
      textureA.bind(0);
      renderShader.uniforms({
        texture: 0,
        range: RANGE
      }).draw(plane);
      textureA.unbind(0);
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
    },

    readTexture = function (tex) {
      outputTexture.drawTo(function () {
        tex.bind();
        encodeShader.draw(plane);
        // format: gl.RGBA, type: gl.UNSIGNED_BYTE - only this set is accepted by WebGL readPixels.
        gl.readPixels(0, 0, outputTexture.width, outputTexture.height, outputTexture.format, outputTexture.type, outputStorage);
        outputConverted =  new Float32Array(outputStorage.buffer);
      });
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
      time = getTime();
      readTexture(textureA);
      time = getTime() - time;
      error = compareGPUAndCPUResults();
      $('#init-error').text(error);
      $('#init-read-time').text(time);
    },

    updateStats = function () {
      // $('#error').text(decimalFormat(compareGPUAndCPUResults(), 2));
      $('#error').text(compareGPUAndCPUResults().toFixed(2));
      $('#render-time').text((renderTime).toFixed(1));
      $('#cpu-time').text((cpuTime).toFixed(1));
      $('#gpu-time').text((gpuTime).toFixed(1));
      $('#read-time').text((readTime).toFixed(1));
    },

    onDrawCallback = function () {
      var time, diff;
      
      $('#step').text(step);
      
      // Measure time in the first (=== 0) step differently.
      time = getTime();
      render();
      diff = getTime() - time;
      renderTime = step ? renderTime * 0.95 + diff * 0.05 : diff;
      time = getTime();
      simulationStepCPU();
      diff = getTime() - time;
      cpuTime = step ? cpuTime * 0.95 + diff * 0.05 : diff;
      time = getTime();
      simulationStepGPU();
      diff = getTime() - time;
      gpuTime = step ? gpuTime * 0.95 + diff * 0.05 : diff;
      time = getTime();
      readTexture(textureA);
      diff = getTime() - time;
      readTime = step ? readTime * 0.95 + diff * 0.05 : diff;
      
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
