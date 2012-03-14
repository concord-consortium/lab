# [Lab](https://github.com/concord-consortium/lab)

HTML5-based open source scientific models, visualizations, graphing, and probeware from the 
[Concord Consortium](http://www.concord.org).

**Table of Contents**

* toc
{:toc}

## Molecular Modeling Examples:

- [Simple Atoms Model](http://lab.dev.concord.org/examples/simple-atoms-model/simple-atoms-model.html)
- [More Complex Atoms Model](http://lab.dev.concord.org/examples/complex-atoms-model/complex-atoms-model.html)

## Graphing examples:

- [Earth's Surface Temperature: years 500-2009](http://lab.dev.concord.org/examples/surface-temperature/surface-temperature.html)
- [Question about seasonal temperatures and geography](http://lab.dev.concord.org/examples/seasons/canberra-question.html)
- [Lennard-Jones-Potential](http://lab.dev.concord.org/examples/lennard-jones-potential/lennard-jones-potential.html)

## TODO

- The tests need to be expanded a great deal.
- Probeware needs to be added.
- Molecular model in progress.
- Include JQuery UI as a git submodule. (note: its a bit complicated,
  because we do a custom build of JQuery UI with only a few components,
  and only one simpletheme)

## Setup Development

Lab uses a number of RubyGems and node modules to manage development. Lab's test framework
uses [Vows](http://vowsjs.org), which depends on [nodejs](http://nodejs.org/) and
[npm](http://npmjs.org/) (Node Package Manager). In addition JavaScript minification is
done using [UglifyJS](https://github.com/mishoo/UglifyJS).

### Prerequisites:

#### Ruby 1.9 and the RubyGem bundler

[Ruby 1.9](http://www.ruby-lang.org/en/) is a development dependency for the Lab codebase however
often the older Ruby version 1.8.7 is what comes pre-installed on Mac OS X and Linux.

    $ ruby -v
    ruby 1.8.7 (2010-01-10 patchlevel 249) [universal-darwin10.0]

[RVM](http://beginrescueend.com/) is a good way to install and manage multiple updated versions
of Ruby without affecting the Ruby that comes pre-installed in the OS.

Once you have a working version of Ruby 1.9.2 (or newer) install the RubyGem [bundler](http://gembundler.com/).

    $  ruby -v
    ruby 1.9.2p290 (2011-07-09 revision 32553) [x86_64-darwin10.8.0]
    
    $ gem install bundler
    Fetching: bundler-1.0.22.gem (100%)
    Successfully installed bundler-1.0.22
    1 gem installed

#### nodejs and npm, the Node Package Manager

[nodejs](http://nodejs.org/) and [npm](http://npmjs.org/), the Node Package Manager are additional
development dependencies.

[npm](http://npmjs.org/), the Node Package Manager is included as part of [nodejs](http://nodejs.org/)
as of version 0.6.3.

Install node with installers available here: [http://nodejs.org/#download](http://nodejs.org/#download)

Currently development is being done with these versions of node and npm:

    $ node -v
    v0.6.11

    $ npm -v
    1.1.1

### Use git to create a local clone of the Lab repository.

If you have commit access to the repository use this form:

    git clone git@github.com:concord-consortium/lab.git

Alternatively if you don't have commit access use this form:

    git clone git://github.com/concord-consortium/lab.git

### Setup the local Lab repository for development

Make sure you have already installed the prerequistes: [Ruby 1.9](http://www.ruby-lang.org/en/),
the RubyGem [bundler](http://gembundler.com/), and [nodejs](http://nodejs.org/) (which now includes
[npm](http://npmjs.org/) the Node Package Manager.

Change to the `lab/` directory and run `make clean; make` to install the runtime and development dependencies and generate 
the `dist/` directory:

    cd lab
    make clean; make

When `make` is run on a freshly cloned repository it performs the following tasks:

1. Install the runtime dependencies as git submodules into the `vendor/` directory:

        git submodule update --init --recursive

2. Install the development dependencies that use [nodejs](http://nodejs.org/) and
   are managed by [npm](http://npmjs.org/):

        npm install

   You can see the list of dependencies to be installed in the file `package.json`. In addition
   `vendor/d3` and `vendor/science.js` are manually installed into `node_modules/`.

3. Install the additional RubyGems used for development: haml, sass, guard ...

        bundle install --binstubs

   This creates the `bin/` directory and populates it with command-line executables for running
   the specific versions of the RubyGems installed for development.

4.  Generates the `dist/` directory:

You should now be able to open the file: `dist/index.html` in a browser and run the examples.

Start watching the `src/` and `test/` directories and when files are changed automatically
generate the JavaScript Lab modules, the examples, and run the tests.

    bin/guard

Now any change you make in `src/examples/` will generate the corresponding content in `dist/examples/`.
In addition changes in `src/lab/` generate the associated Lab modules in `lab/` and copy these modules 
to `dist/lab/`. In addition any change in either the `src/lab/` or `test/`directories will run the
tests and display the results in the console window where `bin/guard`
is running.

### Serving `dist/` locally with Apache

You can also create a localhost and local Apache vhost for Lab:

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

Test the syntax after making Apache configuration changes:

    $ apachectl configtest
    Syntax OK

Restart Apache when the configuration syntax is OK :

    $ sudo apachectl restart

Now open: [http://lab.local/](http://lab.local/)

Or go directly to your local instance of [Simple Molecules](http://lab.local/examples/simplemolecules/simplemolecules.html).

Whenever guard is running and you save changes to any files in the src/ directory the corresponding files in
the `dist/` directory will be updated.

To have the browser page for an example automatically reload when changes are made install the livereload extension into Chrome, Safari, and FireFox, open one of the example pages, turn on the livereload extension in the browser by clicking the small "LR" button on the toolbar.

### Serving `dist/` using POW

You can also serve the dist directory using [POW](http://pow.cx/).

1. install pow: `curl get.pow.cx | sh`
2. create a lab folder in `~/.pow/`  by doing `mkdir -p ~/.pow/lab`
3. symlink the dist folder for the Lab project `cd ~/.pow/lab; ln -s
   <lab/dist> ./public`
4. Thats it! your app should be available at [http://lab.dev](http://lab.dev) 
   assuming that you had already built the Lab project, and the `dist` directory
   exists.

### Contributing to Lab

If you think you'd like to contribute to Lab as an external developer:

1. Create a local clone from the repository located here: http://github.com/concord-consortium/lab.
   This will by default have the git-remote name: **origin**. 

2. Make a fork of http://github.com/concord-consortium/lab to your account on github.

3. Make a new git-remote referencing your fork. I recommend making the remote name your github user name.
   For example my username is `stepheneb` so I would add a remote to my fork like this: 

        git remote add stepheneb git@github.com:stepheneb/lab.git

4. Create your changes on a topic branch. Please include tests if you can. When your commits are ready
   push your topic branch to your fork and send a pull request.

## Repository structure

### Source Code: `src/`

The `src/` directory includes both JavaScript source code for the Lab modules as well as the `src/examples/` 
directory containing the additional resources for generating the html, css, and image resources for 
`dist/examples/`.

- `src/examples`

Files and folders in `src/examples` are either copied directly to `dist/examples` or in the case of coffeescript
files are compiled to javascript before being copied.

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

**Note:** remember to make changes you want saved in the `src/examples/` directory **not** in the 
`dist/examples/` directory.

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

The html file are generated from [Haml](http://haml-lang.com/) markup. Add the suffix `.html.haml` 
to these files.

The css stylesheets are generated from [Sass](http://sass-lang.com/) markup. Add the suffix `.sass` to these 
files. The stylesheets may also be written using the newer `*.scss` variant of Sass.

### Testing: `test/`

Lab's JavaScript tests use [Vows](http://vowsjs.org), an asynchronous behavior driven framework based 
on [Node.js](http://nodejs.org/). In addition Lab uses [jsdom](https://github.com/tmpvar/jsdom), a
lightweight CommonJS implementation of the W3C DOM specifications. Lab's test setup was inspired
by that used by [d3.js](http://mbostock.github.com/d3/). The development dependencies for running the
tests are installed using [npm](http://npmjs.org/).

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

`test/env.js` uses the node module [jsdom](https://github.com/tmpvar/jsdom) to setup resources for 
simple emulation of a browser.

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

Additionally `test/env-assert.js` has a number of useful additional assertions copied from 
[d3.js](http://mbostock.github.com/d3/).

_**Note**: Using a more specific assertion usually results in more useful error reports._

There are also many interesting test examples and patterns in the 
[d3.js test directory](https://github.com/mbostock/d3/tree/master/test) that can be adapted for use in Lab.

### Debugging Tests using the node debugger

Sometimes it can be helpful to break into a debugger when there is a problem in either the code 
or the test setup itself. Node comes with a [debugger](http://nodejs.org/docs/latest/api/debugger.html) 
which can be used in combination with vows and the tests.

First set a breakpoint by inserting the statement: `debugger;`

    suite.addBatch({
      "Thermometer": {
        topic: function() {
          debugger;
          return new components.Thermometer("#thermometer");
        },
        "creates thermometer": function(t) {
          assert.equal(t.max, 0.7)
        }
      }
    });

Start the node debugger and pass in the full command line to run the tests:

    node debug ./node_modules/vows/bin/vows --no-color

The debugger will break at the beginning of vows:

    < debugger listening on port 5858
    connecting... ok
    break in node_modules/vows/bin/vows:3
      1
      2
      3 var path   = require('path'),
      4     fs     = require('fs'),
      5     util   = require('util'),

Enter `cont` to continue execution until your breakpoint.

    debug> cont
    < ·
    < ········
    < ·
    <
    break in test/lab/components/components-test.js:13
     11   "Thermometer": {
     12     topic: function() {
     13       debugger;
     14       return new components.Thermometer("#thermometer");
     15     },

To evaluate expressions type `repl`  -- use ctrl-C to exit the repl:

    repl
    Press Ctrl + C to leave debug repl
    > initialization_options
    { model_listener: false,
      lennard_jones_forces: true,
      coulomb_forces: true }
    > atoms[0].charge
    -1

Enter **ctrl-C** to exit the repl and return to the debugger.
    
Enter **ctrl-D** to exit the debugger.

[node-inspector](https://github.com/dannycoates/node-inspector)
[npm package for node-inspector](http://search.npmjs.org/#/node-inspector)

### A Simple Example of Test Driven Development

Here's a simple example that is part of the tests for `lab.arrays.js` to test the `arrays.max()` function:

    "find max in array with negative and positive numbers": function(max) {
      assert.equal(max([3, -1, 0, 1, 2, 3]), 3);
    },

The 'model stepping' tests are a good example where the tests help helped drive new features. The basic 
features I was testing in this section relate to the existing functionality exposed by the Stop, Start, Go, and 
Reset buttons as wells as the extended keyboard controls that allow stepping forward and backwards a step at a time.

First I created this test that passed:

    "after running running one tick the model is at step 1": function(model) {
      model.tick();
      assert.equal(model.stepCounter(), 1);
      assert.isTrue(model.isNewStep());
    },

In thinking about driving out changes to KE, PE and Temperature of the molecular model itself I realized 
I'd like the capability to run a specific number of steps forward and then check the results.

I then wrote this test that failed -- because the model.tick() function didn't yet take an optional argument to 
run multiple steps forward:

    "after running 9 more ticks the model is at step 10": function(model) {
      model.tick(9);
      assert.equal(model.stepCounter(), 10);
      assert.isTrue(model.isNewStep());
    },

After saving the change I saw the new test failure reported in my console. I then implemented the new
feature in the actual `src/lab/molecules.js`. Less than a second after saving the file the tests 
completed and the report showed it passing.

This is a very simple example -- but part of the value of this kind of test driven development is in first 
thinking of how something should behave rather than in how to get it to actually do the work.

Since I already had this function for running one model step:

    model.tick()

Adding an optional numeric argument for running more steps is a fine way to express the intent of the new feature:

    model.tick(9)

In more complicated coding thinking about how to express the intent clearly and then what the result 
should be if that intent is successful **FIRST** ... and then 'driving out' the actual implementation to 
achieve that result can result in a better architecture -- and of course you also end up with tests.

Because the tests run SO quickly I can interactively change the code in the module or the test and 
immediately see results.

### Generated Lab Modules: `lab/`

The `lab/` directory contains the Lab modules generated from JavaScript source code in the `src/lab/`
directory. The `lab/` directory is not checked into the repository

Here are the standard Lab modules:

- `lab.arrays.js`
- `lab.benchmark.js`
- `lab.grapher.js`
- `lab.graphx.js`
- `lab.layout.js`
- `lab.molecules.js`

And one additional file which combines them all:

- `lab.js`

Minimized versions of these files are also generated.

When working on the source code please keep commits of the generated JavaScript files in the `lab/` directory
separate from other commits to make it easier to see and understand the narrative of source code changes.

### Generated Examples: `dist/examples/`

The `dist/examples/` directory is automatically generated running `make` and is not part of the repository.

When `bin/guard` is running any changes to files in the `src/examples/` directory cause automatic rebuilding 
of the associated files in the `dist/examples/` directory.

### External JavaScript Frameworks: `vendor/`

External JavaScript runtime dependencies for running Lab are located in the vendor/ directory and are 
installed as git submodules the first time `make` is run in a new checkout of the source code repository.

The javascript frameworks along with their licensing and readme files are copied into the `dist/vendor/` 
directory when either `make` or `bin/guard` are run.

- `vendor/d3/`
- `vendor/hijs/`
- `vendor/modernizr/`
- `vendor/science.js/`
- `vendor/sizzle/`
- `vendor/jquery/`
- `vendor/jquery-ui/`
- `vendor/mathjax/`

[d3.js](http://mbostock.github.com/d3/), [hijs](https://github.com/cloudhead/hijs), and
[science.js](https://github.com/jasondavies/science.js) are all distributed under a BSD license;
[sizzle](https://github.com/jquery/sizzle) and [modernizr](https://github.com/Modernizr/Modernizr)
are distributed under both BSD and MIT licenses; [jQuery](http://jquery.com/) is licensed under 
the MIT license; [jQuery-UI](jQuery-UI) is distributed under both the MIT license and GPL licenses;
[MathJax](http://www.mathjax.org/) is distributed under the Apache 2.0 license.

## HTML and CSS

[Haml](http://haml-lang.com/) is used to generate most of the HTML in the `dist/` directory.

[kramdown](http://kramdown.rubyforge.org/) is used to generate `readme.html` in `dist/`. from Mardown markup.

[Sass](http://sass-lang.com/) is used to generate the CSS assets. The Sass markup may be in the form of
`*.sass` or `*.scss` files

The [Bourbon](http://thoughtbot.com/bourbon/) library of Sass mixins is included.

- [Bourbon documentation](http://thoughtbot.com/bourbon/)
- [ASCIIcast 330: Better SASS With Bourbon](http://asciicasts.com/episodes/330-better-sass-with-bourbon)

## Updating [http://lab.dev.concord.org/](http://lab.dev.concord.org/)

Currently [http://lab.dev.concord.org/](http://lab.dev.concord.org/) is updated by using rsynch to copy 
the content of the `dist/` directory to the server. 

Modify the example script below with your username, server host, and path to the directory apache is serving:

file: `bin/update.sh`

    #!/bin/sh
    rsync -rvz --delete dist/ username@server:/path/to/dist

Running `bin/update.sh` will now copy and update the directory at [http://lab.dev.concord.org/](http://lab.dev.concord.org/)

## References

### Molecular Simulation

- [Basic molecular dynamics](http://li.mit.edu/Archive/Papers/05/Li05-2.8.pdf)
- [CHARMM: A theoretical introduction to molecular dynamics simulations and practical examples](http://www.ch.embnet.org/MD_tutorial/)

  This site has a basic introduction to the physics of molecular dynamics simulations, and practical 
  exercises with the CHARMM package

- [Thermostat Algorithms for Molecular Dynamics Simulations](http://phjoan23.technion.ac.il/~phr76ja/thermostats.pdf)
- [the "flying ice cube"](http://en.wikipedia.org/wiki/Flying_ice_cube)

  One kind of unphysical effect that can arise. See linked paper.

- [SklogWiki: Lennard-Jones](http://www.sklogwiki.org/SklogWiki/index.php/Lennard-Jones_model)

#### Courses

- [CHE 800-002: Molecular Simulation](http://www.pages.drexel.edu/~cfa22/msim/msim.html)
    Cameron Abrams Department of Chemical Engineering at Drexel  

- [Computational Physics](http://courses.theophys.kth.se/SI2530/)
- [Benchmark results for Lennard-Jones fluid](http://www.cstl.nist.gov/srs/LJ_PURE/index.htm)
- [Statistical Physics and Simulation](http://homepage.univie.ac.at/franz.vesely/simsp/dx/dx.html)

#### Reduced Units

- [softmatter:Simulation Variables/Units](http://matdl.org/matdlwiki/index.php/softmatter:Reduced_units)
- [An MD Code for the Lennard-Jones Fluid](http://www.pages.drexel.edu/~cfa22/msim/node27.html)
- [2.4 Reduced Units](http://homepage.univie.ac.at/franz.vesely/simsp/dx/node11.html)
- [Understanding molecular simulation: from algorithms to applications](http://books.google.com/books?id=XmyO2oRUg0cC&pg=PA41&lpg=PA41&dq=Reduced+Units+Lennard-Jones&source=bl&ots=Zx0F10o1yR&sig=2UJ4C-W8LuASjrvkoTxPA63XBos&hl=en&sa=X&ei=R0AWT7fmNOn10gHKx4jxAg&ved=0CGIQ6AEwBw#v=onepage&q=Reduced%20Units%20Lennard-Jones&f=false)
- [Molecular Dynamics Simulation: Nneoma Ogbonna](http://users.aims.ac.za/~nneoma/theses/NneomaAimsEssay.pdf)

### Runtime Dependencies

#### [d3.js](http://mbostock.github.com/d3/)

- [repo](https://github.com/mbostock/d3)
- [documentation](http://mbostock.github.com/d3/api/)
- [issues](https://github.com/mbostock/d3/issues)
- [google group](http://groups.google.com/group/d3-js)
- [API reference](https://github.com/mbostock/d3/wiki/API-Reference)
  - [Arrays](https://github.com/mbostock/d3/wiki/Arrays)

#### [science.js](https://github.com/jasondavies/science.js)

#### [modernizr](https://github.com/Modernizr/Modernizr)

#### [JQuery](http://jquery.com/)

#### [JQuery-UI](http://jqueryui.com/)

#### [MathJax](http://mathjax.com/)

### Development Dependencies

#### [node](http://nodejs.org/)

- [repo](https://github.com/joyent/node)
- [documentation](http://nodejs.org/docs/latest/api/index.html)
- [debugger](http://nodejs.org/docs/latest/api/debugger.html)
- [issues](https://github.com/joyent/node/issues)
- [google group](http://groups.google.com/group/nodejs)
- [How To Node](http://howtonode.org/)

**[node-inspector](https://github.com/dannycoates/node-inspector)**
- [npm package for node-inspector](http://search.npmjs.org/#/node-inspector)

#### [npm](http://npmjs.org/)

- [repo](https://github.com/isaacs/npm)
- [faq](http://npmjs.org/doc/faq.html)
- [google group](https://groups.google.com/group/npm-)
- [issues](https://github.com/isaacs/npm/issues)

More about using npm for development:

- [Introduction to npm](http://howtonode.org/introduction-to-npm)
- [node_modules in git](http://www.mikealrogers.com/posts/nodemodules-in-git.html)
- [Managing module dependencies](http://howtonode.org/managing-module-dependencies)
- [What do people do for versioning node modules within git?](https://groups.google.com/group/nodejs/browse_thread/thread/9aa563f1fe3b3ff5)

**[CoffeeScript](http://coffeescript.org/)**

- [repo](https://github.com/rstacruz/js2coffee)
- [issues](https://github.com/jashkenas/coffee-script/issues)

**[js2cofee](http://js2coffee.org/)**

- [repo](https://github.com/jashkenas/coffee-script)
- [issues](https://github.com/rstacruz/js2coffee/issues)

### RubyGems

#### [Haml](http://haml-lang.com/)

- [documentation](http://haml-lang.com/docs.html)
- [reference](http://haml-lang.com/docs/yardoc/file.HAML_REFERENCE.html)

#### [Sass](http://sass-lang.com/)

- [documentation](http://sass-lang.com/docs.html)
- [reference](http://sass-lang.com/docs/yardoc/file.SASS_REFERENCE.html)

#### [kramdown](http://kramdown.rubyforge.org/)

[kramdown](http://kramdown.rubyforge.org/) is used to generate HTML from Mardown markup.

#### [Bourbon](http://thoughtbot.com/bourbon/) 

- [Bourbon documentation](http://thoughtbot.com/bourbon/)
- [ASCIIcast 330: Better SASS With Bourbon](http://asciicasts.com/episodes/330-better-sass-with-bourbon)

#### [guard](https://github.com/guard/guard)

- [guard-shell](https://github.com/hawx/guard-shell)
- [guard-haml](https://github.com/manufaktor/guard-haml)
- [guard-sass](https://github.com/hawx/guard-sass)
- [guard-coffeescript](https://github.com/guard/guard-coffeescript)
- [guard-markdown](https://github.com/darwalenator/guard-markdown)
- [guard-livereload](https://github.com/guard/guard-livereload)

### Additional Testing Dependencies

#### [Vows](http://vowsjs.org)

- [repo](https://github.com/cloudhead/vows)

#### [jsdom](http://jsdom.org)

- [repo](https://github.com/tmpvar/jsdom)
- [issues](https://github.com/tmpvar/jsdom/issues)

### Miscellaneous

#### [LiveReload](https://github.com/mockko/livereload) extension for Chrome and Safari

### Full Screen API

- [JavaScript Full Screen API, Navigation Timing and repeating CSS Gradients](http://peter.sh/2011/01/javascript-full-screen-api-navigation-timing-and-repeating-css-gradients/)
- [Fullscreen API, enhanced Element Highlighting and progress on Flexbox](http://peter.sh/2011/08/fullscreen-api-enhanced-element-highlighting-and-progress-on-flexbox/)
- [Native Fullscreen JavaScript API (plus jQuery plugin)](http://johndyer.name/native-fullscreen-javascript-api-plus-jquery-plugin/)
- [Gecko:FullScreenAPI](https://wiki.mozilla.org/Gecko:FullScreenAPI)
- [Mozilla full-screen API progress update](http://blog.pearce.org.nz/2011/09/mozilla-full-screen-api-progress-update.html)
- [fullscreen API coming to browsers near you?](http://ajaxian.com/archives/fullscreen-api-coming-to-browsers-near-you)
- [Full Screen Demos](http://html5-demos.appspot.com/static/fullscreen.html)
- [stackoverflow: Chrome Fullscreen API](http://stackoverflow.com/questions/7836204/chrome-fullscreen-api)
