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

uniform vec2 grid;
uniform float hx;
uniform float hy;
uniform float inv_timeStep;

// Boundary conditions uniforms
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
    vec2 dx = vec2(grid.x, 0.0);
    vec2 dy = vec2(0.0, grid.y);
    float tb = data0.b;
    // Check if tb is NaN. isnan() function is not available
    // in OpenGL ES GLSL, so use some tricks. IEEE 754 spec defines
    // that NaN != NaN, however this seems to not work on Windows.
    // So, also check if the value is outside [-3.4e38, 3.4e38] (3.4e38
    // is close to 32Float max value), as such values are not expected.
    if (tb != tb || tb < -3.4e38 || tb > 3.4e38) {
      vec4 data1 = texture2D(data1_tex, coord);
      vec4 data0_m_dy = texture2D(data0_tex, coord - dy);
      vec4 data0_p_dy = texture2D(data0_tex, coord + dy);
      vec4 data0_m_dx = texture2D(data0_tex, coord - dx);
      vec4 data0_p_dx = texture2D(data0_tex, coord + dx);
      float sij = data1.g * data1.b * inv_timeStep;
      float rij = data0.a;
      float axij = hx * (rij + data0_m_dy.a);
      float bxij = hx * (rij + data0_p_dy.a);
      float ayij = hy * (rij + data0_m_dx.a);
      float byij = hy * (rij + data0_p_dx.a);
      data0.r = (data0.g * sij + data1.r
                 + axij * data0_m_dy.r
                 + bxij * data0_p_dy.r
                 + ayij * data0_m_dx.r
                 + byij * data0_p_dx.r)
                 / (sij + axij + bxij + ayij + byij);
    } else {
      data0.r = tb;
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
