# Localization

Lab Framework supports internationalization. For example open [this interactive](http://lab-framework.concord.org/embeddable.html#interactives/oil-and-water.json), click the small US flag
icon and switch language to Polish (pl). You will notice that all the strings in Interactive frame
are now translated, as well as the interactive itself.

All the strings that are displayed by UI are stored in:

[src/lab/locales/translations.json](https://github.com/concord-consortium/lab/blob/master/src/lab/locales/translations.json)

This JSON file has following structure:
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

If you do not have GitHub account, just send updated `translations.json` file to us:

- lab-models@googlegroups.com
- https://groups.google.com/forum/?fromgroups#!forum/lab-models


### Namespaces and special expressions

Namespaces structure should be preserved. Namespaces are used internally to keep strings organized,
but they also should give you an idea about the context of a given string or where it's used. You
may also find a few special expressions inside translation strings, for example:

- `__interactive_title__` is a variable that will be dynamically replaced with some other text. In
this case it will be replaced by Interactive title.

- `__click_here_link__` is a variable too, but when `_link` suffix is used, it means it will be a
clickable link. If the first part of this variable name (`click_here` in this case) is a separate
translation key too, the link text will use this key.

- `$t(sensor.messages.try_again)` is a nested translation. It will be replaced by a translation of
`try_again` key that can be found in `sensor.messages` namespace.

Of course your translation should also include these special variables, without any changes to
their names or placement (special variable will work only inside given string).

There is a complete Polish translation available, which can be used as a reference.
