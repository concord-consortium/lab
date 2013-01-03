helpers = require '../../helpers'
helpers.setupBrowserEnvironment()

describe "PairwiseLJProperties", ->
  requirejs ['cs!md2d/models/engine/pairwise-lj-properties'], (PairwiseLJProperties) ->

    # Mock the engine. LJProps structure depends only on one function of the engine.
    engine =
      setPairwiseLJProperties: ->

    # Mock the change hooks.
    changeHooks =
      pre: ->
      post: ->

    beforeEach ->
      sinon.spy engine, "setPairwiseLJProperties"
      sinon.spy changeHooks, "pre"
      sinon.spy changeHooks, "post"

    afterEach ->
      engine.setPairwiseLJProperties.restore()
      changeHooks.pre.restore()
      changeHooks.post.restore()

    it "should exist", ->
      should.exist PairwiseLJProperties

    it "should act as a constructor that accepts the engine object", ->
      ljPropsCollection = new PairwiseLJProperties engine
      should.exist ljPropsCollection

    describe "its instance", ->
      ljPropsCollection = null

      before ->
        ljPropsCollection = new PairwiseLJProperties engine

      it "should have a registerChangeHooks, add, set, get and count methods", ->
        ljPropsCollection.should.have.property "registerChangeHooks"
        ljPropsCollection.should.have.property "set"
        ljPropsCollection.should.have.property "get"
        ljPropsCollection.should.have.property "remove"

      it "should return undefined when custom properties are not specified for pair", ->
        should.not.exist ljPropsCollection.get(0, 1)

      it "should throw when hooks are not registered and add or set method is called", ->
        (-> ljPropsCollection.set 0, 1, {sigma: 2, epsilon: 3}).should.throw()

      describe "with registered change hooks", ->

        beforeEach ->
          ljPropsCollection.registerChangeHooks changeHooks.pre, changeHooks.post

        it "should allow to set custom properties and call appropriate hooks and engine methods", ->
          ljPropsCollection.set 0, 1, {sigma: 2, epsilon: 3}
          changeHooks.pre.callCount.should.eql 1
          changeHooks.post.callCount.should.eql 1
          engine.setPairwiseLJProperties.callCount.should.eql 1
          engine.setPairwiseLJProperties.withArgs(0, 1).calledOnce.should.be.true

          ljPropsCollection.set 4, 5, {sigma: 6, epsilon: 7}
          changeHooks.pre.callCount.should.eql 2
          changeHooks.post.callCount.should.eql 2
          engine.setPairwiseLJProperties.callCount.should.eql 2
          engine.setPairwiseLJProperties.withArgs(4, 5).calledOnce.should.be.true

        it "should allow to get existing LJ properties", ->
          ljPropsCollection.get(0, 1).should.eql sigma: 2, epsilon: 3
          ljPropsCollection.get(4, 5).should.eql sigma: 6, epsilon: 7

        it "should allow to modify existing custom LJ properties and call appropriate hooks and engine methods", ->
          ljPropsCollection.set 0, 1, {sigma: 10, epsilon: 11}
          changeHooks.pre.callCount.should.eql 1
          changeHooks.post.callCount.should.eql 1
          engine.setPairwiseLJProperties.callCount.should.eql 1
          engine.setPairwiseLJProperties.withArgs(0, 1).calledOnce.should.be.true

          ljPropsCollection.get(0, 1).should.eql sigma: 10, epsilon: 11

        it "should allow to remove custom LJ properties and call appropriate hooks and engine methods", ->
          ljPropsCollection.remove 4, 5
          changeHooks.pre.callCount.should.eql 1
          changeHooks.post.callCount.should.eql 1
          engine.setPairwiseLJProperties.callCount.should.eql 1
          engine.setPairwiseLJProperties.withArgs(4, 5).calledOnce.should.be.true

          should.not.exist(ljPropsCollection.get(4, 5))

        it "should allow to deserialize custom properties stored in an array", ->
          data = [
            {element1: 1, element2: 2, sigma: 1, epsilon: 2}
            {element1: 2, element2: 3, sigma: 2, epsilon: 3}
          ]

          ljPropsCollection.deserialize data
          ljPropsCollection.get(1, 2).should.eql sigma: 1, epsilon: 2
          ljPropsCollection.get(2, 3).should.eql sigma: 2, epsilon: 3
