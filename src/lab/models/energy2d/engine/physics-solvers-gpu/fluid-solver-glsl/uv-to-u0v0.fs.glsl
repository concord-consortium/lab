// texture 2: 
// - R: u
// - G: v
// - B: u0
// - A: v0
uniform sampler2D data2_tex;

varying vec2 coord;

void main() {
	vec4 data2 = texture2D(data2_tex, coord);
	data2.ba = data2.rg;
	gl_FragColor = data2;
}
