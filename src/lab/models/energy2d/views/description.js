/*jslint indent: 2, browser: true, newcap: true */

// Description.
//
// getHTMLElement() method returns JQuery object with DIV that contains description.
// If you want to style its components:
// Default div id = "energy2d-description",
// Title class: "energy2d-description-title", Content class: "energy2d-description-content".

export default function DescriptionView(description) {
  var DEFAULT_ID = 'energy2d-description',
    DEFAULT_CLASS = 'energy2d-description',

    $description_div,

    //
    // Private methods.
    //
    initHTMLelement = function() {
      var $title, $tagline, $content, $footnote;

      $description_div = $('<div />');
      $description_div.attr('id', description.id || DEFAULT_ID);
      $description_div.addClass(description.class || DEFAULT_CLASS);
      // title
      $title = $('<div>' + description.title + '</div>');
      $title.attr('class', DEFAULT_ID + '-title');
      $description_div.append($title);
      // tagline
      $tagline = $('<div>' + description.tagline + '</div>');
      $tagline.attr('class', DEFAULT_ID + '-tagline');
      $description_div.append($tagline);
      // content
      $content = $('<div>' + description.content + '</div>');
      $content.attr('class', DEFAULT_ID + '-content');
      $description_div.append($content);
      // footnote
      $footnote = $('<div>' + description.footnote + '</div>');
      $footnote.attr('class', DEFAULT_ID + '-footnote');
      $description_div.append($footnote);
    },

    //
    // Public API.
    //
    simulation_description = {
      getHTMLElement: function() {
        return $description_div;
      }
    };

  // One-off initialization.
  initHTMLelement();

  return simulation_description;
};
