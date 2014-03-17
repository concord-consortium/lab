# Dependencies

## JavaScript Runtime Dependencies

### D3

[D3](http://mbostock.github.com/d3/): manipulating and visualizing documents based on data.

- [repo](https://github.com/mbostock/d3)
- [documentation](http://mbostock.github.com/d3/api/)
- [issues](https://github.com/mbostock/d3/issues)
- [google group](http://groups.google.com/group/d3-js)
- [API reference](https://github.com/mbostock/d3/wiki/API-Reference)
  - [Arrays](https://github.com/mbostock/d3/wiki/Arrays)

### JQuery

[JQuery](http://jquery.com/): simplifies HTML document traversing, event handling, animating,
and Ajax interactions.

### JQuery-UI

[JQuery-UI](http://jqueryui.com/): abstractions for low-level interaction and
animation, advanced effects and high-level, themeable widgets, built on top of the jQuery

### Modernizr

[modernizr](https://github.com/Modernizr/Modernizr): detect HTML5 and CSS3 features in browsers.

Lab Example: [`index.html.haml`](https://github.com/concord-consortium/lab/blob/master/src/index.html.haml#L12)
uses Modernizer to check if the browser implents SVG and re-direct the user to an upgrade
page if the feature is not presnet.

### OpenSans Font

[OpenSans Font](http://www.google.com/webfonts/specimen/Open+Sans): used for most text display

## Javascript Development Dependencies

### node

- [node](http://nodejs.org/)
- [repo](https://github.com/joyent/node)
- [documentation](http://nodejs.org/docs/latest/api/index.html)
- [debugger](http://nodejs.org/docs/latest/api/debugger.html)
- [issues](https://github.com/joyent/node/issues)
- [google group](http://groups.google.com/group/nodejs)
- [How To Node](http://howtonode.org/)

**[node-inspector](https://github.com/dannycoates/node-inspector)**
- [npm package for node-inspector](http://search.npmjs.org/#/node-inspector)

### npm

[npm](http://npmjs.org/), the Node Package Manager isnow bundled with Node and is
used to specify and manage external node pacage dependencies for a project.

- [repo](https://github.com/isaacs/npm)
- [faq](http://npmjs.org/doc/faq.html)
- [google group](https://groups.google.com/group/npm-)
- [issues](https://github.com/isaacs/npm/issues)

More about using npm for development:

- [Introduction to npm](http://howtonode.org/introduction-to-npm)
- [node_modules in git](http://www.mikealrogers.com/posts/nodemodules-in-git.html)
- [Managing module dependencies](http://howtonode.org/managing-module-dependencies)
- [What do people do for versioning node modules within git?](https://groups.google.com/group/nodejs/browse_thread/thread/9aa563f1fe3b3ff5)

Lab Example: [`package.json`](https://github.com/concord-consortium/lab/blob/master/package.json)
specifies node pakage dependencies for the Lab project.

### RequireJS

[RequireJS](http://requirejs.org) is a JavaScript file and module
loader. It is optimized for in-browser use, but it can be used in other
JavaScript environments, like Rhino and Node.

- [homepage](http://requirejs.org)
- [repo](https://github.com/jrburke/requirejs)
- [RequireJS Google Group](https://groups.google.com/forum/?fromgroups#!forum/requirejs)

Lab Example:

All Lab's modules use RequireJS for dependency management and build process. Its application is widely
described in [this section](#javascript-dependency-management-and-build-process---requrejs).

### CoffeeScript

[CoffeeScript](http://coffeescript.org/) is a language the compiles to JavaScript. Many programmers
find it more expressive and productive. [js2cofee](http://js2coffee.org/) can be used to convert
JavaScript to CoffeeScript. RequireJS Optimizer also can convert CoffeeScript to JavaScrit. So
you don't have to manually do it when referencing CoffeeScript files using RequireJS.

- [repo](https://github.com/jashkenas/coffee-script)
- [issues](https://github.com/jashkenas/coffee-script/issues)

[This section](#coffeescript-files-support) covers RequireJS support of CoffeeScript files.

## Ruby Development Dependencies

### Bundler

[Bundler](http://gembundler.com/) is a Ruby Gem used to express and manage Ruby Gem dependencies.

- [rationale](http://gembundler.com/rationale.html)
- [documentation: Gemfile](http://gembundler.com/man/gemfile.5.html)
- [documentation: CLI](http://gembundler.com/man/bundle.1.html)

Lab Example: [`Gemfile`](https://github.com/concord-consortium/lab/blob/master/Gemfile)
is used to specify all the Ruby Gem dependencies to build and test the Lab project.

### Haml

[Haml](http://haml-lang.com/) is a Ruby Gem that processes HTML expressed in HAML markup into HTML.

- [documentation](http://haml-lang.com/docs.html)
- [reference](http://haml-lang.com/docs/yardoc/file.HAML_REFERENCE.html)

Lab Example: [`index.html.haml`](https://github.com/concord-consortium/lab/blob/master/src/index.html.haml)
is used to generate the main [`index.html`](https://github.com/concord-consortium/lab/blob/gh-pages/index.html) page.

### Sass

[Sass](http://sass-lang.com/) is a Ruby Gem that provides many powerful extensions to CSS3 and works
by processing files in either [SASS-indented-syntax](http://sass-lang.com/docs/yardoc/file.INDENTED_SYNTAX.html)
or SCSS format (a su[erset of standard CSS3) and generating CSS stylesheets.

- [documentation](http://sass-lang.com/docs.html)
- [reference](http://sass-lang.com/docs/yardoc/file.SASS_REFERENCE.html)

Lab Examples:

1.  [`index.sass`](https://github.com/concord-consortium/lab/blob/master/src/index.sass)
    is used to generate: [`index.css`](https://github.com/concord-consortium/lab/blob/gh-pages/index.css)
2.  [`readme.scss`](https://github.com/concord-consortium/lab/blob/master/src/readme.scss)
    is used to generate: [`readme.css`](https://github.com/concord-consortium/lab/blob/gh-pages/readme.css)

### Guard

[Guard](https://github.com/guard/guard) is a Ruby Gem that can efficiently watch for changes on the file system and
automatically start the build process when needed.

- [guard-shell](https://github.com/hawx/guard-shell)
- [guard-haml](https://github.com/manufaktor/guard-haml)
- [guard-sass](https://github.com/hawx/guard-sass)
- [guard-coffeescript](https://github.com/guard/guard-coffeescript)
- [guard-markdown](https://github.com/darwalenator/guard-markdown)
- [guard-livereload](https://github.com/guard/guard-livereload)

Lab Example: Starting Guard with `bin/guard` loads and runs the configuration in [`Guardfile`](https://github.com/concord-consortium/lab/blob/master/Guardfile).

### Thor

[thor](https://github.com/wycats/thor) is a Ruby Gem for building self-documenting command line utilities.

- [documentation](https://github.com/wycats/thor/wiki)

Lab Example: [`cloud.thor`](https://github.com/concord-consortium/lab/blob/master/cloud.thor) are the
Ruby command-line interface scripts for providing access to the
[`AwsLabServer`](https://github.com/concord-consortium/lab/blob/master/script/aws-lab-server.rb)
library for creating and managing AWS cloud servers.

### Fog

[fog](http://fog.io/) is a Ruby Gem for working with many different cloud service providers.

- [documentation](http://fog.io/)
- [repo](https://github.com/fog/fog)

Lab Example: [`AwsLabServer`](https://github.com/concord-consortium/lab/blob/master/script/aws-lab-server.rb)
is a library built on top of fog for creating and managing Lab server instances on AWS.

## Additional Testing Dependencies

### Vows

[Vows](http://vowsjs.org) is an asynchronous behaviour driven testing framework for Node.

- [repo](https://github.com/cloudhead/vows)

### Mocha

[Mocha](http://visionmedia.github.io/mocha/) is a feature-rich JavaScript test framework running on Node.

### jsdom

- [jsdom](http://jsdom.org)
- [repo](https://github.com/tmpvar/jsdom)

## Miscellaneous

### livereload

[livereload](https://github.com/mockko/livereload) is project that has created extensions
for Chrome FireFox, and Safari to provide automatic browser reloading when the HTML,
CSS and JavaScript files are changed on the server. The older version 1 extensions
work with the guard-livereload gem.

- [livereload v1 readme](https://github.com/mockko/livereload/blob/master/README-old.md)

