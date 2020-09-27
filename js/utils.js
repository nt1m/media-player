"use strict";

/* eslint-disable no-unused-vars */
/* global getMp3Tag */
var Utils = {
  readTag(media) {
    return new Promise(resolve => {
      if (media.type.match("audio") == "audio") {
        getMp3Tag(media)
          .then(tag => {
            let prediction = this.predictTagFromName(media.name)
            resolve({
              title: tag.title || prediction.title,
              artist: tag.artist || prediction.artist,
              album: tag.album,
              pic: tag.picture && window.URL.createObjectURL(tag.picture),
            });
          });
      } else {
        resolve(this.getVideoTag(media));
      }
    });
  },
  getVideoTag(vid) {
    return {
      title: vid.name
    };
  },
  predictTagFromName(name) {
    if (!name) {
      return {};
    }
    var tag = {};
    name = this.removeFileExtension(name);
    var splitName = name.split("-");
    if (splitName.length > 1) {
      tag.artist = trim(splitName[0]);

      splitName.shift();
      tag.title = trim(splitName.join(""));
    } else {
      tag.title = trim(name);
    }
    tag.title = this.sanitizeCommonKeywords(tag.title);

    var ftData = this.extractFeaturing(tag.title);
    if (ftData[1]) {
      tag.title = ftData[0];
      tag.artist += ", " + ftData[1];
    }

    return tag;
  },

  removeFileExtension(name) {
    var t = name.split(".");
    return t.slice(0, t.length - 1).join(".");
  },

  extractFeaturing(title) {
    var ftKeywords = ["feat", "feat.", "ft.", "featuring"];
    var splitTitle = title.toLowerCase().split(" ");
    var i = splitTitle.findIndex(w => ftKeywords.indexOf(w) > -1);
    if (i > -1) {
      return title.split(splitTitle[i]).map(trim);
    }
    return [title, null];
  },

  sanitizeCommonKeywords(name) {
    var keywordRegex = /[\(\[]([\s\w]+)?(official|music|audio|video|edit|tour|lyric|lyrics)([\s\w]+)?[\)\]]/ig;
    name = name.replace(/_/g, " ");
    return name.replace(keywordRegex, "");
  },

  getTooltipForTag(tag) {
    let tooltip = tag.title;
    if (tag.artist) {
      tooltip = `${tag.artist} - ${tooltip}`;
    }
    if (tag.album) {
      tooltip += `\nAlbum: ${tag.album}`;
    }
    if (tag.genre) {
      tooltip += `\nGenre: ${tag.genre}`;
    }
    return tooltip;
  },

  convertSecondsToDisplay(time) {
    var hours = Math.floor(time / 3600);
    time = time - hours * 3600;
    var minutes = Math.floor(time / 60);
    var seconds = Math.floor(time - minutes * 60);
    return {hours, minutes, seconds};
  }
};

function trim(str) {
  return str.trim().replace(/\s+/ig, " ").replace(/\(\s?\)/g, "");
}
function Element(tagName, attributes) {
  var element = document.createElement(tagName);
  for (var attr in attributes) {
    if (attr == "style" || attr == "css") {
      element.style = attributes[attr];
      continue;
    }
    if (attr == "content") {
      element.innerHTML = attributes.content;
      continue;
    }
    if (attr.startsWith("on")) {
      element.addEventListener(attr.replace("on", "").toLowerCase(), attributes[attr]);
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

