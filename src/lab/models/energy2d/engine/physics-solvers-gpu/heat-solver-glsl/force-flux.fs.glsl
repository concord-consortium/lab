uniform sampler2D data1;
uniform vec2 grid;
uniform float vN;
uniform float vS;
uniform float vW;
uniform float vE;
uniform float delta_x;
uniform float delta_y;

varying vec2 coord;
void main() {
  vec4 data = texture2D(data1, coord);
  vec2 dx = vec2(grid.x, 0.0);
  vec2 dy = vec2(0.0, grid.y);
  if (coord.x < grid.x) {
    data.r = texture2D(data1, coord + dx).r
            + vN * delta_y / data.a;
  } else if (coord.x > 1.0 - grid.x) {
    data.r = texture2D(data1, coord - dx).r
            - vS * delta_y / data.a;
  } else if (coord.y < grid.y) {
    data.r = texture2D(data1, coord + dy).r
            - vW * delta_x / data.a;
  } else if (coord.y > 1.0 - grid.y) {
    data.r = texture2D(data1, coord - dy).r
            + vE * delta_x / data.a;
  }
  gl_FragColor = data;
}
