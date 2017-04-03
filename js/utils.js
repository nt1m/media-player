"use strict";

/* eslint-disable no-unused-vars */
var Utils = {
  readID3Data(media) {
    return new Promise(resolve => {
      new jsmediatags.Reader(media).setTagsToRead(["title", "artist", "album", "picture"])
      .read({
        onSuccess: (({ tags }) => {
          let returnedTags = {
            title: tags.title || this.removeFileExtension(media.name),
            artist: tags.artist || "",
            album: tags.album || "",
            pic: tags.picture && (`data:${tags.picture.format};base64,` +
              window.btoa(tags.picture.data.reduce((acc, value) => {
                acc += String.fromCharCode(value);
                return acc;
              }, ""))) || null,
            // trackNum: tag.tags.TRCK != null ? tag.tags.TRCK.data : "",
            // lyrics: tag.tags.lyrics || "",
          };
          if (!returnedTags.artist) {
            returnedTags = Object.assign(
              returnedTags,
              this.predictTagsFromName(media.name)
            );
          }
          resolve(returnedTags);
        }),
        onError: (e => {
          throw new Error(e);
        }),
      });
    });
  },
  predictTagsFromName(name) {
    if (!name) {
      return {};
    }
    var tags = {};
    name = this.removeFileExtension(name);
    var splitName = name.split("-");
    if (splitName.length > 1) {
      tags.artist = trim(splitName[0]);

      splitName.shift();
      tags.title = trim(splitName.join(""));
    } else {
      tags.title = trim(name);
    }
    tags.title = this.sanitizeCommonKeywords(tags.title);

    var ftData = this.extractFeaturing(tags.title);
    if (ftData[1]) {
      tags.title = ftData[0];
      tags.artist += ", " + ftData[1];
    }

    return tags;
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
    var keywords = ["lyric", "video", "audio", "lyrics", "official"];
    var removedKeywords = keywords.map(k => "[" + k);
    removedKeywords = removedKeywords.concat(keywords.map(k => "(" + k));
    removedKeywords = removedKeywords.concat(keywords.map(k => "[" + k + "]"));
    removedKeywords = removedKeywords.concat(keywords.map(k => "(" + k + ")"));
    removedKeywords = removedKeywords.concat(keywords.map(k => k + "]"));
    removedKeywords = removedKeywords.concat(keywords.map(k => k + ")"));

    name = name.split(" ").filter(w => removedKeywords.indexOf(w.toLowerCase()) === -1);
    return name.join(" ");
  },

  getTooltipForTags(tags) {
    let tooltip = tags.title;
    if (tags.artist) {
      tooltip = `${tags.artist} - ${tooltip}`;
    }
    if (tags.album) {
      tooltip += `\nAlbum: ${tags.album}`;
    }
    if (tags.genre) {
      tooltip += `\nGenre: ${tags.genre}`;
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

