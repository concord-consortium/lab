/*global requirejs, describe, it, beforeEach */
var helpers = require('../../helpers');
helpers.setupBrowserEnvironment();

var serialize = requirejs('common/serialize');

describe('serialize()', function() {
  // Note that in tests below, there is a popular pattern of testing:
  // ...should.eql(sth)
  // ...should.not.equal(sth)
  // 'equal' is a strict equality, while 'eql' not. We expect that object
  // will have the same properties, but they should not reference the same
  // object in the memory.

  var metaData = {
    a: {
    },
    b: {
      serialize: true
    },
    c: {
      serialize: false
    }
  };

  it('should take into account "serialize" meta property', function () {
    // The input is correct.
    var input = {
      a: [1],
      b: [2, 3],
      c: [4, 5, 6]
    },

    result = serialize(metaData, input);

    result.should.be.an.Object;
    result.should.have.property('a');
    result.should.have.property('b');
    result.should.not.have.property('c');

    result.a.should.eql(input.a);
    result.a.should.not.equal(input.a);
    result.b.should.eql(input.b);
    result.b.should.not.equal(input.b);
  });
  it('should handle cases when some properties are undefined', function () {
    // The input is correct.
    var input = {
      a: [1],
    //b: undefined
      c: [4, 5, 6]
    },

    result = serialize(metaData, input);

    result.should.be.an.Object;
    result.should.have.property('a');
    result.should.not.have.property('b');
    result.should.not.have.property('c');

    result.a.should.eql(input.a);
    result.a.should.not.equal(input.a);
  });
  it('should handle regular and typed arrays', function () {
    // The input is correct.
    var i, result,
        a = [0, 0, 0, 0],
        b = new Float32Array(4),
        input = {
          a: a,
          b: b
        };

    for(i = 0; i < b.length; i++) {
      b[i] = i;
    }
    // a = [0, 0, 0, 0]
    // b = [0, 1, 2, 3]

    result = serialize(metaData, input);

    result.should.be.an.Object;
    result.should.have.property('a');
    result.should.have.property('b');
    result.should.not.have.property('c');

    result.a.should.eql(input.a);
    result.a.should.not.equal(input.a);
    result.b.should.eql([0, 1, 2, 3]);
    result.b.should.not.equal(input.b);
  });
  it('should handle nested objects', function () {
    var input = {
      a: {
        b: 1,
        c: [1, 2, 3]
      },
      b: {
        c: {
          d: 1,
          e: [1, 2]
        },
        f: {
          g: 1
        }
      }
    },

    result = serialize(metaData, input);

    result.should.be.an.Object;
    result.should.have.property('a');
    result.should.have.property('b');
    result.a.should.eql(input.a);
    result.a.should.not.equal(input.a);
    result.b.should.eql(input.b);
    result.b.should.not.equal(input.b);
  });
  it('should handle Infinity in a special way types', function () {
    var result;
    // JSON doesn't accept Infinity values, so strings should be used.
    result = serialize(metaData, {a: -Infinity, b: Infinity});
    result.a.should.eql("-Infinity");
    result.b.should.eql("Infinity");
    result = serialize(metaData, {a: [0, -Infinity, Infinity], b: { c: Infinity, d: { e: { f: Infinity }} }});
    result.a.should.eql([0, "-Infinity", "Infinity"]);
    result.b.should.eql({ c: "Infinity", d: { e: { f: "Infinity" }}});
  });
});
