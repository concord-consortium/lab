# See the README for installation instructions.

JS_COMPILER = ./node_modules/uglify-js/bin/uglifyjs
JS_TESTER   = ./node_modules/vows/bin/vows

all: \
	lib/d3 \
	grapher.js \
	grapher.min.js

# Modify this rule to build your own custom release.
# Run `make grapher.custom.min.js` to produce the minified version.

grapher.custom.js: \
	grapher.js

.INTERMEDIATE grapher.js: \
	src/grapher/start.js \
	grapher.core.js \
	src/grapher/end.js

lib/d3:
	mkdir -p lib/d3
	cp node_modules/d3/*.js lib/d3

grapher.core.js: \
	src/grapher/core/core.js \
	src/grapher/core/data.js \
	src/grapher/core/indexed-data.js \
	src/grapher/core/colors.js \
	src/grapher/samples/sample-graph.js \
	src/grapher/samples/simple-graph2.js \
	src/grapher/samples/cities-sample.js \
	src/grapher/samples/surface-temperature-sample.js \
	src/grapher/samples/lennard-jones-sample.js

test: all
	@$(JS_TESTER)

%.min.js: %.js Makefile
	@rm -f $@
	$(JS_COMPILER) < $< > $@

grapher.js grapher%.js: Makefile
	@rm -f $@
	cat $(filter %.js,$^) > $@
	@chmod a-w $@

clean:
	rm -f grapher*.js
