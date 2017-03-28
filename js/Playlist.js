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
  this.shuffle = false;
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
  return this;
}

Playlist.prototype = {
  addAll(media) {
    return Promise.all(media.map(m => this.add(m)));
  },

  /*
    Adds an media file to the playlist
    @param File media: The file to add
  */
  add(media) {
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

  selectPrevious() {
    if (this.shuffle && this.previousItem
        && this.list.has(this.previousItem)
        && this.previousItem != this.selectedItem) {
      this.list.get(this.selectedItem).unselect();
      this.onItemSelected(this.previousItem);
    } else if (this.shuffle && this.previousItem == this.selectedItem) {
      this.selectNext();
    } else {
      var itemIndex = [...this.list.keys()].findIndex(h => h === this.selectedItem);
      var nextItemIndex = itemIndex === 0 ? this.list.size - 1 : itemIndex - 1;
      var nextItem = [...this.list.keys()][nextItemIndex];
      this.list.get(this.selectedItem).unselect();
      this.onItemSelected(nextItem);
    }
  },

  selectNext(hash) {
    if (!hash) {
      hash = this.selectedItem;
    }
    var nextItemIndex;
    var itemIndex = [...this.list.keys()].findIndex(h => h === hash);

    var oth = [...Array(this.list.size).keys()].filter(i => i != itemIndex);
    if (this.list.size > 2 && this.previousItem && this.list.has(this.previousItem)) {
      var previousItemIndex = [...this.list.keys()].findIndex(h => h === this.previousItem);
      oth = oth.filter(i => i != previousItemIndex);
    }
    if (this.shuffle && this.list.size > 1) {
      nextItemIndex = oth[Math.floor(Math.random() * oth.length)];
    } else {
      nextItemIndex = itemIndex === this.list.size - 1 ? 0 : itemIndex + 1;
    }

    var nextItem = [...this.list.keys()][nextItemIndex];
    this.previousItem = hash;
    this.list.get(hash).unselect();
    this.onItemSelected(nextItem);
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
  return Utils.readID3Data(this.media).then(tags => {
    this.tags = tags;

    this.createDOM();

    return this;
  });
}

PlaylistItem.prototype = {
  createDOM() {
    var item = Element("li", {
      title: Utils.getTooltipForTags(this.tags),
      onClick: () => this.onItemSelected(this.hash),
      parent: this.playlist.element
    });

    var itemWrap = Element("a", {
      href: "#",
      parent: item
    });

    var textContainer = Element("p", {
      class: "text-container",
      parent: itemWrap
    });

    Element("span", {
      class: "title",
      content: this.tags.title,
      parent: textContainer
    });

    if (this.tags.artist) {
      Element("span", {
        class: "artist",
        content: this.tags.artist,
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
  },

  unselect() {
    this.element.classList.remove("playing");
  },

  destroy() {
    this.element.remove();
    this.media = null;
  }
};

function createHash(audio) {
  if (!audio.name) {
    return Date.now();
  }
  return encodeURIComponent(audio.name.replace(/\s/g, ""));
}
