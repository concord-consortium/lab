/*jslint indent: 2, browser: true, newcap: true, es5: true */
/*globals define: false, Float32Array: false, Uint16Array: false*/

// Represents a collection of vertex buffers and index buffers. Each vertex
// buffer maps to one attribute in GLSL and has a corresponding property set
// on the Mesh instance. There is one vertex buffer by default: `vertices`,
// which maps to `gl_Vertex`. The `coords`, `normals`, and `colors` vertex
// buffers map to `gl_TexCoord`, `gl_Normal`, and `gl_Color` respectively,
// and can be enabled by setting the corresponding options to true. There are
// two index buffers, `triangles` and `lines`, which are used for rendering
// `gl.TRIANGLES` and `gl.LINES`, respectively. Only `triangles` is enabled by
// default, although `computeWireframe()` will add a normal buffer if it wasn't
// initially enabled.

import $__models_energy_d_gpu_context from 'models/energy2d/gpu/context';

var
// Dependencies.
  context = $__models_energy_d_gpu_context,

  // The internal `gl` variable holds the current WebGL context.
  gl,

  // Internal, private class.
  Buffer,
  // Class to be exported.
  Mesh;

// Provides a simple method of uploading data to a GPU buffer. Example usage:
//
//     var vertices = new GL.Buffer(gl.ARRAY_BUFFER, Float32Array);
//     var indices = new GL.Buffer(gl.ELEMENT_ARRAY_BUFFER, Uint16Array);
//     vertices.data = [[0, 0, 0], [1, 0, 0], [0, 1, 0], [1, 1, 0]];
//     indices.data = [[0, 1, 2], [2, 1, 3]];
//     vertices.compile();
//     indices.compile();
Buffer = function(target, type) {
  gl = context.getWebGLContext();
  this.buffer = null;
  this.target = target;
  this.type = type;
  this.data = [];
};

// Upload the contents of `data` to the GPU in preparation for rendering. The
// data must be a list of lists where each inner list has the same length. For
// example, each element of data for vertex normals would be a list of length three.
// This will remember the data length and element length for later use by shaders.
// The type can be either `gl.STATIC_DRAW` or `gl.DYNAMIC_DRAW`, and defaults to
// `gl.STATIC_DRAW`.
//
// This could have used `[].concat.apply([], this.data)` to flatten
// the array but Google Chrome has a maximum number of arguments so the
// concatenations are chunked to avoid that limit.
Buffer.prototype.compile = function(type) {
  var data = [],
    i, chunk, spacing;
  for (i = 0, chunk = 10000; i < this.data.length; i += chunk) {
    data = Array.prototype.concat.apply(data, this.data.slice(i, i + chunk));
  }
  spacing = this.data.length ? data.length / this.data.length : 0;
  if (spacing !== Math.round(spacing)) {
    throw new Error('Mesh: buffer elements not of consistent size, average size is ' + spacing);
  }
  this.buffer = this.buffer || gl.createBuffer();
  this.buffer.length = data.length;
  this.buffer.spacing = spacing;
  gl.bindBuffer(this.target, this.buffer);
  gl.bufferData(this.target, new this.type(data), type || gl.STATIC_DRAW);
};

Mesh = function(options) {
  gl = context.getWebGLContext();
  options = options || {};
  this.vertexBuffers = {};
  this.indexBuffers = {};
  this.addVertexBuffer('vertices', 'gl_Vertex');
  if (options.coords) {
    this.addVertexBuffer('coords', 'gl_TexCoord');
  }
  if (options.normals) {
    this.addVertexBuffer('normals', 'gl_Normal');
  }
  if (options.colors) {
    this.addVertexBuffer('colors', 'gl_Color');
  }
  if (options.lines === undefined || options.triangles) {
    this.addIndexBuffer('triangles');
  }
  if (options.lines) {
    this.addIndexBuffer('lines');
  }
};

// Add a new vertex buffer with a list as a property called `name` on this object
// and map it to the attribute called `attribute` in all shaders that draw this mesh.
Mesh.prototype.addVertexBuffer = function(name, attribute) {
  var buffer = this.vertexBuffers[attribute] = new Buffer(gl.ARRAY_BUFFER, Float32Array);
  buffer.name = name;
  this[name] = [];
};

// Add a new index buffer with a list as a property called `name` on this object.
Mesh.prototype.addIndexBuffer = function(name) {
  var buffer = this.indexBuffers[name] = new Buffer(gl.ELEMENT_ARRAY_BUFFER, Uint16Array);
  this[name] = [];
};

// Upload all attached buffers to the GPU in preparation for rendering. This
// doesn't need to be called every frame, only needs to be done when the data
// changes.
Mesh.prototype.compile = function() {
  var attribute, name, buffer;
  for (attribute in this.vertexBuffers) {
    if (this.vertexBuffers.hasOwnProperty(attribute)) {
      buffer = this.vertexBuffers[attribute];
      buffer.data = this[buffer.name];
      buffer.compile();
    }
  }

  for (name in this.indexBuffers) {
    if (this.indexBuffers.hasOwnProperty(name)) {
      buffer = this.indexBuffers[name];
      buffer.data = this[name];
      buffer.compile();
    }
  }
};

// Generates a square 2x2 mesh the xy plane centered at the origin. The
// `options` argument specifies options to pass to the mesh constructor.
// Additional options include `detailX` and `detailY`, which set the tesselation
// in x and y, and `detail`, which sets both `detailX` and `detailY` at once.
// Two triangles are generated by default.
// Example usage:
//
//     var mesh1 = GL.Mesh.plane();
//     var mesh2 = GL.Mesh.plane({ detail: 5 });
//     var mesh3 = GL.Mesh.plane({ detailX: 20, detailY: 40 });
//
Mesh.plane = function(options) {
  var mesh, detailX, detailY, x, y, t, s, i;
  options = options || {};
  mesh = new Mesh(options);
  detailX = options.detailX || options.detail || 1;
  detailY = options.detailY || options.detail || 1;

  for (y = 0; y <= detailY; y += 1) {
    t = y / detailY;
    for (x = 0; x <= detailX; x += 1) {
      s = x / detailX;
      mesh.vertices.push([2 * s - 1, 2 * t - 1, 0]);
      if (mesh.coords) {
        mesh.coords.push([s, t]);
      }
      if (mesh.normals) {
        mesh.normals.push([0, 0, 1]);
      }
      if (x < detailX && y < detailY) {
        i = x + y * (detailX + 1);
        mesh.triangles.push([i, i + 1, i + detailX + 1]);
        mesh.triangles.push([i + detailX + 1, i + 1, i + detailX + 2]);
      }
    }
  }

  mesh.compile();
  return mesh;
};

// Export constructor function.
export default Mesh;
