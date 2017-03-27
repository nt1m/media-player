"use strict";

var MediaPlayer = {
  init() {
    this.isElectron = window.process && window.process.type && window.process.versions.electron;

    if (this.isElectron) {
      var ElectronApp = require("./js/ElectronApp");
      ElectronApp.init();
    }

    /* Define elements */
    this.videoEl = document.getElementById("MediaPlayer");
    this.uploadEl = document.getElementById("upfile");
    this.headerEl = document.getElementById("header");

    this.playPauseEl = document.getElementById("play-pause");
    this.volumeIcon = document.getElementById("volume-icon");
    this.volumeSlider = document.getElementById("volume-range");
    this.loopEl = document.getElementById("loop");
    this.shuffleEl = document.getElementById("shuffle");
    this.speedBtnEl = document.getElementById("speed-btn");

    this.progressBar = document.getElementById("progress-bar");
    this.progressEl = document.getElementById("progress");
    this.tooltipEl = document.getElementById("tooltip");

    this.sidebarEl = document.getElementById("sidebar");
    this.controlsEl = document.getElementById("media-controls");
    this.canvasEl = document.getElementById("visualizer");

    this.controlOverlay = document.getElementById("control-overlay");
    this.videoEl.controls = false;
    /* Initialize playlist */
    this.playlist = new Playlist({
      element: document.getElementById("playlist"),
      onItemSelected: this.setMedia.bind(this),
      onItemRemoved: () => {},
      onItemCleared: () => {
        this.UIEnabled = false;
      },
    });

    this.settingsStore = new SettingsStore();
    this.settingsOverlay = new SettingsOverlay({
      store: this.settingsStore,
      element: document.getElementById("settings-overlay"),
      toggle: document.getElementById("settings-btn")
    });

    /* Bind functions */
    this.uploadFiles = this.uploadFiles.bind(this);

    /* Setup uploader */
    this.uploadEl.addEventListener("change", () => this.uploadFiles(this.uploadEl.files));

    this.sidebarEl.addEventListener("dragenter", () => {
      this.sidebarEl.classList.remove("no-drag");
      this.sidebarEl.classList.add("drag");
    });
    this.sidebarEl.addEventListener("dragleave", () => {
      this.sidebarEl.classList.remove("drag");
      this.sidebarEl.classList.add("no-drag");
    });
    this.sidebarEl.addEventListener("dragover", (e) => {
      e.preventDefault();
      e.stopPropagation();
    });
    this.sidebarEl.addEventListener("drop", (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.uploadFiles(e.dataTransfer.files);
      this.sidebarEl.classList.remove("drag");
      this.sidebarEl.classList.add("no-drag");
    });

    this.progressBar.addEventListener("mousedown", function(e) {
      this.classList.add("dragging");
      MediaPlayer.onProgressClick(e.pageX);
    });
    this.progressBar.addEventListener("mouseup", (e) => {
      this.progressBar.classList.remove("dragging");
    });
    this.progressBar.addEventListener("mouseover", (e) => {
      if (this.progressBar.classList.contains("dragging")) {
        this.onProgressClick(e.pageX);
      }
    });
    this.progressBar.addEventListener("mouseover", function(e) {
      MediaPlayer.setProgressTooltip(e.pageX);
    });

    this.controlOverlay.addEventListener("click", () => {
      if (!this.UIEnabled) {
        return;
      }
      this.togglePaused();
    });

    addEventListener("keydown", (e) => {
      switch (e.keyCode) {
        // Spacebar
        case 32:
          if (document.activeElement == document.body) {
            this.togglePaused();
          }
          break;
        // Top arrow
        case 38:
          if (e.ctrlKey || e.metaKey) {
            this.changeVolume(Math.max(0, this.videoEl.volume - 0.1));
            e.preventDefault();
          } else {
            this.playlist.selectPrevious();
          }
          break;
        // Down arrow
        case 40:
          if (e.ctrlKey || e.metaKey) {
            this.changeVolume(Math.min(1, this.videoEl.volume + 0.1));
            e.preventDefault();
          } else {
            this.playlist.selectNext();
          }
          break;
        // Left arrow
        case 37:
          this.fastrewind();
          break;
        // Right arrow
        case 39:
          this.fastforward();
          break;
      }
    });
    this.videoEl.addEventListener("timeupdate", function() {
      MediaPlayer.updateProgressBar();
      MediaPlayer.tooltipEl.textContent = MediaPlayer.getTooltip(this.currentTime);
    });
    this.videoEl.addEventListener("play", () => {
      this.playPauseEl.classList.remove("paused");
    });
    this.videoEl.addEventListener("pause", () => {
      this.playPauseEl.classList.add("paused");
    });
    this.videoEl.addEventListener("ended", () => {
      this.killContext();
      this.playlist.selectNext();
    });
    this.initAudioContext();
  },
  set UIEnabled(value) {
    if (!value) {
      this.controlsEl.classList.add("disabled");
      this.headerEl.textContent = "";
      this.videoEl.hidden = true;
      this.canvasEl.hidden = false;
      this.stop();
    } else {
      this.controlsEl.classList.remove("disabled");
    }
  },
  get UIEnabled() {
    return !this.controlsEl.classList.contains("disabled");
  },

  /** Sidebar **/
  uploadFiles(uploadedMedia) {
    uploadedMedia = Array.from(uploadedMedia) || [];
    this.playlist.element.classList.add("loading");

    uploadedMedia = uploadedMedia.filter(m => m.type.match("audio") == "audio"
                                           || m.type.match("video") == "video");
    return this.playlist.addAll(uploadedMedia).then(() => {
      this.playlist.element.classList.remove("loading");
      this.UIEnabled = true;
    });
  },
  setMedia(hash) {
    let item = this.playlist.list.get(hash);
    this.videoEl.hidden = item.type != "video";
    this.canvasEl.hidden = item.type == "video";
    this.videoEl.src = URL.createObjectURL(item.media);
    this.updateHeader(item.tags);
    // Scroll to the selected item
    this.playlist.element.scrollTo(item.element.offsetTop, 1000);
    this.play(true);
  },
  updateHeader(tags) {
    let artistAndTitle = tags.artist ? tags.artist + " - " + tags.title
                                     : tags.title;
    this.headerEl.textContent = artistAndTitle;
    document.title = this.headerEl.textContent;

    this.headerEl.title = Utils.getTooltipForTags(tags);
  },

  /** Audio controls **/
  initAudioContext() {
    var ctx = new AudioContext();
    var media = this.videoEl;
    var mediaSrc = ctx.createMediaElementSource(media);
    var analyser = ctx.createAnalyser();
    mediaSrc.connect(analyser);
    analyser.connect(ctx.destination);
    this.analyser = analyser;
    this.ctx = ctx;
  },
  animateIndicator(playing) {
    this.controlOverlay.className = playing ? "playing" : "paused";
    setTimeout(() => {
      this.controlOverlay.className = "";
    }, 500);
  },
  get paused() {
    return this.videoEl.paused;
  },
  play(disableAnimation) {
    this.videoEl.play();
    if (!this.canvasEl.hidden) {
      this.recordContext();
    }
    this.controlOverlay.className = "playing";
    this.canvasEl.classList.remove("placeholder");
    if (!disableAnimation) {
      this.animateIndicator(true);
    }
  },
  pause(disableAnimation) {
    this.videoEl.pause();
    this.canvasEl.classList.add("placeholder");
    this.killContext();
    if (!disableAnimation) {
      this.animateIndicator(false);
    }
  },
  togglePaused() {
    if (!this.UIEnabled) {
      return;
    }
    if (this.paused) {
      this.play();
    } else {
      this.pause();
    }
  },
  stop() {
    this.videoEl.pause();
    this.videoEl.currentTime = 0;
    this.canvasEl.classList.add("placeholder");
    this.killContext();
  },
  fastrewind() {
    this.videoEl.currentTime -= 5;
  },
  fastforward() {
    this.videoEl.currentTime += 5;
  },
  toggleShuffle() {
    this.playlist.shuffle = !this.playlist.shuffle;
    if (this.playlist.shuffle) {
      this.shuffleEl.classList.add("checked");
    } else {
      this.shuffleEl.classList.remove("checked");
    }
  },
  toggleLoop() {
    if (this.videoEl.loop) {
      this.videoEl.loop = false;
      this.loopEl.classList.remove("checked");
    } else {
      this.videoEl.loop = true;
      this.loopEl.classList.add("checked");
    }
  },
  toggleSpeedBtn() {
    if (this.speedBtnEl.classList.contains("checked")) {
      this.speedBtnEl.classList.remove("checked");
      this.speedBtnEl.classList.add("not-checked");
    } else {
      this.speedBtnEl.classList.remove("not-checked");
      this.speedBtnEl.classList.add("checked");
    }
  },
  changeVolume(volume) {
    if (volume == this.videoEl.volume) {
      return;
    }
    this.videoEl.volume = volume;
    if (volume == 0) {
      this.volumeIcon.className = "mute";
    } else if (volume <= 0.5) {
      this.volumeIcon.className = "half";
    } else {
      this.volumeIcon.className = "";
    }
    this.volumeSlider.value = volume;
    this.volumeSlider.title = this.volumeIcon.title = (volume * 100) + "%";
    if (this.settingsStore) {
      this.settingsStore.setItem("volume", volume);
    }
  },
  changeSpeed(value) {
    var values = [.5, .75, 1, 1.25, 1.5, 2];
    this.videoEl.playbackRate = values[value];
    this.videoEl.defaultPlaybackRate = values[value];
  },

  /** Progress bar **/
  setCurrentTime(time) {
    this.videoEl.currentTime = time;
  },
  updateProgressBar() {
    var width = (this.videoEl.currentTime * document.body.clientWidth)
                / this.videoEl.duration;
    this.progressEl.style.width = width + "px";
  },
  onProgressClick(x) {
    var duration = (x * this.videoEl.duration) / document.body.clientWidth;
    this.setCurrentTime(duration);
  },
  setProgressTooltip(x) {
    var duration = (x * this.videoEl.duration) / document.body.clientWidth;
    this.progressBar.title = this.getTooltip(duration);
  },
  getTooltip(time) {
    var data = Utils.convertSecondsToDisplay(time);
    var display = "";
    if (data.hours !== 0) {
      display = data.hours;
    }
    if (data.minutes < 10) {
      data.minutes = "0" + data.minutes;
    }
    if (data.seconds < 10) {
      data.seconds = "0" + data.seconds;
    }
    display = display + data.minutes + ":" + data.seconds;
    return display;
  },

  /** Visualizer **/
  recordContext() {
    this.visualize(this.analyser);
  },
  killContext() {
    cancelAnimationFrame(this.animationId);
    this.animationId = null;
    var canvas = this.canvasEl;
    var ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  },
  visualize(analyser) {
    var that = this,
      canvas = this.canvasEl,
      cwidth = canvas.width,
      cheight = canvas.height - 2,
      meterWidth = 12,
      capHeight = 3,
      totalWidth = meterWidth + capHeight,
      capStyle = "#fff",
      meterNum = 600 / (meterWidth + capHeight),
      capYPositionArray = [],
      ctx = canvas.getContext("2d");
    var drawMeter = function() {
      var array = new Uint8Array(analyser.frequencyBinCount);
      analyser.getByteFrequencyData(array);
      if (that.status === 0) {
        for (let i = array.length - 1; i >= 0; i--) {
          array[i] = 0;
        }
        var allCapsReachBottom = true;
        for (let i = capYPositionArray.length - 1; i >= 0; i--) {
          allCapsReachBottom = allCapsReachBottom && (capYPositionArray[i] === 0);
        }
        if (allCapsReachBottom) {
          cancelAnimationFrame(that.animationId);
          return;
        }
      }
      var step = Math.round(array.length / meterNum);
      ctx.clearRect(0, 0, cwidth, cheight);
      for (let i = 0; i < meterNum; i++) {
        var value = array[i * step];
        if (capYPositionArray.length < Math.round(meterNum)) {
          capYPositionArray.push(value);
        }
        ctx.fillStyle = capStyle;
        if (value < capYPositionArray[i]) {
          ctx.fillRect(i * totalWidth,
                       cheight - (--capYPositionArray[i]),
                       meterWidth, capHeight);
        } else {
          ctx.fillRect(i * totalWidth, cheight - value, meterWidth, capHeight);
          capYPositionArray[i] = value;
        }
        ctx.fillStyle = getComputedStyle(document.documentElement)
                        .getPropertyValue("--theme-highlight-color");
        ctx.fillRect(i * totalWidth, cheight - value + capHeight, meterWidth, cheight);
      }
      that.animationId = requestAnimationFrame(drawMeter);
    };
    if (!this.animationId) {
      this.animationId = requestAnimationFrame(drawMeter);
    }
  }
};

window.addEventListener("load", function() {
  MediaPlayer.init();
}, false);
