/*global $, define */

define(function () {

  return function DNAEditDialog(model) {
    var api,
        $dialogDiv,
        $dnaTextInput,
        $errorMsg,
        $submitButton,

        init = function() {
          // Basic dialog elements.
          $dialogDiv = $('<div></div>');
          $dnaTextInput = $('<input type="text" id="dna-sequence-input" size="55"></input>');
          $dnaTextInput.appendTo($dialogDiv);
          $errorMsg = $('<p class="error"></p>');
          $errorMsg.appendTo($dialogDiv);

          // jQuery UI Dialog.
          $dialogDiv.dialog({
            dialogClass: "dna-edit-dialog",
            // Ensure that font is being scaled dynamically.
            appendTo: "#responsive-content",
            title: "DNA Code on Sense Strand",
            autoOpen: false,
            width: "35em",
            buttons: {
              "Apply": function () {
                model.set({
                  DNA: $dnaTextInput.val()
                });
                $(this).dialog("close");
              }
            }
          });

          // Dynamic validation on input.
          $submitButton = $(".dna-edit-dialog button:contains('Apply')");
          $dnaTextInput.on("input", function () {
            try {
              model.getPropertyValidateFunc("DNA")($dnaTextInput.val());
              $submitButton.button("enable");
              $errorMsg.text("");
            } catch (e) {
              $submitButton.button("disable");
              $errorMsg.text(e.message);
            }
          });
        };

    api = {
      open: function () {
        // Clear previous errors.
        $errorMsg.text("");
        $submitButton.removeAttr("disabled");
        // Set current value of DNA code.
        $dnaTextInput.val(model.get("DNA"));
        $dialogDiv.dialog("open");
      }
    };

    init();

    return api;
  };
});
