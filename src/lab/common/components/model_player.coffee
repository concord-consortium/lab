############################################
# A simplistic player-wrapper for the model
############################################
define (require) ->

  class ModelPlayer

    constructor: (@model)->

    play: ->
      @model.resume()

    stop: ->
      @model.stop()

    forward: ->
      this.stop()
      @model.stepForward()

    back: ->
      this.stop()
      @model.stepBack()

    seek: (float_index) ->
      this.stop()
      @model.seek(float_index)

    reset: ->
      @model.reset()

    isPlaying: ->
      !@model.is_stopped()
