# See the README for installation instructions.

# Utilities
JS_COMPILER = ./node_modules/uglify-js/bin/uglifyjs
COFFEESCRIPT_COMPILER = ./node_modules/coffee-script/bin/coffee
MARKDOWN_COMPILER = bin/kramdown
JS_TESTER   = ./node_modules/vows/bin/vows --no-color
EXAMPLES_LAB_DIR = ./examples/lab
SASS_COMPILER = bin/sass -I src -r ./src/sass/bourbon/lib/bourbon.rb
BROWSERIFY = ./node_modules/.bin/browserify
R_OPTIMIZER = ./node_modules/.bin/r.js

LAB_SRC_FILES := $(shell find src/lab -type f -print)
COMMON_SRC_FILES := $(shell find src/lab/common -type f -print)
GRAPHER_SRC_FILES := $(shell find src/lab/grapher -type f -print)
ENERGY2D_SRC_FILES := $(shell find src/lab/energy2d -type f -print)
MD2D_SRC_FILES := $(shell find src/lab/md2d -type f -print)

GLSL_TO_JS_CONVERTER := ./node-bin/glsl-to-js-converter
LAB_GLSL_FILES := $(shell find src/lab -name '*.glsl' -print)

# targets

HAML_FILES := $(shell find src -name '*.haml' -exec echo {} \; | sed s'/src\/\(.*\)\.haml/server\/public\/\1/' )
vpath %.haml src

SASS_EXAMPLE_FILES := $(shell find src/examples -name '*.sass' -exec echo {} \; | sed s'/src\/\(.*\)\.sass/server\/public\/\1.css/' )
vpath %.sass src/examples

SASS_DOC_FILES := $(shell find src/doc -name '*.sass' -exec echo {} \; | sed s'/src\/\(.*\)\.sass/server\/public\/\1.css/' )
vpath %.sass src/doc

SCSS_EXAMPLE_FILES := $(shell find src -type d -name 'sass' -prune -o -name '*.scss' -exec echo {} \; | grep -v bourbon | sed s'/src\/\(.*\)\.scss/server\/public\/\1.css/' )
vpath %.scss src

COFFEESCRIPT_EXAMPLE_FILES := $(shell find src/examples -name '*.coffee' -exec echo {} \; | sed s'/src\/\(.*\)\.coffee/server\/public\/\1.js/' )
vpath %.coffee src

MARKDOWN_EXAMPLE_FILES := $(shell find src -type d -name 'sass' -prune -o -name '*.md'  -maxdepth 1 -exec echo {} \; | grep -v vendor | sed s'/src\/\(.*\)\.md/server\/public\/\1.html/' )
vpath %.md src

LAB_JS_FILES = \
	server/public/lab/lab.grapher.js \
	server/public/lab/lab.energy2d.js \
	server/public/lab/lab.md2d.js \
	server/public/lab/lab.version.js \
	server/public/lab/lab.js

all: \
	src/vendor/d3 \
	node_modules \
	bin \
	server/public \
	$(MARKDOWN_EXAMPLE_FILES) \
	$(LAB_JS_FILES) \
	$(LAB_JS_FILES:.js=.min.js) \
	$(HAML_FILES) \
	$(SASS_EXAMPLE_FILES) \
	$(SASS_DOC_FILES) \
	$(SCSS_EXAMPLE_FILES) \
	$(COFFEESCRIPT_EXAMPLE_FILES) \
	server/public/index.css

.PHONY: everything
everything:
	$(MAKE) clean
	$(MAKE) all
	$(MAKE) jnlp-all

.PHONY: public
public:
	bash -O extglob -c 'rm -rf server/public/!(.git|jnlp|vendor)'
	$(MAKE) all

src: \
	$(MARKDOWN_EXAMPLE_FILES) \
	$(LAB_JS_FILES) \
	$(LAB_JS_FILES:.js=.min.js) \
	$(HAML_FILES) \
	$(SASS_EXAMPLE_FILES) \
	$(SASS_DOC_FILES) \
	$(SCSS_EXAMPLE_FILES) \
	$(COFFEESCRIPT_EXAMPLE_FILES) \
	server/public/lab-amd

jnlp-all: clean-jnlp \
	server/public/jnlp
	script/build-and-deploy-jars.rb --maven-update

clean:
	bash -O extglob -c 'rm -rf server/public/!(.git|jnlp)'
	rm -rf lab
	rm -rf node_modules
	git submodule update --init --recursive
	rm -f src/vendor/jquery/dist/jquery*.js
	rm -f src/vendor/jquery-ui/dist/jquery-ui*.js
	rm -f src/vendor/lightgl.js/lightgl.js

clean-jnlp:
	rm -rf server/public/jnlp

src/vendor/d3:
	git submodule update --init --recursive

node_modules: node_modules/coffee-script \
	node_modules/jsdom \
	node_modules/uglify-js	\
	node_modules/vows \
	node_modules/node-inspector \
	node_modules/d3 \
	node_modules/science \
	node_modules/browserify \
	node_modules/cherrio \
	node_modules/jade \
	node_modules/mkdirp \
	node_modules/arrays
	npm install

node_modules/coffee-script:
	npm install

node_modules/jsdom:
	npm install

node_modules/uglify-js:
	npm install

node_modules/vows:
	npm install

node_modules/node-inspector:
	npm install

node_modules/d3:
	npm install src/vendor/d3

node_modules/science:
	npm install src/vendor/science.js

node_modules/browserify:
	npm install

node_modules/cherrio:
	npm install

node_modules/jade:
	npm install

node_modules/mkdirp:
	npm install

node_modules/arrays:
	npm install src/modules/arrays

bin:
	bundle install --binstubs

server/public: \
	server/public/lab \
	server/public/lab-amd \
	server/public/vendor \
	server/public/resources \
	server/public/examples \
	server/public/doc \
	server/public/experiments \
	server/public/imports \
	server/public/jnlp

server/public/examples:
	mkdir -p server/public/examples
	# copy everything (including symbolic links) except files that are used to generate
  # resources from src/examples/ to server/public/examples/
	rsync -aq --filter '+ */' --exclude='*.haml' --exclude='*.sass' --exclude='*.scss' --exclude='*.coffee' src/examples/ server/public/examples/

server/public/doc: \
	server/public/doc/interactives \
	server/public/doc/models
	# copy directories, javascript, json, and image resources from src/examples/
	rsync -aq --filter '+ */' --include='*.js' --include='*.json' --include='*.gif' --include='*.png' --include='*.jpg'  --filter 'hide,! */' src/doc/ server/public/doc/

server/public/doc/interactives:
	mkdir -p server/public/doc/interactives

server/public/doc/models:
	mkdir -p server/public/doc/models

server/public/lab-amd: $(LAB_SRC_FILES)
	mkdir -p server/public/lab-amd
	rsync -aq src/lab/* server/public/lab-amd

.PHONY: server/public/experiments
server/public/experiments:
	mkdir -p server/public/experiments
	rsync -aq src/experiments server/public/

.PHONY: server/public/jnlp
server/public/jnlp:
	mkdir -p server/public/jnlp
	rsync -aq src/jnlp server/public/

.PHONY: server/public/imports
server/public/imports:
	mkdir -p server/public/imports
	rsync -aq imports/ server/public/imports/
	./node-bin/convert-mml-files
	./node-bin/create-mml-html-index
	./src/mw-helpers/post-batch-processor.rb
	rsync -aq --filter '+ */' --exclude='*.mml' --exclude='*.cml'  server/public/imports/legacy-mw-content/sam-activities server/public/imports/legacy-mw-content/converted/
	rsync -aq --filter '+ */' --exclude='*.mml' --exclude='*.cml'  server/public/imports/legacy-mw-content/conversion-and-physics-examples server/public/imports/legacy-mw-content/converted/
	rsync -aq --filter '+ */' --exclude='*.mml' --exclude='*.cml'  server/public/imports/legacy-mw-content/other-activities server/public/imports/legacy-mw-content/converted/
	rsync -aq --filter '+ */' --exclude='*.mml' --exclude='*.cml'  server/public/imports/legacy-mw-content/potential-tests server/public/imports/legacy-mw-content/converted
	rsync -aq --filter '+ */' --exclude='*.mml' --exclude='*.cml'  server/public/imports/legacy-mw-content/tutorial server/public/imports/legacy-mw-content/converted/
	rsync -aq --filter '+ */' --exclude='*.mml' --exclude='*.cml'  server/public/imports/legacy-mw-content/visual server/public/imports/legacy-mw-content/converted/
	rsync -aq --filter '+ */' --exclude='*.mml' --exclude='*.cml'  server/public/imports/legacy-mw-content/validation server/public/imports/legacy-mw-content/converted/

server/public/resources:
	cp -R ./src/resources ./server/public/

server/public/vendor: \
	server/public/vendor/d3 \
	server/public/vendor/d3-plugins \
	server/public/vendor/jquery/jquery.min.js \
	server/public/vendor/jquery-ui/jquery-ui.min.js \
	server/public/vendor/jquery-ui-touch-punch/jquery.ui.touch-punch.min.js \
	server/public/vendor/tinysort/jquery.tinysort.js \
	server/public/vendor/science.js \
	server/public/vendor/modernizr \
	server/public/vendor/sizzle \
	server/public/vendor/hijs \
	server/public/vendor/mathjax \
	server/public/vendor/fonts \
	server/public/vendor/codemirror \
	server/public/vendor/dsp.js \
	server/public/vendor/lightgl.js \
	server/public/vendor/requirejs \
	server/public/vendor/text \
	server/public/vendor/domReady \
	server/public/favicon.ico

server/public/vendor/dsp.js:
	mkdir -p server/public/vendor/dsp.js
	cp src/vendor/dsp.js/dsp.js server/public/vendor/dsp.js
	cp src/vendor/dsp.js/LICENSE server/public/vendor/dsp.js/LICENSE
	cp src/vendor/dsp.js/README server/public/vendor/dsp.js/README

server/public/vendor/lightgl.js: src/vendor/lightgl.js/lightgl.js
	mkdir -p server/public/vendor/lightgl.js
	cp src/vendor/lightgl.js/lightgl.js server/public/vendor/lightgl.js
	cp src/vendor/lightgl.js/LICENSE server/public/vendor/lightgl.js/LICENSE
	cp src/vendor/lightgl.js/README.md server/public/vendor/lightgl.js/README.md

server/public/vendor/d3:
	mkdir -p server/public/vendor/d3
	cp src/vendor/d3/d3*.js server/public/vendor/d3
	cp src/vendor/d3/LICENSE server/public/vendor/d3/LICENSE
	cp src/vendor/d3/README.md server/public/vendor/d3/README.md

server/public/vendor/d3-plugins:
	mkdir -p server/public/vendor/d3-plugins/cie
	cp src/vendor/d3-plugins/LICENSE server/public/vendor/d3-plugins/LICENSE
	cp src/vendor/d3-plugins/README.md server/public/vendor/d3-plugins/README.md
	cp src/vendor/d3-plugins/cie/*.js server/public/vendor/d3-plugins/cie
	cp src/vendor/d3-plugins/cie/README.md server/public/vendor/d3-plugins/cie/README.md

server/public/vendor/jquery-ui-touch-punch/jquery.ui.touch-punch.min.js: \
	server/public/vendor/jquery-ui-touch-punch
	cp src/vendor/jquery-ui-touch-punch/jquery.ui.touch-punch.min.js server/public/vendor/jquery-ui-touch-punch

server/public/vendor/jquery-ui-touch-punch:
	mkdir -p server/public/vendor/jquery-ui-touch-punch

server/public/vendor/jquery/jquery.min.js: \
	src/vendor/jquery/dist/jquery.min.js \
	server/public/vendor/jquery
	cp src/vendor/jquery/dist/jquery*.js server/public/vendor/jquery
	cp src/vendor/jquery/MIT-LICENSE.txt server/public/vendor/jquery
	cp src/vendor/jquery/README.md server/public/vendor/jquery

server/public/vendor/jquery:
	mkdir -p server/public/vendor/jquery

server/public/vendor/jquery-ui/jquery-ui.min.js: \
	src/vendor/jquery-ui/dist/jquery-ui.min.js \
	server/public/vendor/jquery-ui
	cp -r src/vendor/jquery-ui/dist/* server/public/vendor/jquery-ui
	cp src/vendor/jquery-ui/MIT-LICENSE.txt server/public/vendor/jquery-ui

server/public/vendor/jquery-ui:
	mkdir -p server/public/vendor/jquery-ui

server/public/vendor/tinysort:
	mkdir -p server/public/vendor/tinysort

server/public/vendor/tinysort/jquery.tinysort.js: \
	server/public/vendor/tinysort
	cp -r src/vendor/tinysort/src/* server/public/vendor/tinysort
	cp src/vendor/tinysort/README.md server/public/vendor/tinysort

server/public/vendor/science.js:
	mkdir -p server/public/vendor/science.js
	cp src/vendor/science.js/science*.js server/public/vendor/science.js
	cp src/vendor/science.js/LICENSE server/public/vendor/science.js
	cp src/vendor/science.js/README.md server/public/vendor/science.js

server/public/vendor/modernizr:
	mkdir -p server/public/vendor/modernizr
	cp src/vendor/modernizr/modernizr.js server/public/vendor/modernizr
	cp src/vendor/modernizr/readme.md server/public/vendor/modernizr

server/public/vendor/sizzle:
	mkdir -p server/public/vendor/sizzle
	cp src/vendor/sizzle/sizzle.js server/public/vendor/sizzle
	cp src/vendor/sizzle/LICENSE server/public/vendor/sizzle
	cp src/vendor/sizzle/README server/public/vendor/sizzle

server/public/vendor/hijs:
	mkdir -p server/public/vendor/hijs
	cp src/vendor/hijs/hijs.js server/public/vendor/hijs
	cp src/vendor/hijs/LICENSE server/public/vendor/hijs
	cp src/vendor/hijs/README.md server/public/vendor/hijs

server/public/vendor/mathjax:
	mkdir -p server/public/vendor/mathjax
	cp src/vendor/mathjax/MathJax.js server/public/vendor/mathjax
	cp src/vendor/mathjax/LICENSE server/public/vendor/mathjax
	cp src/vendor/mathjax/README.md server/public/vendor/mathjax
	cp -R src/vendor/mathjax/jax server/public/vendor/mathjax
	cp -R src/vendor/mathjax/extensions server/public/vendor/mathjax
	cp -R src/vendor/mathjax/images server/public/vendor/mathjax
	cp -R src/vendor/mathjax/fonts server/public/vendor/mathjax
	cp -R src/vendor/mathjax/config server/public/vendor/mathjax

server/public/vendor/fonts:
	mkdir -p server/public/vendor/fonts
	cp -R src/vendor/fonts server/public/vendor/

server/public/vendor/requirejs:
	mkdir -p server/public/vendor/requirejs
	cp src/vendor/requirejs/require.js server/public/vendor/requirejs
	cp src/vendor/requirejs/LICENSE server/public/vendor/requirejs
	cp src/vendor/requirejs/README.md server/public/vendor/requirejs

server/public/vendor/text:
	mkdir -p server/public/vendor/text
	cp src/vendor/text/text.js server/public/vendor/text
	cp src/vendor/text/LICENSE server/public/vendor/text
	cp src/vendor/text/README.md server/public/vendor/text

server/public/vendor/domReady:
	mkdir -p server/public/vendor/domReady
	cp src/vendor/domReady/domReady.js server/public/vendor/domReady
	cp src/vendor/domReady/LICENSE server/public/vendor/domReady
	cp src/vendor/domReady/README.md server/public/vendor/domReady

server/public/vendor/codemirror:
	mkdir -p server/public/vendor/codemirror
	cp src/vendor/codemirror/LICENSE server/public/vendor/codemirror
	cp src/vendor/codemirror/README.md server/public/vendor/codemirror
	cp -R src/vendor/codemirror/lib server/public/vendor/codemirror
	cp -R src/vendor/codemirror/mode server/public/vendor/codemirror
	cp -R src/vendor/codemirror/theme server/public/vendor/codemirror
	cp -R src/vendor/codemirror/keymap server/public/vendor/codemirror
	# remove codemirror modules excluded by incompatible licensing
	rm -rf server/public/vendor/codemirror/mode/go
	rm -rf server/public/vendor/codemirror/mode/rst
	rm -rf server/public/vendor/codemirror/mode/verilog

server/public/favicon.ico:
	cp -f src/favicon.ico server/public/favicon.ico

src/vendor/lightgl.js/lightgl.js:
	cd src/vendor/lightgl.js; python build.py

src/vendor/jquery/dist/jquery.min.js: src/vendor/jquery
	cd src/vendor/jquery; npm install; ./node_modules/grunt/bin/grunt

src/vendor/jquery:
	git submodule update --init --recursive

src/vendor/jquery-ui/dist/jquery-ui.min.js: src/vendor/jquery-ui
	cd src/vendor/jquery-ui; npm install; ./node_modules/grunt/bin/grunt build

src/vendor/jquery-ui:
	git submodule update --init --recursive

server/public/lab:
	mkdir -p server/public/lab

server/public/lab/lab.js: \
	server/public/lab/lab.grapher.js \
  server/public/lab/lab.md2d.js \
 	server/public/lab/lab.version.js

.PHONY: server/public/lab/lab.version.js
server/public/lab/lab.version.js:
	./script/generate-version.rb

server/public/lab/lab.energy2d.js: \
	$(ENERGY2D_SRC_FILES) \
	$(COMMON_SRC_FILES)
	$(R_OPTIMIZER) -o src/lab/energy2d/energy2d.build.js

server/public/lab/lab.grapher.js: \
	$(GRAPHER_SRC_FILES) \
	$(COMMON_SRC_FILES)
	$(R_OPTIMIZER) -o src/lab/grapher/grapher.build.js

server/public/lab/lab.md2d.js: \
	$(MD2D_SRC_FILES) \
	$(COMMON_SRC_FILES)
	$(R_OPTIMIZER) -o src/lab/md2d/md2d.build.js

server/public/lab/lab.mw-helpers.js: src/mw-helpers/*.coffee
	cat $^ | $(COFFEESCRIPT_COMPILER) --stdio --print > $@
	@chmod ug+w $@

test: test/layout.html \
	src/vendor/d3 \
	server/public \
	$(LAB_JS_FILES) \
	$(JS_FILES:.js=.min.js)
	@$(JS_TESTER)

test-src: test/layout.html \
	$(LAB_JS_FILES) \
	$(JS_FILES:.js=.min.js)
	@$(JS_TESTER)

%.min.js: %.js Makefile
	@rm -f $@
	$(JS_COMPILER) < $< > $@
	@chmod ug+w $@

lab.%: Makefile
	@rm -f $@
	cat $(filter %.js,$^) > $@
	@chmod ug+w $@

test/%.html: test/%.html.haml
	haml $< $@

h:
	@echo $(HAML_FILES)

server/public/%.html: src/%.html.haml Makefile
	haml $< $@

se:
	@echo $(SASS_EXAMPLE_FILES)

sce:
	@echo $(SCSS_EXAMPLE_FILES)

sd:
	@echo $(SASS_DOC_FILES)

sl:
	@echo $(SASS_LIBRARY_FILES)

server/public/index.css:
	$(SASS_COMPILER) src/index.sass server/public/index.css

server/public/examples/%.css: %.sass Makefile
	$(SASS_COMPILER) $< $@

server/public/doc/%.css: %.sass Makefile
	$(SASS_COMPILER) $< $@

server/public/lab/%.css: %.sass Makefile
	$(SASS_COMPILER) $< $@

lab/%.css: %.sass Makefile
	$(SASS_COMPILER) $< $@

server/public/%.css: %.scss Makefile
	$(SASS_COMPILER) $< $@

c:
	@echo $(COFFEESCRIPT_EXAMPLE_FILES)

server/public/%.js: %.coffee Makefile
	@rm -f $@
	$(COFFEESCRIPT_COMPILER) --compile --print $< > $@

m:
	@echo $(MARKDOWN_EXAMPLE_FILES)

md2d:
	@echo $(MD2D_SRC_FILES)

server/public/%.html: %.md Makefile
	@rm -f $@
	$(MARKDOWN_COMPILER) $< --toc-levels 2..6 --template src/layouts/$*.html.erb > $@
