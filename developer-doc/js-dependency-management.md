# JavaScript Dependency Management and Build Process - RequreJS

Lab's modules use [RequireJS](http://requirejs.org/) for dependency management. It is a JavaScript
file and module loader optimized for in-browser use, but it can be used in other JavaScript
environments, like Rhino and Node. So, you don't have to worry about manual JavaScript files
concatenation and the library build process - everything is done automatically.

[RequireJS](http://requirejs.org/) might be used for fully asynchronous in-browser module loading,
but it can also be used for combining all source files into one output JavaScript file. The Lab
project mostly uses the second approach. The tool which resolves all dependencies and combines them
into single output file is called **RequireJS Optimizer**.

Useful RequireJS resources:

- [How to get started with RequireJS](http://requirejs.org/docs/start.html)
- [RequireJS API](http://requirejs.org/docs/api.html)
- [RequireJS Optimization](http://requirejs.org/docs/optimization.html)
- [RequireJS in Node](http://requirejs.org/docs/node.html)
- [RequireJS Google Group](https://groups.google.com/forum/?fromgroups#!forum/requirejs)


## Adding new source file intended to work in the Web browser

Adding a new source to existing module is straightforward.

1. Put the source file in an appropriate directory (e.g. `src/lab/module-name/`).

2. Define it as a module using RequireJS syntax, e.g. following this pattern:

        define(function (require) {
          // Dependencies.
          var utils = require('other-module-name/file-name');
          // Preparation code.
          // (...)
          // Finally, return module API.
          return {
            // (...)
          };
          // Or just constructor function:
          // return function ClassName() {
          //   (...)
          // };
        });

    You can read more about RequireJS modules syntax
    [here](http://requirejs.org/docs/api.html#define).


3. In case of need, reference this file in other sources using RequireJS syntax:

          var dependency = require('module-name/file-name');

That's all! Your file will be automatically included during module build process.

## Adding new source file intended to work in the Web browser and in Node

If you are working on file which should also work in the Node environment as a typical package
(without using RequireJS as a dependency and its syntax), follow instructions above and
additionally:

1. Add following snippet at the beginning of the source file:

        if (typeof define !== 'function') { var define = require('amdefine')(module) }

2. Make sure that `amdefine` package is listed as a dependency in your `package.json` file (it can be
Lab's [`packages.json`](https://github.com/concord-consortium/lab/blob/master/package.json) file
or separate one if you work on the independent module, like those stored in
[`src/modules`](https://github.com/concord-consortium/lab/tree/master/src/modules) directory).

The Lab's **array** module uses this technique, so you may look for a reference in
[`src/modules/arrays`](https://github.com/concord-consortium/lab/tree/master/src/modules/arrays).


## Adding new module which should be built as a separate library

This involves a few additional steps comparing with adding a single source file.

1. Create a new directory in `src/lab`.
2. Put all related sources there or in `src/lab/common` (if you think that they are generic enough
and may be reused by other modules).
3. Define `module-name.build.js` and `public-api.js` files in your new directory (described below).
4. Add build routines to the [`Makefile`](https://github.com/concord-consortium/lab/blob/master/Makefile):

    4.1. Define a new target, for example:

        public/lab/lab.module-name.js: \
            $(NEW_MODULE_SRC_FILES) \
            $(COMMON_SRC_FILES)
            $(R_OPTIMIZER) -o src/lab/module-name/module-name.build.js

    4.2. List this target in `LAB_JS_FILES` Makefile variable containing the list of all Lab JavaScript
      modules to be generated.

Your module will be built during Lab's build process. You may use one of the existing modules for
reference in case of any troubles
([`lab`](https://github.com/concord-consortium/lab/tree/master/src/lab),
[`import-export`](https://github.com/concord-consortium/lab/tree/master/src/lab/import-export) or
[`mml-converter`](https://github.com/concord-consortium/lab/tree/master/src/lab/mml-converter)).

## Module Build Configuration - *.build.js file

Each Lab's module contains file `name.build.js`. It is a RequireJS Optimizer build profile. Useful,
related resources:

- [RequireJS Build Profile Help](http://requirejs.org/docs/optimization.html#wholeproject)
- [Example Build File with All Options
Documented](https://github.com/jrburke/r.js/blob/master/build/example.build.js)

**If you create new build file, make sure that you use one of the existing build profiles as a
reference!** It will enforce consistent style and options across all Lab's modules.

Lab's build profiles use [almond](https://github.com/jrburke/almond) module - a replacement AMD
loader for RequireJS. It is a smaller "shim" loader, providing the minimal AMD API footprint that
includes loader plugin support.

Why? [almond](https://github.com/jrburke/almond) allows us to create the resulting library which is
totally independent from RequireJS. It is a reasonable approach as RequireJS is used only for module
definition, dependency resolving and building a single file library using Optimizer. The
asynchronous module loading is not utilized by the final Lab library, so there is no need to force
users to load whole RequireJS library. Instead, use and include minimalistic RequireJS API
replacement.

## Module Public API - public-api.js file

If module exposes API using global variables, it should define it in `public-api.js` file. It is
a typical RequireJS module, which just adds properties to `window` object. You can look at
[`src/lab/public-api.js`](https://github.com/concord-consortium/lab/blob/master/src/lab/public-api.js) file for a reference.

This files are **not necessary**, but **highly recommended** if module has to define some global
variables. It is a convention used internally by Lab repository. Such files are enforcing clean
definition of public API exposed by modules. Developers will have certainty that all global
variables are defined **there and only there**.

Execution of this script should be enforced by build profile (*.build.js files described above).
Most often is done by `wrap` option:

      // Protect global namespace and call Public API export.
      wrap: {
        start: "(function() {",
        // Almond by default simulates async call of require (sets timeout).
        // Last argument (true) forces sync call instead.
        end: "require(['module-name/public-api'], undefined, undefined, true); }());"
      }

## CoffeeScript Files Support

The Lab project is configured to easily support CoffeeScript sources. RequireJS plugin called
**require-cs** is used for dynamic loading of CoffeeScript sources.

To enable CoffeeScript support, make sure that module's build profile (see section about *.build.js
files) contains following options:

    // Additional modules.
    paths: {
    'cs' :'../vendor/require-cs/cs',
    'coffee-script': '../vendor/coffee-script/extras/coffee-script'
    },
    //Stub out the cs module after a build since
    //it will not be needed.
    stubModules: ['cs'],
    // The optimization will load CoffeeScript to convert
    // the CoffeeScript files to plain JS. Use the exclude
    // directive so that the coffee-script module is not included
    // in the built file.
    exclude: ['coffee-script']

`md2d` module has CoffeeScript support enabled, so you can use
[its build profile](https://github.com/concord-consortium/lab/blob/master/src/lab/md2d/md2d.build.js)
as a reference.

- To define a CoffeeScript module just use typical RequireJS syntax converted to CoffeeScript:

        define (require) ->
          # Dependencies.
          CoffeeScriptDependency = require 'cs!other-module-name/file-name'
          JavaScriptDependency   = require 'module-name/file-name'

          class SomeClass extends BaseClass
          // (...)

- You can also load CoffeeScript in JavaScript files:

        define(function (require) {
          // Dependencies.
          var CoffeeScriptDependency = require('cs!module-name/file-name');
          // (...)

Just remember about **cs!** prefix in paths when loading CoffeeScript sources. RequireJS Optimizer
will convert such files to plain JavaScript and include them in the final library.
