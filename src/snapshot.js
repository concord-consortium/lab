(function(){
  var getBaseUrl = function() {
    var base = window.location.protocol +  "//" + window.location.host + "/";
    var root_path = window.location.pathname.split("/").slice(1,-1).join("/");
    return base + root_path;
  };

  var getDomSnapshot = function(element, imgDst, callback) {
    var css     = $('<div>').append($('link[rel="stylesheet"]').clone()).html();
    var width   = element.width();
    var height  = element.height();
    var html_content;

    element = element.clone();
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