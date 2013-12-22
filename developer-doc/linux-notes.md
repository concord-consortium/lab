# Additional Notes for Ubuntu Linux

- the Ruby Gem Nokogiri requires libxslt and libxml2
  install them with:

      sudo apt-get install libxslt-dev libxml2-dev

- D3.js build process fails:

        locale: Cannot set LC_ALL to default locale: No such file or directory

    Solution:

        $ sudo locale-gen en_US

- D3.js build process fails:

        make[1]: /usr/lib/nodejs:/usr/share/javascript/uglify-js/bin/uglifyjs: Command not found

    Workaround:

        $ unset NODE_PATH

    and try to build the project again.
