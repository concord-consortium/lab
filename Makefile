# See the README for installation instructions.

# Utilities
JS_COMPILER = ./node_modules/uglify-js/bin/uglifyjs - -c warnings=false -m
MARKDOWN_COMPILER = kramdown

# Turns out that just pointing Vows at a directory doesn't work, and its test matcher matches on
# the test's title, not its pathname. So we need to find everything in test/vows first.
VOWS = find test/vows -type f -name '*.js' -o -name '*.coffee' ! -name '.*' | xargs ./node_modules/.bin/vows --isolate --dot-matrix
MOCHA = find test/mocha -type f -name '*.js' -o -name '*.coffee' ! -name '.*' | xargs node_modules/.bin/mocha --reporter dot

SASS_COMPILER = sass -I src -I public
R_OPTIMIZER = ./node_modules/.bin/r.js -o

LAB_SRC_FILES := $(shell find src/lab -type f ! -name '.*' -print)
MD2D_SRC_FILES := $(shell find src/lab/models/md2d -type f ! -name '.*' -print)

GRAPHER_SRC_FILES := $(shell find src/lab/grapher -type f ! -name '.*' -print)
IMPORT_EXPORT_SRC_FILES := $(shell find src/lab/import-export -type f ! -name '.*' -print)
MML_CONVERTER_SRC_FILES := $(shell find src/lab/mml-converter -type f ! -name '.*' -print)

COMMON_SRC_FILES := $(shell find src/lab/common -type f ! -name '.*' -print)

# files generated by script during build process so cannot be listed using shell find.
COMMON_SRC_FILES += src/lab/lab.version.js

FONT_FOLDERS := $(shell find vendor/fonts -mindepth 1 -maxdepth 1)

SASS_LAB_LIBRARY_FILES := $(shell find src/sass/lab -name '*.sass')

# targets

INTERACTIVE_FILES := $(shell find src/models src/interactives -name '*.json' -exec echo {} \; | sed s'/src\/\(.*\)/public\/\1/' )
vpath %.json src

HAML_FILES := $(shell find src -name '*.haml' -exec echo {} \; | sed s'/src\/\(.*\)\.haml/public\/\1/' )
vpath %.haml src

SASS_FILES := $(shell find src -name '*.sass' -and -not -path "src/sass/*" -exec echo {} \; | sed s'/src\/\(.*\)\.sass/public\/\1.css/' )
SASS_FILES += $(shell find src -name '*.scss' -and -not -path "src/sass/*" -exec echo {} \; | sed s'/src\/\(.*\)\.scss/public\/\1.css/' )
vpath %.sass src
vpath %.scss src

LAB_JS_FILES = \
	public/lab/lab.js \
	public/lab/lab.grapher.js \
	public/lab/lab.mml-converter.js \
	public/lab/lab.import-export.js

# default target executed when running make. Run the $(MAKE) public task rather than simply
# declaring a dependency on 'public' because 'bundle install' and 'npm install' might update some
# sources, and we want to recompute stale dependencies after that.
.PHONY: all
all: \
	vendor/d3/d3.js \
	node_modules
	$(MAKE) public

# clean, make ...
.PHONY: everything
everything:
	$(MAKE) clean
	$(MAKE) all

.PHONY: src
src: \
	public/license.html \
	$(LAB_JS_FILES) \
	$(LAB_JS_FILES:.js=.min.js) \
	$(HAML_FILES) \
	$(SASS_FILES) \
	$(INTERACTIVE_FILES) \
	public/embeddable.html \
	public/lab/lab.json

.PHONY: clean
clean:
	bundle install
	mkdir -p public
	$(MAKE) clean-public
	rm -f src/lab/lab.version.js
	# Remove Node modules.
	rm -rf node_modules
	$(MAKE) prepare-submodules

# public dir cleanup.
.PHONY: clean-public
clean-public:
	bash -O extglob -c 'rm -rf public/!(.git|version|.|..)'

# versioned archives cleanup.
.PHONY: clean-archives
clean-archives:
	rm -rf version
	rm -rf public/version

.PHONY: prepare-submodules
prepare-submodules:
	-$(MAKE) submodule-update || $(MAKE) submodule-update-tags

# ------------------------------------------------
#
#   Testing
#
# ------------------------------------------------

.PHONY: test
test: test/layout.html \
    node_modules \
	public \
	$(LAB_JS_FILES) \
	$(JS_FILES:.js=.min.js)
	@echo
	@echo 'Mocha tests ...'
	@$(MOCHA)
	@echo 'Vows tests ...'
	@$(VOWS)
	@echo

# run vows test WITHOUT trying to build Lab JS first. Run 'make; make test-mocha' to build & test.
.PHONY: test-vows
test-vows:
	@echo 'Running Vows tests ...'
	@$(VOWS)

# run mocha test WITHOUT trying to build Lab JS first. Run 'make; make test-mocha' to build & test.
.PHONY: test-mocha
test-mocha:
	@echo 'Running Mocha tests ...'
	@$(MOCHA)

.PHONY: debug-mocha
debug-mocha:
	@echo 'Running Mocha tests in debug mode...'
	@$(MOCHA) --debug-brk

%.min.js: %.js
	@rm -f $@
ifndef LAB_DEVELOPMENT
	$(JS_COMPILER) < $< > $@
	@chmod ug+w $@
else
endif

.PHONY: public/test
public/test: public/embeddable-test-mocha.html
	mkdir -p public/test
	cp node_modules/mocha/mocha.js public/test
	cp node_modules/mocha/mocha.css public/test
	cp node_modules/chai/chai.js public/test
	cp test/test1.js public/test
	./node_modules/mocha-phantomjs/bin/mocha-phantomjs -R dot 'public/embeddable-test-mocha.html#interactives/samples/1-oil-and-water-shake.json'

# ------------------------------------------------
#
#   Submodules
#
# ------------------------------------------------

vendor/d3:
	submodule-update

.PHONY: submodule-update
submodule-update:
	git submodule update --init --recursive

.PHONY: submodule-update-tags
submodule-update-tags:
	git submodule sync
	git submodule foreach --recursive 'git fetch --tags'
	git submodule update --init --recursive

# ------------------------------------------------
#
#   Node modules
#
# ------------------------------------------------

node_modules:
	yarn || npm install

# ------------------------------------------------
#
#   public/
#
# ------------------------------------------------
.PHONY: public
public: \
	copy-resources-to-public \
	public/lab \
	public/lab/jars/lab-sensor-applet-interface-dist \
	public/lab/vendor \
	bundled-licenses \
	src
	rm -f public/lab.tar.gz
	tar czf public/lab.tar.gz -C public lab

# copy everything (including symbolic links) except files that are
# used to generate resources from src/ to public/
.PHONY: copy-resources-to-public
copy-resources-to-public:
	rsync -aq --exclude='helpers/' --exclude='layouts/' --exclude='modules/' --exclude='sass/' --exclude='vendor/' --exclude='lab/' --filter '+ */' --exclude='*.haml' --exclude='*.sass' --exclude='*.scss' --exclude='*.yaml' --exclude='*.coffee' --exclude='*.rb' --exclude='*.md' src/ public/
	mkdir -p public/lab/resources
	rsync -aq src/lab/resources/ public/lab/resources/

# ------------------------------------------------
#
#   public/lab
#
#   Generates the Lab Framework JavaScript resources
#
# ------------------------------------------------

public/lab:
	mkdir -p public/lab

public/lab/lab.json: \
	src/lab/common/controllers/interactive-metadata.js \
	src/lab/models/energy2d/metadata.js \
	src/lab/models/md2d/models/metadata.js \
	src/lab/models/sensor/metadata.js \
	src/lab/models/signal-generator/metadata.js \
	src/lab/models/iframe/metadata.js
	node src/helpers/lab.json.js

public/lab/lab.js: \
	$(LAB_SRC_FILES) \
	src/lab/lab.version.js
	$(R_OPTIMIZER) src/lab/lab.build.js logLevel=2

src/lab/lab.version.js: \
	script/generate-js-version.rb \
	.git/HEAD \
	.git/refs/*
	./script/generate-js-version.rb

public/lab/lab.grapher.js: \
	$(GRAPHER_SRC_FILES) \
	$(COMMON_SRC_FILES)
	$(R_OPTIMIZER) src/lab/grapher/grapher.build.js logLevel=2

public/lab/lab.import-export.js: \
	$(IMPORT_EXPORT_SRC_FILES) \
	$(COMMON_SRC_FILES)
	$(R_OPTIMIZER) src/lab/import-export/import-export.build.js logLevel=2

public/lab/lab.mml-converter.js: \
	$(MML_CONVERTER_SRC_FILES) \
	$(LAB_SRC_FILES) \
	$(COMMON_SRC_FILES)
	$(R_OPTIMIZER) src/lab/mml-converter/mml-converter.build.js logLevel=2

public/lab/jars:
	mkdir -p public/lab/jars

public/lab/jars/lab-sensor-applet-interface-dist: \
	vendor/lab-sensor-applet-interface-dist \
	public/lab/jars
	cp -R vendor/lab-sensor-applet-interface-dist/jars public/lab/jars/lab-sensor-applet-interface-dist

# ------------------------------------------------
#
#   public/lab/vendor
#
# External frameworks are built from git submodules checked out into vendor/.
# Just the generated libraries and licenses are copied to public/lab/vendor
#
# ------------------------------------------------

public/lab/vendor: \
	public/lab/vendor/d3 \
	public/lab/vendor/jquery/jquery.min.js \
	public/lab/vendor/jquery-ui/jquery-ui.min.js \
	public/lab/vendor/jquery-ui-touch-punch/jquery.ui.touch-punch.min.js \
	public/lab/vendor/jquery-selectBoxIt/jquery.selectBoxIt.min.js \
	public/lab/vendor/tinysort/jquery.tinysort.js \
	public/lab/vendor/jquery-context-menu \
	public/lab/vendor/fonts \
	public/favicon.ico

public/lab/vendor/d3: vendor/d3
	mkdir -p public/lab/vendor/d3
	cp vendor/d3/d3*.js public/lab/vendor/d3
	cp vendor/d3/LICENSE public/lab/vendor/d3/LICENSE
	cp vendor/d3/README.md public/lab/vendor/d3/README.md

public/lab/vendor/jquery-ui-touch-punch/jquery.ui.touch-punch.min.js: \
	public/lab/vendor/jquery-ui-touch-punch \
	vendor/jquery-ui-touch-punch/jquery.ui.touch-punch.min.js \
	vendor/jquery-ui-touch-punch/jquery.ui.touch-punch.js
	cp vendor/jquery-ui-touch-punch/jquery.ui.touch-punch.min.js public/lab/vendor/jquery-ui-touch-punch
	cp vendor/jquery-ui-touch-punch/jquery.ui.touch-punch.js public/lab/vendor/jquery-ui-touch-punch

public/lab/vendor/jquery-ui-touch-punch:
	mkdir -p public/lab/vendor/jquery-ui-touch-punch

public/lab/vendor/jquery-selectBoxIt/jquery.selectBoxIt.min.js: \
	vendor/jquery-selectBoxIt/src/javascripts/jquery.selectBoxIt.js \
	vendor/jquery-selectBoxIt/src/javascripts/jquery.selectBoxIt.min.js \
	vendor/jquery-selectBoxIt/src/stylesheets/jquery.selectBoxIt.css \
	public/lab/vendor/jquery-selectBoxIt
	cp vendor/jquery-selectBoxIt/src/javascripts/jquery.selectBoxIt.js public/lab/vendor/jquery-selectBoxIt
	cp vendor/jquery-selectBoxIt/src/javascripts/jquery.selectBoxIt.min.js public/lab/vendor/jquery-selectBoxIt
	cp vendor/jquery-selectBoxIt/src/stylesheets/jquery.selectBoxIt.css public/lab/vendor/jquery-selectBoxIt

public/lab/vendor/jquery-selectBoxIt:
	mkdir -p public/lab/vendor/jquery-selectBoxIt

public/lab/vendor/jquery-context-menu:
	mkdir -p public/lab/vendor/jquery-context-menu
	cp vendor/jquery-context-menu/src/jquery.contextMenu.js public/lab/vendor/jquery-context-menu
	cp vendor/jquery-context-menu/src/jquery.contextMenu.css public/lab/vendor/jquery-context-menu

public/lab/vendor/jquery/jquery.min.js: \
	vendor/jquery \
	public/lab/vendor/jquery
	cp vendor/jquery/dist/jquery.js public/lab/vendor/jquery
	cp vendor/jquery/dist/jquery.min.js public/lab/vendor/jquery
	cp vendor/jquery/dist/jquery.min.map public/lab/vendor/jquery
	cp vendor/jquery/LICENSE.txt public/lab/vendor/jquery

public/lab/vendor/jquery:
	mkdir -p public/lab/vendor/jquery

public/lab/vendor/jquery-ui/jquery-ui.min.js: \
	vendor/components-jqueryui \
	public/lab/vendor/jquery-ui
	cp vendor/components-jqueryui/MIT-LICENSE.txt public/lab/vendor/jquery-ui
	mkdir -p public/lab/vendor/jquery-ui/i18n
	cp vendor/components-jqueryui/ui/jquery-ui.js public/lab/vendor/jquery-ui
	cp vendor/components-jqueryui/ui/i18n/jquery-ui-i18n.js public/lab/vendor/jquery-ui/i18n
	cp vendor/components-jqueryui/ui/minified/jquery-ui.min.js public/lab/vendor/jquery-ui
	cp vendor/components-jqueryui/ui/minified/i18n/jquery-ui-i18n.min.js public/lab/vendor/jquery-ui/i18n
	cp vendor/components-jqueryui/themes/base/jquery-ui.css public/lab/vendor/jquery-ui
	cp vendor/components-jqueryui/themes/base/minified/jquery-ui.min.css public/lab/vendor/jquery-ui
	cp -r vendor/components-jqueryui/themes/base/images public/lab/vendor/jquery-ui

public/lab/vendor/jquery-ui:
	mkdir -p public/lab/vendor/jquery-ui

public/lab/vendor/tinysort:
	mkdir -p public/lab/vendor/tinysort

public/lab/vendor/tinysort/jquery.tinysort.js: \
	public/lab/vendor/tinysort
	cp -r vendor/tinysort/src/* public/lab/vendor/tinysort
	cp vendor/tinysort/README.md public/lab/vendor/tinysort

public/lab/vendor/sizzle:
	mkdir -p public/lab/vendor/sizzle
	cp vendor/sizzle/sizzle.js public/lab/vendor/sizzle
	cp vendor/sizzle/LICENSE public/lab/vendor/sizzle
	cp vendor/sizzle/README public/lab/vendor/sizzle

public/lab/vendor/fonts: $(FONT_FOLDERS)
	mkdir -p public/lab/vendor/fonts
	cp -R vendor/fonts public/lab/vendor/
	rm -rf public/lab/vendor/fonts/Font-Awesome/.git*
	rm -f public/lab/vendor/fonts/Font-Awesome/.gitignore
	rm -rf public/lab/vendor/fonts/Font-Awesome/less
	rm -rf public/lab/vendor/fonts/Font-Awesome/sass

public/favicon.ico:
	cp -f src/favicon.ico public/favicon.ico

vendor/jquery:
	git submodule update

vendor/components-jqueryui:
	git submodule update

vendor/lab-sensor-applet-interface-dist:
	git submodule update --init --recursive

vendor/sensor-labquest-2-interface/dist/sensor-labquest-2-interface.js:
	git submodule update --init --recursive

vendor/sensor-connector-interface/dist/sensor-connector-interface.js:
	git submodule update --init --recursive

#--------
#
#  copy bundled licenses
#
#--------

public/lab/vendor/bundled-licenses:
	mkdir -p public/lab/vendor/bundled-licenses

.PHONY: bundled-licenses
bundled-licenses: \
	public/lab/vendor/bundled-licenses \
	public/lab/vendor/bundled-licenses/underscore \
	public/lab/vendor/bundled-licenses/text \
	public/lab/vendor/bundled-licenses/seedrandom.js \
	public/lab/vendor/bundled-licenses/lab-grapher \
	public/lab/vendor/bundled-licenses/iframe-phone \
	public/lab/vendor/bundled-licenses/fastclick \
	public/lab/vendor/bundled-licenses/coffee-script \
	public/lab/vendor/bundled-licenses/canvg-1.3 \
	public/lab/vendor/bundled-licenses/almond \
	public/lab/vendor/bundled-licenses/sensor-connector-interface \
	public/lab/vendor/bundled-licenses/sensor-labquest-2-interface \
	public/lab/vendor/bundled-licenses/lab-sensor-applet-interface-dist \
	public/lab/vendor/bundled-licenses/browserified-cheerio \
	public/lab/vendor/bundled-licenses/i18next

public/lab/vendor/bundled-licenses/%: vendor/%/license
	cp $< $@

public/lab/vendor/bundled-licenses/%: vendor/%/LICENSE
	cp $< $@

public/lab/vendor/bundled-licenses/%: vendor/%/LICENSE.txt
	cp $< $@

public/lab/vendor/bundled-licenses/%: vendor/%/MIT-LICENSE.txt
	cp $< $@

# seedrandom doesn't have a separate license file
public/lab/vendor/bundled-licenses/seedrandom.js: vendor/seedrandom/seedrandom.js
	cp $< $@

# ------------------------------------------------
#
#   targets for generating html, js, and css resources
#
# ------------------------------------------------

test/%.html: test/%.html.haml
	haml $< $@

public/%.html: src/%.html.haml script/setup.rb
	haml -r ./script/setup.rb -r ./src/helpers/font-cdn.rb $< $@

public/%.html: src/%.html
	cp $< $@

public/%.css: src/%.css
	cp $< $@

public/grapher.css: src/grapher.sass \
	src/sass/lab/_colors.sass \
	src/sass/lab/_bar_graph.sass \
	src/sass/lab/_graphs.sass \
	public/lab-grapher.scss
	$(SASS_COMPILER) src/grapher.sass public/grapher.css

public/%.css: %.scss
	$(SASS_COMPILER) $< $@

.INTERMEDIATE: public/lab-grapher.scss
public/lab-grapher.scss: vendor/lab-grapher/css/lab-grapher.css
	cp vendor/lab-grapher/css/lab-grapher.css public/lab-grapher.scss

public/%.css: %.sass $(SASS_LAB_LIBRARY_FILES) \
	public/lab-grapher.scss
	$(SASS_COMPILER) $< $@

public/%.html: %.md
	@rm -f $@
	$(MARKDOWN_COMPILER) $< --template src/layouts/kramdown.html.erb > $@

public/interactives/%.json: src/interactives/%.json
	@cp $< $@

public/models/%.json: src/models/%.json
	@cp $< $@

# delete the .md.static files and don't bother creating them if they don't need to be
.INTERMEDIATE: %.md.static

# ------------------------------------------------
#
#   Targets to help debugging/development of Makefile
#
# ------------------------------------------------

.PHONY: h
h:
	@echo $(HAML_FILES)

.PHONY: s
s:
	@echo $(SASS_FILES)

.PHONY: s1
sl:
	@echo $(SASS_LAB_LIBRARY_FILES)

.PHONY: cm
cm:
	@echo $(COMMON_SRC_FILES)

.PHONY: md2
md2:
	@echo $(MD2D_SRC_FILES)

.PHONY: gr
gr:
	@echo $(GRAPHER_SRC_FILES)

.PHONY: int
int:
	@echo $(INTERACTIVE_FILES)

.PHONY: sources
sources:
	@echo $(LAB_SRC_FILES)
