# Localization

## Lab Framework strings localization

Lab Framework supports internationalization. For example open [this interactive](http://lab-framework.concord.org/embeddable.html#interactives/oil-and-water.json), click the small US flag
icon and switch language to Polish (pl). You will notice that all the strings in Interactive frame
are now translated, as well as the interactive itself.

All the strings that are displayed by UI are stored in:

[src/lab/locales/translations.json](https://github.com/concord-consortium/lab/blob/master/src/lab/locales/translations.json)

and: 

[lab-grapher/locales/translations.json](https://github.com/concord-consortium/lab-grapher/blob/master/locales/translations.json)

Note that the second file is in a different project (our graphing library), but uses exactly the same pattern. So, everything below appies to both files.

These JSON files have following structure:
```
{
  "language-code": {
    "namespace": {
      ...
        "another-namespace": {
          "key": "translation",
          ...
        }
    }
  }
}
```

To translate Lab Framework into your language, the only thing you have to do is to copy existing
`en-US` section, change `en-US` to your language code and update translation strings. Note that
you don't have to provide translation of all keys - `en-US` is used as a fallback language.

If you have GitHub account, the simplest way to update `translations.json` is to:

1. Open [src/lab/locales/translations.json](https://github.com/concord-consortium/lab/blob/master/src/lab/locales/translations.json).
2. Click `edit`.
3. Translate Lab Framework into your language!
4. Click `Propose file change`.
5. Click `Send pull request`.
6. Then repeat steps 1-5, but using [lab-grapher/locales/translations.json](https://github.com/concord-consortium/lab-grapher/blob/master/locales/translations.json) file instead.

If you do not have GitHub account, just send updated Lab's `translations.json` and lab-grapher's `translations.json` files to us:

- lab-models@googlegroups.com
- https://groups.google.com/forum/?fromgroups#!forum/lab-models

### Namespaces and special expressions

Namespaces structure should be preserved. Namespaces are used internally to keep strings organized,
but they also should give you an idea about the context of a given string or where it's used. You
may also find a few special expressions inside translation strings, for example:

- `__interactive_title__` is a variable that will be dynamically replaced with some other text. In
this case it will be replaced with Interactive title.

- `__click_here_link__` is a variable too, but when `_link` suffix is used, it means it will be a
clickable link. If the first part of this variable name (`click_here` in this case) is a separate
translation key too, the link text will use this key.

- `$t(sensor.messages.try_again)` is a nested translation. It will be replaced by a translation of
`try_again` key that can be found in `sensor.messages` namespace.

Of course your translation should also include these special variables, without any changes to
their names or placement (special variable will work only inside given string).

There is a complete Polish translation available, which can be used as a reference.

## Interactives localization

Interactive JSONs specify UI components that may include text. To provide translated version
of an Interactive, just copy it and translate all the strings that may be displayed in UI.

To add language menu that references other translations (a flag icon in the upper-right corner),
all translated copies should specify two additional properties:

- `i18nMetadata` - path to the metadata file which lists available translations of this
   interactive.
- `lang` - language code, default is *en-US*. It should match one of the languages specified in
   related `i18nMetadata`. Also, to enable Lab Framework strings localization, it should match
   one of the available Lab translations specified in [translations.json](https://github.com/concord-consortium/lab/blob/master/src/lab/locales/translations.json) (see [the previous section](#lab-framework-strings-localization)).

Using [Oil and Water](http://lab-framework.concord.org/embeddable.html#interactives/oil-and-water.json) as an example:

- There are three copies of this interactive:
  - [interactives/oil-and-water.json](https://github.com/concord-consortium/lab/blob/master/src/interactives/oil-and-water.json) - English version, no `"lang"` property (defaults to *"en-US"*)
  - [locales/pl/interactives/oil-and-water.json](https://github.com/concord-consortium/lab/blob/master/src/locales/pl/interactives/oil-and-water.json) - Polish translation, `"lang": "pl"`
  - [locales/es/interactives/oil-and-water.json](https://github.com/concord-consortium/lab/blob/master/src/locales/es/interactives/oil-and-water.json) - Spanish translation, `"lang": "es"`

All of them specify common `"i18nMetadata": "locales/metadata/oil-and-water.json"`.
[This metadata](https://github.com/concord-consortium/lab/blob/master/src/locales/metadata/oil-and-water.json) file has the following content:
```
{
  "en-US": "interactives/oil-and-water.json",
  "pl": "locales/pl/interactives/oil-and-water.json",
  "es": "locales/es/interactives/oil-and-water.json"
}
```

Only if `i18nMetadata` is specified and it lists more than one language, the language select menu
will show up in the Interactive (the flag icon in the upper-right corner).

Note that when you open [Oil and Water](http://lab-framework.concord.org/embeddable.html#interactives/oil-and-water.json) and switch to Polish language, all the strings in
surrounding frame will be translated as well (e.g. *About* and *Share*). However if you switch
to Spanish translation, the same strings will remain English. This is because Lab Framework has
included Polish translation, but Spanish is not available at the moment. See [the previous section](#lab-framework-strings-localization) to read how to add Lab Framework translation.
