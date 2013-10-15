define(function () {

  return function NumericOutputView(opts) {

    var id    = opts.id,
        label = opts.label,
        units = opts.unit,
        $numericOutput,
        $label,
        $output,
        $number,
        $units;

    return {
      update: function(value) {
        $number.text(value);
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
        $numericOutput = $('<div class="numeric-output">');
        $label  = $('<span class="label"></span>');
        $output = $('<span class="output"></span>');
        $number = $('<span class="value"></span>');
        $units  = $('<span class="units"></span>');

        if (label) { $label.html(label); }
        if (units) { $units.html(units); }

        $numericOutput.attr('id', id)
          .append($label)
          .append($output
            .append($number)
            .append($units)
          );

        return $numericOutput;
      }
    };
  };
});
