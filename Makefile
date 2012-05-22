# See the README for installation instructions.

JS_COMPILER = ./node_modules/uglify-js/bin/uglifyjs
COFFEESCRIPT_COMPILER = ./node_modules/coffee-script/bin/coffee
MARKDOWN_COMPILER = bin/kramdown
JS_TESTER   = ./node_modules/vows/bin/vows --no-color
EXAMPLES_LAB_DIR = ./examples/lab
SASS_COMPILER = bin/sass -I src -r ./src/sass/bourbon/lib/bourbon.rb

HAML_FILES := $(shell find src -name '*.haml' -exec echo {} \; | sed s'/src\/\(.*\)\.haml/dist\/\1/' )
vpath %.haml src

SASS_EXAMPLE_FILES := $(shell find src/examples -name '*.sass' -exec echo {} \; | sed s'/src\/\(.*\)\.sass/dist\/\1.css/' )
vpath %.sass src/examples

SASS_DOC_FILES := $(shell find src/doc -name '*.sass' -exec echo {} \; | sed s'/src\/\(.*\)\.sass/dist\/\1.css/' )
vpath %.sass src/doc

SCSS_EXAMPLE_FILES := $(shell find src -name '*.scss' -exec echo {} \; | grep -v bourbon | sed s'/src\/\(.*\)\.scss/dist\/\1.css/' )
vpath %.scss src

COFFEESCRIPT_EXAMPLE_FILES := $(shell find src/examples -name '*.coffee' -exec echo {} \; | sed s'/src\/\(.*\)\.coffee/dist\/\1.js/' )
vpath %.coffee src

MARKDOWN_EXAMPLE_FILES := $(shell find src -name '*.md' -exec echo {} \; | grep -v vendor | sed s'/src\/\(.*\)\.md/dist\/\1.html/' )
vpath %.md src

MD_ENGINE_JS_FILES := $(shell find src/md-engine -name '*.js' -print)
BROWSERIFY = ./node_modules/.bin/browserify
CONVERT_MML_FILES = ./node-bin/mw-batch-converter

LAB_JS_FILES = \
	dist/lab/lab.grapher.js \
	dist/lab/lab.benchmark.js \
	dist/lab/lab.layout.js \
	dist/lab/lab.arrays.js \
	dist/lab/lab.molecules.js \
	dist/lab/lab.components.js \
	dist/lab/lab.controllers.js \
	dist/lab/lab.js

all: \
	src/vendor/d3 \
	node_modules \
	bin \
	dist \
	$(MARKDOWN_EXAMPLE_FILES) \
	$(LAB_JS_FILES) \
	$(LAB_JS_FILES:.js=.min.js) \
	$(HAML_FILES) \
	$(SASS_EXAMPLE_FILES) \
	$(SASS_DOC_FILES) \
	$(SCSS_EXAMPLE_FILES) \
	$(COFFEESCRIPT_EXAMPLE_FILES) \
	dist/index.css

clean:
	bash -O extglob -c 'rm -rf dist/* dist/.!(git|.|)'
	rm -rf lab
	rm -rf node_modules
	git submodule update --init --recursive
	rm -f src/vendor/jquery/dist/jquery.min.js

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
	node_modules/jade
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

bin:
	bundle install --binstubs

dist: \
  dist/lab \
	dist/vendor \
	dist/resources \
	dist/examples \
	dist/doc \
	dist/experiments \
  dist/imports

dist/examples:
	mkdir -p dist/examples
	# copy directories, javascript, json, and image resources from src/examples/
	rsync -avq --filter '+ */' --include='*.js' --include='*.json' --include='*.gif' --include='*.png' --include='*.jpg'  --filter 'hide,! */' src/examples/ dist/examples/

dist/doc:
	mkdir -p dist/doc
	# copy directories, javascript, json, and image resources from src/examples/
	rsync -avq --filter '+ */' --include='*.js' --include='*.json' --include='*.gif' --include='*.png' --include='*.jpg'  --filter 'hide,! */' src/doc/ dist/doc/

dist/experiments:
	mkdir -p dist/experiments
	rsync -avq src/experiments dist/

.PHONY: dist/experiments

dist/imports:
	$(CONVERT_MML_FILES)
	mkdir -p dist/imports
	rsync -avq imports/ dist/imports/

.PHONY: dist/imports

dist/resources:
	cp -R ./src/resources ./dist/

dist/vendor: \
	dist/vendor/d3 \
	dist/vendor/jquery \
	dist/vendor/jquery-ui \
	dist/vendor/science.js \
	dist/vendor/modernizr \
	dist/vendor/sizzle \
	dist/vendor/hijs \
	dist/vendor/mathjax \
	dist/vendor/fonts

dist/vendor/d3:
	mkdir -p dist/vendor/d3
	cp src/vendor/d3/d3*.js dist/vendor/d3
	cp src/vendor/d3/LICENSE dist/vendor/d3/LICENSE
	cp src/vendor/d3/README.md dist/vendor/d3/README.md

dist/vendor/jquery: src/vendor/jquery/dist/jquery.min.js
	mkdir -p dist/vendor/jquery
	cp src/vendor/jquery/dist/jquery.min.js dist/vendor/jquery/jquery.min.js
	cp src/vendor/jquery/MIT-LICENSE.txt dist/vendor/jquery
	cp src/vendor/jquery/README.md dist/vendor/jquery

dist/vendor/science.js:
	mkdir -p dist/vendor/science.js
	cp src/vendor/science.js/science*.js dist/vendor/science.js
	cp src/vendor/science.js/LICENSE dist/vendor/science.js
	cp src/vendor/science.js/README.md dist/vendor/science.js

dist/vendor/modernizr:
	mkdir -p dist/vendor/modernizr
	cp src/vendor/modernizr/modernizr.js dist/vendor/modernizr
	cp src/vendor/modernizr/readme.md dist/vendor/modernizr

dist/vendor/sizzle:
	mkdir -p dist/vendor/sizzle
	cp src/vendor/sizzle/sizzle.js dist/vendor/sizzle
	cp src/vendor/sizzle/LICENSE dist/vendor/sizzle
	cp src/vendor/sizzle/README dist/vendor/sizzle

dist/vendor/hijs:
	mkdir -p dist/vendor/hijs
	cp src/vendor/hijs/hijs.js dist/vendor/hijs
	cp src/vendor/hijs/LICENSE dist/vendor/hijs
	cp src/vendor/hijs/README.md dist/vendor/hijs

dist/vendor/mathjax:
	mkdir -p dist/vendor/mathjax
	cp src/vendor/mathjax/MathJax.js dist/vendor/mathjax
	cp src/vendor/mathjax/LICENSE dist/vendor/mathjax
	cp src/vendor/mathjax/README.md dist/vendor/mathjax
	cp -R src/vendor/mathjax/jax dist/vendor/mathjax
	cp -R src/vendor/mathjax/extensions dist/vendor/mathjax
	cp -R src/vendor/mathjax/images dist/vendor/mathjax
	cp -R src/vendor/mathjax/fonts dist/vendor/mathjax
	cp -R src/vendor/mathjax/config dist/vendor/mathjax

dist/vendor/fonts:
	mkdir -p dist/vendor/fonts
	cp -R src/vendor/fonts dist/vendor/

src/vendor/jquery/dist/jquery.min.js: src/vendor/jquery
	cd src/vendor/jquery; make

src/vendor/jquery:
	git submodule update --init --recursive

dist/vendor/jquery-ui:
	mkdir -p dist/vendor/jquery-ui/js
	cp src/vendor/jquery-ui/development-bundle/GPL-LICENSE.txt dist/vendor/jquery-ui
	cp src/vendor/jquery-ui/development-bundle/MIT-LICENSE.txt dist/vendor/jquery-ui
	cp src/vendor/jquery-ui/js/jquery-ui-1.8.17.custom.min.js dist/vendor/jquery-ui/js/jquery-ui.custom.min.js
	cp -R src/vendor/jquery-ui/css dist/vendor/jquery-ui

dist/lab:
	mkdir -p dist/lab

dist/lab/lab.js: \
	dist/lab/lab.grapher.js \
	dist/lab/lab.molecules.js \
	dist/lab/lab.benchmark.js \
	dist/lab/lab.arrays.js \
	dist/lab/lab.layout.js \
	dist/lab/lab.components.js \
  dist/lab/lab.controllers.js \
  dist/lab/lab.mw-helpers.js

dist/lab/lab.grapher.js: \
	src/lab/start.js \
	src/lab/grapher/core/core.js \
	src/lab/grapher/core/data.js \
	src/lab/grapher/core/indexed-data.js \
	src/lab/grapher/core/graph.js \
	src/lab/grapher/core/real-time-graph.js \
	src/lab/grapher/core/colors.js \
	src/lab/grapher/core/register-keyboard-handler.js \
	src/lab/end.js

dist/lab/lab.md2d.js: \
	$(MD_ENGINE_JS_FILES)
	$(BROWSERIFY) src/md-engine/md2d.js -o dist/lab/lab.md2d.js

dist/lab/lab.molecules.js: \
	src/lab/start.js \
	dist/lab/lab.md2d.js \
	src/lab/molecules/modeler.js \
	src/lab/end.js

dist/lab/lab.benchmark.js: \
	src/lab/start.js \
	src/lab/benchmark/benchmark.js \
	src/lab/end.js

dist/lab/lab.arrays.js: \
	src/lab/start.js \
	src/lab/arrays/arrays.js \
	src/lab/end.js

dist/lab/lab.layout.js: \
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
	src/lab/layout/heat-cool-buttons.js \
	src/lab/end.js

dist/lab/lab.controllers.js: \
	src/lab/start.js \
	src/lab/controllers/controllers.js \
	src/lab/controllers/simple-model-controller.js \
	src/lab/controllers/complex-model-controller.js \
	src/lab/end.js

dist/lab/lab.components.js: src/lab/components/*.coffee
	cat $^ | $(COFFEESCRIPT_COMPILER) --stdio --print > $@
	@chmod ug+w $@

dist/lab/lab.mw-helpers.js: src/mw-helpers/*.coffee
	cat $^ | $(COFFEESCRIPT_COMPILER) --stdio --print > $@
	@chmod ug+w $@

test: test/layout.html \
	src/vendor/d3 \
	dist \
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

dist/%.html: src/%.html.haml Makefile
	haml $< $@

se:
	@echo $(SASS_EXAMPLE_FILES)

sd:
	@echo $(SASS_DOC_FILES)

sl:
	@echo $(SASS_LIBRARY_FILES)

dist/index.css:
	$(SASS_COMPILER) src/index.sass dist/index.css

dist/examples/%.css: %.sass Makefile
	$(SASS_COMPILER) $< $@

dist/doc/%.css: %.sass Makefile
	$(SASS_COMPILER) $< $@

dist/lab/%.css: %.sass Makefile
	$(SASS_COMPILER) $< $@

lab/%.css: %.sass Makefile
	$(SASS_COMPILER) $< $@

dist/%.css: %.scss Makefile
	$(SASS_COMPILER) $< $@

c:
	@echo $(COFFEESCRIPT_EXAMPLE_FILES)

dist/%.js: %.coffee Makefile
	@rm -f $@
	$(COFFEESCRIPT_COMPILER) --compile --print $< > $@

m:
	@echo $(MARKDOWN_EXAMPLE_FILES)

dist/%.html: %.md Makefile
	@rm -f $@
	$(MARKDOWN_COMPILER) $< --toc-levels 2..6 --template src/layouts/$*.html.erb > $@
