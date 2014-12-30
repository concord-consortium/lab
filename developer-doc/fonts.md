# Fonts

The web font Lato is used by default. It's specified in `lab.css`.

If you want to use a different font, you can simply overwrite font-family for `.lab-interactive-container` selector.

You can also specify separate font for elements that are rendered inside model container - just provide font-family for `#model-container` selector.

The only exception are svg images that are included in models or interactives: these do not inherit the font-family
from the document. Additionally these are not dynamically generated, so currently they need to have the font-family referenced directly. For example see `src/models/sun-on-ground/photonKey.svg`.

## Javascript usage

In some cases the font-family is needed in javascript. In those cases it is obtained dynamically
either from the interactive container or from the model container - depending on what makes more
sense for a given element. For example: 

- time display in playback controls uses font specified for interactive container.
- atom labels use font specified for model container. 

That gives us more flexibility when it comes to theming.

## Loading the font

There are two methods for loading the web font. In some cases we are using the Google CDN:
`//fonts.googleapis.com/css?family=Lato:300italic,700italic,300,400,400italic,700`
In other cases we are using a local copy of the font:
`src/sass/lab/_fonts.sass`

The interactives need to run when not connected to the network so embeddable.css uses the local copy.
Most other places use the Google CDN.
