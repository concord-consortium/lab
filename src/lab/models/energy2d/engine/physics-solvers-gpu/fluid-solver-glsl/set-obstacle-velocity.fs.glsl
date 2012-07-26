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
// texture 3: 
// - R: uWind
// - G: vWind
// - B: undefined
// - A: undefined
uniform sampler2D data3_tex;

uniform vec2 grid;

varying vec2 coord;

void main() {
  vec4 data2 = texture2D(data2_tex, coord);
  float fluidity = texture2D(data1_tex, coord).a;

  if (coord.x > grid.x && coord.x < 1.0 - grid.x &&
      coord.y > grid.y && coord.y < 1.0 - grid.y &&
      fluidity == 0.0) {
    
    vec2 dx = vec2(grid.x, 0.0);
    vec2 dy = vec2(0.0, grid.y);

    int count = 0;

    if (texture2D(data1_tex, coord - dy).a == 1.0) {
      count += 1;
      vec2 data2_m_dy = texture2D(data2_tex, coord - dy).rg;
      data2.rg = texture2D(data3_tex, coord).rg + vec2(-data2_m_dy.r, data2_m_dy.g);
    } 
    else if (texture2D(data1_tex, coord + dy).a == 1.0) {
      count += 1;
      vec2 data2_p_dy = texture2D(data2_tex, coord + dy).rg;
      data2.rg = texture2D(data3_tex, coord).rg + vec2(-data2_p_dy.r, data2_p_dy.g);
    } 

    if (texture2D(data1_tex, coord - dx).a == 1.0) {
      count += 1;
      vec2 data2_m_dx = texture2D(data2_tex, coord - dx).rg;
      data2.rg = texture2D(data3_tex, coord).rg + vec2(data2_m_dx.r, -data2_m_dx.g);
    } 
    else if (texture2D(data1_tex, coord + dx).a == 1.0) {
      count += 1;
      vec2 data2_p_dx = texture2D(data2_tex, coord + dx).rg;
      data2.rg = texture2D(data3_tex, coord).rg + vec2(data2_p_dx.r, -data2_p_dx.g);
    } 

    if (count == 0) {
      data2.rg = texture2D(data3_tex, coord).rg;
    }
  }
  
  gl_FragColor = data2;
}
