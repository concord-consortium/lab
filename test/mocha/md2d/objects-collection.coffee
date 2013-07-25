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

    checkLen = (len) ->
      col.count.should.equal len
      col.objects.length.should.equal len

    check = (idx, values) ->
      # raw data
      col.data.a[idx].should.equal values[0]
      col.data.b[idx].should.equal values[1]
      col.data.c[idx].should.equal values[2]
      # props copy
      props = col.get idx
      props.a.should.equal values[0]
      props.b.should.equal values[1]
      props.c.should.equal values[2]
      props2 = col.get idx
      props2.should.eql props
      # each time new object should be created
      props2.should.not.equal props
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
      handler.add.callCount.should.equal 1
      # 'add' operation consists of 'set' operation:
      handler.set.callCount.should.equal 1

    it "should let set / update an object properties", ->
      col.set 0, {a: 2, b: 1, c: 0}
      check 0, [2, 1, 0]

    it "should emit appropriate event when object properties are updated", ->
      handler.set.callCount.should.equal 2

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
      handler.remove.callCount.should.equal 1


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
