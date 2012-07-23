describe "mini-class.js", ->

  describe "defineClass function", ->
    ClassA = null

    beforeEach ->
      ClassA = defineClass
        getClassName: -> this.className
        className: "ClassA"
        extraProperty: "ClassA definition of 'extraProperty'"

    it "should return a constructor function", ->
      expect( typeof ClassA ).toBe 'function'

    describe "an instance created by calling new", ->
      objA = null

      describe "when no arguments are passed to the constructor", ->

        beforeEach ->
          objA = new ClassA()

        it "should implement methods and properties defined in the class", ->
          expect( objA.getClassName() ).toBe objA.className

      describe "when arguments are passed to the constructor", ->

        beforeEach ->
          objA = new ClassA
            objAProperty: "property defined in objA's constructor argument"

        it "should implement the property defined in the constructor argument", ->
          expect( objA.objAProperty ).toBe "property defined in objA's constructor argument"

        it "should still implement properties and methods defined in the class", ->
          expect( objA.getClassName() ).toBe objA.className

      describe "when arguments passed to the constructor have the same name as properties defined in the class", ->

        beforeEach ->
          objA = new ClassA
            extraProperty: "objA definition of 'extraProperty'"

        it "should override the property defined in the class", ->
          expect( objA.extraProperty ).toBe "objA definition of 'extraProperty'"

  describe "extendClass function", ->

    ClassA = null
    ClassB = null

    beforeEach ->
      ClassA = defineClass
        getClassName: -> this.className
        className: "ClassA"
        extraProperty: "ClassA definition of 'extraProperty'"

      ClassA.classProperty = "classProperty defined directly on classA"

      ClassB = extendClass ClassA,
        getClassName: ->
          this.className + " which extends " + this.constructor.__super__.className
        className: "ClassB"

    it "should return a constructor function", ->
      expect( typeof ClassB ).toBe 'function'

    describe "the constructor function", ->
      it "should be annotated with a reference to the superclass implementation", ->
        expect( ClassB.__super__ ).toEqual ClassA.prototype

      it "should have a copy of the 'class properties' defined on the parent constructor function", ->
        expect( ClassB.classProperty ).toEqual "classProperty defined directly on classA"

    describe "a child class instance created by calling new", ->
      objB = null

      beforeEach ->
        objB = new ClassB()

      it "should retain the parent class value of a property the child class does not override", ->
        expect( objB.extraProperty ).toBe "ClassA definition of 'extraProperty'"

      it "should have the child class value of a property the child class does override", ->
        expect( objB.className ).toBe "ClassB"

      it "should provide a mechanism for child class methods to access superclass values of overridden properties", ->
        expect( objB.getClassName() ).toBe "ClassB which extends ClassA"