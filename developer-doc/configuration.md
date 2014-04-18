# Project Configuration

There are 2 forms of configuring the Lab framework.

- **run time configuration** by the page including lab.js or lab.min.js
- **build time configuration** by modifying environment variables before building

## Run Time Configuration

Configuration variables used by the runtime JavaScript code are available in the JavaScript global
object `Lab.config`.

Page that embeds Lab interactive should overwrite these configuration values
before creating an instance of Lab.InteractivesController, e.g.:

    Lab.config.rootUrl = "//some.website.com/lab";
    controller = new Lab.InteractivesController(...)

**`rootUrl`** A path that should point to the Lab distribution (content of public/lab folder).
It's necessary to find resources (e.g. images) and Java JAR files (used by sensor model type).
The default value for this is `lab` what assumes that Lab is hosted on the same server as
embedding page in the `lab` directory.

**`sharing`** A boolean attribute used to determine if the **Share** link in the Interactives will be enabled.
The default value for this is `true`.

**`homeForSharing`** Set :homeForSharing to the host where shared Interactives are found
if you don't want to share the ones on the actual server. Example if you host the
Interactives on a static S3 site and want the sharing links to point to the same
Interactives at "http://lab.concord.org"

**`homeInteractivePath`** Path to page to run non-embeddable version of Interactives.

**`homeEmbeddablePath`** Path to page to run embeddable version of Interactives.

**`utmCampaign`** If present a UTM suffix is added to links in the About box.
Set to a string which identifies the external organization.

**`fontface`** font-family name of the font. This only affects a few bits of text. The font-family for
the majority of text is configured using css. The font-family set in this fontface config is monitored
so lab.js will know when the font is loaded. If it is a web font this loading can happen after the page
loads, and some dimensions need to be updated after the font loads.

### Interactive Share link

Normally the **Share** link in an Interactive is enabled. The **Share** dialog allows a user to more easily
share the Interactive in an email or IM, and also provides generated HTML content that can be copied and pasted
to embed the Interactive into a blog or web page.

If you are hosting this content on an external server where supporting
sharing is impractical in some manner you can disable the display of the Interactive **Share** link by setting

    Lab.config.share = false;

The additional values for `homeForSharing` and `homeEmbeddablePath` can be used to construct a custom link for sharing an interactive.

The value for `utmCampaign` is optional. If present and the **home** site has enabled Google Analytics
setting a value for `utmCampaign` will allow better tracking of users who click through links in the
Interactive **About** box.

### Runtime Google Analytics

If the global `_gaq` is defined, then Lab will send some events to Google Analytics. This is done
through trackEvent method in `src/lab/common/controllers/scripting-api.js`. So if you want this to happen then the
page embedding `lab.js` or `lab.min.js` should include the standard Google Analytics script setting things up.

If you want this standard script to be added to the embeddable.html page which is created by the build system
see the **Build Time Configuration** below.

### Setting defaults

The default values for these configuration options are located in `src/lab/lab.config.js`. That file gets compiled
into `lab/lab.js` and `lab/lab.min.js`. So if you have a distribution archive you can change the settings without
recompiling by editing those built files.

## Build Time Configuration

Build Time Configuration is done by the environment variables. Please see `script/setup.rb` (`CONFIG` hash) to check what variables are supported. You don't have to set these variables, default
values are always provided. Some of them are set in .travis.yml in a secure way.