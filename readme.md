# [Lab](https://github.com/concord-consortium/lab)

HTML5-based open source scientific models, visualizations, graphing, and probeware from the [Concord Consortium](http://www.concord.org).

## TODO

- The tests need to be expanded a great deal.
- Probeware needs to be added.
- Molecular model in progress.

## Simple Molecules

Example: [Simple Molecules](http://lab.dev.concord.org/simplemolecules/simplemolecules.html)

Cameron Abrams, teaching in the Department of Chemical Engineering at Drexel has 
published these excellent [Molecular Simulation](http://www.pages.drexel.edu/~cfa22/msim/msim.html) 
resources for a course he teaches.

This site has a basic introduction to the physics of molecular dynamics simulations, and practical exercises with the CHARMM package: [A theoretical introduction to molecular dynamics simulations and practical examples using the CHARMM program](http://www.ch.embnet.org/MD_tutorial/) 

**More detailed references, to constrain our 2D "physics"**

[Thermostat Algorithms for Molecular Dynamics Simulations](http://phjoan23.technion.ac.il/~phr76ja/thermostats.pdf)

One kind of unphysical effect that can arise is [the "flying ice cube"](http://en.wikipedia.org/wiki/Flying_ice_cube) - See linked paper.

## Grapher

Example: [Earth's Surface Temperature: years 500-2009](http://lab.dev.concord.org/surface-temperature/surface-temperature.html)

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

Install node with installers available here: [http://nodejs.org/#download](http://nodejs.org/#download)

**Use git to create a local clone of the lab repository.**

If you have commit access to the repository use this form:

    git clone git@github.com:concord-consortium/lab.git

Alternatively if you don't have commit access use this form:

    git clone git://github.com/concord-consortium/lab.git

If you plan to contribute to Lab as an external developer:

1. Create a local clone from the repository located here: http://github.com/concord-consortium/lab.
   This will by default have the git-remote name: **origin**. 
2. Make a fork of http://github.com/concord-consortium/lab to your account on github.
3. Make a new git-remote referencing your fork. I recommend making the remote name your github user name.
   For example my username is `stepheneb` so I would add a remote to my fork like this: 
   `git remote add stepheneb git@github.com:stepheneb/lab.git`.
4. Create your changes on a topic branch. Please include tests if you can. When your commits are ready
push your topic branch to your fork and send a pull request.

I recommend also cloning the [d3.js](http://mbostock.github.com/d3/) repository into a separate 
directory -- there are many useful examples of both visualizations and tests that run extremely 
quickly using [Vows](http://vowsjs.org), [jsdom](https://github.com/tmpvar/jsdom), and [nodejs](http://nodejs.org/).

    git clone git://github.com/mbostock/d3.git

**Setup the lab repository for development**

Change to the lab directory and install the additional Ruby Gems used for development: haml, sass, guard ...

    cd lab
    bundle install --binstubs

This will create the `bin/` directory and populate it with command-line executables for running
the specific versions of the RubyGems installed for development.

Next install the development dependencies that use [nodejs](http://nodejs.org/) and
are managed by [npm](http://npmjs.org/):

    npm install

You can see the list of dependencies to be installed in the file `package.json`. 

Running `npm install` installs or updates packages in the `node_modules/` directory.

Generate the `dist/` directory:

    make

You should now be able to open the file: `dist/index.html` in a browser and run the examples.

Start watching the `src/` and `test/` directories and automatically either generate the Lab modules,
the examples, or run the tests.

    bin/guard

Now any change you make in `src/examples/` will generate the corresponding content in `dist/examples/`.
In addition changes in `src/lab/` result generation of the associated Lab modules in `lab/` and the
copying of these modules to `dist/lab/`. In addition any change in either the `src/lab/` or `test/`
directories will automatically run the tests and display the results in the console window where `bin/guard`
is running.

You can also create a localhost and local Apache vhost for lab and optionally d3:

file: `/etc/hosts`

    127.0.0.1       lab.local
    127.0.0.1       d3.local

file: `/etc/apache2/extra/httpd-vhosts.conf`

    <VirtualHost lab.local:80>
       ServerName lab
       DocumentRoot /path/to/lab-repo/dist
       PassengerEnabled off
       <Directory /path/to/lab-repo/dist >
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

Test the syntax after making Apache configuration changes: 

    $ apachectl configtest
    Syntax OK

Restart Apache when the configuration syntax is OK :
                                                                                                                                                              
    $ sudo apachectl restart

Now open: [http://lab.local/](http://lab.local/)

Or go directly to the Simple Molecules model here: [http://lab.local/examples/simplemolecules/simplemolecules.html](http://lab.local/examples/simplemolecules/simplemolecules.html)

If you cloned d3 and setup a localhost you can view the d3 examples here: [http://d3.local/examples/](http://d3.local/examples/)

Whenever guard is running and you save changes to any files in the src/ directory the corresponding files in 
the `dist/` directory will be updated. 

To have the browser page for an example automatically reload when changes are made install the livereload extension into Chrome, Safari, and FireFox, open one of the example pages, turn on the livereload extension in the browser by clicking the small "LR" button on the toolbar.

## Repository structure

### Source Code: `src/`

The `src/` directory includes both JavaScript source code for the Lab modules as well as the `src/examples/` 
directory containing the additional resources for generating the html, css, and image resources for `dist/examples/`.

- `src/examples`
  haml, sass files are processed into html and css files saved in the `dist/examples/` directory, javascript files located here are just copied.

The source code for the Lab modules is all contained in `src/lab/`

The following directories contain the source code for the main Lab modules:

- `src/lab//arrays/`
- `src/lab//benchmark/`
- `src/lab//graphx/`
- `src/lab//layout/`
- `src/lab//molecules/`

In addition the following module is in process of being combined with the newer graphing code in `graphx/`.

- `src/lab/grapher/`

Lastly there are the following JavaScript fragments that are used in the build process:

- `src/lab/start.js`
- `src/lab/lab-module.js`
- `src/lab/end.js`

After running `bundle install --binstubs` the `bin/` directory will be created.

**Note:** remember to make changes you want saved in the `src/examples/` directory **not** in the `dist/examples/` directory.

### Adding new source files or modules

If you add a new JavaScript file to an existing Lab module also add it to the associated section of the `MakeFile`.

For example if you created a pie chart grapher and intended it to be part of `lab.layout.js` save the JavaScript 
source file here:

    src/lab/layout/pie-chart.js

Add the path to `pie-chart.js` to the `lab/lab.layout.js` target section of the MakeFile:

    lab/lab.layout.js: \
    	src/lab/start.js \
    	src/lab/layout/layout.js \
    	src/lab/layout/molecule-container.js \
    	src/lab/layout/potential-chart.js \
    	src/lab/layout/speed-distribution-histogram.js \
    	src/lab/layout/benchmarks.js \
    	src/lab/layout/datatable.js \
    	src/lab/layout/temperature-control.js \
    	src/lab/layout/force-interaction-controls.js \
    	src/lab/layout/display-stats.js \
    	src/lab/layout/fullscreen.js \
    	src/lab/end.js
    
Similarly if you add a new module to Lab you will need to create a new target to represent the module
using a similar form to the `lab/lab.layout.js` target as well as adding the target to the `LAB_JS_FILES` 
make variable containing the list of Lab JavaScript files to be generated:

    LAB_JS_FILES = \
    	lab/lab.grapher.js \
    	lab/lab.graphx.js \
    	lab/lab.benchmark.js \
    	lab/lab.layout.js \
    	lab/lab.arrays.js \
    	lab/lab.molecules.js \
    	lab/lab.js

If you are just modifying an existing example or adding a new one just create or edit the files in 
the `src/examples` directory and run `make` or `bin/guard` to generate the associated resources 
in the `dist/examples/` directory.

The html file are generated from [Haml](http://haml-lang.com/) markup. Add the suffix `.html.haml` to these files.

The css stylesheets are generated from [Sass](http://sass-lang.com/) markup. Add the suffix `.sass` to these 
files. The stylesheets may also be written using the newer `*.scss` variant of Sass.

### Testing: `test/`

Lab's JavaScript tests use [Vows](http://vowsjs.org), an asynchronous behavior driven framework based 
on [Node.js](http://nodejs.org/). In addition Lab uses [jsdom](https://github.com/tmpvar/jsdom), a
lightweight CommonJS implementation of the W3C DOM specifications. Lab's test setup was inspired
by that used by [d3.js](http://mbostock.github.com/d3/). The development dependencies for running the
tests are installed using [NPM](http://npmjs.org/).

Running the tests:

    $ make test
    ................................. . . .. . . .
    x OK > 40 honored (0.012s)

If you are running `bin/guard` the tests run automatically anytime a change is made in the JavaScript 
files in the `src/` or `test/` directory.

The results of the tests are displayed in the console that `bin/guard` is running in.

If the bottom of the console window is viewable you will see new test results whenever you save a changes.

Recent versions of nodejs/v8 support TypedArrays -- this make it possible to more extensively
test lab.arrays which is designed to support using either typed or regular arrays for computation. 

`test/env.js` uses the node module [jsdom](https://github.com/tmpvar/jsdom) to setup resources for simple emulation of a browser.

[Vows](http://vowsjs.org) integrates the [standard nodejs assertions](http://nodejs.org/docs/latest/api/assert.html)
with an additional collection of useful [assertions](http://vowsjs.org/#assertions) summarized below:

- numerical

        assert.greater (3, 2);
        assert.lesser (2, 3);
        assert.inDelta (Math.random(), 0, 1);

- equality

        assert.equal          (4, 4);
        assert.strictEqual    (4 > 2, true);
        assert.notEqual       (4, 2);
        assert.strictNotEqual (1, true);
        assert.deepEqual      ([4, 2], [4, 2]);
        assert.notDeepEqual   ([4, 2], [2, 4]);

- type

        assert.isFunction (function () {});
        assert.isObject   ({goo:true});
        assert.isString   ('goo');
        assert.isArray    ([4, 2]);
        assert.isNumber   (42);
        assert.isBoolean  (true);
        assert.typeOf     (42, 'number');
        assert.instanceOf ([], Array);

- truth

        assert.isTrue  (true);
        assert.isFalse (false);

- null, undefined, NaN

        assert.isNull      (null);
        assert.isNotNull   (undefined);
        assert.isUndefined ('goo'[9]);
        assert.isNaN       (0/0);

- inclusion

        assert.include ([4, 2, 0], 2);
        assert.include ({goo:true}, 'goo');
        assert.include ('goo', 'o');

- regexp matching

        assert.match ('hello', /^[a-z]+/);

- length

        assert.length ([4, 2, 0], 3);
        assert.length ('goo', 3);  *** not working ***

- emptiness

        assert.isEmpty ([]);
        assert.isEmpty ({});
        assert.isEmpty ("");

- exceptions

        assert.throws(function () { x + x }, ReferenceError);
        assert.doesNotThrow(function () { 1 + 1 }, Error);

Additionally `test/env-assert.js` has a number of useful additional assertions copied from [d3.js](http://mbostock.github.com/d3/).

_**Note**: Using a more specific assertion usually results in more useful error reports._

There are also many interesting test examples and patterns in the [d3.js test directory](https://github.com/mbostock/d3/tree/master/test) 
that can be adapted for use in Lab.

### Generated Lab Modules: `lab/`

The `lab/` directory contains the lab modules generated from JavaScript source code in the `src/lab/` directory.

Here are the standard lab modules:

- `lab.arrays.js`
- `lab.benchmark.js`
- `lab.grapher.js`
- `lab.graphx.js`
- `lab.layout.js`
- `lab.molecules.js`

And one additional file which combines them all:

- `lab.js`

In addition there are minimized versions of all of these files that are about 50% smaller.

When working on the source code please keep commits of the generated JavaScript files in `lab/` separate from 
other commits to make it easier to see and understand the changes that make up the source code narrative.

### Generated Examples: `dist/examples/`

The `dist/examples/` directory is not part of the repository but instead is automatically generated by running `make`.

When running `bin/guard` any changes to files in the `src/examples/` directory 
cause automatic rebuilding of the associated files in the `dist/examples/` directory.

### External JavaScript Frameworks: `vendor/`

External JavaScript prerequisites for running lab are located in the vendor/ directory. 
These are copied into the `dist/vendor/` directory when either running `make` or `bin/guard`.

- d3
- modernizr.js
- science
- colorbrewer
- jquery
- jquery-ui
- sizzle

## Updating [http://lab.dev.concord.org/](http://lab.dev.concord.org/)

Currently [http://lab.dev.concord.org/](http://lab.dev.concord.org/) is updated by using rsynch to copy 
the content of the `dist/` directory to the server. 

Modify the example script below with your username, server host, and path to the directory apache is serving:

file: `bin/update.sh`

    #!/bin/sh
    rsync -rvz --delete dist/ username@server:/path/to/dist

Running `bin/update.sh` will now copy and update the directory at [http://lab.dev.concord.org/](http://lab.dev.concord.org/)

## References

### [d3.js](http://mbostock.github.com/d3/)

- [repo](https://github.com/mbostock/d3)
- [documentation](http://mbostock.github.com/d3/api/)
- [issues](https://github.com/mbostock/d3/issues)
- [google group](http://groups.google.com/group/d3-js)
- [API reference](https://github.com/mbostock/d3/wiki/API-Reference)
  - [Arrays](https://github.com/mbostock/d3/wiki/Arrays)

### [Vows](http://vowsjs.org)

- [repo](https://github.com/cloudhead/vows)

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

- [JavaScript Full Screen API, Navigation Timing and repeating CSS Gradients](http://peter.sh/2011/01/javascript-full-screen-api-navigation-timing-and-repeating-css-gradients/)
- [Fullscreen API, enhanced Element Highlighting and progress on Flexbox](http://peter.sh/2011/08/fullscreen-api-enhanced-element-highlighting-and-progress-on-flexbox/)
- [Native Fullscreen JavaScript API (plus jQuery plugin)](http://johndyer.name/native-fullscreen-javascript-api-plus-jquery-plugin/)
- [Gecko:FullScreenAPI](https://wiki.mozilla.org/Gecko:FullScreenAPI)
- [Mozilla full-screen API progress update](http://blog.pearce.org.nz/2011/09/mozilla-full-screen-api-progress-update.html)
- [fullscreen API coming to browsers near you?](http://ajaxian.com/archives/fullscreen-api-coming-to-browsers-near-you)
- [Full Screen Demos](http://html5-demos.appspot.com/static/fullscreen.html)
- [stackoverflow: Chrome Fullscreen API](http://stackoverflow.com/questions/7836204/chrome-fullscreen-api)
