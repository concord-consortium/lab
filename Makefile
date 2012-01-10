# See the README for installation instructions.

JS_COMPILER = ./node_modules/uglify-js/bin/uglifyjs
JS_TESTER   = ./node_modules/vows/bin/vows
EXAMPLES_LIB_DIR = ./examples/lib

JS_FILES = \
	lab.grapher.js \
	lab.graphx.js \
	lab.benchmark.js \
	lab.layout.js \
	lab.arrays.js \
	lab.molecules.js \
	lab.js

all: \
	lib \
	vendor/d3 \
	examples \
	$(JS_FILES) \
	$(JS_FILES:.js=.min.js) \

clean:
	rm -f lab.*.js
	rm -rf examples

lib:
	mkdir lib

vendor/d3:
	mkdir -p vendor/d3
	cp node_modules/d3/*.js vendor/d3

examples:
	mkdir -p examples/lib
	mkdir -p examples/vendor
	cp -r lib examples
	cp -r vendor examples
	cp -r resources examples

lab.js: \
	src/lab-module.js \
	lib/lab.grapher.js \
	lib/lab.molecules.js \
	lib/lab.benchmark.js \
	lib/lab.arrays.js \
	lib/lab.layout.js \
	lib/lab.graphx.js

lab.grapher.js: \
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

lab.molecules.js: \
	src/start.js \
	src/molecules/coulomb.js \
	src/molecules/lennard-jones.js \
	src/molecules/modeler.js \
	src/end.js

lab.benchmark.js: \
	src/start.js \
	src/benchmark/benchmark.js \
	src/end.js

lab.arrays.js: \
	src/start.js \
	src/arrays/arrays.js \
	src/end.js

lab.layout.js: \
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

lab.graphx.js: \
	src/start.js \
	src/graphx/graphx.js \
	src/end.js

test: all
	@$(JS_TESTER)

%.min.js: %.js Makefile
	@rm -f lib/$@
	$(JS_COMPILER) < lib/$< > lib/$@
	@chmod ug+w lib/$@
	@cp lib/$@ $(EXAMPLES_LIB_DIR)

lab.%: Makefile
	@rm -f lib/$@
	cat $(filter %.js,$^) > lib/$@
	@chmod ug+w lib/$@
	cp lib/$@ $(EXAMPLES_LIB_DIR)

# HAML_INPUT_FILES = find src *.haml
# HAML_OUTPUT_FILES = $(HAML_INPUT_FILES,src/=) 

# haml:
# 	haml src/examples/index.html.haml examples/index.html.haml
# 	for f in $( ls $wdir/*.erb ); do
# 	  out="${f%.erb}.haml"
# 	  if [ -e $out ]; then
# 	    echo "skipping $out; already exists"
# 	  else
# 	    echo "hamlifying $f"
# 	    html2haml $f > $out
# 	  fi
# 	done