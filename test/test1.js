describe("Embeddable Interactive", function (){
  beforeEach(function (done){
    console.log('before test');
    if (controller.interactiveRendered()) {
      done();
    } else {
      controller.on("interactiveRendered", function() {
        console.log('interactive rendered; calling done()');
        done();
      });
    }
  });
  describe("Interactive interactiveContainer", function () {
    var responsiveContent = document.getElementById('responsive-content'),
        interactiveContainer = document.getElementById('interactive-container');
    it("is a child of the responsiveContent", function () {
      expect(interactiveContainer.parentElement).to.equal(responsiveContent);
    });
  });

  describe("Interactive modelContainer", function (){
    var interactiveContainer = document.getElementById('interactive-container'),
        modelContainer = document.getElementById('model-container');
    it("is a child of the interactiveContainer", function () {
      expect(modelContainer.parentElement).to.equal(interactiveContainer);
    });
  });
});

