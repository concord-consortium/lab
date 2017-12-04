/*global $, define */

define(function () {

  return function DNAEditDialog(model) {
    var api,
        $dialogDiv,
        $dnaTextInput,
        $originalDnaInput,
        $errorMsg,
        $submitButton,
        originalDNA = model.get("DNA"),

        init = function() {
          // Basic dialog elements.
          $dialogDiv = $('<div></div>');
          $originalDnaInput = $('<input type="text" size="55" disabled/>');
          $originalDnaInput.val(originalDNA);
          $('<div>Original sequence</div>').append($originalDnaInput).appendTo($dialogDiv);
          $dnaTextInput = $('<input type="text" id="dna-sequence-input" size="55"/>');
          $('<div>Edited sequence</div>').prepend($dnaTextInput).appendTo($dialogDiv);
          $errorMsg = $('<p class="error"></p>');
          $errorMsg.appendTo($dialogDiv);

          // jQuery UI Dialog.
          $dialogDiv.dialog({
            dialogClass: "dna-edit-dialog",
            // Ensure that font is being scaled dynamically.
            appendTo: ".lab-responsive-content",
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
      },
      bindModel: function (newModel) {
        if (newModel !== model) {
          model = newModel;
          // Model has changed, so update original DNA too.
          originalDNA = model.get("DNA");
          $originalDnaInput.val(originalDNA);
        }
      }
    };

    init();

    return api;
  };
});
