// texture 0: 
// - R: t
// - G: t0
// - B: tb
// - A: conductivity
uniform sampler2D data0_tex;
// texture 1: 
// - R: q
// - G: capacity
// - B: density
// - A: fluidity
uniform sampler2D data1_tex;
// texture 2: 
// - R: u
// - G: v
// - B: u0
// - A: v0
uniform sampler2D data2_tex;

uniform vec2 grid;
uniform float tx;
uniform float ty;

// Boundary conditions uniforms.
uniform float enforce_temp;
uniform float vN;
uniform float vS;
uniform float vW;
uniform float vE;

varying vec2 coord;

void main() {
  vec4 data0 = texture2D(data0_tex, coord);
  
  if (coord.x > grid.x && coord.x < 1.0 - grid.x &&
      coord.y > grid.y && coord.y < 1.0 - grid.y) {
    
    float fluidity = texture2D(data1_tex, coord).a;
    if (fluidity == 1.0) {
      vec2 dx = vec2(grid.x, 0.0);
      vec2 dy = vec2(0.0, grid.y);

      // Temperature t0.
      float t0_m_dy = texture2D(data0_tex, coord - dy).g;
      float t0_p_dy = texture2D(data0_tex, coord + dy).g;
      float t0_m_dx = texture2D(data0_tex, coord - dx).g;
      float t0_p_dx = texture2D(data0_tex, coord + dx).g;
      // Velocity.
      float u = texture2D(data2_tex, coord).r;
      float v = texture2D(data2_tex, coord).g;
      // Update T.
      data0.r = 0.5 * (data0.r + data0.g)
              - 0.5 * tx * u * (t0_p_dy - t0_m_dy)
              - 0.5 * ty * v * (t0_p_dx - t0_m_dx);
    }
  } else if (enforce_temp == 1.0) {
    // "temperature at border" boundary conditions are
    // integrated into this shader.
    if (coord.x < grid.x) {
      data0.r = vN;
    } else if (coord.x > 1.0 - grid.x) {
      data0.r = vS;
    } else if (coord.y < grid.y) {
      data0.r = vW;
    } else if (coord.y > 1.0 - grid.y) {
      data0.r = vE;
    }
  }
  gl_FragColor = data0;
}
