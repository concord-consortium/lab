/*global $, define, model */

define(function () {

  return function DNAEditDialog() {
    var api,
        $dialogDiv,
        $dnaTextInput,
        $errorMsg,

        init = function() {
          $dialogDiv = $('<div></div>');
          $dialogDiv.append('<label for="dna-sequence-input">DNA sequence:</label>');
          $dnaTextInput = $('<input type="text" id="dna-sequence-input" size="45"></input>');
          $dnaTextInput.appendTo($dialogDiv);
          $errorMsg = $('<p class="error"></p>');
          $errorMsg.appendTo($dialogDiv);

          $dialogDiv.dialog({
            dialogClass: "dna-edit-dialog",
            title: "DNA Properties",
            autoOpen: false,
            width: "30em",
            modal: true,
            buttons: {
              "Apply": function () {
                var newSequence = $dnaTextInput.val(),
                    correct = true;

                try {
                  model.getDNAProperties().set({
                    sequence: newSequence
                  });
                } catch (e) {
                  correct = false;
                  $errorMsg.text(e.message);
                }

                if (correct) {
                  $(this).dialog("close");
                }
              },
              "Cancel": function() {
                $(this).dialog("close");
              }
            }
          });
        };

    api = {
      open: function () {
        // Clear previous errors.
        $errorMsg.text("");
        // Set current value of DNA code.
        $dnaTextInput.val(model.getDNAProperties().get().sequence);
        $dialogDiv.dialog("open");
      }
    };

    init();

    return api;
  };
});
