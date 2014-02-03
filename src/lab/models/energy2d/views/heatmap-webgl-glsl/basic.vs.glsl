varying vec2 coord;

void main() {
  coord = gl_TexCoord.xy;
  gl_Position = vec4(gl_Vertex.xyz, 1.0);
}
