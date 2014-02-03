/*jslint indent: 2, browser: true, newcap: true, es5: true */
/*globals define: false, Float32Array: false, Uint16Array: false, console: false*/

define(function (require) {
  'use strict';
  var
    // Dependencies.
    console = require('common/console'),
    context = require('models/energy2d/gpu/context'),

    // The internal `gl` variable holds the current WebGL context.
    gl,

    // Local, private helper functions.
    regexMap = function (regex, text, callback) {
      var result;
      while ((result = regex.exec(text)) !== null) {
        callback(result);
      }
    },
    isArray = function (obj) {
      var str = Object.prototype.toString.call(obj);
      return str === '[object Array]' || str === '[object Float32Array]';
    },
    isNumber = function (obj) {
      var str = Object.prototype.toString.call(obj);
      return str === '[object Number]' || str === '[object Boolean]';
    },
    // Class to be exported.
    Shader;

  // Compiles a shader program using the provided vertex and fragment shaders.
  Shader = function (vertexSource, fragmentSource) {
    var
      // Headers are prepended to the sources to provide some automatic functionality.
      vertexHeader =
      '\
      attribute vec4 gl_Vertex;\
      attribute vec4 gl_TexCoord;\
      attribute vec3 gl_Normal;\
      attribute vec4 gl_Color;\
      ',
      fragmentHeader =
      '\
      precision highp float;\
      ',

      // The `gl_` prefix must be substituted for something else to avoid compile
      // errors, since it's a reserved prefix. This prefixes all reserved names with
      // `_`. The header is inserted after any extensions, since those must come
      // first.
      fix = function (header, source) {
        var replaced = {}, match;
        match = /^((\s*\/\/.*\n|\s*#extension.*\n)+)[^]*$/.exec(source);
        source = match ? match[1] + header + source.substr(match[1].length) : header + source;
        regexMap(/\bgl_\w+\b/g, header, function (result) {
          if (replaced[result] === undefined) {
            source = source.replace(new RegExp('\\b' + result + '\\b', 'g'), '_' + result);
            replaced[result] = true;
          }
        });
        return source;
      },

      isSampler = {};

    gl = context.getWebGLContext();

    vertexSource = fix(vertexHeader, vertexSource);
    fragmentSource = fix(fragmentHeader, fragmentSource);

    // Compile and link errors are thrown as strings.
    function compileSource(type, source) {
      var shader = gl.createShader(type);
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        throw new Error('Shader: compile error.\n' + gl.getShaderInfoLog(shader) +
                        '\nSource:\n' + source);
      }
      return shader;
    }

    this.program = gl.createProgram();
    gl.attachShader(this.program, compileSource(gl.VERTEX_SHADER, vertexSource));
    gl.attachShader(this.program, compileSource(gl.FRAGMENT_SHADER, fragmentSource));
    gl.linkProgram(this.program);
    if (!gl.getProgramParameter(this.program, gl.LINK_STATUS)) {
      throw new Error('Shader: link error.\n' + gl.getProgramInfoLog(this.program) +
                      '\nSource:\n' + vertexSource + '\n\n' + fragmentSource);
    }
    this.attributes = {};
    this.uniformLocations = {};

    // Sampler uniforms need to be uploaded using `gl.uniform1i()` instead of `gl.uniform1f()`.
    // To do this automatically, we detect and remember all uniform samplers in the source code.
    regexMap(/uniform\s+sampler(1D|2D|3D|Cube)\s+(\w+)\s*;/g, vertexSource + fragmentSource, function (groups) {
      isSampler[groups[2]] = 1;
    });
    this.isSampler = isSampler;
  };

  // Set a uniform for each property of `uniforms`. The correct `gl.uniform*()` method is
  // inferred from the value types and from the stored uniform sampler flags.
  Shader.prototype.uniforms = function (uniforms) {
    var name, location, value;

    gl.useProgram(this.program);

    for (name in uniforms) {
      if (uniforms.hasOwnProperty(name)) {
        if (this.uniformLocations[name] === undefined) {
          this.uniformLocations[name] = gl.getUniformLocation(this.program, name);
        }
        location = this.uniformLocations[name];
        if (location === null) {
          console.warn('Shader: name ' + name + ' does not correspond to an active uniform variable.');
          continue;
        }
        value = uniforms[name];
        if (isArray(value)) {
          switch (value.length) {
          case 1: gl.uniform1fv(location, new Float32Array(value)); break;
          case 2: gl.uniform2fv(location, new Float32Array(value)); break;
          case 3: gl.uniform3fv(location, new Float32Array(value)); break;
          case 4: gl.uniform4fv(location, new Float32Array(value)); break;
          // Matrices are automatically transposed, since WebGL uses column-major
          // indices instead of row-major indices.
          case 9: gl.uniformMatrix3fv(location, false, new Float32Array([
            value[0], value[3], value[6],
            value[1], value[4], value[7],
            value[2], value[5], value[8]
          ])); break;
          case 16: gl.uniformMatrix4fv(location, false, new Float32Array([
            value[0], value[4], value[8], value[12],
            value[1], value[5], value[9], value[13],
            value[2], value[6], value[10], value[14],
            value[3], value[7], value[11], value[15]
          ])); break;
          default: throw new Error('Shader: don\'t know how to load uniform "' + name + '" of length ' + value.length);
          }
        } else if (isNumber(value)) {
          (this.isSampler[name] ? gl.uniform1i : gl.uniform1f).call(gl, location, value);
        } else {
          throw new Error('Shader: attempted to set uniform "' + name + '" to invalid value ' + value);
        }
      }
    }

    return this;
  };

  // Sets all uniform matrix attributes, binds all relevant buffers, and draws the
  // mesh geometry as indexed triangles or indexed lines. Set `mode` to `gl.LINES`
  // (and either add indices to `lines` or call `computeWireframe()`) to draw the
  // mesh in wireframe.
  Shader.prototype.draw = function (mesh, mode) {
    gl.useProgram(this.program);

    this.drawBuffers(mesh.vertexBuffers,
      mesh.indexBuffers[mode === gl.LINES ? 'lines' : 'triangles'],
      arguments.length < 2 ? gl.TRIANGLES : mode);
  };

  // Sets all uniform matrix attributes, binds all relevant buffers, and draws the
  // indexed mesh geometry. The `vertexBuffers` argument is a map from attribute
  // names to `Buffer` objects of type `gl.ARRAY_BUFFER`, `indexBuffer` is a `Buffer`
  // object of type `gl.ELEMENT_ARRAY_BUFFER`, and `mode` is a WebGL primitive mode
  // like `gl.TRIANGLES` or `gl.LINES`. This method automatically creates and caches
  // vertex attribute pointers for attributes as needed.
  Shader.prototype.drawBuffers = function (vertexBuffers, indexBuffer, mode) {
    // Create and enable attribute pointers as necessary.
    var length = 0, attribute, buffer, location;

    for (attribute in vertexBuffers) {
      if (vertexBuffers.hasOwnProperty(attribute)) {
        buffer = vertexBuffers[attribute];
        if (this.attributes[attribute] === undefined) {
          this.attributes[attribute] = gl.getAttribLocation(this.program, attribute.replace(/^gl_/, '_gl_'));
        }
        location = this.attributes[attribute];
        if (location === -1 || !buffer.buffer) {
          continue;
        }
        gl.bindBuffer(gl.ARRAY_BUFFER, buffer.buffer);
        gl.enableVertexAttribArray(location);
        gl.vertexAttribPointer(location, buffer.buffer.spacing, gl.FLOAT, false, 0, 0);
        length = buffer.buffer.length / buffer.buffer.spacing;
      }
    }

    // Disable unused attribute pointers.
    for (attribute in this.attributes) {
      if (this.attributes.hasOwnProperty(attribute)) {
        if (vertexBuffers[attribute] === undefined) {
          gl.disableVertexAttribArray(this.attributes[attribute]);
        }
      }
    }

    // Draw the geometry.
    if (length && (!indexBuffer || indexBuffer.buffer)) {
      if (indexBuffer) {
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer.buffer);
        gl.drawElements(mode, indexBuffer.buffer.length, gl.UNSIGNED_SHORT, 0);
      } else {
        gl.drawArrays(mode, 0, length);
      }
    }
  };

  // Export constructor function.
  return Shader;
});
