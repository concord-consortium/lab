# Project Configuration

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

## Interactive Share link

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

## Google Analytics

In addition there is a optional section in `config/config.yml` which if present enables embedding google
analytics script into the head of the main `index.html` and `embeddable.html' pages.

Include your Google Analytics account number here to enable insertion of the Google Analytics
script by the build system into the generated HTML pages.

    :google_analytics:
      :account_id: <account-id>

The content from which the embedded Google Analytics script is generated is contained in this Ruby file:
[`script/setup.rb`](https://github.com/concord-consortium/lab/blob/master/script/setup.rb).

## Limitations changing configuration in an archive distribution

If you have downloaded a distribution archive you can manually modify the code that initializes the JavaScript
runtime configuration in the files: `lab/lab.js` and `lab/lab.min.js`. Editing the value for `Lab.config.sharing`
in these files will affect the JavaScript runtime settings when these files are loaded.

Additionally you can turn on UTM suffixes by adding a string value to `Lab.config.utmCampaign``.

However generation and insertion of the Google Analytics script into HTML pages can only be done by
setting a value for the `:google_analytics :account_id` and running the build process.

