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

## Development Setup

### Prerequisites

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
of both visualizations and examples of tests that run extremely quickly using vows, jsdom, and node.

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

### Testing

Lab's test framework uses [Vows](http://vowsjs.org), which depends on
[Node.js](http://nodejs.org/) and [NPM](http://npmjs.org/). 

Running the tests:

    make test

If you have everything setup correctly you should see something like this:

    · ·· 
    ✓ OK » 3 honored (0.001s)

### Repository structure

- `src/examples`: haml, sass files are processed into html and css files saved in the `examples/` directory, javascript files are copied.
- `src/grapher`: javascript code compiled into the grapher.js module
- `test/`: tests that run in [nodejs](http://nodejs.org/) using [Vows](http://vowsjs.org)
- `lib/`: unmanaged dependencies

After running `bundle install --binstubs` the `bin/` directory will be created.

After running: `bin/guard` the `examples/` directory will be created.

**Note:** remember to make changes you want saved in the `src/` directory **not** in the `examples/' directory.`

### Updating http://lab.dev.concord.org/

Currently http://lab.dev.concord.org/ is updated by using rsynch to copy the content of the 
examples/ directory to the server. 

Modify the example script below with your username, server host, 
and path to the directory apache is serving:

file: bin/update.sh

    #!/bin/sh
    rsync -rvz --delete examples/ username@server:/path/to/examples

Running bin/update.sh will copy/update the directory at http://lab.dev.concord.org/

### References

**[d3.js](http://mbostock.github.com/d3/)**

- [repo](https://github.com/mbostock/d3)
- [documentation](http://mbostock.github.com/d3/api/)
- [issues](https://github.com/mbostock/d3/issues)
- [google group](http://groups.google.com/group/d3-js)

**[node](http://nodejs.org/)**

- [repo](https://github.com/joyent/node)
- [documentation](http://nodejs.org/docs/latest/api/index.html)
- [issues](https://github.com/joyent/node/issues)
- [google group](http://groups.google.com/group/nodejs)
- [How To Node](http://howtonode.org/)

**[npm](http://npmjs.org/)**

- [repo](https://github.com/isaacs/npm)
- [faq](http://npmjs.org/doc/faq.html)
- [google group](https://groups.google.com/group/npm-)
- [issues](https://github.com/isaacs/npm/issues)

More about using npm for development:

- [Introduction to npm](http://howtonode.org/introduction-to-npm)
- [node_modules in git](http://www.mikealrogers.com/posts/nodemodules-in-git.html)
- [Managing module dependencies](http://howtonode.org/managing-module-dependencies)
- [What do people do for versionizing node modules within git?](https://groups.google.com/group/nodejs/browse_thread/thread/9aa563f1fe3b3ff5)

**RubyGems**

- [sass](http://sass-lang.com/), [reference](http://sass-lang.com/docs/yardoc/file.SASS_REFERENCE.html)
- [haml](http://haml-lang.com/), [reference](http://haml-lang.com/docs/yardoc/file.HAML_REFERENCE.html)
- [guard](https://github.com/guard/guard)
- [guard-shell](https://github.com/hawx/guard-shell)
- [guard-livereload](https://github.com/guard/guard-livereload)
- [rb-fsevent](https://github.com/thibaudgg/rb-fsevent)

**LiveReload extension for Chrome and Safari**

- [livereload](https://github.com/mockko/livereload)

**Full Screen API**

- http://peter.sh/2011/01/javascript-full-screen-api-navigation-timing-and-repeating-css-gradients/
- http://peter.sh/2011/08/fullscreen-api-enhanced-element-highlighting-and-progress-on-flexbox/
- http://johndyer.name/native-fullscreen-javascript-api-plus-jquery-plugin/
- https://wiki.mozilla.org/Gecko:FullScreenAPI
- http://blog.pearce.org.nz/2011/09/mozilla-full-screen-api-progress-update.html
- http://ajaxian.com/archives/fullscreen-api-coming-to-browsers-near-you
- http://html5-demos.appspot.com/static/fullscreen.html
- http://stackoverflow.com/questions/7836204/chrome-fullscreen-api
- http://stackoverflow.com/questions/7836204/chrome-fullscreen-api/7934009
