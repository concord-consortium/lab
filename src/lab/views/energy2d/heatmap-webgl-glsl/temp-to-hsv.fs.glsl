uniform sampler2D texture;
uniform float max_hue;
uniform float max_temp;
uniform float min_temp;
varying vec2 coord;

vec3 HSVToRGB(float h, float s, float v) {
  // Make sure our arguments stay in-range
  h = max(0., min(360., h));
  s = max(0., min(100., s));
  v = max(0., min(100., v));
  
  // We accept saturation and value arguments from 0 to 100 because that is
  // how Photoshop represents those values. Internally, however, the
  // saturation and value are calculated from a range of 0 to 1. We make
  // That conversion here.
  s /= 100.;
  v /= 100.;
  
  if (s == 0.) {
    // Achromatic (grey)
    return vec3(v, v, v);
  }
  
  h /= 60.; 
  // sector 0 to 5
  int i = int(floor(h));
  // factorial part of h
  float f = h - float(i); 
  float p = v * (1. - s);
  float q = v * (1. - s * f);
  float t = v * (1. - s * (1. - f));
  
  if (i == 0)
    return vec3(v, t, p);
  if (i == 1)
    return vec3(q, v, p);
  if (i == 2)
    return vec3(p, v, t);
  if (i == 3)
    return vec3(p, q, v);
  if (i == 4)
    return vec3(t, p, v);
  //  i == 5 
  return vec3(v, p, q);
}

void main() {
  float temp = texture2D(texture, coord).r;
  float scale = max_hue / (max_temp - min_temp);
  float hue = max_hue - scale * (temp - min_temp);
  gl_FragColor = vec4(HSVToRGB(hue, 100., 90.), 1.0);
}
