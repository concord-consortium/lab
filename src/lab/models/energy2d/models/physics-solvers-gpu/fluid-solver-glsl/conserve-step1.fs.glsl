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
uniform float i2dx;
uniform float i2dy;

varying vec2 coord;

void main() {
  vec4 data2 = texture2D(data2_tex, coord);
  float fluidity = texture2D(data1_tex, coord).a;
  
  if (coord.x > grid.x && coord.x < 1.0 - grid.x &&
      coord.y > grid.y && coord.y < 1.0 - grid.y &&
      fluidity == 1.0) {
    
    vec2 dx = vec2(grid.x, 0.0);
    vec2 dy = vec2(0.0, grid.y);
    
    vec4 data2_m_dy = texture2D(data2_tex, coord - dy);
    vec4 data2_p_dy = texture2D(data2_tex, coord + dy);
    vec4 data2_m_dx = texture2D(data2_tex, coord - dx);
    vec4 data2_p_dx = texture2D(data2_tex, coord + dx);
    
    // Phi.
    data2.b = 0.0;
    // Div.
    data2.a = (data2_p_dy.r - data2_m_dy.r) * i2dx + (data2_p_dx.g - data2_m_dx.g) * i2dy;
  }

  gl_FragColor = data2;
}
