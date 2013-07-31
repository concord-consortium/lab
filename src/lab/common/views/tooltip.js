/*global define: false, $: false */

/**
 * Lab-compatible tooltips based on jQuery-UI tooltips. The custom styling is used and tooltips
 * scale themselves according to the font-size of #responsive-content div.
 *
 * There is also a special algorithm for delaying tooltips. When you hover over element with
 * tooltip, it will be shown after 2 seconds. Then if you move mouse pointer fast to another
 * tooltip-able element, tooltip will be shown much faster. This helps user read all tooltips
 * quickly in case of need.
 *
 * Implementation details:
 *
 * There are a few icky solutions. First of all we have to manually set font-size of tooltip
 * container, based on #responsive content font-size, as we can't append tooltip to this div.
 * What's more, there is no way to set font-size before positioning, so we have to position
 * tooltip again after updating font-size (so its size too).
 *
 * Also algorithm for dynamical tooltips delay requires a lot of customization. jQuery-UI
 * implementation doesn't support behavior we expect. We hide tooltip manually in 'open' callback
 * and set interval which shows it again after calculated amount of milliseconds. Weird, but works
 * quite fine.
 */
define(function (require) {

  var markdownToHTML = require("common/markdown-to-html"),

      getID = (function () {
        var id = 0;
        return function () {
          return id++;
        };
      }()),

      lastHoverOut = null;

  return function tooltip($target, content, openNow, interactiveController) {
    var $rc = $("#responsive-content"),
        $tooltip = null,
        intervalID = null,
        wasShown = false;

    function position() {
      // Update font-size using #responsive-content div font-size.
      // Lab Interactives scaling is based on the font-size of this div.
      var fontSize = $rc.css("font-size");
      $tooltip.css("font-size", fontSize);
      // Font-size of the top container changes also dimensions of various elements
      // that are defined in ems, so calculate correct position for tooltip.
      if (!$tooltip.is(":visible")) {
        // Show invisible tooltip, as positioning can't work with hidden elements.
        $tooltip.show();
      }
      $tooltip.position({
        of: $target,
        collision: "flipfit flipfit",
        // Arrow's height depends on font-size (as it's defined in ems).
        my: "center top+" + parseFloat(fontSize) * 1.2,
        at: "center bottom",
        using: function(position, feedback) {
          $(this).css(position);
          // Add arrow for nicer look & feel.
          $("<div>")
            .addClass("ui-tooltip-arrow")
            .addClass(feedback.vertical)
            .addClass(feedback.horizontal)
            .appendTo(this);
        }
      });
    }

    $target.attr("data-lab-tooltip", true);
    $target.tooltip({
      items: "[data-lab-tooltip]",
      content: markdownToHTML(content),
      show: false,
      open: function (event, ui) {
        $tooltip = ui.tooltip;
        position();
        // Custom delayed animation. Delay value is based on the last user actions.
        $tooltip.hide();
        intervalID = setTimeout(function () {
          $tooltip.fadeIn();
          wasShown = true;
        }, 4 * Math.min(500, Date.now() - lastHoverOut));
      },
      close: function () {
        $tooltip = null;
        clearInterval(intervalID);
        if (wasShown) {
          lastHoverOut = Date.now();
          wasShown = false;
        }
      }
    });
    if (openNow) {
      $target.tooltip("open");
    }
    if (interactiveController) {
      interactiveController.on("layoutUpdated.tooltip-" + getID(), function () {
        // If tooltip is visible position it again.
        if ($tooltip) position();
      });
    }
  };
});
