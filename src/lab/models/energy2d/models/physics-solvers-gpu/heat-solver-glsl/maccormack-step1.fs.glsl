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

      // Temperature.
      float t_m_dy = texture2D(data0_tex, coord - dy).r;
      float t_p_dy = texture2D(data0_tex, coord + dy).r;
      float t_m_dx = texture2D(data0_tex, coord - dx).r;
      float t_p_dx = texture2D(data0_tex, coord + dx).r;
      // Velocity.
      float u_m_dy = texture2D(data2_tex, coord - dy).r;
      float u_p_dy = texture2D(data2_tex, coord + dy).r;
      float v_m_dx = texture2D(data2_tex, coord - dx).g;
      float v_p_dx = texture2D(data2_tex, coord + dx).g;
      // Update T0.
      data0.g = data0.r - tx * (u_p_dy * t_p_dy - u_m_dy * t_m_dy)
                        - ty * (v_p_dx * t_p_dx - v_m_dx * t_m_dx);
    }
  } else if (enforce_temp == 1.0) {
    // "temperature at border" boundary conditions are
    // integrated into this shader.
    if (coord.x < grid.x) {
      data0.g = vN;
    } else if (coord.x > 1.0 - grid.x) {
      data0.g = vS;
    } else if (coord.y < grid.y) {
      data0.g = vW;
    } else if (coord.y > 1.0 - grid.y) {
      data0.g = vE;
    }
  }
  gl_FragColor = data0;
}
