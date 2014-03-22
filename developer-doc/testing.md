# Testing: `test/`

Lab's JavaScript tests use [Vows](http://vowsjs.org), an asynchronous behavior driven framework based
on [Node.js](http://nodejs.org/). In addition Lab uses [jsdom](https://github.com/tmpvar/jsdom), a
lightweight CommonJS implementation of the W3C DOM specifications. Lab's test setup was inspired
by that used by [d3.js](http://mbostock.github.com/d3/). The development dependencies for running the
tests are installed using [npm](http://npmjs.org/).

Running the tests:

    $ make test
    ................................. . . .. . . .
    x OK > 40 honored (0.012s)

If you are running `guard` the tests run automatically anytime a change is made in the JavaScript
files in the `src/` or `test/` directory.

The results of the tests are displayed in the console that `guard` is running in.

If the bottom of the console window is viewable you will see new test results whenever you save a changes.

Recent versions of nodejs/v8 support TypedArrays -- this make it possible to more extensively
test lab.arrays which is designed to support using either typed or regular arrays for computation.

`test/env.js` uses the node module [jsdom](https://github.com/tmpvar/jsdom) to setup resources for
simple emulation of a browser.

[Vows](http://vowsjs.org) integrates the [standard nodejs assertions](http://nodejs.org/docs/latest/api/assert.html)
with an additional collection of useful [assertions](http://vowsjs.org/#assertions) summarized below:

- numerical

        assert.greater (3, 2);
        assert.lesser (2, 3);
        assert.inDelta (Math.random(), 0, 1);

- equality

        assert.equal          (4, 4);
        assert.strictEqual    (4 > 2, true);
        assert.notEqual       (4, 2);
        assert.strictNotEqual (1, true);
        assert.deepEqual      ([4, 2], [4, 2]);
        assert.notDeepEqual   ([4, 2], [2, 4]);

- type

        assert.isFunction (function () {});
        assert.isObject   ({goo:true});
        assert.isString   ('goo');
        assert.isArray    ([4, 2]);
        assert.isNumber   (42);
        assert.isBoolean  (true);
        assert.typeOf     (42, 'number');
        assert.instanceOf ([], Array);

- truth

        assert.isTrue  (true);
        assert.isFalse (false);

- null, undefined, NaN

        assert.isNull      (null);
        assert.isNotNull   (undefined);
        assert.isUndefined ('goo'[9]);
        assert.isNaN       (0/0);

- inclusion

        assert.include ([4, 2, 0], 2);
        assert.include ({goo:true}, 'goo');
        assert.include ('goo', 'o');

- regexp matching

        assert.match ('hello', /^[a-z]+/);

- length

        assert.length ([4, 2, 0], 3);
        assert.length ('goo', 3);  *** not working ***

- emptiness

        assert.isEmpty ([]);
        assert.isEmpty ({});
        assert.isEmpty ("");

- exceptions

        assert.throws(function () { x + x }, ReferenceError);
        assert.doesNotThrow(function () { 1 + 1 }, Error);

Additionally `test/env-assert.js` has a number of useful additional assertions copied from
[d3.js](http://mbostock.github.com/d3/).

_**Note**: Using a more specific assertion usually results in more useful error reports._

There are also many interesting test examples and patterns in the
[d3.js test directory](https://github.com/mbostock/d3/tree/master/test) that can be adapted for use in Lab.

## A Simple Example of Test Driven Development

Here's a simple example that is part of the tests for `lab.arrays.js` to test the `arrays.max()` function:

    "find max in array with negative and positive numbers": function(max) {
      assert.equal(max([3, -1, 0, 1, 2, 3]), 3);
    },

The 'model stepping' tests are a good example where the tests help helped drive new features. The basic
features I was testing in this section relate to the existing functionality exposed by the Stop, Start, Go, and
Reset buttons as wells as the extended keyboard controls that allow stepping forward and backwards a step at a time.

First I created this test that passed:

    "after running running one tick the model is at step 1": function(model) {
      model.tick();
      assert.equal(model.stepCounter(), 1);
      assert.isTrue(model.isNewStep());
    },

In thinking about driving out changes to KE, PE and Temperature of the molecular model itself I realized
I'd like the capability to run a specific number of steps forward and then check the results.

I then wrote this test that failed -- because the model.tick() function didn't yet take an optional argument to
run multiple steps forward:

    "after running 9 more ticks the model is at step 10": function(model) {
      model.tick(9);
      assert.equal(model.stepCounter(), 10);
      assert.isTrue(model.isNewStep());
    },

After saving the change I saw the new test failure reported in my console. I then implemented the new
feature in the actual `src/lab/molecules.js`. Less than a second after saving the file the tests
completed and the report showed it passing.

This is a very simple example -- but part of the value of this kind of test driven development is in first
thinking of how something should behave rather than in how to get it to actually do the work.

Since I already had this function for running one model step:

    model.tick()

Adding an optional numeric argument for running more steps is a fine way to express the intent of the new feature:

    model.tick(9)

In more complicated coding thinking about how to express the intent clearly and then what the result
should be if that intent is successful **FIRST** ... and then 'driving out' the actual implementation to
achieve that result can result in a better architecture -- and of course you also end up with tests.

Because the tests run SO quickly I can interactively change the code in the module or the test and
immediately see results.

## Debugging Tests using the node debugger

Sometimes it can be helpful to break into a debugger when there is a problem in either the code
or the test setup itself. Node comes with a [debugger](http://nodejs.org/docs/latest/api/debugger.html)
which can be used in combination with vows and the tests.

First set a breakpoint by inserting the statement: `debugger;`

    suite.addBatch({
      "Thermometer": {
        topic: function() {
          debugger;
          return new components.Thermometer("#thermometer");
        },
        "creates thermometer": function(t) {
          assert.equal(t.max, 0.7)
        }
      }
    });

Start the node debugger and pass in the full command line to run the tests:

    node debug ./node_modules/vows/bin/vows --no-color

The debugger will break at the beginning of vows:

    < debugger listening on port 5858
    connecting... ok
    break in node_modules/vows/bin/vows:3
      1
      2
      3 var path   = require('path'),
      4     fs     = require('fs'),
      5     util   = require('util'),

Enter `cont` to continue execution until your breakpoint.

    debug> cont
    < ·
    < ········
    < ·
    <
    break in test/lab/components/components-test.js:13
     11   "Thermometer": {
     12     topic: function() {
     13       debugger;
     14       return new components.Thermometer("#thermometer");
     15     },

To evaluate expressions type `repl`  -- use ctrl-C to exit the repl:

    repl
    Press Ctrl + C to leave debug repl
    > initialization_options
    { model_listener: false,
      lennard_jones_forces: true,
      coulomb_forces: true }
    > atoms[0].charge
    -1

Enter **ctrl-C** to exit the repl and return to the debugger.

Enter **ctrl-D** to exit the debugger.

[node-inspector](https://github.com/dannycoates/node-inspector)
[npm package for node-inspector](http://search.npmjs.org/#/node-inspector)

### Using node-inspector while debugging

[node-inspector](https://npmjs.org/package/node-inspector) supports using the webkit inspector in Chrome to support
interactive debugging in node. This can be particualrly help when debugging tests.

Example:

Add a debugger statement to your test:

    originalModelJson = fs.readFileSync(testDir + "expected-json/" + modelJsonFile).toString();
    modelName = /\/?([^\/]*)\.json/.exec(modelJsonFile)[1];
    debugger;
    originalModel = JSON.parse(originalModelJson);
    model = new Model(originalModel);

Start a debugging session:

    $ node --debug-brk ./node_modules/vows/bin/vows --no-color test/vows/mml-conversions/deserialize-serialize-test.js
    debugger listening on port 5858

Start node-inspector:

    $ ./node_modules/.bin/node-inspector &
    info  - socket.io started
    visit http://0.0.0.0:8080/debug?port=5858 to start debugging
