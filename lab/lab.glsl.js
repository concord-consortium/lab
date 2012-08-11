var lab = lab || {};
lab.glsl = {};

lab.glsl['src/lab/models/energy2d/engine/physics-solvers-gpu/fluid-solver-glsl/apply-buoyancy.fs.glsl'] = '\
// texture 0: \n\
// - R: t\n\
// - G: t0\n\
// - B: tb\n\
// - A: conductivity\n\
uniform sampler2D data0_tex;\n\
// texture 1: \n\
// - R: q\n\
// - G: capacity\n\
// - B: density\n\
// - A: fluidity\n\
uniform sampler2D data1_tex;\n\
// texture 2: \n\
// - R: u\n\
// - G: v\n\
// - B: u0\n\
// - A: v0\n\
uniform sampler2D data2_tex;\n\
\n\
uniform vec2 grid;\n\
uniform float g;\n\
uniform float b;\n\
\n\
varying vec2 coord;\n\
\n\
void main() {\n\
  vec4 data2 = texture2D(data2_tex, coord);\n\
  float fluidity = texture2D(data1_tex, coord).a;\n\
  \n\
  if (coord.x > grid.x && coord.x < 1.0 - grid.x &&\n\
      coord.y > grid.y && coord.y < 1.0 - grid.y &&\n\
      fluidity == 1.0) {\n\
    \n\
    vec2 dx = vec2(grid.x, 0.0);\n\
    vec2 dy = vec2(0.0, grid.y);\n\
    \n\
    float t = texture2D(data0_tex, coord).r;\n\
    // Get average column temperature.\n\
\n\
    float avg_t = t;\n\
    float count = 1.0;\n\
    vec2 n_coord = coord - dx;\n\
    // Silly while(true) loop (almost).\n\
    // While loops are not allowed.\n\
    // For loops with non-constant expressions also.\n\
    for (int i = 1; i != 0; i++) {\n\
      if (n_coord.x > 0.0 && texture2D(data1_tex, n_coord).a == 1.0) {\n\
        avg_t += texture2D(data0_tex, n_coord).r;\n\
        count += 1.0;\n\
        n_coord -= dx;\n\
      } else {\n\
        break;\n\
      }\n\
    }\n\
    n_coord = coord + dx;\n\
    // Silly while(true) loop (almost).\n\
    // While loops are not allowed.\n\
    // For loops with non-constant expressions also.\n\
    for (int i = 1; i != 0; i++) {\n\
      if (n_coord.x < 1.0 && texture2D(data1_tex, n_coord).a == 1.0) {\n\
        avg_t += texture2D(data0_tex, n_coord).r;\n\
        count += 1.0;\n\
        n_coord += dx;\n\
      } else {\n\
        break;\n\
      }\n\
    }\n\
    avg_t /= count;\n\
\n\
    // Update velocity V component.\n\
    data2.g += (g - b) * t + b * avg_t;\n\
  }\n\
\n\
  gl_FragColor = data2;\n\
}\n\
\n\
';

lab.glsl['src/lab/models/energy2d/engine/physics-solvers-gpu/fluid-solver-glsl/apply-u0v0-boundary.fs.glsl'] = '\
// texture 2: \n\
// - R: u\n\
// - G: v\n\
// - B: u0\n\
// - A: v0\n\
uniform sampler2D data2_tex;\n\
\n\
uniform vec2 grid;\n\
\n\
varying vec2 coord;\n\
\n\
void main() {\n\
  vec4 data2 = texture2D(data2_tex, coord);\n\
  vec2 dx = vec2(grid.x, 0.0);\n\
  vec2 dy = vec2(0.0, grid.y);\n\
  // Process corners.\n\
  // TODO: values from previous step are used for corners.\n\
  if (coord.x < grid.x && coord.y < grid.y) {  \n\
    vec4 data2_p_dy = texture2D(data2_tex, coord + dy);\n\
    vec4 data2_p_dx = texture2D(data2_tex, coord + dx);\n\
    data2.ba = 0.5 * (data2_p_dy.ba + data2_p_dx.ba);\n\
  }\n\
  else if (coord.x > 1.0 - grid.x && coord.y < grid.y) {  \n\
    vec4 data2_p_dy = texture2D(data2_tex, coord + dy);\n\
    vec4 data2_m_dx = texture2D(data2_tex, coord - dx);\n\
    data2.ba = 0.5 * (data2_p_dy.ba + data2_m_dx.ba);\n\
  }\n\
  else if (coord.x > 1.0 - grid.x && coord.y > 1.0 - grid.y) {  \n\
    vec4 data2_m_dy = texture2D(data2_tex, coord - dy);\n\
    vec4 data2_m_dx = texture2D(data2_tex, coord - dx);\n\
    data2.ba = 0.5 * (data2_m_dy.ba + data2_m_dx.ba);\n\
  }\n\
  else if (coord.x < grid.x && coord.y > 1.0 - grid.y) {  \n\
    vec4 data2_m_dy = texture2D(data2_tex, coord - dy);\n\
    vec4 data2_p_dx = texture2D(data2_tex, coord + dx);\n\
    data2.ba = 0.5 * (data2_m_dy.ba + data2_p_dx.ba);\n\
  }\n\
  // Process boundaries.\n\
  // Left.\n\
  else if (coord.x < grid.x) {\n\
    data2.ba = texture2D(data2_tex, coord + dx).ba;\n\
  }\n\
  // Right.\n\
  else if (coord.x > 1.0 - grid.x) {\n\
    data2.ba = texture2D(data2_tex, coord - dx).ba;\n\
  }\n\
  // Down.\n\
  else if (coord.y < grid.y) {\n\
    data2.ba = texture2D(data2_tex, coord + dy).ba;\n\
  }\n\
  // Up.\n\
  else if (coord.y > 1.0 - grid.y) {\n\
    data2.ba = texture2D(data2_tex, coord - dy).ba;\n\
  }\n\
  \n\
  gl_FragColor = data2;\n\
}\n\
\n\
';

lab.glsl['src/lab/models/energy2d/engine/physics-solvers-gpu/fluid-solver-glsl/apply-uv-boundary.fs.glsl'] = '\
// texture 2: \n\
// - R: u\n\
// - G: v\n\
// - B: u0\n\
// - A: v0\n\
uniform sampler2D data2_tex;\n\
\n\
uniform vec2 grid;\n\
\n\
varying vec2 coord;\n\
\n\
void main() {\n\
  vec4 data2 = texture2D(data2_tex, coord);\n\
  vec2 dx = vec2(grid.x, 0.0);\n\
  vec2 dy = vec2(0.0, grid.y);\n\
  // Process corners.\n\
  // TODO: values from previous step are used for corners.\n\
  if (coord.x < grid.x && coord.y < grid.y) {  \n\
    vec4 data2_p_dy = texture2D(data2_tex, coord + dy);\n\
    vec4 data2_p_dx = texture2D(data2_tex, coord + dx);\n\
    data2.rg = 0.5 * (data2_p_dy.rg + data2_p_dx.rg);\n\
  }\n\
  else if (coord.x > 1.0 - grid.x && coord.y < grid.y) {  \n\
    vec4 data2_p_dy = texture2D(data2_tex, coord + dy);\n\
    vec4 data2_m_dx = texture2D(data2_tex, coord - dx);\n\
    data2.rg = 0.5 * (data2_p_dy.rg + data2_m_dx.rg);\n\
  }\n\
  else if (coord.x > 1.0 - grid.x && coord.y > 1.0 - grid.y) {  \n\
    vec4 data2_m_dy = texture2D(data2_tex, coord - dy);\n\
    vec4 data2_m_dx = texture2D(data2_tex, coord - dx);\n\
    data2.rg = 0.5 * (data2_m_dy.rg + data2_m_dx.rg);\n\
  }\n\
  else if (coord.x < grid.x && coord.y > 1.0 - grid.y) {  \n\
    vec4 data2_m_dy = texture2D(data2_tex, coord - dy);\n\
    vec4 data2_p_dx = texture2D(data2_tex, coord + dx);\n\
    data2.rg = 0.5 * (data2_m_dy.rg + data2_p_dx.rg);\n\
  }\n\
  // Process boundaries.\n\
  // Left.\n\
  else if (coord.x < grid.x) {\n\
    vec4 data2_p_dx = texture2D(data2_tex, coord + dx);\n\
    data2.rg = vec2(data2_p_dx.r, -data2_p_dx.g);\n\
  }\n\
  // Right.\n\
  else if (coord.x > 1.0 - grid.x) {\n\
    vec4 data2_m_dx = texture2D(data2_tex, coord - dx);\n\
    data2.rg = vec2(data2_m_dx.r, -data2_m_dx.g);\n\
  }\n\
  // Down.\n\
  else if (coord.y < grid.y) {\n\
    vec4 data2_p_dy = texture2D(data2_tex, coord + dy);\n\
    data2.rg = vec2(-data2_p_dy.r, data2_p_dy.g);\n\
  }\n\
  // Up.\n\
  else if (coord.y > 1.0 - grid.y) {\n\
    vec4 data2_m_dy = texture2D(data2_tex, coord - dy);\n\
    data2.rg = vec2(-data2_m_dy.r, data2_m_dy.g);\n\
  }\n\
  \n\
  gl_FragColor = data2;\n\
}\n\
\n\
';

lab.glsl['src/lab/models/energy2d/engine/physics-solvers-gpu/fluid-solver-glsl/basic.vs.glsl'] = '\
varying vec2 coord;\n\
\n\
void main() {\n\
  coord = gl_Vertex.xy * 0.5 + 0.5;\n\
  gl_Position = vec4(gl_Vertex.xy, 0.0, 1.0);\n\
}\n\
\n\
';

lab.glsl['src/lab/models/energy2d/engine/physics-solvers-gpu/fluid-solver-glsl/conserve-step1.fs.glsl'] = '\
// texture 1: \n\
// - R: q\n\
// - G: capacity\n\
// - B: density\n\
// - A: fluidity\n\
uniform sampler2D data1_tex;\n\
// texture 2: \n\
// - R: u\n\
// - G: v\n\
// - B: u0\n\
// - A: v0\n\
uniform sampler2D data2_tex;\n\
\n\
uniform vec2 grid;\n\
uniform float i2dx;\n\
uniform float i2dy;\n\
\n\
varying vec2 coord;\n\
\n\
void main() {\n\
  vec4 data2 = texture2D(data2_tex, coord);\n\
  float fluidity = texture2D(data1_tex, coord).a;\n\
  \n\
  if (coord.x > grid.x && coord.x < 1.0 - grid.x &&\n\
      coord.y > grid.y && coord.y < 1.0 - grid.y &&\n\
      fluidity == 1.0) {\n\
    \n\
    vec2 dx = vec2(grid.x, 0.0);\n\
    vec2 dy = vec2(0.0, grid.y);\n\
    \n\
    vec4 data2_m_dy = texture2D(data2_tex, coord - dy);\n\
    vec4 data2_p_dy = texture2D(data2_tex, coord + dy);\n\
    vec4 data2_m_dx = texture2D(data2_tex, coord - dx);\n\
    vec4 data2_p_dx = texture2D(data2_tex, coord + dx);\n\
    \n\
    // Phi.\n\
    data2.b = 0.0;\n\
    // Div.\n\
    data2.a = (data2_p_dy.r - data2_m_dy.r) * i2dx + (data2_p_dx.g - data2_m_dx.g) * i2dy;\n\
  }\n\
\n\
  gl_FragColor = data2;\n\
}\n\
\n\
';

lab.glsl['src/lab/models/energy2d/engine/physics-solvers-gpu/fluid-solver-glsl/conserve-step2.fs.glsl'] = '\
// texture 1: \n\
// - R: q\n\
// - G: capacity\n\
// - B: density\n\
// - A: fluidity\n\
uniform sampler2D data1_tex;\n\
// texture 2: \n\
// - R: u\n\
// - G: v\n\
// - B: u0\n\
// - A: v0\n\
uniform sampler2D data2_tex;\n\
\n\
uniform vec2 grid;\n\
uniform float s;\n\
uniform float idxsq;\n\
uniform float idysq;\n\
\n\
varying vec2 coord;\n\
\n\
void main() {\n\
  vec4 data2 = texture2D(data2_tex, coord);\n\
  float fluidity = texture2D(data1_tex, coord).a;\n\
  \n\
  if (coord.x > grid.x && coord.x < 1.0 - grid.x &&\n\
      coord.y > grid.y && coord.y < 1.0 - grid.y &&\n\
      fluidity == 1.0) {\n\
    \n\
    vec2 dx = vec2(grid.x, 0.0);\n\
    vec2 dy = vec2(0.0, grid.y);\n\
    \n\
    vec4 data2_m_dy = texture2D(data2_tex, coord - dy);\n\
    vec4 data2_p_dy = texture2D(data2_tex, coord + dy);\n\
    vec4 data2_m_dx = texture2D(data2_tex, coord - dx);\n\
    vec4 data2_p_dx = texture2D(data2_tex, coord + dx);\n\
    \n\
    // Phi.\n\
    data2.b = s * ((data2_m_dy.b + data2_p_dy.b) * idxsq + (data2_m_dx.b + data2_p_dx.b) * idysq - data2.a);\n\
  }\n\
\n\
  gl_FragColor = data2;\n\
}\n\
\n\
';

lab.glsl['src/lab/models/energy2d/engine/physics-solvers-gpu/fluid-solver-glsl/conserve-step3.fs.glsl'] = '\
// texture 1: \n\
// - R: q\n\
// - G: capacity\n\
// - B: density\n\
// - A: fluidity\n\
uniform sampler2D data1_tex;\n\
// texture 2: \n\
// - R: u\n\
// - G: v\n\
// - B: u0\n\
// - A: v0\n\
uniform sampler2D data2_tex;\n\
\n\
uniform vec2 grid;\n\
uniform float i2dx;\n\
uniform float i2dy;\n\
\n\
varying vec2 coord;\n\
\n\
void main() {\n\
  vec4 data2 = texture2D(data2_tex, coord);\n\
  float fluidity = texture2D(data1_tex, coord).a;\n\
  \n\
  if (coord.x > grid.x && coord.x < 1.0 - grid.x &&\n\
      coord.y > grid.y && coord.y < 1.0 - grid.y &&\n\
      fluidity == 1.0) {\n\
    \n\
    vec2 dx = vec2(grid.x, 0.0);\n\
    vec2 dy = vec2(0.0, grid.y);\n\
    \n\
    vec4 data2_m_dy = texture2D(data2_tex, coord - dy);\n\
    vec4 data2_p_dy = texture2D(data2_tex, coord + dy);\n\
    vec4 data2_m_dx = texture2D(data2_tex, coord - dx);\n\
    vec4 data2_p_dx = texture2D(data2_tex, coord + dx);\n\
    \n\
    // U.\n\
    data2.r -= (data2_p_dy.b - data2_m_dy.b) * i2dx;\n\
    // V.\n\
    data2.g -= (data2_p_dx.b - data2_m_dx.b) * i2dy;\n\
  }\n\
\n\
  gl_FragColor = data2;\n\
}\n\
\n\
';

lab.glsl['src/lab/models/energy2d/engine/physics-solvers-gpu/fluid-solver-glsl/diffuse.fs.glsl'] = '\
// texture 1: \n\
// - R: q\n\
// - G: capacity\n\
// - B: density\n\
// - A: fluidity\n\
uniform sampler2D data1_tex;\n\
// texture 2: \n\
// - R: u\n\
// - G: v\n\
// - B: u0\n\
// - A: v0\n\
uniform sampler2D data2_tex;\n\
\n\
uniform vec2 grid;\n\
uniform float hx;\n\
uniform float hy;\n\
uniform float dn;\n\
\n\
varying vec2 coord;\n\
\n\
void main() {\n\
  vec4 data2 = texture2D(data2_tex, coord);\n\
  float fluidity = texture2D(data1_tex, coord).a;\n\
  \n\
  if (coord.x > grid.x && coord.x < 1.0 - grid.x &&\n\
      coord.y > grid.y && coord.y < 1.0 - grid.y &&\n\
      fluidity == 1.0) {\n\
    \n\
    vec2 dx = vec2(grid.x, 0.0);\n\
    vec2 dy = vec2(0.0, grid.y);\n\
    \n\
    vec4 data2_m_dy = texture2D(data2_tex, coord - dy);\n\
    vec4 data2_p_dy = texture2D(data2_tex, coord + dy);\n\
    vec4 data2_m_dx = texture2D(data2_tex, coord - dx);\n\
    vec4 data2_p_dx = texture2D(data2_tex, coord + dx);\n\
    // Update velocity UV components.\n\
    data2.rg = (data2.ba + hx * (data2_m_dy.rg + data2_p_dy.rg)\n\
                         + hy * (data2_m_dx.rg + data2_p_dx.rg)) * dn;\n\
  }\n\
\n\
  gl_FragColor = data2;\n\
}\n\
\n\
';

lab.glsl['src/lab/models/energy2d/engine/physics-solvers-gpu/fluid-solver-glsl/maccormack-step1.fs.glsl'] = '\
// texture 1: \n\
// - R: q\n\
// - G: capacity\n\
// - B: density\n\
// - A: fluidity\n\
uniform sampler2D data1_tex;\n\
// texture 2: \n\
// - R: u\n\
// - G: v\n\
// - B: u0\n\
// - A: v0\n\
uniform sampler2D data2_tex;\n\
\n\
uniform vec2 grid;\n\
uniform float tx;\n\
uniform float ty;\n\
\n\
varying vec2 coord;\n\
\n\
void main() {\n\
  vec4 data2 = texture2D(data2_tex, coord);\n\
  float fluidity = texture2D(data1_tex, coord).a;\n\
  \n\
  if (coord.x > grid.x && coord.x < 1.0 - grid.x &&\n\
      coord.y > grid.y && coord.y < 1.0 - grid.y &&\n\
      fluidity == 1.0) {\n\
    \n\
    vec2 dx = vec2(grid.x, 0.0);\n\
    vec2 dy = vec2(0.0, grid.y);\n\
    \n\
    vec4 data2_m_dy = texture2D(data2_tex, coord - dy);\n\
    vec4 data2_p_dy = texture2D(data2_tex, coord + dy);\n\
    vec4 data2_m_dx = texture2D(data2_tex, coord - dx);\n\
    vec4 data2_p_dx = texture2D(data2_tex, coord + dx);\n\
    // Update velocity UV components.\n\
    data2.rg = data2.ba - tx * (data2_p_dy.bb * data2_p_dy.ba - data2_m_dy.bb * data2_m_dy.ba)\n\
              - ty * (data2_p_dx.aa * data2_p_dx.ba - data2_m_dx.aa * data2_m_dx.ba);\n\
  }\n\
\n\
  gl_FragColor = data2;\n\
}\n\
\n\
';

lab.glsl['src/lab/models/energy2d/engine/physics-solvers-gpu/fluid-solver-glsl/maccormack-step2.fs.glsl'] = '\
// texture 1: \n\
// - R: q\n\
// - G: capacity\n\
// - B: density\n\
// - A: fluidity\n\
uniform sampler2D data1_tex;\n\
// texture 2: \n\
// - R: u\n\
// - G: v\n\
// - B: u0\n\
// - A: v0\n\
uniform sampler2D data2_tex;\n\
\n\
uniform vec2 grid;\n\
uniform float tx;\n\
uniform float ty;\n\
\n\
varying vec2 coord;\n\
\n\
void main() {\n\
  vec4 data2 = texture2D(data2_tex, coord);\n\
  float fluidity = texture2D(data1_tex, coord).a;\n\
  \n\
  if (coord.x > grid.x && coord.x < 1.0 - grid.x &&\n\
      coord.y > grid.y && coord.y < 1.0 - grid.y &&\n\
      fluidity == 1.0) {\n\
    \n\
    vec2 dx = vec2(grid.x, 0.0);\n\
    vec2 dy = vec2(0.0, grid.y);\n\
    \n\
    vec4 data2_m_dy = texture2D(data2_tex, coord - dy);\n\
    vec4 data2_p_dy = texture2D(data2_tex, coord + dy);\n\
    vec4 data2_m_dx = texture2D(data2_tex, coord - dx);\n\
    vec4 data2_p_dx = texture2D(data2_tex, coord + dx);\n\
    // Update velocity UV components.\n\
    data2.rg = 0.5 * (data2.ba + data2.rg) \n\
            - 0.5 * tx * data2.bb * (data2_p_dy.rg - data2_m_dy.rg)\n\
            - 0.5 * ty * data2.aa * (data2_p_dx.rg - data2_m_dx.rg);\n\
  }\n\
\n\
  gl_FragColor = data2;\n\
}\n\
\n\
';

lab.glsl['src/lab/models/energy2d/engine/physics-solvers-gpu/fluid-solver-glsl/set-obstacle-boundary.fs.glsl'] = '\
// texture 1: \n\
// - R: q\n\
// - G: capacity\n\
// - B: density\n\
// - A: fluidity\n\
uniform sampler2D data1_tex;\n\
// texture 2: \n\
// - R: u\n\
// - G: v\n\
// - B: u0\n\
// - A: v0\n\
uniform sampler2D data2_tex;\n\
\n\
uniform vec2 grid;\n\
\n\
varying vec2 coord;\n\
\n\
void main() {\n\
  vec4 data2 = texture2D(data2_tex, coord);\n\
  float fluidity = texture2D(data1_tex, coord).a;\n\
  \n\
  if (coord.x > grid.x && coord.x < 1.0 - grid.x &&\n\
      coord.y > grid.y && coord.y < 1.0 - grid.y &&\n\
      fluidity == 0.0) {\n\
    \n\
    vec2 dx = vec2(grid.x, 0.0);\n\
    vec2 dy = vec2(0.0, grid.y);\n\
\n\
    if (texture2D(data1_tex, coord - dy).a == 1.0) {\n\
      data2.ba = texture2D(data2_tex, coord - dy).ba;\n\
    } \n\
    else if (texture2D(data1_tex, coord + dy).a == 1.0) {\n\
      data2.ba = texture2D(data2_tex, coord + dy).ba;\n\
    } \n\
\n\
    if (texture2D(data1_tex, coord - dx).a == 1.0) {\n\
      data2.ba = texture2D(data2_tex, coord - dx).ba;\n\
    } \n\
    else if (texture2D(data1_tex, coord + dx).a == 1.0) {\n\
      data2.ba = texture2D(data2_tex, coord + dx).ba;\n\
    } \n\
  }\n\
\n\
  gl_FragColor = data2;\n\
}\n\
\n\
';

lab.glsl['src/lab/models/energy2d/engine/physics-solvers-gpu/fluid-solver-glsl/set-obstacle-velocity.fs.glsl'] = '\
// texture 1: \n\
// - R: q\n\
// - G: capacity\n\
// - B: density\n\
// - A: fluidity\n\
uniform sampler2D data1_tex;\n\
// texture 2: \n\
// - R: u\n\
// - G: v\n\
// - B: u0\n\
// - A: v0\n\
uniform sampler2D data2_tex;\n\
// texture 3: \n\
// - R: uWind\n\
// - G: vWind\n\
// - B: undefined\n\
// - A: undefined\n\
uniform sampler2D data3_tex;\n\
\n\
uniform vec2 grid;\n\
\n\
varying vec2 coord;\n\
\n\
void main() {\n\
  vec4 data2 = texture2D(data2_tex, coord);\n\
  float fluidity = texture2D(data1_tex, coord).a;\n\
\n\
  if (coord.x > grid.x && coord.x < 1.0 - grid.x &&\n\
      coord.y > grid.y && coord.y < 1.0 - grid.y &&\n\
      fluidity == 0.0) {\n\
    \n\
    vec2 dx = vec2(grid.x, 0.0);\n\
    vec2 dy = vec2(0.0, grid.y);\n\
\n\
    int count = 0;\n\
\n\
    if (texture2D(data1_tex, coord - dy).a == 1.0) {\n\
      count += 1;\n\
      vec2 data2_m_dy = texture2D(data2_tex, coord - dy).rg;\n\
      data2.rg = texture2D(data3_tex, coord).rg + vec2(-data2_m_dy.r, data2_m_dy.g);\n\
    } \n\
    else if (texture2D(data1_tex, coord + dy).a == 1.0) {\n\
      count += 1;\n\
      vec2 data2_p_dy = texture2D(data2_tex, coord + dy).rg;\n\
      data2.rg = texture2D(data3_tex, coord).rg + vec2(-data2_p_dy.r, data2_p_dy.g);\n\
    } \n\
\n\
    if (texture2D(data1_tex, coord - dx).a == 1.0) {\n\
      count += 1;\n\
      vec2 data2_m_dx = texture2D(data2_tex, coord - dx).rg;\n\
      data2.rg = texture2D(data3_tex, coord).rg + vec2(data2_m_dx.r, -data2_m_dx.g);\n\
    } \n\
    else if (texture2D(data1_tex, coord + dx).a == 1.0) {\n\
      count += 1;\n\
      vec2 data2_p_dx = texture2D(data2_tex, coord + dx).rg;\n\
      data2.rg = texture2D(data3_tex, coord).rg + vec2(data2_p_dx.r, -data2_p_dx.g);\n\
    } \n\
\n\
    if (count == 0) {\n\
      data2.rg = texture2D(data3_tex, coord).rg;\n\
    }\n\
  }\n\
  \n\
  gl_FragColor = data2;\n\
}\n\
\n\
';

lab.glsl['src/lab/models/energy2d/engine/physics-solvers-gpu/fluid-solver-glsl/uv-to-u0v0.fs.glsl'] = '\
// texture 2: \n\
// - R: u\n\
// - G: v\n\
// - B: u0\n\
// - A: v0\n\
uniform sampler2D data2_tex;\n\
\n\
varying vec2 coord;\n\
\n\
void main() {\n\
	vec4 data2 = texture2D(data2_tex, coord);\n\
	data2.ba = data2.rg;\n\
	gl_FragColor = data2;\n\
}\n\
\n\
';

lab.glsl['src/lab/models/energy2d/engine/physics-solvers-gpu/heat-solver-glsl/basic.vs.glsl'] = '\
varying vec2 coord;\n\
\n\
void main() {\n\
  coord = gl_Vertex.xy * 0.5 + 0.5;\n\
  gl_Position = vec4(gl_Vertex.xy, 0.0, 1.0);\n\
}\n\
\n\
';

lab.glsl['src/lab/models/energy2d/engine/physics-solvers-gpu/heat-solver-glsl/force-flux-t.fs.glsl'] = '\
// texture 0: \n\
// - R: t\n\
// - G: t0\n\
// - B: tb\n\
// - A: conductivity\n\
uniform sampler2D data0_tex;\n\
\n\
uniform vec2 grid;\n\
uniform float vN;\n\
uniform float vS;\n\
uniform float vW;\n\
uniform float vE;\n\
uniform float delta_x;\n\
uniform float delta_y;\n\
\n\
varying vec2 coord;\n\
\n\
void main() {\n\
  vec4 data0 = texture2D(data0_tex, coord);\n\
  vec2 dx = vec2(grid.x, 0.0);\n\
  vec2 dy = vec2(0.0, grid.y);\n\
  if (coord.x < grid.x) {\n\
    data0.r = texture2D(data0_tex, coord + dx).r\n\
            + vN * delta_y / data0.a;\n\
  } else if (coord.x > 1.0 - grid.x) {\n\
    data0.r = texture2D(data0_tex, coord - dx).r\n\
            - vS * delta_y / data0.a;\n\
  } else if (coord.y < grid.y) {\n\
    data0.r = texture2D(data0_tex, coord + dy).r\n\
            - vW * delta_x / data0.a;\n\
  } else if (coord.y > 1.0 - grid.y) {\n\
    data0.r = texture2D(data0_tex, coord - dy).r\n\
            + vE * delta_x / data0.a;\n\
  }\n\
  gl_FragColor = data0;\n\
}\n\
\n\
';

lab.glsl['src/lab/models/energy2d/engine/physics-solvers-gpu/heat-solver-glsl/force-flux-t0.fs.glsl'] = '\
// texture 0: \n\
// - R: t\n\
// - G: t0\n\
// - B: tb\n\
// - A: conductivity\n\
uniform sampler2D data0_tex;\n\
\n\
uniform vec2 grid;\n\
uniform float vN;\n\
uniform float vS;\n\
uniform float vW;\n\
uniform float vE;\n\
uniform float delta_x;\n\
uniform float delta_y;\n\
\n\
varying vec2 coord;\n\
\n\
void main() {\n\
  vec4 data0 = texture2D(data0_tex, coord);\n\
  vec2 dx = vec2(grid.x, 0.0);\n\
  vec2 dy = vec2(0.0, grid.y);\n\
  if (coord.x < grid.x) {\n\
    data0.g = texture2D(data0_tex, coord + dx).r\n\
            + vN * delta_y / data0.a;\n\
  } else if (coord.x > 1.0 - grid.x) {\n\
    data0.g = texture2D(data0_tex, coord - dx).r\n\
            - vS * delta_y / data0.a;\n\
  } else if (coord.y < grid.y) {\n\
    data0.g = texture2D(data0_tex, coord + dy).r\n\
            - vW * delta_x / data0.a;\n\
  } else if (coord.y > 1.0 - grid.y) {\n\
    data0.g = texture2D(data0_tex, coord - dy).r\n\
            + vE * delta_x / data0.a;\n\
  }\n\
  gl_FragColor = data0;\n\
}\n\
\n\
';

lab.glsl['src/lab/models/energy2d/engine/physics-solvers-gpu/heat-solver-glsl/maccormack-step1.fs.glsl'] = '\
// texture 0: \n\
// - R: t\n\
// - G: t0\n\
// - B: tb\n\
// - A: conductivity\n\
uniform sampler2D data0_tex;\n\
// texture 1: \n\
// - R: q\n\
// - G: capacity\n\
// - B: density\n\
// - A: fluidity\n\
uniform sampler2D data1_tex;\n\
// texture 2: \n\
// - R: u\n\
// - G: v\n\
// - B: u0\n\
// - A: v0\n\
uniform sampler2D data2_tex;\n\
\n\
uniform vec2 grid;\n\
uniform float tx;\n\
uniform float ty;\n\
\n\
// Boundary conditions uniforms.\n\
uniform float enforce_temp;\n\
uniform float vN;\n\
uniform float vS;\n\
uniform float vW;\n\
uniform float vE;\n\
\n\
varying vec2 coord;\n\
\n\
void main() {\n\
  vec4 data0 = texture2D(data0_tex, coord);\n\
  \n\
  if (coord.x > grid.x && coord.x < 1.0 - grid.x &&\n\
      coord.y > grid.y && coord.y < 1.0 - grid.y) {\n\
    \n\
    float fluidity = texture2D(data1_tex, coord).a;\n\
    if (fluidity == 1.0) {\n\
      vec2 dx = vec2(grid.x, 0.0);\n\
      vec2 dy = vec2(0.0, grid.y);\n\
\n\
      // Temperature.\n\
      float t_m_dy = texture2D(data0_tex, coord - dy).r;\n\
      float t_p_dy = texture2D(data0_tex, coord + dy).r;\n\
      float t_m_dx = texture2D(data0_tex, coord - dx).r;\n\
      float t_p_dx = texture2D(data0_tex, coord + dx).r;\n\
      // Velocity.\n\
      float u_m_dy = texture2D(data2_tex, coord - dy).r;\n\
      float u_p_dy = texture2D(data2_tex, coord + dy).r;\n\
      float v_m_dx = texture2D(data2_tex, coord - dx).g;\n\
      float v_p_dx = texture2D(data2_tex, coord + dx).g;\n\
      // Update T0.\n\
      data0.g = data0.r - tx * (u_p_dy * t_p_dy - u_m_dy * t_m_dy)\n\
                        - ty * (v_p_dx * t_p_dx - v_m_dx * t_m_dx);\n\
    }\n\
  } else if (enforce_temp == 1.0) {\n\
    // "temperature at border" boundary conditions are\n\
    // integrated into this shader.\n\
    if (coord.x < grid.x) {\n\
      data0.g = vN;\n\
    } else if (coord.x > 1.0 - grid.x) {\n\
      data0.g = vS;\n\
    } else if (coord.y < grid.y) {\n\
      data0.g = vW;\n\
    } else if (coord.y > 1.0 - grid.y) {\n\
      data0.g = vE;\n\
    }\n\
  }\n\
  gl_FragColor = data0;\n\
}\n\
\n\
';

lab.glsl['src/lab/models/energy2d/engine/physics-solvers-gpu/heat-solver-glsl/maccormack-step2.fs.glsl'] = '\
// texture 0: \n\
// - R: t\n\
// - G: t0\n\
// - B: tb\n\
// - A: conductivity\n\
uniform sampler2D data0_tex;\n\
// texture 1: \n\
// - R: q\n\
// - G: capacity\n\
// - B: density\n\
// - A: fluidity\n\
uniform sampler2D data1_tex;\n\
// texture 2: \n\
// - R: u\n\
// - G: v\n\
// - B: u0\n\
// - A: v0\n\
uniform sampler2D data2_tex;\n\
\n\
uniform vec2 grid;\n\
uniform float tx;\n\
uniform float ty;\n\
\n\
// Boundary conditions uniforms.\n\
uniform float enforce_temp;\n\
uniform float vN;\n\
uniform float vS;\n\
uniform float vW;\n\
uniform float vE;\n\
\n\
varying vec2 coord;\n\
\n\
void main() {\n\
  vec4 data0 = texture2D(data0_tex, coord);\n\
  \n\
  if (coord.x > grid.x && coord.x < 1.0 - grid.x &&\n\
      coord.y > grid.y && coord.y < 1.0 - grid.y) {\n\
    \n\
    float fluidity = texture2D(data1_tex, coord).a;\n\
    if (fluidity == 1.0) {\n\
      vec2 dx = vec2(grid.x, 0.0);\n\
      vec2 dy = vec2(0.0, grid.y);\n\
\n\
      // Temperature t0.\n\
      float t0_m_dy = texture2D(data0_tex, coord - dy).g;\n\
      float t0_p_dy = texture2D(data0_tex, coord + dy).g;\n\
      float t0_m_dx = texture2D(data0_tex, coord - dx).g;\n\
      float t0_p_dx = texture2D(data0_tex, coord + dx).g;\n\
      // Velocity.\n\
      float u = texture2D(data2_tex, coord).r;\n\
      float v = texture2D(data2_tex, coord).g;\n\
      // Update T.\n\
      data0.r = 0.5 * (data0.r + data0.g)\n\
              - 0.5 * tx * u * (t0_p_dy - t0_m_dy)\n\
              - 0.5 * ty * v * (t0_p_dx - t0_m_dx);\n\
    }\n\
  } else if (enforce_temp == 1.0) {\n\
    // "temperature at border" boundary conditions are\n\
    // integrated into this shader.\n\
    if (coord.x < grid.x) {\n\
      data0.r = vN;\n\
    } else if (coord.x > 1.0 - grid.x) {\n\
      data0.r = vS;\n\
    } else if (coord.y < grid.y) {\n\
      data0.r = vW;\n\
    } else if (coord.y > 1.0 - grid.y) {\n\
      data0.r = vE;\n\
    }\n\
  }\n\
  gl_FragColor = data0;\n\
}\n\
\n\
';

lab.glsl['src/lab/models/energy2d/engine/physics-solvers-gpu/heat-solver-glsl/solver.fs.glsl'] = '\
// texture 0: \n\
// - R: t\n\
// - G: t0\n\
// - B: tb\n\
// - A: conductivity\n\
uniform sampler2D data0_tex;\n\
// texture 1: \n\
// - R: q\n\
// - G: capacity\n\
// - B: density\n\
// - A: fluidity\n\
uniform sampler2D data1_tex;\n\
\n\
uniform vec2 grid;\n\
uniform float hx;\n\
uniform float hy;\n\
uniform float inv_timestep;\n\
\n\
// Boundary conditions uniforms\n\
uniform float enforce_temp;\n\
uniform float vN;\n\
uniform float vS;\n\
uniform float vW;\n\
uniform float vE;\n\
\n\
varying vec2 coord;\n\
\n\
void main() {\n\
  vec4 data0 = texture2D(data0_tex, coord);\n\
  if (coord.x > grid.x && coord.x < 1.0 - grid.x &&\n\
      coord.y > grid.y && coord.y < 1.0 - grid.y) {\n\
    vec2 dx = vec2(grid.x, 0.0);\n\
    vec2 dy = vec2(0.0, grid.y);\n\
    float tb = data0.b;\n\
    // Check if tb is NaN. isnan() function is not available\n\
    // in OpenGL ES GLSL, so use some tricks. IEEE 754 spec defines\n\
    // that NaN != NaN, however this seems to not work on Windows.\n\
    // So, also check if the value is outside [-3.4e38, 3.4e38] (3.4e38\n\
    // is close to 32Float max value), as such values are not expected.\n\
    if (tb != tb || tb < -3.4e38 || tb > 3.4e38) {\n\
      vec4 data1 = texture2D(data1_tex, coord);\n\
      vec4 data0_m_dy = texture2D(data0_tex, coord - dy);\n\
      vec4 data0_p_dy = texture2D(data0_tex, coord + dy);\n\
      vec4 data0_m_dx = texture2D(data0_tex, coord - dx);\n\
      vec4 data0_p_dx = texture2D(data0_tex, coord + dx);\n\
      float sij = data1.g * data1.b * inv_timestep;\n\
      float rij = data0.a;\n\
      float axij = hx * (rij + data0_m_dy.a);\n\
      float bxij = hx * (rij + data0_p_dy.a);\n\
      float ayij = hy * (rij + data0_m_dx.a);\n\
      float byij = hy * (rij + data0_p_dx.a);\n\
      data0.r = (data0.g * sij + data1.r\n\
                 + axij * data0_m_dy.r\n\
                 + bxij * data0_p_dy.r\n\
                 + ayij * data0_m_dx.r\n\
                 + byij * data0_p_dx.r)\n\
                 / (sij + axij + bxij + ayij + byij);\n\
    } else {\n\
      data0.r = tb;\n\
    }\n\
  } else if (enforce_temp == 1.0) {\n\
    // "temperature at border" boundary conditions are\n\
    // integrated into this shader.\n\
    if (coord.x < grid.x) {\n\
      data0.r = vN;\n\
    } else if (coord.x > 1.0 - grid.x) {\n\
      data0.r = vS;\n\
    } else if (coord.y < grid.y) {\n\
      data0.r = vW;\n\
    } else if (coord.y > 1.0 - grid.y) {\n\
      data0.r = vE;\n\
    }\n\
  }\n\
  gl_FragColor = data0;\n\
}\n\
\n\
';

lab.glsl['src/lab/models/energy2d/engine/physics-solvers-gpu/heat-solver-glsl/t-to-t0.fs.glsl'] = '\
// texture 0: \n\
// - R: t\n\
// - G: t0\n\
// - B: tb\n\
// - A: conductivity\n\
uniform sampler2D data0_tex;\n\
\n\
varying vec2 coord;\n\
\n\
void main() {\n\
	vec4 data0 = texture2D(data0_tex, coord);\n\
	data0.g = data0.r;\n\
	gl_FragColor = data0;\n\
}\n\
\n\
';

lab.glsl['src/lab/views/energy2d/heatmap-webgl-glsl/basic.vs.glsl'] = '\
varying vec2 coord;\n\
\n\
void main() {\n\
  coord = gl_TexCoord.xy;\n\
  gl_Position = vec4(gl_Vertex.xyz, 1.0);\n\
}\n\
\n\
';

lab.glsl['src/lab/views/energy2d/heatmap-webgl-glsl/temp-renderer.fs.glsl'] = '\
// Provided textur contains temperature data in R channel.\n\
uniform sampler2D heatmap_tex;\n\
uniform sampler2D palette_tex;\n\
\n\
uniform float max_temp;\n\
uniform float min_temp;\n\
\n\
varying vec2 coord;\n\
\n\
void main() {\n\
  float temp = texture2D(heatmap_tex, coord).r;\n\
  float scaled_temp = (temp - min_temp) / (max_temp - min_temp);\n\
  gl_FragColor = texture2D(palette_tex, vec2(scaled_temp, 0.5));\n\
}\n\
\n\
';

lab.glsl['src/lab/views/energy2d/vectormap-webgl-glsl/vectormap.fs.glsl'] = '\
uniform vec4 color;\n\
\n\
void main() {\n\
  gl_FragColor = color;\n\
}\n\
\n\
';

lab.glsl['src/lab/views/energy2d/vectormap-webgl-glsl/vectormap.vs.glsl'] = '\
// Provided texture contains vector data in RG channels.\n\
attribute vec2 origin;\n\
\n\
uniform sampler2D vectormap_tex;\n\
uniform float base_length;\n\
uniform float vector_scale;\n\
uniform vec2 scale;\n\
\n\
void main() {\n\
  // Read vector which should be visualized.\n\
  vec2 vec = texture2D(vectormap_tex, gl_TexCoord.xy).xy;\n\
  vec.y = -vec.y;\n\
\n\
  if (length(vec) < 1e-15) {\n\
    // Do not draw to small vectors.\n\
    // Set position outside [-1, 1] region, which is rendered.\n\
    gl_Position = vec4(2.0);\n\
    return;\n\
  }\n\
\n\
  // Test which part of the vector arrow is being processed. \n\
  if (gl_Vertex.x == 0.0 && gl_Vertex.y == 0.0) {\n\
    // Origin of the arrow is being processed.\n\
    // Just transform its coordinates.\n\
    gl_Position = vec4(origin, 0.0, 1.0);\n\
  } else {\n\
    // Other parts of arrow are being processed.\n\
    // Set proper length of the arrow, rotate it, scale\n\
    // and finally transform.\n\
\n\
    // Calculate arrow length.\n\
    vec2 new_pos = gl_Vertex.xy;\n\
    new_pos.x += base_length + vector_scale * length(vec);\n\
\n\
    // Calculate angle between reference arrow (horizontal).\n\
    vec = normalize(vec);\n\
    float angle = acos(dot(vec, vec2(1.0, 0.0)));\n\
    if (vec.y < 0.0) {\n\
      angle = -angle;\n\
    }\n\
    // Prepare rotation matrix.\n\
    // See: http://en.wikipedia.org/wiki/Rotation_matrix\n\
    mat2 rot_m = mat2(\n\
      cos(angle), sin(angle),\n\
     -sin(angle), cos(angle)\n\
    );\n\
    // Rotate.\n\
    new_pos = rot_m * new_pos;\n\
    // Scale.\n\
    new_pos = new_pos * scale;\n\
    // Transform.\n\
    gl_Position = vec4(new_pos + origin, 0.0, 1.0);\n\
  }\n\
}\n\
\n\
';

