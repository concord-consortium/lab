define (require) ->

  TYPES =
    vacuum:
      forceType: 0
      dielectricConstant: 1
      color: "#eee"
    oil:
      forceType: -1
      dielectricConstant: 10
      color: "#f5f1dd"
    water:
      forceType: 1
      dielectricConstant: 80
      color: "#B8EBF0"

  ###
  Simple class representing a solvent.
  ###
  class Solvent

    ###
    Constructs a new Solvent.
    @type is expected to be 'oil', 'water' or 'vacuum' string.
    ###
    constructor: (@type) ->
      propsHash = TYPES[@type]
      if not propsHash?
        throw new Error "Solvent: unknown type. Use 'vacuum', 'oil' or 'water'."

      # Copy solvent properties.
      for property, value of propsHash
        @[property] = value
