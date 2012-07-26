uniform sampler2D data1;
varying vec2 coord;
void main() {
	vec4 data = texture2D(data1, coord);
	data.g = data.r;
	gl_FragColor = data;
}
