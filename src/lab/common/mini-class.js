/*global define: false*/

/**

  mini-class.js

  Minimalist classical-OO style inheritance for JavaScript.
  Adapted from CoffeeScript and SproutCore.

  Richard Klancer, 7-23-2012
*/
define(function() {

  function mixin(dest, src) {
    var hasProp = {}.hasOwnProperty,
        key;

    for (key in src) {
      if (hasProp.call(src, key)) dest[key] = src[key];
    }
  }

  //
  // Remember that "classes" are just constructor functions that create objects, and that the
  // constructor function property called `prototype` is used to define the prototype object
  // (aka the __proto__ property) which will be assigned to instances created by the constructor.
  // Properties added to the prototype object of a constructor effectively become the instance
  // properties/methods of objects created with that constructor, and properties of the prototype
  // of the prototype are effectively "superclass" instance properties/methods.
  //
  // See http://javascriptweblog.wordpress.com/2010/06/07/understanding-javascript-prototypes/
  //

  /**
    Assuming Child, Parent are classes (i.e., constructor functions):
      1. Copies the properties of the Parent constructor to the Child constructor (These can be
         considered "class properties"/methods, shared among all instances of a class.)
      2. Adds Parent's prototype to Child's prototype chain.
      3. Adds Parent's prototype to the '__super__' property of Child.
  */
  function extend(Child, Parent) {

    // First, copy direct properties of the constructor object ("class properties") from Parent to
    // Child.
    mixin(Child, Parent);

    // First step in extending the prototype chain: make a throwaway constructor, whose prototype
    // property is the same as the Parent constructor's prototype property. Objects created by
    // calling `new PrototypeConstructor()` will have the *same* prototype object as objects created
    // by calling `new Parent()`.
    function PrototypeConstructor() {
      this.constructor = Child;
    }
    PrototypeConstructor.prototype = Parent.prototype;

    // Now use PrototypeConstructor to extend the prototype chain by one link.
    // That is, use PrototypeConstructor to make a new *object* whose prototype object
    // (__proto__ property) is Parent.prototype, and assign the object to the Child constructor's
    // prototype property. This way, objects created by calling "new Child()"
    // will have a prototype object whose prototype object in turn is Parent.prototype.
    Child.prototype = new PrototypeConstructor();

    // Assign the prototype used by objects created by Parent to the __super__ property of Child.
    // (This property can be accessed within a Child instance as `this.constructor.__super__`.)
    // This allows a Child instance to look "up" the prototype chain to find instances properties
    // defined in Parent that are overridden in Child (i.e., defined on Child.prototype)
    Child.__super__ = Parent.prototype;
  }

  /**
    Defines a "class" whose instances will have the properties defined in `prototypeProperties`:
      1. Creates a new constructor, which accepts a list of properties to be copied directly onto
         the instance returned by the constructor.
      2. Adds the properties in `prototypeProperties` to the prototype object shared by instances
         created by the constructor.
  */
  function defineClass(prototypeProperties) {
    function NewConstructor(instanceProperties) {
       mixin(this, instanceProperties);
    }
    mixin(NewConstructor.prototype, prototypeProperties);
    return NewConstructor;
  }

  /**
    Given ParentClass, return a new class which is ParentClass extended by childPrototypeProperties
  */
  function extendClass(ParentClass, childPrototypeProperties) {
    function ChildConstructor(instanceProperties) {
      mixin(this, instanceProperties);
    }
    // Extend ParentClass first so childPrototypeProperties override anything defined in ParentClass
    extend(ChildConstructor, ParentClass);
    mixin(ChildConstructor.prototype, childPrototypeProperties);
    return ChildConstructor;
  }

  return {
    defineClass: defineClass,
    extendClass: extendClass,
    mixin: mixin
  };

});
