// Provided texture contains vector data in RG channels.
attribute vec2 origin;

uniform sampler2D vectormap_tex;
uniform float base_length;
uniform float vector_scale;
uniform vec2 scale;

void main() {
  // Read vector which should be visualized.
  vec2 vec = texture2D(vectormap_tex, gl_TexCoord.xy).xy;
  vec.y = -vec.y;

  if (length(vec) < 1e-15) {
    // Do not draw to small vectors.
    // Set position outside [-1, 1] region, which is rendered.
    gl_Position = vec4(2.0);
    return;
  }

  // Test which part of the vector arrow is being processed. 
  if (gl_Vertex.x == 0.0 && gl_Vertex.y == 0.0) {
    // Origin of the arrow is being processed.
    // Just transform its coordinates.
    gl_Position = vec4(origin, 0.0, 1.0);
  } else {
    // Other parts of arrow are being processed.
    // Set proper length of the arrow, rotate it, scale
    // and finally transform.

    // Calculate arrow length.
    vec2 new_pos = gl_Vertex.xy;
    new_pos.x += base_length + vector_scale * length(vec);

    // Calculate angle between reference arrow (horizontal).
    vec = normalize(vec);
    float angle = acos(dot(vec, vec2(1.0, 0.0)));
    if (vec.y < 0.0) {
      angle = -angle;
    }
    // Prepare rotation matrix.
    // See: http://en.wikipedia.org/wiki/Rotation_matrix
    mat2 rot_m = mat2(
      cos(angle), sin(angle),
     -sin(angle), cos(angle)
    );
    // Rotate.
    new_pos = rot_m * new_pos;
    // Scale.
    new_pos = new_pos * scale;
    // Transform.
    gl_Position = vec4(new_pos + origin, 0.0, 1.0);
  }
}
