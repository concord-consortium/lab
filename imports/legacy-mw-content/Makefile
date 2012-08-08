# directories
PROJECT_ROOT = ../..
LEGACY_MW_CONTENT_DIR = $(PROJECT_ROOT)/server/public/imports/legacy-mw-content
CONVERTED_DIR = $(LEGACY_MW_CONTENT_DIR)/converted

# commands
CONVERT_MML = $(PROJECT_ROOT)/node-bin/convert-mml.coffee
CREATE_MML_HTML_INDEX = $(PROJECT_ROOT)/node-bin/create-mml-html-index
CREATE_MML_JS_INDEX = src/mw-helpers/post-batch-processor.rb
COFFEE = $(PROJECT_ROOT)/node_modules/.bin/coffee

# targets and sources
MML_FILES := $(shell find . -name '*.mml' -print)
CML_FILES := $(shell find . -name '*.cml' -print)
CONVERTED_FILES := $(shell echo '$(MML_FILES)' | perl -pe 's|\./(.*?)\.mml|\1.json|g')

# We keep the list of converted files clean, with no path prefix, so '%.json'->'%.mml' type
# substitutions work correctly when we treat the converted files as targets.
# However, when we treat them as dependencies for targets like 'all', we need make to acknowledge
# that they're actually to be found in the $(CONVERTED_DIR) directory. So use vpath.
vpath %.json $(CONVERTED_DIR)

.PHONY: all
all: $(LEGACY_MW_CONTENT_DIR)/model-list.js \
	$(LEGACY_MW_CONTENT_DIR)/legacyMMLRunnables.html \
	$(CONVERTED_FILES)

$(LEGACY_MW_CONTENT_DIR)/model-list.js: $(CONVERTED_FILES) \
	$(PROJECT_ROOT)/$(CREATE_MML_JS_INDEX)
	cd $(PROJECT_ROOT) && $(CREATE_MML_JS_INDEX)

$(LEGACY_MW_CONTENT_DIR)/legacyMMLRunnables.html: $(CONVERTED_FILES) \
	$(CML_FILES) \
	$(CREATE_MML_HTML_INDEX)
	$(CREATE_MML_HTML_INDEX)

# depend on the MML converter implementation too! (but not on the convert command itself)
$(CONVERTED_FILES): %.json : %.mml \
	$(PROJECT_ROOT)/src/mw-helpers/mml-parser.coffee
	mkdir -p `dirname $(CONVERTED_DIR)/'$*'`
	$(COFFEE) $(CONVERT_MML) '$<' $(CONVERTED_DIR)/'$@'

.PHONY: targets
targets:
	@echo '$(CONVERTED_FILES)'

.PHONY: sources
sources:
	@echo '$(MML_FILES)'
