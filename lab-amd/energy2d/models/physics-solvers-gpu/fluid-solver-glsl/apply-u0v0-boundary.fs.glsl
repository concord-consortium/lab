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
    data2.ba = 0.5 * (data2_p_dy.ba + data2_p_dx.ba);
  }
  else if (coord.x > 1.0 - grid.x && coord.y < grid.y) {  
    vec4 data2_p_dy = texture2D(data2_tex, coord + dy);
    vec4 data2_m_dx = texture2D(data2_tex, coord - dx);
    data2.ba = 0.5 * (data2_p_dy.ba + data2_m_dx.ba);
  }
  else if (coord.x > 1.0 - grid.x && coord.y > 1.0 - grid.y) {  
    vec4 data2_m_dy = texture2D(data2_tex, coord - dy);
    vec4 data2_m_dx = texture2D(data2_tex, coord - dx);
    data2.ba = 0.5 * (data2_m_dy.ba + data2_m_dx.ba);
  }
  else if (coord.x < grid.x && coord.y > 1.0 - grid.y) {  
    vec4 data2_m_dy = texture2D(data2_tex, coord - dy);
    vec4 data2_p_dx = texture2D(data2_tex, coord + dx);
    data2.ba = 0.5 * (data2_m_dy.ba + data2_p_dx.ba);
  }
  // Process boundaries.
  // Left.
  else if (coord.x < grid.x) {
    data2.ba = texture2D(data2_tex, coord + dx).ba;
  }
  // Right.
  else if (coord.x > 1.0 - grid.x) {
    data2.ba = texture2D(data2_tex, coord - dx).ba;
  }
  // Down.
  else if (coord.y < grid.y) {
    data2.ba = texture2D(data2_tex, coord + dy).ba;
  }
  // Up.
  else if (coord.y > 1.0 - grid.y) {
    data2.ba = texture2D(data2_tex, coord - dy).ba;
  }
  
  gl_FragColor = data2;
}
