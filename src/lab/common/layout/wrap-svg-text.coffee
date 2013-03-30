###
  A simple function to wrap a string of text into an SVG text node of a given width
  by creating tspans and adding words to them until the computedTextLength of the
  tspan is greater than the desired width. Returns the number of lines.

  If no wrapping is desired, use maxWidth=-1
###

define (require) ->

  svgUrl = "http://www.w3.org/2000/svg"

  wrapSVGText = window.wrapSVGText = (text, svgTextNode, maxWidth, x, dy) ->
    # collect dashes
    dashes = /-/gi
    dashArray = while result = dashes.exec(text) then result.index

    # split on spaces or dashes
    words = text.split /[\s-]/

    curLineLength      = 0
    computedTextLength = 0
    numLines           = 1
    widestWidth        = 0

    # maxWidth = Infinity if maxWidth is -1

    for word, i in words
      curLineLength += word.length + 1

      if i is 0 or maxWidth > 0 and computedTextLength > maxWidth    # create new tspan
        if i > 0
          tempText = tspanNode.firstChild.nodeValue
          if tempText.length > words[i-1].length+1
            # remove the last word added and place it on the next line
            lastWord = tempText.slice tempText.length - words[i-1].length - 1
            tspanNode.firstChild.nodeValue = tempText.slice 0, (tempText.length - words[i-1].length - 1)
          else if tempText.length is words[i-1].length+1
            tspanNode.firstChild.nodeValue =  tempText.slice 0, (tempText.length - 1)
          widestWidth = Math.max tspanNode.getComputedTextLength(), widestWidth
          numLines++

        tspanNode = document.createElementNS svgUrl, "tspan"
        tspanNode.setAttributeNS null, "x", x
        tspanNode.setAttributeNS null, "dy", if i is 0 then 0 else dy

        textNode = document.createTextNode line
        tspanNode.appendChild textNode
        svgTextNode.appendChild tspanNode

        if ~dashArray.indexOf curLineLength-1 then line = word + "-"
        else line = word + " "

        if i and lastWord then line = lastWord + line

      else
        if ~dashArray.indexOf curLineLength-1 then line += word + "-"
        else line += word + " "

      # Set text node value to current sentence, and work out the length
      tspanNode.firstChild.nodeValue = line
      computedTextLength = tspanNode.getComputedTextLength()

      # awkward, have to do this one last time for the last word
      if i and i is words.length - 1 and maxWidth > 0 and computedTextLength > maxWidth
        tempText = tspanNode.firstChild.nodeValue
        tspanNode.firstChild.nodeValue = tempText.slice 0, (tempText.length - words[i].length - 1)

        tspanNode = document.createElementNS svgUrl, "tspan"
        tspanNode.setAttributeNS null, "x", x
        tspanNode.setAttributeNS null, "dy", dy

        textNode = document.createTextNode words[i]
        tspanNode.appendChild textNode
        svgTextNode.appendChild tspanNode
        numLines++

    if widestWidth is 0 then widestWidth = svgTextNode.childNodes[0].getComputedTextLength()
    if maxWidth > widestWidth
      width = maxWidth
    else
      width = widestWidth

    return {lines: numLines, width: width, textWidth: widestWidth}