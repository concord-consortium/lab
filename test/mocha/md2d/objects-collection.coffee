helpers = require '../../helpers'
helpers.setupBrowserEnvironment()

ObjectsCollection = requirejs 'md2d/models/engine/objects-collection'

describe "ObjectsCollection", ->

  basicTest = (metadata, unitsTranslation) ->
    if not unitsTranslation?
      unitsTranslation =
        translateToModelUnits: (v, type) -> return v
        translateFromModelUnits: (v, type) -> return v

    col = null
    handler = null

    before ->
      col = new ObjectsCollection metadata, unitsTranslation
      handler =
        beforeChange: sinon.spy()
        change: sinon.spy()
        beforeAdd: sinon.spy()
        add: sinon.spy()
        beforeSet: sinon.spy()
        set: sinon.spy()
        beforeRemove: sinon.spy()
        remove: sinon.spy()

      col.on 'beforeChange', handler.beforeChange
      col.on 'change', handler.change
      col.on 'beforeAdd', handler.beforeAdd
      col.on 'add', handler.add
      col.on 'beforeSet', handler.beforeSet
      col.on 'set', handler.set
      col.on 'beforeRemove', handler.beforeRemove
      col.on 'remove', handler.remove

    checkLen = (len) ->
      col.count.should.equal len
      col.objects.length.should.equal len

    check = (idx, values) ->
      # raw data
      col.data.a[idx].should.equal unitsTranslation.translateToModelUnits values[0]
      col.data.b[idx].should.equal unitsTranslation.translateToModelUnits values[1]
      col.data.c[idx].should.equal unitsTranslation.translateToModelUnits values[2]
      # raw props copy
      props = col.getRaw idx
      props.a.should.equal unitsTranslation.translateToModelUnits values[0]
      props.b.should.equal unitsTranslation.translateToModelUnits values[1]
      props.c.should.equal unitsTranslation.translateToModelUnits values[2]
      props2 = col.getRaw idx
      props2.should.eql props
      # each time new object should be created
      props2.should.not.equal props
      # props copy
      props = col.get idx
      props.a.should.equal values[0]
      props.b.should.equal values[1]
      props.c.should.equal values[2]
      props2 = col.get idx
      props2.should.eql props
      # each time new object should be created
      props2.should.not.equal props
      # raw object wrapper
      obj = col.rawObjects[idx]
      obj.a.should.equal unitsTranslation.translateToModelUnits values[0]
      obj.b.should.equal unitsTranslation.translateToModelUnits values[1]
      obj.c.should.equal unitsTranslation.translateToModelUnits values[2]
      # object wrapper
      obj = col.objects[idx]
      obj.a.should.equal values[0]
      obj.b.should.equal values[1]
      obj.c.should.equal values[2]

    it "should provide access to raw data (hash of arrays)", ->
      should.exist col.data
      col.data.a.should.be.an.instanceOf Array
      col.data.b.should.be.an.instanceOf Array
      col.data.c.should.be.an.instanceOf Float32Array

    it "should provide access to number of collection's elements", ->
      should.exist col.count
      col.count.should.equal 0

    it "should let add a new object", ->
      col.add {}
      checkLen 1
      check 0, [0, 1, 2]

    it "should emit appropriate event when new object is added", ->
      handler.beforeAdd.callCount.should.equal 1
      handler.add.callCount.should.equal 1
      # 'add' operation consists of 'set' operation:
      handler.beforeSet.callCount.should.equal 1
      handler.set.callCount.should.equal 1
      handler.beforeChange.callCount.should.equal 1
      handler.change.callCount.should.equal 1

    it "should let set / update an object properties", ->
      col.set 0, {b: 111}
      check 0, [0, 111, 2]
      col.set 0, {c: 222}
      check 0, [0, 111, 222]
      col.set 0, {a: 2, b: 1, c: 0}
      check 0, [2, 1, 0]

    it "should emit appropriate event when object properties are updated", ->
      # .set() was also called during add operation.
      handler.beforeSet.callCount.should.equal 4
      handler.set.callCount.should.equal 4
      handler.beforeChange.callCount.should.equal 4
      handler.change.callCount.should.equal 4

    it "should let remove an object", ->
      # First add a second object to make test more demanding.
      col.add {}
      checkLen 2
      check 0, [2, 1, 0]
      check 1, [0, 1, 2]

      col.remove 0
      checkLen 1
      # Object properties should be shifted.
      check 0, [0, 1, 2]

    it "should emit appropriate event when object is removed", ->
      handler.beforeRemove.callCount.should.equal 1
      handler.remove.callCount.should.equal 1
      handler.beforeChange.callCount.should.equal 6
      handler.change.callCount.should.equal 6

    it "should implement clone-restore interface", ->
      col.set 0, {a: 7, b: 8, c: 9}

      checkLen 1
      check 0, [7, 8, 9]

      # clone
      state1 = col.clone()
      should.exist state1

      col.add {}
      col.add {}
      col.add {}
      checkLen 4
      check 1, [0, 1, 2]
      check 2, [0, 1, 2]
      check 3, [0, 1, 2]

      # clone
      state2 = col.clone()
      should.exist state2

      # restore
      col.restore state1
      checkLen 1
      check 0, [7, 8, 9]

      # restore
      col.restore state2
      checkLen 4
      check 1, [0, 1, 2]
      check 2, [0, 1, 2]
      check 3, [0, 1, 2]

  it "should act as a constructor that accepts the metadata spec as its argument", ->
    metadata =
      a: {
        defaultValue: 0
      }
    col = new ObjectsCollection metadata
    should.exist col

  describe "A ObjectsCollection instance with units translation", ->
    metadata =
      a: {
        defaultValue: 0
      }
      b: {
        defaultValue: 0.5
        type: "any"
      }
      c: {
        defaultValue: 1
        type: "float"
      }

    unitsTranslation =
      translateToModelUnits: (value, type) ->
        return value / 2
      translateFromModelUnits: (value, type) ->
        return value * 2

    basicTest metadata, unitsTranslation

  describe "A ObjectsCollection instance without units translation", ->
    metadata =
      a: {
        defaultValue: 0
      }
      b: {
        defaultValue: 1
        type: "any"
      }
      c: {
        defaultValue: 2
        type: "float"
      }

    basicTest metadata
