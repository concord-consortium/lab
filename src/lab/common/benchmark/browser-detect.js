/*global define: false */
// example userAgent strings:
// chrome mobile: Mozilla/5.0 (Linux; Android 4.2.2; Galaxy Nexus Build/JDQ39) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/29.0.1547.72 Mobile Safari/537.36

var windows_platform_token = {
  "Windows NT 6.2": "Windows 8",
  "Windows NT 6.1": "Windows 7",
  "Windows NT 6.0": "Windows Vista",
  "Windows NT 5.2": "Windows Server 2003; Windows XP x64 Edition",
  "Windows NT 5.1": "Windows XP",
  "Windows NT 5.01": "Windows 2000, Service Pack 1 (SP1)",
  "Windows NT 5.0": "Windows 2000",
  "Windows NT 4.0": "Microsoft Windows NT 4.0"
};

function os_platform() {
  var match = navigator.userAgent.match(/\(([^)]+)\).*/);
  if (!match) {
    return "na";
  }
  var systemInfo = match[1];
  var systemInfoArray = systemInfo.split("; ");

  if (systemInfoArray[0] === "Macintosh") {
    return systemInfoArray[1];
  } else if (systemInfoArray[0].match(/^Windows/)) {
    var token = navigator.userAgent.match(/\(.*?(Windows NT.+?)[;)]/),
      arch = "";
    if (systemInfo.match(/WOW64/)) {
      arch = "64/32";
    } else if (systemInfo.match(/Win64; IA64/)) {
      arch = "64";
    } else if (systemInfo.match(/Win64; x64/)) {
      arch = "64";
    }
    return windows_platform_token[token[1]] + "/" + arch;
  } else if (systemInfoArray[0].match(/^X11/)) {
    return systemInfoArray.join('/');
  }

  return "na";
}

export default {
  // Based on: http://detectmobilebrowsers.com/ + ipad|android|playbook|silk as we treat
  // tablets as mobile devices.
  isMobile: (function(a) {
    return (/(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|ipad|android|playbook|silk|iris|kindle|lge |maemo|midp|mmp|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows (ce|phone)|xda|xiino/i).test(a) || (/1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s\-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|\-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw\-(n|u)|c55\/|capi|ccwa|cdm\-|cell|chtm|cldc|cmd\-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc\-s|devi|dica|dmob|do(c|p)o|ds(12|\-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(\-|_)|g1 u|g560|gene|gf\-5|g\-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd\-(m|p|t)|hei\-|hi(pt|ta)|hp( i|ip)|hs\-c|ht(c(\-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i\-(20|go|ma)|i230|iac( |\-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc\-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|\-[a-w])|libw|lynx|m1\-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m\-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(\-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)\-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|\-([1-8]|c))|phil|pire|pl(ay|uc)|pn\-2|po(ck|rt|se)|prox|psio|pt\-g|qa\-a|qc(07|12|21|32|60|\-[2-7]|i\-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h\-|oo|p\-)|sdk\/|se(c(\-|0|1)|47|mc|nd|ri)|sgh\-|shar|sie(\-|m)|sk\-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h\-|v\-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl\-|tdg\-|tel(i|m)|tim\-|t\-mo|to(pl|sh)|ts(70|m\-|m3|m5)|tx\-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|\-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(\-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas\-|your|zeto|zte\-/i).test(a.substr(0, 4));
  })(navigator.userAgent || navigator.vendor || window.opera),

  what_browser: function what_browser() {
    var chromematch = / (Chrome)\/(.*?) /,
      ffmatch = / (Firefox)\/([0123456789ab.]+)/,
      safarimatch = / AppleWebKit\/([0123456789.+]+) \(KHTML, like Gecko\) Version\/([0123456789.]+) (Safari)\/([0123456789.]+)/,
      iematch = / (MSIE) ([0123456789.]+);/,
      operamatch = /^(Opera)\/.+? Version\/([0123456789.]+)$/,
      iphonematch = /.+?\((iPhone); CPU.+?OS .+?Version\/([0123456789._]+)/,
      ipadmatch = /.+?\((iPad); CPU.+?OS .+?Version\/([0123456789._]+)/,
      ipodmatch = /.+?\((iPod); CPU (iPhone.+?) like.+?Version\/([0123456789ab._]+)/,
      androidchromematch = /.+?(Android) ([0123456789.]+).*?; (.+?)\).+? Chrome\/([0123456789.]+)/,
      androidfirefoxmatch = /.+?(Android.+?\)).+? Firefox\/([0123456789.]+)/,
      androidmatch = /.+?(Android) ([0123456789ab.]+).*?; (.+?)\)/,
      match;

    match = navigator.userAgent.match(androidchromematch);
    if (match && match[1]) {
      return {
        browser: "Chrome for Android",
        version: match[4],
        oscpu: match[1] + "/" + match[2] + "/" + match[3]
      };
    }
    match = navigator.userAgent.match(chromematch);
    if (match && match[1]) {
      return {
        browser: match[1],
        version: match[2],
        oscpu: os_platform()
      };
    }
    match = navigator.userAgent.match(ffmatch);
    if (match && match[1]) {
      var buildID = navigator.buildID,
        buildDate = "";
      if (buildID && buildID.length >= 8) {
        buildDate = "(" + buildID.slice(0, 4) + "-" + buildID.slice(4, 6) + "-" + buildID.slice(6, 8) + ")";
      }
      return {
        browser: match[1],
        version: match[2] + ' ' + buildDate,
        oscpu: os_platform()
      };
    }
    match = navigator.userAgent.match(androidfirefoxmatch);
    if (match && match[1]) {
      return {
        browser: "Firefox",
        version: match[2],
        oscpu: match[1]
      };
    }
    match = navigator.userAgent.match(androidmatch);
    if (match && match[1]) {
      return {
        browser: "Android",
        version: match[2],
        oscpu: match[1] + "/" + match[2] + "/" + match[3]
      };
    }
    match = navigator.userAgent.match(safarimatch);
    if (match && match[3]) {
      return {
        browser: match[3],
        version: match[2] + '/' + match[1],
        oscpu: os_platform()
      };
    }
    match = navigator.userAgent.match(iematch);
    if (match && match[1]) {
      var platform_match = navigator.userAgent.match(/\(.*?(Windows.+?); (.+?)[;)].*/);
      return {
        browser: match[1],
        version: match[2],
        oscpu: windows_platform_token[platform_match[1]] + "/" + navigator.cpuClass + "/" + navigator.platform
      };
    }
    match = navigator.userAgent.match(operamatch);
    if (match && match[1]) {
      return {
        browser: match[1],
        version: match[2],
        oscpu: os_platform()
      };
    }
    match = navigator.userAgent.match(iphonematch);
    if (match && match[1]) {
      return {
        browser: "Mobile Safari",
        version: match[2],
        oscpu: match[1] + "/" + "iOS" + "/" + match[2]
      };
    }
    match = navigator.userAgent.match(ipadmatch);
    if (match && match[1]) {
      return {
        browser: "Mobile Safari",
        version: match[2],
        oscpu: match[1] + "/" + "iOS" + "/" + match[2]
      };
    }
    match = navigator.userAgent.match(ipodmatch);
    if (match && match[1]) {
      return {
        browser: "Mobile Safari",
        version: match[3],
        oscpu: match[1] + "/" + "iOS" + "/" + match[2]
      };
    }
    return {
      browser: "",
      version: navigator.appVersion,
      oscpu: ""
    };
  }
};