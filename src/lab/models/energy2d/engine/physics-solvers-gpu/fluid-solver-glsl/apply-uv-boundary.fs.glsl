// texture 2: 
// - R: u
// - G: v
// - B: u0
// - A: v0
uniform sampler2D data2_tex;

uniform vec2 grid;

varying vec2 coord;

void main() {
  vec4 data2 = texture2D(data2_tex, coord);
  vec2 dx = vec2(grid.x, 0.0);
  vec2 dy = vec2(0.0, grid.y);
  // Process corners.
  // TODO: values from previous step are used for corners.
  if (coord.x < grid.x && coord.y < grid.y) {  
    vec4 data2_p_dy = texture2D(data2_tex, coord + dy);
    vec4 data2_p_dx = texture2D(data2_tex, coord + dx);
    data2.rg = 0.5 * (data2_p_dy.rg + data2_p_dx.rg);
  }
  else if (coord.x > 1.0 - grid.x && coord.y < grid.y) {  
    vec4 data2_p_dy = texture2D(data2_tex, coord + dy);
    vec4 data2_m_dx = texture2D(data2_tex, coord - dx);
    data2.rg = 0.5 * (data2_p_dy.rg + data2_m_dx.rg);
  }
  else if (coord.x > 1.0 - grid.x && coord.y > 1.0 - grid.y) {  
    vec4 data2_m_dy = texture2D(data2_tex, coord - dy);
    vec4 data2_m_dx = texture2D(data2_tex, coord - dx);
    data2.rg = 0.5 * (data2_m_dy.rg + data2_m_dx.rg);
  }
  else if (coord.x < grid.x && coord.y > 1.0 - grid.y) {  
    vec4 data2_m_dy = texture2D(data2_tex, coord - dy);
    vec4 data2_p_dx = texture2D(data2_tex, coord + dx);
    data2.rg = 0.5 * (data2_m_dy.rg + data2_p_dx.rg);
  }
  // Process boundaries.
  // Left.
  else if (coord.x < grid.x) {
    vec4 data2_p_dx = texture2D(data2_tex, coord + dx);
    data2.rg = vec2(data2_p_dx.r, -data2_p_dx.g);
  }
  // Right.
  else if (coord.x > 1.0 - grid.x) {
    vec4 data2_m_dx = texture2D(data2_tex, coord - dx);
    data2.rg = vec2(data2_m_dx.r, -data2_m_dx.g);
  }
  // Down.
  else if (coord.y < grid.y) {
    vec4 data2_p_dy = texture2D(data2_tex, coord + dy);
    data2.rg = vec2(-data2_p_dy.r, data2_p_dy.g);
  }
  // Up.
  else if (coord.y > 1.0 - grid.y) {
    vec4 data2_m_dy = texture2D(data2_tex, coord - dy);
    data2.rg = vec2(-data2_m_dy.r, data2_m_dy.g);
  }
  
  gl_FragColor = data2;
}
