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
	public/lab/jars
	cp -R vendor/lab-sensor-applet-interface-dist/jars public/lab/jars/lab-sensor-applet-interface-dist

# ------------------------------------------------
#  public/lab/vendor
#  External frameworks are built from git submodules checked out into vendor/.
# ------------------------------------------------
public/lab/vendor: \
	public/lab/vendor/jquery/jquery.min.js \
	public/lab/vendor/jquery-ui/jquery-ui.min.js \
	public/lab/vendor/fonts \
	public/favicon.ico

public/lab/vendor/jquery/jquery.min.js: \
	public/lab/vendor/jquery
	cp vendor/jquery/dist/jquery.js public/lab/vendor/jquery
	cp vendor/jquery/dist/jquery.min.js public/lab/vendor/jquery
	cp vendor/jquery/dist/jquery.min.map public/lab/vendor/jquery
	cp vendor/jquery/LICENSE.txt public/lab/vendor/jquery

public/lab/vendor/jquery:
	mkdir -p public/lab/vendor/jquery

public/lab/vendor/jquery-ui/jquery-ui.min.js: \
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

public/lab/vendor/fonts: $(FONT_FOLDERS)
	mkdir -p public/lab/vendor/fonts
	cp -R vendor/fonts public/lab/vendor/
	rm -rf public/lab/vendor/fonts/Font-Awesome/.git*
	rm -f public/lab/vendor/fonts/Font-Awesome/.gitignore
	rm -rf public/lab/vendor/fonts/Font-Awesome/less
	rm -rf public/lab/vendor/fonts/Font-Awesome/sass

public/favicon.ico:
	cp -f src/favicon.ico public/favicon.ico

public/interactives/%.json: src/interactives/%.json
	@cp $< $@

public/models/%.json: src/models/%.json
	@cp $< $@
