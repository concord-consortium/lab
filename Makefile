# See the README for installation instructions.

# Utilities
JS_COMPILER = ./node_modules/uglify-js/bin/uglifyjs
COFFEESCRIPT_COMPILER = ./node_modules/coffee-script/bin/coffee
MARKDOWN_COMPILER = bin/kramdown
JS_TESTER   = ./node_modules/vows/bin/vows --no-color
EXAMPLES_LAB_DIR = ./examples/lab
SASS_COMPILER = bin/sass -I src -r ./src/sass/bourbon/lib/bourbon.rb
MD_ENGINE_JS_FILES := $(shell find src/md-engine -name '*.js' -print)
BROWSERIFY = ./node_modules/.bin/browserify
BATCH_CONVERT_MML_FILES = ./node-bin/mw-batch-converter
BATCH_POST_PROCESS_MML_CONVERSION = ruby src/mw-helpers/post-batch-processor.rb

# targets
HAML_FILES := $(shell find src -name '*.haml' -exec echo {} \; | sed s'/src\/\(.*\)\.haml/server\/public\/\1/' )
vpath %.haml src

SASS_EXAMPLE_FILES := $(shell find src/examples -name '*.sass' -exec echo {} \; | sed s'/src\/\(.*\)\.sass/server\/public\/\1.css/' )
vpath %.sass src/examples

SASS_DOC_FILES := $(shell find src/doc -name '*.sass' -exec echo {} \; | sed s'/src\/\(.*\)\.sass/server\/public\/\1.css/' )
vpath %.sass src/doc

SCSS_EXAMPLE_FILES := $(shell find src -name '*.scss' -exec echo {} \; | grep -v bourbon | sed s'/src\/\(.*\)\.scss/server\/public\/\1.css/' )
vpath %.scss src

COFFEESCRIPT_EXAMPLE_FILES := $(shell find src/examples -name '*.coffee' -exec echo {} \; | sed s'/src\/\(.*\)\.coffee/server\/public\/\1.js/' )
vpath %.coffee src

MARKDOWN_EXAMPLE_FILES := $(shell find src -name '*.md' -exec echo {} \; | grep -v vendor | sed s'/src\/\(.*\)\.md/server\/public\/\1.html/' )
vpath %.md src

MML_IMPORT_FILES := $(shell find imports/legacy-mw-content -name '*.mml' -exec echo {} \; | sed s'/imports\/legacy-mw-content\/\(.*\)/server\/public\/imports\/legacy-mw-content\/converted\/\1/' )
vpath %.mml imports/legacy-mw-content

LAB_JS_FILES = \
	server/public/lab/lab.grapher.js \
	server/public/lab/lab.benchmark.js \
	server/public/lab/lab.layout.js \
	server/public/lab/lab.views.js \
	server/public/lab/lab.arrays.js \
	server/public/lab/lab.molecules.js \
	server/public/lab/lab.components.js \
	server/public/lab/lab.controllers.js \
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

jnlp-all: clean-jnlp \
	server/public/jnlp
	script/build-and-deploy-jars.rb --maven-update

clean:
	bash -O extglob -c 'rm -rf server/public/!(.git|jnlp)'
	rm -rf lab
	rm -rf node_modules
	git submodule update --init --recursive
	rm -f src/vendor/jquery/jquery.min.js

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
	node_modules/mkdirp
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

bin:
	bundle install --binstubs

server/public: \
  server/public/lab \
	server/public/vendor \
	server/public/resources \
	server/public/examples \
	server/public/doc \
	server/public/experiments \
  server/public/imports \
  server/public/jnlp

server/public/examples:
	mkdir -p server/public/examples
	# copy directories, javascript, json, and image resources from src/examples/
	rsync -aq --filter '+ */' --include='*.js' --include='*.json' --include='*.gif' --include='*.png' --include='*.jpg'  --include='*.csv' --filter 'hide,! */' src/examples/ server/public/examples/

server/public/doc:
	mkdir -p server/public/doc
	# copy directories, javascript, json, and image resources from src/examples/
	rsync -aq --filter '+ */' --include='*.js' --include='*.json' --include='*.gif' --include='*.png' --include='*.jpg'  --filter 'hide,! */' src/doc/ server/public/doc/

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
	$(BATCH_CONVERT_MML_FILES)
	$(BATCH_POST_PROCESS_MML_CONVERSION)

server/public/resources:
	cp -R ./src/resources ./server/public/

server/public/vendor: \
	server/public/vendor/d3 \
	server/public/vendor/jquery \
	server/public/vendor/jquery-ui \
	server/public/vendor/science.js \
	server/public/vendor/modernizr \
	server/public/vendor/sizzle \
	server/public/vendor/hijs \
	server/public/vendor/mathjax \
	server/public/vendor/fonts \
	server/public/vendor/codemirror2 \
  server/public/favicon

server/public/vendor/d3:
	mkdir -p server/public/vendor/d3
	cp src/vendor/d3/d3*.js server/public/vendor/d3
	cp src/vendor/d3/LICENSE server/public/vendor/d3/LICENSE
	cp src/vendor/d3/README.md server/public/vendor/d3/README.md

server/public/vendor/jquery: src/vendor/jquery/jquery.min.js
	mkdir -p server/public/vendor/jquery
	cp src/vendor/jquery/dist/jquery.min.js server/public/vendor/jquery/jquery.min.js
	cp src/vendor/jquery/MIT-LICENSE.txt server/public/vendor/jquery
	cp src/vendor/jquery/README.md server/public/vendor/jquery

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

server/public/vendor/codemirror2:
	mkdir -p server/public/vendor/codemirror2
	cp src/vendor/codemirror2/LICENSE server/public/vendor/codemirror2
	cp src/vendor/codemirror2/README.md server/public/vendor/codemirror2
	cp -R src/vendor/codemirror2/lib server/public/vendor/codemirror2
	cp -R src/vendor/codemirror2/mode server/public/vendor/codemirror2
	cp -R src/vendor/codemirror2/theme server/public/vendor/codemirror2
	cp -R src/vendor/codemirror2/keymap server/public/vendor/codemirror2
	# remove Codemirror2 modules excluded by incompatible licensing
	rm -rf server/public/vendor/codemirror2/mode/go
	rm -rf server/public/vendor/codemirror2/mode/rst
	rm -rf server/public/vendor/codemirror2/mode/verilog

server/public/favicon:
	cp -f src/favicon.ico server/public/favicon.ico

src/vendor/jquery/jquery.min.js: src/vendor/jquery
	cd src/vendor/jquery; npm install; ./node_modules/grunt/bin/grunt

src/vendor/jquery:
	git submodule update --init --recursive

server/public/vendor/jquery-ui:
	mkdir -p server/public/vendor/jquery-ui/js
	cp src/vendor/jquery-ui/development-bundle/GPL-LICENSE.txt server/public/vendor/jquery-ui
	cp src/vendor/jquery-ui/development-bundle/MIT-LICENSE.txt server/public/vendor/jquery-ui
	cp src/vendor/jquery-ui/js/jquery-ui-1.8.17.custom.min.js server/public/vendor/jquery-ui/js/jquery-ui.custom.min.js
	cp -R src/vendor/jquery-ui/css server/public/vendor/jquery-ui

server/public/lab:
	mkdir -p server/public/lab

server/public/lab/lab.js: \
	server/public/lab/lab.grapher.js \
	server/public/lab/lab.molecules.js \
	server/public/lab/lab.benchmark.js \
	server/public/lab/lab.arrays.js \
	server/public/lab/lab.layout.js \
	server/public/lab/lab.views.js \
	server/public/lab/lab.components.js \
  server/public/lab/lab.controllers.js

server/public/lab/lab.grapher.js: \
	src/lab/start.js \
	src/lab/grapher/core/core.js \
	src/lab/grapher/core/data.js \
	src/lab/grapher/core/axis.js \
	src/lab/grapher/core/indexed-data.js \
	src/lab/grapher/core/graph.js \
	src/lab/grapher/core/real-time-graph.js \
	src/lab/grapher/core/colors.js \
	src/lab/grapher/core/register-keyboard-handler.js \
	src/lab/end.js

server/public/lab/lab.md2d.js: \
	$(MD_ENGINE_JS_FILES)
	$(BROWSERIFY) src/md-engine/md2d.js -o server/public/lab/lab.md2d.js

server/public/lab/lab.molecules.js: \
	src/lab/start.js \
	server/public/lab/lab.md2d.js \
	src/lab/molecules/modeler.js \
	src/lab/end.js

server/public/lab/lab.benchmark.js: \
	src/lab/start.js \
	src/lab/benchmark/benchmark.js \
	src/lab/end.js

server/public/lab/lab.arrays.js: \
	src/lab/start.js \
	src/lab/arrays/arrays.js \
	src/lab/end.js

server/public/lab/lab.layout.js: \
	src/lab/start.js \
	src/lab/layout/layout.js \
	src/lab/layout/fullscreen.js \
	src/lab/end.js

server/public/lab/lab.views.js: \
	src/lab/start.js \
	src/lab/views/views.js \
	src/lab/views/applet-container.js \
	src/lab/views/molecule-container.js \
	src/lab/views/potential-chart.js \
	src/lab/views/speed-distribution-histogram.js \
	src/lab/views/benchmarks.js \
	src/lab/views/datatable.js \
	src/lab/views/temperature-control.js \
	src/lab/views/force-interaction-controls.js \
	src/lab/views/display-stats.js \
	src/lab/views/heat-cool-buttons.js \
	src/lab/end.js

server/public/lab/lab.controllers.js: \
	src/lab/start.js \
	src/lab/controllers/controllers.js \
	src/lab/controllers/simple-model-controller.js \
	src/lab/controllers/compare-models-controller.js \
	src/lab/controllers/complex-model-controller.js \
	src/lab/controllers/interactives-controller.js \
	src/lab/controllers/model-controller.js \
	src/lab/end.js

server/public/lab/lab.components.js: src/lab/components/*.coffee
	cat $^ | $(COFFEESCRIPT_COMPILER) --stdio --print > $@
	@chmod ug+w $@

server/public/lab/lab.mw-helpers.js: src/mw-helpers/*.coffee
	cat $^ | $(COFFEESCRIPT_COMPILER) --stdio --print > $@
	@chmod ug+w $@

test: test/layout.html \
	src/vendor/d3 \
	server/public \
	$(LAB_JS_FILES) \
	$(JS_FILES:.js=.min.js) \
	$(MD_ENGINE_JS_FILES)
	@$(JS_TESTER)

test-src: test/layout.html \
	$(LAB_JS_FILES) \
	$(JS_FILES:.js=.min.js) \
	$(MD_ENGINE_JS_FILES)
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

server/public/%.html: %.md Makefile
	@rm -f $@
	$(MARKDOWN_COMPILER) $< --toc-levels 2..6 --template src/layouts/$*.html.erb > $@
