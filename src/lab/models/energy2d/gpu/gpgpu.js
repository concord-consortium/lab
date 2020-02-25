    /*jshint indent: 2, browser: true, newcap: true, multistr: true, es5: true */ 
// GPGPU Utils (singleton, one instance in the environment).
import context from 'models/energy2d/gpu/context';
import Texture from 'models/energy2d/gpu/texture';
import Shader from 'models/energy2d/gpu/shader';
import Mesh from 'models/energy2d/gpu/mesh';

var
// Dependencies.
  
  
  
  

  // The internal `gl` variable holds the current WebGL context.
  gl,

  // GPGPU utils must know dimensions of data (grid).
  // This assumption that all the textures will have the same dimensions is
  // caused by performance reasons (helps avoiding recreating data structures).
  // To set grid dimensions and initialize WebGL context, call init(grid_width, grid_height).
  grid_width,
  grid_height,

  // Texture used as a temporary storage (Float, RGBA).
  temp_texture,
  // Texture used for Float to RGBA conversion (Unsigned Byte, RGBA).
  output_texture,
  // Array (Float32Array) used as temporal storage during writing RGBA textures.
  temp_storage,
  // Mesh used for rendering.
  plane,

  // Flag which determines if synchronization is allowed or not.
  sync_allowed = false,

  // Flag which determines if WebGL context and necessary objects are initialized.
  WebGL_initialized = false,

  // Special shader for encoding floats based on:
  // https://github.com/cscheid/facet/blob/master/src/shade/bits/encode_float.js
  encode_program,
  copy_program,

  // GLSL sources.
  basic_vertex_shader =
  '\
    varying vec2 coord;\
    void main() {\
      coord = gl_Vertex.xy * 0.5 + 0.5;\
      gl_Position = vec4(gl_Vertex.xyz, 1.0);\
    }',

  encode_fragment_shader =
  '\
    uniform sampler2D texture;\
    uniform float channel;\
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
      if (channel == 0.0)\
        gl_FragColor = encode_float(data.r);\
      else if (channel == 1.0)\
        gl_FragColor = encode_float(data.g);\
      else if (channel == 2.0)\
        gl_FragColor = encode_float(data.b);\
      else\
        gl_FragColor = encode_float(data.a);\
    }',

  copy_fragment_shader =
  '\
    uniform sampler2D texture;\
    varying vec2 coord;\
    void main() {\
      gl_FragColor = texture2D(texture, coord);\
    }',

  // Common error messages.
  INIT_ERR = 'GPGPU: call init(grid_width, grid_height) with proper dimensions first!',

  // Features and extensions. Their availability will be updated during initialization.
  feature = {
    'WebGLContext': {
      required: true,
      available: false
    },
    'OES_texture_float': {
      required: true,
      available: false
    },
    'FLOAT texture as render target': {
      required: true,
      available: false
    },
    'OES_texture_float_linear': {
      required: false,
      available: false
    }
  },

  //
  // Private methods.
  //
  initWebGL = function() {
    // Setup WebGL context.
    gl = context.getWebGLContext();
    if (gl) {
      feature['WebGLContext'].available = true;
    } else {
      feature['WebGLContext'].available = false;
      throw new Error("GPGPU: WebGL is not supported!");
    }

    // Check if OES_texture_float is available.
    if (gl.getExtension('OES_texture_float')) {
      feature['OES_texture_float'].available = true;
    } else {
      feature['OES_texture_float'].available = false;
      throw new Error("GPGPU: OES_texture_float is not supported!");
    }

    // Optional extension check.
    if (gl.getExtension('OES_texture_float_linear')) {
      feature['OES_texture_float_linear'].available = true;
    } else {
      feature['OES_texture_float_linear'].available = false;
      console.warn("GPGPU: OES_texture_float_linear is not supported. Renering quality will be affected.");
    }

    // Check if rendering to FLOAT textures is supported.
    temp_texture = new Texture(1, 1, {
      type: gl.FLOAT,
      format: gl.RGBA,
      filter: feature['OES_texture_float_linear'].available ? gl.LINEAR : gl.NEAREST
    });
    temp_texture.setAsRenderTarget();
    if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE) {
      feature['FLOAT texture as render target'].available = true;
    } else {
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      feature['FLOAT texture as render target'].available = false;
      throw new Error("GPGPU: FLOAT texture as render target is not supported!");
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);

    // Configure WebGL context and create necessary objects and structures.
    gl.disable(gl.DEPTH_TEST);
    plane = Mesh.plane();
    encode_program = new Shader(basic_vertex_shader, encode_fragment_shader);
    copy_program = new Shader(basic_vertex_shader, copy_fragment_shader);
    // Initialization successful.
    WebGL_initialized = true;
  },

  packRGBAData = function(R, G, B, A, storage) {
    var i, i4, len;

    if (R.length !== G.length || R.length !== B.length || R.length !== A.length ||
      storage.length !== R.length * 4) {
      throw new Error("GPGPU: Invalid input data length.");
    }
    for (i = 0, len = R.length; i < len; i += 1) {
      i4 = i * 4;
      storage[i4] = R[i];
      storage[i4 + 1] = G[i];
      storage[i4 + 2] = B[i];
      storage[i4 + 3] = A[i];
    }
  };

//
// Public API.
//
export default {
  // Setups rendering context (only during first call) and necessary storage (texture, array).
  init: function(width, height) {
    var filter;

    if (!WebGL_initialized) {
      initWebGL();
    }
    // Set dimensions.
    grid_width = width;
    grid_height = height;

    filter = feature['OES_texture_float_linear'].available ? gl.LINEAR : gl.NEAREST;

    // Setup storage for given dimensions.
    temp_texture = new Texture(grid_width, grid_height, {
      type: gl.FLOAT,
      format: gl.RGBA,
      filter: filter
    });
    output_texture = new Texture(grid_width, grid_height, {
      type: gl.UNSIGNED_BYTE,
      format: gl.RGBA,
      filter: filter
    });
    temp_storage = new Float32Array(grid_width * grid_height * 4);
  },

  get featuresInfo() {
    if (!WebGL_initialized) {
      try {
        // While testing features / extensions, we don't want to throw
        // exceptions.
        initWebGL();
      } catch (e) {}
    }
    return feature;
  },

  getWebGLContext: function() {
    if (gl === undefined) {
      initWebGL();
    }
    return gl;
  },

  // Creates a floating point texture with proper parameters.
  createTexture: function() {
    if (!grid_width || !grid_height) {
      return new Error(INIT_ERR);
    }
    // Use RGBA format as this is the safest option. Single channel textures aren't well supported
    // as render targets attached to FBO.
    return new Texture(grid_width, grid_height, {
      type: gl.FLOAT,
      format: gl.RGBA,
      filter: feature['OES_texture_float_linear'].available ? gl.LINEAR : gl.NEAREST
    });
  },

  // Convert given array to the RGBA FLoat32Array (which can be used
  // in the writeTexture function) and fill one of its channel.
  // Channel should be between 0 and 3, where 0 = R, 1 = G, 2 = B and 3 = A.
  convertToRGBA: function(data, channel, output) {
    var rgba, i, len, i4;

    if (data.length !== grid_width * grid_height) {
      throw new Error("GPGPU: Invalid input data length.");
    }

    if (output === undefined) {
      rgba = new Float32Array(data.length * 4);
    } else {
      rgba = output;
    }

    if (channel === undefined) {
      channel = 0;
    }

    // Fill RGBA array.
    for (i = 0, len = data.length; i < len; i += 1) {
      i4 = i * 4;
      rgba[i4] = rgba[i4 + 1] = rgba[i4 + 2] = rgba[i4 + 3] = 0;
      rgba[i4 + channel] = data[i];
    }

    return rgba;
  },

  // Write a texture.
  writeTexture: function(tex, input) {
    var rgba = this.convertToRGBA(input, 0, temp_storage);
    // Make sure that texture is bound.
    gl.bindTexture(gl.TEXTURE_2D, tex.id);
    gl.texImage2D(gl.TEXTURE_2D, 0, tex.format, tex.width, tex.height, 0, tex.format, tex.type, rgba);
  },

  writeRGBATexture: function(tex, R, G, B, A) {
    packRGBAData(R, G, B, A, temp_storage);
    // Make sure that texture is bound.
    gl.bindTexture(gl.TEXTURE_2D, tex.id);
    gl.texImage2D(gl.TEXTURE_2D, 0, tex.format, tex.width, tex.height, 0, tex.format, tex.type, temp_storage);
  },

  // Read a floating point texture.
  // Returns Float32Array.
  readTexture: function(tex, output, channel) {
    var output_storage;
    if (!gl || tex.width !== grid_width || tex.height !== grid_height) {
      return new Error(INIT_ERR);
    }
    if (channel === undefined) {
      channel = 0;
    }
    // Use buffer of provided ouput array. So, when result is written there,
    // output is automaticaly updated in a right way.
    output_storage = new Uint8Array(output.buffer);

    tex.bind();
    output_texture.setAsRenderTarget();
    encode_program.uniforms({
      channel: channel
    });
    encode_program.draw(plane);
    // format: gl.RGBA, type: gl.UNSIGNED_BYTE - only this set is accepted by WebGL readPixels.
    gl.readPixels(0, 0, output_texture.width, output_texture.height, output_texture.format, output_texture.type, output_storage);
  },

  copyTexture: function(src_tex, dst_tex) {
    src_tex.bind();
    dst_tex.setAsRenderTarget();
    copy_program.draw(plane);
  },

  // Execute a GLSL program.
  // Arguments:
  // - program - GL.Shader
  // - textures - array of GL.Texture
  // - output - output texture
  executeProgram: function(program, textures, output) {
    var i, len;
    // Bind textures for reading.
    for (i = 0, len = textures.length; i < len; i += 1) {
      textures[i].bind(i);
    }
    // Use temp texture as writing and reading from the same texture is impossible.
    temp_texture.setAsRenderTarget();
    // Draw simple plane (coordinates x/y from -1 to 1 to cover whole viewport).
    program.draw(plane);
    // Unbind textures.
    for (i = 0, len = textures.length; i < len; i += 1) {
      textures[i].unbind(i);
    }
    output.swapWith(temp_texture);
  },

  // Synchronization can be useful for debugging.
  setSynchronizationAllowed: function(b) {
    sync_allowed = b;
  },

  // Block until all GL execution is complete if synchronization is allowed.
  tryFinish: function() {
    if (sync_allowed) {
      gl.finish();
    }
  }
};
