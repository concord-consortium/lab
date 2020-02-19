/**
 * Inherit the prototype methods from one constructor into another.
 *
 * Usage:
 * function ParentClass(a, b) { }
 * ParentClass.prototype.foo = function(a) { }
 *
 * function ChildClass(a, b, c) {
 *   goog.base(this, a, b);
 * }
 *
 * inherit(ChildClass, ParentClass);
 *
 * var child = new ChildClass('a', 'b', 'see');
 * child.foo(); // works
 *
 * In addition, a superclass' implementation of a method can be invoked
 * as follows:
 *
 * ChildClass.prototype.foo = function(a) {
 *   ChildClass.superClass.foo.call(this, a);
 *   // other code
 * };
 *
 * @param {Function} Child Child class.
 * @param {Function} Parent Parent class.
 */
export default function inherit(Child, Parent) {
  function F() {}
  F.prototype = Parent.prototype;
  Child.prototype = new F();
  Child.superClass = Parent.prototype;
  Child.prototype.constructor = Child;
};
