"use strict";

/* exported Utils */

var Utils = {
  readID3Data(audio) {
    /* For more information: https://en.wikipedia.org/wiki/ID3#Layout */
    var reader = new FileReader();
    reader.readAsArrayBuffer(audio);

    return new Promise(resolve => {
      reader.onload = function(e) {
        var result = e.target.result;

        /* Getting the last 128 bytes of the Array buffer */
        result = result.slice(result.byteLength - 128);

        /* Converting the ArrayBuffer to String */
        result = new Uint8Array(result);
        result = String.fromCharCode.apply(null, result);

        var tags = {};

        if (result.slice(0, 4) == "TAG+") {
          // Extended id3v1 tag
          tags = {
            "title": result.slice(4, 64).replace(/[\0]/g, ""),
            "artist": result.slice(64, 124).replace(/[\0]/g, ""),
            "album": result.slice(124, 184).replace(/[\0]/g, ""),
            "speed_list": ["unset", "slow", "medium", "fast", "hardcore"],
            "speed": this.speed_list[parseInt(result.slice(184, 185))],
            "genre": result.slice(185, 215).replace(/[\0]/g, ""),
            "start-time": result.slice(215, 221).replace(/[\0]/g, ""),
            "end-time": result.slice(221, 227).replace(/[\0]/g, "")
          };
        } else if (result.slice(0, 3).replace(/[\0]/g, "") == "TAG") {
          // Basic id3v1 tag
          tags = {
            title: result.slice(3, 3 + 30).replace(/[\0]/g, ""),
            artist: result.slice(30 + 3, 2 * 30 + 3).replace(/[\0]/g, ""),
            album: result.slice(2 * 30 + 3, 3 * 30 + 3).replace(/[\0]/g, ""),
            year: result.slice(3 * 30 + 3, 3 * 30 + 7).replace(/[\0]/g, ""),
            comment: result.slice(3 * 30 + 7, 4 * 30 + 7).replace(/[\0]/g, "")
          };
        }

        resolve(tags);
      };
    });
  },
  extractNameFromFile(file) {
    var t = file.name.split(".");
    return t.slice(0, t.length - 1).join(".");
  },
  convertSecondsToDisplay(time) {
    var hours = Math.floor(time / 3600);
    time = time - hours * 3600;
    var minutes = Math.floor(time / 60);
    var seconds = Math.floor(time - minutes * 60);
    return {hours, minutes, seconds};
  }
};

function Element(tagName, attributes) {
  var element = document.createElement(tagName);
  for (var attr in attributes) {
    if (attr == "style" || attr == "css") {
      element.style = attributes[attr]
      continue;
    }
    if (attr == "content") {
      element.innerHTML = attributes.content;
      continue;
    }
    if (attr.startsWith("on")) {
      element.addEventListener(attr.replace("on","").toLowerCase(), attributes[attr]);
      continue;
    }
    if (attr == "parent") {
      attributes.parent.appendChild(element);
      continue;
    }
    element.setAttribute(attr, attributes[attr]);
  }
  return element;
}

