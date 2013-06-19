/*global $ */
(function(){
  var getBaseUrl = function() {
    var base = window.location.protocol +  "//" + window.location.host + "/";
    var root_path = window.location.pathname.split("/").slice(1,-1).join("/");
    return base + root_path;
  };

  var cloneDomItem =function(elem, elemTag) {
    var width   = elem.width();
    var height  = elem.height();
    var returnElm = $(elemTag);

    returnElm.addClass($(elem).attr("class"));
    returnElm.attr("style", $(elem).attr("style"));
    returnElm.css('background', $(elem).css("background"));
    returnElm.attr('width', width);
    returnElm.attr('height', height);
    return returnElm;
  };

  var getDomSnapshot = function(element, imgDst, callback) {
    var css     = $('<div>').append($('link[rel="stylesheet"]').clone()).html();
    var width   = element.width();
    var height  = element.height();
    var html_content;

    var replacementImgs = element.find('canvas').map( function(count,elem) {
        var dataUrl = elem.toDataURL('image/png');
        var img = cloneDomItem($(elem),"<img>");
        img.attr('src', dataUrl);
        return img;
    });

    element = element.clone();
    element.find('canvas').each(function(i,elm) {
      var backgroundDiv = cloneDomItem($(elm),"<div>");
      // we should also add a backing (background) dom element
      // $('canvas.overlay').css('background')
      $(elm).replaceWith(replacementImgs[i]);
      backgroundDiv.insertBefore($(elm));
    });

    element.css({
      'top':0,
      'left':0,
      'margin':0,
      'width':width,
      'height':height
    });

    html_content = $('<div>').append(element).html();

    $.ajax({
      url: "/convert_svg/",
      type: "POST",
      data: {
        'content': html_content,
        'css': css,
        'width': width,
        'height': height,
        'base_url': getBaseUrl()
      }
    }).done(function(msg) {
      if(imgDst) {
        imgDst.html(msg);
      }
      if (callback) {
        callback(msg);
      }
    });
  };
  window.getDomSnapshot = getDomSnapshot;
})();