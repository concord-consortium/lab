# Lab

HTML5-based scientific models, visualizations, graphing, and probeware.

## TODO

- The tests need to be expanded a great deal.

## Simple Molecules

Example: http://lab.dev.concord.org/simplemolecules/simplemolecules.html

Cameron Abrams, teaching in the Department of Chemical Engineering at Drexel has 
published these excellent resources [Molecular Simulation](http://www.pages.drexel.edu/~cfa22/msim/msim.html)
for his course.

## Grapher

Example: http://lab.dev.concord.org/surface-temperature/surface-temperature.html

## Setup Development

- [Ruby 1.9](http://www.ruby-lang.org/en/)
- The RubyGem: [bundler](http://gembundler.com/)
- [nodejs](http://nodejs.org/)
- [npm](http://npmjs.org/)

Lab's test framework uses [Vows](http://vowsjs.org), which depends on
[nodejs](http://nodejs.org/) and [npm](http://npmjs.org/) (Node Package Manager). 
In addition JavaScript minification is done using [UglifyJS](https://github.com/mishoo/UglifyJS).

Currently development is being done with these versions of Node and NPM:

    $ node -v
    v0.6.6

    $ npm -v
    1.1.0-beta-4

As of v0.6.3 of node NPM is bundled with node. 

Install node with installers available here http://nodejs.org/#download

**Use git to create a local clone of the lab repository.**

If you have commit access to the repository use this form:

    git clone git@github.com:concord-consortium/lab.git

Alternatively use this form:

    git clone git://github.com/concord-consortium/lab.git

I recommend also cloning the d3.js repository into a separate directory -- there are many useful examples 
of both visualizations and examples of tests that run extremely quickly using vows, [jsdom](https://github.com/tmpvar/jsdom), and node.

    git clone git://github.com/mbostock/d3.git

**Setup the lab repository for development**

Change to the lab directory and install the additional Ruby Gems used during development: haml, sass, guard ...

    cd lab
    bundle install --binstubs

Next install Lab's dependencies managed by npm -- including the development dependencies:

    npm install

You can see the list of dependencies in package.json. The packages will be
installed in the node_modules directory.

Start watching the various src directories and automatically compile and generate
the examples directory including JavaScript, HTML, CSS, and image resources:

    bin/guard start

This will take about 15s to generate the examples directory when first started.

You can also create the examples directory by using `make` from the command line.

Create a localhost and local Apache vhost for lab and optionally d3:

file: /etc/hosts

    127.0.0.1       lab.local
    127.0.0.1       d3.local

file: /etc/apache2/extra/httpd-vhosts.conf

    <VirtualHost lab.local:80>
       ServerName lab
       DocumentRoot /path/to/lab-repo
       PassengerEnabled off
       <Directory /path/to/lab-repo >
         Options +Indexes +FollowSymLinks +MultiViews +Includes
         AllowOverride All
         Order allow,deny
         Allow from all
         DirectoryIndex index.html
      </Directory>
    </VirtualHost>

    <VirtualHost d3.local:80>
       ServerName d3
       DocumentRoot /path/to/d3-repo
       PassengerEnabled off
       <Directory /path/to/d3-repo >
         Options +Indexes +FollowSymLinks +MultiViews +Includes
         AllowOverride All
         Order allow,deny
         Allow from all
         DirectoryIndex index.html
      </Directory>
    </VirtualHost>

Now open: http://lab.local/examples/

Or go directly to the Simple Molecules model here: http://lab.local/examples/simplemolecules/simplemolecules.html

If you cloned d3 and setup a localhost you can view the d3 examples here: http://d3.local/examples/

Whenever guard is running and you save changes to any files in the src/ directory the corressponding files in the examples/directory will be updated. 

To have the browser page for an example automatically reload when changes are made install the livereload extension into Chrome, Safari, and FireFox, open one of the example pages, turn on the livereload extension in the browser by clicking the small "LR" button on the toolbar.

## Repository structure

### Source Code: src/

The `src/` directory includes both JavaScript source code for the Lab modules as well as the `src/examples/` 
directory containing the additional resources for generating the html, css, and image resources for `examples/`.

- `src/examples`
  haml, sass files are processed into html and css files saved in the `examples/` directory, javascript files located here are just copied.

The following directories contain the source code for the main Lab modules:

- `src/arrays/`
- `src/benchmark/`
- `src/graphx/`
- `src/layout/`
- `src/molecules/`

In addition the following module is in process of being combined with the newer graphing code in `graphx/`.

- `src/grapher/`

Lastly there are the following JavaScript framgments that are used in the build process:

- `src/start.js`
- `src/lab-module.js`
- `src/end.js`

After running `bundle install --binstubs` the `bin/` directory will be created.

After running: `bin/guard` the `examples/` directory will be created and any subsequent changes to files 
in the `src/` directory  cause automatic rebuilding of the associated files in the `examples/` directory.

**Note:** remember to make changes you want saved in the `src/` directory **not** in the `examples/` directory.

### Adding new source files or modules

If you add a new JavaScript file to an existing Lab module also add it to the associated section of the MakeFile.

For example if you created a pie chart grapher and intended it to be part of `lab.layout.js` add the JavaScript 
source file to this directory:

    src/examples/layout/pie-chart.js

Then also add the path to `ie-chart.js` to the `lib/lab.layout.js` target section of the MakeFile:

    lib/lab.layout.js: \
    	src/start.js \
    	src/layout/layout.js \
    	src/layout/molecule-container.js \
    	src/layout/potential-chart.js \
    	src/layout/speed-distribution-histogram.js \
    	src/layout/benchmarks.js \
    	src/layout/datatable.js \
    	src/layout/temperature-control.js \
    	src/layout/force-interaction-controls.js \
    	src/layout/display-stats.js \
    	src/layout/fullscreen.js \
    	src/end.js

Similarly if you add a new module to Lab you will need to create a new target to represent the module
using a similar form to the `lib/lab.layout.js` target as well as adding the target to the `JS_FILES` 
make variable containing the list of Lab JavaScript files to be generated:

    JS_FILES = \
    	lib/lab.grapher.js \
    	lib/lab.graphx.js \
    	lib/lab.benchmark.js \
    	lib/lab.layout.js \
    	lib/lab.arrays.js \
    	lib/lab.molecules.js \
    	lib/lab.js

If you are just modifying an existing example or adding a new one just create the new files in 
the `src/examples` directory and running `make` or `bin/guard` will generate the associated resources 
in the `examples/` directory.

The html file are generated from [Haml](http://haml-lang.com/) markup. Add the suffix `.html.haml` to these files.

The css stylesheets are generated from [Sass](http://sass-lang.com/) markup. Add the suffix `.sass` to these files.

### Tests: test/

Lab's test framework uses [Vows](http://vowsjs.org) and [jsdom](https://github.com/tmpvar/jsdom) which depend on
[Node.js](http://nodejs.org/) and [NPM](http://npmjs.org/). 

Mamny of the test suites are minimal (just loading the module and testing the version number):

  benchmark
  graphx
  layout
  molecules

.. but the grapher has a couple more tests and the arrays module has almost a complete set of tests.

Running the tests:

    $ make test
    ................................. . . .. . . .
    x OK > 40 honored (0.012s)

Currently there are 40 tests and they take less than 1s to run on the console:

Turns out recent versions of nodejs/v8 support TypedArrays -- this is great since the arrays module is 
designed to support using typed or regular arrays for computation. 

This testing strategy is similar to that used by d3.js.

`test/env.js` uses the node module [jsdom](https://github.com/tmpvar/jsdom) to setup resources for simple emulation of a browser.

`test/env-assert.js` has a number of very useful additional assertions copied from, d3.js:

There are also many interesting test examples and patterns in the [d3.js test directory](https://github.com/mbostock/d3/tree/master/test) 
that can be adapted for use in Lab.

### Generated Lab Modules: lib/

The `lib/` directory contains the lab modules generated from JavaScript source code in the `src/` directory.

Here are the standard lab modules:

- `lab.arrays.js`
- `lab.benchmark.js`
- `lab.grapher.js`
- `lab.graphx.js`
- `lab.layout.js`
- `lab.molecules.js`

And one additional file which combines them all:

- `lab.js`

In addition there are minimized versions of all of these files.

When working on the source code please keep commits of these generated JavaScript files separate from commits to the `src/` 
directory to make is easier to see and understand the changes that make up the source code narrative.

### Generated examples: examples/

The `examples/` directory is not part of the repository but instead is automatically generated by running `make`.

When running `bin/guard` any changes to files in the `src/` directory 
cause automatic rebuilding of the associated files in the `examples/` directory.

### External JavaScript Frameworks: vendor/

External JavaScript prerequisites for running lab are located in the vendor/ directory. 
These are copied into the examples/ directory when either running `make` or `bin/guard start`.

- d3
- modernizr.js
- science
- colorbrewer
- jquery
- jquery-ui
- sizzle

## Updating http://lab.dev.concord.org/

Currently http://lab.dev.concord.org/ is updated by using rsynch to copy the content of the 
examples/ directory to the server. 

Modify the example script below with your username, server host, and path to the directory apache is serving:

file: `bin/update.sh``

    #!/bin/sh
    rsync -rvz --delete examples/ username@server:/path/to/examples

Running `bin/update.sh` will now copy/update the directory at http://lab.dev.concord.org/

## References

### [d3.js](http://mbostock.github.com/d3/)

- [repo](https://github.com/mbostock/d3)
- [documentation](http://mbostock.github.com/d3/api/)
- [issues](https://github.com/mbostock/d3/issues)
- [google group](http://groups.google.com/group/d3-js)

### [node](http://nodejs.org/)

- [repo](https://github.com/joyent/node)
- [documentation](http://nodejs.org/docs/latest/api/index.html)
- [issues](https://github.com/joyent/node/issues)
- [google group](http://groups.google.com/group/nodejs)
- [How To Node](http://howtonode.org/)

### [npm](http://npmjs.org/)

- [repo](https://github.com/isaacs/npm)
- [faq](http://npmjs.org/doc/faq.html)
- [google group](https://groups.google.com/group/npm-)
- [issues](https://github.com/isaacs/npm/issues)

More about using npm for development:

- [Introduction to npm](http://howtonode.org/introduction-to-npm)
- [node_modules in git](http://www.mikealrogers.com/posts/nodemodules-in-git.html)
- [Managing module dependencies](http://howtonode.org/managing-module-dependencies)
- [What do people do for versionizing node modules within git?](https://groups.google.com/group/nodejs/browse_thread/thread/9aa563f1fe3b3ff5)

### [RubyGems](https://rubygems.org/)

- [sass](http://sass-lang.com/), [reference](http://sass-lang.com/docs/yardoc/file.SASS_REFERENCE.html)
- [haml](http://haml-lang.com/), [reference](http://haml-lang.com/docs/yardoc/file.HAML_REFERENCE.html)
- [guard](https://github.com/guard/guard)
- [guard-shell](https://github.com/hawx/guard-shell)
- [guard-haml](https://github.com/manufaktor/guard-haml)
- [guard-sass](https://github.com/hawx/guard-sass)
- [guard-livereload](https://github.com/guard/guard-livereload)
- [rb-fsevent](https://github.com/thibaudgg/rb-fsevent)

### LiveReload extension for Chrome and Safari

- [livereload](https://github.com/mockko/livereload)

### Full Screen API

- http://peter.sh/2011/01/javascript-full-screen-api-navigation-timing-and-repeating-css-gradients/
- http://peter.sh/2011/08/fullscreen-api-enhanced-element-highlighting-and-progress-on-flexbox/
- http://johndyer.name/native-fullscreen-javascript-api-plus-jquery-plugin/
- https://wiki.mozilla.org/Gecko:FullScreenAPI
- http://blog.pearce.org.nz/2011/09/mozilla-full-screen-api-progress-update.html
- http://ajaxian.com/archives/fullscreen-api-coming-to-browsers-near-you
- http://html5-demos.appspot.com/static/fullscreen.html
- http://stackoverflow.com/questions/7836204/chrome-fullscreen-api
- http://stackoverflow.com/questions/7836204/chrome-fullscreen-api/7934009
