// Make these global and therefore predefined in Mocha tests:
global.sinon = require('sinon');
// The following is required because the require('should') defines a getter-only property called
// 'should' on Object.prototype. Since the global object inherits from Object, it becomes impossible
// therefore to set the global variable 'should'. But we can fight fire with fire, and fix it by
// using Object.defineProperty ourselves.

// ------------------------------------------
// Equivalent to `should = require('should')`:
Object.defineProperty(global, 'should', { value: require('should') });
// ------------------------------------------
