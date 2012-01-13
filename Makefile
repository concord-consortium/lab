# See the README for installation instructions.

JS_COMPILER = ./node_modules/uglify-js/bin/uglifyjs
COFFEESCRIPT_COMPILER = ./node_modules/coffee-script/bin/coffee
MARKDOWN_COMPILER = bin/kramdown
JS_TESTER   = ./node_modules/vows/bin/vows --no-color
EXAMPLES_LIB_DIR = ./examples/lib

HAML_EXAMPLE_FILES := $(shell find src -name '*.haml' -exec echo {} \; | sed s'/src\/\(.*\)\.haml/\1/' )
vpath %.haml src

SASS_EXAMPLE_FILES := $(shell find src -name '*.sass' -exec echo {} \; | sed s'/src\/\(.*\)\.sass/\1.css/' )
vpath %.sass src

SCSS_EXAMPLE_FILES := $(shell find src -name '*.scss' -exec echo {} \; | sed s'/src\/\(.*\)\.scss/\1.css/' )
vpath %.scss src

COFFEESCRIPT_EXAMPLE_FILES := $(shell find src -name '*.coffee' -exec echo {} \; | sed s'/src\/\(.*\)\.coffee/\1.js/' )
vpath %.coffee src

MARKDOWN_EXAMPLE_FILES := $(shell find src -name '*.md' -exec echo {} \; | sed s'/src\/\(.*\)\.md/\1.html/' )
vpath %.md src

LAB_JS_FILES = \
	lib/lab.grapher.js \
	lib/lab.graphx.js \
	lib/lab.benchmark.js \
	lib/lab.layout.js \
	lib/lab.arrays.js \
	lib/lab.molecules.js \
	lib/lab.js

all: \
	vendor/d3 \
	examples \
	$(LAB_JS_FILES) \
	$(LAB_JS_FILES:.js=.min.js) \
	$(HAML_EXAMPLE_FILES) \
	$(SASS_EXAMPLE_FILES) \
	$(SCSS_EXAMPLE_FILES) \
	$(COFFEESCRIPT_EXAMPLE_FILES) \
	$(MARKDOWN_EXAMPLE_FILES)

clean:
	rm -rf examples
	rm -f lib/*.js

vendor/d3:
	mkdir -p vendor/d3
	cp node_modules/d3/*.js vendor/d3

examples:
	mkdir -p examples/lib
	mkdir -p examples/vendor
	cp -r lib examples
	cp -r vendor examples
	cp -r resources examples
	rsync -avmq --include='*.js' --include='*.json' --include='*.gif' --include='*.png' --include='*.jpg' --filter 'hide,! */' src/examples/ examples/


lib/lab.js: \
	src/lib/lab-module.js \
	lib/lab.grapher.js \
	lib/lab.molecules.js \
	lib/lab.benchmark.js \
	lib/lab.arrays.js \
	lib/lab.layout.js \
	lib/lab.graphx.js

lib/lab.grapher.js: \
	src/lib/start.js \
	src/lib/grapher/core/core.js \
	src/lib/grapher/core/data.js \
	src/lib/grapher/core/indexed-data.js \
	src/lib/grapher/core/colors.js \
	src/lib/grapher/samples/sample-graph.js \
	src/lib/grapher/samples/simple-graph2.js \
	src/lib/grapher/samples/cities-sample.js \
	src/lib/grapher/samples/surface-temperature-sample.js \
	src/lib/grapher/samples/lennard-jones-sample.js \
	src/lib/end.js

lib/lab.molecules.js: \
	src/lib/start.js \
	src/lib/molecules/coulomb.js \
	src/lib/molecules/lennard-jones.js \
	src/lib/molecules/modeler.js \
	src/lib/end.js

lib/lab.benchmark.js: \
	src/lib/start.js \
	src/lib/benchmark/benchmark.js \
	src/lib/end.js

lib/lab.arrays.js: \
	src/lib/start.js \
	src/lib/arrays/arrays.js \
	src/lib/end.js

lib/lab.layout.js: \
	src/lib/start.js \
	src/lib/layout/layout.js \
	src/lib/layout/molecule-container.js \
	src/lib/layout/potential-chart.js \
	src/lib/layout/speed-distribution-histogram.js \
	src/lib/layout/benchmarks.js \
	src/lib/layout/datatable.js \
	src/lib/layout/temperature-control.js \
	src/lib/layout/force-interaction-controls.js \
	src/lib/layout/display-stats.js \
	src/lib/layout/fullscreen.js \
	src/lib/end.js

lib/lab.graphx.js: \
	src/lib/start.js \
	src/lib/graphx/graphx.js \
	src/lib/end.js

test: test/layout.html \
	vendor/d3 \
	examples\
	$(JS_FILES) \
	$(JS_FILES:.js=.min.js)
	@$(JS_TESTER)

%.min.js: %.js Makefile
	@rm -f $@
	$(JS_COMPILER) < $< > $@
	@chmod ug+w $@
	@cp $@ $(EXAMPLES_LIB_DIR)

lab.%: Makefile
	@rm -f $@
	cat $(filter %.js,$^) > $@
	@chmod ug+w $@
	cp $@ $(EXAMPLES_LIB_DIR)

test/%.html:

examples/%.html:

h:
	@echo $(HAML_EXAMPLE_FILES)

%.html: %.html.haml Makefile
	haml $< $@

s:
	@echo $(SASS_EXAMPLE_FILES)

%.css: %.sass Makefile
	sass $< $@

%.css: %.scss Makefile
	sass $< $@

c:
	@echo $(COFFEESCRIPT_EXAMPLE_FILES)

%.js: %.coffee Makefile
	@rm -f $@
	$(COFFEESCRIPT_COMPILER) --compile --print $< > $@
m:
	@echo $(MARKDOWN_EXAMPLE_FILES)

%.html: %.md Makefile
	@rm -f $@
	$(MARKDOWN_COMPILER) $< --template src/layouts/layout.html.erb > $@
