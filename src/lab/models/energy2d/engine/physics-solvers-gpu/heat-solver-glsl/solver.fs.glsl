varying vec2 coord;
uniform vec2 grid;
uniform sampler2D data1;
uniform sampler2D data2;
uniform float hx;
uniform float hy;
uniform float inv_timestep;
// Boundary conditions uniforms
uniform float enforce_temp;
uniform float vN;
uniform float vS;
uniform float vW;
uniform float vE;
void main() {
  vec4 t_data = texture2D(data1, coord);
  if (coord.x > grid.x && coord.x < 1.0 - grid.x &&
      coord.y > grid.y && coord.y < 1.0 - grid.y) {
    
    vec2 dx = vec2(grid.x, 0.0);
    vec2 dy = vec2(0.0, grid.y);
    float tb_val = t_data.b;

    // Check if tb_val is NaN. isnan() function is not available
    // in OpenGL ES GLSL, so use some tricks. IEEE 754 spec defines
    // that NaN != NaN, however this seems to not work on Windows.
    // So, also check if the value is outside [-3.4e38, 3.4e38] (3.4e38
    // is close to 32Float max value), as such values are not expected.

    if (tb_val != tb_val || tb_val < -3.4e38 || tb_val > 3.4e38) {
      vec4 params = texture2D(data2, coord);
      vec4 data_m_dy = texture2D(data1, coord - dy);
      vec4 data_p_dy = texture2D(data1, coord + dy);
      vec4 data_m_dx = texture2D(data1, coord - dx);
      vec4 data_p_dx = texture2D(data1, coord + dx);
      float sij = params.g * params.b * inv_timestep;
      float rij = t_data.a;
      float axij = hx * (rij + data_m_dy.a);
      float bxij = hx * (rij + data_p_dy.a);
      float ayij = hy * (rij + data_m_dx.a);
      float byij = hy * (rij + data_p_dx.a);
      float new_val = (t_data.g * sij + params.r
                     + axij * data_m_dy.r
                     + bxij * data_p_dy.r
                     + ayij * data_m_dx.r
                     + byij * data_p_dx.r)
                    / (sij + axij + bxij + ayij + byij);
      t_data.r = new_val;
    } else {
      t_data.r = tb_val;
    }
  } else if (enforce_temp == 1.0) {
    /* Temperature at border boundary conditions */
    if (coord.x < grid.x) {
      t_data.r = vN;
    } else if (coord.x > 1.0 - grid.x) {
      t_data.r = vS;
    } else if (coord.y < grid.y) {
      t_data.r = vW;
    } else if (coord.y > 1.0 - grid.y) {
      t_data.r = vE;
    }
  }
  gl_FragColor = t_data;
}