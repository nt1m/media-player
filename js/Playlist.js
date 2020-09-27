"use strict";

/*
  Constructor
  @param Object params
    - Function@Promise onBeforeAdded
    - HTMLElement element
*/
function Playlist(params) {
  this.element = params.element;
  this.previousItem = null;
  this.coverEl = document.querySelector("img#cover");
  this.shuffle = false;
  this.loop = true;
  this.element.scrollTo = function(y, t) {
    t = t > 0 ? Math.floor(t / 4) : 40;
    let step = (y - this.scrollTop) / t * 40;
    let that = this;
    function aux() {
      t -= 40;
      that.scrollTop += step;
      if (t > 0) {
        setTimeout(aux, 40);
      } else {
        that.scrollTop = y;
      }
    }
    aux();
  };
  this.params = params;

  this.onItemSelected = this.onItemSelected.bind(this);
  this.onItemRemoved = this.onItemRemoved.bind(this);
  this.onItemCleared = this.onItemCleared.bind(this);
  this.selectPrevious = this.selectPrevious.bind(this);
  this.selectNext = this.selectNext.bind(this);

  // Hash Map
  this.list = new Map();
  this.orderedList = null;
  return this;
}

Playlist.prototype = {
  addAll(medias) {
    return new Promise((resolve, reject) => {
      let i = 0;
      let addNextEl = () => {
        if (++i < medias.length) {
          this.add(medias[i]).then(v => {
            addNextEl();
          });
        } else {
          resolve();
        }
      };
      if (medias.length > 0) {
        this.add(medias[0]).then(addNextEl);
      }
    });
  },

  /*
    Adds an media file to the playlist
    @param File media: The file to add
  */
  add(media) {
    if (media === null) {
      return;
    }
    this.element.classList.add("loading");
    if (this.list.has(createHash(media))) {
      this.element.classList.remove("loading");
      return Promise.resolve();
    }
    if (media.type.match("audio") != "audio" &&
        media.type.match("video") != "video") {
      this.element.classList.remove("loading");
      return Promise.resolve();
    }
    let adding = new PlaylistItem({
      type: media.type.match("audio") == "audio" ? "audio" : "video",
      media,
      playlist: this
    });
    return adding.then((item) => {
      this.list.set(item.hash, item);
      if (!this.selectedItem) {
        this.onItemSelected(item.hash);
      }
      this.element.classList.remove("loading");
      return item;
    });
  },
  toggleShuffle() {
    this.shuffle = !this.shuffle;
    if (this.shuffle) {
      this.orderedList = this.list;
      var array = [];
      this.list.forEach(function(v, i) {
        array.push([i, v]);
      });
      for (var _i = array.length - 1; _i + 1 > 0; _i--) {
        var _a = array[_i];
        var _rand = Math.floor(Math.random() * _i);
        array[_i] = array[_rand];
        array[_rand] = _a;
      }
      this.list = new Map(array);
    } else {
      this.list = this.orderedList;
      this.orderedList = null;
    }
  },
  selectPrevious() {
    var itemIndex = [...this.list.keys()].findIndex(h => h === this.selectedItem);
    var nextItemIndex = itemIndex === 0 ? this.list.size - 1 : itemIndex - 1;
    var nextItem = [...this.list.keys()][nextItemIndex];
    this.list.get(this.selectedItem).unselect();
    this.onItemSelected(nextItem);
    if (nextItemIndex === this.list.size - 1 && this.shuffle) {
      this.shuffle = false;
      this.toggleShuffle();
    }
  },

  selectNext(hash) {
    hash = !hash ? this.selectedItem : hash;
    var itemIndex = [...this.list.keys()].findIndex(h => h === hash);
    var nextItemIndex = itemIndex === this.list.size - 1 ? 0 : itemIndex + 1;
    var nextItem = [...this.list.keys()][nextItemIndex];
    this.previousItem = hash;
    this.list.get(hash).unselect();
    this.onItemSelected(nextItem);
    if (nextItemIndex === 0 && this.shuffle) {
      this.shuffle = false;
      this.toggleShuffle();
    }
  },

  onItemSelected(hash) {
    if (this.selectedItem) {
      this.list.get(this.selectedItem).unselect();
    }
    this.list.get(hash).select();
    this.selectedItem = hash;
    this.params.onItemSelected(hash);
  },

  onItemRemoved(hash) {
    if (this.list.size === 1) {
      this.onItemCleared();
    } else if (this.selectedItem === hash) {
      this.selectNext(hash);
    }

    this.list.get(hash).destroy();
    this.list.delete(hash);
  },

  onItemCleared() {
    this.selectedItem = null;
    this.params.onItemCleared();
  }
};

function PlaylistItem(params) {
  this.playlist = params.playlist;
  this.hash = createHash(params.media);
  this.media = params.media;
  this.type = params.type;
  this.onItemSelected = params.playlist.onItemSelected;
  this.onItemRemoved = params.playlist.onItemRemoved;
  this.pic = null;
  return Utils.readTag(this.media).then(tag => {
    this.tag = tag;
    this.pic = tag.pic;
    this.createDOM();

    return this;
  });
}

PlaylistItem.prototype = {
  createDOM() {
    var item = Element("li", {
      title: Utils.getTooltipForTag(this.tag),
      onClick: () => this.onItemSelected(this.hash),
      parent: this.playlist.element
    });

    var itemWrap = Element("a", {
      href: "#",
      parent: item
    });

    /* var coverDiv = */
    Element("div", {
      class: "cover",
      parent: itemWrap
    });

    var textContainer = Element("p", {
      class: "text-container",
      parent: itemWrap
    });

    Element("span", {
      class: "title",
      content: this.tag.title,
      parent: textContainer
    });

    if (this.tag.artist) {
      Element("span", {
        class: "artist",
        content: this.tag.artist,
        parent: textContainer
      });
    }

    Element("button", {
      class: "cross",
      onClick: (e) => {
        this.onItemRemoved(this.hash);
        e.stopPropagation();
      },
      parent: itemWrap
    });

    this.element = item;
    return item;
  },

  select() {
    this.element.classList.add("playing");
    this.playlist.coverEl.src = this.pic == null ? "" : this.pic;
  },

  unselect() {
    this.element.classList.remove("playing");
    this.playlist.coverEl.src = "";
  },

  destroy() {
    this.element.remove();
    this.media = null;
    this.playlist.coverEl.src = "";
  }
};

function createHash(audio) {
  if (!audio.name) {
    return Date.now();
  }
  return encodeURIComponent(audio.name.replace(/\s/g, ""));
}
