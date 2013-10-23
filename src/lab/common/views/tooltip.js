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

  var benchmark = require("common/benchmark/benchmark"),
      lastClose = 0;

  function tooltip($target) {
    // Disable custom tooltips on mobile devices, as e.g. on iPad they cause that
    // user have to tap each component twice as first tap only opens a tooltip.
    if (benchmark.isMobile) return;

    var $rc = $("#responsive-content"),
        $tooltip = null,
        fadeInID = null,
        fadeOutID = null,
        wasShown = false;

    function position(target) {
      // Update font-size using #responsive-content div font-size.
      // Lab Interactives scaling is based on the font-size of this div.
      var fontSize = $rc.css("font-size"),
          vertOffset = + parseFloat(fontSize) * 0.35,
          // workaround jQueryUI tooltip issue; it removes title attribute on focus event
          $posTarget = $(target).closest("[title], [aria-describedby]");
      $tooltip.css("font-size", fontSize);
      // Font-size of the top container changes also dimensions of various elements
      // that are defined in ems, so calculate correct position for tooltip.
      if (!$tooltip.is(":visible")) {
        // Show invisible tooltip, as positioning can't work with hidden elements.
        $tooltip.show();
      }
      $tooltip.position({
        of: $posTarget,
        collision: "flipfit flipfit",
        within: $rc,
        // Arrow's height depends on font-size (as it's defined in ems).
        my: "center top+" + vertOffset,
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

    function clearTooltipState() {
      if ($tooltip) {
        $tooltip.hide();
      }
      clearInterval(fadeInID);
      clearInterval(fadeOutID);
      wasShown = false;
      $tooltip = null;
    }

    $target.tooltip({
      show: false,
      hide: false,
      open: function (event, ui) {
        var delayVal = 3 * Math.min(500, Date.now() - lastClose);

        // Ensure that only one tooltip is visible and tracked by $tooltip and the fadein/fadeout
        // timeres at one time. (A focus event can cause a tooltip to be opened on the previously
        // hovered element just before a tooltip is opened on the currently hovered element, without
        // a close event in between.)
        if ($tooltip !== null) {
          clearTooltipState();
        }

        $tooltip = ui.tooltip;
        position(event.originalEvent.target);
        // Custom delayed animation. Delay value is based on the last user actions.
        $tooltip.hide();
        fadeInID = setTimeout(function () {
          $tooltip.fadeIn();
          wasShown = true;
        }, delayVal);
        fadeOutID = setTimeout(function () {
          $tooltip.fadeOut();
        }, delayVal + 5000);
      },
      close: function (event, ui) {
        if (!$tooltip || ui.tooltip[0] !== $tooltip[0]) {
          return;
        }

        if (wasShown) {
          lastClose = Date.now();
        }
        clearTooltipState();
      }
    });
  }

  return tooltip;
});
