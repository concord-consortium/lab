varying vec2 coord;

void main() {
  coord = gl_Vertex.xy * 0.5 + 0.5;
  gl_Position = vec4(gl_Vertex.xy, 0.0, 1.0);
}
