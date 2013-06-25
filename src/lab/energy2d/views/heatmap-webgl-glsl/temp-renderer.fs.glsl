// Provided textur contains temperature data in R channel.
uniform sampler2D heatmap_tex;
uniform sampler2D palette_tex;

uniform float max_temp;
uniform float min_temp;

varying vec2 coord;

void main() {
  float temp = texture2D(heatmap_tex, coord).r;
  float scaled_temp = (temp - min_temp) / max(1.0, max_temp - min_temp);
  gl_FragColor = texture2D(palette_tex, vec2(scaled_temp, 0.5));
}
