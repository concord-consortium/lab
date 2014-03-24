# Repository structure



## vendor/

Third-party JavaScript runtime dependencies for Lab are located in the
**[`vendor/`](https://github.com/concord-consortium/lab/tree/master/vendor)**
directory and are installed as git submodules
the first time `make` is run in a new checkout of the source code repository.

Only the necessary JavaScript library files and other resources needed for runtime operation along
with the associated README and LICENSE files are copied to **`public/vendor`** during
the build process.

All of the files copied to **`public/vendor`** are licensed and distributed under
one or more of the following licenses:
[Simplified BSD](http://www.opensource.org/licenses/BSD-2-Clause),
[The BSD 3-Clause](http://www.opensource.org/licenses/BSD-3-Clause),
[MIT](http://www.opensource.org/licenses/MIT), or
[Apache 2.0](http://www.opensource.org/licenses/Apache-2.0).

## src/

The **[src/](https://github.com/concord-consortium/lab/tree/master/src)** directory
contains the main source code for the Lab framework, examples, and documentation. This
code is either copied directly or used to generate resources  that are copied.

### src/lab/

The **[src/lab](https://github.com/concord-consortium/lab/tree/master/src/lab)**
directory includes JavaScript source code for the Lab JavaScript modules.
During the build process individual files are copied into modules which are placed in
the **`public/lab`** directory.

#### src/lab/models/md2d

The [md2d](https://github.com/concord-consortium/lab/tree/master/src/lab/models/md2d) model-type contains a basic
**Next Generation Molecular Workbench** application. It built using a hybrid of a MVC design pattern
with a dataflow architecture necessary for performance.

The source code of the core molecular dynamics engine is currently located in the
[src/lab/models/md2d/models/engine](https://github.com/concord-consortium/lab/tree/master/src/lab/models/md2d/models/engine)
directory, which is organized as a set of related RequireJS modules. These modules are compatible
both with the Web browser environment and Node.

##### MD2D Headless Mode

##### [`node-bin/run-md2d`](https://github.com/concord-consortium/lab/blob/master/node-bin/run-md2d)

There is one working script for now:
[`node-bin/run-md2d`](https://github.com/concord-consortium/lab/blob/master/node-bin/run-md2d)

It runs simulation for desired time and prints Time, Kinetic Energy, Total Energy every tick.

Usage:

    ./node-bin/run-md2d -i [path] -o [path or stdout] -i [num]

    Options:
      -i, --input   Model JSON file        [string]  [required]
      -o, --output  Output file or stdout  [string]  [default: "stdout"]
      -t, --time    Integration time       [default: 100]

Example results:

    Model file: public/imports/legacy-mw-content/converted/new-examples-for-nextgen/simple-gas$0.json
    Output: stdout
    Integration time: 150
    time    KE      TE
    0       3.0988  3.1003
    50      3.1748  3.1011
    100     3.1748  3.0998
    150     3.1868  3.0986

##### Writing new scripts

In addition, new Node-based executables can be written. These are expected to be useful for verifying and tuning the model by running the model headless and saving summary results into a file for offline analysis.

If you want to create your own script running simulation in headless mode, the most reasonable solution is to use [`src/lab/md2d/models/modeler.js`](https://github.com/concord-
consortium/lab/blob/master/src/lab/md2d/models/modeler.js) as it provides high level API and
allows to load model description using JSON file. To run simulation use the `tick()` method.

[RequireJS](https://http://requirejs.org/) package must be correctly configured and used to load this module (see [the section about
RequireJS](#javascript-dependency-management-and-build-process---requrejs)). It also depends on [jQuery](http://jquery.com/) and [d3.js](http://mbostock.github.com/d3/) libraries.

Fortunately, you do not have to think about this configuration each time. There is prepared the entry point for external Node.js applications:

[`src/helpers/md2d/md2d-node-api.js`](https://github.com/concord-consortium/lab/blob/master/src/helpers/md2d/md2d-node-api.js)

This module configures RequireJS loader, environment (D3, jQuery) and exports MD2D Node API using Node.js/CommonJS approach.

Usage:

    var md2dAPI = require("../src/helpers/md2d/md2d-node-api");
    // (...)
    // To create e.g. Modeler mentioned above:
    var model = md2dAPI.Modeler(properties);

If you need to use something what is not included in this API, you can:

- Extend API defined in [`md2d-node-api.js`](https://github.com/concord-consortium/lab/blob/master/src/helpers/md2d/md2d-node-api.js). It should easy to do it looking at the existing code.
- Configure RequireJS yourself and use it to load module. Again, take a look at [`md2d-node-api.js`](https://github.com/concord-consortium/lab/blob/master/src/helpers/md2d/md2d-node-api.js) how to do it.

There is a chance that existing RequireJS config won't be sufficient (e.g. if you wan't to use dynamic cs files loading).

- The official, complete documentation:

  [http://requirejs.org/docs/api.html#config](http://requirejs.org/docs/api.html#config)

- RequireJS config for tests, as they also use similar approach:

  [`test/requirejs-config.js`](https://github.com/concord-consortium/lab/blob/master/test/requirejs-config.js)

Hashbang scripts for starting these executables (i.e., files which start with the line
`#!/usr/bin/env node` and which have the execute bit set) should be placed in the directory
[`node-bin`](https://github.com/concord-consortium/lab/tree/master/node-bin). Lab's
[`packages.json`](https://github.com/concord-consortium/lab/blob/master/package.json) file
specifies [`node-bin`](https://github.com/concord-consortium/lab/tree/master/node-bin) as the
location of the executable scripts which `npm` should make available whenever Lab is imported into
another project as a Node module. (FIXME: `bin/` was being reserved for Ruby
executables made available via Bundler, but that is no longer necessary)

##### MD2D simulation stepping

Main parameters which define speed and accuracy of simulation in MD2D are:

- timeStep,
- timeStepsPerTick,
- modelSampleRate.

To explain them let's start from the definition of the model "tick". One "tick" consists of:

- running simulation for **timeStepsPerTick** * **timeStep** femtoseconds,
- update of the view.

The "tick" is constantly repeated while simulation is running.

So, when timeStepsPerTick= 50 and timeStep = 1fs, one "tick" causes that the engine performs calculations for 50fs.

**timeStep** defines a time value used during the one integration step in the engine internals. It affects accuracy of calculations.
**timeStepsPerTick** in fact defines number of these integration steps during one "tick". It is defined because it makes no sense to refresh view too often.

Using pseudo-code we can say that tick is:

    for (i = 0 to timeStepsPerTick) {
       engine.advanceBy(timeStep)
    }
    view.update()

That's why timeStepsPerTick = 50 and timeStep = 1fs is different from timeStepsPerTick = 25 and timeStep = 2fs.
First one will be more accurate and two times slower (more or less) than second one, however both configurations will cause that one "tick" advance model by 50fs (25 * 2fs or 50 * 1fs).

**modelSampleRate** defines how often we should execute "tick". Of course, in most cases we should call it as often as it's possible and that's the default behavior (with upper limit of 60 times per second to avoid running simple models too fast).

You can test how these parameters work using the
[Model integration time step, period, and sample rate](interactives.html#interactives/basic-examples/sample-rate-and-refresh-rate.json)
interactive.

#### src/lab/models/energy2d/

The **[src/lab/models/energy2d](https://github.com/concord-consortium/lab/tree/master/src/lab/models/energy2d)** model-type contains
a basic **Energy2D* application*. It is a direct port of [Java Energy2D](http://energy.concord.org/energy2d/).
Energy2D is built with MVC design pattern.

[GPU Toolkit](https://github.com/concord-consortium/lab/tree/master/src/lab/models/energy2d/gpu) is a small set of utilities which wraps basic WebGL structures and objects, providing
higher level API. It is useful, as Energy2D uses WebGL for General-Purpose Computing on
Graphics Processing Unit. So, a lot of physics calculations are performed on the GPU if user's Web
browser supports WebGL technology.

The source code of the core physics engine is located in the [`src/lab/models/energy2d/models`](https://github.com/concord-consortium/lab/tree/master/src/lab/models/energy2d/models) directory.
Especially important units are listed below:

- Core Model [`src/lab/models/energy2d/models/core-model.js`](https://github.com/concord-consortium/lab/blob/master/src/lab/models/energy2d/models/core-model.js) - constructs all physics solvers,
stores simulation data (arrays, textures) and delegates physics calculations to proper objects.
- Physics Solvers [`src/lab/models/energy2d/models/physics-solvers`](https://github.com/concord-consortium/lab/tree/master/src/lab/models/energy2d/models/physics-solvers) - directory containing sequential
(plain JavaScritp) implementation of physics algorithms used by core model.
- Physics Solvers GPU [`src/lab/models/energy2d/models/physics-solvers-gpu`](https://github.com/concord-consortium/lab/tree/master/src/lab/models/energy2d/models/physics-solvers-gpu) - directory containing parallel
implementation (WebGL-based) of heat and fluid solvers.

Necessary GLSL (GL Shading Language) sources are stored in separate files. They are loaded using
RequireJS *text* plug-in which just allows to load plain text files. Finally, they are inlined in
the resulting library due to the RequireJS optimization process.

### src/lab/resources

The **[src/lab/resources/](https://github.com/concord-consortium/lab/tree/master/src/lab/resources)** 
directory contains image resources and are copied directly to **`public/lab/resources`**.

### src/sass

The **[src/sass/](https://github.com/concord-consortium/lab/tree/master/src/sass)** directory
contains Sass templates and the Bourbon Sass library are are used during the build process to 
generate CSS resources.

### src/helpers

The **[src/helpers/](https://github.com/concord-consortium/lab/tree/master/src/helpers)** directory contains
CoffeeScript and JavaScript modules as well as Ruby programs only used as part of the testing and
build process and are not copied to **`public/helpers`**.
