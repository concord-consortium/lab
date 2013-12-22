# Project Configuration

Configuration variables used by the runtime JavaScript code are available in the JavaScript global
object `Lab.config`.

In a full build environment the JavaScript configuration is set in the `:jsconfg` section of
`config/config.yml`:

    :jsconfig:
      :sharing: true
      :home: http://lab.concord.org
      :homeForSharing:
      :homeInteractivePath: /examples/interactives/interactive.html
      :homeEmbeddablePath: embeddable.html
      :utmCampaign: <external-campaign-key>

**`sharing`** A boolean attribute used to determine if the **Share** link in the Interactives will be enabled.
The default value for this is `true`.

**`home`** Url used to reference cannonical site when sharing is turned off.

**`homeForSharing`** Set :homeForSharing to the host where shared Interactives are found
if you don't want to share the ones on the actual server. Example if you host the
Interactives on a static S3 site and want the sharing links to point to the same
Interactives at "http://lab.concord.org"

**`homeInteractivePath`** Path to page to run non-embeddable version of Interactives.

**`homeEmbeddablePath`** Path to page to run embeddable version of Interactives.

**`utmCampaign`** If present a UTM suffix is added to links in the About box.
Set to a string which identifies the external organization.

When the build environment is active these values are used to generate JavaScript code integrated
into the project by the Ruby program:
[`script/generate-js-config.rb`](https://github.com/concord-consortium/lab/blob/master/script/generate-js-config.rb)

## Interactive Share link

Normally the **Share** link in an Interactive is enabled. The **Share** dialog allows a user to more easily
share the Interactive in an email or IM, and also provides generated HTML content that can be copied and pasted
to embed the Interactive into a blog or web page.

If you are hosting this content on an external server where supporting
sharing is impractical in some manner you can disable the display of the Interactive **Share** link by setting
`:sharing` in `config/config.yml` to `false`:

    :jsconfig:
      :sharing: false
      :home: http://lab.concord.org
      :homeForSharing: http://lab.concord.org
      :homeInteractivePath: /examples/interactives/interactive.html
      :homeEmbeddablePath: embeddable.html
      :utmCampaign: <external-campaign-key>

The additional values for `:home`, `homeInteractivePath`, and `homeEmbeddablePath` are used to construct an
additional paragraph in the Interactive **About** box providing a link to the Interactive on the production
[site for the project](http://lab.concord.org).

You can also enable Sharing **but** use a separate host for generating the sharing urls by entering a value
for **homeForSharing**. If you are *also* hosting the the Lab Interactives in a subdirectory you must also
set the values for **homeEmbeddablePath** and **homeInteractivePath** as shown above.

The value for `utmCampaign` is optional. If present and the **home** site has enabled Google Analytics
setting a value for `utmCampaign` will allow better tracking of users who click through links in the
Interactive **About** box.

## Google Analytics

In addition there is a optional section in `config/config.yml` which if present enables embedding google
analytics script into the head of the main `index.html` and all html pages in the `examples/` and `doc/`
directories. This includes all the Interactives which are located in `examples/interactives` directory.

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

