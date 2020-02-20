# See the README for installation instructions.
FONT_FOLDERS := $(shell find vendor/fonts -mindepth 1 -maxdepth 1)
INTERACTIVE_FILES := $(shell find src/models src/interactives -name '*.json' -exec echo {} \; | sed s'/src\/\(.*\)/public\/\1/' )
vpath %.json src

.PHONY: src
src: \
	$(INTERACTIVE_FILES)

.PHONY: public
public: \
	copy-resources-to-public \
	public/lab \
	public/lab/jars/lab-sensor-applet-interface-dist \
	public/lab/vendor \
	src

# copy everything (including symbolic links) except files that are
# used to generate resources from src/ to public/
.PHONY: copy-resources-to-public
copy-resources-to-public:
	rsync -aq --exclude='helpers/' --exclude='modules/' --exclude='sass/' --exclude='vendor/' --exclude='lab/' --filter '+ */' --exclude='*.haml' --exclude='*.sass' --exclude='*.scss' --exclude='*.yaml' --exclude='*.rb' --exclude='*.md' src/ public/
	mkdir -p public/lab/resources
	rsync -aq src/lab/resources/ public/lab/resources/

public/lab:
	mkdir -p public/lab

public/lab/jars:
	mkdir -p public/lab/jars

public/lab/jars/lab-sensor-applet-interface-dist: \
	vendor/lab-sensor-applet-interface-dist \
	public/lab/jars
	cp -R vendor/lab-sensor-applet-interface-dist/jars public/lab/jars/lab-sensor-applet-interface-dist

# ------------------------------------------------
#  public/lab/vendor
#  External frameworks are built from git submodules checked out into vendor/.
# ------------------------------------------------
public/lab/vendor: \
	public/lab/vendor/jquery/jquery.min.js \
	public/lab/vendor/jquery-ui/jquery-ui.min.js \
	public/lab/vendor/jquery-ui-touch-punch/jquery.ui.touch-punch.min.js \
	public/lab/vendor/jquery-selectBoxIt/jquery.selectBoxIt.min.js \
	public/lab/vendor/tinysort/jquery.tinysort.js \
	public/lab/vendor/jquery-context-menu \
	public/lab/vendor/fonts \
	public/favicon.ico

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

public/interactives/%.json: src/interactives/%.json
	@cp $< $@

public/models/%.json: src/models/%.json
	@cp $< $@

