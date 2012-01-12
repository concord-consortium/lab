# See the README for installation instructions.

JS_COMPILER = ./node_modules/uglify-js/bin/uglifyjs
COFFEESCRIPT_COMPILER = ./node_modules/coffee-script/bin/coffee
JS_TESTER   = ./node_modules/vows/bin/vows --no-color
EXAMPLES_LIB_DIR = ./examples/lib

HAML_EXAMPLE_FILES := $(shell find src -name '*.haml' -exec echo {} \; | sed s'/src\/\(.*\)\.haml/\1/' )
vpath %.haml src

SASS_EXAMPLE_FILES := $(shell find src -name '*.sass' -exec echo {} \; | sed s'/src\/\(.*\)\.sass/\1.css/' )
vpath %.sass src

COFFEESCRIPT_EXAMPLE_FILES := $(shell find src -name '*.coffee' -exec echo {} \; | sed s'/src\/\(.*\)\.coffee/\1.js/' )
vpath %.coffee src

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
	$(COFFEESCRIPT_EXAMPLE_FILES)

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
	src/lab-module.js \
	lib/lab.grapher.js \
	lib/lab.molecules.js \
	lib/lab.benchmark.js \
	lib/lab.arrays.js \
	lib/lab.layout.js \
	lib/lab.graphx.js

lib/lab.grapher.js: \
	src/start.js \
	src/grapher/core/core.js \
	src/grapher/core/data.js \
	src/grapher/core/indexed-data.js \
	src/grapher/core/colors.js \
	src/grapher/samples/sample-graph.js \
	src/grapher/samples/simple-graph2.js \
	src/grapher/samples/cities-sample.js \
	src/grapher/samples/surface-temperature-sample.js \
	src/grapher/samples/lennard-jones-sample.js \
	src/end.js

lib/lab.molecules.js: \
	src/start.js \
	src/molecules/coulomb.js \
	src/molecules/lennard-jones.js \
	src/molecules/modeler.js \
	src/end.js

lib/lab.benchmark.js: \
	src/start.js \
	src/benchmark/benchmark.js \
	src/end.js

lib/lab.arrays.js: \
	src/start.js \
	src/arrays/arrays.js \
	src/end.js

lib/lab.layout.js: \
	src/start.js \
	src/layout/layout.js \
	src/layout/molecule-container.js \
	src/layout/potential-chart.js \
	src/layout/speed-distribution-histogram.js \
	src/layout/benchmarks.js \
	src/layout/datatable.js \
	src/layout/temperature-control.js \
	src/layout/force-interaction-controls.js \
	src/layout/display-stats.js \
	src/layout/fullscreen.js \
	src/end.js

lib/lab.graphx.js: \
	src/start.js \
	src/graphx/graphx.js \
	src/end.js

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
	sass --update src/examples:examples

c:
	@echo $(COFFEESCRIPT_EXAMPLE_FILES)

%.js: %.coffee Makefile
	@rm -f $@
	$(COFFEESCRIPT_COMPILER) --compile --print $< > $@
