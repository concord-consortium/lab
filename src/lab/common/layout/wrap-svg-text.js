/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS205: Consider reworking code to avoid use of IIFEs
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
/*
  A simple function to wrap a string of text into an SVG text node of a given width
  by creating tspans and adding words to them until the computedTextLength of the
  tspan is greater than the desired width. Returns the number of lines.

  If no wrapping is desired, use maxWidth=-1
*/

let wrapSVGText;
const svgUrl = "http://www.w3.org/2000/svg";

export default wrapSVGText = (window.wrapSVGText = function(text, svgTextNode, maxWidth, x, dy) {
  // collect dashes
  let dashArray, newlinemode, width, words;
  const dashes = /-/gi;

  // if text contains newlines
  if (text.search("\n") > 0) {
    // then split on newlines
    words = text.split("\n");
    newlinemode = true;
    dashArray = [];
  } else {
    // else split on spaces or dashes
    words = text.split(/[\s-]/);
    newlinemode = false;
    dashArray = (() => {
      let result;
      const result1 = [];
      while ((result = dashes.exec(text))) {
        result1.push(result.index);
      }
      return result1;
    })();
  }

  let curLineLength = 0;
  let computedTextLength = 0;
  let numLines = 1;
  let widestWidth = 0;

  // maxWidth = Infinity if maxWidth is -1

  for (let i = 0; i < words.length; i++) {
    var line, tempText, textNode, tspanNode;
    const word = words[i];
    curLineLength += word.length + 1;

    if ((i === 0) || newlinemode || ((maxWidth > 0) && (computedTextLength > maxWidth))) { // create new tspan
      var lastWord;
      if (i > 0) {
        if (newlinemode) {
          widestWidth = Math.max(tspanNode.getComputedTextLength(), widestWidth);
          numLines++;
        } else {
          tempText = tspanNode.firstChild.nodeValue;
          if (tempText.length > (words[i - 1].length + 1)) {
            // remove the last word added and place it on the next line
            lastWord = tempText.slice(tempText.length - words[i - 1].length - 1);
            tspanNode.firstChild.nodeValue = tempText.slice(0, (tempText.length - words[i - 1].length - 1));
          } else if (tempText.length === (words[i - 1].length + 1)) {
            tspanNode.firstChild.nodeValue = tempText.slice(0, (tempText.length - 1));
          }
          widestWidth = Math.max(tspanNode.getComputedTextLength(), widestWidth);
          numLines++;
        }
      }

      tspanNode = document.createElementNS(svgUrl, "tspan");
      tspanNode.setAttributeNS(null, "x", x);
      tspanNode.setAttributeNS(null, "dy", i === 0 ? 0 : dy);

      textNode = document.createTextNode(line);
      tspanNode.appendChild(textNode);
      svgTextNode.appendChild(tspanNode);

      if (~dashArray.indexOf(curLineLength - 1)) {
        line = word + "-";
      } else {
        line = word + " ";
      }

      if (i && lastWord) {
        line = lastWord + line;
      }

    } else {
      if (~dashArray.indexOf(curLineLength - 1)) {
        line += word + "-";
      } else {
        line += word + " ";
      }
    }

    // Set text node value to current sentence, and work out the length
    tspanNode.firstChild.nodeValue = line;
    computedTextLength = tspanNode.getComputedTextLength();
    if (newlinemode) {
      widestWidth = Math.max(tspanNode.getComputedTextLength(), widestWidth);
    }

    if (!newlinemode) {
      // awkward, have to do this one last time for the last word
      if (i && (i === (words.length - 1)) && (maxWidth > 0) && (computedTextLength > maxWidth)) {
        tempText = tspanNode.firstChild.nodeValue;
        tspanNode.firstChild.nodeValue = tempText.slice(0, (tempText.length - words[i].length - 1));

        tspanNode = document.createElementNS(svgUrl, "tspan");
        tspanNode.setAttributeNS(null, "x", x);
        tspanNode.setAttributeNS(null, "dy", dy);

        textNode = document.createTextNode(words[i]);
        tspanNode.appendChild(textNode);
        svgTextNode.appendChild(tspanNode);
        numLines++;
      }
    }
  }

  if (widestWidth === 0) {
    widestWidth = svgTextNode.childNodes[0].getComputedTextLength();
  }
  if (maxWidth > widestWidth) {
    width = maxWidth;
  } else {
    width = widestWidth;
  }

  return {
    lines: numLines,
    width,
    textWidth: widestWidth
  };
});