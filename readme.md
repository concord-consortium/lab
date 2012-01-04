# Lab

HTML5-based scientific models, visualizations, graphing, and probeware.

## Simple Molecules

Example: http://lab.dev.concord.org/simplemolecules/simplemolecules.html

## Grapher

Example: http://lab.dev.concord.org/surface-temperature/surface-temperature.html

## Development Setup

Use git to create a local clone of the lab repository:

    git clone git://github.com/concord-consortium/lab.git

If you have commit access to the repository use this form:

    git clone git@github.com:concord-consortium/lab.git

I recommend also cloning the d3.js repository -- there are many useful examples:

    git clone git://github.com/mbostock/d3.git

Install the additional Ruby Gems used during development: haml, sass, guard ...

    bundle install
    bundle install --binstubs

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

There are additional prerequisites for testing.

- node
- npm

This repository should work out of the box if you just want to create new
visualizations using Grapher and D3. On the other hand, if you want to 
extend Grapher with new features, fix bugs, or run tests, you'll need to 
install a few more things.

Grapher's test framework uses [Vows](http://vowsjs.org), which depends on
[Node.js](http://nodejs.org/) and [NPM](http://npmjs.org/). If you are
developing on Mac OS X, an easy way to install Node and NPM is using
[Homebrew](http://mxcl.github.com/homebrew/):

    brew install node
    brew install npm

Next, from the root directory of this repository, install D3's dependencies:

    npm install

You can see the list of dependencies in package.json. The packages will be
installed in the node_modules directory.

Running the tests

    make test

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

http://peter.sh/2011/01/javascript-full-screen-api-navigation-timing-and-repeating-css-gradients/
http://peter.sh/2011/08/fullscreen-api-enhanced-element-highlighting-and-progress-on-flexbox/
http://johndyer.name/native-fullscreen-javascript-api-plus-jquery-plugin/
https://wiki.mozilla.org/Gecko:FullScreenAPI
http://blog.pearce.org.nz/2011/09/mozilla-full-screen-api-progress-update.html
http://ajaxian.com/archives/fullscreen-api-coming-to-browsers-near-you
http://html5-demos.appspot.com/static/fullscreen.html
http://stackoverflow.com/questions/7836204/chrome-fullscreen-api
http://stackoverflow.com/questions/7836204/chrome-fullscreen-api/7934009
