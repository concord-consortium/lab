// texture 0: 
// - R: t
// - G: t0
// - B: tb
// - A: conductivity
uniform sampler2D data0_tex;

uniform vec2 grid;
uniform float vN;
uniform float vS;
uniform float vW;
uniform float vE;
uniform float delta_x;
uniform float delta_y;

varying vec2 coord;

void main() {
  vec4 data0 = texture2D(data0_tex, coord);
  vec2 dx = vec2(grid.x, 0.0);
  vec2 dy = vec2(0.0, grid.y);
  if (coord.x < grid.x) {
    data0.g = texture2D(data0_tex, coord + dx).r
            + vN * delta_y / data0.a;
  } else if (coord.x > 1.0 - grid.x) {
    data0.g = texture2D(data0_tex, coord - dx).r
            - vS * delta_y / data0.a;
  } else if (coord.y < grid.y) {
    data0.g = texture2D(data0_tex, coord + dy).r
            - vW * delta_x / data0.a;
  } else if (coord.y > 1.0 - grid.y) {
    data0.g = texture2D(data0_tex, coord - dy).r
            + vE * delta_x / data0.a;
  }
  gl_FragColor = data0;
}
