helpers = require '../../helpers'
helpers.setupBrowserEnvironment()

ObjectsCollection = requirejs 'md2d/models/engine/objects-collection'

describe "ObjectsCollection", ->

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

  it "should act as a constructor that accepts the metadata spec as its argument", ->
    col = new ObjectsCollection metadata
    should.exist col

  describe "A ObjectsCollection instance", ->
    col = null
    handler = null

    before ->
      col = new ObjectsCollection metadata
      handler =
        add: sinon.spy()
        set: sinon.spy()
        remove: sinon.spy()

      col.on 'add', handler.add
      col.on 'set', handler.set
      col.on 'remove', handler.remove

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
      col.count.should.equal 1

      col.data.a[0].should.equal 0
      col.data.b[0].should.equal 1
      col.data.c[0].should.equal 2

    it "should emit appropriate event when new object is added", ->
      handler.add.callCount.should.equal 1
      # 'add' operation consists of 'set' operation:
      handler.set.callCount.should.equal 1

    it "should let get an object properties", ->
      obj = col.get 0
      obj.a.should.equal 0
      obj.b.should.equal 1
      obj.c.should.equal 2

    it "should let set / update an object properties", ->
      col.set 0, {a: 2, b: 1, c: 0}
      obj = col.get 0
      obj.a.should.equal 2
      obj.b.should.equal 1
      obj.c.should.equal 0

    it "should emit appropriate event when object properties are updated", ->
      handler.set.callCount.should.equal 2

    it "should let remove an object", ->
      # First add a second object to make test more demanding.
      col.add {}
      col.count.should.equal 2
      col.data.a[0].should.equal 2
      col.data.b[0].should.equal 1
      col.data.c[0].should.equal 0
      col.data.a[1].should.equal 0
      col.data.b[1].should.equal 1
      col.data.c[1].should.equal 2

      col.remove 0
      col.count.should.equal 1
      # Object properties should be shifted.
      col.data.a[0].should.equal 0
      col.data.b[0].should.equal 1
      col.data.c[0].should.equal 2

    it "should emit appropriate event when object is removed", ->
      handler.remove.callCount.should.equal 1