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
    Adds an audio file to the playlist
    @param File audio: The file to add
  */
  add(audio) {
    let adding = new PlaylistItem({
      audio,
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
    if (!hash) hash = this.selectedItem;
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
}

function PlaylistItem(params) {
  this.playlist = params.playlist;
  this.hash = hash(params.audio);
  this.audio = params.audio;
  this.onItemSelected = params.playlist.onItemSelected;
  this.onItemRemoved = params.playlist.onItemRemoved;
  return Utils.readID3Data(this.audio).then(tags => {
    this.tags = tags;

    this.createDOM();
    
    return this;
  });
}

PlaylistItem.prototype = {
  createDOM() {
    var titleValue = (this.tags.title !== undefined) && this.tags.title ||
                     Utils.extractNameFromFile(this.audio);

    var item = Element("li", {
      title: titleValue,
      onClick: () => this.onItemSelected(this.hash),
      parent: this.playlist.element
    });

    var title = Element("p", {
      class: "title",
      content: titleValue,
      parent: item
    });

    var remove = Element("button", {
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
}

function hash(audio) {
  return Date.now() + encodeURIComponent(audio.name.split(".")[0].replace(/\s/g, ""));
}