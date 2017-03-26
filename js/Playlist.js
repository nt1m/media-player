"use strict";

/*
  Constructor
  @param Object params
    - Function@Promise onBeforeAdded
    - HTMLElement element
*/
function Playlist(params) {
  this.element = params.element;
  this.params = params;

  this.onItemSelected = this.onItemSelected.bind(this);
  this.onItemRemoved = this.onItemRemoved.bind(this);
  this.onItemCleared = this.onItemCleared.bind(this);
  this.selectNext = this.selectNext.bind(this);

  // Hash Map
  this.list = new Map();
  return this;
}

Playlist.prototype = {
  addAll(audios) {
    return Promise.all(audios.map(a => this.add(a)));
  },

  /*
    Adds an media file to the playlist
    @param File media: The file to add
  */
  add(media) {
    if (this.list.has(createHash(media))) {
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
      return item;
    });
  },

  selectNext(hash) {
    if (!hash) {
      hash = this.selectedItem;
    }
    var itemIndex = [...this.list.keys()].findIndex(h => h === hash);
    var nextItemIndex = itemIndex === this.list.size - 1 ? 0 : itemIndex + 1;
    var nextItem = [...this.list.keys()][nextItemIndex];
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

    var textContainer = Element("p", {
      class: "text-container",
      parent: item
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
      parent: item
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
  }
};

function createHash(audio) {
  return encodeURIComponent(audio.name.replace(/\s/g, ""));
}
