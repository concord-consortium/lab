# This allows the compiler to precompile format RegExp without doing that
# every time it is used.
format = ///
  %
  # Argument number
  (\d+[$])?
  # Flags
  ((?:[+\x20\-#0])*)
  # Vector flag
  ((?: [*] (?: \d+ [$] )? )? v)?
  # Width
  (\d* | [*] (?: \d+ [$] )?)
  # Precision
  (?: [.] (\d+ | [*] (?: \d+ [$] )? ) )?
  # Length (ignored, for compatibility with C)
  (hh?|ll?|[Lzjtq]|I(?:32|64)?)?
  # Type
  ([diuDUfFeEgGxXoOscpnbB])
  |
  # Literal % mark
  %%
  ///g

# 32-bit numbers are internal ECMAScript limitation. In fact, you cannot
# exactly represent 2 ** 64 in ECMAScript, so emulating it would be
# mostly useless.
errorMessage = "64-bit numbers aren't supported by sprint()!"
intSizeTable =
  h: 2
  hh: 1
  l: 4
  ll: new RangeError errorMessage
  L: 4
  z: 4
  j: 4
  t: 4
  I: 4
  I32: 4
  I64: new RangeError errorMessage
  q: new RangeError errorMessage

sprint = (string, values...) ->
  arrayObjects = ['[object Array]', '[object Arguments]']

  # IE doesn't understand toString()
  toString = Object.prototype.toString

  # Detect values sent as array
  if toString.call(values[0]) in arrayObjects and values.length is 1
    values = values[0]

  i = -1

  padString = (string, length, joiner, leftPad) ->
    string = "#{string}"
    if string.length > length
      string
    else if leftPad
      # new Array(2 + 1).join('-') creates '--' because it generates array of
      # undefined elements (when converted to strings they become nothing).
      # Every array value is joined using specified value. Note that joining
      # only happens inside strings, so you need to add 1 to array
      # constructor in order to get required number of characters.
      "#{string}#{new Array(length - string.length + 1).join joiner}"
    else
      "#{new Array(length - string.length + 1).join joiner}#{string}"

  "#{string}".replace format, (string, matches...) ->
    [argument, flags, vector, length, precision, intSize, type] = matches
    intSize ?= 'L'

    return '%' if string is '%%'

    leftPad = '-' in flags
    alignCharacter = if '0' in flags and not leftPad then '0' else ' '

    abs = (int, signed = no) ->
      # Special case to avoid processing in commonly used %d modifier
      return parseInt int, 10 if intSize is 'L' and (int >= 0 or signed)

      entry = intSizeTable[intSize]
      throw entry if entry instanceof Error
      bits = entry * 8
      int = parseInt(int, 10) % Math.pow 2, bits
      highValue = Math.pow(2, bits) - 1
      if signed and int >= Math.pow 2, bits - 1
        int = -Math.pow(2, bits) + int
      if signed then int else int >>> 0

    toExponential = ->
      argument = (+argument).toExponential(precision)
      if special and '.' not in argument
        argument = argument.replace 'e', '.e'
      argument.toLowerCase().replace /\d+$/, (string) ->
        padString string, 3, 0

    padInteger = (string) ->
      # Special casing
      if +string is 0 and +precision is 0
        ''
      # This behavior happens in other programming languages
      else if defaultPrecision
        string
      else
        alignCharacter = ' '
        padString string, precision, '0'

    if vector
      character = if vector[0] is '*'
        if vector.length > 2
          values[parseInt(vector[1..], 10) - 1]
        else
          values[++i]
      else
        '.'

    length = if length[0] is '*'
      if length.length is 1
        values[++i]
      else
        values[parseInt(length[1..]) - 1]
    else if not length
      0
    else
      length

    precision = if precision and precision[0] is '*'
      if precision.length is 1
        values[++i]
      else
        values[parseInt(precision[1..], 10) - 1]
    else if not precision
      defaultPrecision = yes
      6
    else
      precision

    # After removing 1 we get value equal to 0. Zero is negative value, so
    # we need tricks to avoid any problems with values equal to 0.
    argument = values[(parseInt(argument, 10) or ++i + 1) - 1]

    # Detect negative zero
    if argument is 0
      if 1 / argument is -Infinity
        argument = '-0'

    argument = if argument? then "#{argument}" else ''

    special = '#' in flags

    arguments = if vector
      letter.charCodeAt 0 for letter in argument
    else
      [argument]

    result = for argument in arguments
      argument = switch type
        when 'd', 'i', 'D'
          padInteger abs argument, yes
        when 'u', 'U'
          padInteger abs argument
        when 'f', 'F'
          argument = (+argument).toFixed(precision).toLowerCase()
          # Dot shouldn't be added if argument is NaN or Infinity
          if special and '.' not in argument and not /^-?[a-z]+$/.test argument
            argument += '.'
          argument
        when 'e', 'E'
          toExponential()
        when 'g', 'G'
          if +argument is 0 or 0.0001 <= Math.abs(argument) < Math.pow(10, precision)
            # Precision doesn't include magical dot
            argument = "#{argument}".substr 0, +precision + 1
            if special
              argument.replace /[.]?$/, '.'
            else
              argument.replace /[.]$/, ''
          else
            toExponential().replace(/[.]?0+e/, 'e')
        when 'x', 'X'
          prefix = if special and +argument isnt 0 then '0x' else ''
          "#{prefix}#{padInteger abs(argument).toString 16}"
        when 'b', 'B'
          prefix = if special and +argument isnt 0 then '0b' else ''
          "#{prefix}#{padInteger abs(argument).toString 2}"
        when 'o', 'O'
          prefix = if special then '0' else ''
          "#{prefix}#{padInteger abs(argument).toString 8}"
        when 's'
          if defaultPrecision
            argument
          else
            argument.substr 0, precision
        when 'c'
          String.fromCharCode argument
        else
          throw new Exception "Unrecognized %type (?). Shouldn't happen."

      argument = "#{argument}"

      if type is type.toUpperCase()
        argument = argument.toUpperCase()

      if argument[0] isnt '-'
        if '+' in flags
          argument = "+#{argument}"
        else if ' ' in flags
          argument = " #{argument}"

      padString argument, length, alignCharacter, leftPad
    result.join character

# If it is Node, make alias of `require('sprint')('format')
if module?.exports?
  module.exports = sprint

(module?.exports ? this).sprint = sprint

