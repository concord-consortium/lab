# Fonts

The web font Lato is used by default. We have tried to consolidate references to Lato so it would be easy to change. 
However there are some cases where it can't be consolidated.

- in svg images that are included in models or interactives: these do not inherit the font-family from the document.
  Additionally these are not dynamically generated, so currently they need to have the font-family referenced
  directly. For example see `src/models/sun-on-ground/photonKey.svg`

## Javascript usage

In some cases the font-family is needed in javascript. In those cases it is taken from the configuration
property fontface. You can set this before initializing Lab with `Lab.config.fontface="something";`

## Loading the font

There are two methods for loading the web font. In some cases we are using the Google CDN:
`//fonts.googleapis.com/css?family=Lato:300italic,700italic,300,400,400italic,700`
In other cases we are using a local copy of the font:
`src/sass/lab/_fonts.sass`

The interactives need to run when not connected to the network so embeddable.css uses the local copy.
Most other places use the Google CDN.