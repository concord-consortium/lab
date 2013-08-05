/*global define, $ */
define(function (require) {

  return function HelpSystem(helpTips, $container) {
    var api,
        isActive = false,
        tipIdx = 0,
        $overlay;

    function showTip(idx) {

    }

    api = {
      start: function () {
        $overlay = $('<div class="lab-help-overlay"></div>');
        $overlay.on("click", api.next);
        $overlay.appendTo($container);
        tipIdx = 0;
        isActive = true;
        api.next();
      },

      stop: function () {
        $overlay.remove();
        isActive = false;
      },

      next: function () {
        if (tipIdx >= helpTips.length) {
          api.stop();
          return;
        }
        showTip(tipIdx);
        tipIdx++;
      },

      isActive: function () {
        return isActive;
      }
    };
    return api;
  };
});
