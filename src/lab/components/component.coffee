############################################
# Base component class
############################################
define (require) ->

  class Component

    constructor: (@dom_id) ->
      if @dom_id
        @dom_element = $(@dom_id)
      else
        @dom_element = $('<div>')
      @dom_element.addClass('component')
