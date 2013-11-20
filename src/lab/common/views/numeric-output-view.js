define(function () {

  var detectFontChange = require('common/layout/detect-font-change');
  var OVERSAMPLE = 2;

  return function NumericOutputView(opts) {

    var id    = opts.id;
    var label = opts.label;
    var units = opts.unit;

    var $numericOutput;
    var $label;
    var $output;
    var $number;
    var $units;

    var lastValue;
    var minContentWidth;

    var $canvas;
    var textWidth = 0;
    var textY;
    var ctx;
    var canvasElementWidth, canvasElementHeight;
    var canvasInternalWidth, canvasInternalHeight;

    var api;

    function resizeCanvas(width) {
      var oversampledFontSize;

      canvasElementWidth = width;
      canvasElementHeight = $number.height();

      $canvas.width(canvasElementWidth);
      $canvas.height(canvasElementHeight);

      // oversample for HiDPI devices (set its internal width, height to 2x those of canvas element)
      canvasInternalWidth = OVERSAMPLE * canvasElementWidth;
      canvasInternalHeight = OVERSAMPLE * canvasElementHeight;

      $canvas.attr('width', canvasInternalWidth);
      $canvas.attr('height', canvasInternalHeight);

      // resizing resets internal canvas properties!
      oversampledFontSize = OVERSAMPLE * parseInt($number.css('font-size'), 10);

      ctx.font = [
        $number.css('font-style'),
        $number.css('font-variant'),
        $number.css('font-weight'),
        oversampledFontSize + 'px/' + $number.css('line-height'),
        $number.css('font-family')
      ].join(' ');

      ctx.fillStyle = $number.css('color');
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';

      textY = canvasInternalHeight / 2;
    }

    function repositionCanvas() {
      var position = $output.position();
      $canvas.css({
        left: position.left + parseInt($number.css('padding-left'), 10) + $number.width() - canvasElementWidth,
        top: position.top + parseInt($output.css('padding-top'), 10)
      });
    }

    api = {

      /**
        Update the canvas element to the current value, and conservatively update the width of the
        background <span>.

        Numeric outputs update every tick (usually), so we're using canvas for speed (Drawing text
        to Canvas is faster than drawing to an absolutely positioned html element, and is much
        faster than updating an element in page flow, which invalidates the whole page layout and
        costs several full ms in layout and paint time even on a fast desktop browser.)

        Note that we need $number to be in page flow (position: relative) in order for semantic
        layout to work.

        We must update the size of $number but we to avoid performance hits we do so conservatiely
        -- only do it if the width of the number being displayed is > 5px larger or smaller than the
        width of $number.
      */
      update: function(value) {
        if (value == null) {
          value = '';
        } else {
          value = '' + value;
        }
        lastValue = value;

        var positionChanged = false;

        textWidth = Math.round(ctx.measureText(value).width / OVERSAMPLE);

        if (canvasElementWidth < textWidth) {
          resizeCanvas(2 * textWidth);
          positionChanged = true;
        }

        // Avoid resizing the number <span> each tick.
        if (Math.abs($number.width() - textWidth) > 5 && textWidth > minContentWidth) {
          $number.width(textWidth);
          positionChanged = true;
        }

        if (positionChanged) {
          repositionCanvas();
        }

        ctx.clearRect(0, 0, canvasInternalWidth, canvasInternalHeight);
        ctx.fillText(value, canvasInternalWidth, textY);
      },

      updateLabel: function(value) {
        $label.html(value);
      },

      updateUnits: function(value) {
        $units.html(value);
      },

      hideUnits: function() {
        // avoid growing/shrinking the box unnecessarily
        $units.css('opacity', 0);
      },

      showUnits: function() {
        $units.css('opacity', 1);
      },

      render: function() {
        $canvas = $('<canvas>').css('position', 'absolute');
        ctx = $canvas[0].getContext('2d');

        $numericOutput = $('<div class="numeric-output">');
        $label  = $('<span class="label"></span>');
        $output = $('<span class="output"></span>');
        // $number has to have content just so that its height is reported correctly
        $number = $('<span class="value"> - </span>').css('opacity', 0);
        $units  = $('<span class="units"></span>');

        if (label) { $label.html(label); }
        if (units) { $units.html(units); }

        $numericOutput.attr('id', id)
          .append($label)
          .append($output
            .append($canvas)
            .append($number)
            .append($units)
          );

        return $numericOutput;
      },

      /**
        Call this whenever app resizes. Updates canvas position, size, and font-size.
        Must be called at least once after the view has been added to the DOM!
      */
      resize: function() {
        minContentWidth =
          parseInt($number.css('min-width'), 10) -
          parseInt($number.css('padding-left'), 10) -
          parseInt($number.css('padding-right'), 10);

        resizeCanvas(2 * textWidth);
        api.update(lastValue);
        repositionCanvas();

        detectFontChange({
          font: ctx.font,
          onchange: function() {
            api.resize();
          }
        });
      }
    };

    return api;
  };
});
