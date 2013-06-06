before(function(){
  console.log('before test suite')
})

describe("Interactive modelContainer", function () {
    var interactiveContainer = document.getElementById('interactive-container'),
        modelContainer = document.getElementById('model-container');
    it("is a child of the interactiveContainer", function () {
        expect(modelContainer.parentElement).to.equal(interactiveContainer);
    });
});
