# See the README for installation instructions.

JS_COMPILER = ./node_modules/uglify-js/bin/uglifyjs
COFFEESCRIPT_COMPILER = ./node_modules/coffee-script/bin/coffee
MARKDOWN_COMPILER = bin/kramdown
JS_TESTER   = ./node_modules/vows/bin/vows --no-color
EXAMPLES_LAB_DIR = ./examples/lab
SASS_COMPILER = bin/sass -I src -r ./src/sass/bourbon/lib/bourbon.rb

HAML_EXAMPLE_FILES := $(shell find src -name '*.haml' -exec echo {} \; | sed s'/src\/\(.*\)\.haml/dist\/\1/' )
vpath %.haml src

SASS_EXAMPLE_FILES := $(shell find src/examples -name '*.sass' -exec echo {} \; | sed s'/src\/\(.*\)\.sass/dist\/\1.css/' )
vpath %.sass src/examples

SASS_LIBRARY_FILES := $(shell find src/lab -name '*.sass' -exec echo {} \; | sed s'/src\/.*\/\(.*\)\.sass/dist\/lab\/css\/\1.css/' )
vpath %.sass src/lab

SCSS_EXAMPLE_FILES := $(shell find src -name '*.scss' -exec echo {} \; | grep -v bourbon | sed s'/src\/\(.*\)\.scss/dist\/\1.css/' )
vpath %.scss src

COFFEESCRIPT_EXAMPLE_FILES := $(shell find src/examples -name '*.coffee' -exec echo {} \; | sed s'/src\/\(.*\)\.coffee/dist\/\1.js/' )
vpath %.coffee src

MARKDOWN_EXAMPLE_FILES := $(shell find src -name '*.md' -exec echo {} \; | sed s'/src\/\(.*\)\.md/dist\/\1.html/' )
vpath %.md src

MD_ENGINE_JS_FILES := $(shell find src/md-engine -name '*.js' -print)
BROWSERIFY = ./node_modules/.bin/browserify

LAB_JS_FILES = \
	lab/lab.grapher.js \
	lab/lab.graphx.js \
	lab/lab.benchmark.js \
	lab/lab.layout.js \
	lab/lab.arrays.js \
	lab/lab.molecules.js \
	lab/lab.components.js \
	lab/lab.js

all: \
	vendor/d3 \
	node_modules \
	bin \
	md-engine \
	lab \
	dist \
	$(MARKDOWN_EXAMPLE_FILES) \
	$(LAB_JS_FILES) \
	$(LAB_JS_FILES:.js=.min.js) \
	$(HAML_EXAMPLE_FILES) \
	$(SASS_EXAMPLE_FILES) \
	$(SCSS_EXAMPLE_FILES) \
	$(SASS_LIBRARY_FILES) \
	$(COFFEESCRIPT_EXAMPLE_FILES) \
	dist/index.css

clean:
	rm -rf dist
	rm -rf lab
	rm -rf md-engine
	rm -rf node_modules
	git submodule update --init --recursive
	rm -f vendor/jquery/dist/jquery.min.js

vendor/d3:
	git submodule update --init --recursive

node_modules: node_modules/coffee-script \
	node_modules/jsdom \
	node_modules/uglify-js	\
	node_modules/vows \
	node_modules/node-inspector \
	node_modules/d3 \
	node_modules/science.js \
	node_modules/browserify
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
	npm install vendor/d3

node_modules/science.js:
	npm install vendor/science.js

node_modules/browserify:
	npm install

bin:
	bundle install --binstubs

dist: \
	dist/vendor \
	dist/resources \
	dist/examples \
	dist/tests
	mkdir -p dist/lab/css

dist/examples:
	mkdir -p dist/examples
	# copy directories, javascript, json, and image resources from src/examples/
	rsync -avq --filter '+ */' --include='*.js' --include='*.json' --include='*.gif' --include='*.png' --include='*.jpg'  --filter 'hide,! */' src/examples/ dist/examples/

dist/tests:
	cp -R src/tests dist

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
	cp vendor/d3/d3*.js dist/vendor/d3
	cp vendor/d3/LICENSE dist/vendor/d3/LICENSE
	cp vendor/d3/README.md dist/vendor/d3/README.md

dist/vendor/jquery: vendor/jquery/dist/jquery.min.js
	mkdir -p dist/vendor/jquery
	cp vendor/jquery/dist/jquery.min.js dist/vendor/jquery/jquery.min.js
	cp vendor/jquery/MIT-LICENSE.txt dist/vendor/jquery
	cp vendor/jquery/README.md dist/vendor/jquery

dist/vendor/science.js:
	mkdir -p dist/vendor/science.js
	cp vendor/science.js/science*.js dist/vendor/science.js
	cp vendor/science.js/LICENSE dist/vendor/science.js
	cp vendor/science.js/README.md dist/vendor/science.js

dist/vendor/modernizr:
	mkdir -p dist/vendor/modernizr
	cp vendor/modernizr/modernizr.js dist/vendor/modernizr
	cp vendor/modernizr/readme.md dist/vendor/modernizr

dist/vendor/sizzle:
	mkdir -p dist/vendor/sizzle
	cp vendor/sizzle/sizzle.js dist/vendor/sizzle
	cp vendor/sizzle/LICENSE dist/vendor/sizzle
	cp vendor/sizzle/README dist/vendor/sizzle

dist/vendor/hijs:
	mkdir -p dist/vendor/hijs
	cp vendor/hijs/hijs.js dist/vendor/hijs
	cp vendor/hijs/LICENSE dist/vendor/hijs
	cp vendor/hijs/README.md dist/vendor/hijs

dist/vendor/mathjax:
	mkdir -p dist/vendor/mathjax
	cp vendor/mathjax/MathJax.js dist/vendor/mathjax
	cp vendor/mathjax/LICENSE dist/vendor/mathjax
	cp vendor/mathjax/README.md dist/vendor/mathjax
	cp -R vendor/mathjax/jax dist/vendor/mathjax
	cp -R vendor/mathjax/extensions dist/vendor/mathjax
	cp -R vendor/mathjax/images dist/vendor/mathjax
	cp -R vendor/mathjax/fonts dist/vendor/mathjax
	cp -R vendor/mathjax/config dist/vendor/mathjax

dist/vendor/fonts:
	mkdir -p dist/vendor/fonts
	cp -R vendor/fonts dist/vendor/

vendor/jquery/dist/jquery.min.js: vendor/jquery
	cd vendor/jquery; make

vendor/jquery:
	git submodule update --init --recursive

dist/vendor/jquery-ui:
	mkdir -p dist/vendor/jquery-ui/js
	cp vendor/jquery-ui/development-bundle/GPL-LICENSE.txt dist/vendor/jquery-ui
	cp vendor/jquery-ui/development-bundle/MIT-LICENSE.txt dist/vendor/jquery-ui
	cp vendor/jquery-ui/js/jquery-ui-1.8.17.custom.min.js dist/vendor/jquery-ui/js/jquery-ui.custom.min.js
	cp -R vendor/jquery-ui/css dist/vendor/jquery-ui

md-engine:
	mkdir -p md-engine

md-engine/md2d.js: $(MD_ENGINE_JS_FILES)
	$(BROWSERIFY) src/md-engine/md2d.js -o md-engine/md2d.js

lab:
	mkdir -p lab

lab/lab.js: \
	lab/lab.grapher.js \
	lab/lab.molecules.js \
	lab/lab.benchmark.js \
	lab/lab.arrays.js \
	lab/lab.layout.js \
	lab/lab.graphx.js \
	lab/lab.components.js

lab/lab.grapher.js: \
	src/lab/start.js \
	src/lab/grapher/core/core.js \
	src/lab/grapher/core/data.js \
	src/lab/grapher/core/indexed-data.js \
	src/lab/grapher/core/colors.js \
	src/lab/grapher/samples/sample-graph.js \
	src/lab/grapher/samples/simple-graph2.js \
	src/lab/grapher/samples/cities-sample.js \
	src/lab/grapher/samples/surface-temperature-sample.js \
	src/lab/grapher/samples/lennard-jones-sample.js \
	src/lab/end.js

lab/lab.molecules.js: \
	md-engine/md2d.js \
	src/lab/start.js \
	src/lab/molecules/coulomb.js \
	src/lab/molecules/lennard-jones.js \
	src/lab/molecules/modeler.js \
	src/lab/end.js

lab/lab.benchmark.js: \
	src/lab/start.js \
	src/lab/benchmark/benchmark.js \
	src/lab/end.js

lab/lab.arrays.js: \
	src/lab/start.js \
	src/lab/arrays/arrays.js \
	src/lab/end.js

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

lab/lab.graphx.js: \
	src/lab/start.js \
	src/lab/graphx/graphx.js \
	src/lab/end.js

lab/lab.components.js: src/lab/components/*.coffee
	cat $^ | $(COFFEESCRIPT_COMPILER) --stdio --print > $@
	@chmod ug+w $@
	@cp $@ dist/lab

test: test/layout.html \
	vendor/d3 \
	dist \
	$(LAB_JS_FILES) \
	$(JS_FILES:.js=.min.js)
	@$(JS_TESTER)

%.min.js: %.js Makefile
	@rm -f $@
	$(JS_COMPILER) < $< > $@
	@chmod ug+w $@
	@cp $@ dist/lab

lab.%: Makefile
	@rm -f $@
	cat $(filter %.js,$^) > $@
	@chmod ug+w $@
	cp $@ dist/lab

test/%.html: test/%.html.haml
	haml $< $@

h:
	@echo $(HAML_EXAMPLE_FILES)

dist/%.html: src/%.html.haml Makefile
	haml $< $@

s:
	@echo $(SASS_EXAMPLE_FILES)

sl:
	@echo $(SASS_LIBRARY_FILES)

dist/index.css:
	$(SASS_COMPILER) src/index.sass dist/index.css

dist/examples/%.css: %.sass Makefile
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
