before(function(){
  console.log('before test suite')
})

describe("Interactive interactiveContainer", function () {
    var responsiveContent = document.getElementById('responsive-content'),
        interactiveContainer = document.getElementById('interactive-container');
    it("is a child of the responsiveContent", function () {
        expect(interactiveContainer.parentElement).to.equal(responsiveContent);
    });
});

describe("Interactive modelContainer", function () {
    var interactiveContainer = document.getElementById('interactive-container'),
        modelContainer = document.getElementById('model-container');
    it("is a child of the interactiveContainer", function () {
        expect(modelContainer.parentElement).to.equal(interactiveContainer);
    });
});
