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

varying vec2 coord;

void main() {
  vec4 data2 = texture2D(data2_tex, coord);
  float fluidity = texture2D(data1_tex, coord).a;
  
  if (coord.x > grid.x && coord.x < 1.0 - grid.x &&
      coord.y > grid.y && coord.y < 1.0 - grid.y &&
      fluidity == 0.0) {
    
    vec2 dx = vec2(grid.x, 0.0);
    vec2 dy = vec2(0.0, grid.y);

    if (texture2D(data1_tex, coord - dy).a == 1.0) {
      data2.ba = texture2D(data2_tex, coord - dy).ba;
    } 
    else if (texture2D(data1_tex, coord + dy).a == 1.0) {
      data2.ba = texture2D(data2_tex, coord + dy).ba;
    } 

    if (texture2D(data1_tex, coord - dx).a == 1.0) {
      data2.ba = texture2D(data2_tex, coord - dx).ba;
    } 
    else if (texture2D(data1_tex, coord + dx).a == 1.0) {
      data2.ba = texture2D(data2_tex, coord + dx).ba;
    } 
  }

  gl_FragColor = data2;
}
