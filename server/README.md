## TODO: write this ##

setup: Many parts missing:
cp config/settings.sample.yml config/settings.yml
cp config/couchdb.sample.yml config/couchdb.yml

One thing you can try is running `rake rake app:import:built_interactives`

Assuming that you have examples built by the lab build process in `public/examples/interactives/interactives.json` and you have a couchdb running, this should produce a number of rails resources.
