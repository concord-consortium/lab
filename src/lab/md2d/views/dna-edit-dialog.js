/*global $, define, model */

define(function () {

  return function DNAEditDialog() {
    var api,
        $dialogDiv,
        $dnaTextInput,

        init = function() {
          $dialogDiv = $('<div></div>');
          $dialogDiv.append('<label for="dna-sequence-input">DNA sequence:</label>');
          $dnaTextInput = $('<input type="text" id="dna-sequence-input" size="45"></input>');
          $dnaTextInput.appendTo($dialogDiv);

          $dialogDiv.dialog({
            title: "DNA Properties",
            autoOpen: false,
            width: "30em",
            modal: true,
            buttons: {
              "Apply": function () {
                var newSequence = $dnaTextInput.val();
                model.getDNAProperties().set({
                  sequence: newSequence
                });
                $(this).dialog("close");
              },
              "Cancel": function() {
                $(this).dialog("close");
              }
            }
          });
        };

    api = {
      open: function () {
        $dnaTextInput.val(model.getDNAProperties().get().sequence);
        $dialogDiv.dialog("open");
      }
    };

    init();

    return api;
  };
});
