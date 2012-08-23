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
uniform float g;
uniform float b;

varying vec2 coord;

void main() {
  vec4 data2 = texture2D(data2_tex, coord);
  float fluidity = texture2D(data1_tex, coord).a;
  
  if (coord.x > grid.x && coord.x < 1.0 - grid.x &&
      coord.y > grid.y && coord.y < 1.0 - grid.y &&
      fluidity == 1.0) {
    
    vec2 dx = vec2(grid.x, 0.0);
    vec2 dy = vec2(0.0, grid.y);
    
    float t = texture2D(data0_tex, coord).r;
    // Get average column temperature.

    float avg_t = t;
    float count = 1.0;
    vec2 n_coord = coord - dx;
    // Silly while(true) loop (almost).
    // While loops are not allowed.
    // For loops with non-constant expressions also.
    for (int i = 1; i != 0; i++) {
      if (n_coord.x > 0.0 && texture2D(data1_tex, n_coord).a == 1.0) {
        avg_t += texture2D(data0_tex, n_coord).r;
        count += 1.0;
        n_coord -= dx;
      } else {
        break;
      }
    }
    n_coord = coord + dx;
    // Silly while(true) loop (almost).
    // While loops are not allowed.
    // For loops with non-constant expressions also.
    for (int i = 1; i != 0; i++) {
      if (n_coord.x < 1.0 && texture2D(data1_tex, n_coord).a == 1.0) {
        avg_t += texture2D(data0_tex, n_coord).r;
        count += 1.0;
        n_coord += dx;
      } else {
        break;
      }
    }
    avg_t /= count;

    // Update velocity V component.
    data2.g += (g - b) * t + b * avg_t;
  }

  gl_FragColor = data2;
}
