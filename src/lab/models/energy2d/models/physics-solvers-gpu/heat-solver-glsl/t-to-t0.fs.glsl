// texture 0: 
// - R: t
// - G: t0
// - B: tb
// - A: conductivity
uniform sampler2D data0_tex;

varying vec2 coord;

void main() {
	vec4 data0 = texture2D(data0_tex, coord);
	data0.g = data0.r;
	gl_FragColor = data0;
}
