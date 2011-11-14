# Grapher

### Browser Support

Grapher uses [D3](http://mbostock.github.com/d3/}) and should work on any
browser, with minimal requirements such as JavaScript and the [W3C
DOM](http://www.w3.org/DOM/) API. By default D3 requires the [Selectors
API](http://www.w3.org/TR/selectors-api/) Level 1, but you can preload
[Sizzle](http://sizzlejs.com/) for compatibility with older browsers. Some of
the included D3 examples use additional browser features, such as
[SVG](http://www.w3.org/TR/SVG/) and [CSS3

Transitions](http://www.w3.org/TR/css3-transitions/). These features are not
required to use D3, but are useful for visualization! D3 is not a compatibility
layer. The examples should work on Firefox, Chrome (Chromium), Safari (WebKit),
Opera and IE9.

Note: Chrome has strict permissions for reading files out of the local file
system. Some examples use AJAX which works differently via HTTP instead of local
files. For the best experience, load the D3 examples from your own machine via
HTTP. Any static file web server will work; for example you can run Python's
built-in server:

    python -m SimpleHTTPServer 8888

Once this is running, go to: <http://localhost:8888/examples/>

### Development Setup

Prerequisites

- Ruby 1.9
- RubyGem: bundler
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

Install the additional Ruby Gems used during development: haml, sass, guard ...
 
    bundle install
    bundle install --binstubs

Start watching the various src directories and automatically compile and
generate JavaScript, HTML and CSS resources:

    bin/guard start

To have the browser page for an example automatically reload when changes are made install the livereload extension into Chrome, Safari, and FireFox, open one of the example pages, turn on the livereload extension in the browser by clicking the small "LR" button on the toolbar.

### Running the tests

    make test

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
